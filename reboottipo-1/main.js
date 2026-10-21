// Compile with TypeScript --strict. No runtime dependencies.
function required(selector) {
    const node = document.querySelector(selector);
    if (!node)
        throw new Error(`Missing page element: ${selector}`);
    return node;
}
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ramp = (p, from, to) => clamp((p - from) / (to - from));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
function layoutTop(node) {
    let top = 0;
    let current = node;
    while (current) {
        top += current.offsetTop;
        current = current.offsetParent;
    }
    return top;
}
const track = required('.gullwing-track');
const stage = required('.gullwing-stage');
const rig = required('.car-rig');
const bounce = required('.car-bounce');
const door = required('.car-door');
const front = required('.wheel-front');
const rear = required('.wheel-rear');
const headLight = required('.head-light');
const underLight = required('.under-light');
const copy = required('.gullwing-copy');
const next = required('.next-heading');
const signature = required('.signature');
const fan = required('.fan');
const menu = required('.menu-toggle');
const navigation = required('#navigation');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const param = new URLSearchParams(location.search).get('p');
const parsed = param === null || param.trim() === '' ? Number.NaN : Number(param);
const forced = Number.isFinite(parsed) ? clamp(parsed) : null;
const strokes = [...document.querySelectorAll('.logo-stroke')].map(node => {
    const length = node.getTotalLength();
    node.style.strokeDasharray = `${length}`;
    return { node, length };
});
let reveals = [];
let drifts = [];
const fans = [...document.querySelectorAll('.fan-card')];
let trackTop = 0;
let scrollSpan = 1;
let viewport = window.innerHeight;
let signatureTop = 0;
let fanTop = 0;
let current = forced ?? 0;
let frame = 0;
let previousTime = 0;
let dirty = true;
let mobile = false;
function measure() {
    viewport = window.innerHeight;
    mobile = window.matchMedia('(max-width: 700px)').matches;
    trackTop = layoutTop(track);
    scrollSpan = Math.max(1, track.offsetHeight - stage.offsetHeight);
    signatureTop = layoutTop(signature);
    fanTop = layoutTop(fan);
    reveals = [...document.querySelectorAll('.reveal')].map(node => ({
        node, top: layoutTop(node), stagger: Number.parseFloat(getComputedStyle(node).getPropertyValue('--stagger')) || 0,
    }));
    drifts = [...document.querySelectorAll('[data-drift]')].map(node => ({
        node, top: layoutTop(node), height: node.offsetHeight, distance: Number(node.dataset.drift) || 0,
    }));
    wake();
}
function paintCar(p) {
    const arrival = easeOut(ramp(p, 0, .45));
    const distance = window.innerWidth / 2 + rig.offsetWidth / 2 + 50;
    const x = distance * (1 - arrival);
    rig.style.transform = `translate3d(calc(-50% + ${x}px),0,0)`;
    const settle = ramp(p, .415, .50);
    const sink = Math.sin(settle * Math.PI * 2) * (1 - settle) * 8;
    bounce.style.transform = `translate3d(0,${sink}px,0)`;
    // Rotation equals traveled distance divided by the displayed tire radius.
    const radius = (155.5 / 2400) * rig.offsetWidth;
    const wheelAngle = -distance * arrival / Math.max(radius, 1) * 180 / Math.PI;
    front.style.transform = rear.style.transform = `rotate(${wheelAngle}deg)`;
    headLight.style.opacity = `${ramp(p, .40, .50)}`;
    const t = ramp(p, .50, .85);
    // Small overshoot, then return to 82 degrees. A pure function of scroll progress.
    const c = 1.25;
    const opening = 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
    door.style.transform = `rotate(${-82 * opening}deg)`;
    underLight.style.opacity = `${ramp(p, .85, .93)}`;
    const wording = ramp(p, .85, .96);
    copy.style.opacity = `${wording}`;
    copy.style.transform = `translate3d(0,${(1 - wording) * 26}px,0)`;
    const heading = ramp(p, .94, 1);
    next.style.opacity = `${heading}`;
    next.style.transform = `translate3d(0,${(1 - heading) * 45}px,0)`;
    stage.dataset.progress = p.toFixed(4);
}
function paintOther(y) {
    const reduced = reduce.matches;
    const drawn = reduced ? 1 : ramp(y, signatureTop - viewport * .35, signatureTop + viewport * .45);
    for (const { node, length } of strokes)
        node.style.strokeDashoffset = `${length * (1 - drawn)}`;
    for (const item of reveals) {
        const v = reduced ? 1 : clamp((y + viewport * .94 - item.top - item.stagger) / (viewport * .3));
        item.node.style.opacity = `${v}`;
        item.node.style.transform = `translate3d(0,${item.stagger + (1 - v) * 48}px,0)`;
    }
    for (const item of drifts) {
        const local = clamp((y + viewport - item.top) / (viewport + item.height), 0, 1) - .5;
        item.node.style.transform = reduced ? 'none' : `translate3d(0,${local * item.distance}px,0)`;
    }
    const opened = reduced ? 1 : ramp(y + viewport, fanTop, fanTop + viewport * .65);
    const spacing = mobile ? 63 : 150;
    for (let n = 0; n < fans.length; n++) {
        const i = n - 2;
        fans[n].style.transform = `translateX(calc(-50% + ${i * spacing * (.25 + .75 * opened)}px)) translateY(${i * i * (mobile ? 12 : 16)}px) rotate(${i * (mobile ? 10 : 9) * opened}deg)`;
    }
}
function tick(time) {
    frame = 0;
    const target = reduce.matches ? 1 : forced ?? clamp((window.scrollY - trackTop) / scrollSpan);
    const dt = previousTime ? Math.min(time - previousTime, 50) : 1000 / 60;
    previousTime = time;
    if (forced !== null || reduce.matches)
        current = target;
    else
        current += (target - current) * (1 - Math.pow(1 - .12, dt / (1000 / 60)));
    if (Math.abs(target - current) < .00001)
        current = target;
    paintCar(current);
    if (dirty) {
        paintOther(window.scrollY);
        dirty = false;
    }
    if (current !== target)
        frame = requestAnimationFrame(tick);
    else
        previousTime = 0;
}
function wake() { dirty = true; if (!frame)
    frame = requestAnimationFrame(tick); }
