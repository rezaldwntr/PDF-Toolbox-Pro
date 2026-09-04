# Product Requirements Document (PRD): PDF Toolbox Pro

## 1. Dokumen Informasi
* **Nama Produk:** PDF Toolbox Pro (Service Repositori: Zentridox Backend API)[cite: 2]
* **Versi Dokumen:** 2.1
* **Status:** Aktif / Tahap Pengembangan & Deployment
* **Tech Stack:**
  * **Backend:** FastAPI (Python 3.9), PyMuPDF (Fitz), pdfplumber, pdf2docx, python-pptx, openpyxl, pandas, Uvicorn[cite: 2].
  * **Infrastruktur:** **Google Cloud Run** (Serverless Container Platform), Google Artifact Registry, GitHub Actions (CI/CD otomatis)[cite: 2].
  * **Frontend:** Single Page Application (Modern JavaScript, Tailwind CSS).

---

## 2. Latar Belakang & Nilai Proposisi
PDF Toolbox Pro dikembangkan untuk memecahkan masalah umum pada layanan manipulasi PDF daring: biaya berlangganan yang mahal, antarmuka penuh iklan manipulatif, dan watermark paksa pada hasil unduhan.

Nilai proposisi utama:
1. **Kecepatan & Presisi Tinggi:** Menggunakan engine berbasis Python untuk mempertahankan tata letak Word, tabel Excel kompleks dengan *smart header detection*, dan slide presentasi PPTX yang dapat diedit[cite: 2].
2. **Guest-Friendly:** Akses langsung 3 konversi per hari bagi pengguna baru tanpa keharusan mendaftar akun.
3. **Infrastruktur Skalabel & Aman:** Dijalankan di atas container Google Cloud Run dengan isolasi proses, pembersihan file instan (*ephemeral storage*), dan masa retensi berkas maksimal 60 menit[cite: 2].

---

## 3. Matriks Pengguna & Batasan Kuota

| Parameter | Tamu (Guest User) | Pengguna Terdaftar (Free Account) |
| :--- | :--- | :--- |
| **Batas Penggunaan Harian** | 3 kali / hari (via browser fingerprint & local storage) | Tanpa batas harian (*fair usage*) |
| **Batas Ukuran Berkas** | Maksimal 25 MB per berkas[cite: 2] | Maksimal 50 MB per berkas |
| **Masa Simpan Berkas di Server** | Dihapus segera setelah unduh / auto-cleanup 60 menit | Maksimal 2 jam sebelum pembersihan |
| **Akses Fitur OCR & AI** | Terkunci (Badge Segera Hadir)[cite: 1] | Kuota percobaan khusus |

---

## 4. Spesifikasi Fitur: Tahap Aktif (Backend Ready)

### 4.1 Modul Konversi Berkas (Endpoint: `/convert/*`)[cite: 2]
1. **PDF ke Word (`POST /convert/pdf-to-docx`)**[cite: 2]
   * *Engine:* `pdf2docx`[cite: 2].
   * *Persyaratan:* Mengekstrak teks, tabel, font, dan format paragraf ke dalam format `.docx` tanpa merusak margin asli[cite: 2].
2. **PDF ke Excel (`POST /convert/pdf-to-excel`)**[cite: 2]
   * *Engine:* `pdfplumber` + `openpyxl` + `pandas`[cite: 2].
   * *Persyaratan:* Menerapkan **Smart Header Detection** untuk mengenali struktur baris dan kolom tabel secara otomatis serta menambahkan border sel rapi pada lembar kerja `.xlsx`[cite: 2].
3. **PDF ke PowerPoint (`POST /convert/pdf-to-ppt`)**[cite: 2]
   * *Engine:* `PyMuPDF (fitz)` + `python-pptx`[cite: 2].
   * *Persyaratan:* Pemrosesan *in-memory* berkecepatan tinggi[cite: 2]. Halaman PDF dipetakan ke ukuran slide yang proporsional; blok teks dijadikan teks yang dapat diedit dan elemen gambar diletakkan sesuai koordinat aslinya[cite: 2].
4. **PDF ke Gambar (`POST /convert/pdf-to-image`)**[cite: 2]
   * *Engine:* `PyMuPDF (fitz)`[cite: 2].
   * *Persyaratan:* Merender halaman pada densitas 200 DPI[cite: 2]. Berkas luaran dikemas ke dalam arsip `.zip` berformat PNG atau JPG[cite: 2].

### 4.2 Modul Pengorganisasian Berkas (Endpoint: `/tools/*`)[cite: 2]
1. **Gabungkan PDF (`POST /tools/merge-pdf`)**[cite: 2]
   * *Engine:* `PyMuPDF (fitz)`[cite: 2].
   * *Persyaratan:* Menerima minimal 2 berkas PDF dan menggabungkannya sesuai urutan yang ditentukan pengguna[cite: 2].
2. **Pisahkan PDF / Advanced Split (`POST /tools/split-pdf`)**[cite: 2]
   * *Mode Extract:* Menerima parameter rentang halaman (contoh: `"1-5, 7"`) untuk menghasilkan 1 berkas PDF baru[cite: 2].
   * *Mode Fixed:* Memecah berkas setiap X halaman menjadi beberapa berkas di dalam arsip `.zip` dengan penamaan terstruktur (`part_001.pdf`)[cite: 2].
   * *Mode All:* Memecah setiap 1 halaman menjadi 1 berkas tersendiri di dalam arsip `.zip` (`page_001.pdf`)[cite: 2].
