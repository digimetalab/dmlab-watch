import { getDb } from "./db.js";
import { log } from "./logger.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE =
  process.env.ATCS_API_BASE || "https://atcs.denpasarkota.go.id/api/v3/pv/ldevice";
// Public credentials from the official site's client JS (see README). Overridable via .env.
const HEADERS = {
  "Content-Type": "application/json",
  "x-client-id":
    process.env.ATCS_CLIENT_ID || "a194e6ae-d4dd-4b62-a0ac-388922f09303",
  "x-client-secret":
    process.env.ATCS_CLIENT_SECRET ||
    "f430fde38a031fb657a2a7d6f84644a9aed767a4c22314d4b7c565648acc2396",
};

async function fetchPage(page, paginate = 100) {
  const url = `${API_BASE}?page=${page}&paginate=${paginate}&orderBy=id_lokasi&sortedBy=asc`;
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`API ${res.status} for page ${page}`);
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) throw new Error(`Bad payload for page ${page}`);
  return json;
}

export async function scrape() {
  let rows = [];
  const first = await fetchPage(1);
  rows = rows.concat(first.data);
  const pages = first.meta?.pages ?? 1;
  for (let p = 2; p <= pages; p++) {
    const page = await fetchPage(p);
    rows = rows.concat(page.data);
  }
  const d = getDb();
  const upsert = d.prepare(`
    INSERT INTO cameras (
      id_lokasi, nama_lokasi, ket_lokasi, lat_lokasi, lon_lokasi, is_active,
      name_proxy_cam, url_proxy_hls, poster, nama_alias, nama_device, deskripsi,
      kota, provinsi, last_seen, updated_at
    ) VALUES (
      @id_lokasi, @nama_lokasi, @ket_lokasi, @lat_lokasi, @lon_lokasi, @is_active,
      @name_proxy_cam, @url_proxy_hls, @poster, @nama_alias, @nama_device, @deskripsi,
      @kota, @provinsi, @last_seen, @updated_at
    )
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
  `);

  const tx = d.transaction((list) => {
    for (const r of list) {
      const dev = r.tb_device_lokasi?.[0];
      const kota = r.tb_lokasi_kota;
      upsert.run({
        id_lokasi: r.id_lokasi,
        nama_lokasi: r.nama_lokasi,
        ket_lokasi: r.ket_lokasi ?? "",
        lat_lokasi: r.lat_lokasi,
        lon_lokasi: r.lon_lokasi,
        is_active: r.is_active ? 1 : 0,
        name_proxy_cam: dev?.name_proxy_cam ?? null,
        url_proxy_hls: (dev?.url_proxy_hls ?? "").trim(),
        poster: dev?.poster ?? "",
        nama_alias: dev?.nama_alias ?? null,
        nama_device: dev?.nama ?? null,
        deskripsi: dev?.deskripsi ?? null,
        kota: kota?.nama_kota ?? null,
        provinsi: kota?.tb_kota_provinsi?.nama_provinsi ?? null,
        last_seen: Date.now(),
        updated_at: Date.now(),
      });
    }
  });
  tx(rows);

  // Rows no longer returned by the API (removed cameras) are kept but flagged.
  d.prepare("UPDATE cameras SET is_active = 0 WHERE updated_at < ?").run(
    Date.now() - 24 * 3600 * 1000
  );

  const result = {
    total: rows.length,
    stored: d.prepare("SELECT COUNT(*) AS c FROM cameras").get().c,
  };
  log("info", "scrape", `scrape finished`, result);
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
