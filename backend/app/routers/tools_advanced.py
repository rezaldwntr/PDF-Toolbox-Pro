# app/routers/tools_advanced.py
import json
import logging
import asyncio
import datetime
from typing import Optional

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF

from app.core.config import MAX_FILE_SIZE
from app.utils.file_utils import (
    validate_pdf_bytes,
    get_safe_base_name,
    build_output_filename,
    create_file_response,
)
from app.utils.job_store import create_job, update_job
from app.routers.tools_helpers import (
    hex_to_rgb,
    get_target_pages,
    translate_text_chunk,
    build_pdfa_xmp,
    apply_find_and_replace,
    apply_block_edits,
)

router = APIRouter(tags=["Tools - Advanced"])


# === 1. PANGKAS PDF (CROP) ===
@router.post("/crop-pdf")
def crop_pdf(
    file: UploadFile = File(...),
    crop_x: float = Form(...),
    crop_y: float = Form(...),
    crop_width: float = Form(...),
    crop_height: float = Form(...),
    page_selection: str = Form("all"),
    current_page: int = Form(1),
    custom_pages: Optional[str] = Form(None)
):
    """Memangkas margin atau area spesifik dokumen PDF secara visual dan presisi."""
    filename = file.filename or "dokumen.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    if crop_width <= 0.01 or crop_height <= 0.01:
        raise HTTPException(status_code=400, detail="Area pangkas terlalu kecil.")

    crop_x = max(0.0, min(crop_x, 0.95))
    crop_y = max(0.0, min(crop_y, 0.95))
    crop_width = min(crop_width, 1.0 - crop_x)
    crop_height = min(crop_height, 1.0 - crop_y)

    content = file.file.read()
    validate_pdf_bytes(content, filename)
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas {max_mb} MB.")

    safe_base = get_safe_base_name(filename)
    out_filename = f"cropped-{safe_base}.pdf"

    doc = None
    try:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak.")

        if doc.needs_pass or doc.is_encrypted:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' dilindungi kata sandi.")

        doc_len = len(doc)
        if doc_len == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

        sel = (page_selection or "all").lower().strip()
        if sel == "current":
            target_indices = [max(0, min(current_page - 1, doc_len - 1))]
        else:
            target_indices = get_target_pages(doc_len, sel, custom_pages, exclude_first_page=False)

        if not target_indices:
            raise HTTPException(status_code=400, detail="Tidak ada halaman yang dipilih untuk dipangkas.")

        for idx in target_indices:
            page = doc[idx]
            rect = page.rect
            x0 = rect.x0 + (crop_x * rect.width)
            y0 = rect.y0 + (crop_y * rect.height)
            x1 = min(rect.x1, x0 + (crop_width * rect.width))
            y1 = min(rect.y1, y0 + (crop_height * rect.height))
            page.set_cropbox(fitz.Rect(x0, y0, x1, y1))

        pdf_bytes = doc.tobytes(garbage=3, deflate=True)
        return create_file_response(pdf_bytes, out_filename)

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR CROP PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal memangkas PDF: {str(e)}")
    finally:
        if doc and not doc.is_closed:
            doc.close()


# === 2. KONVERSI PDF/A (CONVERT TO ARREST ARCHIVE) ===
@router.post("/convert-pdfa")
def convert_pdfa(
    file: UploadFile = File(...),
    pdfa_part: int = Form(2),
    conformance: str = Form("b")
):
    """Mengonversi dokumen PDF menjadi format standar arsip ISO 19005 (PDF/A)."""
    filename = file.filename or "dokumen.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    try:
        part = int(pdfa_part)
    except Exception:
        part = 2
    if part not in [1, 2, 3]:
        part = 2

    conf = (conformance or "b").upper().strip()
    if conf not in ["B", "A", "U"]:
        conf = "B"
    if part == 1 and conf == "U":
        conf = "B"

    content = file.file.read()
    validate_pdf_bytes(content, filename)
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas {max_mb} MB.")

    safe_base = get_safe_base_name(filename)
    out_filename = f"pdfa-{part}{conf.lower()}-{safe_base}.pdf"

    doc = None
    try:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak.")

        if doc.needs_pass or doc.is_encrypted:
            raise HTTPException(status_code=400, detail="Berkas dilindungi kata sandi. ISO PDF/A melarang proteksi password.")

        if len(doc) == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

        now_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")
        doc_title = (doc.metadata.get("title") or safe_base).strip()
        doc_author = (doc.metadata.get("author") or "PDF Toolbox Pro User").strip()

        xmp_packet = build_pdfa_xmp(part, conf, doc_title, doc_author, now_iso)
        try:
            doc.set_xml_metadata(xmp_packet)
        except Exception as xmp_err:
            logging.warning(f"Gagal mengatur XML XMP metadata: {xmp_err}")

        meta = doc.metadata or {}
        meta["producer"] = f"PDF Toolbox Pro (ISO 19005-{part} PDF/A-{part}{conf.lower()})"
        meta["creator"] = "PDF Toolbox Pro Archival System"
        meta["title"] = doc_title
        meta["author"] = doc_author
        try:
            doc.set_metadata(meta)
        except Exception as meta_err:
            logging.warning(f"Gagal mengatur metadata dokumen: {meta_err}")

        try:
            doc.subset_fonts()
        except Exception:
            pass

        pdf_bytes = doc.tobytes(clean=True, deflate=True, garbage=3)
        return create_file_response(pdf_bytes, out_filename)

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR CONVERT PDFA: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal mengonversi dokumen ke PDF/A: {str(e)}")
    finally:
        if doc and not doc.is_closed:
            doc.close()


