# 📘 Dokumentasi Resmi & Panduan Pengembangan: PDF Toolbox Pro

Dokumen ini merupakan panduan arsitektur, standar kode, dan acuan teknis utama untuk pengembangan dan pemeliharaan website **PDF Toolbox Pro** ke depannya. Seluruh struktur direktori, konvensi penamaan, dan implementasi kode telah diselaraskan dengan standar internasional industri (*enterprise-grade*).

---

## 1. Ikhtisar Proyek & Arsitektur Sistem

PDF Toolbox Pro dirancang menggunakan pola arsitektur **Hub & Spoke Model**:
* **Hub (Beranda):** Menyajikan identitas visual, *Universal Dropzone*, bilah pencarian alat cepat, dan grid 4 kategori alat utama.
* **Spoke (Halaman Alat):** Setiap alat memiliki alur mandiri 3 langkah (*1. Unggah → 2. Konfigurasi → 3. Unduh*) yang terisolasi, bebas distraksi, dan terproteksi.
* **Backend Processing:** Operasi penggabungan, konversi, pemotongan, dan kompresi dieksekusi secara ultra-cepat di server Python (FastAPI + PyMuPDF C/C++ engine) menggunakan arsitektur **Zero Disk I/O In-Memory Streaming** (standar iLovePDF/Smallpdf) dengan optimasi `deflate=True` dan `garbage=3` serta pustaka *pdf2docx* dan *python-pptx*.
* **Client-side Processing:** Operasi pengeditan visual instan (seperti penambahan teks, tanda tangan digital, dan penataan ulang lembar halaman) dijalankan secara lokal di browser pengguna menggunakan pustaka *pdf-lib* untuk kecepatan optimal tanpa latensi jaringan.

---

## 2. Struktur Direktori Proyek (Enterprise Standard)

