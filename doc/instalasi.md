# Instalasi — DML CCTV

Panduan lengkap instalasi, konfigurasi, dan menjalankan aplikasi.

---

## 1. Persyaratan

- **Node.js v20+** (direkomendasikan v22/v24)
- **npm**
- **Koneksi internet** — dibutuhkan untuk:
  - Mengambil data dari API ATCS Kota Denpasar
  - Memutar stream CCTV
  - Tile peta OpenStreetMap

---

## 2. Instalasi Dependensi

```bash
npm install
```

> **Catatan:** `better-sqlite3` memakai binary prebuilt, tidak perlu toolchain kompilasi.

---

## 3. Scrape Data Kamera (Wajib Sekali)

Mengisi database SQLite dengan 109 kamera dari API ATCS:

```bash
npm run scrape
```

Hasil: `data/cctv.db` berisi tabel `cameras` (109 baris) dan `layouts`.

> Lewati langkah ini dan aplikasi akan menampilkan grid kosong.

---

## 4. Menjalankan — Mode Pengembangan

```bash
npm run dev
```

- **Vite (frontend):** http://localhost:5173
- **Express (API):** http://localhost:3001 (Vite me-proxy `/api` ke sini)

---

## 5. Menjalankan — Mode Produksi

```bash
npm run build   # build frontend ke dist/
npm start       # Express melayani dist/ + SPA fallback
```

Buka: http://localhost:3001

---

## 6. Konfigurasi Environment

Salin `.env.example` menjadi `.env` untuk konfigurasi lokal:

```powershell
Copy-Item .env.example .env   # Windows PowerShell
```

| Variabel | Default | Fungsi |
|---|---|---|
| `PORT` | `3001` | Port server API |
| `CCTV_LOG` | `data/app.log` | Jalur file log |
| `PROBE_INTERVAL_MS` | `60000` | Interval polling status kamera |
| `ATCS_API_BASE` | `https://atcs.denpasarkota.go.id/api/v3/pv/ldevice` | Endpoint API ATCS |
| `ATCS_CLIENT_ID` | *(diisi, kredensial publik)* | Kredensial publik klien ATCS |
| `ATCS_CLIENT_SECRET` | *(diisi, kredensial publik)* | Kredensial publik klien ATCS |
| `TURSO_DATABASE_URL` | `file:data/cctv.db` | URL database libSQL/Turso |
| `TURSO_AUTH_TOKEN` | *(kosong)* | Token Turso (wajib untuk cloud) |

> `.env` bersifat lokal (gitignored). `.env.example` boleh di-commit sebagai template.
> Kredensial ATCS adalah **publik** (tertanam di kode klien situs resmi) — bukan rahasia,
> namun sengaja **tidak** di-hardcode di repo agar bersih dari secret scanner. Isi di `.env`
> sebelum `npm run scrape` (tanpa diisi, scrape menampilkan pesan error yang jelas).
> `npm run ...` otomatis memuat `.env` jika ada.

Contoh:

```bash
# Windows PowerShell
$env:PORT = "8080"
$env:CCTV_LOG = "C:\logs\cctv.log"
npm start
```

---

## 7. Deploy ke Vercel (+ Turso)

Aplikasi siap untuk **Vercel (free)** — serverless API + static frontend. Database harus **eksternal** (Turso) karena filesystem serverless bersifat read-only.

### 7.1 Buat database Turso

```bash
npm install -g @libsql/client   # atau gunakan Turso CLI
turso db create dml-cctv --location sgp   # region Singapore
turso db show dml-cctv          # dapatkan URL libsql://...
turso db tokens create dml-cctv # dapatkan token
```

Atau buat lewat dashboard [Turso](https://turso.tech). Salin `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`.

### 7.2 Isi data awal (sekali)

Setelah deploy, panggil endpoint scrapa:

```bash
curl -X POST https://<proyek>.vercel.app/api/scrape
```

`/api/scrape` akan mengisi 109 kamera ke Turso. Tombol "Perbarui Data" di aplikasi juga melakukannya.

### 7.3 Set env di Vercel

Di Vercel → Project → Settings → Environment Variables:

```
ATCS_API_BASE, ATCS_CLIENT_ID, ATCS_CLIENT_SECRET, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, PROBE_INTERVAL_MS
```

### 7.4 Custom domain (Cloudflare)

1. Cloudflare DNS `digimetalab.my.id` → tambah **CNAME** `cctv` → `<proyek>.vercel.app` (mode **DNS only**).
2. Vercel → Project → Settings → **Domains** → tambahkan `cctv.digimetalab.my.id` → verify.

### 7.5 Catatan batasan Vercel free

- **Vercel Cron tidak tersedia di free** — re-scrape otomatis terjadwal tidak bisa; gunakan tombol manual.
- **Kuota invokasi** — polling probe tiap 60 detik (batch 1 request) ≈ 43k invokasi/bulan saat dashboard selalu terbuka. Naikkan `PROBE_INTERVAL_MS` (mis. `300000`) untuk menghemat.
- **Video tidak lewat Vercel** — stream iframe dimuat langsung dari ATCS di browser; bandwidth kecil.
- **Logging** — file `data/app.log` tidak persisten; log jatuh ke stdout (terlihat di Vercel Logs).

---

## 8. Inisialisasi Database Manual

Jika perlu membuat ulang skema (tanpa scrape):

```bash
npm run db:init
```

Menghasilkan skema tabel `cameras` + `layouts` dan seed layout `Default` (kosong hingga scrape dijalankan).

---

## 9. Verifikasi Instalasi

1. Buka `http://localhost:5173`.
2. Grid 3×3 terisi kamera dan otomatis diputar.
3. Cek log: `data/app.log` berisi `server started` dan request API.
4. Cek health: `GET http://localhost:5173/api/health` → `{ "ok": true, "cameras": 109 }`.

---

## 10. Daftar Perintah

| Perintah | Fungsi |
|---|---|
| `npm install` | Install dependensi |
| `npm run scrape` | Scrape kamera dari API ATCS ke SQLite |
| `npm run dev` | Mode pengembangan (API + Vite) |
| `npm run build` | Build frontend produksi |
| `npm start` | Jalankan server produksi |
| `npm run db:init` | Buat skema database + seed |

---

**Digimetalab** · [digimetalab.my.id](https://digimetalab.my.id) · [digimetalab@gmail.com](mailto:digimetalab@gmail.com)
