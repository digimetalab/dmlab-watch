import { Router } from "express";
import { getDb } from "../db.js";
import { scrape } from "../scrape.js";
import { probeStream } from "../probe.js";

const router = Router();

const PUBLIC_FIELDS = `id_lokasi, nama_lokasi, ket_lokasi, lat_lokasi, lon_lokasi, is_active,
  name_proxy_cam, url_proxy_hls, poster, nama_alias, nama_device, deskripsi, kota, provinsi, last_seen`;

function toCam(row) {
  return {
    id: row.id_lokasi,
    nama_lokasi: row.nama_lokasi,
    ket_lokasi: row.ket_lokasi,
    lat: row.lat_lokasi,
    lon: row.lon_lokasi,
    is_active: !!row.is_active,
    name_proxy_cam: row.name_proxy_cam,
    url_proxy_hls: row.url_proxy_hls,
    poster: row.poster,
    nama_alias: row.nama_alias,
    nama_device: row.nama_device,
    deskripsi: row.deskripsi,
    kota: row.kota,
    provinsi: row.provinsi,
    last_seen: row.last_seen,
    // Derived convenience fields (poster is served under a fixed base path)
    poster_url: row.poster ? `https://atcs.denpasarkota.go.id/poster/${row.poster}` : null,
  };
}

// GET /api/cameras?q=...  (search nama_lokasi / nama_alias / ket_lokasi)
router.get("/", (req, res) => {
  const q = (req.query.q ?? "").toString().trim().toLowerCase();
  const d = getDb();
  let rows;
  if (q) {
    const like = `%${q.replace(/[%_]/g, (c) => "\\" + c)}%`;
    rows = d
      .prepare(
        `SELECT ${PUBLIC_FIELDS} FROM cameras
         WHERE (LOWER(nama_lokasi) LIKE ? ESCAPE '\\' OR LOWER(nama_alias) LIKE ? ESCAPE '\\' OR LOWER(ket_lokasi) LIKE ? ESCAPE '\\')
         ORDER BY id_lokasi`
      )
      .all(like, like, like);
  } else {
    rows = d.prepare(`SELECT ${PUBLIC_FIELDS} FROM cameras ORDER BY id_lokasi`).all();
  }
  res.json({ total: rows.length, data: rows.map(toCam) });
});

// GET /api/cameras/:id
router.get("/:id", (req, res) => {
  const row = getDb()
    .prepare(`SELECT ${PUBLIC_FIELDS} FROM cameras WHERE id_lokasi = ?`)
    .get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "not found" });
  res.json(toCam(row));
});

// POST /api/scrape  — refresh camera DB from ATCS API
router.post("/scrape", async (req, res) => {
  try {
    const r = await scrape();
    res.json(r);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// GET /api/probe?url=... — server-side online check (avoids browser CORS)
router.get("/probe", async (req, res) => {
  const url = (req.query.url ?? "").toString().trim();
  if (!/^https:\/\/atcs\.denpasarkota\.go\.id\/stream\//.test(url)) {
    return res.status(400).json({ error: "invalid stream url" });
  }
  const status = await probeStream(url);
  res.json({ url, status });
});

export default router;
