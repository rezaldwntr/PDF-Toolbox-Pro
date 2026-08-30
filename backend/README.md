# 📄 Zentridox PDF Backend API

Backend service high-performance untuk aplikasi konversi PDF (Zentridox). Dibangun menggunakan **FastAPI**, **Python**, dan **Docker**, dioptimalkan untuk deployment VPS (DigitalOcean) dengan manajemen memori yang efisien.

![Python Version](https://img.shields.io/badge/python-3.9-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-green)
![Docker](https://img.shields.io/badge/Docker-Optimized-blue)

## ✨ Fitur Utama

API ini menyediakan endpoint konversi dokumen dengan fitur canggih:

* **PDF ke Word (.docx):** Menggunakan `pdf2docx` untuk hasil yang presisi.
* **PDF ke Excel (.xlsx):** Dilengkapi dengan **Smart Header Detection** untuk mendeteksi tabel dan header secara otomatis, bahkan jika tabel terpotong halaman.
* **PDF ke PowerPoint (.pptx):** *High Speed In-Memory processing*. Mengonversi teks menjadi editable text box dan gambar dirender langsung ke RAM untuk kecepatan maksimal.
* **Optimasi Server:**
    * Auto-cleanup temporary files setelah request selesai.
    * Validasi ukuran file (Max 25MB).
    * CORS enabled untuk integrasi frontend.

## 🛠️ Teknologi yang Digunakan

* **Core:** FastAPI, Uvicorn
* **PDF Processing:** PyMuPDF (Fitz), pdfplumber, pdf2docx
* **Office Generation:** python-pptx, openpyxl, pandas
* **Infrastructure:** Docker, GitHub Actions (CI/CD)

## 🚀 Cara Menjalankan (Local Development)

1.  **Clone Repository**
    ~~~bash
    git clone https://github.com/rezaldwntr/pdf-backend-api.git
    cd pdf-backend-api
    ~~~

2.  **Setup Virtual Environment**
    ~~~bash
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    ~~~

3.  **Install Dependencies**
    ~~~bash
    pip install -r requirements.txt
    ~~~

4.  **Jalankan Server**
    ~~~bash
    uvicorn main:app --reload
    ~~~
    Akses dokumentasi API (Swagger UI) di: `http://localhost:8000/docs`

## 🐳 Cara Menjalankan dengan Docker

Aplikasi ini sudah dilengkapi Dockerfile yang dioptimalkan (slim version).

~~~bash
# Build Image
docker build -t pdf-backend .

# Run Container
docker run -d -p 8000:8000 --name zentridox-api pdf-backend
~~~

## ⚙️ Deployment

Project ini menggunakan **GitHub Actions** untuk CD otomatis. Setiap push ke branch `main` akan memicu deployment otomatis ke server (VPS DigitalOcean) via SSH.

---
© 2025 Rezal Dewantara. Created for Zentridox Project.
