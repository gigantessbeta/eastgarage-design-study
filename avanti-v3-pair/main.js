"use strict";
const menu = document.querySelector("#site-menu");
const menuTab = document.querySelector(".menu-tab");
const closeButton = document.querySelector(".menu-close");
if (menu && menuTab) {
    menuTab.addEventListener("click", () => {
        menu.showModal();
        menuTab.setAttribute("aria-expanded", "true");
        document.documentElement.classList.add("menu-is-open");
    });
    closeButton?.addEventListener("click", () => menu.close());
    menu.addEventListener("click", (event) => {
        if (event.target !== menu)
            return;
        const bounds = menu.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)
            menu.close();
    });
    menu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            menu.close();
            const href = link.getAttribute("href");
            if (href?.startsWith("#")) {
                const target = document.getElementById(href.slice(1));
                if (target) {
                    target.tabIndex = -1;
                    target.focus({ preventScroll: true });
                    target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
                }
            }
        });
    });
    menu.addEventListener("close", () => {
        menuTab.setAttribute("aria-expanded", "false");
        document.documentElement.classList.remove("menu-is-open");
    });
}
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const track = document.querySelector(".slides");
const slides = Array.from(document.querySelectorAll(".slide"));
let currentSlide = 0;
let interval;
function showSlide(index) {
    currentSlide = index;
    if (track)
        track.style.transform = `translateX(-${index * 100}%)`;
    slides.forEach((slide, i) => slide.setAttribute("aria-hidden", String(i !== index)));
}
function updateSlideshow() {
    if (interval !== undefined) {
        window.clearInterval(interval);
        interval = undefined;
    }
    if (reducedMotion.matches) {
        showSlide(0);
        return;
    }
    if (!document.hidden && track && slides.length > 1) {
        interval = window.setInterval(() => showSlide((currentSlide + 1) % slides.length), 5000);
    }
}
reducedMotion.addEventListener("change", updateSlideshow);
document.addEventListener("visibilitychange", updateSlideshow);
updateSlideshow();
