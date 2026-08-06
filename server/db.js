import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = process.env.CCTV_DB || path.join(DATA_DIR, "cctv.db");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
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
);

CREATE TABLE IF NOT EXISTS layouts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  cells      TEXT NOT NULL DEFAULT '[]',
  is_default INTEGER DEFAULT 0,
  created_at INTEGER
);
`);

export function getDb() {
  return db;
}

export { DB_PATH };

export function seedDefaultLayout() {
  const n = db.prepare("SELECT COUNT(*) AS c FROM layouts").get().c;
  if (n === 0) {
    const active = db
      .prepare("SELECT id_lokasi FROM cameras WHERE is_active = 1 ORDER BY id_lokasi LIMIT 9")
      .all()
      .map((r) => r.id_lokasi);
    db.prepare(
      "INSERT INTO layouts (name, cells, is_default, created_at) VALUES (?, ?, 1, ?)"
    ).run("Default", JSON.stringify(active), Date.now());
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  seedDefaultLayout();
  const count = db.prepare("SELECT COUNT(*) AS c FROM cameras").get().c;
  const layouts = db.prepare("SELECT id, name FROM layouts").all();
  console.log(`DB ready: ${DB_PATH}`);
  console.log(`  cameras: ${count}`);
  console.log(`  layouts: ${layouts.map((l) => `#${l.id} ${l.name}`).join(", ") || "(none)"}`);
}
