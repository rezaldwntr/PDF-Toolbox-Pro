# 1. PILIH BASE IMAGE
FROM python:3.9-slim

# 2. INSTALL DEPENDENCY SISTEM
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# 3. SET FOLDER KERJA
WORKDIR /app

# 4. INSTALL LIBRARY PYTHON
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. COPY SEMUA KODE
COPY . .

# 6. JALANKAN SERVER
# Perhatikan perubahan: "app.main:app" bukan "main:app"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--timeout-keep-alive", "1200"]