```text
PDF Toolbox Pro/
├── .gitignore                      # Konfigurasi file terabaikan git (rahasia, dependensi, OS)
├── dokumentasi.md                  # Acuan resmi arsitektur & panduan pengembangan sistem
├── new_design.md                   # Spesifikasi desain sistem UI/UX (Hub & Spoke, Light/Dark)
├── prd.md                          # Product Requirement Document
│
├── backend/                        # Layanan REST API Python (FastAPI)
│   ├── .dockerignore
│   ├── Dockerfile                  # Konfigurasi container Docker production
│   ├── README.md                   # Petunjuk setup backend lokal & VPS
│   ├── devserver.sh                # Skrip peluncuran server pengembangan
│   ├── requirements.txt            # Dependensi Python terpilih
│   └── app/
│       ├── __init__.py
│       ├── main.py                 # Titik masuk FastAPI, CORS middleware, & routing utama
│       ├── core/
│       │   └── config.py           # Konfigurasi konstanta global (ukuran file, limit)
│       ├── routers/
│       │   ├── convert.py          # Endpoint konversi PDF (Word, Excel, PPT, JPG/ZIP)
│       │   └── tools.py            # Endpoint manipulasi (Merge, Split, Compress)
│       └── utils/
│           └── file_utils.py       # Helper validasi berkas dan pembersihan direktori temp
│
└── frontend/                       # Aplikasi Web SPA (React 19 + TypeScript + Tailwind CSS)
    ├── .npmrc                      # Konfigurasi npm legacy peer deps untuk kestabilan build
    ├── index.html                  # HTML entrypoint, CDN worker, token font & skrip FOUC
    ├── index.tsx                   # React root bootstrap
    ├── App.tsx                     # Router utama Hub & Spoke dan State Manager
    ├── types.ts                    # Definisi Enum View & TypeScript interfaces
    ├── package.json                # Dependensi frontend & script Vite
    ├── manifest.json               # Konfigurasi PWA / Web App Manifest
    │
    ├── components/
    │   ├── Header.tsx              # Sticky navbar, Logo brand, Kuota tamu, Theme toggle
    │   ├── Footer.tsx              # Footer, Trust badges keamanan, Tautan navigasi
    │   ├── LandingPage.tsx         # Halaman Hub (Hero, Search, Universal Dropzone, 4 Kategori)
    │   ├── ToolCard.tsx            # Komponen kartu alat (Aktif vs Segera Hadir)
    │   ├── UniversalDropzone.tsx   # Universal dropzone di beranda dengan validasi berkas
    │   ├── icons.tsx               # Komponen ikon SVG kustom
    │   │
    │   ├── common/                 # Komponen umum pakai ulang
    │   │   ├── FileUploader.tsx    # Drag-and-drop file uploader area
    │   │   └── ToolContainer.tsx   # Pembungkus layout Spoke dengan indikator 3 langkah
    │   │
    │   ├── pages/                  # Halaman informasi & katalog
    │   │   ├── AboutUs.tsx         # Profil & visi platform
    │   │   ├── Blog.tsx            # Tips & edukasi seputar dokumen PDF
    │   │   ├── Contact.tsx         # Formulir kontak & dukungan
    │   │   ├── Faq.tsx             # Pertanyaan umum seputar layanan
    │   │   ├── PrivacyPolicy.tsx   # Kebijakan privasi & penegasan keamanan
    │   │   ├── ProfilePage.tsx     # Profil & status keanggotaan
    │   │   └── ToolsPage.tsx       # Katalog lengkap seluruh alat
    │   │
    │   └── tools/                  # Halaman kerja spesifik alat (Spoke)
    │       ├── AddSignature.tsx    # Bubuhkan tanda tangan digital visual
    │       ├── AddText.tsx         # Sisipkan teks kustom ke dalam halaman
    │       ├── CompressPdf.tsx     # Kompresi ukuran berkas (Rekomendasi / Target KB)
    │       ├── ConvertPdf.tsx      # Konversi format (Word, Excel, PPT, Gambar)
    │       ├── MergePdf.tsx        # Gabungkan beberapa berkas dengan urutan custom
    │       ├── OrganizePdf.tsx     # Susun, putar, atau hapus lembar halaman
    │       ├── PdfPagePreview.tsx  # Pratinjau visual lembar perorangan
    │       ├── PdfPreview.tsx      # Pratinjau kanvas lembar pertama
    │       └── SplitPdf.tsx        # Pemotongan rentang khusus atau pecahan per lembar
    │
    └── contexts/                   # State Management berbasis React Context
        ├── QuotaContext.tsx        # Pelacak kuota harian tamu (3x/hari) & dialog limit
        ├── ThemeContext.tsx        # Pengelola tema Light/Dark & persistensi localStorage
        └── ToastContext.tsx        # Sistem notifikasi toast global
```

---

## 3. Standar & Konvensi Kode (Coding Standards)

1. **Modularitas & Batas Panjang Baris:**
   - Tidak ada satu file pun yang membengkak hingga ribuan baris. Logika rumit dipecah ke dalam modul komponen terpisah dan fungsi helper.
2. **Kesesuaian Tipe (Strict TypeScript):**
   - Seluruh status halaman diikat oleh `View` enum di `types.ts` guna mencegah *dead links* atau *invalid routes*.
   - Setiap props komponen memiliki *interface* yang terdokumentasi rapi.
3. **Responsivitas Teruji:**
   - Mengikuti *mobile-first workflow*:
     - Layar Kecil (`sm` < 640px): 1 kolom, tombol vertikal penuh yang ramah sentuhan.
     - Tablet (`md` 768px): 2 kolom kartu alat.
     - Desktop (`lg` 1024px+): 4 kolom simetris.
4. **Keamanan & Manajemen Memori (Zero Disk I/O In-Memory Streaming):**
   - Operasi manipulasi dokumen PDF seperti **Gabung PDF** (`/tools/merge-pdf`), **Pisahkan PDF** (`/tools/split-pdf`), dan **Kompres PDF** (`/tools/compress-pdf`) mengadopsi arsitektur standar performa *iLovePDF / Smallpdf* dengan memproses stream biner murni di RAM (Zero Disk I/O).
   - Pada **Kompres PDF**, sistem menyediakan 4 mode (*Kompres Tinggi, Rekomendasi, Kompres Rendah, dan Ukuran Target*) dengan optimasi gambar tertanam (*embedded XObject downsampling*) via Pillow, pembersihan struktur *dead-weight* (`doc.scrub`), dan kompresi objek PDF 1.5+ (`use_objstms=True`, `deflate=True`, `garbage=4`) tanpa merusak ketajaman lapisan teks vektor asli.
   - Pada **Pisahkan PDF**, pemotongan ke ZIP ditulis langsung ke memori menggunakan `io.BytesIO()` dan `ZipFile(..., compression=ZIP_DEFLATED)` tanpa overhead disk I/O, menghasilkan lonjakan kecepatan proses hingga 80-95%.
   - Untuk operasi konversi yang memerlukan berkas perantara di sistem berkas (seperti Office), direktori sementara dibersihkan secara otomatis melalui `BackgroundTasks` FastAPI (`cleanup_folder`).
   - Objek memori DOM di frontend yang dibuat melalui `URL.createObjectURL()` selalu dibersihkan dengan `URL.revokeObjectURL()` saat tidak lagi digunakan.
