import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

// Local dev: file URL (relative to cwd). Production (Vercel): Turso remote URL + token.
const IS_REMOTE = Boolean(process.env.TURSO_DATABASE_URL);
const DB_URL =
  process.env.TURSO_DATABASE_URL ||
  "file:" + path.join(DATA_DIR, "cctv.db").replace(/\\/g, "/");

// Only touch the local data dir for `file:` mode. Serverless filesystems are
// read-only (and have no pre-existing dir), so never mkdir there.
if (!IS_REMOTE) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const client = createClient({
  url: DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

export function getDb() {
  return client;
}

export const DB_PATH = DB_URL;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin-dml";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";

async function ensureColumn(table, column, ddl) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  const cols = info.rows.map((r) => r.name);
  if (!cols.includes(column)) {
    await client.execute(ddl);
  }
}

// Older schema had a global UNIQUE on layouts.name, which breaks multi-user
// (each user needs their own "Default"). Rebuild the table without it.
async function migrateLayouts() {
  const idx = await client.execute("PRAGMA index_list(layouts)");
  const hasUniqueName = idx.rows.some((i) => i.origin === "u" && i.unique === 1);
  if (!hasUniqueName) return;
  await client.execute("ALTER TABLE layouts RENAME TO layouts_old");
  await client.execute(`
    CREATE TABLE layouts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      cells      TEXT NOT NULL DEFAULT '[]',
      is_default INTEGER DEFAULT 0,
      created_at INTEGER,
      user_id    INTEGER
    )
  `);
  await client.execute(`
    INSERT INTO layouts (id, name, cells, is_default, created_at, user_id)
    SELECT id, name, cells, is_default, created_at, user_id FROM layouts_old
  `);
  await client.execute("DROP TABLE layouts_old");
  console.log("Migrated layouts table (removed global UNIQUE on name)");
}

export async function seedDefaultLayout() {
  const rs = await client.execute(
    "SELECT COUNT(*) AS c FROM layouts WHERE user_id IS NULL AND is_default = 1"
  );
  if (Number(rs.rows[0]?.c ?? 0) > 0) return;
  const act = await client.execute(
    "SELECT id_lokasi FROM cameras WHERE is_active = 1 ORDER BY id_lokasi LIMIT 9"
  );
  const cells = act.rows.map((r) => Number(r.id_lokasi));
  await client.execute({
    sql: "INSERT INTO layouts (name, cells, is_default, created_at, user_id) VALUES ('Default', ?, 1, ?, NULL)",
    args: [JSON.stringify(cells), Date.now()],
  });
}

export async function seedAdmin() {
  const rs = await client.execute("SELECT COUNT(*) AS c FROM users");
  if (Number(rs.rows[0]?.c ?? 0) > 0) return;
  const info = await client.execute({
    sql: "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
    args: [ADMIN_USERNAME, hashPassword(ADMIN_PASSWORD), Date.now()],
  });
  const adminId = Number(info.lastInsertRowid);
  // Adopt pre-existing layouts (created before multi-user) into the admin account.
  await client.execute({
    sql: "UPDATE layouts SET user_id = ? WHERE user_id IS NULL",
    args: [adminId],
  });
  console.log(`Seeded admin user "${ADMIN_USERNAME}"`);
}

// Ensure a user always has at least a Default layout (copied from the template).
export async function ensureUserDefault(userId) {
  const has = await client.execute({
    sql: "SELECT COUNT(*) AS c FROM layouts WHERE user_id = ?",
    args: [userId],
  });
  if (Number(has.rows[0]?.c ?? 0) > 0) return;
  const tmpl = await client.execute(
    "SELECT cells FROM layouts WHERE is_default = 1 ORDER BY id LIMIT 1"
  );
  const cells = tmpl.rows[0]?.cells ?? "[]";
  await client.execute({
    sql: "INSERT INTO layouts (name, cells, is_default, created_at, user_id) VALUES ('Default', ?, 0, ?, ?)",
    args: [cells, Date.now(), userId],
  });
}

export async function initDb() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS cameras (
      id_lokasi      INTEGER PRIMARY KEY,
      nama_lokasi    TEXT NOT NULL,
      ket_lokasi     TEXT DEFAULT '',
      lat_lokasi     REAL,
      lon_lokasi     REAL,
      is_active      INTEGER DEFAULT 1,
      name_proxy_cam TEXT,
      url_proxy_hls  TEXT,
      poster         TEXT DEFAULT '',
      nama_alias     TEXT,
      nama_device    TEXT,
      deskripsi      TEXT,
      kota           TEXT,
      provinsi       TEXT,
      last_seen      INTEGER DEFAULT 0,
      updated_at     INTEGER
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS layouts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      cells      TEXT NOT NULL DEFAULT '[]',
      is_default INTEGER DEFAULT 0,
      created_at INTEGER,
      user_id    INTEGER
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    INTEGER
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      created_at INTEGER
    )
  `);
  await ensureColumn("layouts", "user_id", "ALTER TABLE layouts ADD COLUMN user_id INTEGER");
  await migrateLayouts();
  await seedDefaultLayout();
  await seedAdmin();
}

await initDb();

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const cams = await client.execute("SELECT COUNT(*) AS c FROM cameras");
  const users = await client.execute("SELECT id, username FROM users");
  const lays = await client.execute("SELECT id, name, user_id FROM layouts");
  console.log(`DB ready: ${DB_URL}`);
  console.log(`  cameras: ${cams.rows[0].c}`);
  console.log(`  users: ${users.rows.map((u) => `#${u.id} ${u.username}`).join(", ") || "(none)"}`);
  console.log(`  layouts: ${lays.rows.map((l) => `#${l.id} ${l.name}(u${l.user_id})`).join(", ") || "(none)"}`);
}
