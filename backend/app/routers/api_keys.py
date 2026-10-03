# app/routers/api_keys.py
"""
Router untuk Manajemen Kunci API & Layanan B2B Micro-API (Fase 3C).
Menyediakan endpoint untuk membuat, memeriksa, mengisi ulang kredit, serta melihat skema harga API.
Aturan Ponytail: Prosedural datar, KISS, fungsi < 50 baris, file < 250 baris.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.core.config import (
    API_PREPAID_PLANS,
    API_SUBSCRIPTION_PLANS,
    API_ENDPOINT_WEIGHTS,
)
from app.core.api_auth import (
    create_api_key_record,
    get_api_key_info,
    get_user_api_keys,
    revoke_api_key,
    top_up_api_credits,
)

router = APIRouter(prefix="/api", tags=["B2B Micro-API"])


class CreateKeyRequest(BaseModel):
    user_id: str = Field(..., description="ID Pengguna unik (Supabase/UUID)")
    user_email: Optional[str] = Field(None, description="Alamat email pengembang")
    plan_id: str = Field("sandbox", description="ID Paket awal (sandbox/starter/growth/dev_starter/dll)")
    plan_type: str = Field("prepaid", description="Tipe paket: prepaid atau subscription")


class TopUpRequest(BaseModel):
    api_key: str = Field(..., description="Kunci API yang akan diisi ulang")
    package_id: str = Field(..., description="ID paket kredit atau paket langganan")


@router.get("/pricing")
def get_api_pricing():
    """Mengembalikan daftar harga paket kredit prabayar, langganan bulanan, dan bobot endpoint."""
    return {
        "status": "success",
        "prepaid_plans": API_PREPAID_PLANS,
        "subscription_plans": API_SUBSCRIPTION_PLANS,
        "endpoint_weights": API_ENDPOINT_WEIGHTS,
        "currency": "IDR",
    }


@router.post("/keys")
def create_api_key(req: CreateKeyRequest):
    """Menghasilkan kunci API baru dengan kuota gratis Sandbox (100 request) atau paket yang ditentukan."""
    if not req.user_id:
        raise HTTPException(status_code=400, detail="user_id wajib diisi.")

    record = create_api_key_record(
        user_id=req.user_id,
        plan_id=req.plan_id,
        plan_type=req.plan_type,
        user_email=req.user_email or "",
    )
    return {
        "status": "success",
        "message": "Kunci API berhasil dibuat dengan kuota awal.",
        "data": record,
    }


@router.get("/keys/user/{user_id}")
def list_user_keys(user_id: str):
    """Mengambil daftar seluruh kunci API milik pengguna."""
    keys = get_user_api_keys(user_id)
    return {
        "status": "success",
        "count": len(keys),
        "data": keys,
    }


@router.get("/keys/{api_key}")
def inspect_api_key(api_key: str):
    """Mengecek sisa kredit, masa aktif, status, dan riwayat penggunaan sebuah kunci API."""
    info = get_api_key_info(api_key)
    if not info:
        raise HTTPException(status_code=404, detail="Kunci API tidak ditemukan.")
    return {
        "status": "success",
        "data": info,
    }


@router.delete("/keys/{api_key}")
def delete_api_key(api_key: str, user_id: str = ""):
    """Menonaktifkan kunci API secara permanen."""
    success = revoke_api_key(api_key, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Kunci API tidak ditemukan atau tidak memiliki akses.")
    return {
        "status": "success",
        "message": "Kunci API berhasil dinonaktifkan.",
    }


@router.post("/keys/top-up")
def top_up_credits(req: TopUpRequest):
    """Mengisi ulang saldo kredit kunci API berdasarkan paket yang dipilih."""
    additional_credits = 0
    new_plan_id = req.package_id

    if req.package_id in API_PREPAID_PLANS:
        additional_credits = API_PREPAID_PLANS[req.package_id]["credits"]
    elif req.package_id in API_SUBSCRIPTION_PLANS:
        additional_credits = API_SUBSCRIPTION_PLANS[req.package_id]["monthly_credits"]
    else:
        raise HTTPException(status_code=400, detail=f"Paket '{req.package_id}' tidak valid.")

    updated_record = top_up_api_credits(
        api_key=req.api_key,
        additional_credits=additional_credits,
        new_plan_id=new_plan_id,
    )

    if not updated_record:
        raise HTTPException(status_code=404, detail="Kunci API tidak ditemukan.")

    return {
        "status": "success",
        "message": f"Berhasil menambahkan {additional_credits} kredit ke kunci API.",
        "data": updated_record,
    }