5. **Pratinjau Visual Dokumen Seragam (*Universal File Content Preview*):**
   - Seluruh alat pengerjaan (Konversi Word/Excel/PPT/Gambar, Kompres PDF, Gabungkan PDF, Pisahkan PDF, Atur Halaman, Tambah Teks, dan Tanda Tangan) wajib menampilkan kartu pratinjau visual tajam dari lembar dokumen asli yang diunggah menggunakan `PdfPreview.tsx` (didukung penyesuaian Hi-DPI Retina dan rendering canvas PDF.js) sebelum proses konversi dieksekusi.
6. **Sistem Drag-and-Drop Terstandar (*Tactile Solid Drag & Drop - Zero Ghosting*):**
   - Seluruh alat yang mendukung pengurutan posisi halaman atau berkas (**Atur PDF** dan **Gabungkan PDF**) menerapkan arsitektur *Pointer Events* modern dengan kartu melayang terisolasi (*React Portal*) yang diakselerasi langsung via GPU hardware `translate3d`.
   - Menghilangkan sepenuhnya efek bayangan hantu tembus pandang bawaan browser (*translucent OS drag ghost*).
   - Kartu yang terangkat (*floating card*) tampil **100% solid, tajam, dan tidak tembus pandang** (`opacity: 1`, latar solid putih / dark slate, aksen border biru cerah, elevasi 3D `rotate(2.5deg) scale(1.06)`, dan bayangan `shadow-2xl ring-4 ring-blue-500/20`).
   - Slot asal di dalam grid bertransisi menjadi placeholder bergaris putus-putus (*dashed placeholder*), dan kartu target tujuan memberikan umpan balik pengangkatan yang halus (`.drag-target-indicator`) dengan performa bebas kedipan (*zero flicker*) di desktop maupun layar sentuh mobile.
7. **Standar Editor Teks PDF Interaktif (*Client-Side Vector Text Ingestion - Zero Latency*):**
   - Fitur **Tambahkan Teks** (`frontend/components/tools/AddText.tsx`) diproses 100% di sisi klien menggunakan `pdf-lib`, `@pdf-lib/fontkit`, dan rendering kanvas `PDF.js` skala tinggi (1.5x) untuk respons instan (0ms latensi upload/download).
   - **Katalog 7 Font Populer Dunia & Pengelompokan Kategori:**
     - *Standar & Bisnis:* **Arial / Helvetica** (Modern Bersih), **Calibri / Carlito** (Standar Microsoft Office), **Roboto** (Google Docs / Modern).
     - *Resmi & Akademik:* **Times New Roman** (Skripsi, Hukum, Dinas), **Garamond** (Editorial Elegan & Buku).
     - *Faktur & Data:* **Courier New** (Monospace Kuitansi & Nota).
     - *Catatan & Paraf:* **Caveat** (Gaya Tulisan Tangan / Catatan Koreksi).
   - **Arsitektur Fontkit Hybrid & Fallback Aman:** Menggunakan `@pdf-lib/fontkit` untuk menanamkan (*subset embed*) font TTF asli dengan cache in-memory, serta fallback otomatis ke standard fonts jika jaringan offline tanpa menghentikan proses ekspor.
   - **Sanitasi Enkoding Anti-Crash (*WinAnsi Sanitizer*):** Mengonversi tanda kutip lengkung (*curly quotes*), tanda pisah (*em dash/en dash*), simbol butir (*bullet points*), dan elipsis ke padanan WinAnsi standar untuk font standar.
   - **Pemformatan Vektor Presisi (*Multiline & Text Alignment*):** Mendukung teks multibaris (`\n`) dengan kalkulasi per baris independen untuk perataan Rata Kiri (*Left*), Rata Tengah (*Center*), dan Rata Kanan (*Right*), serta sorotan latar belakang (*background highlight*) dan slider transparansi (*opacity* 0.1–1.0).
   - **Interaksi Kanvas Standar Industri:** Mendukung *Click-to-Place* langsung pada halaman, *Double-Click Inline Editing* di atas kanvas, tombol duplikat/hapus instan, kontrol zoom (50%–200%), bilah navigasi antar-halaman (*smooth scroll*), dan pemotongan kuota tamu (`useQuota`) yang terproteksi.
