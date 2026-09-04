# Design System & UI/UX Specification: PDF Toolbox Pro

## 1. Executive Summary & Core UX Strategy
* **Nama Produk:** PDF Toolbox Pro
* **Arsitektur Navigasi:** *Hub & Spoke Model*
  * **Hub (Beranda):** Grid terstruktur berbasis 4 kategori fungsional, pencarian instan, dan *universal dropzone*.
  * **Spoke (Halaman Alat):** Alur kerja mandiri 3 langkah (*Upload -> Konfigurasi -> Unduh*) tanpa distraksi.
* **Dukungan Tema:** Sistem tema ganda (*Light Mode* & *Dark Mode*) yang otomatis mendeteksi preferensi sistem pengguna (`prefers-color-scheme`) dengan opsi toggle manual.
* **Prinsip Utama UX:**
  * *Zero-Friction Entry:* Pengguna tamu (*guest*) dapat langsung memproses berkas tanpa registrasi awal.
  * *Transparent Limits:* Kuota gratis 3 kali/hari terpantau jelas di navbar tanpa biaya tersembunyi.
  * *Server Trust & Privacy:* Penegasan eksplisit bahwa pemrosesan berkas terenkripsi dan dihapus otomatis dari server dalam 60 menit.

---

## 2. Design Tokens & Visual Identity (Light & Dark System)

### 2.1 Palet Warna Kontras Adaptif
Semua token dirancang berpasangan antara mode terang dan gelap agar memenuhi standar rasio kontras **WCAG AAA** untuk teks dan **WCAG AA** untuk elemen interaktif.

| Peran Token | Token Key | Light Mode | Dark Mode | Fungsi & Implementasi |
| :--- | :--- | :--- | :--- | :--- |
| **Brand Primary** | `primary` | `#1A56DB` (`blue-600`) | `#3B82F6` (`blue-500`) | CTA utama, link aktif, border saat *drag-over*. |
| **Brand Hover** | `primary-hover` | `#1E429F` (`blue-700`) | `#60A5FA` (`blue-400`) | Status hover tombol utama dan navigasi. |
| **Primary Subtle** | `primary-subtle`| `#EFF6FF` (`blue-50`) | `#1E293B` (`slate-800`) | Kontainer ikon aktif, tag kategori aktif. |
| **Surface Base** | `surface` | `#FFFFFF` (`white`) | `#1E222B` (`slate-900-alt`) | Background kartu alat, modal popup, canvas kerja. |
| **App Background** | `background` | `#F8FAFC` (`slate-50`) | `#0F1218` (`slate-950`) | Latar belakang canvas aplikasi halaman utama. |
| **Neutral Border** | `border` | `#E2E8F0` (`slate-200`) | `#2D3748` (`slate-700`) | Garis tepi kartu aktif, divider, field input. |
| **Text Primary** | `text-primary` | `#0F172A` (`slate-900`) | `#F8FAFC` (`slate-50`) | Judul kategori, nama alat, heading instruksi. |
| **Text Secondary** | `text-secondary`| `#475569` (`slate-600`) | `#94A3B8` (`slate-400`) | Label aksi "Proses sekarang", teks bantuan. |
| **Text Muted** | `text-muted` | `#94A3B8` (`slate-400`) | `#64748B` (`slate-500`) | Label "Segera hadir", teks placeholder. |
| **Inactive Surface**| `surface-muted`| `#F1F5F9` (`slate-100`) | `#161A22` (`slate-900-deep`)| Background kartu alat terkunci (*upcoming*). |
| **Success** | `success` | `#059669` (`emerald-600`)| `#10B981` (`emerald-500`)| Berkas selesai diproses, unduhan siap. |
| **Warning** | `warning` | `#D97706` (`amber-500`) | `#F59E0B` (`amber-400`) | Sisa 1 kuota gratis, berkas mendekati batas. |
| **Error** | `error` | `#E11D48` (`rose-600`) | `#F43F5E` (`rose-500`) | Validasi gagal, ukuran berkas >25 MB. |

