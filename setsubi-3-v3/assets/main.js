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
const openedCount = document.querySelector("#opened-count");
const waterMeter = document.querySelector("#water-meter");
const meterComplete = document.querySelector("#meter-complete");
let completionShown = false;
function updateMeter() {
    if (openedCount)
        openedCount.textContent = String(seenPoints.size);
    const complete = seenPoints.size === pointCards.length;
    waterMeter?.classList.toggle("is-complete", complete);
    if (complete && !completionShown && meterComplete) {
        completionShown = true;
        meterComplete.hidden = false;
        window.setTimeout(() => { meterComplete.hidden = true; }, 4500);
    }
}
pointCards.forEach((card) => {
    if (card.open)
        seenPoints.add(card);
    card.addEventListener("toggle", () => {
        if (card.open)
            seenPoints.add(card);
        updateMeter();
        scheduleRoad();
    });
});
updateMeter();
const stage = document.querySelector(".journey-stage");
const roadSvg = document.querySelector(".road-svg");
const roadBed = document.querySelector(".road-bed");
const roadPipe = document.querySelector("#road-pipe");
const truck = document.querySelector(".road-truck");
const lid = document.querySelector("#lid");
const manhole = document.querySelector("#manhole");
const gsapReady = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined" && typeof MotionPathPlugin !== "undefined";
if (gsapReady)
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
let truckTween = null;
let scrollIdleTimer = 0;
let scrollFrame = 0;
let lastScrollY = window.scrollY;
let scrolling = false;
let bends = [];
const rows = [...document.querySelectorAll(".point-row")];
let roadFrame = 0;
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
    bends = [];
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
        bends = [bendOne, bendTwo, bendThree];
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
    rebuildTruck(height);
    updateLid();
}
function scheduleRoad() {
    if (!roadFrame)
        roadFrame = window.requestAnimationFrame(rebuildRoad);
}
function makeRoadEase(rawPath, height) {
    const progressAtY = (target) => {
        let lo = 0, hi = 1;
        for (let i = 0; i < 32; i++) {
            const mid = (lo + hi) / 2;
            if (MotionPathPlugin.getPositionOnPath(rawPath, mid).y < target)
                lo = mid;
            else
                hi = mid;
        }
        return (lo + hi) / 2;
    };
    const knots = [{ scrollY: pathStart, progress: 0 }];
    bends.forEach((y, index) => {
        const before = bends[index - 1] ?? pathStart;
        const after = bends[index + 1] ?? height;
        const halfSpan = Math.min(110, window.innerHeight * .14, (y - before) / 4, (after - y) / 4);
        knots.push({ scrollY: y - halfSpan, progress: progressAtY(y - 42) });
        knots.push({ scrollY: y + halfSpan, progress: progressAtY(y + 42) });
    });
    knots.push({ scrollY: height, progress: 1 });
    return (progress) => {
        if (progress <= 0)
            return 0;
        if (progress >= 1)
            return 1;
        const y = pathStart + progress * (height - pathStart);
        for (let i = 1; i < knots.length; i++) {
            const a = knots[i - 1], b = knots[i];
            if (a && b && y <= b.scrollY) {
                const portion = (y - a.scrollY) / (b.scrollY - a.scrollY);
                return a.progress + portion * (b.progress - a.progress);
            }
        }
        return 1;
    };
}
function faceAlongRoad(rawPath, progress) {
    if (!truck)
        return;
    const delta = 3 / Math.max(roadLength, 1);
    const before = MotionPathPlugin.getPositionOnPath(rawPath, Math.max(0, progress - delta));
    const after = MotionPathPlugin.getPositionOnPath(rawPath, Math.min(1, progress + delta));
    const dx = after.x - before.x, dy = after.y - before.y;
    truck.dataset.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : "down";
}
function stopScrollMotion() {
    scrolling = false;
    truck?.classList.remove("is-driving");
    waterMeter?.classList.remove("is-flowing");
}
function rebuildTruck(height) {
    truckTween?.scrollTrigger?.kill();
    truckTween?.kill();
    truckTween = null;
    if (!truck || !roadBed || !stage)
        return;
    if (!gsapReady || motionQuery.matches) {
        const start = roadBed.getPointAtLength(0);
        truck.style.transform = `translate(${start.x}px, ${start.y}px) translate(-50%, -50%)`;
        truck.dataset.facing = "down";
        truck.classList.remove("is-driving");
        return;
    }
    const rawPath = MotionPathPlugin.getRawPath(roadBed);
    MotionPathPlugin.cacheRawPathMeasurements(rawPath, 20);
    const ease = makeRoadEase(rawPath, height);
    gsap.set(truck, { clearProps: "transform" });
    truckTween = gsap.to(truck, {
        duration: 1,
        ease,
        motionPath: { path: roadBed, align: roadBed, alignOrigin: [.5, .5], autoRotate: false, resolution: 20 },
        scrollTrigger: {
            trigger: stage,
            start: () => stage.getBoundingClientRect().top + window.scrollY + pathStart - window.innerHeight * .52,
            end: () => stage.getBoundingClientRect().top + window.scrollY + height - window.innerHeight * .52,
            scrub: true,
            onUpdate: (self) => {
                faceAlongRoad(rawPath, ease(self.progress));
                truck.classList.toggle("is-driving", scrolling && self.isActive && !motionQuery.matches);
            },
        },
    });
    const controller = truckTween.scrollTrigger;
    controller?.refresh();
    controller?.update();
    truckTween.totalProgress(controller?.progress ?? 0, false);
    faceAlongRoad(rawPath, ease(controller?.progress ?? 0));
}
function updateLid() {
    scrollFrame = 0;
    if (!lid || !manhole)
        return;
    const p = motionQuery.matches ? 0 : Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * .45)));
    lid.style.transform = `translate(${(p * 46).toFixed(2)}%, ${(p * 8).toFixed(2)}%) rotate(${(p * 30).toFixed(2)}deg)`;
    manhole.classList.toggle("is-open", p > .15);
}
window.addEventListener("scroll", () => {
    if (!scrollFrame)
        scrollFrame = window.requestAnimationFrame(updateLid);
    if (window.scrollY === lastScrollY)
        return;
    lastScrollY = window.scrollY;
    if (motionQuery.matches)
        return;
    scrolling = true;
    waterMeter?.classList.add("is-flowing");
    truck?.classList.toggle("is-driving", Boolean(truckTween?.scrollTrigger?.isActive));
    window.clearTimeout(scrollIdleTimer);
    scrollIdleTimer = window.setTimeout(stopScrollMotion, 140);
}, { passive: true });
window.addEventListener("blur", stopScrollMotion);
document.addEventListener("visibilitychange", () => { if (document.hidden)
    stopScrollMotion(); });
window.addEventListener("resize", scheduleRoad, { passive: true });
mobileQuery.addEventListener("change", scheduleRoad);
motionQuery.addEventListener("change", () => {
    stopScrollMotion();
    scheduleRoad();
    updateLid();
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
