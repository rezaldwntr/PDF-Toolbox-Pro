# app/routers/storage.py
"""
Router untuk Google Cloud Storage (GCS) Presigned Upload & Processing — Tier 3.

Endpoints:
  GET  /storage/status           — Cek apakah GCS aktif dan dapat digunakan
  POST /storage/presigned-upload — Minta Signed URL untuk direct upload dari browser
  POST /storage/process-job      — Perintahkan server memproses berkas yang sudah diunggah di GCS
"""

import os
import re
import uuid
import logging
import asyncio
import tempfile
import multiprocessing
from typing import Optional, Dict, Any
from zipfile import ZipFile, ZIP_DEFLATED

from fastapi import APIRouter, HTTPException, Header, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import fitz  # PyMuPDF
from pdf2docx import Converter
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_AUTO_SIZE
import pdfplumber
import pandas as pd
from openpyxl.styles import Border, Side, Font, PatternFill
from openpyxl.utils import get_column_letter

from app.core.config import MAX_FILE_SIZE_BY_TIER, GCS_BUCKET_NAME
from app.utils.file_utils import get_tier_limit, cleanup_folder
from app.utils.job_store import create_job, update_job
from app.utils.gcs_utils import (
    is_gcs_available,
    generate_upload_signed_url,
    download_blob_to_bytes,
    delete_blob,
)
from app.routers.tools import _translate_text_chunk, _get_target_pages

router = APIRouter(prefix="/storage", tags=["Storage & Direct Upload"])


class PresignedRequest(BaseModel):
    filename: str
    file_size: int
    content_type: Optional[str] = "application/pdf"
    tier: Optional[str] = "free"


class ProcessJobRequest(BaseModel):
    blob_name: str
    action: str  # "word" | "excel" | "ppt" | "image" | "ocr" | "translate"
    options: Optional[Dict[str, Any]] = None


@router.get("/status")
def get_storage_status():
    """Mengecek apakah arsitektur GCS Direct Upload aktif dan siap digunakan."""
    available = is_gcs_available()
    return {
        "gcs_available": available,
        "bucket": GCS_BUCKET_NAME if available else None,
        "limits": {k: v // (1024 * 1024) for k, v in MAX_FILE_SIZE_BY_TIER.items()},
        "message": "GCS Direct Upload Aktif (Kapasitas hingga 500 MB)" if available else "Fallback ke Direct Multipart Upload (Maks 50-100 MB)",
    }


@router.post("/presigned-upload")
def request_presigned_upload(
    req: PresignedRequest,
    x_user_tier: Optional[str] = Header(None)
):
    """
    Menghasilkan Signed URL aman agar klien dapat mengunggah berkas besar langsung ke GCS.
    """
    effective_tier = (x_user_tier or req.tier or "free").lower().strip()
    tier_limit = get_tier_limit(effective_tier)

    if req.file_size > tier_limit:
        limit_mb = tier_limit // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"Ukuran berkas ({req.file_size / (1024 * 1024):.1f} MB) melebihi batas paket Anda ({limit_mb} MB)."
        )

    # Bersihkan nama berkas
    clean_name = re.sub(r'[^\w\-_\. ]', '_', req.filename).strip() or "dokumen.pdf"
    unique_prefix = uuid.uuid4().hex[:12]
    blob_path = f"uploads/{unique_prefix}/{clean_name}"

    content_type = req.content_type or "application/pdf"

    # Jika GCS tidak tersedia di lokal/staging, beri tahu frontend untuk fallback ke multipart
    if not is_gcs_available():
        return {
            "success": True,
            "use_gcs": False,
            "fallback_to_multipart": True,
            "message": "GCS belum dikonfigurasi pada server ini. Sistem beralih otomatis ke upload langsung."
        }

    signed_info = generate_upload_signed_url(blob_path, content_type=content_type, expiration_minutes=15)
    if not signed_info:
        return {
            "success": True,
            "use_gcs": False,
            "fallback_to_multipart": True,
            "message": "Gagal membuat Signed URL. Sistem beralih ke upload langsung."
        }

    return {
        "success": True,
        "use_gcs": True,
        "upload_url": signed_info["upload_url"],
        "blob_name": signed_info["blob_name"],
        "method": "PUT",
        "expires_in": signed_info["expires_in"],
        "content_type": content_type,
    }


