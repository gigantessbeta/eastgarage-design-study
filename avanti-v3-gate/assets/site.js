"use strict";
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const toggle = document.querySelector('.menu-toggle');
const shopNavigation = document.querySelector('.shop-navigation');
function setMenu(open) {
    if (!toggle || !shopNavigation)
        return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    shopNavigation.classList.toggle('is-open', open);
}
toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
shopNavigation?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setMenu(false));
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
    }
});
window.matchMedia('(max-width: 799px)').addEventListener('change', () => setMenu(false));
document.querySelectorAll('.gallery-section').forEach(gallery => {
    const largeImage = gallery.querySelector('.gallery-main img');
    const largeSource = gallery.querySelector('.gallery-main source');
    const buttons = gallery.querySelectorAll('button.gallery-thumb');
    buttons.forEach(button => button.addEventListener('click', () => {
        const name = button.dataset.photo;
        if (!name || !largeImage || !largeSource)
            return;
        largeSource.srcset = `assets/photos/${name}-sp.jpg`;
        largeImage.src = `assets/photos/${name}-pc.jpg`;
        largeImage.alt = button.querySelector('img')?.alt ?? '';
        buttons.forEach(candidate => candidate.setAttribute('aria-pressed', String(candidate === button)));
    }));
});
const sections = document.querySelectorAll('.shop-section');
if ('IntersectionObserver' in window && sections.length > 0) {
    document.querySelectorAll('.menu-column').forEach(column => {
        column.querySelectorAll('.menu-row').forEach((row, index) => {
            row.style.setProperty('--row-delay', `${index * 0.05}s`);
        });
    });
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting)
                return;
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
        });
    }, { threshold: 0.02 });
    sections.forEach(section => revealObserver.observe(section));
    if (!reducedMotion.matches)
        document.documentElement.classList.add('motion-ready');
    reducedMotion.addEventListener('change', event => {
        if (event.matches)
            document.documentElement.classList.remove('motion-ready');
    });
    const navLinks = document.querySelectorAll('.shop-navigation nav a');
    const locationObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting)
                return;
            navLinks.forEach(link => {
                if (link.hash === `#${entry.target.id}`)
                    link.setAttribute('aria-current', 'location');
                else
                    link.removeAttribute('aria-current');
            });
        });
    }, { rootMargin: '-25% 0px -60% 0px', threshold: 0 });
    sections.forEach(section => locationObserver.observe(section));
}
