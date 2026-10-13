# app/utils/job_store.py
"""
Job Store - Penyimpanan status tugas asinkronus lintas-worker (Shared /tmp + In-Memory Cache).

Desain:
- Mendukung multi-worker Uvicorn (workers=2+) di Docker / Cloud Run dengan menyinkronkan
  metadata job (.json) dan binary hasil (.bin) di direktori bersama /tmp/pdf_toolbox_jobs.
- Setiap request berat (convert, OCR, terjemahkan) membuat job baru dengan UUID.
- Backend mengembalikan job_id dalam <100ms via HTTP 202 Accepted.
- Frontend polling GET /jobs/{job_id} dan mengunduh via GET /jobs/{job_id}/download
  tanpa pernah terkena 404 akibat perbedaan worker process.
- Job otomatis dihapus setelah TTL_SECONDS (10 menit) untuk hemat memori/tmpfs.
"""

import os
import re
import json
import time
import uuid
import logging
import tempfile
from typing import Optional, Dict, Any

# TTL 10 menit (gunakan epoch time.time() agar konsisten lintas proses worker)
JOB_TTL_SECONDS = 600

_JOB_DIR = os.path.join(tempfile.gettempdir(), "pdf_toolbox_jobs")
os.makedirs(_JOB_DIR, exist_ok=True)

_UUID_RE = re.compile(r"^[a-f0-9\-]{32,36}$", re.IGNORECASE)

# Cache lokal per-worker
_jobs: Dict[str, Dict[str, Any]] = {}


def _now() -> float:
    return time.time()


def _is_safe_job_id(job_id: str) -> bool:
    return bool(job_id and _UUID_RE.match(job_id))


def _meta_path(job_id: str) -> str:
    return os.path.join(_JOB_DIR, f"{job_id}.json")


def _bin_path(job_id: str) -> str:
    return os.path.join(_JOB_DIR, f"{job_id}.bin")


def _persist_job(job_id: str, job_data: Dict[str, Any]) -> None:
    """Simpan metadata dan binary result secara atomik ke /tmp agar terbaca oleh seluruh worker."""
    if not _is_safe_job_id(job_id):
        return
    try:
        os.makedirs(_JOB_DIR, exist_ok=True)
        pid = os.getpid()

        # Simpan binary result jika ada dan belum tersimpan di disk
        result_bytes = job_data.get("result")
        b_path = _bin_path(job_id)
        if isinstance(result_bytes, (bytes, bytearray)) and len(result_bytes) > 0:
            if not os.path.exists(b_path):
                tmp_b = f"{b_path}.tmp.{pid}"
                with open(tmp_b, "wb") as bf:
                    bf.write(result_bytes)
                os.replace(tmp_b, b_path)

        meta = {
            "status": job_data.get("status", "pending"),
            "progress": job_data.get("progress", 0),
            "message": job_data.get("message", ""),
            "media_type": job_data.get("media_type", "application/octet-stream"),
            "filename": job_data.get("filename", "result"),
            "sample": job_data.get("sample"),
            "error": job_data.get("error"),
            "created_at": job_data.get("created_at", _now()),
            "updated_at": job_data.get("updated_at", _now()),
            "has_result": bool(result_bytes) or os.path.exists(b_path),
        }
        m_path = _meta_path(job_id)
        tmp_m = f"{m_path}.tmp.{pid}"
        with open(tmp_m, "w", encoding="utf-8") as mf:
            json.dump(meta, mf)
        os.replace(tmp_m, m_path)
    except Exception as e:
        logging.warning(f"[JobStore] Gagal menyimpan state job {job_id} ke disk: {e}")


def _load_job_from_disk(job_id: str, include_result: bool = True) -> Optional[Dict[str, Any]]:
    """Muat state job dari /tmp jika dibuat atau diupdate oleh worker lain."""
    if not _is_safe_job_id(job_id):
        return None
    m_path = _meta_path(job_id)
    if not os.path.exists(m_path):
        return None
    try:
        with open(m_path, "r", encoding="utf-8") as mf:
            meta = json.load(mf)
        result_bytes = None
        if include_result and meta.get("has_result"):
            b_path = _bin_path(job_id)
            if os.path.exists(b_path):
                with open(b_path, "rb") as bf:
                    result_bytes = bf.read()
        meta["result"] = result_bytes
        return meta
    except Exception as e:
        logging.warning(f"[JobStore] Gagal membaca job {job_id} dari disk: {e}")
        return None


def create_job(message: str = "Tugas sedang disiapkan...") -> str:
    """Buat job baru dan kembalikan job_id."""
    cleanup_expired_jobs()
    job_id = str(uuid.uuid4())
    ts = _now()
    job_data = {
        "status": "pending",
        "progress": 0,
        "message": message,
        "result": None,
        "media_type": "application/octet-stream",
        "filename": "result",
        "sample": None,
        "error": None,
        "created_at": ts,
        "updated_at": ts,
    }
    _jobs[job_id] = job_data
    _persist_job(job_id, job_data)
    logging.info(f"[JobStore] Created job {job_id}")
    return job_id


def update_job(job_id: str, **kwargs):
    """Update field di job dan sinkronkan ke shared /tmp."""
    if not _is_safe_job_id(job_id):
        return
    job = _jobs.get(job_id)
    if job is None:
        job = _load_job_from_disk(job_id, include_result=False)
        if job is None:
            return
        _jobs[job_id] = job

    job.update(kwargs)
    job["updated_at"] = _now()
    _persist_job(job_id, job)


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Ambil data job terkini lintas-worker, atau None jika tidak ditemukan / sudah expired."""
    if not _is_safe_job_id(job_id):
        return None

    # Selalu baca metadata terbaru dari disk agar progress/status dari worker lain selalu sinkron
    disk_job = _load_job_from_disk(job_id, include_result=True)
    mem_job = _jobs.get(job_id)

    job = disk_job or mem_job
    if job is None:
        return None

    if mem_job and mem_job.get("result") and not job.get("result"):
        job["result"] = mem_job["result"]

    age = _now() - float(job.get("created_at", _now()))
    if age > JOB_TTL_SECONDS:
        delete_job(job_id)
        return None

    _jobs[job_id] = job
    return job


def delete_job(job_id: str):
    """Hapus job dari memori dan disk."""
    _jobs.pop(job_id, None)
    if not _is_safe_job_id(job_id):
        return
    for p in (_meta_path(job_id), _bin_path(job_id)):
        try:
            if os.path.exists(p):
                os.remove(p)
        except Exception:
            pass
    logging.info(f"[JobStore] Deleted job {job_id}")


def cleanup_expired_jobs():
    """Hapus semua job yang sudah melewati TTL dari memori dan /tmp."""
    cutoff = _now() - JOB_TTL_SECONDS
    expired = [jid for jid, j in list(_jobs.items()) if float(j.get("created_at", 0)) < cutoff]
    for jid in expired:
        delete_job(jid)

    try:
        if os.path.exists(_JOB_DIR):
            for fname in os.listdir(_JOB_DIR):
                if fname.endswith(".json"):
                    jid = fname[:-5]
                    fpath = os.path.join(_JOB_DIR, fname)
                    try:
                        if os.path.getmtime(fpath) < cutoff:
                            delete_job(jid)
                    except Exception:
                        pass
    except Exception:
        pass
