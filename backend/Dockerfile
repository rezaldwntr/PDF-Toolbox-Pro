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

# 6. HEALTH CHECK (Port adaptif terhadap env var $PORT Cloud Run / 7860 fallback)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request, os; port = os.environ.get('PORT', '7860'); urllib.request.urlopen(f'http://localhost:{port}/')" || exit 1

# 7. JALANKAN SERVER (Uvicorn dengan 2 worker & port adaptif)
# - Menggunakan exec shell agar ${PORT:-7860} dievaluasi dinamis untuk Cloud Run ($PORT) & default (7860)
# - 2 worker: memungkinkan request berjalan paralel secara asinkron
# - keep-alive 75s: mencegah koneksi Cloud Run Load Balancer putus dini
CMD exec uvicorn app.main:app \
     --host 0.0.0.0 \
     --port ${PORT:-7860} \
     --workers 2 \
     --timeout-keep-alive 75

