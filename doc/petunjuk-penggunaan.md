# Petunjuk Penggunaan — DML CCTV

Panduan penggunaan aplikasi **DML CCTV** (multi-layar 3×3 live CCTV).

---

## 1. Membuka Aplikasi

Setelah server berjalan (lihat [Instalasi](instalasi.md)), buka:

- **Mode pengembangan:** `http://localhost:5173`
- **Mode produksi:** `http://localhost:3001`

Aplikasi otomatis menampilkan grid 3×3 berisi 9 kamera pertama yang aktif dan langsung **memutar otomatis** (jika fitur Autoplay aktif).

---

## 2. Header (Toolbar)

Header hanya berisi **ikon** — arahkan kursor untuk melihat keterangan menu.

| Ikon | Menu | Fungsi |
|---|---|---|
| 🗂 (Grid) | **Profil Layout** | Buka sub-menu profil |
| ⟳ | **Perbarui Data** | Sinkronkan ulang daftar kamera dari API ATCS |
| ⏸ / ▶ | **Autoplay** | Nyalakan/matikan pemutaran otomatis |
| ☀️ / 🌙 | **Tema** | Ganti mode terang / gelap |
| ⛶ | **Layar Penuh** | Perbesar seluruh aplikasi ke layar penuh browser |

### Sub-menu Profil Layout
Klik ikon Grid untuk membuka:
- Daftar semua profil (yang aktif ditandai ✓) — klik untuk berpindah profil.
- **Profil Baru** — menyimpan susunan 9 kamera saat ini sebagai profil baru (diberi nama).
- **Ganti Nama** — mengubah nama profil yang aktif.
- **Hapus Profil** — menghapus profil aktif (tidak bisa menghapus profil terakhir).

> Profil terakhir yang dibuka otomatis diingat dan dipulihkan saat halaman dimuat ulang.

---

## 3. Grid 3×3

- **9 sel** kamera mengisi seluruh area layar.
- Status ditandai di pojok kiri-atas tiap sel:
  - `CHECKING` (abu) — sedang memeriksa status.
  - `READY` (hijau) — kamera online, siap diputar.
  - `LIVE` (merah) — kamera sedang diputar.
  - `MAINTENANCE` (kuning) — kamera tidak dapat diakses.
- Nama kamera tampil di kiri-bawah sel, nomor sel di kanan-bawah.

### Mengubah kamera
1. **Klik sel** → terbuka modal **Pilih Kamera**.
2. Pilih dari **Daftar** (kiri) atau **Peta** (kanan):
   - **Daftar:** gunakan kolom pencarian, lalu klik kamera yang diinginkan.
   - **Peta:** klik marker CCTV pada peta. Warna marker:
     - 🟢 Hijau = kamera hidup
     - 🔴 Merah = kamera mati / maintenance
     - 🟠 Kuning = dipakai di layar 3×3 saat ini
     - ⚪ Putih = sel yang sedang diatur
3. Kamera langsung ditampilkan di sel dan otomatis diputar (jika Autoplay aktif).

### Tombol saat hover sel
Arahkan kursor ke sel untuk menampilkan aksi:
- **Ganti** — membuka pemilih kamera.
- **Muat Ulang** — memaksa sambungan baru ke stream (berguna saat sel gelap lama).
- **Perbesar** — membuka satu kamera dalam tampilan penuh.

---

## 4. Layar Penuh Satu Kamera

Klik **Perbesar** pada sel → kamera tampil satu layar penuh.

- Sel-sel lain **dihentikan sementara** agar ringan dan cepat.
- Klik **✕ Close** atau klik area gelap di luar untuk menutup.

---

## 5. Mengganti Tema

Klik ikon ☀️/🌙 di header. Pilihan tema tersimpan otomatis dan berlaku untuk seluruh aplikasi (header, grid, modal, toast).

---

## 6. Perbarui Data Kamera

Klik ikon ⟳ untuk menyinkronkan ulang daftar kamera dari API ATCS (misalnya setelah ada kamera baru). Selesai akan muncul notifikasi toast.

---

## 7. Notifikasi (Toast)

Pesan sistem muncul sebagai **toast** di pojok kanan-bawah:
- Otomatis hilang setelah **5 detik**.
- Bisa ditutup manual dengan tombol **✕**.
- Warna menandakan jenis: hijau (sukses), merah (gagal), netral (info).

---

**Digimetalab** · [digimetalab.my.id](https://digimetalab.my.id) · [digimetalab@gmail.com](mailto:digimetalab@gmail.com)
