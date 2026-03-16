/**
 * server.js — API REST de HogarPay
 *
 * Endpoints:
 *   POST   /api/register          — Registrar usuario
 *   POST   /api/login             — Iniciar sesión (devuelve token)
 *   GET    /api/me                — Perfil del usuario logueado
 *   PUT    /api/profile           — Actualizar perfil
 *   GET    /api/receipts          — Comprobantes del usuario
 *   POST   /api/receipts          — Guardar nuevo comprobante
 *
 * Base de datos: SQLite (archivo hogarpay.db en la misma carpeta)
 * Auth: token simple en localStorage del cliente (simula JWT para demo)
 */

const express    = require("express");
const cors       = require("cors");
const path       = require("path");
const crypto     = require("crypto");
const Database   = require("better-sqlite3");

const app  = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, "hogarpay.db");

/* ─── Middlewares ─────────────────────────────────── */
app.use(cors({ origin: "*" }));
app.use(express.json());
// Servir el frontend estático desde la misma carpeta
app.use(express.static(__dirname));

/* ─── SQLite setup ────────────────────────────────── */
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    alias       TEXT,
    zone        TEXT DEFAULT 'Buenos Aires',
    nc_luz      TEXT DEFAULT '',
    nc_agua     TEXT DEFAULT '',
    nc_gas      TEXT DEFAULT '',
    phone       TEXT DEFAULT '',
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tokens (
    token       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    date        TEXT NOT NULL,
    services    TEXT NOT NULL,
    items_json  TEXT NOT NULL,
    total       REAL NOT NULL,
    card        TEXT,
    icon        TEXT
  );
`);

/* ─── Helpers ─────────────────────────────────────── */
function hashPassword(password) {
  return crypto.createHash("sha256")
    .update(password + "hp_salt_2026")
    .digest("hex");
}

function generateId(prefix = "u") {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

const ANIMALS = ["Tigre","Puma","Cóndor","Zorro","Aguila","Lobo","Panda","Ñandú","Guanaco","Delfín"];
const EMOJIS  = ["🌙","⚡","🌿","🔥","💧","🌊","🌟","🦋","🎯","🚀"];
function generateAlias() {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)] +
         EMOJIS [Math.floor(Math.random() * EMOJIS.length)];
}

/** Middleware: extrae y valida el token del header Authorization */
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "No autenticado." });

  const row = db.prepare("SELECT * FROM tokens WHERE token = ?").get(token);
  if (!row) return res.status(401).json({ error: "Token inválido o expirado." });

  req.userId = row.user_id;
  req.token  = token;
  next();
}

/** Convierte una fila de DB al objeto de sesión que usa el frontend */
function rowToSession(user) {
  return {
    userId: user.id,
    name:   user.name,
    email:  user.email,
    alias:  user.alias,
    zone:   user.zone,
    ncLuz:  user.nc_luz,
    ncAgua: user.nc_agua,
    ncGas:  user.nc_gas,
    phone:  user.phone,
  };
}

/* ─── RUTAS ───────────────────────────────────────── */

/** POST /api/register — Crear cuenta */
app.post("/api/register", (req, res) => {
  const { name, email, password, alias, zone, ncLuz, ncAgua, ncGas } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?)").get(email.trim());
  if (existing) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
  }

  const user = {
    id:            generateId("u"),
    name:          name.trim(),
    email:         email.trim().toLowerCase(),
    password_hash: hashPassword(password),
    alias:         (alias || "").trim() || generateAlias(),
    zone:          (zone  || "").trim() || "Buenos Aires",
    nc_luz:        (ncLuz  || "").trim(),
    nc_agua:       (ncAgua || "").trim(),
    nc_gas:        (ncGas  || "").trim(),
    phone:         "",
    created_at:    new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, alias, zone, nc_luz, nc_agua, nc_gas, phone, created_at)
    VALUES (@id, @name, @email, @password_hash, @alias, @zone, @nc_luz, @nc_agua, @nc_gas, @phone, @created_at)
  `).run(user);

  // Auto-login: crear token
  const token = generateToken();
  db.prepare("INSERT INTO tokens (token, user_id, created_at) VALUES (?, ?, ?)").run(
    token, user.id, new Date().toISOString()
  );

  res.status(201).json({ token, user: rowToSession(user) });
});

/** POST /api/login — Iniciar sesión */
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Completá todos los campos." });
  }

  const user = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(email.trim());
  if (!user) {
    return res.status(401).json({ error: "No existe una cuenta con ese email." });
  }
  if (user.password_hash !== hashPassword(password)) {
    return res.status(401).json({ error: "Contraseña incorrecta." });
  }

  const token = generateToken();
  db.prepare("INSERT INTO tokens (token, user_id, created_at) VALUES (?, ?, ?)").run(
    token, user.id, new Date().toISOString()
  );

  res.json({ token, user: rowToSession(user) });
});

/** POST /api/logout — Cerrar sesión */
app.post("/api/logout", requireAuth, (req, res) => {
  db.prepare("DELETE FROM tokens WHERE token = ?").run(req.token);
  res.json({ ok: true });
});

/** GET /api/me — Perfil del usuario autenticado */
app.get("/api/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado." });
  res.json({ user: rowToSession(user) });
});

/** PUT /api/profile — Actualizar perfil */
app.put("/api/profile", requireAuth, (req, res) => {
  const { name, email, phone, alias, zone, ncLuz, ncAgua, ncGas } = req.body;

  const fields = {};
  if (name  !== undefined) fields.name   = name.trim();
  if (email !== undefined) fields.email  = email.trim().toLowerCase();
  if (phone !== undefined) fields.phone  = phone.trim();
  if (alias !== undefined) fields.alias  = alias.trim();
  if (zone  !== undefined) fields.zone   = zone.trim();
  if (ncLuz  !== undefined) fields.nc_luz  = ncLuz.trim();
  if (ncAgua !== undefined) fields.nc_agua = ncAgua.trim();
  if (ncGas  !== undefined) fields.nc_gas  = ncGas.trim();

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: "No hay campos para actualizar." });
  }

  // Construir SET dinámico
  const setClauses = Object.keys(fields).map(k => `${k} = @${k}`).join(", ");
  db.prepare(`UPDATE users SET ${setClauses} WHERE id = @id`).run({ ...fields, id: req.userId });

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json({ user: rowToSession(updated) });
});

/** GET /api/receipts — Comprobantes del usuario */
app.get("/api/receipts", requireAuth, (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM receipts WHERE user_id = ? ORDER BY date DESC"
  ).all(req.userId);

  const receipts = rows.map(r => ({
    id:       r.id,
    date:     r.date,
    services: r.services,
    items:    JSON.parse(r.items_json),
    total:    r.total,
    card:     r.card,
    icon:     r.icon,
  }));

  res.json({ receipts });
});

/** POST /api/receipts — Guardar nuevo comprobante */
app.post("/api/receipts", requireAuth, (req, res) => {
  const { id, date, services, items, total, card, icon } = req.body;
  if (!id || !date || !items || total === undefined) {
    return res.status(400).json({ error: "Datos de comprobante incompletos." });
  }

  db.prepare(`
    INSERT INTO receipts (id, user_id, date, services, items_json, total, card, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, date, services || "", JSON.stringify(items), total, card || "", icon || "🏠");

  res.status(201).json({ ok: true, id });
});

/* ─── Iniciar servidor ─────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n🏠 HogarPay API corriendo en http://localhost:${PORT}`);
  console.log(`   Frontend: http://localhost:${PORT}/index.html`);
  console.log(`   Base de datos: ${DB_PATH}\n`);
});
