const clamp = (n) => Math.max(0, Math.min(1, n));
const ramp = (p, a, b) => clamp((p - a) / (b - a));
export function sequencePath(spec, index) {
    return spec.pattern.replace('{frame}', String(spec.start + index).padStart(spec.pad, '0'));
}
export function frameAt(variant, p, reduced = false) {
    if (reduced)
        return { src: variant.still, sequence: 'still', index: 0 };
    if (p < .06)
        return { src: null, sequence: 'floor', index: -1 };
    if (variant.timeline) {
        const spec = variant.timeline;
        let index = 0;
        for (let i = 1; i < spec.count; i++) {
            if (p < (spec.progress[i - 1] + spec.progress[i]) / 2)
                break;
            index = i;
        }
        return { src: sequencePath(spec, index), sequence: spec.phases[index], index };
    }
    const name = p < .48 ? 'arrival' : 'doors';
    const spec = variant[name];
    const amount = name === 'arrival' ? ramp(p, .06, .42) : ramp(p, .48, .84);
    const index = Math.round(amount * (spec.count - 1));
    return { src: sequencePath(spec, index), sequence: name, index };
}
export function validateManifest(input) {
    // Read as untrusted data: malformed replacement manifests must retain the poster, not crash the other scenes.
    if (!input || typeof input !== 'object')
        throw new Error('Invalid gullwing manifest');
    const m = input;
    if (![1, 2].includes(m.version) || typeof m.mobileMedia !== 'string' || !m.variants)
        throw new Error('Unsupported gullwing manifest');
    for (const v of [m.variants.desktop, m.variants.mobile]) {
        if (!v || !Number.isFinite(v.width) || !Number.isFinite(v.height) || v.width <= 0 || v.height <= 0 || !v.poster || !v.still)
            throw new Error('Invalid gullwing dimensions/posters');
        for (const spec of (v.timeline ? [v.timeline] : [v.arrival, v.doors])) {
            if (!spec || typeof spec.pattern !== 'string' || !spec.pattern.includes('{frame}') || !Number.isInteger(spec.count) || spec.count < 1 || !Number.isInteger(spec.start) || !Number.isInteger(spec.pad) || spec.pad < 1)
                throw new Error('Invalid gullwing sequence');
        }
        if (v.timeline && (v.timeline.progress.length !== v.timeline.count || v.timeline.phases.length !== v.timeline.count || v.timeline.progress.some((p, i, all) => !Number.isFinite(p) || p < .06 || p > 1 || (i > 0 && p <= all[i - 1]))))
            throw new Error('Invalid gullwing timeline');
        for (const spec of [v.lights?.headlights, v.lights?.underglow]) {
            if (!spec || (spec.kind !== 'image' && spec.kind !== 'css' && spec.kind !== 'baked'))
                throw new Error('Invalid gullwing light');
            if (spec.kind === 'image' && !spec.src)
                throw new Error('Missing gullwing light image');
            if (spec.kind === 'css' && (!Array.isArray(spec.spots) || spec.spots.some(s => ![s.x, s.y, s.width, s.height, s.rotate].every(Number.isFinite))))
                throw new Error('Invalid gullwing CSS light');
        }
    }
    return m;
}
export class GullwingSequence {
    constructor(root, wake) {
        this.root = root;
        this.wake = wake;
        this.manifestURL = new URL('assets/gullwing/manifest.json', document.baseURI);
        this.cache = new Map();
        this.images = new Map();
        this.variant = null;
        this.ready = false;
        this.near = false;
        this.loading = false;
        this.epoch = 0;
        this.lastBlend = false;
        this.lastPosition = NaN;
        this.lastDrawn = undefined;
        this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const get = (selector) => {
            const el = root.querySelector(selector);
            if (!el)
                throw new Error(`Missing gullwing element ${selector}`);
            return el;
        };
        this.canvas = get('.g-canvas');
        const context = this.canvas.getContext('2d', { alpha: false });
        if (!context)
            throw new Error('Canvas 2D is unavailable');
        this.ctx = context;
        this.plane = get('.g-plane');
        this.surface = get('.g-surface');
        this.head = get('.g-headlights');
        this.under = get('.g-under');
        this.floor = get('.g-floor');
        this.root.dataset.sequenceStatus = 'manifest';
        new ResizeObserver(() => this.fit()).observe(this.plane);
        const observer = new IntersectionObserver(entries => {
            if (entries.some(e => e.isIntersecting)) {
                this.near = true;
                observer.disconnect();
                void this.loadFrames();
            }
        }, { rootMargin: '300% 0px' });
        observer.observe(root);
        void this.initialize().catch(error => { this.root.dataset.sequenceStatus = 'error'; console.error('Gullwing manifest:', error); });
    }
    image(path) {
        const url = new URL(path, this.manifestURL).href;
        let promise = this.cache.get(url);
        if (!promise) {
            promise = (async () => {
                const img = new Image();
                img.decoding = 'async';
                img.src = url;
                await img.decode();
                this.images.set(url, img);
                return img;
            })();
            this.cache.set(url, promise);
        }
        return promise;
    }
    async initialize() {
        const response = await fetch(this.manifestURL);
        if (!response.ok)
            throw new Error(`Manifest HTTP ${response.status}`);
        const manifest = validateManifest(await response.json());
        const media = matchMedia(manifest.mobileMedia);
        const choose = () => { void this.select(media.matches ? manifest.variants.mobile : manifest.variants.desktop); };
        media.addEventListener('change', choose);
        choose();
    }
    async select(variant) {
        const epoch = ++this.epoch;
        this.cache.clear();
        this.images.clear();
        this.variant = variant;
        this.ready = false;
        this.loading = false;
        this.root.dataset.sequenceStatus = 'poster';
        this.canvas.width = variant.width;
        this.canvas.height = variant.height;
        this.lastDrawn = undefined;
        this.lastPosition = NaN;
        this.fit();
        this.head.replaceChildren();
        this.under.replaceChildren();
        try {
            // Only the closed and open posters load before the section approaches the viewport.
            const poster = this.reduced ? variant.still : variant.poster;
            await this.image(poster);
            if (epoch !== this.epoch)
                return;
            this.draw(poster);
            await Promise.all([this.layer(this.head, variant.lights.headlights, epoch), this.layer(this.under, variant.lights.underglow, epoch), this.image(variant.still)]);
            if (epoch !== this.epoch)
                return;
            this.wake();
            await this.loadFrames();
        }
        catch (error) {
            if (epoch === this.epoch)
                this.root.dataset.sequenceStatus = 'error';
            console.error('Gullwing assets:', error);
        }
    }
    async layer(container, spec, epoch) {
        if (spec.kind === 'baked')
            return;
        if (spec.kind === 'image') {
            const image = await this.image(spec.src);
            if (epoch !== this.epoch)
                return;
            const node = image.cloneNode();
            node.alt = '';
            container.replaceChildren(node);
            return;
        }
        for (const spot of spec.spots) {
            const node = document.createElement('i');
            node.style.left = `${spot.x}%`;
            node.style.top = `${spot.y}%`;
            node.style.width = `${spot.width}%`;
            node.style.height = `${spot.height}%`;
            node.style.setProperty('--angle', `${spot.rotate}deg`);
            container.append(node);
        }
    }
    async loadFrames() {
        if (!this.variant || !this.near || this.reduced || this.loading || this.ready)
            return;
        const variant = this.variant, epoch = this.epoch;
        this.loading = true;
        this.root.dataset.sequenceStatus = 'loading';
        const paths = (variant.timeline ? [variant.timeline] : [variant.arrival, variant.doors]).flatMap(spec => Array.from({ length: spec.count }, (_, i) => sequencePath(spec, i)));
        let cursor = 0;
        try {
            await Promise.all(Array.from({ length: 4 }, async () => {
                while (cursor < paths.length && epoch === this.epoch) {
                    const image = await this.image(paths[cursor++]);
                    if (image.naturalWidth !== variant.width || image.naturalHeight !== variant.height)
                        throw new Error('Gullwing frame dimensions differ from manifest');
                }
            }));
            if (epoch !== this.epoch)
                return;
            this.ready = true;
            this.root.dataset.sequenceStatus = 'ready';
            this.wake();
        }
        catch (error) {
            if (epoch === this.epoch)
                this.root.dataset.sequenceStatus = 'error';
            console.error('Gullwing sequence:', error);
        }
        finally {
            if (epoch === this.epoch)
                this.loading = false;
        }
    }
    fit() {
        if (!this.variant)
            return;
        const { width, height } = this.variant;
        const scale = Math.min(this.plane.clientWidth / width, this.plane.clientHeight / height);
        this.surface.style.width = `${width * scale}px`;
        this.surface.style.height = `${height * scale}px`;
    }
    draw(path) {
        if (this.lastDrawn === path && !this.lastBlend)
            return;
        const img = path ? this.images.get(new URL(path, this.manifestURL).href) : null;
        if (path && !img)
            return;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (img)
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        this.lastDrawn = path;
        this.lastBlend = false;
        this.lastPosition = NaN;
    }
    blend(p) {
        const spec = this.variant?.timeline;
        if (!spec || p < spec.progress[0])
            return;
        let lo = 0;
        while (lo < spec.count - 1 && p >= spec.progress[lo + 1])
            lo++;
        const hi = Math.min(spec.count - 1, lo + 1);
        const mix = lo === hi ? 0 : Math.max(0, Math.min(1, (p - spec.progress[lo]) / (spec.progress[hi] - spec.progress[lo])));
        const position = lo + mix;
        if (this.lastBlend && Math.abs(position - this.lastPosition) < .00001)
            return;
        const a = sequencePath(spec, lo), b = sequencePath(spec, hi);
        const first = this.images.get(new URL(a, this.manifestURL).href);
        const second = this.images.get(new URL(b, this.manifestURL).href);
        if (!first || !second)
            return;
        this.ctx.globalAlpha = 1;
        this.ctx.drawImage(first, 0, 0, this.canvas.width, this.canvas.height);
        if (mix > 0) {
            this.ctx.globalAlpha = mix;
            this.ctx.drawImage(second, 0, 0, this.canvas.width, this.canvas.height);
            this.ctx.globalAlpha = 1;
        }
        // Linear weights preserve continuous motion across each source-frame boundary;
        // per-frame easing would visibly pause at every integer frame.
        this.lastDrawn = mix < .5 ? a : b;
        this.lastBlend = true;
        this.lastPosition = position;
        this.root.dataset.framePosition = (lo + mix).toFixed(5);
        this.root.dataset.frameBlend = mix.toFixed(5);
    }
    /** Timeline positions where the car first shows and where each phase ends (null until the manifest loads). */
    bounds() {
        const t = this.variant?.timeline;
        if (!t)
            return null;
        const last = (name) => {
            let value = t.progress[0];
            t.phases.forEach((phase, i) => { if (phase === name)
                value = t.progress[i]; });
            return value;
        };
        const first = Math.max(1, Math.min(t.count, Math.round(t.firstVisible ?? 1)));
        return { start: t.progress[first - 1], arrival: last('arrival'), headlights: last('headlights'), doors: last('doors'), underglow: last('underglow') };
    }
    frame(p, reduced, interpolate = true) {
        if (this.reduced !== reduced) {
            this.reduced = reduced;
            if (!reduced)
                void this.loadFrames();
        }
        if (!this.variant)
            return;
        const selected = frameAt(this.variant, p, reduced);
        const src = reduced || this.ready ? selected.src : this.variant.poster;
        if (interpolate && !reduced && this.ready && this.variant.timeline && p >= .06)
            this.blend(p);
        else {
            this.draw(src);
            this.root.dataset.framePosition = String(selected.index);
            this.root.dataset.frameBlend = '0';
        }
        this.head.style.opacity = this.variant.lights.headlights.kind === 'baked' ? '0' : String(reduced ? 1 : ramp(p, .40, .48) * .75);
        this.under.style.opacity = this.variant.lights.underglow.kind === 'baked' ? '0' : String(reduced ? .58 : ramp(p, .84, 1) * .58);
        this.floor.style.opacity = String(reduced ? 0 : Math.min(ramp(p, 0, .035), 1 - ramp(p, .06, .15)));
        this.floor.style.transform = `translate3d(${(ramp(p, 0, .06) - 1) * 100}%,0,0)`;
        this.root.dataset.frame = this.lastDrawn ?? 'floor';
        this.root.dataset.sequence = reduced || this.ready ? selected.sequence : 'poster';
        this.root.dataset.frameIndex = String(selected.index);
    }
}
