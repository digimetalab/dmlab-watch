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

| Variabel | Default | Fungsi |
|---|---|---|
| `PORT` | `3001` | Port server API |
| `CCTV_LOG` | `data/app.log` | Jalur file log |
| `CCTV_DB` | `data/cctv.db` | Jalur database SQLite |

Contoh:

```bash
# Windows PowerShell
$env:PORT = "8080"
$env:CCTV_LOG = "C:\logs\cctv.log"
npm start
```

---

## 7. Inisialisasi Database Manual

Jika perlu membuat ulang skema (tanpa scrape):

```bash
npm run db:init
```

Menghasilkan skema tabel `cameras` + `layouts` dan seed layout `Default` (kosong hingga scrape dijalankan).

---

## 8. Verifikasi Instalasi

1. Buka `http://localhost:5173`.
2. Grid 3×3 terisi kamera dan otomatis diputar.
3. Cek log: `data/app.log` berisi `server started` dan request API.
4. Cek health: `GET http://localhost:5173/api/health` → `{ "ok": true, "cameras": 109 }`.

---

## 9. Daftar Perintah

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
