# DML CCTV — Multi Layar 3×3 Live CCTV

<div align="center">

![Version](https://img.shields.io/badge/Version-1.0.0-0ea5e9?style=flat-square)
![Node](https://img.shields.io/badge/Node.js-20%2B-22c55e?style=flat-square&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-22c55e?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-a855f7?style=flat-square&logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/DB-libSQL__%2F__Turso-64748b?style=flat-square&logo=sqlite&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-65a30d?style=flat-square&logo=leaflet&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)

![Last Commit](https://img.shields.io/github/last-commit/digimetalab/dml-cctv?style=flat-square&color=64748b)
![Repo Size](https://img.shields.io/github/repo-size/digimetalab/dml-cctv?style=flat-square&color=64748b)
![Language](https://img.shields.io/github/languages/top/digimetalab/dml-cctv?style=flat-square&color=64748b)
![GitHub Stars](https://img.shields.io/github/stars/digimetalab/dml-cctv?style=flat-square&color=64748b)
![License](https://img.shields.io/badge/License-Privacy_Reserved-ef4444?style=flat-square)

</div>

Aplikasi pemantau CCTV **multi-layar 3×3 (landscape)** yang menampilkan kamera lalu lintas publik Kota Denpasar secara **real-time**. Data kamera di-scrape dari situs publik ATCS Kota Denpasar, disimpan dalam database SQLite, lalu ditampilkan dalam grid 3×3 yang bisa diatur sesuai kebutuhan.

> Dikembangkan oleh **[Digimetalab](https://digimetalab.my.id)** · [digimetalab@gmail.com](mailto:digimetalab@gmail.com)

## Live Demo

**https://watch.digimetalab.my.id** — deployment Vercel (free) + database Turso.

---

## Fitur

- **Multi-user** — tiap akun punya profil layout sendiri; halaman login dengan toggle tema dark/light. Akun awal: `admin-dml` / `123456` (ubah di env `ADMIN_USERNAME`/`ADMIN_PASSWORD`).
- **Grid CCTV 3×3 landscape** — sembilan layar kamera sekaligus, mengisi penuh jendela browser.
- **Pemilihan kamera per sel** — klik sel → pilih dari daftar atau dari **peta interaktif**.
- **Peta interaktif (Leaflet/OSM)** — semua kamera tampil sebagai marker CCTV, warna menandakan status:
  - 🟢 Hijau = kamera hidup (online)
  - 🔴 Merah = kamera mati / maintenance
  - 🟠 Kuning = dipakai di layar 3×3 saat ini
  - ⚪ Putih = sel yang sedang diatur
- **Autoplay** — stream langsung berjalan otomatis saat dimuat.
- **Profil Layout** — simpan, muat, ganti nama, dan hapus beberapa susunan 3×3 (mis. per simpang). Profil terakhir diingat otomatis.
- **Perbarui Data** — sinkronkan ulang kamera dari API ATCS tanpa rebuild.
- **Fullscreen** — perbesar satu kamera / layar penuh browser.
- **Tema Dark & Light** — pilihan tema tersimpan.
- **Pencarian kamera** — cari berdasarkan nama lokasi, nama kamera, atau keterangan.
- **Status live/offline** — pengecekan otomatis tiap 60 detik (probe server-side).
- **Logging** — semua aktivitas backend & frontend tercatat ke `data/app.log`.
- **Antarmuka Bahasa Indonesia** — seluruh teks UI dalam Bahasa Indonesia.

---

## Teknologi

| Layer | Teknologi |
|---|---|
| Frontend | Vite + React (JSX/JavaScript) + Tailwind CSS v4 + lucide-react |
| Peta | Leaflet + OpenStreetMap tiles |
| Backend | Express (Node.js) |
| Database | libSQL/Turso via `@libsql/client` (SQLite-compatible; lokal `file:` / cloud `libsql://`) |
| Sumber Data | API publik ATCS Kota Denpasar |

---

## Sumber Data

Data kamera diambil dari situs resmi **ATCS Kota Denpasar**:

- Situs streaming: `https://atcs.denpasarkota.go.id/streaming`
- API: `GET https://atcs.denpasarkota.go.id/api/v3/pv/ldevice`
- Total kamera: **109** (2 halaman dengan `paginate=100`)

Setiap kamera menyimpan: nama lokasi, keterangan, koordinat (`lat`/`lon`), kota/provinsi, nama proxy kamera, URL stream HLS, dan poster.

> ⚠️ **Kredit**: Data & stream adalah milik Pemerintah Kota Denpasar (ATCS). Aplikasi ini hanya menampilkan ulang data publik. Kredensial `x-client-id`/`x-client-secret` pada API adalah kredensial publik yang tertanam di kode klien situs resmi.

---

## Persyaratan

- **Node.js v20+** (direkomendasikan v22/v24)
- **npm**
- **Koneksi internet** (untuk data API ATCS, stream, dan tile peta OpenStreetMap)

---

## Instalasi & Menjalankan

```bash
# 1. Install dependencies
npm install

# 2. Siapkan konfigurasi (.env) — kredensial ATCS (lihat bagian Konfigurasi Environment)
Copy-Item .env.example .env    # lalu isi ATCS_CLIENT_ID & ATCS_CLIENT_SECRET

# 3. Scrape data CCTV dari API ATCS (wajib sekali sebelum menjalankan)
npm run scrape

# 4. Jalankan mode pengembangan (API :3001 + Vite :5173)
npm run dev
```

Buka browser ke: **http://localhost:5173**

> Lokal memakai SQLite file (`TURSO_DATABASE_URL=file:data/cctv.db`). Untuk deploy ke Vercel, set `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` dari Turso (lihat `doc/instalasi.md`).

### Mode Produksi

```bash
npm run build
npm start
```

Buka: **http://localhost:3001** (Express melayani `dist/` + SPA fallback).

---

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run scrape` | Scrape semua kamera dari API ATCS ke SQLite (109 kamera) |
| `npm run dev` | Mode pengembangan: API :3001 + Vite :5173 (proxy `/api`) |
| `npm run build` | Build frontend produksi ke `dist/` |
| `npm start` | Menjalankan server produksi (Express + `dist/`) |
| `npm run db:init` | Buat skema database + seed layout `Default` |

---

## Struktur Proyek

```
dml-cctv/
├── server/                  # Backend (Express)
│   ├── index.js             # Entrypoint API + static
│   ├── db.js                # Inisialisasi SQLite + skema + seed
│   ├── scrape.js            # Scraper data CCTV dari API ATCS
│   ├── probe.js             # Pengecekan status live/offline (cache 60s)
│   ├── logger.js            # Logging backend ke data/app.log
│   └── routes/
│       ├── cameras.js       # API kamera + search + scrape + probe
│       └── layouts.js       # API CRUD profil layout
├── src/                     # Frontend (React + Vite)
│   ├── App.jsx              # Komponen utama / state
│   ├── main.jsx             # Entrypoint React
│   ├── index.css            # Tailwind + custom styles
│   ├── components/
│   │   ├── Toolbar.jsx      # Header ikon: layout, refresh, autoplay, tema, fullscreen
│   │   ├── Grid.jsx         # Grid 3×3
│   │   ├── Cell.jsx         # Sel kamera (stream iframe, status, overlay)
│   │   ├── CameraPicker.jsx # Modal pemilih kamera (daftar + peta)
│   │   └── CameraPickerMap.jsx  # Peta Leaflet dengan marker CCTV
│   └── lib/
│       ├── api.js           # Klien API
│       ├── useProbe.js      # Hook probe status + polling 60s
│       ├── logger.js        # Logging frontend ke /api/log
│       └── toast.jsx        # Notifikasi toast (5 detik, tombol tutup)
├── data/                    # Database SQLite + log (gitignored)
│   ├── cctv.db              # Database (dibuat oleh scrape)
│   └── app.log              # Log aktivitas
├── AGENTS.md                # Panduan pengembangan untuk AI/agent
└── package.json
```

---

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [Petunjuk Penggunaan](doc/petunjuk-penggunaan.md) | Panduan memakai aplikasi (grid, profil, peta, tema, fullscreen) |
| [Instalasi](doc/instalasi.md) | Instalasi, konfigurasi, dan menjalankan |
| [Panduan API](doc/api.md) | Referensi endpoint REST API |
| [Panduan Pengembangan](doc/pengembangan.md) | Arsitektur & cara menambah fitur |
| [Pemecahan Masalah](doc/pemecahan-masalah.md) | Solusi masalah umum |

---

## API

### Cameras
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/cameras` | Daftar semua kamera (`?q=` untuk pencarian) |
| GET | `/api/cameras/:id` | Detail satu kamera |
| POST | `/api/scrape` | Sinkronkan ulang kamera dari API ATCS |
| GET | `/api/probe?url=...` | Cek status live/offline satu stream (server-side) |
| POST | `/api/probe` | Cek status batch `{ urls: [...] }` → `{ results: [...] }` |

### Layouts
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/layouts` | Daftar semua profil layout |
| POST | `/api/layouts` | Buat layout baru `{ name, cells: [9 id] }` |
| PUT | `/api/layouts/:id` | Ubah nama / cells |
| DELETE | `/api/layouts/:id` | Hapus layout |

### Lainnya
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/health` | Status server + jumlah kamera |
| POST | `/api/log` | Ingest log dari frontend |

---

## Logging

Semua aktivitas (backend + frontend) dicatat ke `data/app.log`:

```
[2026-08-06T04:31:42.261Z] [INFO] [api] server started on :3001
[2026-08-06T04:31:43.289Z] [INFO] [req] GET /api/health 200 10ms
[2026-08-06T04:31:43.537Z] [INFO] [web] layout switch to #2 "Simpang Utara"
```

- Format: `[ISO waktu] [LEVEL] [sumber] pesan {data}`
- Jalur file dapat diubah dengan env: `CCTV_LOG`

---

## Konfigurasi Environment

Salin `.env.example` → `.env` lalu ubah sesuai kebutuhan:

```powershell
Copy-Item .env.example .env   # Windows PowerShell
```

| Variabel | Default | Fungsi |
|---|---|---|
| `PORT` | `3001` | Port server API |
| `CCTV_LOG` | `data/app.log` | Jalur file log |
| `CCTV_DB` | `data/cctv.db` | Jalur database SQLite |
| `ATCS_API_BASE` | `https://atcs.denpasarkota.go.id/api/v3/pv/ldevice` | Endpoint API ATCS |
| `ATCS_CLIENT_ID` | *(diisi, kredensial publik)* | Kredensial publik klien ATCS |
| `ATCS_CLIENT_SECRET` | *(diisi, kredensial publik)* | Kredensial publik klien ATCS |
| `TURSO_DATABASE_URL` | `file:data/cctv.db` | URL database libSQL/Turso (lokal file / cloud `libsql://`) |
| `TURSO_AUTH_TOKEN` | *(kosong)* | Token Turso (wajib untuk remote/cloud) |
| `PROBE_INTERVAL_MS` | `60000` | Interval polling status kamera (naikkan untuk hemat kuota serverless) |

> `.env` gitignored; `.env.example` di-commit sebagai template. Kredensial ATCS tidak di-hardcode di repo agar bersih dari secret scanner — isi di `.env` (nilai publik tersedia di kode klien situs resmi). Tanpa diisi, `npm run scrape` menampilkan pesan error yang jelas.

---

## Catatan Teknis & Keterbatasan

- **Playback via iframe** — URL stream ATCS mengembalikan halaman player HTML (hls.js) yang mandiri. Playback **wajib** menggunakan `<iframe>` dengan `allow="autoplay"`, bukan elemen `<video>` langsung.
- **Probe tidak 100% akurat** — pengecekan online hanya melihat apakah URL merespons HTTP 200 (sama seperti situs sumber). URL yang merespons 200 dianggap "online".
- **Koneksi internet** — tile peta OpenStreetMap dan stream CCTV membutuhkan internet.
- **Database lokal** — `data/cctv.db` dibuat otomatis oleh `npm run scrape`; tidak ikut di-commit (gitignored).
- **Layar gelap sesaat** — dapat terjadi saat server stream ATCS terputus sementara; player hls.js akan reconnect otomatis (~2 detik). Gunakan tombol **Muat Ulang** pada sel untuk memaksa koneksi baru.

---

## Lisensi

Hak cipta data & stream CCTV milik Pemerintah Kota Denpasar (ATCS).

Aplikasi ini dikembangkan oleh **Digimetalab** sebagai alat bantu pemantauan dengan memanfaatkan data publik.

---

**Digimetalab** · [digimetalab.my.id](https://digimetalab.my.id) · [digimetalab@gmail.com](mailto:digimetalab@gmail.com)
