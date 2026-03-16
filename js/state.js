/**
 * state.js — Estado de sesión en memoria de HogarPay
 * Se inicializa en app.js con los datos del usuario logueado.
 */

const STATE = {
  // Se puebla desde la sesión activa al iniciar
  user: null,

  // Servicios: los números de cliente se cargan desde el usuario logueado
  services: [
    {
      id: "luz", name: "Luz", empresa: "EDESUR",
      icon: "⚡", iconClass: "icon-luz",
      monto: 18540, kwh: 312, m3: null, prevConsumo: 285,
      vence: "22/03/2026", selected: true, pagado: false,
    },
    {
      id: "agua", name: "Agua", empresa: "AySA",
      icon: "💧", iconClass: "icon-agua",
      monto: 6820, kwh: null, m3: 14, prevConsumo: 13,
      vence: "28/03/2026", selected: true, pagado: false,
    },
    {
      id: "gas", name: "Gas", empresa: "Metrogas",
      icon: "🔥", iconClass: "icon-gas",
      monto: 22300, kwh: null, m3: 38, prevConsumo: 22,
      vence: "18/03/2026", selected: true, pagado: false,
    },
  ],

  receipts: [],
};

const GAS_ANOMALY_THRESHOLD = 0.40;
