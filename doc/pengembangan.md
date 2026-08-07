# Panduan Pengembangan — DMLab Watch

Panduan untuk developer yang ingin memahami arsitektur, menambah fitur, atau memodifikasi kode.

---

## Arsitektur

```
┌─────────────────┐      /api (proxy)      ┌──────────────────────────┐
│  Vite :5173     │ ─────────────────────▶ │  Express :3001           │
│  React frontend │ ◀───────────────────── │  better-sqlite3          │
└─────────────────┘        JSON           └──────────────────────────┘
                                                  │
                                          atcs.denpasarkota.go.id
                                          (scrape + stream via iframe)
```

- **Backend** (`server/`) — Express + `@libsql/client` (Turso/libSQL). Menyimpan kamera & layout, melakukan scrape, probe status stream, logging.
- **Frontend** (`src/`) — React + Vite. Render grid 3×3, modal pemilih (daftar + peta Leaflet), toolbar.
- **Database** — libSQL/Turso: lokal `file:data/cctv.db` (dev), remote `libsql://` (Vercel). Skema dibuat otomatis oleh `initDb()`.
- **Vercel** — `vercel.json` → `/api/*` ke `api/index.js` (`createApp()`), static `dist/` + SPA fallback. DB & log eksternal (Turso + stdout).

---

## Alur Data

1. **Scrape** (`server/scrape.js`) — ambil 109 kamera dari API ATCS (2 request `paginate=100`), *upsert* ke tabel `cameras`. URL HLS di-`.trim()`.
2. **Boot frontend** — `GET /api/cameras` + `GET /api/layouts`; pulihkan profil terakhir dari `localStorage`.
3. **Playback** — tiap sel membuat `<iframe src=url_proxy_hls?controls=0&muted=1&autoplay=1>` (player hls.js bawaan ATCS).
4. **Probe** — tiap 60 detik `GET /api/probe?url=` (server-side, cache 60s) → status `online`/`offline`. Jika status berubah jadi offline, sel menampilkan MAINTENANCE.
5. **Profil** — perubahan sel otomatis disimpan via `PUT /api/layouts/:id`.

---

## Struktur Kode

```
server/
  index.js            # Bootstrap Express, /api/log, /api/probe, static
  db.js               # Skema + koneksi SQLite (getDb), seed default layout
  scrape.js           # Scraper API ATCS
  probe.js            # Probe status stream + cache
  logger.js           # Logging ke data/app.log + middleware request
  routes/cameras.js   # /api/cameras (list, detail, scrape, probe)
  routes/layouts.js   # /api/layouts CRUD
src/
  App.jsx             # State utama: cameras, layouts, cells, theme, fullscreen
  components/
    Toolbar.jsx       # Header ikon + dropdown profil + tema + fullscreen
    Grid.jsx          # Grid 3×3, melewatkan status/playing ke Cell
    Cell.jsx          # Satu sel: iframe, status badge, overlay aksi
    CameraPicker.jsx  # Modal: daftar + peta
    CameraPickerMap.jsx # Peta Leaflet, marker CCTV berwarna status
  lib/
    api.js            # Helper fetch API
    useProbe.js       # Hook: probe awal + polling 60s (tanpa remount iframe)
    logger.js         # Log frontend → POST /api/log
    toast.jsx         # Notifikasi toast (5s, tombol tutup)
```

---

## Konvensi & Aturan

- **Bahasa Indonesia** untuk semua teks UI (kecuali label teknis seperti `LIVE`/`MAINTENANCE`).
- **JavaScript / JSX** — tidak ada TypeScript.
- **Tailwind CSS v4** — styling utilitas inline; tema gelap/terang memakai `dark:` variant + kelas `dark` di `<html>`.
- **Ikon** — `lucide-react`, bukan emoji (kecuali beberapa penanda status).
- **Tidak ada warna biru** di tema — palet netral abu/hitam (dark) dan terang (light).
- **`getDb()`** — akses database via `getDb()` (klien **async** `@libsql/client`). Semua rute wajib `await`; `lastInsertRowid` BigInt → `Number()` sebelum JSON/log.
- **Endpoint probe batch** — frontend memanggil `POST /api/probe {urls:[...]}` (satu invokasi serverless), bukan per-URL.

---

## Cara Menambah Fitur

### Menambah endpoint API
1. Tambah rute di `server/routes/*.js` atau `server/index.js`.
2. Catat aksi penting via `log(level, source, message, data)` di `server/logger.js`.
3. Dokumentasikan di `doc/api.md` dan `README.md`.

### Menambah komponen frontend
1. Buat komponen di `src/components/`.
2. Gunakan `dark:` variant untuk dukungan tema.
3. Gunakan ikon `lucide-react`.
4. Catat aksi user via `log()` dari `src/lib/logger.js`.

### Menambah jenis status kamera
- Ubah `STATUS_LABEL` / `STATUS_BADGE` di `src/components/Cell.jsx`.
- Sesuaikan warna marker di `CameraPickerMap.jsx` + CSS `.pin-*` di `src/index.css` bila perlu.

### Menambah field database
1. Ubah skema di `server/db.js` (tambahkan kolom).
2. Ubah mapping di `server/scrape.js`.
3. Hapus DB lokal: `data/cctv.db`, lalu jalankan ulang `npm run scrape`. Untuk Turso cloud, `npm run scrape` memakai `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`.

---

## Verifikasi

Setelah perubahan:

```bash
npm run build    # pastikan tidak ada error
npm run dev      # uji manual di http://localhost:5173
```

Periksa `data/app.log` untuk memastikan aktivitas tercatat dengan benar.

---

## Sumber Data (Referensi Cepat)

- API: `GET https://atcs.denpasarkota.go.id/api/v3/pv/ldevice`
- Header: `Content-Type: application/json`, `x-client-id`, `x-client-secret` (kredensial publik dari kode klien situs).
- Params: `page`, `paginate` (maks 100), `orderBy`, `sortedBy`, `idlok`.
- Respons: `{ success, message, data[], meta: { total, pages } }`.
- Detail lengkap di `AGENTS.md`.

---

**Digimetalab** · [digimetalab.my.id](https://digimetalab.my.id) · [digimetalab@gmail.com](mailto:digimetalab@gmail.com)
