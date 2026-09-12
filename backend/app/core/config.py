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

# Batas per tier (dalam bytes) — didukung Tier 3 GCS Direct Presigned Upload
MAX_FILE_SIZE_BY_TIER = {
    "guest":   20  * 1024 * 1024,   # 20 MB
    "free":    50  * 1024 * 1024,   # 50 MB
    "flash":   100 * 1024 * 1024,   # 100 MB
    "monthly": 250 * 1024 * 1024,   # 250 MB (GCS Direct Upload)
    "annual":  500 * 1024 * 1024,   # 500 MB (GCS Direct Upload)
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
MIDTRANS_CLIENT_KEY = os.getenv("MIDTRANS_CLIENT_KEY", "SB-Mid-client-YOUR-SANDBOX-KEY")
MIDTRANS_IS_PRODUCTION = os.getenv("MIDTRANS_IS_PRODUCTION", "false").lower() in ("true", "1", "yes")

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
        "name": "Annual Value Pass",
        "price": 149000,
        "duration_days": 365,
        "tier": "annual",
    },
}
