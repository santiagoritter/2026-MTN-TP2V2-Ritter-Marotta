/**
 * comprobantes.js — Gestión de comprobantes de HogarPay
 * Descarga PDF real usando jsPDF (cargado vía CDN en index.html)
 */

let currentReceiptId = null;

function renderReceipts() {
  const year    = document.getElementById("filter-year")?.value    || "2026";
  const service = document.getElementById("filter-service")?.value || "";
  const container = document.getElementById("receipts-container");

  container.innerHTML = `<div class="text-muted">Cargando comprobantes…</div>`;

  dbGetReceipts().then(receipts => {
    STATE.receipts = receipts;
    const filtered = receipts.filter(r => {
      const matchYear = r.date.slice(6, 10) === year;
      const matchSvc  = !service || r.services.includes(service);
      return matchYear && matchSvc;
    });

    if (!filtered.length) {
      container.innerHTML = `<div class="text-muted">No hay comprobantes para los filtros seleccionados.</div>`;
      return;
    }

    container.innerHTML = `
      <table class="receipts-table">
        <thead>
          <tr>
            <th>ID</th><th>Fecha</th><th>Servicios</th>
            <th>Total</th><th>Retención hasta</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${filtered.slice().reverse().map(r => {
            const retYear = parseInt(r.date.slice(6, 10)) + 5;
            return `
              <tr>
                <td><span style="font-family:var(--mono);font-size:11px;color:var(--accent)">${r.id}</span></td>
                <td>${r.date}</td>
                <td>${r.items.map(i => `${i.icon} ${i.name}`).join(" · ")}</td>
                <td><b>${fmt(r.total)}</b></td>
                <td><span class="chip chip-gray">${retYear}</span></td>
                <td style="display:flex;gap:6px;">
                  <button class="btn btn-outline btn-sm" onclick="viewReceipt('${r.id}')">👁 Ver</button>
                  <button class="btn btn-primary btn-sm" onclick="downloadReceiptPDF('${r.id}')">⬇ PDF</button>
                </td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>
    `;
  }).catch(() => {
    container.innerHTML = `<div class="text-muted">No se pudieron cargar los comprobantes.</div>`;
  });
}

function viewReceipt(id) {
  currentReceiptId = id;
  const r = STATE.receipts.find(rc => rc.id === id);
  if (!r) return;
  const retYear = parseInt(r.date.slice(6, 10)) + 5;

  document.getElementById("modal-receipt-body").innerHTML = `
    <div class="receipt-preview">
      <div class="receipt-header">
        <div style="font-size:28px;margin-bottom:6px">🏠</div>
        <div class="receipt-logo-text">HogarPay</div>
        <div style="color:var(--muted);font-size:12px;font-family:var(--sans);margin-top:4px">
          Comprobante de pago electrónico
        </div>
      </div>

      <div style="margin-bottom:14px">
        <div class="receipt-kv"><span class="key">ID Comprobante</span><span class="val">${r.id}</span></div>
        <div class="receipt-kv"><span class="key">Fecha y hora</span><span class="val">${r.date}</span></div>
        <div class="receipt-kv"><span class="key">Titular</span><span class="val">${STATE.user?.name || "—"}</span></div>
        <div class="receipt-kv"><span class="key">Tarjeta</span><span class="val">**** ${r.card}</span></div>
      </div>

      <div style="margin-bottom:8px">
        ${r.items.map(i => `
          <div class="receipt-kv">
            <span class="key">${i.icon} ${i.name} · ${i.empresa}</span>
            <span class="val">${fmt(i.monto)}</span>
          </div>`).join("")}
      </div>

      <div class="receipt-total-row">
        <span>TOTAL PAGADO</span>
        <span class="val">${fmt(r.total)}</span>
      </div>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;
                  padding:10px;font-size:11px;color:#166534;font-family:var(--sans);margin-top:14px">
        🔒 Comprobante almacenado de forma segura · Retención hasta <b>${retYear}</b> (Ley 25.326 — 5 años)
      </div>
    </div>
  `;
  openModal("modal-receipt");
}

/** Genera y descarga un PDF real usando jsPDF */
function downloadReceiptPDF(id) {
  const rid = id || currentReceiptId;
  const r   = STATE.receipts.find(rc => rc.id === rid);
  if (!r) return;

  // jsPDF está disponible via CDN como window.jspdf.jsPDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const W    = doc.internal.pageSize.getWidth();
  const retYear = parseInt(r.date.slice(6, 10)) + 5;

  /* --- Encabezado --- */
  // Barra superior indigo
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, W, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("HogarPay", 14, 13);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Comprobante de Pago Electrónico", 14, 20);

  doc.setFontSize(9);
  doc.text(r.id, W - 14, 13, { align: "right" });
  doc.text(r.date, W - 14, 20, { align: "right" });

  /* --- Datos del pago --- */
  let y = 40;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Datos del pago", 14, y);

  y += 8;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, y, W - 14, y);

  const fields = [
    ["Titular",      STATE.user?.name || "—"],
    ["Email",        STATE.user?.email || "—"],
    ["Tarjeta",      `**** ${r.card}`],
    ["Fecha",        r.date],
    ["ID Comprobante", r.id],
  ];

  doc.setFontSize(10);
  fields.forEach(([k, v]) => {
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(k, 14, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(v, W - 14, y, { align: "right" });
  });

  /* --- Detalle de servicios --- */
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Detalle de servicios", 14, y);

  y += 8;
  doc.line(14, y, W - 14, y);

  // Cabecera tabla
  y += 8;
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y - 5, W - 28, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("SERVICIO", 16, y);
  doc.text("EMPRESA", 70, y);
  doc.text("N° CLIENTE", 120, y);
  doc.text("IMPORTE", W - 16, y, { align: "right" });

  // Filas
  r.items.forEach(item => {
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(item.name, 16, y);
    doc.setTextColor(100, 116, 139);
    doc.text(item.empresa, 70, y);
    doc.text(item.nroCliente || "—", 120, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(fmt(item.monto), W - 16, y, { align: "right" });
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 3, W - 14, y + 3);
  });

  /* --- Total --- */
  y += 14;
  doc.setFillColor(99, 102, 241);
  doc.roundedRect(14, y - 6, W - 28, 14, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL PAGADO", 20, y + 3);
  doc.text(fmt(r.total), W - 20, y + 3, { align: "right" });

  /* --- Nota legal --- */
  y += 24;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, y - 5, W - 28, 12, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text(
    `🔒  Comprobante almacenado de forma segura. Retención hasta ${retYear} (Ley 25.326 — 5 años). HogarPay no comparte tus datos con terceros.`,
    W / 2, y + 2,
    { align: "center", maxWidth: W - 32 }
  );

  /* --- Footer --- */
  const pageH = doc.internal.pageSize.getHeight();
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text("HogarPay · hogarpay.com.ar · Servicio de pago de facturas de servicios del hogar", W / 2, pageH - 8, { align: "center" });

  doc.save(`HogarPay_${r.id}.pdf`);
  showToast("✅ PDF descargado correctamente");
  closeModal("modal-receipt");
}
