# app/routers/jobs.py
"""
Router untuk polling status job dan mengunduh hasil.

Endpoints:
  GET /jobs/{job_id}           — cek status job (polling oleh frontend setiap 2 detik)
  GET /jobs/{job_id}/download  — unduh file hasil saat status "done"
"""

import logging
from fastapi import APIRouter, HTTPException
from app.utils.job_store import get_job, delete_job
from app.utils.file_utils import create_file_response

router = APIRouter(prefix="/jobs", tags=["Async Jobs"])


@router.get("/{job_id}")
def get_job_status(job_id: str):
    """
    Polling status sebuah job asinkronus.

    Returns:
        {
            "job_id":   str,
            "status":   "pending" | "processing" | "done" | "error",
            "progress": int (0-100),
            "message":  str,
            "filename": str,
            "error":    str | null
        }
    """
    job = get_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=404,
            detail=f"Job '{job_id}' tidak ditemukan atau sudah kedaluwarsa (> 10 menit)."
        )

    return {
        "job_id":   job_id,
        "status":   job["status"],
        "progress": job["progress"],
        "message":  job["message"],
        "filename": job["filename"],
        "sample":   job.get("sample"),
        "error":    job.get("error"),
    }


@router.get("/{job_id}/download")
def download_job_result(job_id: str):
    """
    Mengunduh file hasil dari job yang sudah selesai (status "done").
    Setelah diunduh, job akan dihapus dari store untuk menghemat memori.
    """
    job = get_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=404,
            detail=f"Job '{job_id}' tidak ditemukan atau sudah kedaluwarsa."
        )

    if job["status"] == "error":
        raise HTTPException(
            status_code=500,
            detail=job.get("error", "Terjadi kesalahan saat memproses tugas.")
        )

    if job["status"] != "done":
        raise HTTPException(
            status_code=409,
            detail=f"Job belum selesai. Status saat ini: {job['status']} ({job['progress']}%)"
        )

    result_bytes = job.get("result")
    if not result_bytes:
        raise HTTPException(status_code=500, detail="Hasil tugas kosong atau rusak.")

    media_type = job.get("media_type")
    filename   = job.get("filename", "result")
    sample     = job.get("sample")

    # Hapus job dari memori setelah berhasil diunduh
    delete_job(job_id)
    logging.info(f"[Jobs] Downloaded and deleted job {job_id} ({filename})")

    extra_headers = {
        "Access-Control-Expose-Headers": "Content-Disposition, X-Extracted-Text-Sample",
    }
    if sample:
        # Batasi ukuran header jika teks panjang (header HTTP standar max 8KB)
        clean_sample = sample[:1000].replace("\r", " ").replace("\n", " ")
        extra_headers["X-Extracted-Text-Sample"] = clean_sample

    return create_file_response(
        content=result_bytes,
        filename=filename,
        mime_type=media_type,
        extra_headers=extra_headers,
    )

