#!/bin/bash
set -e

# Hapus venv jika rusak (opsional, tapi aman)
# rm -rf .venv

# Cek apakah folder venv sudah ada, jika belum buat baru
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Aktivasi virtual environment
source .venv/bin/activate

# Upgrade pip ke versi terbaru
pip install --upgrade pip

# Install semua library dari requirements.txt
echo "Installing dependencies..."
pip install -r requirements.txt

# Jalankan Server (Versi Modular)
echo "Starting server..."
# PENTING: Mengarah ke 'app.main:app' karena struktur folder sudah dipecah
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --reload
