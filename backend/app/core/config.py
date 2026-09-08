# app/core/config.py
import os

# Konfigurasi Ukuran File (25MB)
MAX_FILE_SIZE = 25 * 1024 * 1024

# Konfigurasi Midtrans Payment Gateway
MIDTRANS_SERVER_KEY = os.getenv("MIDTRANS_SERVER_KEY", "SB-Mid-server-YOUR-SANDBOX-KEY")
MIDTRANS_CLIENT_KEY = os.getenv("MIDTRANS_CLIENT_KEY", "SB-Mid-client-YOUR-SANDBOX-KEY")
MIDTRANS_IS_PRODUCTION = os.getenv("MIDTRANS_IS_PRODUCTION", "false").lower() in ("true", "1", "yes")

# Konfigurasi Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", os.getenv("VITE_SUPABASE_URL", "https://lfjakofhylhghwmhgvej.supabase.co"))
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_SECRET_KEY", ""))

# Detail Paket Langganan & Harga
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