# === 3. SUNTING TEKS PDF (EDIT) ===
@router.post("/edit-pdf")
def edit_pdf(
    file: UploadFile = File(...),
    edit_mode: str = Form("find_replace"),
    search_text: Optional[str] = Form(None),
    replace_text: Optional[str] = Form(None),
    case_sensitive: bool = Form(False),
    page_selection: str = Form("all"),
    current_page: int = Form(1),
    custom_pages: Optional[str] = Form(None),
    edits_json: Optional[str] = Form(None)
):
    """Menyunting teks yang ada di dalam dokumen PDF (Find & Replace atau Block Edits)."""
    filename = file.filename or "dokumen.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    content = file.file.read()
    validate_pdf_bytes(content, filename)
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas {max_mb} MB.")

    safe_base = get_safe_base_name(filename)
    out_filename = build_output_filename(safe_base, prefix="edited-")

    doc = None
    try:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak.")

        if doc.needs_pass or doc.is_encrypted:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' dilindungi kata sandi.")

        doc_len = len(doc)
        if doc_len == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

        mode = (edit_mode or "find_replace").lower().strip()
        if mode == "find_replace":
            apply_find_and_replace(doc, doc_len, search_text, replace_text, case_sensitive, page_selection, current_page, custom_pages)
        elif mode == "block_edits":
            apply_block_edits(doc, doc_len, edits_json)
        else:
            raise HTTPException(status_code=400, detail=f"Mode sunting '{mode}' tidak dikenal.")

        pdf_bytes = doc.tobytes(garbage=3, deflate=True)
        return create_file_response(pdf_bytes, out_filename)

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR EDIT PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal menyunting teks PDF: {str(e)}")
    finally:
        if doc and not doc.is_closed:
            doc.close()


