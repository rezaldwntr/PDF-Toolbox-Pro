# Design System & UI/UX Specification: PDF Toolbox Pro

## 1. Executive Summary & Core UX Strategy
* **Nama Produk:** PDF Toolbox Pro
* **Arsitektur Navigasi:** *Hub & Spoke Model*
  * **Hub (Beranda):** Tata letak grid berbasis 4 kategori fungsional, bilah pencarian alat cepat, dan *universal dropzone*.
  * **Spoke (Halaman Alat):** Alur kerja mandiri 3 langkah (*Upload -> Konfigurasi -> Unduh*) yang terisolasi dan bebas distraksi.
* **Target Pengguna:** Pengguna kasual, mahasiswa, hingga pekerja kantoran yang membutuhkan manipulasi dokumen secara instan tanpa perlu membaca panduan manual.
* **Prinsip Utama UX:**
  * *Zero-Friction Entry:* Pengguna tamu (*guest*) dapat langsung memproses berkas tanpa registrasi awal.
  * *Transparent Limits:* Kuota gratis harian (3 kali/hari) dipantau secara transparan tanpa biaya tersembunyi.
  * *Server Trust & Privacy:* Penegasan eksplisit bahwa pemrosesan berkas terenkripsi dan dihapus otomatis dari server dalam 60 menit.

---

## 2. Design Tokens & Visual Identity

### 2.1 Palet Warna (Modern Blue & Pure White)
Dirancang untuk kesan kredibel, profesional, dan bersih. Memenuhi rasio kontras **WCAG AAA** untuk teks normal dan **WCAG AA** untuk elemen grafis interaktif.

| Peran | Token | HEX | Deskripsi & Implementasi |
| :--- | :--- | :--- | :--- |
| **Primary (Brand)** | `blue-600` | `#1A56DB` | Tombol CTA utama, status aktif, border dropzone saat *drag-over*. |
| **Primary Hover** | `blue-700` | `#1E429F` | Status kursor aktif (*hover*) pada tombol dan tautan utama. |
| **Primary Subtle** | `blue-50` | `#EFF6FF` | Latar belakang ikon aktif, tag kategori, sorotan kartu. |
| **Surface (Card/Modal)**| `white` | `#FFFFFF` | Latar belakang kartu alat, kontainer kerja, dialog modal. |
| **Background (App)** | `slate-50` | `#F8FAFC` | Latar belakang halaman untuk kontras lembut terhadap kartu putih. |
| **Neutral Border** | `slate-200` | `#E2E8F0` | Garis tepi (*border*) kartu aktif, pemisah tabel, field input. |
| **Text Primary** | `slate-900` | `#0F172A` | Judul kategori, nama alat, teks instruksi utama. |
| **Text Secondary** | `slate-600` | `#475569` | Label status "Proses sekarang", teks bantuan, microcopy. |
| **Text Muted** | `slate-400` | `#94A3B8` | Label status "Segera hadir", teks placeholder. |
| **Disabled Surface** | `slate-100` | `#F1F5F9` | Latar belakang kartu alat yang belum dirilis (*upcoming*). |
| **Success** | `emerald-600`| `#059669` | Indikator proses selesai, unduhan berkas siap. |
| **Warning** | `amber-500`  | `#D97706` | Peringatan sisa 1 kuota gratis, ukuran berkas mendekati batas. |
| **Destructive/Error** | `rose-600` | `#E11D48` | Gagal validasi, hapus halaman/berkas, ukuran berkas >25 MB. |

### 2.2 Tipografi
* **Font Utama:** `Plus Jakarta Sans` (Font cadangan: `Inter`, `sans-serif`).
* **Skala Tipografi:**

| Elemen | Ukuran | Weight | Line Height | Tracking |
| :--- | :--- | :--- | :--- | :--- |
| **Heading Kategori (H2)** | 22px (1.375rem)| 700 (Bold) | 1.3 | -0.01em |
| **Nama Alat (H3)** | 16px (1rem) | 600 (SemiBold) | 1.4 | 0 |
| **Label Status / Tombol** | 13px (0.8125rem)| 500 (Medium) | 1.4 | 0 |
| **Body / Paragraf** | 14px (0.875rem)| 400 (Regular) | 1.5 | 0 |
| **Badge / Microcopy** | 12px (0.75rem) | 600 (SemiBold) | 1.2 | +0.02em |

