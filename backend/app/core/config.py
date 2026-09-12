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

# Batas per tier (dalam bytes) — digunakan ketika backend menerima header X-User-Tier
MAX_FILE_SIZE_BY_TIER = {
    "guest":   20  * 1024 * 1024,   # 20 MB
    "free":    50  * 1024 * 1024,   # 50 MB
    "flash":   75  * 1024 * 1024,   # 75 MB
    "monthly": 100 * 1024 * 1024,   # 100 MB
    "annual":  100 * 1024 * 1024,   # 100 MB (akan dinaikkan ke 500 MB via GCS di Tier 3)
}

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
