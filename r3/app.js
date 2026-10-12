"use strict";
const menu = document.querySelector('.menu');
const nav = document.querySelector('#nav');
const setOpen = (open) => {
    if (!menu || !nav)
        return;
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    nav.classList.toggle('open', open);
};
menu?.addEventListener('click', () => setOpen(menu.getAttribute('aria-expanded') !== 'true'));
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        menu.focus();
    }
});
