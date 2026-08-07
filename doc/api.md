# Panduan API — DMLab Watch

Referensi endpoint REST API yang disediakan server Express (default `:3001`).

- Format respons: JSON.
- Semua rute API diawali `/api`.

---

## Cameras

### Daftar Kamera

`GET /api/cameras`

Opsional: `?q=<kata kunci>` untuk pencarian (nama lokasi / nama kamera / keterangan).

```bash
curl "http://localhost:3001/api/cameras"
curl "http://localhost:3001/api/cameras?q=gunung"
```

Respons:

```json
{
  "total": 109,
  "data": [
    {
      "id": 1,
      "nama_lokasi": "GUNUNG AGUNG",
      "ket_lokasi": "Simpang Wahidin - Gunung Agung",
      "lat": -8.654504,
      "lon": 115.208528,
      "is_active": true,
      "name_proxy_cam": "A001GUNUNGAGUNGPTZ",
      "url_proxy_hls": "https://atcs.denpasarkota.go.id/stream/A001GUNUNGAGUNGPTZ/",
      "poster": "",
      "poster_url": null,
      "nama_alias": "SIMPANG GUNUNG AGUNG",
      "nama_device": "GUNUNG AGUNG",
      "deskripsi": "KAMERA PTZ SIMPANG GUNUNG AGUNG",
      "kota": "KOTA DENPASAR",
      "provinsi": "BALI",
      "last_seen": 1754...
    }
  ]
}
```

> **Keamanan:** field RTSP internal (`url_video`) tidak pernah dikembalikan oleh API.

### Detail Kamera

`GET /api/cameras/:id`

```bash
curl "http://localhost:3001/api/cameras/1"
```

### Sinkronkan Ulang Data

`POST /api/scrape`

Memanggil ulang API ATCS dan meng-*upsert* semua kamera ke SQLite.

```bash
curl -X POST "http://localhost:3001/api/scrape"
```

Respons: `{ "total": 109, "stored": 109 }`

### Cek Status Stream

`GET /api/probe?url=<stream_url>`

Pengecekan online/offline secara **server-side** (menghindari CORS browser). URL harus berasal dari `atcs.denpasarkota.go.id/stream/`.

```bash
curl "http://localhost:3001/api/probe?url=https%3A%2F%2Fatcs.denpasarkota.go.id%2Fstream%2FA001GUNUNGAGUNGPTZ%2F"
```

Respons: `{ "url": "...", "status": "online" | "offline" }`

> Probe: `Range: bytes=0-1000`, timeout 8 detik, retry tanpa Range, cache 60 detik. Setiap HTTP 200 dianggap "online" (sama dengan perilaku situs sumber).

---

## Layouts

Layout = susunan 9 sel (`id_lokasi` atau `null`), disimpan sebagai JSON.

### Daftar Layout

`GET /api/layouts`

```json
{
  "data": [
    { "id": 1, "name": "Default", "cells": [1, 2, 3, 4, 5, 6, 7, 8, 9], "is_default": true }
  ]
}
```

### Buat Layout

`POST /api/layouts`

```json
{ "name": "Simpang Utara", "cells": [1, 2, 3, 4, 5, 6, 7, 8, 9] }
```

- `name` wajib, unik. `cells` harus array 9 elemen.
- Status 409 jika nama sudah ada.

### Ubah Layout

`PUT /api/layouts/:id`

```json
{ "name": "Nama Baru" }                // hanya nama
{ "cells": [9, 8, 7, 6, 5, 4, 3, 2, 1] } // hanya cells
```

### Hapus Layout

`DELETE /api/layouts/:id`

Respons: `{ "ok": true }`

---

## Utilitas

### Health Check

`GET /api/health`

```json
{
  "ok": true,
  "db": "D:\\...\\data\\cctv.db",
  "cameras": 109,
  "log": "D:\\...\\data\\app.log"
}
```

### Log Frontend

`POST /api/log`

Digunakan frontend untuk menulis log ke `data/app.log` (sumber `web`).

```json
{ "level": "info", "source": "web", "message": "layout switch", "data": {} }
```

- `level`: `info` | `warn` | `error`
- `source`: dibatasi 40 karakter
- `message`: dibatasi 1000 karakter

---

**Digimetalab** · [digimetalab.my.id](https://digimetalab.my.id) · [digimetalab@gmail.com](mailto:digimetalab@gmail.com)
