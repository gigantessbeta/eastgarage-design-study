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
const stage = document.querySelector(".journey-stage");
const scene = document.querySelector(".site-scene");
const pointCards = [...document.querySelectorAll("[data-point]")];
const lid = document.querySelector("#lid");
const manhole = document.querySelector("#manhole");
const gsapReady = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
if (gsapReady)
    gsap.registerPlugin(ScrollTrigger);
const nodes = new Map();
scene?.querySelectorAll("[id]").forEach((node) => { nodes.set(node.id, node); });
const stamps = [...document.querySelectorAll(".scene-board-rows li")];
let anchors = [0, 1, 2, 3, 4];
let controller = null;
let timeline = null;
let refreshFrame = 0;
let scrollFrame = 0;
let previousDay = 0;
let previousPhase = -1;
let flash = null;
let measuring = false;
const playhead = { scroll: 0 };
const clamp = (value) => Math.max(0, Math.min(1, value));
const range = (value, from, to) => clamp((value - from) / (to - from));
function attribute(id, key, value) {
    nodes.get(id)?.setAttribute(key, String(value));
}
function opacity(id, value) { attribute(id, "opacity", clamp(value)); }
function visible(id, show) { attribute(id, "visibility", show ? "visible" : "hidden"); }
function colorBetween(a, b, t) {
    return `rgb(${a.map((value, i) => Math.round(value + ((b[i] ?? value) - value) * t)).join(",")})`;
}
function dayAt(scrollY) {
    for (let i = 0; i < 4; i++) {
        const from = anchors[i] ?? 0;
        const to = anchors[i + 1] ?? from + 1;
        if (scrollY < to)
            return i + range(scrollY, from, to);
    }
    return 4;
}
function setStamp(index, complete, animate) {
    const row = stamps[index];
    if (!row)
        return;
    const wasComplete = row.classList.contains("is-complete");
    if (!complete)
        row.classList.remove("is-new");
    row.classList.toggle("is-complete", complete);
    if (animate && complete && !wasComplete)
        row.classList.add("is-new");
}
function renderDay(input, animate = true) {
    const reduced = motionQuery.matches;
    const day = reduced ? (input < .6 ? 0 : Math.min(4, Math.floor(input + .5))) : input;
    const digging = range(day, .22, 1);
    const laying = range(day, 1.08, 1.6);
    const sand = range(day, 2.12, 2.34);
    const soil = range(day, 2.34, 2.64);
    const gravel = range(day, 2.64, 2.78);
    const restored = range(day, 2.85, 2.98);
    const night = range(day, 3.12, 4);
    const endCrew = day >= 3 && day <= 3.22;
    const morning = day < .12;
    const phase = morning ? 0 : day < 1.05 ? 1 : day < 2.05 ? 2 : day <= 3.22 ? 3 : 4;
    attribute("dig-window-rect", "height", 165 * digging);
    attribute("excavation-space-rect", "height", 165 * digging);
    opacity("planned-work", day < 1 ? .38 * (1 - digging) : 0);
    opacity("road-cuts", day >= .18 && day < 2.98 ? 1 : 0);
    opacity("scene-cones", day >= .12 && day < 3 ? 1 : 0);
    opacity("scene-soil", digging * (1 - range(day, 2.2, 2.64)));
    opacity("scene-excavator", day >= .2 && day < 1.64 ? 1 : 0);
    const lifting = !reduced && Math.floor(range(day, .22, 1) * 14) % 2 === 1;
    visible("machine-dig", day < 1.05 && !lifting);
    visible("machine-lift", day < 1.05 && lifting);
    visible("machine-sling", day >= 1.05);
    // Only the suspended load moves; the machine's tracks remain on the road.
    attribute("hanging-pipe", "transform", `translate(0 ${laying * 170})`);
    attribute("sling-lines", "d", `M376 199L360 ${235 + laying * 170}M390 200L398 ${235 + laying * 170}`);
    opacity("installed-pipe", day >= 1.6 ? 1 : 0);
    opacity("pipe-workers", day >= 1.64 && day < 2.08 ? 1 : 0);
    opacity("sand-fill", sand > 0 ? 1 : 0);
    attribute("sand-layer", "y", 455 - sand * 66);
    attribute("sand-layer", "height", sand * 66);
    opacity("soil-fill", soil > 0 ? 1 : 0);
    attribute("soil-layer", "y", 389 - soil * 54);
    attribute("soil-layer", "height", soil * 54);
    opacity("gravel-fill", gravel);
    opacity("scene-valve", day >= 2.08 ? 1 : 0);
    opacity("restored-road", restored);
    opacity("surface-lid", day >= 2.9 ? 1 : 0);
    opacity("scene-rammer", day >= 2.34 && day < 2.84 ? 1 : 0);
    const compactTop = day < 2.64 ? 389 - soil * 54 : 335 - gravel * 45;
    const tamp = reduced ? 0 : Math.sin(range(day, 2.34, 2.84) * Math.PI * 24) * 2;
    attribute("scene-rammer", "transform", `translate(0 ${compactTop - 290 + tamp})`);
    opacity("scene-crew", morning || endCrew ? 1 : 0);
    opacity("scene-truck", 1);
    attribute("scene-truck", "transform", `translate(${-210 * range(day, 3.25, 3.92)} 0)`);
    opacity("window-lights", night);
    const sky = day < 1.9 ? colorBetween([217, 239, 248], [159, 219, 245], range(day, 0, 1.9))
        : day < 3 ? colorBetween([159, 219, 245], [248, 185, 125], range(day, 1.9, 3))
            : colorBetween([248, 185, 125], [72, 91, 117], range(day, 3, 4));
    attribute("scene-sky", "fill", sky);
    const speech = document.querySelector("#scene-speech");
    const words = morning ? "一緒に頑張っていきましょう！"
        : day >= 1.64 && day < 2.08 ? "熟練スタッフが丁寧に指導"
            : day >= 2.08 && day <= 3.22 ? "チームワークを大切にしています" : "";
    if (speech) {
        speech.textContent = words;
        speech.hidden = !words;
    }
    const minutes = day <= 1 ? 480 + range(day, .12, 1) * 120
        : day <= 2 ? 600 + (day - 1) * 120
            : day < 3 ? 780 + (day - 2) * 240 : 1020;
    const roundedMinutes = Math.min(1020, Math.round(minutes / 5) * 5);
    const time = `${Math.floor(roundedMinutes / 60)}:${String(roundedMinutes % 60).padStart(2, "0")}`;
    const timeNode = nodes.get("scene-time");
    if (timeNode)
        timeNode.textContent = time;
    const estimate = nodes.get("time-estimate");
    if (estimate instanceof HTMLElement)
        estimate.hidden = roundedMinutes === 480 || roundedMinutes === 1020;
    [.12, 1, 1.94, 2.78, 3].forEach((threshold, i) => setStamp(i, day >= threshold, animate && !reduced));
    if (day < 1.94 || reduced) {
        flash?.kill();
        flash = null;
        opacity("connection-flash", 0);
    }
    else if (previousDay < 1.94 && animate && gsapReady) {
        flash?.kill();
        const ring = nodes.get("connection-flash");
        if (ring)
            flash = gsap.fromTo(ring, { attr: { r: 8, opacity: 1 } }, { attr: { r: 25, opacity: 0 }, duration: .55, ease: "power1.out" });
    }
    if (phase !== previousPhase) {
        const descriptions = ["朝の現場。四人が朝礼をし、これから道路の下に水道管を埋めます。", "道路を切り、ミニショベルで溝を掘ります。", "青い管を下ろし、先輩と新人が継ぎ目を合わせます。", "砂と土を埋め戻して締め固め、道路をもどします。17時に四人で挨拶します。", "日が暮れ、窓と街灯に明かりが点きます。道路の下には新しい青い管が残っています。"];
        const description = descriptions[phase] ?? "";
        const title = nodes.get("scene-description");
        const status = nodes.get("scene-status");
        if (title)
            title.textContent = description;
        if (status)
            status.textContent = description;
    }
    scene?.setAttribute("data-phase", String(phase));
    scene?.setAttribute("data-day", day.toFixed(3));
    previousDay = day;
    previousPhase = phase;
}
function readLine() {
    if (!mobileQuery.matches || !scene)
        return window.innerHeight * .5;
    const top = Number.parseFloat(getComputedStyle(scene).top) || 104;
    const belowScene = top + scene.getBoundingClientRect().height;
    // Read the card in the remaining viewport, never behind the fixed scene.
    return belowScene + Math.max(100, (window.innerHeight - belowScene) * .5);
}
function measure() {
    if (!stage || !scene)
        return;
    const line = readLine();
    const centers = pointCards.map((card) => {
        // A tall expanded card keeps its summary at the reading line. Its content
        // still increases following anchors through real layout measurements.
        const summary = card.querySelector("summary");
        const r = (summary ?? card).getBoundingClientRect();
        return r.top + window.scrollY + r.height * .5 - line;
    });
    const first = centers[0] ?? 1;
    anchors = [Math.min(first - 220, stage.getBoundingClientRect().top + window.scrollY - 100), ...centers];
}
function sync(animate = true) { renderDay(dayAt(window.scrollY), animate && !measuring); }
function rebuild() {
    refreshFrame = 0;
    measuring = true;
    timeline?.kill();
    timeline = null;
    controller?.kill();
    controller = null;
    measure();
    if (gsapReady && stage) {
        playhead.scroll = 0;
        timeline = gsap.to(playhead, {
            scroll: 1, ease: "none",
            scrollTrigger: {
                trigger: stage,
                start: () => anchors[0] ?? 0,
                end: () => anchors[4] ?? 1,
                scrub: true,
                invalidateOnRefresh: true,
                onRefreshInit: measure,
                onRefresh: () => sync(false),
                onUpdate: () => sync(),
            },
        });
        controller = timeline.scrollTrigger ?? null;
        ScrollTrigger.refresh();
    }
    sync(false);
    measuring = false;
}
function scheduleScene() {
    if (!refreshFrame)
        refreshFrame = window.requestAnimationFrame(rebuild);
}
stamps.forEach((row) => row.addEventListener("animationend", () => row.classList.remove("is-new")));
pointCards.forEach((card) => card.addEventListener("toggle", scheduleScene));
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
    // Also updates before/after the trigger and when the runtime is unavailable.
    if (!gsapReady || motionQuery.matches)
        sync();
}, { passive: true });
window.addEventListener("resize", scheduleScene, { passive: true });
mobileQuery.addEventListener("change", scheduleScene);
motionQuery.addEventListener("change", () => { scheduleScene(); updateLid(); });
if (stage && "ResizeObserver" in window)
    new ResizeObserver(scheduleScene).observe(stage);
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
document.fonts.ready.then(scheduleScene).catch(scheduleScene);
window.addEventListener("load", scheduleScene, { once: true });
scheduleScene();

// Claude 2026-10-20: mark the scene while it is stuck, so the phone layout can cover the strip above it.
const stuckScene = document.querySelector("#site-scene");
function markStuck() {
    if (!stuckScene)
        return;
    const stickTop = Number.parseFloat(getComputedStyle(stuckScene).top) || 0;
    stuckScene.classList.toggle("is-stuck", stuckScene.getBoundingClientRect().top <= stickTop + 1);
}
window.addEventListener("scroll", markStuck, { passive: true });
window.addEventListener("resize", markStuck, { passive: true });
markStuck();
