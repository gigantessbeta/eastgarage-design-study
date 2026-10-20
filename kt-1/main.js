"use strict";
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobile = window.matchMedia("(max-width: 768px)");
const navigation = document.querySelector(".navigation");
const menu = document.querySelector(".menu-toggle");
const motionButton = document.querySelector(".motion-toggle");
const hero = document.querySelector(".triptych");
const triptychFrames = [...document.querySelectorAll(".hero-frame")];
let paused = false;
let hovering = false;
let heroVisible = true;
let slideIndex = 0;
let timer;
function closeMenu(restoreFocus = false) {
    navigation?.classList.remove("is-open");
    menu?.setAttribute("aria-expanded", "false");
    menu?.setAttribute("aria-label", "メニューを開く");
    if (restoreFocus)
        menu?.focus();
}
menu?.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    navigation?.classList.toggle("is-open", open);
});
navigation?.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a"))
        closeMenu();
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu?.getAttribute("aria-expanded") === "true")
        closeMenu(true);
});
mobile.addEventListener("change", () => closeMenu());
function showSlide(index) {
    triptychFrames.forEach((frame) => {
        frame.querySelectorAll(".hero-slide").forEach((slide, i) => {
            slide.classList.toggle("is-current", i === index);
            slide.setAttribute("aria-hidden", String(i !== index));
        });
    });
}
function updateTimer() {
    window.clearInterval(timer);
    timer = undefined;
    if (reduced.matches) {
        slideIndex = 0;
        showSlide(0);
    }
    if (motionButton)
        motionButton.hidden = reduced.matches;
    if (reduced.matches || paused || hovering || !heroVisible || document.hidden)
        return;
    timer = window.setInterval(() => {
        slideIndex = (slideIndex + 1) % 3;
        showSlide(slideIndex);
    }, 5000);
}
motionButton?.addEventListener("click", () => {
    paused = !paused;
    motionButton.setAttribute("aria-pressed", String(paused));
    const label = motionButton.querySelector("span");
    if (label)
        label.textContent = paused ? "動きを再開する" : "動きを止める";
    updateTimer();
});
hero?.addEventListener("mouseenter", () => { hovering = true; updateTimer(); });
hero?.addEventListener("mouseleave", () => { hovering = false; updateTimer(); });
document.addEventListener("visibilitychange", updateTimer);
if ("IntersectionObserver" in window) {
    const reveals = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                reveals.unobserve(entry.target);
            }
        });
    }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });
    document.querySelectorAll(".reveal").forEach((element) => {
        // Only elements below the first viewport wait for an entrance animation.
        if (!reduced.matches && element.getBoundingClientRect().top > window.innerHeight) {
            element.classList.add("will-reveal");
            reveals.observe(element);
        }
    });
    if (hero) {
        const heroObserver = new IntersectionObserver(([entry]) => {
            heroVisible = entry?.isIntersecting ?? true;
            updateTimer();
        });
        heroObserver.observe(hero);
    }
}
reduced.addEventListener("change", () => {
    if (reduced.matches)
        document.querySelectorAll(".will-reveal").forEach((el) => el.classList.add("is-visible"));
    updateTimer();
});
updateTimer();
