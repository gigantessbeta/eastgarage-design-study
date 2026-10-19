'use strict';
const toggle = document.querySelector('.menu-toggle');
const dialog = document.querySelector('#global-menu');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function closeMenu() {
    dialog?.close();
    toggle?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
}
if (toggle && dialog) {
    toggle.addEventListener('click', () => {
        if (dialog.open) {
            closeMenu();
        }
        else {
            dialog.showModal();
            toggle.setAttribute('aria-expanded', 'true');
            document.body.classList.add('menu-open');
        }
    });
    dialog.addEventListener('cancel', closeMenu);
    dialog.querySelector('.dialog-close')?.addEventListener('click', closeMenu);
    dialog.addEventListener('close', () => {
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
    });
    dialog.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', closeMenu);
    });
}
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        }
    }, { threshold: 0.08 });
    reveals.forEach((element) => observer.observe(element));
    reducedMotion.addEventListener('change', (event) => {
        if (event.matches) {
            observer.disconnect();
            reveals.forEach((element) => element.classList.add('is-visible'));
        }
    });
}
