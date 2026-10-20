"use strict";
(() => {
    const mobileWidth = window.matchMedia('(max-width: 800px)');
    const control = document.querySelector('.motion-control');
    const menu = document.querySelector('.mobile-menu');
    const menuSummary = menu?.querySelector('summary');
    const tracks = Array.from(document.querySelectorAll('.marquee-track'));
    const matchMarqueeSpeed = () => {
        const baseDistances = mobileWidth.matches ? [4224, 5065] : [5075, 6086];
        const scale = mobileWidth.matches ? window.innerWidth / 390 : Math.min(window.innerWidth / 1440, 1);
        tracks.forEach((track, index) => {
            const pixelsPerSecond = ((baseDistances[index] ?? 5075) / 75) * scale;
            const loopDistance = track.getBoundingClientRect().width / 2;
            track.style.setProperty('--marquee-duration', `${loopDistance / pixelsPerSecond}s`);
        });
    };
    void document.fonts.ready.then(matchMarqueeSpeed);
    let resizeFrame = 0;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(matchMarqueeSpeed);
    }, { passive: true });
    if (control) {
        control.hidden = false;
        control.addEventListener('click', () => {
            const paused = document.body.classList.toggle('motion-paused');
            control.setAttribute('aria-pressed', String(paused));
            control.setAttribute('aria-label', paused ? '動きを再開する' : '動きを止める');
        });
    }
    menu?.addEventListener('toggle', () => {
        menuSummary?.setAttribute('aria-label', menu.open ? 'メニューを閉じる' : 'メニューを開く');
        document.documentElement.classList.toggle('menu-open', menu.open);
    });
    menu?.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            menu.open = false;
            const target = document.querySelector(link.hash);
            if (target) {
                target.tabIndex = -1;
                target.focus({ preventScroll: true });
            }
        });
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Tab' && menu?.open && menuSummary) {
            const items = [menuSummary, ...Array.from(menu.querySelectorAll('a'))];
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        }
        if (event.key === 'Escape' && menu?.open) {
            menu.open = false;
            menuSummary?.focus();
        }
    });
    document.addEventListener('click', (event) => {
        if (menu?.open && event.target instanceof Node && !menu.contains(event.target))
            menu.open = false;
    });
    mobileWidth.addEventListener('change', (event) => {
        if (!event.matches && menu)
            menu.open = false;
    });
})();
