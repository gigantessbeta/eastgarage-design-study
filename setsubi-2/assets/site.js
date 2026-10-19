"use strict";
const menuButton = document.querySelector(".menu-toggle");
const headerNav = document.querySelector("#header-nav");
const mobile = window.matchMedia("(max-width: 767px)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
function setMenu(open) {
    if (!menuButton || !headerNav)
        return;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    headerNav.classList.toggle("is-open", open);
}
menuButton?.addEventListener("click", () => {
    setMenu(menuButton.getAttribute("aria-expanded") !== "true");
});
headerNav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton?.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        menuButton.focus();
    }
});
document.addEventListener("click", (event) => {
    if (event.target instanceof Node && !headerNav?.contains(event.target) && !menuButton?.contains(event.target)) {
        setMenu(false);
    }
});
mobile.addEventListener("change", () => setMenu(false));
const reveals = Array.from(document.querySelectorAll(".reveal"));
let revealObserver = null;
const band = document.querySelector(".town-band");
const picture = document.querySelector(".town-picture");
let scrollFrame = 0;
function updateParallax() {
    scrollFrame = 0;
    if (!band || !picture || reducedMotion.matches)
        return;
    const rect = band.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight)
        return;
    const travel = mobile.matches ? 8 : 30;
    const progress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - rect.top - rect.height / 2) / window.innerHeight));
    picture.style.setProperty("--parallax-y", (progress * travel).toFixed(2) + "px");
}
function scheduleParallax() {
    if (!scrollFrame && !reducedMotion.matches)
        scrollFrame = window.requestAnimationFrame(updateParallax);
}
function configureMotion() {
    revealObserver?.disconnect();
    revealObserver = null;
    if (scrollFrame)
        window.cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    if (reducedMotion.matches) {
        reveals.forEach((element) => element.classList.add("is-visible"));
        picture?.style.removeProperty("--parallax-y");
        return;
    }
    if ("IntersectionObserver" in window) {
        revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && entry.target instanceof HTMLElement) {
                    entry.target.classList.add("is-visible");
                    revealObserver?.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: "0px 0px 30px 0px" });
        reveals.forEach((element) => {
            if (!element.classList.contains("is-visible")) {
                element.classList.add("reveal-ready");
                revealObserver?.observe(element);
            }
        });
    }
    scheduleParallax();
}
window.addEventListener("scroll", scheduleParallax, { passive: true });
window.addEventListener("resize", scheduleParallax);
reducedMotion.addEventListener("change", configureMotion);
configureMotion();
