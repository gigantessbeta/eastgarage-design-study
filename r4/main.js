"use strict";
const photoFrames = Array.from(document.querySelectorAll(".photo-frame"));
function renderPhoto(frame) {
    const img = frame.querySelector("img");
    if (!img || !img.naturalWidth || !img.naturalHeight || !frame.clientWidth || !frame.clientHeight)
        return;
    const values = frame.dataset.crop?.trim().split(/\s+/).map(Number);
    const crop = values?.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[3] > 0
        ? [values[0], values[1], values[2], values[3]] : [0, 0, img.naturalWidth, img.naturalHeight];
    const scale = Math.max(frame.clientWidth / crop[2], frame.clientHeight / crop[3]);
    img.style.width = `${img.naturalWidth * scale}px`;
    img.style.height = `${img.naturalHeight * scale}px`;
    img.style.left = `${(frame.clientWidth - crop[2] * scale) / 2 - crop[0] * scale}px`;
    img.style.top = `${(frame.clientHeight - crop[3] * scale) / 2 - crop[1] * scale}px`;
    img.style.maxWidth = "none";
}
photoFrames.forEach((frame) => {
    const img = frame.querySelector("img");
    img?.addEventListener("load", () => renderPhoto(frame));
    renderPhoto(frame);
});
if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver((entries) => entries.forEach((entry) => renderPhoto(entry.target)));
    photoFrames.forEach((frame) => observer.observe(frame));
}
else {
    window.addEventListener("resize", () => photoFrames.forEach(renderPhoto), { passive: true });
}
// M-POL-NAV: the header stays fixed; mobile navigation can be closed by Escape or a selected anchor.
const menu = document.querySelector(".menu-button");
const nav = document.querySelector("#site-nav");
function closeMenu(returnFocus = false) {
    if (!menu || !nav)
        return;
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "メニューを開く");
    nav.classList.remove("open");
    if (returnFocus)
        menu.focus();
}
menu?.addEventListener("click", () => {
    if (!nav)
        return;
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    nav.classList.toggle("open", open);
});
nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeMenu()));
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu?.getAttribute("aria-expanded") === "true")
        closeMenu(true);
});
window.matchMedia("(min-width: 761px)").addEventListener("change", () => closeMenu());
// M-HAY-REVEAL: one-time photo/label reveal. Without JS or with reduced motion, all content is visible.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
if (!reducedMotion.matches && "IntersectionObserver" in window) {
    document.documentElement.classList.add("motion-ready");
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting)
                return;
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.1 });
    document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
    reducedMotion.addEventListener("change", (event) => {
        if (event.matches) {
            document.documentElement.classList.remove("motion-ready");
            revealObserver.disconnect();
        }
    });
}
// Gemini original motion: the main consultation line draws once as the flow enters the viewport.
const flowSection = document.querySelector(".flow");
if (flowSection && !reducedMotion.matches && typeof IntersectionObserver !== "undefined") {
    const lineObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting)
                return;
            entry.target.classList.add("line-visible");
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.25 });
    lineObserver.observe(flowSection);
    reducedMotion.addEventListener("change", (event) => {
        if (event.matches) {
            flowSection.classList.add("line-visible");
            lineObserver.disconnect();
        }
    });
}