3. **Kompres PDF (`POST /tools/compress-pdf`)**[cite: 2]
   * *Mode Recommended:* Optimasi internal via `deflate=True, garbage=4, clean=True` tanpa mengurangi keterbacaan teks secara signifikan[cite: 2].
   * *Mode Target Size:* Parameter target ukuran dalam KB; secara otomatis menyesuaikan resolusi gambar bertahap (DPI 96, 72, 50) hingga mencapai ukuran yang diinginkan[cite: 2].

### 4.3 Modul Frontend (Canvas-Assisted)
1. **Tanda Tangan PDF:**
   * Pembubuhan tanda tangan via canvas interaktif.
   * Penanganan *touch offset listener* agar goresan tangan di layar ponsel presisi dan tidak bergeser[cite: 1].
2. **Atur PDF (Organize):**
   * Antarmuka visual untuk memutar (*rotate*) atau menghapus halaman tertentu sebelum disimpan.
3. **Tambah Teks:**
   * Penambahan teks kustom, tanggal, atau penandaan langsung di atas dokumen PDF.

---

## 5. Peta Jalan Pengembangan (Fitur Mendatang)[cite: 1]

### Fase 2: Pelengkap Konversi & Pengarsipan
* [ ] **Konversi Berkas Masuk:** Word ke PDF, Excel ke PDF, PPT ke PDF, dan JPG ke PDF[cite: 1].
* [ ] **PDF/A:** Konversi dokumen standar PDF/A untuk pengarsipan formal instansi dan hukum[cite: 1].

### Fase 3: Pengeditan Mahir & Keamanan Dokumen
* [ ] **Edit Teks Dokumen:** Mengubah dan merevisi teks yang sudah ada di dalam berkas PDF secara langsung[cite: 1].
* [ ] **Proteksi & Buka Kunci:** Penambahan dan penghapusan kata sandi dokumen PDF[cite: 1].
* [ ] **Utilitas Dokumen:** Pemotongan bidang halaman (*Crop PDF*) dan penambahan Cap/Watermark[cite: 1].

### Fase 4: Fitur AI & Pemrosesan Lanjutan
* [ ] **OCR PDF:** Ekstraksi teks dari gambar hasil pemindaian (*scan*) menjadi teks yang dapat diedit/dicari[cite: 1].
* [ ] **Terjemahkan Dokumen (AI):** Terjemahan multibahasa otomatis dengan mempertahankan tata letak lembar dokumen[cite: 1].
* [ ] **AI Assistant / Summarizer:** Fitur ringkasan eksekutif dan tanya jawab interaktif isi berkas[cite: 1].

---

## 6. Arsitektur Infrastruktur: Google Cloud Run

```text
[ Pengguna / Browser ]
          │  HTTPS (TLS 1.3)
          ▼
[ CDN / Cloud Load Balancing ]
          │
          ▼
[ Google Cloud Run Service ]
   ├── Port Container: 7860 / 8000
   ├── Auto-scaling: 0 to N instances (Scale-to-zero saat sepi)
   ├── Memory Allocation: Min. 2 GiB per instance (menangani rendering PyMuPDF)
   ├── CPU Allocation: 1-2 vCPU (Throttled saat idle, burst saat proses)
   ├── Concurrency: 40-80 concurrent requests per container
   └── Ephemeral Local Storage: Direktori /tmp (dihapus otomatis)
          │
          ▲  Continuous Deployment (Push to main branch)
[ GitHub Actions ] ──> [ Google Artifact Registry (Docker Image) ]
```

### Persyaratan Deployment Cloud Run:
1. **Manajemen Memory & Timeout:**
   * Timeout Cloud Run dikonfigurasi hingga `1200` detik untuk mengakomodasi dokumen PDF berukuran tebal (>100 halaman)[cite: 2].
   * Direktori kerja `/tmp` menggunakan RAM container; `cleanup_folder` via `BackgroundTasks` FastAPI wajib dipanggil setiap kali konversi selesai untuk mencegah kebocoran memori (*memory leak*)[cite: 2].
2. **Variabel Lingkungan (Environment Variables):**
   * `MAX_FILE_SIZE = 26214440` (25 MB)[cite: 2].
   * `PORT = 7860` (disesuaikan dengan parameter Dockerfile)[cite: 2].

---

## 7. Persyaratan Non-Fungsional & Keamanan
1. **Integritas & Sanitasi Berkas:**
   * Validasi wajib ekstensi dan header biner (*magic numbers*) sebelum berkas diproses oleh engine[cite: 2].
   * Berkas yang gagal diproses langsung memicu pembersihan folder temporer pada blok `except`[cite: 2].
2. **Kebijakan Retensi Berkas:**
   * Berkas tidak disimpan secara permanen di database atau Google Cloud Storage.
   * Siklus hidup berkas berakhir tepat saat response berkas dikirimkan ke pengguna atau maksimal 60 menit[cite: 1, 2].
3. **SEO & Keterindeksan Mesin Pencari:**
   * Arsitektur URL terstruktur dan ramah mesin pencari (contoh: `/gabungkan-pdf`, `/kompres-pdf`).
   * Setiap halaman alat dilengkapi teks edukasi dan FAQ untuk menargetkan *long-tail keywords*[cite: 1].