# app/utils/file_utils.py
import os
import shutil
import logging
from fastapi import UploadFile, HTTPException
from app.core.config import MAX_FILE_SIZE, MAX_FILE_SIZE_BY_TIER


def cleanup_folder(path: str):
    """Menghapus folder sementara beserta isinya."""
    try:
        if os.path.exists(path):
            shutil.rmtree(path)
            logging.info(f"Deleted temp folder: {path}")
    except Exception as e:
        logging.error(f"Error cleaning up: {e}")


def get_tier_limit(tier: str | None) -> int:
    """Mengembalikan batas ukuran file (bytes) sesuai tier pengguna."""
    if not tier:
        return MAX_FILE_SIZE
    return MAX_FILE_SIZE_BY_TIER.get(tier, MAX_FILE_SIZE)


def validate_file(file: UploadFile, tier: str | None = None):
    """
    Validasi format dan ukuran file PDF.

    Args:
        file: File yang diunggah pengguna.
        tier: Tier langganan pengguna ('guest', 'free', 'flash', 'monthly', 'annual').
              Jika None, menggunakan batas default (50 MB).
    """
    # 1. Validasi ekstensi
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Format berkas tidak valid. Hanya berkas PDF (.pdf) yang diterima."
        )

    # 2. Baca ukuran berkas
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    # 3. Tentukan batas berdasarkan tier
    limit_bytes = get_tier_limit(tier)
    limit_mb = limit_bytes // (1024 * 1024)

    if file_size > limit_bytes:
        actual_mb = file_size / (1024 * 1024)
        if tier and tier in ("monthly", "annual"):
            # Pesan khusus untuk pengguna Pro — jelaskan roadmap upgrade
            detail = (
                f"Berkas terlalu besar ({actual_mb:.1f} MB). "
                f"Batas saat ini untuk tier {tier} adalah {limit_mb} MB. "
                f"Dukungan berkas hingga 250–500 MB via Cloud Storage sedang dalam pengembangan "
                f"dan akan segera tersedia untuk pelanggan Pro."
            )
        elif tier and tier == "flash":
            detail = (
                f"Berkas terlalu besar ({actual_mb:.1f} MB). "
                f"Flash Pass mendukung berkas hingga {limit_mb} MB."
            )
        else:
            detail = (
                f"Berkas terlalu besar ({actual_mb:.1f} MB). "
                f"Batas maksimal untuk akun Anda adalah {limit_mb} MB. "
                f"Tingkatkan paket untuk memproses berkas lebih besar."
            )
        raise HTTPException(status_code=400, detail=detail)

