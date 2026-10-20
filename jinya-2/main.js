"use strict";
// Local, dependency-free interaction. Compiled with TypeScript strict mode.
(() => {
    const dateElement = document.querySelector("#edition-date");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tokyoDate = new Intl.DateTimeFormat("ja-JP-u-ca-japanese", {
        timeZone: "Asia/Tokyo", era: "long", year: "numeric", month: "numeric",
        day: "numeric", weekday: "long",
    });
    let dateTimer;
    function kanjiNumber(value) {
        const digits = "〇一二三四五六七八九";
        if (value === 0)
            return digits[0] ?? "〇";
        let remaining = value;
        let result = "";
        for (const [place, character] of [[1000, "千"], [100, "百"], [10, "十"]]) {
            const count = Math.floor(remaining / place);
            if (count > 0)
                result += (count > 1 ? digits[count] ?? "" : "") + character;
            remaining %= place;
        }
        return result + (remaining > 0 ? digits[remaining] ?? "" : "");
    }
    function updateDate() {
        if (!dateElement)
            return;
        const now = new Date();
        const parts = tokyoDate.formatToParts(now);
        const part = (name) => parts.find((value) => value.type === name)?.value ?? "";
        const year = part("year") === "元" ? "元" : kanjiNumber(Number(part("year")));
        dateElement.textContent =
            `${part("era")}${year}年${kanjiNumber(Number(part("month")))}月${kanjiNumber(Number(part("day")))}日 ${part("weekday")}`;
        const local = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        dateElement.dateTime = local.toISOString().slice(0, 10);
        if (dateTimer !== undefined)
            window.clearTimeout(dateTimer);
        dateTimer = undefined;
        // Reduced motion retains the date shown on opening; no timed replacement.
        if (reducedMotion.matches)
            return;
        const nextMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - 9 * 60 * 60 * 1000;
        dateTimer = window.setTimeout(updateDate, nextMidnight - now.getTime() + 100);
    }
    updateDate();
    reducedMotion.addEventListener("change", updateDate);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && !reducedMotion.matches)
            updateDate();
    });
    const dialog = document.querySelector("#photo-dialog");
    const photo = document.querySelector("#source-photo");
    const caption = document.querySelector("#photo-caption");
    if (!dialog || !photo || !caption || typeof dialog.showModal !== "function")
        return;
    let opener;
    const mobile = window.matchMedia("(max-width: 699px)");
    document.querySelectorAll("a[data-photo]").forEach((link) => {
        link.addEventListener("click", (event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0)
                return;
            event.preventDefault();
            opener = link;
            photo.src = mobile.matches && link.dataset.mobile ? link.dataset.mobile : link.href;
            photo.alt = link.dataset.caption ?? "";
            caption.textContent = link.dataset.caption ?? "";
            dialog.showModal();
        });
    });
    dialog.addEventListener("close", () => { opener?.focus({ preventScroll: true }); });
    dialog.addEventListener("click", (event) => {
        if (event.target !== dialog)
            return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom)
            dialog.close();
    });
})();
