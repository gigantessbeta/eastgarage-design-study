"use strict";
const serviceInformation = {
    bring: {
        label: "持ち込みタイヤ交換",
        tip: "車種・タイヤサイズ・交換本数をお伝えください。直送をご希望の場合は、受け取りが可能か事前にご相談ください。",
        question: "持ち込み交換の対応可否・作業料金・予約できる日時を相談したいです。",
    },
    buy: {
        label: "タイヤ・ホイール選び",
        tip: "車種のほか、通勤などの使い方やご予算をお伝えください。サイズが分からなくても、確認方法からご相談いただけます。",
        question: "車の使い方に合うタイヤ・ホイールと、購入・取り付けについて相談したいです。",
    },
    custom: {
        label: "カスタムの相談",
        tip: "車種と、どんな雰囲気にしたいかをお伝えください。気になる車やパーツの写真があると、イメージを共有しやすくなります。",
        question: "希望するカスタムの対応可否・進め方・費用の目安を相談したいです。",
    },
};
function isService(value) {
    return value === "bring" || value === "buy" || value === "custom";
}
function initializeNavigation() {
    const button = document.querySelector("#menu-toggle");
    const navigation = document.querySelector("#site-nav");
    if (!button || !navigation)
        return;
    const setOpen = (open) => {
        button.setAttribute("aria-expanded", String(open));
        navigation.classList.toggle("is-open", open);
        document.body.classList.toggle("menu-open", open);
    };
    button.setAttribute("aria-controls", navigation.id);
    setOpen(false);
    button.addEventListener("click", () => {
        setOpen(button.getAttribute("aria-expanded") !== "true");
    });
    navigation.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest("a[href]")) {
            setOpen(false);
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
            setOpen(false);
            button.focus();
        }
    });
    document.addEventListener("click", (event) => {
        if (event.target instanceof Node &&
            !navigation.contains(event.target) &&
            !button.contains(event.target)) {
            setOpen(false);
        }
    });
}
function initializeConsultation() {
    const form = document.querySelector("#consultation-form");
    const carModel = document.querySelector("#car-model");
    const tireSize = document.querySelector("#tire-size");
    const memo = document.querySelector("#consultation-memo");
    const tip = document.querySelector("#consultation-tip");
    const copyButton = document.querySelector("#copy-memo");
    const status = document.querySelector("#copy-status");
    if (!form || !carModel || !tireSize || !memo || !tip || !copyButton || !status)
        return;
    const radios = Array.from(form.querySelectorAll('input[type="radio"][name="service"]'));
    memo.readOnly = true;
    copyButton.type = "button";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const selectedService = () => {
        const value = radios.find((radio) => radio.checked)?.value;
        return isService(value) ? value : "bring";
    };
    const updateMemo = () => {
        const information = serviceInformation[selectedService()];
        tip.textContent = information.tip;
        memo.value = [
            "EastGarage ご相談メモ",
            `ご相談内容：${information.label}`,
            `車種：${carModel.value.trim() || "電話でお伝えします"}`,
            `タイヤサイズ：${tireSize.value.trim() || "未確認（確認方法から相談）"}`,
            "",
            information.question,
        ].join("\n");
        status.textContent = "";
    };
    // The memo stays in this document. There is no form submission, storage, or API call.
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        updateMemo();
    });
    form.addEventListener("input", updateMemo);
    form.addEventListener("change", updateMemo);
    document.querySelectorAll("a[data-service]").forEach((link) => {
        link.addEventListener("click", () => {
            const service = link.dataset.service;
            if (!isService(service))
                return;
            const selectedRadio = radios.find((radio) => radio.value === service);
            if (!selectedRadio)
                return;
            selectedRadio.checked = true;
            updateMemo();
            // Keep the anchor's native navigation to the consultation section.
        });
    });
    copyButton.addEventListener("click", () => {
        const copyMemo = async () => {
            copyButton.disabled = true;
            status.textContent = "";
            try {
                if (!window.isSecureContext || !navigator.clipboard?.writeText) {
                    throw new Error("Clipboard is unavailable");
                }
                await navigator.clipboard.writeText(memo.value);
                status.textContent = "メモをコピーしました。電話の前にご確認ください。";
            }
            catch {
                memo.focus();
                memo.select();
                memo.setSelectionRange(0, memo.value.length);
                status.textContent = "メモを選択しました。端末のコピー操作でコピーしてください。";
            }
            finally {
                copyButton.disabled = false;
            }
        };
        void copyMemo();
    });
    updateMemo();
}
function initializeReveals() {
    const elements = Array.from(document.querySelectorAll(".reveal"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || !("IntersectionObserver" in window) || elements.length === 0) {
        return;
    }
    const showAll = () => {
        elements.forEach((element) => element.classList.add("is-visible"));
        document.body.classList.remove("motion-ready");
    };
    try {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });
        // Never hide the initial viewport, including a direct link to a lower section.
        elements.forEach((element) => {
            const bounds = element.getBoundingClientRect();
            if (bounds.top < window.innerHeight && bounds.bottom > 0) {
                element.classList.add("is-visible");
            }
        });
        document.body.classList.add("motion-ready");
        elements.forEach((element) => {
            if (!element.classList.contains("is-visible"))
                observer.observe(element);
        });
        reducedMotion.addEventListener("change", (event) => {
            if (event.matches) {
                observer.disconnect();
                showAll();
            }
        });
    }
    catch {
        showAll();
    }
}
function initializePage() {
    initializeNavigation();
    initializeConsultation();
    initializeReveals();
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePage, { once: true });
}
else {
    initializePage();
}
