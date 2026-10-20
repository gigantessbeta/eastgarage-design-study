"use strict";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionButton = document.querySelector(".motion-toggle");
let paused = false;
const motionAllowed = () => !reducedMotion.matches && !paused;
motionButton?.addEventListener("click", () => {
    paused = !paused;
    document.documentElement.dataset.motion = paused ? "paused" : "running";
    motionButton.setAttribute("aria-pressed", String(paused));
    motionButton.setAttribute("aria-label", paused ? "動きを再開する" : "動きを止める");
});
document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const track = carousel.querySelector(".card-track, .review-track");
    const previous = carousel.querySelector("[data-prev]");
    const next = carousel.querySelector("[data-next]");
    if (!track || !previous || !next)
        return;
    const update = () => {
        previous.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    const move = (direction) => {
        const first = track.querySelector("li");
        if (!first)
            return;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        track.scrollBy({
            left: direction * (first.getBoundingClientRect().width + gap),
            behavior: motionAllowed() ? "smooth" : "instant",
        });
    };
    previous.addEventListener("click", () => move(-1));
    next.addEventListener("click", () => move(1));
    track.addEventListener("keydown", (event) => {
        if (event.target !== track || !["ArrowLeft", "ArrowRight"].includes(event.key))
            return;
        event.preventDefault();
        move(event.key === "ArrowLeft" ? -1 : 1);
    });
    track.addEventListener("scroll", update, { passive: true });
    new ResizeObserver(update).observe(track);
    document.fonts.ready.then(update).catch(update);
    update();
});
// Content starts visible, so unavailable JavaScript never hides sections.
if ("IntersectionObserver" in window) {
    const entrance = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting)
                return;
            if (motionAllowed())
                entry.target.classList.add("reveal-enter");
            entrance.unobserve(entry.target);
        });
    }, { threshold: 0.12 });
    document.querySelectorAll("[data-reveal]").forEach((item) => entrance.observe(item));
    reducedMotion.addEventListener("change", () => {
        if (reducedMotion.matches) {
            document.querySelectorAll(".reveal-enter").forEach((item) => {
                item.classList.remove("reveal-enter");
            });
        }
    });
}
const menu = document.querySelector(".mobile-menu");
menu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => { menu.open = false; });
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu?.open) {
        menu.open = false;
        menu.querySelector("summary")?.focus();
    }
});
