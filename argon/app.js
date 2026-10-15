"use strict";
const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
function sizeScenes() {
    const mobile = window.innerWidth <= 700;
    const scale = Math.min(1, window.innerWidth / (mobile ? 390 : 1440));
    const heroScale = mobile ? scale : Math.min(scale, window.innerHeight / 880);
    root.style.setProperty('--site-scale', String(scale));
    root.style.setProperty('--hero-scale', String(heroScale));
}
sizeScenes();
window.addEventListener('resize', sizeScenes);
const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('#garage-menu');
let previouslyFocused = null;
function closeMenu() {
    menu?.classList.remove('open');
    if (menu)
        menu.inert = true;
    menuButton?.setAttribute('aria-expanded', 'false');
    const label = menuButton?.querySelector('span');
    if (label)
        label.textContent = 'MENU';
    menuButton?.querySelector('path')?.setAttribute('d', 'M1 3h26M1 11h26M1 19h26');
    document.body.style.overflow = '';
}
menuButton?.addEventListener('click', () => {
    if (menuButton.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        return;
    }
    if (!menu)
        return;
    menu.inert = false;
    menu.classList.add('open');
    menuButton.setAttribute('aria-expanded', 'true');
    const label = menuButton.querySelector('span');
    if (label)
        label.textContent = '× CLOSE';
    menuButton.querySelector('path')?.setAttribute('d', 'M4 2l20 18M24 2L4 20');
    document.body.style.overflow = 'hidden';
    menu.querySelector('a')?.focus();
});
menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => {
    if (menu?.classList.contains('open')) {
        if (event.key === 'Escape') {
            closeMenu();
            menuButton?.focus();
        }
        if (event.key === 'Tab') {
            const links = Array.from(menu.querySelectorAll('a'));
            if (event.shiftKey && document.activeElement === menuButton) {
                event.preventDefault();
                links.at(-1)?.focus();
            }
            else if (event.shiftKey && document.activeElement === links[0]) {
                event.preventDefault();
                menuButton?.focus();
            }
            else if (!event.shiftKey && document.activeElement === menuButton) {
                event.preventDefault();
                links[0]?.focus();
            }
            else if (!event.shiftKey && document.activeElement === links.at(-1)) {
                event.preventDefault();
                menuButton?.focus();
            }
        }
    }
});
function startReveals() {
    if (reduced.matches) {
        root.classList.remove('js-motion');
        return;
    }
    root.classList.add('js-motion');
    const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-revealed');
                observer.unobserve(entry.target);
            }
        }
    }, { threshold: 0.2 });
    document.querySelectorAll('.reveal:not(.is-revealed)').forEach(element => observer.observe(element));
}
startReveals();
reduced.addEventListener('change', startReveals);
const mapDialog = document.querySelector('#map-dialog');
document.querySelectorAll('[data-map]').forEach(link => link.addEventListener('click', event => {
    if (!mapDialog)
        return;
    event.preventDefault();
    previouslyFocused = link;
    const frame = mapDialog.querySelector('iframe');
    if (frame && !frame.src)
        frame.src = 'https://www.google.com/maps?q=愛知県豊橋市小畷町396&output=embed';
    mapDialog.showModal();
}));
mapDialog?.querySelector('button')?.addEventListener('click', () => mapDialog.close());
mapDialog?.addEventListener('close', () => previouslyFocused?.focus());
