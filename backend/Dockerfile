# 1. PILIH BASE IMAGE
FROM python:3.9-slim

# 2. INSTALL DEPENDENCY SISTEM
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-ind \
    && rm -rf /var/lib/apt/lists/*

# 3. SET FOLDER KERJA
WORKDIR /app

# 4. INSTALL LIBRARY PYTHON
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. COPY SEMUA KODE
COPY . .

# 6. HEALTH CHECK
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7860/')" || exit 1

# 7. JALANKAN SERVER (Gunicorn dengan 2 UvicornWorker)
# - 2 worker: memungkinkan 2 request berat berjalan paralel (non-blocking)
# - timeout 1200s: cukup untuk konversi PDF 50-100 MB yang memerlukan 60-300 detik
# - keep-alive 75s: mencegah koneksi Cloud Run Load Balancer putus dini
CMD ["gunicorn", "app.main:app", \
     "--workers", "2", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:7860", \
     "--timeout", "1200", \
     "--keep-alive", "75", \
     "--log-level", "info"]
