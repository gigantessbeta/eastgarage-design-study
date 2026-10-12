"use strict";
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-nav');
const contactBar = document.querySelector('.mobile-contact');
const heroContact = document.querySelector('.hero-cta');
function setMenu(open) {
    if (!menuButton || !navigation)
        return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    navigation.dataset.open = String(open);
    document.body.classList.toggle('menu-open', open);
}
menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    setMenu(open);
    if (open)
        navigation?.querySelector('a')?.focus();
});
navigation?.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a'))
        setMenu(false);
});
document.addEventListener('keydown', (event) => {
    if (menuButton?.getAttribute('aria-expanded') !== 'true')
        return;
    if (event.key === 'Escape') {
        setMenu(false);
        menuButton.focus();
    }
    if (event.key === 'Tab' && navigation) {
        const items = [...navigation.querySelectorAll('a'), menuButton];
        const current = items.findIndex(item => item === document.activeElement);
        const next = (current + (event.shiftKey ? -1 : 1) + items.length) % items.length;
        event.preventDefault();
        items[next]?.focus();
    }
});
window.matchMedia('(min-width: 761px)').addEventListener('change', (event) => {
    if (event.matches)
        setMenu(false);
});
if (heroContact && contactBar && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
        if (!entry)
            return;
        contactBar.classList.toggle('is-visible', !entry.isIntersecting && entry.boundingClientRect.bottom < 0);
    }, { threshold: 0 });
    observer.observe(heroContact);
}