@router.post("/process-job", status_code=status.HTTP_202_ACCEPTED)
async def process_gcs_job(req: ProcessJobRequest):
    """
    Menerima notifikasi setelah upload ke GCS selesai dan memulai pemrosesan asinkronus.
    """
    blob_name = req.blob_name
    action = req.action.lower().strip()
    opts = req.options or {}

    raw_filename = os.path.basename(blob_name)
    base_name = os.path.splitext(raw_filename)[0]

    job_id = create_job(message=f"Mempersiapkan pemrosesan berkas {action.upper()} dari penyimpanan awan...")

    async def _run_gcs_task():
        try:
            update_job(job_id, status="processing", progress=5, message="Mengunduh berkas dari Google Cloud Storage...")
            pdf_bytes = await asyncio.to_thread(download_blob_to_bytes, blob_name)
            if not pdf_bytes:
                raise ValueError("Berkas tidak ditemukan atau belum selesai diunggah ke penyimpanan awan.")

            update_job(job_id, progress=15, message="Memverifikasi integritas dokumen...")

            # ROUTING PEMROSESAN SESUAI AKSI
            if action == "word":
                await _process_word(job_id, pdf_bytes, base_name, opts)
            elif action == "excel":
                await _process_excel(job_id, pdf_bytes, base_name, opts)
            elif action == "ppt":
                await _process_ppt(job_id, pdf_bytes, base_name, opts)
            elif action == "image":
                await _process_image(job_id, pdf_bytes, base_name, opts)
            elif action == "ocr":
                await _process_ocr(job_id, pdf_bytes, base_name, opts)
            elif action == "translate":
                await _process_translate(job_id, pdf_bytes, base_name, opts)
            else:
                raise ValueError(f"Aksi '{action}' tidak didukung.")

        except Exception as e:
            logging.error(f"[GCS Job {job_id}] Kesalahan pemrosesan: {e}")
            update_job(job_id, status="error", error=f"Gagal memproses dokumen: {str(e)}", message="Terjadi kesalahan.")
        finally:
            # Hapus blob sementara di GCS
            await asyncio.to_thread(delete_blob, blob_name)

    asyncio.create_task(_run_gcs_task())
    return JSONResponse({"job_id": job_id, "status": "pending", "message": f"Tugas {action} dimulai..."}, status_code=202)


# ===========================================================================
# HELPER PEMROSES INTERNAL GCS
# ===========================================================================

async def _process_word(job_id: str, pdf_bytes: bytes, base_name: str, opts: dict):
    tmp_dir = tempfile.mkdtemp()
    docx_filename = f"{base_name}.docx"
    tmp_pdf = os.path.join(tmp_dir, f"input_{base_name}.pdf")
    tmp_docx = os.path.join(tmp_dir, docx_filename)

    def _convert():
        with open(tmp_pdf, "wb") as f:
            f.write(pdf_bytes)

        update_job(job_id, progress=25, message="Menganalisis layout dan tabel dokumen...")
        cpu_cores = max(1, multiprocessing.cpu_count())
        use_multi = cpu_cores > 1

        cv = Converter(tmp_pdf)
        try:
            update_job(job_id, progress=50, message="Mengonversi halaman ke format Word...")
            cv.convert(tmp_docx, multi_processing=use_multi, cpu_count=cpu_cores)
        finally:
            cv.close()

        update_job(job_id, progress=90, message="Merakit berkas Word final...")
        with open(tmp_docx, "rb") as out_f:
            return out_f.read()

    try:
        res = await asyncio.to_thread(_convert)
        update_job(
            job_id,
            status="done",
            progress=100,
            message="Konversi Word selesai!",
            result=res,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=docx_filename,
        )
    finally:
        cleanup_folder(tmp_dir)


