// @ts-check
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const menu = document.querySelector('#site-menu');
  const opener = document.querySelector('.site-header .menu-button');
  const closer = document.querySelector('.menu-close');

  if (menu instanceof HTMLDialogElement && opener instanceof HTMLButtonElement && closer instanceof HTMLButtonElement) {
    const closeMenu = () => menu.close();
    opener.addEventListener('click', () => {
      menu.showModal();
      document.body.classList.add('menu-open');
      opener.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => menu.classList.add('is-open'));
      closer.focus({ preventScroll: true });
    });
    closer.addEventListener('click', closeMenu);
    menu.addEventListener('close', () => {
      document.body.classList.remove('menu-open');
      menu.classList.remove('is-open');
      opener.setAttribute('aria-expanded', 'false');
    });
    menu.querySelectorAll('a[href]').forEach((link) => {
      link.addEventListener('click', () => {
        closeMenu();
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          const destination = document.getElementById(href.slice(1));
          if (destination) {
            destination.setAttribute('tabindex', '-1');
            requestAnimationFrame(() => destination.focus({ preventScroll: true }));
          }
        }
      });
    });
  }

  const intro = document.querySelector('.intro');
  intro?.addEventListener('animationend', (event) => {
    if (event.target === intro) document.documentElement.classList.remove('show-intro');
  });

  const revealElements = Array.from(document.querySelectorAll('.reveal'));
  const movingElements = Array.from(document.querySelectorAll('[data-parallax]')).filter((element) => element instanceof HTMLElement);
  /** @type {IntersectionObserver | null} */
  let observer = null;
  let frame = 0;

  const paintParallax = () => {
    frame = 0;
    if (reducedMotion.matches) return;
    const viewport = window.innerHeight;
    const mobile = window.innerWidth <= 768;
    movingElements.forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      const rect = element.getBoundingClientRect();
      const previous = Number(element.dataset.offset || 0);
      const center = rect.top - previous + rect.height / 2;
      const speed = Number(element.dataset.parallax || 0) * (mobile ? 0.5 : 1);
      const offset = Math.max(-30, Math.min(30, (viewport / 2 - center) * speed));
      element.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      element.dataset.offset = String(offset);
    });
  };
  const queueParallax = () => {
    if (!frame && !reducedMotion.matches) frame = requestAnimationFrame(paintParallax);
  };
  const updateMotion = () => {
    observer?.disconnect();
    if (reducedMotion.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      document.documentElement.classList.remove('motion-ready', 'show-intro');
      movingElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.removeProperty('transform');
          delete element.dataset.offset;
        }
      });
      return;
    }
    if ('IntersectionObserver' in window) {
      document.documentElement.classList.add('motion-ready');
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer?.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -70px 0px', threshold: 0.06 });
      revealElements.forEach((element) => observer?.observe(element));
    }
    queueParallax();
  };
  window.addEventListener('scroll', queueParallax, { passive: true });
  window.addEventListener('resize', queueParallax);
  reducedMotion.addEventListener('change', updateMotion);
  updateMotion();
})();