function setMenu(open, restoreFocus = false) {
    navigation.hidden = !open;
    menu.setAttribute('aria-expanded', `${open}`);
    menu.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    document.body.classList.toggle('menu-open', open);
    if (open)
        navigation.querySelector('a')?.focus();
    else if (restoreFocus)
        menu.focus();
}
menu.addEventListener('click', () => setMenu(navigation.hidden, false));
navigation.addEventListener('click', event => {
    if (event.target.closest('a'))
        setMenu(false);
});
document.addEventListener('keydown', event => {
    if (navigation.hidden)
        return;
    if (event.key === 'Escape') {
        setMenu(false, true);
        return;
    }
    if (event.key !== 'Tab')
        return;
    const links = [...navigation.querySelectorAll('a')];
    const stops = [menu, ...links];
    const index = stops.indexOf(document.activeElement);
    if (event.shiftKey && index <= 0) {
        event.preventDefault();
        stops[stops.length - 1].focus();
    }
    else if (!event.shiftKey && index === stops.length - 1) {
        event.preventDefault();
        menu.focus();
    }
});
window.addEventListener('scroll', wake, { passive: true });
window.addEventListener('resize', measure, { passive: true });
reduce.addEventListener('change', measure);
window.addEventListener('load', measure, { once: true });
measure();
void document.fonts.ready.then(() => {
    measure();
    if (forced !== null) {
        // Diagnostic only: jump into the pinned scene and render the exact requested progress.
        const previous = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, trackTop);
        document.documentElement.style.scrollBehavior = previous;
        current = forced;
        paintCar(reduce.matches ? 1 : forced);
        paintOther(window.scrollY);
    }
});
export {};