# === 4. OCR PDF (ASYNC JOB) ===
@router.post("/ocr-pdf", status_code=202)
async def ocr_pdf(
    file: UploadFile = File(...),
    languages: str = Form("ind+eng"),
    output_format: str = Form("pdf")
):
    """Mengenali teks dari pindaian PDF (OCR) secara asinkronus (Async Job)."""
    filename = file.filename or "dokumen.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    content = await file.read()
    validate_pdf_bytes(content, filename)
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas {max_mb} MB.")

    safe_base = get_safe_base_name(filename)
    clean_langs = (languages or "eng").strip()
    out_format = (output_format or "pdf").lower().strip()
    job_id = create_job(message="Mempersiapkan analisis OCR...")

    async def _run():
        def _do_ocr():
            update_job(job_id, status="processing", progress=10, message="Membaca struktur PDF...")
            try:
                doc = fitz.open(stream=content, filetype="pdf")
            except Exception:
                raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak.")

            if doc.needs_pass or doc.is_encrypted:
                doc.close()
                raise HTTPException(status_code=400, detail="Berkas dilindungi kata sandi.")

            doc_len = len(doc)
            if doc_len == 0:
                doc.close()
                raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

            all_extracted_text = []
            searchable_doc = fitz.open()

            for page_idx in range(doc_len):
                pct = int(15 + (page_idx / doc_len) * 75)
                update_job(job_id, progress=pct, message=f"Menjalankan OCR halaman {page_idx + 1} dari {doc_len} ({clean_langs})...")
                page = doc[page_idx]
                page_text = page.get_text()

                if len(page_text.strip()) > 50:
                    searchable_doc.insert_pdf(doc, from_page=page_idx, to_page=page_idx)
                    all_extracted_text.append(f"--- Halaman {page_idx + 1} ---\n" + page_text.strip())
                    continue

                try:
                    textpage = page.get_textpage_ocr(language=clean_langs, dpi=150, full=True)
                    ocr_text = textpage.extractText()
                    all_extracted_text.append(f"--- Halaman {page_idx + 1} ---\n" + ocr_text.strip())

                    new_page = searchable_doc.new_page(width=page.rect.width, height=page.rect.height)
                    pix = page.get_pixmap(dpi=150)
                    img_bytes = pix.tobytes("png")
                    new_page.insert_image(page.rect, stream=img_bytes)

                    words = textpage.extractWORDS()
                    for w in words:
                        w_rect = fitz.Rect(w[0], w[1], w[2], w[3])
                        w_text = w[4]
                        font_size = max(6.0, w_rect.height * 0.9)
                        new_page.insert_text(fitz.Point(w_rect.x0, w_rect.y1), w_text, fontsize=font_size, fontname="helv", render_mode=3)
                except Exception as ocr_err:
                    logging.warning(f"OCR fallback pada halaman {page_idx + 1}: {ocr_err}")
                    searchable_doc.insert_pdf(doc, from_page=page_idx, to_page=page_idx)
                    all_extracted_text.append(f"--- Halaman {page_idx + 1} ---\n" + (page_text.strip() or "[Teks tidak terdeteksi]"))

            doc.close()
            update_job(job_id, progress=92, message="Menyusun dokumen hasil OCR...")
            full_sample = "\n".join(all_extracted_text)[:500].strip()

            if out_format == "txt":
                txt_bytes = "\n\n".join(all_extracted_text).encode("utf-8")
                searchable_doc.close()
                return txt_bytes, "text/plain; charset=utf-8", f"ocr-{safe_base}.txt", full_sample

            out_pdf_bytes = searchable_doc.tobytes(garbage=3, deflate=True)
            searchable_doc.close()
            return out_pdf_bytes, "application/pdf", f"searchable-{safe_base}.pdf", full_sample

        try:
            res_bytes, media_type, out_filename, sample_text = await asyncio.to_thread(_do_ocr)
            update_job(job_id, status="done", progress=100, message="Proses OCR selesai!", result=res_bytes, media_type=media_type, filename=out_filename, sample=sample_text)
        except Exception as e:
            logging.error(f"[Job {job_id}] OCR error: {e}")
            err_msg = e.detail if isinstance(e, HTTPException) else str(e)
            update_job(job_id, status="error", error=f"Gagal memproses OCR: {err_msg}", message="Terjadi kesalahan.")

    asyncio.create_task(_run())
    return JSONResponse({"job_id": job_id, "status": "pending", "message": "Proses OCR dimulai..."}, status_code=202)


