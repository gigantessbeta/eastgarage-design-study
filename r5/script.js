"use strict";
const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
function fit() {
    const mobile = window.innerWidth < 768;
    const scale = Math.min(1, window.innerWidth / 1440);
    root.style.setProperty('--scale', String(mobile ? 1 : scale));
    root.style.setProperty('--mobile-scale', String(mobile ? window.innerWidth / 390 : 1));
    const heroScale = mobile ? 1 : Math.min(scale, Math.max(.5, (window.innerHeight * .92 - 64) / 760));
    root.style.setProperty('--hero-scale', String(heroScale));
    root.style.setProperty('--hero-bleed', `${mobile ? 0 : Math.max(0, (window.innerWidth / heroScale - 1440) / 2)}px`);
}
fit();
window.addEventListener('resize', fit, { passive: true });
const menu = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() {
    if (!menu || !mobileNav)
        return;
    mobileNav.hidden = true;
    menu.setAttribute('aria-expanded', 'false');
}
menu?.addEventListener('click', () => {
    if (!mobileNav)
        return;
    const open = mobileNav.hidden;
    mobileNav.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
});
mobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileNav && !mobileNav.hidden) {
        closeMenu();
        menu?.focus();
    }
});
root.classList.add('motion');
const targets = document.querySelectorAll('.reveal,.ig-photo');
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: .08 });
targets.forEach(target => observer.observe(target));
function motionPreference() {
    if (reduced.matches)
        targets.forEach(target => target.classList.add('visible'));
}
motionPreference();
reduced.addEventListener('change', motionPreference);