### 2.3 Spacing, Radius, & Shadow
* **Sistem Grid:** Berbasis kelipatan 4px dan 8px.
* **Radius Sudut:**
  * `rounded-md` (8px): Input field, tombol sekunder, dropdown filter.
  * `rounded-xl` (12px): Kartu alat, dropzone, modal konfirmasi.
  * `rounded-full`: Badge kuota, pill tag status.
* **Elevasi / Bayangan:**
  * Kartu Normal: `0 1px 3px 0 rgb(0 0 0 / 0.05)`
  * Kartu Hover: `0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)`
  * Dropzone Aktif: Ring pendar `0 0 0 4px rgba(26, 86, 219, 0.15)`

---

## 3. Information Architecture (Kategori & Alat)

Struktur Hub memetakan 4 kategori alat utama sesuai katalog sistem[cite: 1]:

```text
[ Homepage (Hub) ]
│
├── 1. Esensial & Populer
│    ├── PDF ke Word          [Status: Aktif - Proses sekarang]
│    ├── Gabungkan PDF        [Status: Aktif - Proses sekarang]
│    ├── Kompres PDF          [Status: Aktif - Proses sekarang]
│    └── Tanda Tangan         [Status: Aktif - Proses sekarang]
│
├── 2. Konversi PDF
│    ├── PDF ke Excel         [Status: Aktif - Proses sekarang]
│    ├── PDF ke PPT           [Status: Aktif - Proses sekarang]
│    ├── PDF ke Gambar (JPG)  [Status: Aktif - Proses sekarang]
│    └── PDF/A                [Status: Segera hadir]
│
├── 3. Edit & Organisasi
│    ├── Atur PDF             [Status: Aktif - Proses sekarang]
│    ├── Pisahkan PDF         [Status: Aktif - Proses sekarang]
│    ├── Tambah Teks          [Status: Aktif - Proses sekarang]
│    ├── Edit Teks            [Status: Segera hadir]
│    ├── Crop PDF             [Status: Segera hadir]
│    └── Watermark            [Status: Segera hadir]
│
└── 4. Keamanan & Lanjutan
     ├── OCR PDF              [Status: Segera hadir]
     ├── Proteksi PDF         [Status: Segera hadir]
     ├── Buka Kunci           [Status: Segera hadir]
     └── Terjemahkan          [Status: Segera hadir]
```

---

## 4. Pola Interaksi & Komponen Utama (UX)

### 4.1 The Universal Dropzone
Komponen utama pada setiap halaman Spoke:
* **Tinggi Area:** 280px pada desktop, 200px pada mobile.
* **Status Antarmuka:**
  1. *Idle:* Garis putus-putus (`2px dashed #CBD5E1`), latar putih `#FFFFFF`. Ikon dokumen biru dan teks: *"Pilih berkas PDF atau seret ke sini"*.
  2. *Drag-Over:* Garis solid `2px solid #1A56DB`, latar berubah ke `blue-50` (`#EFF6FF`).
  3. *Uploading:* Progress bar persentase riil, nama berkas, ukuran, dan tombol batal.
  4. *Invalid State:* Border merah `rose-600`, notifikasi: *"Format bukan .pdf"* atau *"Ukuran berkas melebihi 25 MB"*.

### 4.2 Desain Kartu Alat (Tool Card)
* **Kartu Aktif (*Proses sekarang*):**
  * Latar putih dengan border `slate-200`.
  * Ikon berwarna gelap di dalam kontainer biru muda (`blue-50`).
  * Teks aksi *"Proses sekarang"* (warna `slate-600` yang bertransisi ke `blue-600` saat di-*hover*).
  * Efek interaksi: Mengangkat 2px (*hover lift*) dengan penebalan bayangan.
* **Kartu Terkunci (*Segera hadir*):**
  * Latar `slate-100` dengan border putus-putus `slate-200`, opacity `0.75`.
  * Ikon dan teks berwarna abu-abu redup (`slate-400`).
  * Kursor bertipe `not-allowed`. Klik memicu tooltip: *"Fitur ini sedang dalam tahap pengembangan."*

