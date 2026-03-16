/**
 * utils.js — Funciones utilitarias de HogarPay
 */

/** Formatea un número como moneda argentina: $1.234,56 */
function fmt(n) {
  return "$" + n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Devuelve timestamp actual como "DD/MM/YYYY HH:MM" */
function nowStamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Devuelve la fecha de hoy como "DD/MM/YYYY" */
function today() {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Parsea una fecha en formato "DD/MM/YYYY" a objeto Date */
function parseDate(str) {
  const [d, m, y] = str.split("/");
  return new Date(+y, +m - 1, +d);
}
