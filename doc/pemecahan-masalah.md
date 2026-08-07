# Pemecahan Masalah — DMLab Watch

Kumpulan solusi untuk masalah umum pada aplikasi **DMLab Watch**.

---

## 1. Halaman Kosong / "Gagal memuat data CCTV"

**Gejala:** Muncul layar peringatan "Gagal memuat data CCTV" atau grid kosong.

**Penyebab & Solusi:**

1. **Database belum terisi** — pastikan sudah menjalankan:
   ```bash
   npm run scrape
   ```
   Hasil harus: `Scrape done: 109 rows from API, 109 stored.`

2. **Server API tidak berjalan** — pastikan `npm run dev` aktif dan API respons:
   - Buka `http://localhost:5173/api/health` → harus `{ "ok": true, "cameras": 109 }`.

3. **Koneksi internet terputus / ATCS sedang down** — data diambil dari `atcs.denpasarkota.go.id`. Periksa koneksi dan coba lagi.

4. **DB rusak / kosong** — hapus dan buat ulang:
   ```bash
   Remove-Item data\cctv.db   # Windows PowerShell
   npm run scrape
   ```

---

## 2. Layar Kamera Gelap (Padahal Kamera Bekerja)

**Penyebab:** Server stream ATCS terputus sesaat; player hls.js otomatis reconnect (~2 detik). Ini bukan bug aplikasi.

**Solusi:**
- Tunggu beberapa detik — biasanya kembali sendiri.
- Arahkan kursor ke sel → klik **Muat Ulang** untuk memaksa koneksi baru.
- Jika semua sel gelap, periksa koneksi internet (stream membutuhkan internet).

> Probe hanya mengecek HTTP 200, bukan kualitas video. Kamera yang "online" tetap bisa tampil gelap sesaat saat sumbernya putus.

---

## 3. Playback Tidak Berjalan Otomatis

**Penyebab:** Browser memblokir autoplay, atau Autoplay sedang mati.

**Solusi:**
- Klik ikon **Autoplay** di header — pastikan aktif (berwarna).
- Klik tombol **Play** pada sel jika Autoplay mati.
- Pada beberapa browser, autoplay baru berjalan setelah ada interaksi pertama dengan halaman.

---

## 4. Peta Tidak Tampil / Tile Putih

**Penyebab:** Tile peta OpenStreetMap butuh koneksi internet.

**Solusi:**
- Pastikan terhubung internet.
- Tunggu beberapa detik saat tile dimuat.
- Jika tetap kosong, gunakan tab **Daftar** (pencarian) — tetap berfungsi tanpa peta.

---

## 5. Perubahan Sel / Profil Tidak Tersimpan

**Penyebab:** Gagal menulis ke server (API mati) atau nama profil duplikat.

**Solusi:**
- Pastikan API berjalan (`/api/health` ok).
- Nama profil harus unik — muncul toast "Gagal" jika duplikat.
- Profil terakhir disimpan di `localStorage` browser + `layouts` di SQLite.

---

## 6. "Port sudah dipakai" saat `npm run dev`

**Penyebab:** Server lama masih berjalan.

**Solusi (Windows):**
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```
Lalu jalankan lagi `npm run dev`.

---

## 7. `npm run scrape` Gagal

**Gejala:** `Scrape failed: ...`

**Solusi:**
- Periksa koneksi internet.
- Pastikan API ATCS dapat diakses. Jika server ATCS sedang down, tunggu dan coba lagi.
- Baca pesan error lengkap untuk penyebab spesifik.

---

## 8. Log Tidak Tercatat

**Penyebab:** Folder `data/` tidak dapat ditulis atau `CCTV_LOG` salah.

**Solusi:**
- Pastikan folder `data/` ada dan dapat ditulis.
- Jangan mengarahkan `CCTV_LOG` ke folder yang tidak ada.
- File log default: `data/app.log`.

---

## 9. Aplikasi Terasa Berat Saat Fullscreen

**Solusi:** Sudah diperbaiki — sel grid dihentikan sementara selama fullscreen. Pastikan versi terbaru (`Ctrl+F5` untuk muat ulang tanpa cache).

---

## 10. Masih Bermasalah?

- Periksa log: `data/app.log` untuk jejak aktivitas & error.
- Hubungi pengembang:

**Digimetalab** · [digimetalab.my.id](https://digimetalab.my.id) · [digimetalab@gmail.com](mailto:digimetalab@gmail.com)
