import { getDb } from "./db.js";
import { log } from "./logger.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE =
  process.env.ATCS_API_BASE || "https://atcs.denpasarkota.go.id/api/v3/pv/ldevice";
const CLIENT_ID = process.env.ATCS_CLIENT_ID || "";
const CLIENT_SECRET = process.env.ATCS_CLIENT_SECRET || "";
// Credentials are public (from the official site's client JS) but must be
// provided via env (.env locally / Vercel dashboard) to keep committed files clean.
const HEADERS = {
  "Content-Type": "application/json",
  ...(CLIENT_ID ? { "x-client-id": CLIENT_ID } : {}),
  ...(CLIENT_SECRET ? { "x-client-secret": CLIENT_SECRET } : {}),
};

const UPSERT_SQL = `
  INSERT INTO cameras (
    id_lokasi, nama_lokasi, ket_lokasi, lat_lokasi, lon_lokasi, is_active,
    name_proxy_cam, url_proxy_hls, poster, nama_alias, nama_device, deskripsi,
    kota, provinsi, last_seen, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id_lokasi) DO UPDATE SET
    nama_lokasi = excluded.nama_lokasi,
    ket_lokasi = excluded.ket_lokasi,
    lat_lokasi = excluded.lat_lokasi,
    lon_lokasi = excluded.lon_lokasi,
    is_active = excluded.is_active,
    name_proxy_cam = excluded.name_proxy_cam,
    url_proxy_hls = excluded.url_proxy_hls,
    poster = excluded.poster,
    nama_alias = excluded.nama_alias,
    nama_device = excluded.nama_device,
    deskripsi = excluded.deskripsi,
    kota = excluded.kota,
    provinsi = excluded.provinsi,
    updated_at = excluded.updated_at
`;

async function fetchPage(page, paginate = 100) {
  const url = `${API_BASE}?page=${page}&paginate=${paginate}&orderBy=id_lokasi&sortedBy=asc`;
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`API ${res.status} for page ${page}`);
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) throw new Error(`Bad payload for page ${page}`);
  return json;
}

export async function scrape() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Kredensial ATCS belum diisi. Salin .env.example ke .env lalu isi ATCS_CLIENT_ID dan ATCS_CLIENT_SECRET (kredensial publik dari situs resmi)."
    );
  }

  let rows = [];
  const first = await fetchPage(1);
  rows = rows.concat(first.data);
  const pages = first.meta?.pages ?? 1;
  for (let p = 2; p <= pages; p++) {
    rows = rows.concat((await fetchPage(p)).data);
  }

  const d = getDb();
  const stmts = rows.map((r) => {
    const dev = r.tb_device_lokasi?.[0];
    const kota = r.tb_lokasi_kota;
    return {
      sql: UPSERT_SQL,
      args: [
        r.id_lokasi,
        r.nama_lokasi,
        r.ket_lokasi ?? "",
        r.lat_lokasi,
        r.lon_lokasi,
        r.is_active ? 1 : 0,
        dev?.name_proxy_cam ?? null,
        (dev?.url_proxy_hls ?? "").trim(),
        dev?.poster ?? "",
        dev?.nama_alias ?? null,
        dev?.nama ?? null,
        dev?.deskripsi ?? null,
        kota?.nama_kota ?? null,
        kota?.tb_kota_provinsi?.nama_provinsi ?? null,
        Date.now(),
        Date.now(),
      ],
    };
  });

  if (stmts.length) await d.batch(stmts);
  // Rows no longer returned by the API (removed cameras) are kept but flagged.
  await d.execute({
    sql: "UPDATE cameras SET is_active = 0 WHERE updated_at < ?",
    args: [Date.now() - 24 * 3600 * 1000],
  });

  const stored = Number(
    (await d.execute("SELECT COUNT(*) AS c FROM cameras")).rows[0].c
  );
  const result = { total: rows.length, stored };
  log("info", "scrape", "scrape finished", result);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  scrape()
    .then((r) => console.log(`Scrape done: ${r.total} rows from API, ${r.stored} stored.`))
    .catch((e) => {
      console.error("Scrape failed:", e.message);
      process.exit(1);
    });
}