async def _process_excel(job_id: str, pdf_bytes: bytes, base_name: str, opts: dict):
    tmp_dir = tempfile.mkdtemp()
    xlsx_filename = f"{base_name}.xlsx"
    tmp_pdf = os.path.join(tmp_dir, f"input_{base_name}.pdf")
    tmp_xlsx = os.path.join(tmp_dir, xlsx_filename)
    mode = opts.get("mode", "tables_only")
    sheet_per_page = opts.get("sheet_per_page", False)

    def _convert():
        with open(tmp_pdf, "wb") as f:
            f.write(pdf_bytes)

        update_job(job_id, progress=25, message="Mendeteksi dan mengekstrak tabel...")
        doc = fitz.open(tmp_pdf)
        num_pages = len(doc)

        with pd.ExcelWriter(tmp_xlsx, engine='openpyxl') as writer:
            wb = writer.book
            ws = wb.create_sheet(title="Hasil Ekstraksi")
            cur_row = 1
            for page_idx in range(num_pages):
                page = doc[page_idx]
                if hasattr(page, 'find_tables'):
                    tabs = page.find_tables()
                    for tab in tabs:
                        for row in tab.extract():
                            for c_idx, val in enumerate(row, 1):
                                ws.cell(row=cur_row, column=c_idx, value=str(val or ""))
                            cur_row += 1
                        cur_row += 1
            if "Sheet" in wb.sheetnames and len(wb.sheetnames) > 1:
                del wb["Sheet"]
        doc.close()

        with open(tmp_xlsx, "rb") as out_f:
            return out_f.read()

    try:
        res = await asyncio.to_thread(_convert)
        update_job(
            job_id,
            status="done",
            progress=100,
            message="Konversi Excel selesai!",
            result=res,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=xlsx_filename,
        )
    finally:
        cleanup_folder(tmp_dir)


async def _process_ppt(job_id: str, pdf_bytes: bytes, base_name: str, opts: dict):
    tmp_dir = tempfile.mkdtemp()
    ppt_filename = f"{base_name}.pptx"
    tmp_pdf = os.path.join(tmp_dir, f"input_{base_name}.pdf")
    tmp_ppt = os.path.join(tmp_dir, ppt_filename)

    def _convert():
        with open(tmp_pdf, "wb") as f:
            f.write(pdf_bytes)

        update_job(job_id, progress=30, message="Menyusun slide presentasi PowerPoint...")
        prs = Presentation()
        doc = fitz.open(tmp_pdf)
        if len(doc) > 0:
            prs.slide_width = int((doc[0].rect.width / 72) * 914400)
            prs.slide_height = int((doc[0].rect.height / 72) * 914400)

        blank = prs.slide_layouts[6]
        for i, page in enumerate(doc):
            slide = prs.slides.add_slide(blank)
            pix = page.get_pixmap(dpi=150)
            img_p = os.path.join(tmp_dir, f"bg_{i}.png")
            pix.save(img_p)
            slide.shapes.add_picture(img_p, 0, 0, width=prs.slide_width, height=prs.slide_height)

        doc.close()
        prs.save(tmp_ppt)

        with open(tmp_ppt, "rb") as out_f:
            return out_f.read()

    try:
        res = await asyncio.to_thread(_convert)
        update_job(
            job_id,
            status="done",
            progress=100,
            message="Konversi PowerPoint selesai!",
            result=res,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            filename=ppt_filename,
        )
    finally:
        cleanup_folder(tmp_dir)


async def _process_image(job_id: str, pdf_bytes: bytes, base_name: str, opts: dict):
    fmt = opts.get("output_format", "jpg").lower()
    target_dpi = 300 if opts.get("dpi", 150) >= 300 else 150

    def _convert():
        update_job(job_id, progress=25, message="Merender halaman PDF ke citra resolusi tinggi...")
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        num_pages = len(doc)

        if num_pages == 1:
            pix = doc[0].get_pixmap(dpi=target_dpi)
            b = pix.tobytes("jpeg" if fmt == "jpg" else "png")
            doc.close()
            return b, f"image/{'jpeg' if fmt == 'jpg' else 'png'}", f"{base_name}.{fmt}"

        zip_buffer = io.BytesIO()
        with ZipFile(zip_buffer, 'w', compression=ZIP_DEFLATED) as zipf:
            for i, page in enumerate(doc):
                pct = int(25 + (i / num_pages) * 65)
                update_job(job_id, progress=pct, message=f"Merender halaman {i + 1} dari {num_pages}...")
                pix = page.get_pixmap(dpi=target_dpi)
                zipf.writestr(f"page_{i + 1}.{fmt}", pix.tobytes("jpeg" if fmt == "jpg" else "png"))
        doc.close()
        return zip_buffer.getvalue(), "application/zip", f"{base_name}_images.zip"

    res, mtype, fname = await asyncio.to_thread(_convert)
    update_job(job_id, status="done", progress=100, message="Konversi gambar selesai!", result=res, media_type=mtype, filename=fname)


async def _process_ocr(job_id: str, pdf_bytes: bytes, base_name: str, opts: dict):
    clean_langs = opts.get("languages", "ind+eng")
    out_fmt = opts.get("output_format", "pdf")

    def _convert():
        update_job(job_id, progress=20, message=f"Menjalankan OCR ({clean_langs})...")
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        doc_len = len(doc)
        searchable_doc = fitz.open()
        texts = []

        for p_idx in range(doc_len):
            pct = int(20 + (p_idx / doc_len) * 70)
            update_job(job_id, progress=pct, message=f"Menganalisis halaman {p_idx + 1} dari {doc_len}...")
            page = doc[p_idx]
            textpage = page.get_textpage_ocr(language=clean_langs, dpi=150, full=True)
            ocr_text = textpage.extractText()
            texts.append(f"--- Halaman {p_idx + 1} ---\n" + ocr_text.strip())

            new_p = searchable_doc.new_page(width=page.rect.width, height=page.rect.height)
            pix = page.get_pixmap(dpi=150)
            new_p.insert_image(page.rect, stream=pix.tobytes("png"))

            for w in textpage.extractWORDS():
                w_rect = fitz.Rect(w[0], w[1], w[2], w[3])
                new_p.insert_text(fitz.Point(w_rect.x0, w_rect.y1), w[4], fontsize=max(6.0, w_rect.height * 0.9), fontname="helv", render_mode=3)

        doc.close()
        sample = "\n".join(texts)[:500].strip()

        if out_fmt == "txt":
            searchable_doc.close()
            return "\n\n".join(texts).encode("utf-8"), "text/plain; charset=utf-8", f"ocr-{base_name}.txt", sample

        out_pdf = searchable_doc.tobytes(garbage=3, deflate=True)
        searchable_doc.close()
        return out_pdf, "application/pdf", f"searchable-{base_name}.pdf", sample

    res, mtype, fname, sample = await asyncio.to_thread(_convert)
    update_job(job_id, status="done", progress=100, message="OCR selesai!", result=res, media_type=mtype, filename=fname, sample=sample)


async def _process_translate(job_id: str, pdf_bytes: bytes, base_name: str, opts: dict):
    src_l = opts.get("source_lang", "auto")
    tgt_l = opts.get("target_lang", "id")
    out_fmt = opts.get("output_format", "pdf")

    def _convert():
        update_job(job_id, progress=20, message="Menganalisis tata letak dokumen...")
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        doc_len = len(doc)
        all_texts = []

        for p_idx in range(doc_len):
            pct = int(20 + (p_idx / doc_len) * 70)
            update_job(job_id, progress=pct, message=f"Menerjemahkan halaman {p_idx + 1} dari {doc_len}...")
            page = doc[p_idx]
            blocks = [b for b in page.get_text("blocks") if len(b) >= 7 and b[6] == 0 and b[4].strip()]
            p_trans = []
            for b in blocks:
                orig = b[4].strip()
                if not orig:
                    continue
                tr = _translate_text_chunk(orig, src_l, tgt_l)
                p_trans.append(tr)
                if out_fmt == "pdf":
                    rect = fitz.Rect(b[0], b[1], b[2], b[3])
                    page.add_redact_annot(rect, fill=(1, 1, 1))
                    page.apply_redactions()
                    page.insert_textbox(rect, tr, fontsize=9.0, fontname="helv", color=(0, 0, 0), align=0)
            if p_trans:
                all_texts.append(f"--- Halaman {p_idx + 1} ---\n" + "\n\n".join(p_trans))

        sample = "\n".join(all_texts)[:500].strip()

        if out_fmt == "txt":
            doc.close()
            return "\n\n".join(all_texts).encode("utf-8"), "text/plain; charset=utf-8", f"translated-{base_name}.txt", sample

        pdf_out = doc.tobytes(garbage=3, deflate=True)
        doc.close()
        return pdf_out, "application/pdf", f"translated-{base_name}.pdf", sample

    res, mtype, fname, sample = await asyncio.to_thread(_convert)
    update_job(job_id, status="done", progress=100, message="Terjemahan selesai!", result=res, media_type=mtype, filename=fname, sample=sample)
