/**
 * pagar.js — Flujo de pago de 3 pasos de HogarPay
 *
 * Paso 1: Seleccionar servicios a pagar
 * Paso 2: Ingresar datos de tarjeta
 * Paso 3: Confirmar y ejecutar el pago
 */

let currentStep = 1;

/** Punto de entrada: reinicia al paso 1 */
function renderPagar() {
  currentStep = 1;
  goStep(1);
}

/** Navega al paso indicado (1, 2 o 3) */
function goStep(n) {
  currentStep = n;

  // Mostrar/ocultar paneles
  [1, 2, 3].forEach(i => {
    document.getElementById(`pagar-step${i}`).style.display = i === n ? "block" : "none";
  });

  // Actualizar step indicator con nuevos IDs
  [1, 2, 3].forEach(i => {
    const item = document.getElementById(`step-item-${i}`);
    if (!item) return;
    item.className = "step-item" +
      (i < n ? " done" : i === n ? " active" : "");
  });
  [1, 2].forEach(i => {
    const conn = document.getElementById(`step-conn-${i}`);
    if (!conn) return;
    conn.className = "step-connector" + (i < n ? " done" : "");
  });

  if (n === 1) _renderStep1();
  if (n === 3) _renderStep3();
}

/** Paso 1: lista de servicios pendientes con checkboxes */
function _renderStep1() {
  const unpaid = STATE.services.filter(s => !s.pagado);
  const container = document.getElementById("pagar-services-list");

  if (unpaid.length === 0) {
    container.innerHTML = `<div class="alert alert-success">✅ ¡Todos los servicios de este mes ya están pagados!</div>`;
    document.getElementById("pagar-total-selected").textContent = "$0,00";
    return;
  }

  container.innerHTML = unpaid.map(s => `
    <label style="display:flex; align-items:center; gap:14px; padding:14px 0;
                  border-bottom:1px solid #f1f5f9; cursor:pointer;">
      <input type="checkbox" id="chk-${s.id}" ${s.selected ? "checked" : ""}
        onchange="toggleService('${s.id}', this.checked)"
        style="width:18px; height:18px; accent-color:var(--accent); cursor:pointer;"/>
      <span class="service-icon ${s.iconClass}" style="flex-shrink:0">${s.icon}</span>
      <div style="flex:1">
        <div style="font-weight:800">${s.name} · ${s.empresa}</div>
        <div class="text-muted" style="font-size:12px">N° ${s.nroCliente} · Vence ${s.vence}</div>
      </div>
      <div style="font-weight:900; font-size:17px">${fmt(s.monto)}</div>
    </label>
  `).join("");

  _updateTotal();
}

/** Paso 3: resumen con detalle de lo que se va a pagar */
function _renderStep3() {
  const selected = STATE.services.filter(s => !s.pagado && s.selected);
  const total = selected.reduce((a, s) => a + s.monto, 0);
  const cardNum = document.getElementById("pay-card").value.replace(/\s/g, "").slice(-4) || "****";

  document.getElementById("confirm-total").textContent = fmt(total);
  document.getElementById("confirm-detail").innerHTML = `
    <table style="width:100%; font-size:14px; border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:1px solid var(--border); color:var(--muted);
                   font-size:12px; text-transform:uppercase;">
          <th style="text-align:left; padding:8px 0">Servicio</th>
          <th style="text-align:left; padding:8px 0">Empresa</th>
          <th style="text-align:right; padding:8px 0">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${selected.map(s => `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:12px 0">${s.icon} ${s.name}</td>
            <td style="padding:12px 0; color:var(--muted)">${s.empresa}</td>
            <td style="padding:12px 0; text-align:right; font-weight:700">${fmt(s.monto)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div style="display:flex; justify-content:space-between; padding:12px 0;
                font-size:13px; color:var(--muted);">
      <span>Método de pago</span>
      <span style="font-weight:700; color:var(--ink)">💳 Tarjeta terminada en ${cardNum}</span>
    </div>
  `;
}

/** Activa/desactiva un servicio del checkbox y recalcula el total */
function toggleService(id, checked) {
  const s = STATE.services.find(sv => sv.id === id);
  if (s) s.selected = checked;
  _updateTotal();
}

/** Recalcula y muestra el total seleccionado */
function _updateTotal() {
  const total = STATE.services
    .filter(s => !s.pagado && s.selected)
    .reduce((a, s) => a + s.monto, 0);
  document.getElementById("pagar-total-selected").textContent = fmt(total);
}

/** Ejecuta el pago, genera el comprobante y dispara el confeti */
async function confirmarPago() {
  const btn = document.getElementById("btn-confirmar-pago");
  btn.disabled = true;
  btn.textContent = "Procesando…";

  // Simular latencia de procesamiento
  await new Promise(resolve => setTimeout(resolve, 1400));

  const selected = STATE.services.filter(s => !s.pagado && s.selected);

  if (selected.length === 0) {
    btn.disabled = false;
    btn.textContent = "💳 Confirmar pago";
    return;
  }

  const total = selected.reduce((a, s) => a + s.monto, 0);
  const receiptId = "RCP-" + Date.now().toString(36).toUpperCase();

  const receipt = {
    id: receiptId,
    date: nowStamp(),
    services: selected.map(s => s.name).join(" + "),
    items: selected.map(s => ({
      icon: s.icon,
      name: s.name,
      empresa: s.empresa,
      monto: s.monto,
      nroCliente: s.nroCliente,
    })),
    total,
    card: document.getElementById("pay-card").value.slice(-4),
    icon: selected.length > 1 ? "🏠" : selected[0].icon,
  };

  // Persistir en el servidor
  try {
    await dbAddReceipt(receipt);
    STATE.receipts = await dbGetReceipts();
  } catch (e) {
    console.warn("Servidor no disponible, guardado en memoria:", e.message);
    STATE.receipts.push(receipt);
  }

  // Marcar servicios como pagados
  selected.forEach(s => { s.pagado = true; s.selected = false; });

  btn.disabled = false;
  btn.textContent = "💳 Confirmar pago";

  launchConfetti();
  showToast("¡Pago realizado! 🎉 Comprobante guardado");

  setTimeout(() => goTab("inicio"), 1800);
}