8. **Standar Editor Tanda Tangan Digital Visual (*Multi-Mode Signature Ingestion & Single-Embed Caching*):**
   - Fitur **Tambahkan Tanda Tangan** (`frontend/components/tools/AddSignature.tsx`) diproses 100% di sisi klien menggunakan `pdf-lib` dan rendering kanvas `PDF.js` skala tinggi (1.5x) untuk menjamin privasi berkas sensitif dan respon instan (0ms latensi upload).
   - **Tiga Mode Tanda Tangan Standar Internasional (iLovePDF / Smallpdf):**
     - *Gambar (Draw):* Guratan pena digital berteknologi *Quadratic Bézier Curve Smoothing* untuk hasil goresan mulus alami (bebas garis patah), dilengkapi pilihan ketebalan pena (Tipis 2px, Normal 4px, Tebal 6px) dan warna tinta (Hitam, Biru Resmi, Merah).
     - *Ketik (Type):* Pembuatan tanda tangan instan berbasis kaligrafi artistik (*Dancing Script, Great Vibes, Caveat, Pacifico*) yang dirender ke kanvas beresolusi tinggi dengan latar belakang transparan.
     - *Unggah (Upload):* Mengunggah berkas gambar tanda tangan/stempel fisik dengan opsi *auto-chroma key* (penghapusan latar belakang kertas putih menjadi transparan secara otomatis).
   - **Optimasi Memori & Ukuran PDF (*Single-Embed Image Caching*):**
     - Gambar tanda tangan yang sama hanya di-embed 1 kali ke dalam dokumen PDF menggunakan `embeddedImagesMap` dan direferensikan ulang pada halaman lain, mencegah pembengkakan ukuran file PDF.
    - **Interaksi Kanvas Presisi, Multi-Halaman & Kuota Tamu:**
      - **Target Halaman Fleksibel & Paraf Otomatis:** Dilengkapi pemilih target lembar (*Target Lembar Selector*) di galeri tanda tangan: pengguna dapat memilih halaman tertentu (Halaman 1, 2, dst.), atau memilih *"Semua Halaman (Paraf / Stempel)"* untuk langsung membubuhkan paraf pada seluruh lembar dokumen PDF secara bersamaan.
      - **Deteksi Scroll Kanvas Dinamis:** Dilengkapi *scroll observer* debounced pada kanvas yang secara otomatis mendeteksi dan memperbarui halaman aktif (`activePageIndex`) mengikuti lembar dokumen yang sedang berada di tengah layar pengguna.
      - **Interaksi Fleksibel:** Penempatan tanda tangan instan langsung ke lembar aktif, atau klik langsung pada posisi lembar kanvas mana saja (*Click-to-Place*).
      - Dukungan *resizing* dengan rasio aspek terkunci (tidak gepeng), tombol cepat duplikat/hapus, bilah navigasi halaman dengan *smooth auto-scroll*, kontrol zoom (50%–200%), dan pemotongan kuota harian tamu (`useQuota`).

---

## 4. Sistem Tema Adaptif (Light & Dark Mode)

