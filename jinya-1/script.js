"use strict";
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const reveals = document.querySelectorAll(".reveal");
const shop = document.querySelector(".shop");
let observer = null;
let frame = null;
function updateDrift() {
    frame = null;
    if (!shop || motionQuery.matches)
        return;
    const bounds = shop.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > window.innerHeight)
        return;
    const progress = Math.max(0, Math.min(1, (window.innerHeight - bounds.top) / (window.innerHeight + bounds.height)));
    const drift = (progress - 0.5) * 50;
    shop.style.setProperty("--drift", `${drift.toFixed(1)}px`);
    shop.style.setProperty("--drift-reverse", `${(-drift).toFixed(1)}px`);
}
function onScroll() {
    if (!motionQuery.matches && frame === null)
        frame = window.requestAnimationFrame(updateDrift);
}
function configureMotion() {
    observer?.disconnect();
    observer = null;
    if (frame !== null)
        window.cancelAnimationFrame(frame);
    frame = null;
    document.documentElement.classList.remove("motion-ready");
    if (motionQuery.matches || !("IntersectionObserver" in window)) {
        reveals.forEach((element) => element.classList.add("is-visible"));
        shop?.style.removeProperty("--drift");
        shop?.style.removeProperty("--drift-reverse");
        return;
    }
    observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting)
                return;
            entry.target.classList.add("is-visible");
            observer?.unobserve(entry.target);
        });
    }, { rootMargin: "0px 0px -23% 0px", threshold: 0 });
    reveals.forEach((element) => observer?.observe(element));
    document.documentElement.classList.add("motion-ready");
    updateDrift();
}
configureMotion();
motionQuery.addEventListener("change", configureMotion);
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });
