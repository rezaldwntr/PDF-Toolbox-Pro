# app/utils/file_utils.py
import os
import shutil
import logging
from fastapi import UploadFile, HTTPException
from app.core.config import MAX_FILE_SIZE

def cleanup_folder(path: str):
    """Menghapus folder sementara beserta isinya."""
    try:
        if os.path.exists(path):
            shutil.rmtree(path)
            logging.info(f"Deleted temp folder: {path}")
    except Exception as e:
        logging.error(f"Error cleaning up: {e}")

def validate_file(file: UploadFile):
    """Validasi format dan ukuran file PDF."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File harus format PDF")
    
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"Ukuran file terlalu besar (Maks {MAX_FILE_SIZE/1024/1024}MB)")
