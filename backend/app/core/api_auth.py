# app/core/api_auth.py
"""
Modul Otentikasi dan Manajemen Kuota B2B Micro-API (Fase 3C).
Mendukung skema ganda: Paket Kredit Prabayar (Pay-As-You-Go) & Langganan Bulanan Developer.
Aturan Ponytail: Prosedural datar, KISS, fungsi < 50 baris, file < 300 baris.
"""
import os
import json
import secrets
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from fastapi import Header, HTTPException

from app.core.config import (
    API_ENDPOINT_WEIGHTS,
    API_PREPAID_PLANS,
    API_SUBSCRIPTION_PLANS,
)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
KEYS_FILE = os.path.join(DATA_DIR, "api_keys.json")

# In-Memory Cache untuk akses berkecepatan mikrodetik
_API_KEYS_STORE: Dict[str, Dict[str, Any]] = {}


def _load_keys_from_disk() -> None:
    """Memuat data API Keys dari berkas JSON lokal ke memori."""
    global _API_KEYS_STORE
    if os.path.exists(KEYS_FILE):
        try:
            with open(KEYS_FILE, "r", encoding="utf-8") as f:
                _API_KEYS_STORE = json.load(f)
        except Exception as err:
            logging.error(f"[API Auth] Gagal membaca {KEYS_FILE}: {err}")
            _API_KEYS_STORE = {}


def _save_keys_to_disk() -> None:
    """Menyimpan data API Keys dari memori ke berkas JSON lokal secara aman."""
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(KEYS_FILE, "w", encoding="utf-8") as f:
            json.dump(_API_KEYS_STORE, f, indent=2, ensure_ascii=False)
    except Exception as err:
        logging.error(f"[API Auth] Gagal menyimpan {KEYS_FILE}: {err}")


# Inisialisasi awal saat modul dimuat
_load_keys_from_disk()


def generate_new_api_key(is_sandbox: bool = False) -> str:
    """Menghasilkan kunci API acak aman dengan awalan ptpro."""
    prefix = "ptpro_sandbox" if is_sandbox else "ptpro_live"
    random_token = secrets.token_urlsafe(24).replace("-", "").replace("_", "")[:28]
    return f"{prefix}_{random_token}"


def create_api_key_record(
    user_id: str,
    plan_id: str = "sandbox",
    plan_type: str = "prepaid",
    user_email: str = ""
) -> Dict[str, Any]:
    """Membuat entitas API Key baru dengan kuota awal sesuai paket yang dipilih."""
    api_key = generate_new_api_key(is_sandbox=(plan_id == "sandbox"))
    now_iso = datetime.now(timezone.utc).isoformat()

    if plan_type == "subscription" and plan_id in API_SUBSCRIPTION_PLANS:
        plan_info = API_SUBSCRIPTION_PLANS[plan_id]
        credits = plan_info["monthly_credits"]
        rate_limit = plan_info["rate_limit_rps"]
    else:
        plan_info = API_PREPAID_PLANS.get(plan_id, API_PREPAID_PLANS["sandbox"])
        credits = plan_info["credits"]
        rate_limit = plan_info["rate_limit_rps"]

    record = {
        "api_key": api_key,
        "user_id": user_id,
        "user_email": user_email,
        "plan_type": plan_type,
        "plan_id": plan_id,
        "plan_name": plan_info["name"],
        "credits_total": credits,
        "credits_remaining": credits,
        "rate_limit_rps": rate_limit,
        "is_active": True,
        "total_calls": 0,
        "created_at": now_iso,
        "last_used_at": None,
    }

    _API_KEYS_STORE[api_key] = record
    _save_keys_to_disk()
    return record


def get_api_key_info(api_key: str) -> Optional[Dict[str, Any]]:
    """Mengambil informasi detail API Key."""
    return _API_KEYS_STORE.get(api_key)


def get_user_api_keys(user_id: str) -> list:
    """Mengambil seluruh daftar API Key milik seorang user."""
    return [rec for rec in _API_KEYS_STORE.values() if rec.get("user_id") == user_id]


def revoke_api_key(api_key: str, user_id: str) -> bool:
    """Menonaktifkan kunci API secara permanen."""
    if api_key in _API_KEYS_STORE:
        if _API_KEYS_STORE[api_key].get("user_id") == user_id or not user_id:
            _API_KEYS_STORE[api_key]["is_active"] = False
            _save_keys_to_disk()
            return True
    return False


def top_up_api_credits(api_key: str, additional_credits: int, new_plan_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Menambahkan saldo kredit API setelah pembayaran berhasil diverifikasi."""
    if api_key in _API_KEYS_STORE:
        record = _API_KEYS_STORE[api_key]
        record["credits_remaining"] += additional_credits
        record["credits_total"] += additional_credits
        if new_plan_id:
            record["plan_id"] = new_plan_id
            if new_plan_id in API_PREPAID_PLANS:
                record["plan_name"] = API_PREPAID_PLANS[new_plan_id]["name"]
                record["plan_type"] = "prepaid"
            elif new_plan_id in API_SUBSCRIPTION_PLANS:
                record["plan_name"] = API_SUBSCRIPTION_PLANS[new_plan_id]["name"]
                record["plan_type"] = "subscription"
        _save_keys_to_disk()
        return record
    return None


def validate_and_deduct_credits(api_key: str, endpoint_name: str) -> Tuple[bool, int, Dict[str, Any]]:
    """
    Validasi API Key dan pemotongan kredit berdasarkan bobot endpoint.
    Return: (is_success, credits_cost, record)
    """
    record = _API_KEYS_STORE.get(api_key)
    if not record or not record.get("is_active"):
        return False, 0, {}

    # Hitung bobot kredit untuk endpoint ini
    cost = API_ENDPOINT_WEIGHTS.get(endpoint_name, API_ENDPOINT_WEIGHTS["default"])
    remaining = record.get("credits_remaining", 0)

    if remaining < cost:
        return False, cost, record

    # Potong saldo kredit & catat aktivitas
    record["credits_remaining"] -= cost
    record["total_calls"] += 1
    record["last_used_at"] = datetime.now(timezone.utc).isoformat()
    _save_keys_to_disk()

    return True, cost, record


def verify_micro_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    endpoint_name: str = "default"
) -> Optional[Dict[str, Any]]:
    """FastAPI Dependency untuk memvalidasi header X-API-Key pada request."""
    if not x_api_key:
        return None

    success, cost, record = validate_and_deduct_credits(x_api_key, endpoint_name)
    if not record:
        raise HTTPException(status_code=401, detail="X-API-Key tidak valid atau telah dinonaktifkan.")

    if not success:
        raise HTTPException(
            status_code=429,
            detail=f"Saldo kredit API Anda tidak mencukupi (Sisa: {record.get('credits_remaining', 0)}, Butuh: {cost}). Silakan top up di dashboard pengembang."
        )

    return record
