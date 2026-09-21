# app/routers/telemetry.py
from __future__ import annotations
import logging
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, status
from pydantic import BaseModel

from app.utils.supabase_utils import record_tool_usage

logger = logging.getLogger("telemetry")
router = APIRouter(prefix="/telemetry", tags=["Telemetry & Analytics"])


class ToolUsageRequest(BaseModel):
    tool_name: str
    is_guest: bool = True
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    session_id: Optional[str] = None
    file_size_bytes: int = 0
    page_count: int = 1
    status: str = "success"
    error_message: Optional[str] = None


@router.post("/log-usage", status_code=status.HTTP_202_ACCEPTED)
async def log_tool_usage(req: ToolUsageRequest, background_tasks: BackgroundTasks):
    """
    Merekam metrik penggunaan alat PDF baik oleh pengguna anonim (tamu)
    maupun pengguna terdaftar secara asinkron tanpa memperlambat download.
    """
    background_tasks.add_task(
        record_tool_usage,
        tool_name=req.tool_name,
        is_guest=req.is_guest,
        user_id=req.user_id,
        user_email=req.user_email,
        session_id=req.session_id,
        file_size_bytes=req.file_size_bytes,
        page_count=req.page_count,
        status=req.status,
        error_message=req.error_message,
    )
    return {"status": "ok", "recorded": True}
