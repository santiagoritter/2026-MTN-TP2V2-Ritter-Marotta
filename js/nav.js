/**
 * nav.js — Navegación entre páginas de HogarPay
 */

const TABS = ["inicio", "pagar", "comprobantes", "ranking", "config"];

function goTab(name) {
  TABS.forEach(t => document.getElementById("page-" + t).classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((el, i) => {
    el.classList.toggle("active", TABS[i] === name);
  });
  document.getElementById("page-" + name).classList.add("active");

  if (name === "inicio")       renderInicio();
  if (name === "pagar")        renderPagar();
  if (name === "comprobantes") renderReceipts();
  if (name === "ranking")      renderRanking();
}