### 2.2 Tipografi
* **Font Utama:** `Plus Jakarta Sans` (Fallback: `Inter`, `sans-serif`).
* **Skala Tipografi:**

| Elemen | Ukuran | Weight | Line Height | Tracking |
| :--- | :--- | :--- | :--- | :--- |
| **Heading Kategori (H2)** | 22px (1.375rem)| 700 (Bold) | 1.3 | -0.01em |
| **Nama Alat (H3)** | 16px (1rem) | 600 (SemiBold) | 1.4 | 0 |
| **Label Aksi / Tombol** | 13px (0.8125rem)| 500 (Medium) | 1.4 | 0 |
| **Body / Paragraf** | 14px (0.875rem)| 400 (Regular) | 1.5 | 0 |
| **Badge / Microcopy** | 12px (0.75rem) | 600 (SemiBold) | 1.2 | +0.02em |

### 2.3 Spacing, Radius, & Shadow
* **Grid Base:** Kelipatan 4px dan 8px.
* **Radius Sudut:**
  * `rounded-md` (8px): Input fields, dropdown, tombol sekunder.
  * `rounded-xl` (12px): Kartu alat, dropzone, modal dialog.
  * `rounded-full`: Badge kuota, pill tag status, switcher tema.
* **Elevasi / Bayangan:**
  * *Light Mode:*
    * Idle: `0 1px 3px 0 rgb(0 0 0 / 0.05)`
    * Hover: `0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)`
  * *Dark Mode:*
    * Idle: Tanpa bayangan drop shadow luar, menggunakan subtle border `#2D3748`.
    * Hover: `0 8px 24px -4px rgba(0, 0, 0, 0.45)`, border pendar `rgba(59, 130, 246, 0.3)`.

---

## 3. Information Architecture (Kategori & Alat)

Struktur katalog alat terbagi ke dalam 4 kelompok utama[cite: 1]:

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

### 4.1 The Universal Dropzone (Adaptif Light/Dark)
* **Tinggi Area:** 280px pada desktop, 200px pada mobile.
* **Perilaku Status:**
  * **Idle:**
    * *Light:* Garis putus-putus `2px dashed #CBD5E1`, latar `#FFFFFF`.
    * *Dark:* Garis putus-putus `2px dashed #334155`, latar `#1E222B`. Ikon biru muda `text-blue-400`.
  * **Drag-Over:**
    * *Light:* Garis solid `2px solid #1A56DB`, latar `#EFF6FF`.
    * *Dark:* Garis solid `2px solid #3B82F6`, latar `rgba(59, 130, 246, 0.1)`.
  * **Uploading:** Progress bar aktif dengan transisi persentase riil.
  * **Invalid:** Border merah (`rose-600` di light, `rose-500` di dark), teks penjelasan galat.

### 4.2 Desain Kartu Alat (Tool Card)
* **Kartu Aktif (*Proses sekarang*):**
  * *Light:* Latar `#FFFFFF`, border `#E2E8F0`. Teks aksi `slate-600` berubah ke `blue-600` saat hover.
  * *Dark:* Latar `#1E222B`, border `#2D3748`. Teks aksi `slate-400` berubah ke `blue-400` saat hover.
  * Efek: *Hover lift* setinggi -2px disertai penguatan garis tepi.
* **Kartu Terkunci (*Segera hadir*):**
  * *Light:* Latar `#F1F5F9`, border putus-putus `#CBD5E1`, opacity `0.75`.
  * *Dark:* Latar `#161A22`, border putus-putus `#1E293B`, opacity `0.6`.
  * Kursor bertipe `not-allowed`. Klik memicu popover: *"Fitur ini sedang dalam tahap pengembangan."*

### 4.3 Manajemen Kuota Tamu (Guest Quota: 3x / Hari)
* **Indikator Navbar:**
  * *Light:* Badge kapsul warna latar `#EFF6FF`, border `#DBEAFE`, teks `blue-700`.
  * *Dark:* Badge kapsul warna latar `#1E293B`, border `#334155`, teks `blue-400`.
