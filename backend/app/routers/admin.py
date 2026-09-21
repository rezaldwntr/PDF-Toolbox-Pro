# app/routers/admin.py
from __future__ import annotations
import logging
from typing import Optional, Dict, Any, List
from collections import Counter
from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel

from app.utils.supabase_utils import (
    fetch_user_profiles,
    fetch_payment_transactions,
    fetch_tool_usages,
    update_supabase_user_tier,
)

logger = logging.getLogger("admin")
router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

ADMIN_EMAILS = {"rezaldewantara@gmail.com"}


def verify_admin_access(x_admin_email: Optional[str] = Header(None)):
    """Memverifikasi bahwa request berasal dari email administrator resmi."""
    if not x_admin_email or x_admin_email.strip().lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Akses ditolak. Endpoint ini khusus administrator resmi.")


@router.get("/overview-stats")
async def get_admin_overview_stats(x_admin_email: Optional[str] = Header(None)):
    """Mengambil metrik agregat statistik untuk dasbor admin."""
    verify_admin_access(x_admin_email)

    # 1. Ambil data pengguna
    users = await fetch_user_profiles(limit=1000)
    tier_counts = {"free": 0, "flash": 0, "monthly": 0, "annual": 0}
    for u in users:
        t = (u.get("tier") or "free").lower()
        if t in tier_counts:
            tier_counts[t] += 1
        else:
            tier_counts["free"] += 1

    # 2. Ambil data transaksi Midtrans
    transactions = await fetch_payment_transactions(limit=1000)
    total_revenue = 0
    successful_orders = 0
    plan_revenue = {"flash": 0, "monthly": 0, "annual": 0}

    for tx in transactions:
        status = (tx.get("status") or "").lower()
        amount = float(tx.get("gross_amount") or 0)
        plan = (tx.get("plan_id") or "flash").lower()

        if status in ("settlement", "capture"):
            total_revenue += amount
            successful_orders += 1
            if plan in plan_revenue:
                plan_revenue[plan] += amount

    # 3. Ambil data log pemakaian alat
    usages = await fetch_tool_usages(limit=2000)
    total_operations = len(usages)
    guest_operations = sum(1 for u in usages if u.get("is_guest") is True)
    member_operations = total_operations - guest_operations
    successful_operations = sum(1 for u in usages if (u.get("status") or "").lower() == "success")

    tool_counter = Counter(u.get("tool_name", "unknown") for u in usages)
    top_tools = [
        {"tool_name": name, "count": count, "percent": round((count / total_operations * 100), 1) if total_operations else 0}
        for name, count in tool_counter.most_common(10)
    ]

    return {
        "users": {
            "total": len(users),
            "tiers": tier_counts,
            "pro_total": tier_counts["flash"] + tier_counts["monthly"] + tier_counts["annual"],
        },
        "revenue": {
            "total_idr": total_revenue,
            "successful_orders": successful_orders,
            "total_orders": len(transactions),
            "by_plan": plan_revenue,
        },
        "usages": {
            "total_operations": total_operations,
            "guest_operations": guest_operations,
            "member_operations": member_operations,
            "guest_percentage": round((guest_operations / total_operations * 100), 1) if total_operations else 0,
            "success_rate": round((successful_operations / total_operations * 100), 1) if total_operations else 100,
            "top_tools": top_tools,
        },
    }


@router.get("/users")
async def get_admin_users(
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=200),
    search: Optional[str] = Query(None),
    tier: Optional[str] = Query("all"),
    x_admin_email: Optional[str] = Header(None)
):
    """Mengambil daftar pengguna terdaftar lengkap dengan status langganan."""
    verify_admin_access(x_admin_email)
    offset = (page - 1) * limit
    users = await fetch_user_profiles(limit=limit, offset=offset, search=search, tier=tier)
    return {"page": page, "limit": limit, "count": len(users), "users": users}


@router.get("/transactions")
async def get_admin_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=200),
    x_admin_email: Optional[str] = Header(None)
):
    """Mengambil daftar transaksi pembayaran Midtrans."""
    verify_admin_access(x_admin_email)
    offset = (page - 1) * limit
    transactions = await fetch_payment_transactions(limit=limit, offset=offset)
    return {"page": page, "limit": limit, "count": len(transactions), "transactions": transactions}


@router.get("/tool-logs")
async def get_admin_tool_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=200),
    tool_name: Optional[str] = Query("all"),
    x_admin_email: Optional[str] = Header(None)
):
    """Mengambil log riwayat eksekusi alat (Tamu vs Pengguna)."""
    verify_admin_access(x_admin_email)
    offset = (page - 1) * limit
    logs = await fetch_tool_usages(limit=limit, offset=offset, tool_name=tool_name)
    return {"page": page, "limit": limit, "count": len(logs), "logs": logs}


class UpdateUserTierRequest(BaseModel):
    user_id: str
    tier: str
    duration_days: Optional[int] = None
    duration_hours: Optional[int] = None


@router.post("/users/update-tier")
async def admin_update_user_tier(
    req: UpdateUserTierRequest,
    x_admin_email: Optional[str] = Header(None)
):
    """Mengubah atau mereset tier langganan pengguna secara langsung oleh Admin."""
    verify_admin_access(x_admin_email)
    success = await update_supabase_user_tier(
        user_id=req.user_id,
        tier=req.tier.lower(),
        duration_days=req.duration_days,
        duration_hours=req.duration_hours,
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal memperbarui status tier pengguna di Supabase")
    return {"status": "ok", "message": f"Tier pengguna berhasil diubah ke {req.tier.upper()}"}