Sistem tema dirancang memenuhi kontras **WCAG AAA** (teks) dan **WCAG AA** (elemen interaktif):
* **Pencegahan Kedipan (*Zero FOUC*):** Skrip inline disematkan di dalam `<head>` pada `index.html` untuk mengaktifkan kelas `dark` secara instan sebelum browser menggambar elemen DOM.
* **Auto-detect & Persistensi:** Mendeteksi `prefers-color-scheme: dark` dari perangkat pengguna dan menyimpan preferensi manual ke `localStorage` (`theme: 'light' | 'dark'`).
* **Palet Warna Inti:**
  | Peran | Light Mode | Dark Mode |
  | :--- | :--- | :--- |
  | **Canvas Utama** | `#F8FAFC` (`slate-50`) | `#0F1218` (`slate-950`) |
  | **Permukaan Kartu** | `#FFFFFF` (`white`) | `#1E222B` (`slate-900-alt`) |
  | **Permukaan Inaktif**| `#F1F5F9` (`slate-100`) | `#161A22` (`slate-900-deep`) |
  | **Brand CTA** | `#1A56DB` (`blue-600`) | `#3B82F6` (`blue-500`) |
  | **Teks Utama** | `#0F172A` (`slate-900`) | `#F8FAFC` (`slate-50`) |

---

## 5. Sistem Kuota Tamu (*Guest Quota Tracking*)

* **Batas Harian:** 3 kali konversi gratis per hari untuk pengguna yang belum login.
* **Logika Pemotongan Kuota:** Kuota **hanya** terpotong ketika pemrosesan backend berhasil mengembalikan berkas hasil (bukan saat awal file diunggah).
* **Penyimpanan:** Tersimpan di `localStorage` dengan key tanggal lokal (`YYYY-MM-DD`). Kuota direset otomatis menjadi 3/3 saat pergantian hari.
* **Dialog Batas Tercapai:** Tombol eksekusi akan memunculkan dialog ramah *"Batas 3 konversi gratis tercapai hari ini"* dengan opsi masuk akun Google.

---

## 6. Sistem Lingkungan Vercel: Preview vs. Production

Untuk menjamin keandalan sistem dan kenyamanan pengujian, PDF Toolbox Pro mengintegrasikan arsitektur dua lingkungan langsung dengan **Vercel Deployments** dan **Git Branching**:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 GITHUB REPOSITORY                       │
                  └────────────┬───────────────────────────────┬────────────┘
                               │                               │
                      git push │ (branch: preview)    git push │ (branch: main)
                               ▼                               ▼
                  ┌────────────────────────┐      ┌────────────────────────┐
                  │ VERCEL PREVIEW DEPLOY  │      │ VERCEL PRODUCTION      │
                  │ (*-git-preview-*.app)  │      │ (Domain Utama Publik)  │
                  ├────────────────────────┤      ├────────────────────────┤
                  │ • Uji coba fitur lama  │      │ • Pengguna umum        │
                  │ • Uji coba update baru │      │ • Batas kuota 3x/hari  │
                  │ • Fitur eksperimental  │      │ • Lingkungan stabil    │
                  │ • KUOTA BEBAS (∞)      │      │ • Proteksi guest limit │
                  └────────────────────────┘      └────────────────────────┘
