# app/routers/payment.py
import asyncio
import hashlib
import time
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
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
from app.utils.supabase_utils import record_payment_transaction, update_supabase_user_tier, get_active_promo_price
from app.utils.payment_utils import generate_order_id, parse_order_id

logger = logging.getLogger("payment")
router = APIRouter(prefix="/payment", tags=["Payment & Subscription"])


class CreateSnapTokenRequest(BaseModel):
    plan_id: str  # "flash", "monthly", "annual"
    user_id: str
    user_email: str
    user_name: Optional[str] = None


@router.post("/create-snap-token")
async def create_snap_token(req: CreateSnapTokenRequest, background_tasks: BackgroundTasks):
    """
    Membuat transaksi Snap Midtrans dan mengembalikan token pembayaran.
    Mendukung QRIS, GoPay, ShopeePay, dan Virtual Account bank.
    Mengecek apakah ada harga promo aktif untuk plan/user ini.
    """
    plan = SUBSCRIPTION_PLANS.get(req.plan_id.lower())
    if not plan:
        raise HTTPException(status_code=400, detail=f"Paket tidak valid: {req.plan_id}")

    base_price = int(plan["price"])
    effective_price = await get_active_promo_price(req.plan_id, req.user_email, base_price)

    # Format Order ID unik terpusat via payment_utils
    order_id = generate_order_id(req.plan_id, req.user_id)

    snap = midtransclient.Snap(
        is_production=MIDTRANS_IS_PRODUCTION,
        server_key=MIDTRANS_SERVER_KEY,
        client_key=MIDTRANS_CLIENT_KEY,
    )

    param = {
        "transaction_details": {
            "order_id": order_id,
            "gross_amount": effective_price,
        },
        "item_details": [
            {
                "id": plan["id"],
                "price": effective_price,
                "quantity": 1,
                "name": f"{plan['name']}{' (Promo)' if effective_price < base_price else ''}",
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
        transaction = await asyncio.to_thread(snap.create_transaction, param)
        
        # Catat order baru ke tabel payment_transactions
        background_tasks.add_task(
            record_payment_transaction,
            order_id=order_id,
            user_id=req.user_id,
            user_email=req.user_email,
            user_name=req.user_name,
            plan_id=req.plan_id,
            amount=float(effective_price),
            status="pending",
            raw_response=transaction,
        )

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

        # Jika custom fields kosong, coba ekstrak dari format order_id via parse_order_id
        if not plan_id and order_id:
            parsed = parse_order_id(order_id)
            if parsed.get("valid"):
                plan_id = parsed.get("plan_id")

        plan = SUBSCRIPTION_PLANS.get(str(plan_id).lower(), SUBSCRIPTION_PLANS["flash"])

        if user_id:
            background_tasks.add_task(
                update_supabase_user_tier,
                user_id=user_id,
                tier=plan["tier"],
                duration_hours=plan.get("duration_hours"),
                duration_days=plan.get("duration_days"),
            )

    # Sinkronkan status transaksi di tabel payment_transactions
    background_tasks.add_task(
        record_payment_transaction,
        order_id=order_id,
        user_id=body.get("custom_field1"),
        user_email="",
        user_name=None,
        plan_id=plan_id or "flash",
        amount=float(gross_amount or 0),
        status=transaction_status,
        payment_type=body.get("payment_type"),
        settlement_time=body.get("settlement_time"),
        raw_response=body,
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
        status_resp = await asyncio.to_thread(core.transactions.status, order_id)
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

        # Sinkronkan status ke tabel payment_transactions
        await record_payment_transaction(
            order_id=order_id,
            user_id=user_id,
            user_email="",
            user_name=None,
            plan_id=plan_id or "flash",
            amount=float(status_resp.get("gross_amount") or 0),
            status=tx_status or "pending",
            payment_type=status_resp.get("payment_type"),
            settlement_time=status_resp.get("settlement_time"),
            raw_response=status_resp,
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
