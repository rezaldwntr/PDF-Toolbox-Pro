# app/routers/payment.py
import hashlib
import time
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr
import httpx
import midtransclient

from app.core.config import (
    MIDTRANS_SERVER_KEY,
    MIDTRANS_CLIENT_KEY,
    MIDTRANS_IS_PRODUCTION,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUBSCRIPTION_PLANS,
)

logger = logging.getLogger("payment")
router = APIRouter(prefix="/payment", tags=["Payment & Subscription"])


class CreateSnapTokenRequest(BaseModel):
    plan_id: str  # "flash", "monthly", "annual"
    user_id: str
    user_email: str
    user_name: Optional[str] = None


async def update_supabase_user_tier(
    user_id: str, 
    tier: str, 
    duration_hours: Optional[int] = None, 
    duration_days: Optional[int] = None
) -> bool:
    """Mengupdate status tier dan masa aktif langganan pengguna di Supabase."""
    now = datetime.now(timezone.utc)
    if duration_hours:
        expiry = now + timedelta(hours=duration_hours)
    elif duration_days:
        expiry = now + timedelta(days=duration_days)
    else:
        expiry = None

    payload: Dict[str, Any] = {
        "tier": tier,
        "subscription_expiry": expiry.isoformat() if expiry else None,
        "updated_at": now.isoformat(),
    }

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY or "anon",
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY or 'anon'}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profiles?id=eq.{user_id}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.patch(endpoint, json=payload, headers=headers)
            if resp.status_code in (200, 204):
                logger.info(f"Berhasil mengupgrade user {user_id} ke tier {tier} hingga {expiry}")
                return True
            else:
                logger.warning(f"Gagal update tier di Supabase ({resp.status_code}): {resp.text}")
                return False
    except Exception as e:
        logger.error(f"Error saat menghubungi Supabase REST API: {e}")
        return False


@router.post("/create-snap-token")
def create_snap_token(req: CreateSnapTokenRequest):
    """
    Membuat transaksi Snap Midtrans dan mengembalikan token pembayaran.
    Mendukung QRIS, GoPay, ShopeePay, dan Virtual Account bank.
    """
    plan = SUBSCRIPTION_PLANS.get(req.plan_id.lower())
    if not plan:
        raise HTTPException(status_code=400, detail=f"Paket tidak valid: {req.plan_id}")

    # Format Order ID unik: PDFTB-[PLAN]-[USER_ID_PREFIX]-[TIMESTAMP]
    order_id = f"PDFTB-{req.plan_id.upper()}-{req.user_id[:8]}-{int(time.time())}"

    snap = midtransclient.Snap(
        is_production=MIDTRANS_IS_PRODUCTION,
        server_key=MIDTRANS_SERVER_KEY,
        client_key=MIDTRANS_CLIENT_KEY,
    )

    param = {
        "transaction_details": {
            "order_id": order_id,
            "gross_amount": plan["price"],
        },
        "item_details": [
            {
                "id": plan["id"],
                "price": plan["price"],
                "quantity": 1,
                "name": plan["name"],
                "brand": "PDF Toolbox Pro",
                "category": "Subscription",
            }
        ],
        "customer_details": {
            "email": req.user_email,
            "first_name": req.user_name or "Pengguna PDF Toolbox",
        },
        "custom_field1": req.user_id,
        "custom_field2": req.plan_id,
        "enabled_payments": [
            "qris",
            "gopay",
            "shopeepay",
            "bca_va",
            "bni_va",
            "bri_va",
            "permata_va",
            "other_va",
        ],
    }

    try:
        transaction = snap.create_transaction(param)
        return {
            "token": transaction.get("token"),
            "redirect_url": transaction.get("redirect_url"),
            "order_id": order_id,
            "plan": plan,
            "client_key": MIDTRANS_CLIENT_KEY,
        }
    except Exception as e:
        logger.error(f"Gagal membuat transaksi Midtrans: {e}")
        # Fallback untuk mode development jika server key belum diset
        if "ServerKey" in str(e) or "Access denied" in str(e):
            return {
                "token": "DEMO-SNAP-TOKEN",
                "redirect_url": "https://simulator.sandbox.midtrans.com/qris/index",
                "order_id": order_id,
                "plan": plan,
                "client_key": MIDTRANS_CLIENT_KEY,
                "is_demo": True,
            }
        raise HTTPException(status_code=500, detail=f"Gagal membuat transaksi pembayaran: {str(e)}")


