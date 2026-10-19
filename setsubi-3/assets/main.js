"use strict";
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileQuery = window.matchMedia("(max-width: 768px)");
const menuButton = document.querySelector(".menu-toggle");
const menu = document.querySelector("#site-menu");
function closeMenu(returnFocus = false) {
    if (!menuButton || !menu)
        return;
    menu.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "メニューを開く");
    if (returnFocus)
        menuButton.focus();
}
menuButton?.addEventListener("click", () => {
    if (!menuButton || !menu)
        return;
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menu.hidden = expanded;
    menuButton.setAttribute("aria-expanded", String(!expanded));
    menuButton.setAttribute("aria-label", expanded ? "メニューを開く" : "メニューを閉じる");
});
menu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeMenu());
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu && !menu.hidden)
        closeMenu(true);
});
document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node) || !menu || menu.hidden)
        return;
    if (!menu.contains(event.target) && !menuButton?.contains(event.target))
        closeMenu();
});
const seenPoints = new Set();
const pointCards = [...document.querySelectorAll("[data-point]")];
const remaining = document.querySelector("#remaining-count");
pointCards.forEach((card) => {
    card.addEventListener("toggle", () => {
        if (card.open)
            seenPoints.add(card);
        if (remaining)
            remaining.textContent = String(pointCards.length - seenPoints.size);
        scheduleRoad();
    });
});
const stage = document.querySelector(".journey-stage");
const roadSvg = document.querySelector(".road-svg");
const roadBed = document.querySelector(".road-bed");
const roadPipe = document.querySelector("#road-pipe");
const drop = document.querySelector(".water-drop");
const rows = [...document.querySelectorAll(".point-row")];
let roadFrame = 0;
let dropFrame = 0;
let roadLength = 0;
let pathStart = 180;
function rebuildRoad() {
    roadFrame = 0;
    if (!stage || !roadSvg || !roadBed || !roadPipe || rows.length !== 4)
        return;
    const stageRect = stage.getBoundingClientRect();
    const width = stageRect.width;
    const height = stageRect.height;
    const middle = width / 2;
    const atRowBottom = (index) => {
        const row = rows[index];
        return row ? row.getBoundingClientRect().bottom - stageRect.top : 0;
    };
    pathStart = mobileQuery.matches ? 200 : 180;
    let path;
    if (mobileQuery.matches) {
        path = `M ${middle} ${pathStart} V ${height}`;
    }
    else {
        const left = 60;
        const right = width - 60;
        const radius = 42;
        const bendOne = atRowBottom(0) + 40;
        const bendTwo = atRowBottom(1) + 65;
        const bendThree = atRowBottom(2) + 65;
        path = [
            `M ${middle} ${pathStart} V ${bendOne - radius}`,
            `Q ${middle} ${bendOne} ${middle + radius} ${bendOne}`,
            `H ${right - radius} Q ${right} ${bendOne} ${right} ${bendOne + radius}`,
            `V ${bendTwo - radius} Q ${right} ${bendTwo} ${right - radius} ${bendTwo}`,
            `H ${left + radius} Q ${left} ${bendTwo} ${left} ${bendTwo + radius}`,
            `V ${bendThree - radius} Q ${left} ${bendThree} ${left + radius} ${bendThree}`,
            `H ${middle - radius} Q ${middle} ${bendThree} ${middle} ${bendThree + radius}`,
            `V ${height}`,
        ].join(" ");
    }
    roadSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    roadBed.setAttribute("d", path);
    roadPipe.setAttribute("d", path);
    roadLength = roadPipe.getTotalLength();
    positionDrop();
}
function scheduleRoad() {
    if (!roadFrame)
        roadFrame = window.requestAnimationFrame(rebuildRoad);
}
function positionDrop() {
    dropFrame = 0;
    if (!stage || !roadPipe || !drop || roadLength <= 0)
        return;
    const bounds = stage.getBoundingClientRect();
    const distance = Math.max(1, bounds.height - pathStart);
    const progress = motionQuery.matches ? 0 : Math.min(1, Math.max(0, (window.innerHeight * .56 - bounds.top - pathStart) / distance));
    const point = roadPipe.getPointAtLength(progress * roadLength);
    drop.style.left = `${point.x}px`;
    drop.style.top = `${point.y}px`;
}
function scheduleDrop() {
    if (motionQuery.matches)
        return;
    if (!dropFrame)
        dropFrame = window.requestAnimationFrame(positionDrop);
}
window.addEventListener("scroll", scheduleDrop, { passive: true });
window.addEventListener("resize", scheduleRoad, { passive: true });
mobileQuery.addEventListener("change", scheduleRoad);
motionQuery.addEventListener("change", () => {
    positionDrop();
    document.querySelectorAll(".bounce-in").forEach((element) => {
        if (motionQuery.matches)
            element.classList.remove("has-entered");
    });
});
if (stage && "ResizeObserver" in window) {
    new ResizeObserver(scheduleRoad).observe(stage);
}
if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting)
                return;
            if (!motionQuery.matches)
                entry.target.classList.add("has-entered");
            observer.unobserve(entry.target);
        });
    }, { threshold: .1 });
    document.querySelectorAll(".bounce-in").forEach((element) => observer.observe(element));
}
document.fonts.ready.then(scheduleRoad).catch(scheduleRoad);
window.addEventListener("load", scheduleRoad, { once: true });
scheduleRoad();