# === 5. TERJEMAHKAN PDF (ASYNC JOB) ===
@router.post("/translate-pdf", status_code=202)
async def translate_pdf(
    file: UploadFile = File(...),
    source_lang: str = Form("auto"),
    target_lang: str = Form("id"),
    output_format: str = Form("pdf"),
    page_selection: str = Form("all"),
    current_page: int = Form(1),
    custom_pages: Optional[str] = Form(None)
):
    """Menerjemahkan dokumen PDF secara asinkronus (Async Job) dengan AI Translation."""
    filename = file.filename or "dokumen.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    content = await file.read()
    validate_pdf_bytes(content, filename)
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas {max_mb} MB.")

    safe_base = get_safe_base_name(filename)
    out_format = (output_format or "pdf").lower().strip()
    src_l = (source_lang or "auto").lower().strip()
    tgt_l = (target_lang or "id").lower().strip()
    job_id = create_job(message="Mempersiapkan terjemahan dokumen AI...")

    async def _run():
        def _do_translate():
            update_job(job_id, status="processing", progress=10, message="Menganalisis tata letak dan teks dokumen...")
            try:
                doc = fitz.open(stream=content, filetype="pdf")
            except Exception:
                raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak.")

            if doc.needs_pass or doc.is_encrypted:
                doc.close()
                raise HTTPException(status_code=400, detail="Berkas dilindungi kata sandi.")

            doc_len = len(doc)
            if doc_len == 0:
                doc.close()
                raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

            sel = (page_selection or "all").lower().strip()
            if sel == "current":
                target_pages = [max(0, min(current_page - 1, doc_len - 1))]
            else:
                target_pages = get_target_pages(doc_len, sel, custom_pages, exclude_first_page=False)

            if not target_pages:
                doc.close()
                raise HTTPException(status_code=400, detail="Tidak ada halaman yang cocok.")

            all_translated_text_pages = []
            num_targets = len(target_pages)

            for idx_t, p_idx in enumerate(target_pages):
                pct = int(15 + (idx_t / max(1, num_targets)) * 75)
                update_job(job_id, progress=pct, message=f"Menerjemahkan halaman {p_idx + 1} ({idx_t + 1}/{num_targets})...")
                page = doc[p_idx]

                page_blocks = page.get_text("blocks")
                text_blocks = [b for b in page_blocks if len(b) >= 7 and b[6] == 0 and b[4].strip()]

                if len(text_blocks) == 0 or sum(len(b[4].strip()) for b in text_blocks) < 30:
                    try:
                        ocr_lang = "eng" if src_l in ("auto", "en") else (src_l if len(src_l) == 3 else "eng")
                        tp = page.get_textpage_ocr(language=ocr_lang, dpi=150, full=True)
                        ocr_blocks = tp.extractBLOCKS()
                        text_blocks = [b for b in ocr_blocks if len(b) >= 7 and b[6] == 0 and b[4].strip()]
                    except Exception as ocr_e:
                        logging.warning(f"Auto-OCR pada halaman {p_idx + 1} dilewati: {ocr_e}")

                page_extracted_translations = []
                for b in text_blocks:
                    orig_text = b[4].strip()
                    if not orig_text:
                        continue
                    trans_text = translate_text_chunk(orig_text, src_l, tgt_l)
                    page_extracted_translations.append(trans_text)

                    if out_format == "pdf":
                        rect = fitz.Rect(b[0], b[1], b[2], b[3])
                        page.add_redact_annot(rect, fill=(1, 1, 1))
                        page.apply_redactions()

                        line_count = max(1, len(orig_text.splitlines()))
                        approx_fs = max(6.0, min(24.0, (rect.height / line_count) * 0.72))
                        inserted = False
                        for fs in [approx_fs, approx_fs * 0.9, approx_fs * 0.8, approx_fs * 0.7, 7.0, 6.0]:
                            rc = page.insert_textbox(rect, trans_text, fontsize=fs, fontname="helv", color=(0, 0, 0), align=0)
                            if rc >= 0:
                                inserted = True
                                break
                        if not inserted:
                            expanded_rect = fitz.Rect(rect.x0, rect.y0, rect.x1 + 10, rect.y1 + 8)
                            page.insert_textbox(expanded_rect, trans_text, fontsize=6.0, fontname="helv", color=(0, 0, 0), align=0)

                if page_extracted_translations:
                    all_translated_text_pages.append(f"--- Halaman {p_idx + 1} ---\n" + "\n\n".join(page_extracted_translations))

            update_job(job_id, progress=92, message="Menyusun dokumen hasil terjemahan...")
            full_sample = "\n".join(all_translated_text_pages)[:500].strip()

            if out_format == "txt":
                full_txt = "\n\n".join(all_translated_text_pages) or "[Tidak ada teks yang dapat diterjemahkan]"
                txt_bytes = full_txt.encode("utf-8")
                doc.close()
                return txt_bytes, "text/plain; charset=utf-8", f"translated-{safe_base}.txt", full_sample

            pdf_bytes = doc.tobytes(garbage=3, deflate=True)
            doc.close()
            return pdf_bytes, "application/pdf", f"translated-{safe_base}.pdf", full_sample

        try:
            res_bytes, media_type, out_filename, sample_text = await asyncio.to_thread(_do_translate)
            update_job(job_id, status="done", progress=100, message="Penerjemahan selesai!", result=res_bytes, media_type=media_type, filename=out_filename, sample=sample_text)
        except Exception as e:
            logging.error(f"[Job {job_id}] Translate error: {e}")
            err_msg = e.detail if isinstance(e, HTTPException) else str(e)
            update_job(job_id, status="error", error=f"Gagal menerjemahkan dokumen: {err_msg}", message="Terjadi kesalahan.")

    asyncio.create_task(_run())
    return JSONResponse({"job_id": job_id, "status": "pending", "message": "Penerjemahan dokumen dimulai..."}, status_code=202)
