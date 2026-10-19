"use strict";
/// <reference path="types/index.d.ts" />
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
const pointCards = [...document.querySelectorAll("[data-point]")];
pointCards.forEach((card) => { card.addEventListener("toggle", scheduleRoad); });
const stage = document.querySelector(".journey-stage");
const roadSvg = document.querySelector(".road-svg");
const roadBed = document.querySelector(".road-bed");
const roadPipe = document.querySelector("#road-pipe");
const excavator = document.querySelector(".road-excavator");
const lid = document.querySelector("#lid");
const manhole = document.querySelector("#manhole");
const gsapReady = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined" && typeof MotionPathPlugin !== "undefined";
if (gsapReady)
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
let excavatorTween = null;
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
    prepareRoadLayers(width, height);
    rebuildExcavator(height);
    updateLid();
}
function scheduleRoad() {
    if (!roadFrame)
        roadFrame = window.requestAnimationFrame(rebuildRoad);
}
// Preserve v1's entire road. Only its timing changes: a horizontal crossing gets
// a small scroll interval around its height, keeping the excavator close to mid-screen.
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
    if (!excavator)
        return;
    const delta = 3 / Math.max(roadLength, 1);
    const before = MotionPathPlugin.getPositionOnPath(rawPath, Math.max(0, progress - delta));
    const after = MotionPathPlugin.getPositionOnPath(rawPath, Math.min(1, progress + delta));
    const dx = after.x - before.x, dy = after.y - before.y;
    excavator.dataset.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : "down";
}
function stopScrollMotion() {
    scrolling = false;
    excavator?.classList.remove("is-digging");
}
const roadPaths = [...document.querySelectorAll("[data-road-path]")];
const pavementPaths = [...document.querySelectorAll('[data-segment="pavement"]')];
const trenchPaths = [...document.querySelectorAll('[data-segment="trench"]')];
const pipePaths = [...document.querySelectorAll('[data-segment="pipe"]')];
const cutFuture = document.querySelector("#cut-future");
const cutActive = document.querySelector("#cut-active");
const pipeWindow = document.querySelector("#pipe-window");
const valvePoints = [...document.querySelectorAll(".valve-point")];
const boardRows = [...document.querySelectorAll("[data-workzone]")];
const commissionRow = document.querySelector("[data-commission]");
const workStatus = document.querySelector(".work-status");
let zoneDistances = [];
let commissioned = false;
let commissionTimer = 0;
let rebuilding = false;
// These distances describe the drawing, never the depth/diameter of a real pipe.
function constructionDimensions() {
    return mobileQuery.matches
        ? { trench: 160, gap: 28, ahead: 180, cover: 26 }
        : { trench: 220, gap: 40, ahead: 260, cover: 36 };
}
function setSegment(path, from, to) {
    if (!path)
        return;
    const a = Math.max(0, Math.min(roadLength, from));
    const b = Math.max(a, Math.min(roadLength, to));
    path.style.visibility = b > a + .01 ? "visible" : "hidden";
    path.style.strokeDasharray = `0 ${a.toFixed(3)} ${(b - a).toFixed(3)} ${(roadLength + 1).toFixed(3)}`;
}
function prepareRoadLayers(width, height) {
    if (!roadBed || !stage || !roadSvg)
        return;
    const path = roadBed.getAttribute("d") ?? "";
    roadPaths.forEach((node) => { node.setAttribute("d", path); });
    roadSvg.querySelectorAll("mask").forEach((mask) => {
        mask.setAttribute("width", String(width + 160));
        mask.setAttribute("height", String(height + 160));
    });
    const stageRect = stage.getBoundingClientRect();
    const boxes = pointCards.map((card) => {
        const rect = card.getBoundingClientRect();
        return { left: rect.left - stageRect.left, right: rect.right - stageRect.left,
            top: rect.top - stageRect.top, bottom: rect.bottom - stageRect.top };
    });
    const size = constructionDimensions().cover;
    const clearance = size / 2 + 4;
    let preceding = 0;
    zoneDistances = boxes.map((box, index) => {
        // Choose the nearest exposed point beside this card. Reserve just enough
        // space for a complete lid; on SP the road underneath a card stays underneath.
        const centerY = (box.top + box.bottom) / 2;
        const score = (length) => {
            const p = roadBed.getPointAtLength(length);
            if (p.y < box.top || length <= preceding)
                return Infinity;
            if (boxes.some((other) => p.x > other.left - clearance && p.x < other.right + clearance
                && p.y > other.top - clearance && p.y < other.bottom + clearance))
                return Infinity;
            const dx = Math.max(box.left - p.x, 0, p.x - box.right);
            const dy = Math.max(box.top - p.y, 0, p.y - box.bottom);
            return dx * dx + dy * dy + Math.abs(p.y - centerY) * .0001;
        };
        let best = Math.min(roadLength - constructionDimensions().gap - 1, preceding + 1);
        let bestScore = Infinity;
        for (let length = preceding + 1; length <= roadLength - constructionDimensions().gap - 1; length += 4) {
            const candidate = score(length);
            if (candidate < bestScore) {
                bestScore = candidate;
                best = length;
            }
        }
        const coarse = best;
        for (let length = Math.max(preceding + 1, coarse - 4); length <= Math.min(roadLength - constructionDimensions().gap - 1, coarse + 4); length += .25) {
            const candidate = score(length);
            if (candidate < bestScore) {
                bestScore = candidate;
                best = length;
            }
        }
        preceding = best;
        const location = roadBed.getPointAtLength(best);
        const cover = valvePoints[index];
        cover?.setAttribute("transform", `translate(${location.x},${location.y})`);
        cover?.setAttribute("data-distance", best.toFixed(2));
        const art = cover?.querySelector(".valve-art");
        art?.setAttribute("x", String(-size / 2));
        art?.setAttribute("y", String(-size / 2));
        art?.setAttribute("width", String(size));
        art?.setAttribute("height", String(size));
        return best;
    });
}
function setCompleted(element, complete, animate) {
    if (!element)
        return;
    const wasComplete = element.classList.contains("is-complete");
    element.classList.toggle("is-complete", complete);
    if (!complete)
        element.classList.remove("is-new");
    else if (!wasComplete && animate && !motionQuery.matches)
        element.classList.add("is-new");
    element.querySelector(".work-stamp")?.setAttribute("aria-hidden", String(!complete));
}
function renderConstruction(progress, animate = true) {
    if (!roadSvg || !roadLength)
        return;
    const dimensions = constructionDimensions();
    const front = Math.min(roadLength, Math.max(0, progress * roadLength));
    const pipeTip = Math.max(0, front - dimensions.gap);
    const flags = zoneDistances.map((distance) => motionQuery.matches || pipeTip >= distance);
    flags.forEach((complete, index) => {
        setCompleted(valvePoints[index], complete, animate);
        setCompleted(boardRows[index], complete, animate);
    });
    const finished = motionQuery.matches || (progress >= 1 && flags.length === 4 && flags.every(Boolean));
    // At the end, close the final excavation before commissioning the entire line.
    const restoredTo = finished ? roadLength : Math.max(0, front - dimensions.trench);
    pavementPaths.forEach((path) => setSegment(path, 0, restoredTo));
    trenchPaths.forEach((path) => setSegment(path, restoredTo, finished ? restoredTo : front));
    pipePaths.forEach((path) => setSegment(path, restoredTo, finished ? restoredTo : pipeTip));
    setSegment(pipeWindow, restoredTo, finished ? restoredTo : pipeTip);
    setSegment(cutFuture, finished ? roadLength : front, roadLength);
    setSegment(cutActive, finished ? roadLength : front, front + dimensions.ahead);
    setCompleted(commissionRow, finished, animate);
    roadSvg.classList.toggle("is-commissioned", finished);
    if (finished !== commissioned) {
        window.clearTimeout(commissionTimer);
        roadSvg.classList.remove("is-flowing");
        if (finished && animate && !motionQuery.matches) {
            roadSvg.classList.add("is-flowing");
            commissionTimer = window.setTimeout(() => roadSvg?.classList.remove("is-flowing"), 2500);
        }
        commissioned = finished;
    }
    if (motionQuery.matches) {
        window.clearTimeout(commissionTimer);
        roadSvg.classList.remove("is-flowing");
    }
    const status = finished ? "工区1から4、通水 完了" : flags.map((done, i) => `工区${i + 1} ${done ? "完了" : "未完了"}`).join("、");
    if (workStatus && workStatus.textContent !== status)
        workStatus.textContent = status;
    roadSvg.dataset.front = front.toFixed(2);
    roadSvg.classList.add("is-ready");
    excavator?.classList.toggle("is-digging", scrolling && !finished && !motionQuery.matches && progress > 0 && progress < 1);
}
function rebuildExcavator(height) {
    excavatorTween?.scrollTrigger?.kill();
    excavatorTween?.kill();
    excavatorTween = null;
    if (!excavator || !roadBed || !stage)
        return;
    rebuilding = true;
    if (!gsapReady || motionQuery.matches) {
        const end = roadBed.getPointAtLength(roadLength);
        excavator.style.transform = `translate(${end.x}px, ${end.y}px) translate(-50%, -50%)`;
        excavator.dataset.facing = "down";
        excavator.classList.remove("is-digging");
        // A missing animation runtime still leaves a completed, readable road.
        renderConstruction(1, false);
        rebuilding = false;
        return;
    }
    const rawPath = MotionPathPlugin.getRawPath(roadBed);
    MotionPathPlugin.cacheRawPathMeasurements(rawPath, 20);
    const ease = makeRoadEase(rawPath, height);
    const sync = (scrollProgress) => {
        const progress = ease(scrollProgress);
        faceAlongRoad(rawPath, progress);
        renderConstruction(progress, !rebuilding);
    };
    gsap.set(excavator, { clearProps: "transform" });
    excavatorTween = gsap.to(excavator, {
        duration: 1,
        ease,
        motionPath: { path: roadBed, align: roadBed, alignOrigin: [.5, .5], autoRotate: false, resolution: 20 },
        scrollTrigger: {
            trigger: stage,
            start: () => stage.getBoundingClientRect().top + window.scrollY + pathStart - window.innerHeight * .52,
            end: () => stage.getBoundingClientRect().top + window.scrollY + height - window.innerHeight * .52,
            scrub: true,
            onUpdate: (self) => sync(self.progress),
        },
    });
    const controller = excavatorTween.scrollTrigger;
    controller?.refresh();
    controller?.update();
    excavatorTween.totalProgress(controller?.progress ?? 0, false);
    sync(controller?.progress ?? 0);
    rebuilding = false;
}
[...valvePoints, ...boardRows, commissionRow].forEach((element) => {
    element?.addEventListener("animationend", (event) => {
        if (event instanceof AnimationEvent && (event.animationName === "cover-place" || event.animationName === "stamp-press")) {
            element.classList.remove("is-new");
        }
    });
});
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
    excavator?.classList.toggle("is-digging", Boolean(excavatorTween?.scrollTrigger?.isActive) && !commissioned);
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