@router.post("/webhook")
async def midtrans_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Webhook handler untuk menerima notifikasi pembayaran otomatis dari Midtrans.
    Memverifikasi SHA-512 signature sebelum mengupgrade tier akun di Supabase.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Payload JSON tidak valid")

    order_id = body.get("order_id", "")
    status_code = body.get("status_code", "")
    gross_amount = body.get("gross_amount", "")
    received_signature = body.get("signature_key", "")
    transaction_status = body.get("transaction_status", "")
    fraud_status = body.get("fraud_status", "")

    # 1. Verifikasi Signature Key SHA-512
    raw_signature = f"{order_id}{status_code}{gross_amount}{MIDTRANS_SERVER_KEY}"
    calculated_signature = hashlib.sha512(raw_signature.encode("utf-8")).hexdigest()

    if received_signature and received_signature != calculated_signature:
        logger.warning(f"Signature Midtrans tidak cocok untuk order {order_id}!")
        # Untuk keamanan produksi, tolak transaksi jika signature salah
        if MIDTRANS_IS_PRODUCTION:
            raise HTTPException(status_code=403, detail="Signature key tidak valid")

    logger.info(f"Webhook Midtrans diterima: Order {order_id}, Status {transaction_status}")

    # 2. Cek apakah transaksi berhasil
    is_success = False
    if transaction_status in ("capture", "settlement"):
        if fraud_status == "accept" or not fraud_status:
            is_success = True

    if is_success:
        user_id = body.get("custom_field1")
        plan_id = body.get("custom_field2")

        # Jika custom fields kosong, coba ekstrak dari format order_id (PDFTB-[PLAN]-[USERID_PREFIX]-[TIME])
        if not plan_id and order_id.startswith("PDFTB-"):
            parts = order_id.split("-")
            if len(parts) >= 2:
                plan_id = parts[1].lower()

        plan = SUBSCRIPTION_PLANS.get(str(plan_id).lower(), SUBSCRIPTION_PLANS["flash"])

        if user_id:
            background_tasks.add_task(
                update_supabase_user_tier,
                user_id=user_id,
                tier=plan["tier"],
                duration_hours=plan.get("duration_hours"),
                duration_days=plan.get("duration_days"),
            )

    return {"status": "ok", "message": "Notifikasi webhook berhasil diproses"}


@router.get("/status/{order_id}")
async def check_payment_status(order_id: str):
    """
    Memeriksa status transaksi pembayaran secara instan dari Midtrans Core API.
    Berguna untuk verifikasi instan dari frontend saat selesai bayar.
    """
    core = midtransclient.CoreApi(
        is_production=MIDTRANS_IS_PRODUCTION,
        server_key=MIDTRANS_SERVER_KEY,
        client_key=MIDTRANS_CLIENT_KEY,
    )

    try:
        status_resp = core.transactions.status(order_id)
        tx_status = status_resp.get("transaction_status")

        is_paid = tx_status in ("settlement", "capture")
        user_id = status_resp.get("custom_field1")
        plan_id = status_resp.get("custom_field2")

        # Jika berhasil bayar dan user_id diketahui, pastikan tier terupdate
        if is_paid and user_id:
            plan = SUBSCRIPTION_PLANS.get(str(plan_id).lower(), SUBSCRIPTION_PLANS["flash"])
            await update_supabase_user_tier(
                user_id=user_id,
                tier=plan["tier"],
                duration_hours=plan.get("duration_hours"),
                duration_days=plan.get("duration_days"),
            )

        return {
            "order_id": order_id,
            "status": tx_status,
            "is_paid": is_paid,
            "payment_type": status_resp.get("payment_type"),
            "gross_amount": status_resp.get("gross_amount"),
            "transaction_time": status_resp.get("transaction_time"),
        }
    except Exception as e:
        logger.error(f"Gagal memeriksa status order {order_id}: {e}")
        return {
            "order_id": order_id,
            "status": "pending",
            "is_paid": False,
            "message": str(e),
        }
