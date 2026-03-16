/**
 * app.js — Inicialización y autenticación de HogarPay
 *
 * Flujo:
 *  1. Si hay sesión activa → mostrar app
 *  2. Si no → mostrar pantalla de login/registro
 */

/* ─── MOSTRAR / OCULTAR PANTALLAS ─── */

function showApp() {
  document.getElementById("auth-screen").classList.remove("show");
  document.getElementById("app-screen").classList.add("show");
}

function showAuth() {
  document.getElementById("app-screen").classList.remove("show");
  document.getElementById("auth-screen").classList.add("show");
}

/* ─── TOPBAR: saludar al usuario ─── */
function _populateTopbar(session) {
  const initials = session.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  document.getElementById("topbar-initials").textContent  = initials;
  document.getElementById("topbar-greeting-name").textContent = session.name.split(" ")[0];
  document.getElementById("sidebar-avatar-initials").textContent = initials;
  document.getElementById("sidebar-user-name").textContent  = session.name;
  document.getElementById("sidebar-user-email").textContent = session.email;
}

/* ─── CARGAR ESTADO DEL USUARIO LOGUEADO ─── */
function _loadUserState(session) {
  STATE.user = session;
  STATE.receipts = [];   // se llena async luego con dbGetReceipts()

  // Marcar servicios no pagados como seleccionados
  STATE.services.forEach(s => { if (!s.pagado) s.selected = true; });
}

/* ─── LOGIN ─── */
async function handleLogin() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl    = document.getElementById("login-error");
  const btn      = document.querySelector("#auth-login-form .btn-auth-primary");

  if (!email || !password) {
    errEl.textContent = "Completá todos los campos.";
    errEl.classList.add("show"); return;
  }

  btn.disabled   = true;
  btn.textContent = "Verificando…";
  errEl.classList.remove("show");

  try {
    const result = await dbLogin(email, password);
    _loadUserState(result.user);
    _populateTopbar(result.user);
    showApp();
    goTab("inicio");
    showToast(`¡Bienvenido/a, ${result.user.name.split(" ")[0]}! 👋`);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add("show");
  } finally {
    btn.disabled   = false;
    btn.textContent = "Iniciar sesión →";
  }
}

/* ─── REGISTRO ─── */
async function handleRegister() {
  const name     = document.getElementById("reg-name").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const confirm  = document.getElementById("reg-confirm").value;
  const alias    = document.getElementById("reg-alias").value.trim();
  const zone     = document.getElementById("reg-zone").value.trim();
  const ncLuz    = document.getElementById("reg-nc-luz").value.trim();
  const ncAgua   = document.getElementById("reg-nc-agua").value.trim();
  const ncGas    = document.getElementById("reg-nc-gas").value.trim();
  const errEl    = document.getElementById("reg-error");
  const btn      = document.querySelector("#auth-register-form .btn-auth-primary");

  if (!name || !email || !password) {
    errEl.textContent = "Nombre, email y contraseña son obligatorios.";
    errEl.classList.add("show"); return;
  }
  if (password.length < 6) {
    errEl.textContent = "La contraseña debe tener al menos 6 caracteres.";
    errEl.classList.add("show"); return;
  }
  if (password !== confirm) {
    errEl.textContent = "Las contraseñas no coinciden.";
    errEl.classList.add("show"); return;
  }

  btn.disabled    = true;
  btn.textContent = "Creando cuenta…";
  errEl.classList.remove("show");

  try {
    const result = await dbRegister({ name, email, password, alias, zone, ncLuz, ncAgua, ncGas });
    _loadUserState(result.user);
    _populateTopbar(result.user);
    showApp();
    goTab("inicio");
    showToast(`¡Cuenta creada! Bienvenido/a, ${result.user.name.split(" ")[0]} 🎉`);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add("show");
  } finally {
    btn.disabled    = false;
    btn.textContent = "Crear cuenta gratis →";
  }
}

/* ─── LOGOUT ─── */
async function handleLogout() {
  await dbLogout();
  STATE.user     = null;
  STATE.receipts = [];
  STATE.services.forEach(s => { s.pagado = false; s.selected = true; });
  showAuth();
  switchAuthTab("login");
}

/* ─── TABS DE AUTH (login / registro) ─── */
function switchAuthTab(tab) {
  document.getElementById("auth-login-form").style.display    = tab === "login"    ? "flex" : "none";
  document.getElementById("auth-register-form").style.display = tab === "register" ? "flex" : "none";
  document.querySelectorAll(".auth-tab").forEach((el, i) => {
    el.classList.toggle("active", (i === 0 && tab === "login") || (i === 1 && tab === "register"));
  });
}

/* ─── GUARDAR CAMBIOS DE PERFIL ─── */
async function saveProfile() {
  const name  = document.getElementById("cfg-name").value.trim();
  const email = document.getElementById("cfg-email").value.trim();
  const phone = document.getElementById("cfg-phone").value.trim();
  const zone  = document.getElementById("cfg-zone").value.trim();
  const alias = document.getElementById("cfg-alias").value.trim();
  if (!name || !email) { showToast("Nombre y email son obligatorios"); return; }
  try {
    const updated = await dbUpdateUser({ name, email, phone, zone, alias });
    STATE.user = updated;
    _populateTopbar(updated);
    showToast("Perfil actualizado ✔");
  } catch (err) { showToast("Error: " + err.message); }
}

async function saveClientNumbers() {
  const ncLuz  = document.getElementById("nc-luz").value.trim();
  const ncAgua = document.getElementById("nc-agua").value.trim();
  const ncGas  = document.getElementById("nc-gas").value.trim();
  try {
    const updated = await dbUpdateUser({ ncLuz, ncAgua, ncGas });
    STATE.user = updated;
    showToast("Números de cliente guardados ✔");
  } catch (err) { showToast("Error: " + err.message); }
}

/* ─── ALERTAS ─── */
function updateAlerts() {
  showToast("Preferencias guardadas ✔");
  if (document.getElementById("page-inicio").classList.contains("active")) renderInicio();
}

/* ─── INIT ─── */
(async function init() {
  // Mostrar auth rápido mientras verificamos con el servidor
  const cached = dbGetSession();
  if (!cached) { showAuth(); switchAuthTab("login"); return; }

  // Mostrar app de forma optimista mientras validamos token
  _loadUserState(cached);
  _populateTopbar(cached);
  showApp();
  goTab("inicio");

  // Verificar sesión con el servidor y refrescar datos
  const fresh = await dbVerifySession();
  if (!fresh) {
    // Token expirado / servidor caído
    STATE.user = null;
    STATE.receipts = [];
    STATE.services.forEach(s => { s.pagado = false; s.selected = true; });
    showAuth();
    switchAuthTab("login");
    showToast("Sesión expirada. Iniciá sesión nuevamente.");
    return;
  }

  // Actualizar con datos frescos del servidor
  STATE.user = fresh;
  _populateTopbar(fresh);
  // Recargar comprobantes desde el servidor
  STATE.receipts = await dbGetReceipts().catch(() => []);
  renderInicio();
  renderRanking();
})();
