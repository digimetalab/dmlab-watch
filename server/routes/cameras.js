import { Router } from "express";
import { getDb } from "../db.js";

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
    poster_url: row.poster ? `https://atcs.denpasarkota.go.id/poster/${row.poster}` : null,
  };
}

// GET /api/cameras?q=...  (search nama_lokasi / nama_alias / ket_lokasi)
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q ?? "").toString().trim().toLowerCase();
    const d = getDb();
    let rs;
    if (q) {
      const like = `%${q.replace(/[%_]/g, (c) => "\\" + c)}%`;
      rs = await d.execute({
        sql: `SELECT ${PUBLIC_FIELDS} FROM cameras
              WHERE (LOWER(nama_lokasi) LIKE ? ESCAPE '\\' OR LOWER(nama_alias) LIKE ? ESCAPE '\\' OR LOWER(ket_lokasi) LIKE ? ESCAPE '\\')
              ORDER BY id_lokasi`,
        args: [like, like, like],
      });
    } else {
      rs = await d.execute(`SELECT ${PUBLIC_FIELDS} FROM cameras ORDER BY id_lokasi`);
    }
    res.json({ total: rs.rows.length, data: rs.rows.map(toCam) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/cameras/:id
router.get("/:id", async (req, res) => {
  try {
    const rs = await getDb().execute({
      sql: `SELECT ${PUBLIC_FIELDS} FROM cameras WHERE id_lokasi = ?`,
      args: [Number(req.params.id)],
    });
    const row = rs.rows[0];
    if (!row) return res.status(404).json({ error: "not found" });
    res.json(toCam(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
