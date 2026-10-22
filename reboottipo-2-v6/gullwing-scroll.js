/** Limit travel inside gullwing; shared touch inertia also respects its entry boundary. */
export class GullwingScroll {
    constructor(root, disabled, wake) {
        this.root = root;
        this.disabled = disabled;
        this.wake = wake;
        this.target = null;
        this.expected = scrollY;
        this.previous = 0;
        this.frame = 0;
        this.position = null;
        this.velocity = 0;
        this.hold = 0;
        // 180 wheel CSS px = 1.5 standard 120px notches (one 70th-run 180px input).
        // Use the same page distance for wheel, trackpad and direct touch movement.
        this.holdDistance = 180 * .72;
        this.touch = null;
        this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
        addEventListener('wheel', event => {
            if (this.disabled || this.reduced.matches || event.ctrlKey || event.metaKey || document.body.classList.contains('menu-open') || Math.abs(event.deltaX) > Math.abs(event.deltaY))
                return;
            const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
            if (!event.cancelable || !this.crosses(delta))
                return;
            event.preventDefault();
            this.enqueue(delta * .72);
        }, { passive: false });
        addEventListener('touchstart', event => {
            this.stop(true);
            if (this.disabled || this.reduced.matches || event.touches.length !== 1 || document.body.classList.contains('menu-open'))
                return;
            const t = event.touches[0];
            this.touch = { x: t.clientX, y: t.clientY, time: performance.now(), speed: 0,
                owned: true };
        }, { passive: true });
        addEventListener('touchmove', event => {
            const prev = this.touch;
            if (!prev || event.touches.length !== 1) {
                this.touch = null;
                return;
            }
            const t = event.touches[0], time = performance.now();
            const dy = prev.y - t.clientY, dx = prev.x - t.clientX;
            if (prev.owned && event.cancelable && Math.abs(dy) >= Math.abs(dx)) {
                event.preventDefault();
                const speed = dy / Math.max(8, time - prev.time);
                if (this.crosses(dy))
                    this.enqueue(dy * .9);
                else {
                    // Outside the passage a finger drag follows 1:1. Owning the gesture lets
                    // its later inertia cross the boundary without a native compositor jump.
                    this.stop();
                    scrollTo({ top: scrollY + dy, behavior: 'instant' });
                }
                this.touch = { x: t.clientX, y: t.clientY, time, speed, owned: true };
            }
            else
                this.touch = { x: t.clientX, y: t.clientY, time, speed: 0, owned: false };
        }, { passive: false });
        addEventListener('touchend', () => {
            const t = this.touch;
            if (t?.owned && performance.now() - t.time < 100) {
                const { start, end } = this.bounds();
                const inside = scrollY >= start && scrollY <= end;
                const limit = innerHeight * (inside ? .9 : 3);
                // A fling accumulated before completion must not spend the new endpoint hold.
                if (!inside || !this.hold)
                    this.enqueue(Math.max(-limit, Math.min(limit, t.speed * (inside ? 180 : 320))));
            }
            this.touch = null;
        }, { passive: true });
        addEventListener('touchcancel', () => { this.touch = null; this.stop(); }, { passive: true });
        // Navigation, keyboard and the scrollbar remain available; never hold focus or a hash jump.
        addEventListener('keydown', () => this.stop());
        addEventListener('pointerdown', event => { if (event.pointerType === 'mouse')
            this.stop(); });
        addEventListener('hashchange', () => this.stop());
        addEventListener('resize', () => this.stop());
        this.reduced.addEventListener('change', () => this.stop());
    }
    progress() {
        const { start, distance } = this.bounds();
        const y = this.position !== null && Math.abs(scrollY - this.expected) <= 1 ? this.position : scrollY;
        const hold = Math.min(this.holdDistance, distance * .1);
        return Math.max(0, Math.min(1, (y - start - hold) / (distance - 2 * hold)));
    }
    bounds() {
        const r = this.root.getBoundingClientRect();
        const start = r.top + scrollY, distance = Math.max(1, r.height - innerHeight);
        return { start, end: start + distance, distance };
    }
    crosses(delta) {
        const { start, end } = this.bounds();
        const next = scrollY + delta;
        return this.target !== null || (delta > 0 && scrollY < end && next >= start) || (delta < 0 && scrollY > start && next <= end);
    }
    enqueue(delta) {
        if (!delta)
            return;
        const { start, end } = this.bounds();
        const y = scrollY;
        if (Math.abs(y - this.expected) > 1) {
            this.position = y;
            this.velocity = 0;
            this.hold = 0;
        }
        // Reversal cancels queued forward travel immediately. At most one viewport of exit travel is queued.
        if (this.target === null || Math.sign(delta) !== Math.sign(this.target - y)) {
            this.target = this.position ?? y;
            this.velocity = 0;
        }
        if (this.hold && Math.sign(delta) !== this.hold)
            this.hold = 0;
        const lower = y > start ? Math.max(0, start - innerHeight) : 0;
        const upper = y < end ? end + innerHeight : document.documentElement.scrollHeight - innerHeight;
        this.target = Math.max(lower, Math.min(upper, this.target + delta));
        this.expected = y;
        if (!this.frame)
            this.frame = requestAnimationFrame(time => this.tick(time));
    }
    tick(time) {
        this.frame = 0;
        if (this.target === null)
            return;
        if (Math.abs(scrollY - this.expected) > 3 || this.reduced.matches || document.body.classList.contains('menu-open')) {
            this.stop();
            return;
        }
        const dt = this.previous ? Math.min(40, time - this.previous) : 16.667;
        this.previous = time;
        const { start, end, distance } = this.bounds();
        const margin = Math.min(this.holdDistance, distance * .1);
        const first = start + margin, last = end - margin, travel = last - first;
        const y = this.position ?? scrollY, difference = this.target - y;
        const direction = Math.sign(difference);
        // Ease changes in speed, with a hard source-frame budget even after a missed RAF.
        // Keep subpixel travel: rounding scrollY on every tick caused uneven small steps.
        const desired = difference / 120;
        const animating = direction > 0 ? y >= first && y < last : y > first && y <= last;
        const speedLimit = animating ? travel / 6000 : Infinity;
        const desiredSpeed = Math.max(-speedLimit, Math.min(speedLimit, desired));
        this.velocity += (desiredSpeed - this.velocity) * (1 - Math.exp(-dt / 55));
        let step = animating ? this.velocity * dt : difference * (1 - Math.exp(-dt / 85));
        const maxStep = travel * Math.min(dt / 6000, (.36 / 47) * .32);
        if (difference > 0 && y < last && this.target > first) {
            step = Math.min(step, Math.max(0, first - y) + maxStep);
        }
        else if (difference < 0 && y > first && this.target < last) {
            step = -Math.min(-step, Math.max(0, y - last) + maxStep);
        }
        if (Math.abs(step) > Math.abs(difference) || Math.abs(difference) < (animating ? .05 : 1.5))
            step = difference;
        let next = y + step;
        // Only inputs arriving AFTER the final/first drawing can traverse its plateau.
        // Discard the old queue at that exact boundary, in either direction.
        const completed = direction > 0 && y < last && next >= last;
        const rewound = direction < 0 && y > first && next <= first;
        if (completed || rewound) {
            next = completed ? last : first;
            this.target = next;
            this.hold = completed ? 1 : -1;
            this.velocity = 0;
        }
        this.position = next;
        scrollTo({ top: next, behavior: 'instant' });
        this.expected = scrollY;
        this.wake();
        if (Math.abs(this.target - next) > .01)
            this.frame = requestAnimationFrame(t => this.tick(t));
        else {
            this.target = null;
            this.previous = 0;
            this.velocity = 0;
        }
        if (next < start || next > end)
            this.hold = 0;
    }
    stop(preservePosition = false) {
        if (this.frame)
            cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.target = null;
        this.previous = 0;
        this.velocity = 0;
        if (!preservePosition) {
            this.position = null;
            this.hold = 0;
        }
    }
}
