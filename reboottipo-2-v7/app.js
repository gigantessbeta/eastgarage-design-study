import { GullwingSequence } from './gullwing-sequence.js';
/* Strict TypeScript authoring source; browser output is site-century-v7/app.js. */
(() => {
    'use strict';
    const one = (selector) => {
        const node = document.querySelector(selector);
        if (!node)
            throw new Error(`Missing element: ${selector}`);
        return node;
    };
    const many = (selector) => Array.from(document.querySelectorAll(selector));
    const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
    const ramp = (p, start, end) => clamp((p - start) / (end - start));
    const ease = (p) => p * p * (3 - 2 * p);
    const opacity = (element, value) => { element.style.opacity = String(clamp(value)); };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const params = new URLSearchParams(location.search);
    const rawProgress = params.get('p');
    const numericProgress = rawProgress !== null && rawProgress.trim() !== '' ? Number(rawProgress) : NaN;
    const frozen = Number.isFinite(numericProgress) ? clamp(numericProgress) : null;
    if (frozen !== null)
        history.scrollRestoration = 'manual';
    const opening = one('#opening');
    const wrap = one('#wrap');
    const records = one('#records');
    const protection = one('#protection');
    const gullwing = one('#gullwing');
    const bubbling = one('#bubbling');
    const films = ['F1', 'F2', 'F3', 'F4'].map(n => one(`.film-${n}`));
    const car = one('.hero-car');
    const brand = one('.hero-brand');
    const skip = one('.opening-skip');
    const wipes = many('.wipe');
    const wipeInners = many('.wipe-inner');
    const scan = one('.squeegee');
    const labels = many('.finish-current span');
    const finishIndex = many('.finish-index span');
    const sample = one('.sample-note');
    const recordTrack = one('.records-track');
    const recordProgress = one('.record-progress i');
    const protectionTrack = one('.protection-track');
    const revealLines = many('.reveal-line');
    const menu = one('.menu-toggle');
    const nav = one('#site-nav');
    const navLinks = many('#site-nav a');
    const progress = (element) => {
        const rect = element.getBoundingClientRect();
        return clamp(-rect.top / Math.max(1, rect.height - innerHeight));
    };
    // Viewer pacing (2026-10-23). The page always scrolls natively, so every scene follows the hand.
    // Each scene finishes its motion and its words inside the first part of its pinned travel, then
    // keeps the finished picture for HOLD screen heights before the page moves on.
    const HOLD = .45;
    const LEAD = .3; // the first case is readable before the case track starts moving
    const ends = { hero: .8, wrap: .8, gullwing: .8, bubbling: .8 };
    let recordSpan = [0, 1];
    const travelOf = (el) => Math.max(1, el.offsetHeight - innerHeight);
    const endOf = (el) => clamp(1 - HOLD * innerHeight / travelOf(el), .5, .95);
    const paced = (p, end) => clamp(p / end);
    const state = { hero: frozen ?? progress(opening), wrap: frozen ?? progress(wrap), gullwing: frozen ?? progress(gullwing), bubbling: frozen ?? progress(bubbling), records: progress(records), protection: progress(protection) };
    let request = 0;
    let previousTime = 0;
    let geometryDirty = true;
    let lastScroll = window.scrollY;
    let linePositions = [];
    let anchors = [];
    const gSequence = new GullwingSequence(gullwing, () => wake());
    const gCopy = one('.g-copy');
    const gCase = one('.g-case');
    const bRig = one('.b-rig');
    const bLights = one('.b-lights');
    const bCopy = one('.b-copy');
    const bCase = one('.b-case');
    const tach = one('.tach-holder');
    const tachSegments = many('.tach-segment');
    const tachMarks = many('.tach-tick, .tach-digits');
    const tachNeedle = one('.tach-needle');
    const tachGlow = one('.tach-red-glow');
    const bursts = many('.burst');
    const sceneCopy = (copy, label, amount) => {
        opacity(copy, amount);
        opacity(label, amount);
        copy.style.transform = label.style.transform = `translate3d(0,${(1 - amount) * 14}px,0)`;
        copy.style.pointerEvents = amount > .1 ? 'auto' : 'none';
        const link = copy.querySelector('a');
        if (link)
            link.tabIndex = amount > .1 ? 0 : -1;
    };
    // Scroll share of each gullwing phase: the car enters with its nose already at the edge (no empty
    // black lead-in), the doors get the largest share, and the underglow and words close the motion.
    const gullwingAt = (q) => {
        const b = gSequence.bounds();
        if (!b)
            return q;
        const points = [[0, b.start], [.36, b.arrival], [.44, b.headlights], [.90, b.doors], [1, b.underglow]];
        for (let i = 1; i < points.length; i++) {
            if (q <= points[i][0])
                return points[i - 1][1] + (points[i][1] - points[i - 1][1]) * ramp(q, points[i - 1][0], points[i][0]);
        }
        return b.underglow;
    };
    const gullwingFrame = (p, still = false) => {
        const q = still ? 1 : paced(p, ends.gullwing);
        const a = still ? 1 : gullwingAt(q);
        gSequence.frame(a, still, frozen === null);
        sceneCopy(gCopy, gCase, still ? 1 : ease(ramp(q, .90, 1)));
        gullwing.dataset.progress = p.toFixed(4);
        gullwing.dataset.animation = a.toFixed(4);
    };
    const rpmAt = (p) => {
        const knots = [[.25, 0], [.41, 4], [.45, 3.2], [.59, 6.8], [.63, 5.8], [.75, 9]];
        for (let i = 1; i < knots.length; i++) {
            if (p <= knots[i][0])
                return knots[i - 1][1] + (knots[i][1] - knots[i - 1][1]) * ease(ramp(p, knots[i - 1][0], knots[i][0]));
        }
        return 9;
    };
    const pulse = (p, start) => {
        const t = (p - start) / .03;
        return t <= 0 || t >= 1 ? 0 : Math.pow(Math.sin(t * Math.PI), .65);
    };
    const bubblingFrame = (p, still = false) => {
        const reveal = ease(ramp(p, 0, .15));
        // The Porsche is already half visible while the scene arrives, so the screen is never empty black.
        opacity(bRig, still ? 1 : .5 + .5 * reveal);
        const pulses = [.78, .84, .90].map(start => pulse(p, start));
        const flash = still ? 1 : Math.max(...pulses);
        const shake = still ? 0 : Math.sin(p * 900) * flash * 2;
        bRig.style.transform = `translate3d(${shake}px,0,0) scale(${.94 + reveal * .06})`;
        opacity(bLights, ramp(p, .15, .25));
        const draw = ramp(p, .15, .25);
        opacity(tach, draw);
        tachSegments.forEach((segment, i) => opacity(segment, ramp(draw * 90 - i, 0, 1)));
        tachMarks.forEach(mark => opacity(mark, draw));
        const rpm = rpmAt(p);
        tachNeedle.style.transform = `rotate(${-135 + rpm * 30}deg)`;
        opacity(tachGlow, ramp(rpm, 7, 9));
        // Red arc brightening is an overlay; SVG strokes are never animated.
        tach.style.setProperty('--red-intensity', String(ramp(rpm, 7, 9)));
        bursts.forEach((burst, i) => {
            opacity(burst, still && i === 1 ? 0 : flash);
            burst.style.transform = `scale(${.25 + flash * .95}) rotate(${i ? -9 : 7}deg)`;
        });
        sceneCopy(bCopy, bCase, ease(ramp(p, .92, 1)));
        bubbling.dataset.progress = p.toFixed(4);
        bubbling.dataset.rpm = rpm.toFixed(4);
        bubbling.dataset.flash = flash.toFixed(4);
    };
    const readGeometry = () => {
        linePositions = revealLines.map(el => el.getBoundingClientRect().top + scrollY);
        anchors = navLinks.map(link => ({ link, top: document.querySelector(link.hash)?.getBoundingClientRect().top ?? 0 })).map(x => ({ ...x, top: x.top + scrollY }));
        ends.hero = endOf(opening);
        ends.wrap = endOf(wrap);
        ends.gullwing = endOf(gullwing);
        ends.bubbling = endOf(bubbling);
        const recordTravel = travelOf(records);
        recordSpan = [clamp(LEAD * innerHeight / recordTravel, 0, .3), clamp(1 - HOLD * innerHeight / recordTravel, .7, 1)];
        geometryDirty = false;
    };
    const heroFrame = (p) => {
        const a = ease(ramp(p, .16, .29));
        const b = ease(ramp(p, .37, .51));
        const c = ease(ramp(p, .60, .75));
        const d = ease(ramp(p, .75, .94));
        [1 - a, a * (1 - b), b * (1 - c), c * (1 - d)].forEach((v, i) => opacity(films[i], v));
        films[0].style.transform = `translate3d(0,${-p * 15}px,0) scale(${1 + p * .14})`;
        films[1].style.transform = `translate3d(${(p - .28) * 65}px,${(p - .28) * -20}px,0) scale(${1 + ramp(p, .18, .5) * .09})`;
        films[2].style.transform = `translate3d(${(p - .53) * 90}px,0,0) scale(${1.08 - ramp(p, .38, .7) * .08})`;
        // F4 and C0 share the identical matrix during their dissolve: no double wheel or nose.
        const scale = .96 + ease(ramp(p, .65, 1)) * .04;
        const finalTransform = `translate3d(0,${(1 - ease(ramp(p, .65, 1))) * 16}px,0) scale(${scale})`;
        films[3].style.transform = finalTransform;
        car.style.transform = finalTransform;
        opacity(car, d);
        opacity(brand, ease(ramp(p, .78, .96)));
        opacity(skip, 1 - ramp(p, .94, 1));
        skip.style.pointerEvents = p > .98 ? 'none' : 'auto';
        opening.dataset.progress = p.toFixed(4);
        document.body.classList.toggle('intro', opening.getBoundingClientRect().bottom > innerHeight + 30 && !reduced.matches);
    };
    // Each finish rests fully laid before the next film starts; the last one stays through the hold.
    const WIPES = [[.05, .30], [.40, .65], [.75, 1]];
    const wrapFrame = (p) => {
        const reveals = WIPES.map(([start, end]) => ramp(p, start, end));
        reveals.forEach((reveal, i) => {
            wipes[i].style.transform = `translate3d(${(reveal - 1) * 100}%,0,0)`;
            wipeInners[i].style.transform = `translate3d(${(1 - reveal) * 100}%,0,0)`;
        });
        const active = reveals.findIndex(reveal => reveal > 0 && reveal < 1);
        const local = active < 0 ? 0 : reveals[active];
        scan.style.transform = `translate3d(${(local - 1) * 100}%,0,0)`;
        opacity(scan, active < 0 ? 0 : Math.min(ramp(local, 0, .06), 1 - ramp(local, .94, 1)));
        // The name changes when the new finish covers most of the car, so the words match the picture.
        const stage = reveals.filter(reveal => reveal >= .5).length;
        labels.forEach((el, i) => opacity(el, i === stage ? 1 : 0));
        finishIndex.forEach((el, i) => el.classList.toggle('active', i === stage));
        opacity(sample, ramp(p, 0, .02));
        wrap.dataset.progress = p.toFixed(4);
    };
    const render = (time) => {
        request = 0;
        if (geometryDirty)
            readGeometry();
        if (reduced.matches) {
            heroFrame(1);
            wrapFrame(0);
            gullwingFrame(1, true);
            bubblingFrame(1, true);
            recordTrack.style.transform = '';
            protectionTrack.style.transform = '';
            return;
        }
        const dt = previousTime ? Math.min(64, time - previousTime) : 16.667;
        previousTime = time;
        const alpha = 1 - Math.pow(1 - .12, dt / 16.667);
        const targets = { hero: frozen ?? progress(opening), wrap: frozen ?? progress(wrap), gullwing: frozen ?? progress(gullwing), bubbling: frozen ?? progress(bubbling), records: progress(records), protection: progress(protection) };
        let moving = false;
        for (const key of Object.keys(state)) {
            const difference = targets[key] - state[key];
            state[key] = Math.abs(difference) < .00005 || (frozen !== null && key !== 'records' && key !== 'protection') ? targets[key] : state[key] + difference * alpha;
            moving || (moving = Math.abs(targets[key] - state[key]) > .00005);
        }
        // The first ribbon starts to move after about two wheel ticks instead of four.
        heroFrame(.07 + .93 * paced(state.hero, ends.hero));
        wrapFrame(paced(state.wrap, ends.wrap));
        gullwingFrame(state.gullwing);
        bubblingFrame(paced(state.bubbling, ends.bubbling));
        const recordAmount = ramp(state.records, recordSpan[0], recordSpan[1]);
        recordTrack.style.transform = `translate3d(${-recordAmount * (recordTrack.scrollWidth - innerWidth)}px,0,0)`;
        const initialRecordProgress = 1 / recordTrack.children.length;
        recordProgress.style.transform = `scaleX(${initialRecordProgress + recordAmount * (1 - initialRecordProgress)})`;
        protectionTrack.style.transform = `translate3d(${-ease(ramp(state.protection, .23, .8)) * 50}%,0,0)`;
        revealLines.forEach((el, i) => {
            const amount = ease(clamp((scrollY + innerHeight * .89 - linePositions[i]) / (innerHeight * .30)));
            opacity(el, .12 + amount * .88);
            el.style.transform = `translate3d(0,${(1 - amount) * 15}px,0)`;
        });
        let current = anchors[0];
        for (const anchor of anchors)
            if (anchor.top <= scrollY + innerHeight * .4)
                current = anchor;
        for (const anchor of anchors) {
            if (anchor === current)
                anchor.link.setAttribute('aria-current', 'location');
            else
                anchor.link.removeAttribute('aria-current');
        }
        lastScroll = scrollY;
        if (moving)
            wake();
        else
            previousTime = 0;
    };
    const wake = () => { if (!request)
        request = requestAnimationFrame(render); };
    const menuOpen = (open) => {
        menu.setAttribute('aria-expanded', String(open));
        nav.classList.toggle('open', open);
        document.body.classList.toggle('menu-open', open);
    };
    menu.addEventListener('click', () => menuOpen(menu.getAttribute('aria-expanded') !== 'true'));
    navLinks.forEach(link => link.addEventListener('click', () => menuOpen(false)));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
            menuOpen(false);
            menu.focus();
        }
        if (event.key === 'Tab' && menu.getAttribute('aria-expanded') === 'true') {
            const last = navLinks[navLinks.length - 1];
            if (event.shiftKey && document.activeElement === menu) {
                event.preventDefault();
                last.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                menu.focus();
            }
        }
    });
    many('.finish-trigger').forEach(trigger => {
        const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
        if (!panel)
            return;
        const setOpen = (open) => {
            trigger.setAttribute('aria-expanded', String(open));
            panel.hidden = !open;
            if (open && !reduced.matches)
                panel.animate([{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 400, easing: 'ease-out' });
            geometryDirty = true;
            wake();
        };
        trigger.addEventListener('click', () => setOpen(trigger.getAttribute('aria-expanded') !== 'true'));
        panel.querySelector('.finish-close')?.addEventListener('click', () => { setOpen(false); trigger.focus({ preventScroll: true }); });
    });
    many('.record>a').forEach((link, index, all) => {
        link.addEventListener('focus', () => {
            if (reduced.matches)
                return;
            if (geometryDirty)
                readGeometry();
            const position = recordSpan[0] + index / Math.max(1, all.length - 1) * (recordSpan[1] - recordSpan[0]);
            state.records = position;
            const top = records.getBoundingClientRect().top + scrollY;
            scrollTo({ top: top + position * (records.offsetHeight - innerHeight), behavior: 'instant' });
            wake();
        });
    });
    addEventListener('scroll', () => { if (lastScroll !== scrollY)
        wake(); }, { passive: true });
    addEventListener('resize', () => { geometryDirty = true; if (innerWidth > 768)
        menuOpen(false); wake(); }, { passive: true });
    reduced.addEventListener('change', () => { geometryDirty = true; wake(); });
    addEventListener('pageshow', () => { geometryDirty = true; wake(); });
    document.fonts.ready.then(() => { geometryDirty = true; wake(); });
    many('img').forEach(img => img.addEventListener('load', () => { geometryDirty = true; wake(); }, { once: true }));
    document.documentElement.classList.add('js');
    // Fixed-progress captures use real responsive layout and align the sticky stage at y=0.
    // Since v7, ?p= is the scroll position inside the scene (0 to 1), holds included.
    const scenes = { opening, wrap, gullwing, bubbling, records, protection, finishes: one('#finishes'), ecu: one('#ecu'), studio: one('#studio') };
    const captureScene = scenes[params.get('scene') ?? 'opening'];
    const alignCapture = () => {
        if (frozen === null || !captureScene)
            return;
        const offset = captureScene === records || captureScene === protection ? frozen * (captureScene.offsetHeight - innerHeight) : 0;
        scrollTo({ top: captureScene.getBoundingClientRect().top + scrollY + offset, behavior: 'instant' });
        if (captureScene === records)
            state.records = frozen;
        if (captureScene === protection)
            state.protection = frozen;
        geometryDirty = true;
        wake();
    };
    alignCapture();
    document.fonts.ready.then(alignCapture);
    addEventListener('load', alignCapture, { once: true });
    wake();
})();
