"use strict";
const menu = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#navigation");
if (menu && navigation) {
  const closeMenu = () => { menu.setAttribute("aria-expanded", "false"); navigation.classList.remove("open"); };
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    navigation.classList.toggle("open", open);
  });
  navigation.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") { closeMenu(); menu.focus(); }
  });
  document.addEventListener("click", event => { if (!event.target.closest(".header")) closeMenu(); });
  window.matchMedia("(max-width: 650px)").addEventListener("change", closeMenu);
}
// Content stays visible if animation initialization is unavailable or fails.
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  try {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(element => observer.observe(element));
    document.documentElement.classList.add("js");
  } catch { document.documentElement.classList.remove("js"); }
}
const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();