* **Pemotongan Kuota:** Hanya terpotong saat backend sukses mengirim berkas hasil konversi (bukan saat awal upload).
* **Modal Kuota Habis:** Saat kuota = 0, tombol eksekusi memunculkan modal:
  * Judul: *"Batas 3 konversi gratis tercapai hari ini"*.
  * Opsi Solusi: Tombol cepat *"Masuk dengan Google"* untuk membuka batas harian.

### 4.4 Penjamin Privasi Server
* Di bawah area dropzone terdapat mikro-badge permanen:
  * `🔒 Berkas terenkripsi TLS 256-bit`
  * `⏱️ Berkas otomatis dihapus dari server dalam 60 menit`
* Pada halaman selesai: Tombol `[ Hapus Berkas Sekarang ]` untuk penghapusan seketika.

---

## 5. Alur Kerja UX Detail (Spoke Execution)

### Contoh Kasus: Alur "Gabungkan PDF" (`/merge-pdf`)
1. **Pendaratan:** Pengguna membuka halaman alat. Judul to-the-point: *"Gabungkan PDF"*.
2. **Unggah Multiberkas:** Pengguna menyeret minimal dua berkas PDF ke dropzone[cite: 2].
3. **Workspace Canvas:** Dropzone berganti menjadi thumbnail berkas interaktif:
   * *Drag-and-drop* untuk menukar urutan dokumen secara bebas.
   * Tombol individual untuk rotasi lembar dokumen (90°) dan hapus berkas.
   * Tombol `+ Tambah Berkas Lain` tersedia di akhir grid.
4. **Action Bar:** Baris ringkasan di bawah kontainer (*"3 berkas • Total 4.8 MB"*) dengan tombol eksekusi utama `[ Gabungkan Berkas → ]`.
5. **Status Pemrosesan:** Animasi progres bertahap: *"Mengunggah..."* -> *"Menyusun urutan..."* -> *"Memfinalisasi dokumen..."*.
6. **Halaman Hasil:** Tombol kontras tinggi `[ Unduh PDF Gabungan ]` dan tombol sekunder `[ Proses Berkas Baru ]`.

---

## 6. Responsivitas, Aksesibilitas (A11y), & Theme Switcher

### 6.1 Implementasi Pengalihan Tema (Theme Switching)
* **Tombol Pengalih (Toggle):** Ikon Matahari/Bulan di sisi kanan header.
* **Penyimpanan Status:** Preferensi tema disimpan di `localStorage` dengan key `theme: 'light' | 'dark' | 'system'`.
* **Pencegahan Flash (FOUC):** Script pemuatan kelas `dark` disematkan langsung di blok `<head>` sebelum konten DOM selesai dirender.

### 6.2 Responsivitas & Aksesibilitas
* **Breakpoints:**
  * `sm` (640px): Tampilan kartu 1 kolom, penataan tombol vertikal penuh.
  * `md` (768px): Tampilan kartu 2 kolom.
  * `lg` (1024px+): Tampilan kartu 4 kolom penuh.
* **Aksesibilitas (A11y):**
  * Dropzone mendukung pemicuan keyboard melalui tombol `Space` atau `Enter`.
  * Fokus navigasi keyboard kontras tinggi:
    * *Light:* `outline: 2px solid #1A56DB; outline-offset: 2px`
    * *Dark:* `outline: 2px solid #3B82F6; outline-offset: 2px`
  * Atribut `aria-label` wajib pada semua elemen tombol berbasis ikon.

---

## 7. Penanganan Eror & Edge Cases
* **Koneksi Terputus saat Pengunggahan:**
  * Percobaan ulang otomatis 1 kali selama 5 detik. Jika tetap terputus, tampilkan toast: *"Koneksi terputus. Klik untuk mencoba lagi tanpa perlu memilih berkas ulang."*
* **Berkas Terproteksi Sandi:**
  * Deteksi enkripsi otomatis memunculkan form input: *"Berkas ini dilindungi kata sandi. Masukkan sandi untuk melanjutkan."*
* **Berkas Rusak / Korup:**
  * Tampilan pesan ramah: *"Berkas tidak dapat diproses karena rusak atau format tidak didukung."*