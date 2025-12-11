// script.js - ejemplo simple
document.addEventListener("DOMContentLoaded", function () {
  // año en el footer
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // toggle nav para móviles
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      nav.classList.toggle("open");
    });
  }

  // ejemplo: mensaje en consola
  console.log("Sitio cargado — listo para desplegar en GitHub Pages");
});