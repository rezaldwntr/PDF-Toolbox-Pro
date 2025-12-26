# 🛠️ Zentridox PDF Toolbox Pro

Aplikasi web modern untuk manajemen PDF All-in-One. Dibangun dengan **React**, **TypeScript**, dan **Vite** untuk performa super cepat. Terintegrasi dengan Backend API Zentridox untuk pemrosesan dokumen tingkat lanjut.

![React](https://img.shields.io/badge/React-18.2-blue)
![Vite](https://img.shields.io/badge/Vite-5.0-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![PWA](https://img.shields.io/badge/PWA-Ready-green)

## ✨ Fitur Unggulan

Aplikasi ini menyediakan antarmuka pengguna (UI) yang intuitif untuk berbagai kebutuhan PDF:

* **📄 Konversi Dokumen:** PDF ke Word, Excel, dan PowerPoint (Powered by Zentridox API).
* **🗂️ Manajemen Halaman:**
    * **Merge PDF:** Menggabungkan banyak file menjadi satu.
    * **Split PDF:** Memecah file PDF berdasarkan halaman.
    * **Organize PDF:** Mengatur ulang, menghapus, atau memutar halaman.
* **🔧 Utilitas:**
    * **Compress PDF:** Memperkecil ukuran file tanpa mengurangi kualitas.
    * **E-Signature:** Menambahkan tanda tangan digital ke dokumen.
    * **Edit Teks:** Menambahkan teks/anotasi langsung ke halaman PDF.
* **🚀 Modern Tech:** Mendukung Progressive Web App (PWA) agar bisa diinstal seperti aplikasi native.

## 🛠️ Teknologi yang Digunakan

* **Frontend Framework:** React + TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS (Modern UI)
* **PDF Rendering:** React-PDF / PDF-Lib
* **Backend Integration:** Zentridox API (Python/FastAPI)
* **Cloud/Auth:** Firebase

## 🚀 Cara Menjalankan (Local Development)

Ikuti langkah ini untuk menjalankan aplikasi di komputer Anda:

1.  **Clone Repository**
    ~~~bash
    git clone https://github.com/rezaldwntr/pdf-toolbox-pro.git
    cd pdf-toolbox-pro
    ~~~

2.  **Install Dependencies**
    ~~~bash
    npm install
    # atau jika menggunakan yarn
    yarn install
    ~~~

3.  **Setup Environment Variables**
    Buat file `.env` di root folder dan sesuaikan dengan konfigurasi API/Firebase Anda:
    ~~~env
    VITE_API_URL=http://localhost:8000
    VITE_FIREBASE_API_KEY=your_api_key
    ~~~

4.  **Jalankan Aplikasi**
    ~~~bash
    npm run dev
    ~~~
    Buka browser di `http://localhost:5173`

## 📦 Build untuk Production

Untuk membuat file statis yang siap di-deploy (ke Vercel/Netlify/Firebase Hosting):

~~~bash
npm run build
~~~
Hasil build akan muncul di folder `dist/`.

---
© 2025 Rezal Dewantara. Zentridox Project.
