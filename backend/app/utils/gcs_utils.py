# app/utils/gcs_utils.py
"""
Google Cloud Storage (GCS) Utility Module — Tier 3 Architecture.

Menyediakan:
1. Pembuatan Presigned Upload URL (v4 Signed URL) untuk upload langsung dari browser ke GCS,
   melewati batasan HTTP multipart Cloud Run (32 MB) dan membuka batas 100 MB - 500 MB.
2. Pengambilan biner stream file dari GCS ke server Cloud Run melalui jaringan internal Google.
3. Pembersihan otomatis (delete blob) setelah tugas selesai.
4. Deteksi otomatis ketersediaan GCS dengan fallback graceful jika di lingkungan lokal tanpa kredensial.
"""

import os
import logging
import datetime
from typing import Optional, Dict, Any

from app.core.config import GCS_BUCKET_NAME, GCS_PROJECT_ID, GCS_ENABLED

# Lazy-loaded GCS Client
_gcs_client = None
_gcs_available: Optional[bool] = None


def get_gcs_client():
    """Mengambil atau menginisialisasi Google Cloud Storage Client (Singleton)."""
    global _gcs_client, _gcs_available
    if not GCS_ENABLED:
        _gcs_available = False
        return None

    if _gcs_client is not None:
        return _gcs_client

    try:
        from google.cloud import storage
        # Di Cloud Run, Application Default Credentials (ADC) aktif otomatis
        # Di lokal, bisa membaca GOOGLE_APPLICATION_CREDENTIALS jika ada
        _gcs_client = storage.Client(project=GCS_PROJECT_ID if GCS_PROJECT_ID else None)
        _gcs_available = True
        logging.info(f"[GCS] Inisialisasi GCS Client sukses (Bucket target: {GCS_BUCKET_NAME})")
        return _gcs_client
    except Exception as e:
        logging.warning(f"[GCS] GCS Client tidak tersedia ({e}). Sistem akan menggunakan fallback direct multipart.")
        _gcs_available = False
        return None


def is_gcs_available() -> bool:
    """Mengecek apakah GCS aktif dan dapat diakses."""
    if _gcs_available is not None:
        return _gcs_available
    client = get_gcs_client()
    return client is not None


def generate_upload_signed_url(
    blob_name: str,
    content_type: str = "application/pdf",
    expiration_minutes: int = 15,
) -> Optional[Dict[str, Any]]:
    """
    Menghasilkan v4 Signed URL metode PUT agar browser pengguna dapat mengunggah
    file langsung ke Google Cloud Storage tanpa membebani server backend.
    """
    client = get_gcs_client()
    if not client:
        return None

    try:
        bucket = client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(blob_name)

        url = blob.generate_signed_url(
            version="v4",
            expiration=datetime.timedelta(minutes=expiration_minutes),
            method="PUT",
            content_type=content_type,
        )

        return {
            "upload_url": url,
            "blob_name": blob_name,
            "bucket": GCS_BUCKET_NAME,
            "method": "PUT",
            "expires_in": expiration_minutes * 60,
            "content_type": content_type,
        }
    except Exception as e:
        logging.error(f"[GCS] Gagal membuat signed URL untuk {blob_name}: {e}")
        return None


def download_blob_to_bytes(blob_name: str) -> Optional[bytes]:
    """Mengunduh konten berkas dari GCS ke memori biner server."""
    client = get_gcs_client()
    if not client:
        return None

    try:
        bucket = client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(blob_name)
        if not blob.exists():
            logging.error(f"[GCS] Blob {blob_name} tidak ditemukan di bucket {GCS_BUCKET_NAME}")
            return None
        return blob.download_as_bytes()
    except Exception as e:
        logging.error(f"[GCS] Gagal mengunduh blob {blob_name}: {e}")
        return None


def download_blob_to_file(blob_name: str, local_path: str) -> bool:
    """Mengunduh berkas dari GCS langsung ke file lokal disk."""
    client = get_gcs_client()
    if not client:
        return False

    try:
        bucket = client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(blob_name)
        if not blob.exists():
            return False
        blob.download_to_filename(local_path)
        return True
    except Exception as e:
        logging.error(f"[GCS] Gagal mengunduh blob {blob_name} ke {local_path}: {e}")
        return False


def delete_blob(blob_name: str) -> bool:
    """Menghapus blob sementara dari GCS setelah pemrosesan selesai untuk efisiensi biaya."""
    client = get_gcs_client()
    if not client:
        return False

    try:
        bucket = client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(blob_name)
        if blob.exists():
            blob.delete()
            logging.info(f"[GCS] Berhasil menghapus temporary blob: {blob_name}")
        return True
    except Exception as e:
        logging.warning(f"[GCS] Gagal menghapus blob {blob_name}: {e}")
        return False
