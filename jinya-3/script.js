"use strict";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const menuButton = document.querySelector(".menu-toggle");
const menuDialog = document.querySelector(".menu-dialog");
const closeButton = document.querySelector(".menu-close");
if (menuButton && menuDialog && closeButton) {
    menuButton.addEventListener("click", () => {
        menuDialog.showModal();
        menuButton.setAttribute("aria-expanded", "true");
        closeButton.focus();
    });
    closeButton.addEventListener("click", () => menuDialog.close());
    menuDialog.addEventListener("click", (event) => {
        if (event.target === menuDialog)
            menuDialog.close();
    });
    menuDialog.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => menuDialog.close());
    });
    menuDialog.addEventListener("close", () => {
        menuButton.setAttribute("aria-expanded", "false");
    });
}
const revealElements = Array.from(document.querySelectorAll(".reveal"));
let revealObserver = null;
if (!reducedMotion.matches && "IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.remove("is-pending");
                revealObserver?.unobserve(entry.target);
            }
        });
    }, { threshold: 0, rootMargin: "0px 0px -25% 0px" });
    revealElements.forEach((element) => {
        element.classList.add("is-pending");
        revealObserver?.observe(element);
    });
}
const questions = Array.from(document.querySelectorAll(".questions details"));
const questionFrames = new Map();
const questionTargets = new Map();
function setQuestion(question, expanded) {
    const summary = question.querySelector("summary");
    if (!summary)
        return;
    cancelAnimationFrame(questionFrames.get(question) ?? 0);
    questionTargets.set(question, expanded);
    const start = question.getBoundingClientRect().height;
    question.style.height = "";
    if (expanded)
        question.open = true;
    const target = expanded ? question.getBoundingClientRect().height : summary.getBoundingClientRect().height + 1;
    if (reducedMotion.matches) {
        question.open = expanded;
        question.style.overflow = "";
        questionFrames.delete(question);
        return;
    }
    question.style.height = `${start}px`;
    question.style.overflow = "hidden";
    const began = performance.now();
    const tick = (now) => {
        const progress = Math.min((now - began) / 240, 1);
        const eased = 1 - (1 - progress) ** 3;
        question.style.height = `${start + (target - start) * eased}px`;
        if (progress < 1) {
            questionFrames.set(question, requestAnimationFrame(tick));
        }
        else {
            question.open = expanded;
            question.style.height = "";
            question.style.overflow = "";
            questionFrames.delete(question);
        }
    };
    questionFrames.set(question, requestAnimationFrame(tick));
}
questions.forEach((question) => {
    question.querySelector("summary")?.addEventListener("click", (event) => {
        event.preventDefault();
        const expanded = !(questionTargets.get(question) ?? question.open);
        if (expanded) {
            questions.forEach((other) => {
                if (other !== question && (questionTargets.get(other) ?? other.open))
                    setQuestion(other, false);
            });
        }
        setQuestion(question, expanded);
    });
});
const carousel = document.querySelector(".board-carousel");
const cards = Array.from(document.querySelectorAll(".board-card"));
const count = document.querySelector(".carousel-count");
const previous = document.querySelector(".carousel-prev");
const next = document.querySelector(".carousel-next");
let frame = 0;
function nearestCard() {
    if (!carousel)
        return 0;
    const center = carousel.getBoundingClientRect().left + carousel.clientWidth / 2;
    let best = 0;
    let distance = Infinity;
    cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const delta = Math.abs(rect.left + rect.width / 2 - center);
        if (delta < distance) {
            best = index;
            distance = delta;
        }
    });
    return best;
}
function updateCount() {
    if (count)
        count.textContent = `${nearestCard() + 1} / ${cards.length}`;
}
function goToCard(index) {
    if (!carousel || cards.length === 0)
        return;
    cancelAnimationFrame(frame);
    const card = cards[(index + cards.length) % cards.length];
    const rect = card.getBoundingClientRect();
    const container = carousel.getBoundingClientRect();
    const start = carousel.scrollLeft;
    const target = start + rect.left - container.left + rect.width / 2 - carousel.clientWidth / 2;
    if (reducedMotion.matches) {
        carousel.scrollLeft = target;
        updateCount();
        return;
    }
    const began = performance.now();
    carousel.style.scrollSnapType = "none";
    const tick = (now) => {
        const progress = Math.min((now - began) / 320, 1);
        const eased = 1 - (1 - progress) ** 3;
        carousel.scrollLeft = start + (target - start) * eased;
        if (progress < 1) {
            frame = requestAnimationFrame(tick);
        }
        else {
            carousel.style.scrollSnapType = "";
            updateCount();
        }
    };
    frame = requestAnimationFrame(tick);
}
if (carousel && cards.length) {
    previous?.addEventListener("click", () => goToCard(nearestCard() - 1));
    next?.addEventListener("click", () => goToCard(nearestCard() + 1));
    carousel.addEventListener("scroll", updateCount, { passive: true });
    carousel.addEventListener("pointerdown", () => {
        cancelAnimationFrame(frame);
        carousel.style.scrollSnapType = "";
    }, { passive: true });
    carousel.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            goToCard(nearestCard() + (event.key === "ArrowLeft" ? -1 : 1));
        }
    });
}
reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
        revealObserver?.disconnect();
        revealElements.forEach((element) => element.classList.remove("is-pending"));
        cancelAnimationFrame(frame);
        if (carousel)
            carousel.style.scrollSnapType = "";
        questions.forEach((question) => {
            cancelAnimationFrame(questionFrames.get(question) ?? 0);
            question.open = questionTargets.get(question) ?? question.open;
            question.style.height = "";
            question.style.overflow = "";
        });
        questionFrames.clear();
    }
});
