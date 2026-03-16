/**
 * ui.js — Componentes de UI reutilizables de HogarPay
 *
 * - Toast de notificaciones
 * - Modal genérico (abrir/cerrar)
 * - Animación de confeti al pagar
 * - Manejo de alertas/preferencias del usuario
 */

/* ── TOAST ── */
let _toastTimer;

/** Muestra un mensaje de toast en la esquina inferior derecha */
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ── MODAL ── */

/** Abre el modal con el id indicado */
function openModal(id) {
  document.getElementById(id).classList.add("show");
}

/** Cierra el modal con el id indicado */
function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

/* ── CONFETTI 🎉 ── */

/** Lanza la animación de confeti de colores en pantalla completa */
function launchConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  const COLORS = [
    "#f97316", "#0ea5e9", "#10b981", "#f59e0b",
    "#a855f7", "#ec4899", "#ef4444", "#84cc16",
  ];

  const particles = Array.from({ length: 180 }, () => ({
    x:       Math.random() * canvas.width,
    y:       -10 - Math.random() * 200,
    w:       8  + Math.random() * 8,
    h:       6  + Math.random() * 6,
    color:   COLORS[Math.floor(Math.random() * COLORS.length)],
    vy:      3  + Math.random() * 5,
    vx:      (Math.random() - 0.5) * 4,
    angle:   Math.random() * 360,
    spin:    (Math.random() - 0.5) * 8,
    opacity: 1,
  }));

  let frame;
  let tick = 0;

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    tick++;

    particles.forEach(p => {
      p.y     += p.vy;
      p.x     += p.vx;
      p.angle += p.spin;
      if (tick > 80) p.opacity = Math.max(0, p.opacity - 0.015);

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate((p.angle * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (particles.some(p => p.opacity > 0)) {
      frame = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(frame);
    }
  }

  animate();
}
