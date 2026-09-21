# app/core/config.py
import os

# ===========================================================================
# KONFIGURASI UKURAN FILE PER TIER
# Catatan Arsitektur:
#   - Batas default (guest/free) = 50 MB (aman di bawah batas Cloud Run 32 MB
#     untuk HTTP multipart; akan diupgrade ke GCS presigned upload untuk file lebih besar)
#   - Tier berbayar mendapat batas lebih longgar; implementasi GCS akan
#     membuka kunci batas 100-500 MB di Tier 3 roadmap.
# ===========================================================================

# Batas global fallback (guest / free)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

# Batas ukuran per tier (dalam bytes) sesuai matriks kapasitas:
# Alat Standar (Grup B: PyMuPDF C-Engine hingga 300 MB)
MAX_FILE_SIZE_BY_TIER = {
    "guest":    30 * 1024 * 1024,   # 30 MB
    "free":     30 * 1024 * 1024,   # 30 MB
    "flash":   100 * 1024 * 1024,   # 100 MB
    "monthly": 200 * 1024 * 1024,   # 200 MB
    "annual":  300 * 1024 * 1024,   # 300 MB
}

# Alat Berat / OCR (Grup C: Word, Excel, PPT, Image, OCR, Translate)
# Dibatasi maksimal 50 MB untuk menjaga stabilitas RAM kontainer 2 GB
MAX_FILE_SIZE_HEAVY_BY_TIER = {
    "guest":   10 * 1024 * 1024,   # 10 MB
    "free":    10 * 1024 * 1024,   # 10 MB
    "flash":   35 * 1024 * 1024,   # 35 MB
    "monthly": 50 * 1024 * 1024,   # 50 MB
    "annual":  50 * 1024 * 1024,   # 50 MB (Batas aman RAM)
}

# ===========================================================================
# KONFIGURASI GOOGLE CLOUD STORAGE (GCS) — TIER 3
# ===========================================================================
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "pdf-toolbox-pro-storage")
GCS_PROJECT_ID = os.getenv("GCS_PROJECT_ID", "pdf-toolbox-pro")
GCS_ENABLED = os.getenv("GCS_ENABLED", "true").lower() in ("true", "1", "yes")

# ===========================================================================
# KONFIGURASI MIDTRANS PAYMENT GATEWAY
# ===========================================================================
MIDTRANS_SERVER_KEY = os.getenv("MIDTRANS_SERVER_KEY", "SB-Mid-server-YOUR-SANDBOX-KEY")
MIDTRANS_CLIENT_KEY = os.getenv("MIDTRANS_CLIENT_KEY", "Mid-client-NgwF8qYDa8uBWWPh")
MIDTRANS_IS_PRODUCTION = os.getenv("MIDTRANS_IS_PRODUCTION", "true").lower() in ("true", "1", "yes")

# ===========================================================================
# KONFIGURASI SUPABASE
# ===========================================================================
SUPABASE_URL = os.getenv("SUPABASE_URL", os.getenv("VITE_SUPABASE_URL", "https://lfjakofhylhghwmhgvej.supabase.co"))
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_SECRET_KEY", ""))

# ===========================================================================
# DETAIL PAKET LANGGANAN & HARGA
# ===========================================================================
SUBSCRIPTION_PLANS = {
    "flash": {
        "id": "flash",
        "name": "24-Hour Flash Pass",
        "price": 5000,
        "duration_hours": 24,
        "tier": "flash",
    },
    "monthly": {
        "id": "monthly",
        "name": "Monthly Pro",
        "price": 29000,
        "duration_days": 30,
        "tier": "monthly",
    },
    "annual": {
        "id": "annual",
        "name": "Annual Pass",
        "price": 149000,
        "duration_days": 365,
        "tier": "annual",
    },
}
