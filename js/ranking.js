/**
 * ranking.js — Ranking barrial anónimo de consumo eléctrico
 * Solo alias anónimos, participación opt-in (Ley 25.326)
 */

const RANKING_DATA = [
  { alias: "Tigre⚡",    kwh: 520, isMe: false },
  { alias: "Paloma🌸",  kwh: 487, isMe: false },
  { alias: "Oso🌙",     kwh: 312, isMe: true  },
  { alias: "Toro🔴",    kwh: 295, isMe: false },
  { alias: "Luna🌕",    kwh: 270, isMe: false },
  { alias: "Colibrí🐦", kwh: 241, isMe: false },
  { alias: "Cactus🌵",  kwh: 198, isMe: false },
  { alias: "Nube☁️",    kwh: 165, isMe: false },
];

function renderRanking() {
  const months = ["enero","febrero","marzo","abril","mayo","junio",
                  "julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const d = new Date();
  const mesEl = document.getElementById("ranking-mes");
  if (mesEl) mesEl.textContent = months[d.getMonth()] + " " + d.getFullYear();

  const optin = document.getElementById("ranking-optin")?.checked;
  const lista = document.getElementById("ranking-list");
  if (!lista) return;

  // Actualizar alias del usuario actual
  const session = dbGetSession();
  if (session) {
    const me = RANKING_DATA.find(r => r.isMe);
    if (me) me.alias = session.alias;
  }

  if (!optin) {
    lista.innerHTML = `
      <div class="alert alert-info">
        Desactivaste tu participación en el ranking.
        Activala en <a href="#" onclick="goTab('config');return false">Mi cuenta</a>.
      </div>`;
    document.getElementById("mi-posicion-card").innerHTML =
      `<div class="text-muted">No participás en el ranking.</div>`;
    return;
  }

  const max = Math.max(...RANKING_DATA.map(r => r.kwh));
  lista.innerHTML = RANKING_DATA.map((r, i) => {
    const posClass = i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : "rank-other";
    const medal    = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1;
    const pct      = Math.round((r.kwh / max) * 100);
    return `
      <div class="ranking-item ${r.isMe ? "rank-me" : ""}">
        <div class="rank-pos ${posClass}">${medal}</div>
        <div class="rank-alias">
          ${r.alias}
          ${r.isMe ? "<span class='chip chip-blue' style='font-size:10px;margin-left:4px'>Vos</span>" : ""}
        </div>
        <div class="rank-bar-wrap"><div class="rank-bar" style="width:${pct}%"></div></div>
        <div class="rank-kwh">${r.kwh} kWh</div>
      </div>`;
  }).join("");

  const myData   = RANKING_DATA.find(r => r.isMe);
  const myPos    = RANKING_DATA.findIndex(r => r.isMe) + 1;
  const avgKwh   = Math.round(RANKING_DATA.reduce((a, r) => a + r.kwh, 0) / RANKING_DATA.length);
  const pctVsAvg = Math.round(((myData.kwh - avgKwh) / avgKwh) * 100);

  document.getElementById("mi-posicion-card").innerHTML = `
    <div style="text-align:center;padding:10px 0 16px">
      <div style="font-size:44px;font-weight:900;color:var(--accent)">${myPos}°</div>
      <div style="font-size:13px;font-weight:700">de ${RANKING_DATA.length} vecinos</div>
      <div style="margin-top:10px;font-size:13px;color:var(--muted)">
        Tu consumo: <b>${myData.kwh} kWh</b>
      </div>
      <div style="font-size:13px;color:var(--muted)">Promedio del barrio: <b>${avgKwh} kWh</b></div>
      <div style="margin-top:10px">
        <span class="chip ${pctVsAvg < 0 ? "chip-green" : "chip-orange"}">
          ${pctVsAvg < 0
            ? "✅ " + Math.abs(pctVsAvg) + "% por debajo del promedio"
            : "⬆️ " + pctVsAvg + "% por encima del promedio"}
        </span>
      </div>
    </div>`;
}
