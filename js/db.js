/**
 * db.js — Cliente de la API REST de HogarPay
 *
 * Todas las funciones son async y se comunican con el servidor
 * en http://localhost:3001/api/...
 *
 * El token de sesión se guarda en localStorage["hp_token"]
 * y se envía en el header Authorization: Bearer <token>
 */

const API_BASE  = "http://localhost:3001/api";
const TOKEN_KEY = "hp_token";
const USER_KEY  = "hp_user";  // caché del perfil en localStorage

/* ─── helpers internos ────────────────────────────── */

function _getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

function _saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function _clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function _apiFetch(endpoint, options = {}) {
  const token = _getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(API_BASE + endpoint, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error desconocido");
  return data;
}

/* ─── AUTH ────────────────────────────────────────── */

/**
 * Registra un nuevo usuario.
 * @returns { ok: true, user } | lanza Error con mensaje
 */
async function dbRegister({ name, email, password, alias, zone, ncLuz, ncAgua, ncGas }) {
  const data = await _apiFetch("/register", {
    method: "POST",
    body: { name, email, password, alias, zone, ncLuz, ncAgua, ncGas },
  });
  _saveSession(data.token, data.user);
  return { ok: true, user: data.user };
}

/**
 * Autentica un usuario.
 * @returns { ok: true, user } | lanza Error con mensaje
 */
async function dbLogin(email, password) {
  const data = await _apiFetch("/login", {
    method: "POST",
    body: { email, password },
  });
  _saveSession(data.token, data.user);
  return { ok: true, user: data.user };
}

/** Cierra la sesión (invalida el token en el servidor) */
async function dbLogout() {
  try { await _apiFetch("/logout", { method: "POST" }); } catch { /* ignorar */ }
  _clearSession();
}

/**
 * Devuelve el usuario en caché local (sin llamar al servidor).
 * Útil para el init rápido del frontend.
 */
function dbGetSession() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
  catch { return null; }
}

/**
 * Verifica la sesión con el servidor y refresca el caché.
 * @returns usuario actualizado o null si el token expiró
 */
async function dbVerifySession() {
  if (!_getToken()) return null;
  try {
    const data = await _apiFetch("/me");
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  } catch {
    _clearSession();
    return null;
  }
}

/* ─── PERFIL ──────────────────────────────────────── */

/**
 * Actualiza datos del usuario logueado.
 * @param {object} fields  — campos a cambiar
 * @returns usuario actualizado
 */
async function dbUpdateUser(fields) {
  const data = await _apiFetch("/profile", { method: "PUT", body: fields });
  const updated = { ...(dbGetSession() || {}), ...data.user };
  localStorage.setItem(USER_KEY, JSON.stringify(updated));
  return updated;
}

/* ─── COMPROBANTES ────────────────────────────────── */

/** Devuelve los comprobantes del usuario logueado */
async function dbGetReceipts() {
  const data = await _apiFetch("/receipts");
  return data.receipts || [];
}

/** Guarda un comprobante en el servidor */
async function dbAddReceipt(receipt) {
  await _apiFetch("/receipts", { method: "POST", body: receipt });
}
