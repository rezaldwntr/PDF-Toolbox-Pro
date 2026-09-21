# app/utils/supabase_utils.py
from __future__ import annotations
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
import httpx

from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

logger = logging.getLogger("supabase_utils")


def get_supabase_headers() -> Dict[str, str]:
    """Mengembalikan HTTP header dengan service role key untuk akses admin Supabase REST API."""
    key = SUPABASE_SERVICE_ROLE_KEY or "anon"
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


async def record_payment_transaction(
    order_id: str,
    user_id: Optional[str],
    user_email: str,
    user_name: Optional[str],
    plan_id: str,
    amount: float,
    status: str,
    payment_type: Optional[str] = None,
    transaction_time: Optional[str] = None,
    settlement_time: Optional[str] = None,
    raw_response: Optional[Dict[str, Any]] = None,
) -> bool:
    """Mencatat atau memperbarui riwayat transaksi Midtrans di tabel payment_transactions."""
    if not SUPABASE_URL:
        return False

    now_iso = datetime.now(timezone.utc).isoformat()
    payload = {
        "id": order_id,
        "user_id": user_id if user_id and len(user_id) == 36 else None,
        "user_email": user_email,
        "user_name": user_name or "Pengguna",
        "plan_id": plan_id,
        "gross_amount": amount,
        "status": status,
        "payment_type": payment_type,
        "transaction_time": transaction_time or now_iso,
        "settlement_time": settlement_time,
        "raw_response": raw_response or {},
        "updated_at": now_iso,
    }

    endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/payment_transactions"
    headers = get_supabase_headers()
    headers["Prefer"] = "resolution=merge-duplicates"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(endpoint, json=payload, headers=headers)
            if resp.status_code in (200, 201, 204):
                logger.info(f"Berhasil mencatat transaksi {order_id} ({status})")
                return True
            else:
                logger.warning(f"Gagal mencatat transaksi di Supabase ({resp.status_code}): {resp.text}")
                return False
    except Exception as e:
        logger.error(f"Error saat mencatat transaksi di Supabase: {e}")
        return False


async def record_tool_usage(
    tool_name: str,
    is_guest: bool,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    session_id: Optional[str] = None,
    file_size_bytes: int = 0,
    page_count: int = 1,
    status: str = "success",
    error_message: Optional[str] = None,
) -> bool:
    """Mencatat setiap eksekusi alat PDF (baik tamu maupun pengguna login)."""
    if not SUPABASE_URL:
        return False

    payload = {
        "tool_name": tool_name.lower().strip(),
        "is_guest": is_guest,
        "user_id": user_id if user_id and len(user_id) == 36 else None,
        "user_email": user_email,
        "session_id": session_id,
        "file_size_bytes": file_size_bytes,
        "page_count": page_count,
        "status": status,
        "error_message": error_message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/tool_usages"
    headers = get_supabase_headers()

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(endpoint, json=payload, headers=headers)
            return resp.status_code in (200, 201, 204)
    except Exception as e:
        logger.warning(f"Gagal mencatat log pemakaian alat ({tool_name}): {e}")
        return False


async def fetch_user_profiles(limit: int = 100, offset: int = 0, search: Optional[str] = None, tier: Optional[str] = None) -> List[Dict[str, Any]]:
    """Mengambil daftar pengguna terdaftar dari Supabase dengan filter opsional."""
    if not SUPABASE_URL:
        return []

    endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profiles?select=*&order=created_at.desc&limit={limit}&offset={offset}"
    if tier and tier.lower() != "all":
        endpoint += f"&tier=eq.{tier.lower()}"
    if search:
        endpoint += f"&or=(email.ilike.*{search}*,full_name.ilike.*{search}*)"

    headers = get_supabase_headers()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(endpoint, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            return []
    except Exception as e:
        logger.error(f"Error fetch user profiles: {e}")
        return []


async def fetch_payment_transactions(limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    """Mengambil daftar transaksi pembayaran dari Supabase."""
    if not SUPABASE_URL:
        return []

    endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/payment_transactions?select=*&order=created_at.desc&limit={limit}&offset={offset}"
    headers = get_supabase_headers()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(endpoint, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            return []
    except Exception as e:
        logger.error(f"Error fetch payment transactions: {e}")
        return []


async def fetch_tool_usages(limit: int = 100, offset: int = 0, tool_name: Optional[str] = None) -> List[Dict[str, Any]]:
    """Mengambil log pemakaian alat dari Supabase."""
    if not SUPABASE_URL:
        return []

    endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/tool_usages?select=*&order=created_at.desc&limit={limit}&offset={offset}"
    if tool_name and tool_name.lower() != "all":
        endpoint += f"&tool_name=eq.{tool_name.lower()}"

    headers = get_supabase_headers()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(endpoint, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            return []
    except Exception as e:
        logger.error(f"Error fetch tool usages: {e}")
        return []


async def update_supabase_user_tier(
    user_id: str,
    tier: str,
    duration_days: Optional[int] = None,
    duration_hours: Optional[int] = None,
) -> bool:
    """Mengupdate status tier dan masa aktif langganan pengguna di Supabase."""
    if not SUPABASE_URL:
        return False

    now = datetime.now(timezone.utc)
    if tier.lower() == "free":
        expiry = None
    elif duration_hours:
        expiry = now + timedelta(hours=duration_hours)
    elif duration_days:
        expiry = now + timedelta(days=duration_days)
    else:
        expiry = None

    payload: Dict[str, Any] = {
        "tier": tier.lower(),
        "subscription_expiry": expiry.isoformat() if expiry else None,
        "updated_at": now.isoformat(),
    }

    endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profiles?id=eq.{user_id}"
    headers = get_supabase_headers()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.patch(endpoint, json=payload, headers=headers)
            if resp.status_code in (200, 204):
                logger.info(f"Berhasil mengupdate user {user_id} ke tier {tier} (expiry: {expiry})")
                return True
            else:
                logger.warning(f"Gagal update tier di Supabase ({resp.status_code}): {resp.text}")
                return False
    except Exception as e:
        logger.error(f"Error saat update user tier di Supabase: {e}")
        return False
