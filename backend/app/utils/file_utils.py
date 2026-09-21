# app/utils/file_utils.py
from __future__ import annotations
import os
import shutil
import logging
from typing import Optional
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


def get_tier_limit(tier: Optional[str] = None) -> int:
    """Mengembalikan batas ukuran file (bytes) sesuai tier pengguna."""
    if not tier:
        return MAX_FILE_SIZE
    return MAX_FILE_SIZE_BY_TIER.get(tier, MAX_FILE_SIZE)


def validate_pdf_bytes(content: bytes, filename: str = "dokumen.pdf"):
    """
    Validasi magic bytes dokumen PDF (%PDF-).
    Mencegah berkas berbahaya atau injeksi biner dengan ekstensi .pdf palsu.
    """
    if not content or not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail=f"Berkas '{filename}' bukan format dokumen PDF yang sah (header berkas biner tidak valid)."
        )


def validate_file(file: UploadFile, tier: Optional[str] = None):
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

    # 2. Validasi Magic Bytes (Header biner dokumen PDF sah harus diawali '%PDF-')
    header = file.file.read(5)
    file.file.seek(0)
    if not header.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="Berkas bukan format dokumen PDF yang sah (header berkas tidak valid)."
        )

    # 3. Baca ukuran berkas
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    # 4. Tentukan batas berdasarkan tier
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

