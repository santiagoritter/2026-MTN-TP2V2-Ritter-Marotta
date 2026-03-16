/**
 * inicio.js — Dashboard principal de HogarPay
 */

function renderInicio() {
  _renderBanner();
  _checkGasAnomaly();
  _renderServiceCards();
  _renderRecentActivity();
}

function _renderBanner() {
  const unpaid = STATE.services.filter(s => !s.pagado);
  const total  = unpaid.reduce((a, s) => a + s.monto, 0);
  document.getElementById("total-amount").textContent = fmt(total);
  document.getElementById("total-detail").textContent = unpaid.length > 0
    ? unpaid.map(s => s.name).join(", ") + " pendientes de pago"
    : "✅ Todo pagado este mes";
}

function _checkGasAnomaly() {
  const gas     = STATE.services.find(s => s.id === "gas");
  const alertEl = document.getElementById("alert-gas");
  const activo  = document.getElementById("alerta-consumo-gas")?.checked;
  if (gas && !gas.pagado && activo) {
    const pct = Math.round(((gas.m3 - gas.prevConsumo) / gas.prevConsumo) * 100);
    if (pct >= GAS_ANOMALY_THRESHOLD * 100) {
      alertEl.style.display = "flex";
      document.getElementById("gas-pct").textContent = pct;
      return;
    }
  }
  alertEl.style.display = "none";
}

function _renderServiceCards() {
  const grid = document.getElementById("service-cards");
  grid.innerHTML = "";
  const session = dbGetSession();

  STATE.services.forEach(s => {
    // Inyectar número de cliente desde la sesión
    const nc = session
      ? (s.id === "luz" ? session.ncLuz : s.id === "agua" ? session.ncAgua : session.ncGas)
      : "—";

    const isPaid   = s.pagado;
    const venceTs  = parseDate(s.vence);
    const todayTs  = new Date(); todayTs.setHours(0,0,0,0);
    const daysLeft = Math.ceil((venceTs - todayTs) / 86400000);

    const badge = isPaid
      ? `<span class="badge-ok">✅ Pagado</span>`
      : daysLeft <= 3
        ? `<span class="badge-alerta">⚠️ Vence en ${daysLeft}d</span>`
        : `<span class="badge-vence">Vence ${s.vence}</span>`;

    const consumo = s.id === "luz"
      ? `${s.kwh} kWh`
      : `${s.m3} m³`;

    const card = document.createElement("div");
    card.className = "service-card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div class="service-icon ${s.iconClass}">${s.icon}</div>
        ${badge}
      </div>
      <div>
        <div class="service-name">${s.name} · ${s.empresa}</div>
        <div class="service-info">N° cliente: <span style="font-family:var(--mono)">${nc || "No cargado"}</span></div>
      </div>
      <div class="service-amount">${fmt(s.monto)}<br><span>${consumo} este mes</span></div>
      ${isPaid
        ? `<button class="btn btn-outline btn-sm" onclick="goTab('comprobantes')">Ver comprobante</button>`
        : `<button class="btn btn-primary btn-sm" onclick="pagarServicio('${s.id}')">Pagar</button>`
      }
    `;
    grid.appendChild(card);
  });
}

function _renderRecentActivity() {
  const el = document.getElementById("recent-activity");
  if (!STATE.receipts.length) {
    el.innerHTML = `<div class="text-muted" style="padding:8px 0">Aún no hay pagos registrados.</div>`;
    return;
  }
  el.innerHTML = STATE.receipts.slice(-5).reverse().map(r => `
    <div style="display:flex;justify-content:space-between;align-items:center;
                padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px">${r.icon}</span>
        <div>
          <div style="font-weight:700">${r.services}</div>
          <div class="text-muted">${r.date}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:800">${fmt(r.total)}</div>
        <span class="chip chip-green">Pagado</span>
      </div>
    </div>
  `).join("");
}

function pagarServicio(id) {
  STATE.services.forEach(s => s.selected = s.id === id);
  goTab("pagar");
}