```

### 6.1 Karakteristik Masing-Masing Lingkungan

| Parameter | 🧪 Vercel Preview Environment | ⚡ Vercel Production Environment |
| :--- | :--- | :--- |
| **Tujuan Penggunaan** | Uji coba fitur lama (regresi), validasi update, dan riset fitur baru | Rilis stabil untuk pengguna publik |
| **Sumber Branch Git** | `preview` (atau Pull Request) | `main` |
| **Batasan Kuota Tamu** | **Bebas Kuota (Tanpa Batas / ∞)** | **3 Kali per Hari** |
| **Pemotongan Kuota** | Di-bypass (`consumeQuota()` selalu return `true`) | Kuota terpotong 1 setiap kali konversi sukses |
| **Indikator Visual Header** | `🧪 Preview (Bebas Kuota ∞)` | `⚡ 3/3 Kuota Hari Ini` |
| **Fitur Bantuan Penguji** | Switcher modal, reset kuota tamu instan | Dialog modal saat limit 3x tercapai |

### 6.2 Mekanisme Deteksi Lingkungan Otomatis (*Multi-tier Detection*)

Sistem menentukan status lingkungan secara hierarkis melalui `QuotaContext.tsx`:
1. **Prioritas 1 (URL Query Parameter):** Menambahkan `?env=preview` atau `?preview=true` pada URL akan langsung mengaktifkan Mode Preview di mana saja. Sebaliknya `?env=production` memaksa simulasi kuota produksi.
2. **Prioritas 2 (Penyimpanan Lokal):** Pilihan yang dialihkan pengguna melalui modal antarmuka disimpan di `localStorage` (`pdf_toolbox_env_mode`).
3. **Prioritas 3 (Injeksi Build Vercel):** Variabel `process.env.VERCEL_ENV` diinjeksi ke bundler Vite melalui konstanta `__VERCEL_ENV__`.
4. **Prioritas 4 (Runtime Hostname):** Otomatis mendeteksi domain lokal (`localhost`, `127.0.0.1`) dan domain pratinjau Vercel (`*-git-*.vercel.app` atau preview URL).

### 6.3 Standar Alur Kerja Pengembangan & Rilis (Git Workflow)

Setiap pengembangan fitur atau perbaikan kode wajib mengikuti siklus berikut:
1. **Bekerja pada Branch `preview`:**
   ```bash
   git checkout preview
   # Lakukan perubahan kode, perbaikan, atau penambahan fitur baru
   git add -A
   git commit -m "feat: deskripsi perubahan"
   git push origin preview
   ```
2. **Uji Coba di URL Vercel Preview:**
   - Buka URL Preview yang dibuatkan otomatis oleh Vercel.
   - Periksa badge `🧪 Preview (Bebas Kuota ∞)` di header.
   - Uji fitur berkali-kali tanpa khawatir terblokir batas kuota 3x.
3. **Rilis ke Production (Merge ke `main`):**
   - Setelah seluruh fitur teruji 100% dan bebas bug, gabungkan kode ke branch `main`:
   ```bash
   git checkout main
   git merge preview
   git push origin main
   ```
   - Vercel akan otomatis memperbarui situs produksi publik dengan proteksi kuota 3x yang aktif.

---

## 7. Panduan Menambahkan Alat PDF Baru di Masa Depan

Bila ingin menambahkan fitur/alat PDF baru (misalnya *Watermark* atau *OCR*):
1. **Tambahkan Enum di `frontend/types.ts`:**
   ```typescript
   export enum View {
     // ...
     WATERMARK = 30,
   }
   ```
2. **Buat Komponen Alat di `frontend/components/tools/Watermark.tsx`:**
   - Gunakan pembungkus `<ToolContainer title="Watermark PDF" onBack={onBack} currentStep={step}>`.
   - Gunakan `useQuota()` untuk memeriksa kuota sebelum proses dan memotong kuota setelah sukses.
3. **Daftarkan di `frontend/App.tsx`:**
   - Tambahkan `case View.WATERMARK: return <Watermark onBack={handleBackToHome} />;` pada switch `renderContent()`.
4. **Aktifkan Kartu Alat di `frontend/components/LandingPage.tsx` & `ToolsPage.tsx`:**
   - Ubah atribut `active: false` menjadi `active: true` dan hubungkan `view: View.WATERMARK`.
5. **Tambahkan Endpoint di `backend/app/routers/` (jika membutuhkan pemrosesan server).**
6. **Commit dan Push ke Branch `preview` Terlebih Dahulu:** Lakukan uji coba bebas kuota sebelum di-merge ke `main`.

---

## 8. Integrasi Deployment & Produksi

* **Frontend:** Dideploy otomatis melalui **Vercel** yang terhubung ke branch `preview` (pengujian) dan `main` (produksi publik). File `.npmrc` dengan `legacy-peer-deps=true` memastikan instalasi paket selalu stabil.
* **Backend:** Dideploy secara serverless di **Google Cloud Run** (region `asia-southeast2` - Jakarta) dengan container Docker dan auto-scaling:
  - **URL Resmi Backend:** `https://pdf-toolbox-pro-100471936008.asia-southeast2.run.app`
  - **Dokumentasi Swagger API:** `https://pdf-toolbox-pro-100471936008.asia-southeast2.run.app/docs`
  - Mendukung CORS terintegrasi untuk seluruh domain Vercel preview (`*.vercel.app`) dan domain produksi publik.
  - Perintah build Docker lokal: `docker build -t pdf-backend .`
