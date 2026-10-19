"use strict";
// Compile with TypeScript strict mode. No libraries or external requests.
(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const menuButton = document.querySelector('.menu-toggle');
    const menu = document.querySelector('#menu');
    function setMenu(open) {
        if (!menu || !menuButton)
            return;
        menu.hidden = !open;
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    }
    menuButton?.addEventListener('click', () => setMenu(menu?.hidden ?? false));
    menu?.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setMenu(false));
    });
    document.addEventListener('click', (event) => {
        const target = event.target;
        if (target instanceof Node && !menu?.contains(target) && !menuButton?.contains(target))
            setMenu(false);
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && menu && !menu.hidden) {
            setMenu(false);
            menuButton?.focus();
        }
    });
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    function activateTab(selected, focus) {
        tabs.forEach((tab) => {
            const active = tab === selected;
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
            const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
            if (panel)
                panel.hidden = !active;
        });
        if (focus)
            selected.focus({ preventScroll: true });
        const strip = selected.parentElement;
        if (strip && strip.scrollWidth > strip.clientWidth) {
            strip.scrollTo({ left: selected.offsetLeft - strip.offsetLeft - 15, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
        }
    }
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activateTab(tab, false));
        tab.addEventListener('keydown', (event) => {
            let next = index;
            if (event.key === 'ArrowRight')
                next = (index + 1) % tabs.length;
            else if (event.key === 'ArrowLeft')
                next = (index - 1 + tabs.length) % tabs.length;
            else if (event.key === 'Home')
                next = 0;
            else if (event.key === 'End')
                next = tabs.length - 1;
            else
                return;
            event.preventDefault();
            const target = tabs[next];
            if (target)
                activateTab(target, true);
        });
    });
    const photos = Array.from(document.querySelectorAll('.reveal'));
    let photoObserver = null;
    if (!reducedMotion.matches && 'IntersectionObserver' in window) {
        photoObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting)
                    return;
                entry.target.classList.remove('is-waiting');
                entry.target.classList.add('is-visible');
                photoObserver?.unobserve(entry.target);
            });
        }, { threshold: 0.08 });
        photos.forEach((photo) => {
            photo.classList.add('is-waiting');
            photoObserver?.observe(photo);
        });
    }
    const paths = Array.from(document.querySelectorAll('.draw-line'));
    const lengths = new Map();
    paths.forEach((path) => {
        const length = path.getTotalLength();
        lengths.set(path, length);
        path.style.strokeDasharray = String(length);
    });
    let lineFrame = 0;
    function paintLines() {
        lineFrame = 0;
        paths.forEach((path) => {
            const svg = path.ownerSVGElement;
            if (!svg)
                return;
            const box = svg.getBoundingClientRect();
            const progress = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (window.innerHeight - box.top) / Math.max(1, box.height)));
            path.style.strokeDashoffset = String((lengths.get(path) ?? 0) * (1 - progress));
        });
    }
    function scheduleLines() {
        if (!lineFrame)
            lineFrame = requestAnimationFrame(paintLines);
    }
    window.addEventListener('scroll', scheduleLines, { passive: true });
    window.addEventListener('resize', scheduleLines, { passive: true });
    document.querySelectorAll('details').forEach((detail) => {
        detail.addEventListener('toggle', scheduleLines);
    });
    paintLines();
    const benefits = document.querySelector('.benefits');
    const viewport = document.querySelector('.benefit-window');
    const track = document.querySelector('.benefit-track');
    let carouselFrame = 0;
    let offset = 0;
    let period = 0;
    let step = 272;
    let lastTime = 0;
    let hovering = false;
    let focused = false;
    let touching = false;
    let onscreen = true;
    let manualPauseUntil = 0;
    function canMove() {
        return !reducedMotion.matches && !document.hidden && !hovering && !focused && !touching && onscreen;
    }
    function drawCarousel() {
        if (!track || period <= 0)
            return;
        offset = ((offset % period) + period) % period;
        track.style.transform = `translateX(${-offset}px)`;
    }
    function animateCarousel(time) {
        carouselFrame = 0;
        if (!canMove()) {
            lastTime = 0;
            return;
        }
        if (lastTime && time >= manualPauseUntil)
            offset += Math.min(time - lastTime, 64) * 0.018;
        lastTime = time;
        drawCarousel();
        carouselFrame = requestAnimationFrame(animateCarousel);
    }
    function updateCarousel() {
        if (carouselFrame)
            cancelAnimationFrame(carouselFrame);
        carouselFrame = 0;
        lastTime = 0;
        if (canMove() && track)
            carouselFrame = requestAnimationFrame(animateCarousel);
    }
    if (track && viewport && benefits) {
        const originalCards = Array.from(track.children).filter((child) => child instanceof HTMLElement);
        // Two extra sets keep a complete row visible across the seamless wrap.
        for (let repeat = 0; repeat < 2; repeat += 1) {
            originalCards.forEach((card) => {
                const clone = card.cloneNode(true);
                clone.setAttribute('aria-hidden', 'true');
                clone.inert = true;
                track.append(clone);
            });
        }
        function measureCarousel() {
            if (!track)
                return;
            const first = originalCards[0];
            if (!first)
                return;
            step = first.offsetWidth + parseFloat(getComputedStyle(track).gap);
            period = step * originalCards.length;
            drawCarousel();
        }
        measureCarousel();
        if (typeof ResizeObserver !== 'undefined')
            new ResizeObserver(measureCarousel).observe(viewport);
        else
            window.addEventListener('resize', measureCarousel);
        benefits.addEventListener('mouseenter', () => { hovering = true; updateCarousel(); });
        benefits.addEventListener('mouseleave', () => { hovering = false; updateCarousel(); });
        benefits.addEventListener('focusin', () => { focused = true; updateCarousel(); });
        benefits.addEventListener('focusout', (event) => {
            focused = event.relatedTarget instanceof Node && benefits.contains(event.relatedTarget);
            updateCarousel();
        });
        viewport.addEventListener('pointerdown', () => { touching = true; updateCarousel(); });
        window.addEventListener('pointerup', () => { touching = false; updateCarousel(); });
        window.addEventListener('pointercancel', () => { touching = false; updateCarousel(); });
        document.addEventListener('visibilitychange', updateCarousel);
        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                onscreen = entries.some((entry) => entry.isIntersecting);
                updateCarousel();
            }).observe(viewport);
        }
        function moveCard(direction) {
            offset += direction * step;
            manualPauseUntil = performance.now() + 4500;
            drawCarousel();
        }
        benefits.querySelector('.previous')?.addEventListener('click', () => moveCard(-1));
        benefits.querySelector('.next')?.addEventListener('click', () => moveCard(1));
        updateCarousel();
    }
    reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) {
            photoObserver?.disconnect();
            photos.forEach((photo) => photo.classList.remove('is-waiting'));
        }
        paintLines();
        updateCarousel();
    });
})();
