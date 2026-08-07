import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

// Local dev: file URL (relative to cwd). Production (Vercel): Turso remote URL + token.
const DB_URL =
  process.env.TURSO_DATABASE_URL ||
  "file:" + path.join(DATA_DIR, "cctv.db").replace(/\\/g, "/");

fs.mkdirSync(DATA_DIR, { recursive: true });

const client = createClient({
  url: DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

export function getDb() {
  return client;
}

export const DB_PATH = DB_URL;

export async function seedDefaultLayout() {
  const rs = await client.execute("SELECT COUNT(*) AS c FROM layouts");
  if (Number(rs.rows[0]?.c ?? 0) > 0) return;
  const act = await client.execute(
    "SELECT id_lokasi FROM cameras WHERE is_active = 1 ORDER BY id_lokasi LIMIT 9"
  );
  const cells = act.rows.map((r) => Number(r.id_lokasi));
  await client.execute({
    sql: "INSERT INTO layouts (name, cells, is_default, created_at) VALUES (?, ?, 1, ?)",
    args: ["Default", JSON.stringify(cells), Date.now()],
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
      name       TEXT NOT NULL UNIQUE,
      cells      TEXT NOT NULL DEFAULT '[]',
      is_default INTEGER DEFAULT 0,
      created_at INTEGER
    )
  `);
  await seedDefaultLayout();
}

await initDb();

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const cams = await client.execute("SELECT COUNT(*) AS c FROM cameras");
  const lays = await client.execute("SELECT id, name FROM layouts");
  console.log(`DB ready: ${DB_URL}`);
  console.log(`  cameras: ${cams.rows[0].c}`);
  console.log(`  layouts: ${lays.rows.map((l) => `#${l.id} ${l.name}`).join(", ") || "(none)"}`);
}