### 4.3 Manajemen Kuota Tamu (Guest Quota: 3x / Hari)
* **Indikator Kuota di Header:**
  * Sisa 3 atau 2: `⚡ 3/3 Kuota Hari Ini` (warna netral/biru).
  * Sisa 1: `⚡ 1/3 Kuota Tersisa` (warna aksen oranye/amber).
* **Pemotongan Kuota:** Kuota hanya terpotong saat backend sukses menyelesaikan proses konversi dan file siap diunduh.
* **Modal Kuota Habis:** Saat kuota 0, tombol eksekusi memicu modal ringan:
  * Judul: *"Batas 3 konversi gratis tercapai hari ini"*.
  * Solusi: Satu klik tombol *"Masuk dengan Google"* untuk membuka akses tanpa batas.

### 4.4 Penjamin Keamanan & Privasi Server
Untuk menghilangkan keraguan pengguna saat mengunggah dokumen pribadi:
* Di bawah area dropzone disematkan label verifikasi:
  * `🔒 Berkas terenkripsi TLS 256-bit`
  * `⏱️ Berkas dihapus otomatis dari server dalam 60 menit`
* Pada halaman hasil akhir: Tombol opsi tambahan `[ Hapus Berkas Sekarang ]` untuk pembersihan instan tanpa menunggu 60 menit.

---

## 5. Alur Kerja UX Detail (Spoke Execution)

### Contoh Kasus: Alur "Gabungkan PDF" (`/merge-pdf`)
1. **Entry:** Pengguna mendarat pada halaman alat. Judul jelas: *"Gabungkan PDF"*.
2. **Multi-file Drop:** Pengguna menyeret minimal 2 file PDF sekaligus ke dropzone[cite: 2].
3. **Workspace Canvas:** Dropzone berganti menjadi kanvas kartu thumbnail:
   * Pengguna dapat mengubah urutan halaman via *drag-and-drop*.
   * Tombol hapus dan rotasi 90° tersedia per dokumen.
   * Tombol `+ Tambah Berkas Lain` tersedia di akhir antrean.
4. **Action Bar:** Baris aksi di bagian bawah kontainer menampilkan ringkasan (*"3 berkas • Total 4.8 MB"*) dan tombol utama `[ Gabungkan Berkas → ]`.
5. **Processing State:** Indikator animasi status bertahap: *"Mengunggah..."* -> *"Menyusun urutan..."* -> *"Memfinalisasi dokumen..."*.
6. **Download Page:** Tombol utama berukuran besar `[ Unduh PDF Gabungan ]` (warna `blue-600`) serta opsi mulai ulang `[ Proses Berkas Baru ]`.

---

## 6. Responsivitas & Aksesibilitas (A11y)
* **Breakpoints:**
  * `sm` (640px): Grid 1 kolom, penataan vertikal penuh.
  * `md` (768px): Grid 2 kolom untuk kartu alat.
  * `lg` (1024px+): Grid 4 kolom untuk tampilan desktop optimal.
* **Aksesibilitas (A11y):**
  * Dropzone dapat difokuskan dan diaktifkan melalui tombol `Space` atau `Enter`.
  * Garis fokus navigasi keyboard yang tegas (`outline: 2px solid #1A56DB; outline-offset: 2px`).
  * Seluruh tombol ikon memiliki atribut `aria-label` deskriptif.

---

## 7. Penanganan Eror & Edge Cases
* **Koneksi Terputus saat Pengunggahan:**
  * Sistem mencoba ulang otomatis 1 kali selama 5 detik. Jika gagal, muncul toast: *"Koneksi terputus. Klik di sini untuk mencoba lagi tanpa perlu memilih berkas ulang."*
* **Berkas Terkunci Sandi:**
  * Sistem mendeteksi proteksi sandi, lalu menampilkan modal input: *"Berkas ini dilindungi kata sandi. Masukkan sandi untuk melanjutkan."*
* **Berkas Korup:**
  * Notifikasi kesalahan ramah: *"Berkas tidak dapat diproses karena rusak atau format tidak didukung."*