"use strict";
function required(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`Missing element: ${selector}`);
    return element;
}
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const hero = required('.hero');
const car = required('.hero-car');
const heroImage = required('#hero-image');
const backname = required('.hero-backname');
const records = JSON.parse(required('#hero-data').textContent || '[]');
const previous = required('.hero-prev');
const next = required('.hero-next');
let selected = 0;
let cleanupTimer;
let loading = false;
function clearSlices() {
    if (cleanupTimer !== undefined)
        window.clearTimeout(cleanupTimer);
    car.querySelectorAll('.hero-slice').forEach(slice => slice.remove());
    car.classList.remove('is-transitioning');
}
async function showCar(index) {
    if (loading || records.length === 0)
        return;
    const newIndex = (index + records.length) % records.length;
    const item = records[newIndex];
    if (!item)
        return;
    loading = true;
    previous.disabled = true;
    next.disabled = true;
    try {
        const preload = new Image();
        preload.src = `assets/images/${item.image}`;
        await preload.decode();
        clearSlices();
        selected = newIndex;
        heroImage.src = preload.src;
        heroImage.width = preload.naturalWidth;
        heroImage.height = preload.naturalHeight;
        heroImage.alt = `${item.name}の車両`;
        car.style.setProperty('--car-max', `${item.css_max_width}px`);
        hero.style.setProperty('--hero-color', item.color);
        required('#hero-number').textContent = `No.${String(item.number).padStart(2, '0')}`;
        required('#hero-name').textContent = item.name;
        required('#hero-size').textContent = item.size + (item.size_source === '記事タグ' ? '（記事タグ）' : '');
        required('#hero-record-link').href = item.article_url;
        required('#hero-position').textContent = String(selected + 1);
        required('#hero-announcement').textContent = `${selected + 1} / ${records.length} ${item.name} ${item.size}`;
        backname.textContent = item.name;
        backname.classList.remove('is-moving');
        if (!motion.matches) {
            car.classList.add('is-transitioning');
            for (let i = 0; i < 5; i += 1) {
                const slice = document.createElement('span');
                slice.className = 'hero-slice';
                slice.setAttribute('aria-hidden', 'true');
                slice.style.setProperty('--delay', `${(i + 1) * 100}ms`);
                const part = new Image();
                part.src = preload.src;
                part.alt = '';
                slice.append(part);
                car.append(slice);
            }
            void backname.offsetWidth;
            backname.classList.add('is-moving');
            cleanupTimer = window.setTimeout(clearSlices, 1350);
        }
    }
    finally {
        loading = false;
        previous.disabled = false;
        next.disabled = false;
    }
}
function changeCar(delta) { void showCar(selected + delta).catch(error => console.error('車の画像を表示できませんでした', error)); }
previous.addEventListener('click', () => changeCar(-1));
next.addEventListener('click', () => changeCar(1));
hero.addEventListener('keydown', (event) => {
    if (event.target !== previous && event.target !== next)
        return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        changeCar(event.key === 'ArrowRight' ? 1 : -1);
    }
});
let touchStart = null;
car.addEventListener('touchstart', (event) => { const t = event.touches[0]; if (t)
    touchStart = { x: t.clientX, y: t.clientY }; }, { passive: true });
car.addEventListener('touchend', (event) => { const t = event.changedTouches[0]; if (t && touchStart) {
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4)
        changeCar(dx < 0 ? 1 : -1);
} touchStart = null; }, { passive: true });
const menuButton = required('.menu-toggle');
const menu = required('#site-menu');
function setMenu(open, restoreFocus = false) { menu.hidden = !open; menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く'); if (restoreFocus)
    menuButton.focus(); }
menuButton.addEventListener('click', () => setMenu(menu.hidden));
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden)
    setMenu(false, true); });
document.addEventListener('click', (e) => { if (e.target instanceof Node && !menu.contains(e.target) && !menuButton.contains(e.target) && !menu.hidden)
    setMenu(false); });
const cards = Array.from(document.querySelectorAll('.work-card'));
const grid = required('.work-grid');
const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
let filterGeneration = 0;
function filterRecords(filter) {
    const generation = ++filterGeneration;
    filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
    const apply = () => {
        if (generation !== filterGeneration)
            return;
        grid.classList.add('is-filtered');
        let visible = 0;
        cards.forEach(card => {
            const match = filter === 'all' || (card.dataset.tags || '').split(' ').includes(filter);
            card.hidden = !match;
            card.classList.remove('is-right');
            if (match) {
                card.classList.toggle('is-right', visible % 2 === 1);
                visible += 1;
                if (filter !== 'all')
                    card.classList.add('is-visible');
            }
        });
        required('#result-count').textContent = String(visible);
        if (!motion.matches)
            grid.animate([{ opacity: .3 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
    };
    if (motion.matches)
        apply();
    else {
        const animation = grid.animate([{ opacity: 1 }, { opacity: .3 }], { duration: 140, easing: 'ease-in' });
        animation.onfinish = apply;
    }
}
filterButtons.forEach(button => button.addEventListener('click', () => filterRecords(button.dataset.filter || 'all')));
let observer = null;
if (!motion.matches && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => { for (const entry of entries) {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer?.unobserve(entry.target);
        }
    } }, { threshold: 0.08 });
    cards.forEach(c => { c.classList.add('reveal-ready'); observer?.observe(c); });
}
motion.addEventListener('change', () => { if (motion.matches) {
    clearSlices();
    backname.classList.remove('is-moving');
    observer?.disconnect();
    cards.forEach(c => c.classList.add('is-visible'));
    document.getAnimations().forEach(a => a.finish());
} });
const header = required('.site-header');
function updateHeader() { header.classList.toggle('is-scrolled', window.scrollY > 80); }
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();
