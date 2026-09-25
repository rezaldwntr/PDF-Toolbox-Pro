# app/utils/payment_utils.py
from __future__ import annotations
import time
from typing import Dict, Optional


def generate_order_id(plan_id: str, user_id: Optional[str] = None) -> str:
    """
    Menghasilkan ID order Midtrans yang unik dan informatif.
    Format standar: PDFTB-[PLAN]-[USER_ID_PREFIX]-[TIMESTAMP]
    Contoh: PDFTB-FLASH-a1b2c3d4-1711234567
    """
    clean_plan = (plan_id or "flash").strip().upper()
    user_prefix = (user_id.strip()[:8] if user_id and len(user_id) >= 8 else "ANON").upper()
    timestamp = int(time.time())
    return f"PDFTB-{clean_plan}-{user_prefix}-{timestamp}"


def parse_order_id(order_id: str) -> Dict[str, Optional[str]]:
    """
    Mengekstrak metadata dari string order ID Midtrans.
    Mengembalikan dict dengan plan_id, user_prefix, dan timestamp jika format valid.
    """
    result: Dict[str, Optional[str]] = {
        "valid": False,
        "plan_id": None,
        "user_prefix": None,
        "timestamp": None,
    }

    if not order_id or not order_id.startswith("PDFTB-"):
        return result

    parts = order_id.split("-")
    if len(parts) >= 4:
        result["valid"] = True
        result["plan_id"] = parts[1].lower()
        result["user_prefix"] = parts[2]
        result["timestamp"] = parts[3]
    elif len(parts) >= 2:
        result["valid"] = True
        result["plan_id"] = parts[1].lower()

    return result
