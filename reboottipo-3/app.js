import { clamp, fixedProgress, flash, needleRpm, ramp } from './motion.js';
function required(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`Missing page element: ${selector}`);
    return element;
}
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobile = window.matchMedia('(max-width: 768px)');
const pinnedProgress = fixedProgress(window.location.search);
const track = required('.bubbling-track');
const scene = required('.bubbling-scene');
const title = required('.bubbling-title');
const photo = required('.bubbling-photo img');
const dial = required('.tachometer');
const needle = required('.needle');
const glow = required('.red-glow');
const copy = required('.bubbling-copy');
const bursts = [...document.querySelectorAll('.blast-pulse')];
const parallax = [...document.querySelectorAll('.band-media img, .portal-media img')].map(image => ({ image, current: 0, target: 0 }));
let current = pinnedProgress ?? 0;
let target = current;
let frame = 0;
let dirty = true;
function draw(progress) {
    const p = reduced.matches ? 1 : progress;
    const entry = reduced.matches ? 1 : ramp(p, 0, .20);
    const revealDial = reduced.matches ? 1 : ramp(p, .20, .30);
    const revealCopy = reduced.matches ? 1 : ramp(p, .80, .86);
    const rpm = needleRpm(p);
    title.style.transform = `translate3d(${(1 - entry) * -100}px,0,0)`;
    title.style.opacity = String(entry);
    photo.style.opacity = String(.35 + entry * .25);
    dial.style.opacity = String(revealDial);
    dial.style.transform = `translate3d(0,-50%,0) scale(${.94 + revealDial * .06})`;
    needle.style.transform = `rotate(${-125 + rpm / 9 * 250}deg)`;
    glow.style.opacity = String(clamp((rpm - 7) / 2));
    copy.style.opacity = String(revealCopy);
    copy.style.transform = `translate3d(0,${(1 - revealCopy) * 20}px,0)`;
    const first = reduced.matches ? 0 : Math.max(flash(p, .835), flash(p, .965));
    const second = reduced.matches ? 0 : flash(p, .900);
    bursts.forEach((burst, index) => {
        const strength = index === 0 ? first : second;
        burst.style.opacity = String(strength);
        burst.style.transform = `scale(${.65 + strength * .7})`;
    });
    scene.dataset.progress = p.toFixed(5);
    scene.dataset.rpm = rpm.toFixed(4);
}
function measure() {
    const rect = track.getBoundingClientRect();
    const distance = Math.max(1, track.offsetHeight - scene.offsetHeight);
    target = pinnedProgress ?? clamp(-rect.top / distance);
    parallax.forEach(item => {
        const parent = item.image.parentElement;
        if (!parent)
            return;
        const box = parent.getBoundingClientRect();
        const center = (box.top + box.height / 2 - window.innerHeight / 2) / window.innerHeight;
        item.target = reduced.matches ? 0 : clamp(center, -1, 1) * (mobile.matches ? -10 : -18);
    });
    dirty = false;
}
function tick() {
    frame = 0;
    if (dirty)
        measure();
    if (reduced.matches) {
        draw(1);
        parallax.forEach(item => { item.current = 0; item.image.style.transform = 'none'; });
        return;
    }
    current = pinnedProgress ?? current + (target - current) * .12;
    if (Math.abs(target - current) < .00001)
        current = target;
    draw(current);
    let moving = Math.abs(target - current) > .00001;
    parallax.forEach(item => {
        item.current += (item.target - item.current) * .12;
        if (Math.abs(item.current - item.target) < .01)
            item.current = item.target;
        else
            moving = true;
        item.image.style.transform = `translate3d(0,${item.current.toFixed(3)}px,0)`;
    });
    if (moving)
        schedule();
}
function schedule() {
    if (!frame)
        frame = window.requestAnimationFrame(tick);
}
function invalidate() { dirty = true; schedule(); }
window.addEventListener('scroll', invalidate, { passive: true });
window.addEventListener('resize', invalidate, { passive: true });
reduced.addEventListener('change', invalidate);
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        // Removing the class above and below the viewport makes return travel reversible.
        entry.target.classList.toggle('is-visible', entry.isIntersecting);
    });
}, { threshold: 0, rootMargin: '50px 0px 50px 0px' });
document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
const menuButton = required('.menu-button');
const nav = required('.site-nav');
function setMenu(open) {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    nav.classList.toggle('open', open);
}
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('a'))
        setMenu(false);
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuButton.focus();
    }
});
const footerButtons = [...document.querySelectorAll('.footer-toggle')];
function resetFooter() {
    footerButtons.forEach(button => {
        const id = button.getAttribute('aria-controls');
        const list = id ? document.getElementById(id) : null;
        if (!list)
            return;
        button.tabIndex = mobile.matches ? 0 : -1;
        button.setAttribute('aria-expanded', String(!mobile.matches));
        list.hidden = mobile.matches;
    });
    if (!mobile.matches)
        setMenu(false);
}
footerButtons.forEach(button => button.addEventListener('click', () => {
    if (!mobile.matches)
        return;
    const id = button.getAttribute('aria-controls');
    const list = id ? document.getElementById(id) : null;
    if (!list)
        return;
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    list.hidden = !open;
}));
mobile.addEventListener('change', resetFooter);
resetFooter();
document.documentElement.classList.add('js');
draw(current);
invalidate();
if (pinnedProgress !== null && !reduced.matches) {
    const positionPreview = () => {
        window.scrollTo({ top: track.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
        current = pinnedProgress;
        draw(current);
        invalidate();
    };
    window.addEventListener('load', () => { void document.fonts.ready.then(positionPreview); }, { once: true });
}
