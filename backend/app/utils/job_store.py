# app/utils/job_store.py
"""
Job Store - Penyimpanan status tugas asinkronus di memori.

Desain:
- Setiap request berat (convert, OCR, terjemahkan) membuat job baru dengan UUID.
- Backend mengembalikan job_id dalam 100ms via HTTP 202 Accepted.
- Frontend polling GET /jobs/{job_id} setiap 2 detik.
- Saat status "done", frontend unduh hasil via GET /jobs/{job_id}/download.
- Job otomatis dihapus setelah TTL_SECONDS (10 menit) untuk hemat memori.
"""

import time
import uuid
import logging
from typing import Optional, Dict, Any

# TTL 10 menit
JOB_TTL_SECONDS = 600

# Dict utama job store
# Struktur tiap entry:
# {
#   "status":     "pending" | "processing" | "done" | "error",
#   "progress":   0-100,
#   "message":    str,
#   "result":     bytes | None,
#   "media_type": str,
#   "filename":   str,
#   "error":      str | None,
#   "created_at": float,
#   "updated_at": float,
# }
_jobs: Dict[str, Dict[str, Any]] = {}


def _now() -> float:
    return time.monotonic()


def create_job(message: str = "Tugas sedang disiapkan...") -> str:
    """Buat job baru dan kembalikan job_id."""
    job_id = str(uuid.uuid4())
    ts = _now()
    _jobs[job_id] = {
        "status": "pending",
        "progress": 0,
        "message": message,
        "result": None,
        "media_type": "application/octet-stream",
        "filename": "result",
        "error": None,
        "created_at": ts,
        "updated_at": ts,
    }
    logging.info(f"[JobStore] Created job {job_id}")
    return job_id


def update_job(job_id: str, **kwargs):
    """Update field di job."""
    if job_id not in _jobs:
        return
    _jobs[job_id].update(kwargs)
    _jobs[job_id]["updated_at"] = _now()


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Ambil data job, atau None jika tidak ditemukan / sudah expired."""
    job = _jobs.get(job_id)
    if job is None:
        return None
    age = _now() - job["created_at"]
    if age > JOB_TTL_SECONDS:
        _jobs.pop(job_id, None)
        return None
    return job


def delete_job(job_id: str):
    """Hapus job dari store."""
    _jobs.pop(job_id, None)
    logging.info(f"[JobStore] Deleted job {job_id}")


def cleanup_expired_jobs():
    """Hapus semua job yang sudah melewati TTL."""
    cutoff = _now() - JOB_TTL_SECONDS
    expired = [jid for jid, j in list(_jobs.items()) if j["created_at"] < cutoff]
    for jid in expired:
        _jobs.pop(jid, None)
    if expired:
        logging.info(f"[JobStore] Cleaned up {len(expired)} expired jobs")
