# app/routers/tools_core.py
import io
import logging
from typing import List, Optional
from enum import Enum
from zipfile import ZipFile, ZIP_DEFLATED

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
import fitz  # PyMuPDF
from PIL import Image

from app.core.config import MAX_FILE_SIZE
from app.utils.file_utils import (
    validate_pdf_bytes,
    get_safe_base_name,
    create_file_response,
)

router = APIRouter(tags=["Tools - Core"])


class SplitType(str, Enum):
    EXTRACT = "extract"
    FIXED = "fixed"
    ALL = "all"


class CompressionType(str, Enum):
    EXTREME = "extreme"
    HIGH = "high"
    RECOMMENDED = "recommended"
    LOW = "low"
    TARGET = "target"


def optimize_embedded_images(doc, max_dimension: int, quality: int):
    """Mengompres dan mengecilkan gambar yang tertanam (XObject) di PDF secara in-memory."""
    try:
        from PIL import Image
    except ImportError:
        return

    processed_xrefs = set()
    for page in doc:
        try:
            image_list = page.get_images(full=True)
        except Exception:
            continue

        for img_info in image_list:
            xref = img_info[0]
            if xref in processed_xrefs:
                continue
            processed_xrefs.add(xref)

            try:
                base_image = doc.extract_image(xref)
                if not base_image:
                    continue

                orig_bytes = base_image.get("image")
                if not orig_bytes or len(orig_bytes) < 15 * 1024:
                    continue

                pil_img = Image.open(io.BytesIO(orig_bytes))
                w, h = pil_img.size

                needs_resize = max(w, h) > max_dimension
                if needs_resize:
                    scale = max_dimension / max(w, h)
                    new_w = max(1, int(w * scale))
                    new_h = max(1, int(h * scale))
                    pil_img = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

                out_buf = io.BytesIO()
                if pil_img.mode in ("RGBA", "LA") or (pil_img.mode == "P" and "transparency" in pil_img.info):
                    pil_img.save(out_buf, format="PNG", optimize=True)
                else:
                    if pil_img.mode != "RGB":
                        pil_img = pil_img.convert("RGB")
                    pil_img.save(out_buf, format="JPEG", quality=quality, optimize=True)

                new_bytes = out_buf.getvalue()
                if len(new_bytes) < len(orig_bytes) * 0.92:
                    try:
                        page.replace_image(xref, stream=new_bytes)
                    except Exception:
                        pass
            except Exception as err:
                logging.debug(f"Lewati optimasi gambar xref {xref}: {err}")


def _parse_split_pages(pages_str: str, total_pages: int) -> List[int]:
    """Parse string rentang halaman seperti '1-5, 7, 10' menjadi daftar index 0-based."""
    selected_indices = []
    for part in pages_str.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            tokens = part.split("-")
            if len(tokens) == 2 and tokens[0].strip().isdigit() and tokens[1].strip().isdigit():
                s, e = int(tokens[0].strip()), int(tokens[1].strip())
                step = 1 if s <= e else -1
                for p in range(s, e + step, step):
                    if 1 <= p <= total_pages:
                        selected_indices.append(p - 1)
            else:
                raise ValueError()
        elif part.isdigit():
            p = int(part)
            if 1 <= p <= total_pages:
                selected_indices.append(p - 1)
        else:
            raise ValueError()
    return selected_indices


def _split_extract(src_doc, pages_str: str, total_pages: int, safe_base: str):
    """Ekstraksi halaman tertentu menjadi satu PDF gabungan."""
    try:
        selected_indices = _parse_split_pages(pages_str, total_pages)
    except Exception:
        raise HTTPException(status_code=400, detail="Format halaman tidak valid. Gunakan format seperti: 1-5, 7, 10")

    if not selected_indices:
        raise HTTPException(
            status_code=400,
            detail=f"Halaman yang dipilih berada di luar jangkauan dokumen (Total: {total_pages} halaman)."
        )

    new_doc = fitz.open()
    for idx in selected_indices:
        new_doc.insert_pdf(src_doc, from_page=idx, to_page=idx)

    pdf_bytes = new_doc.tobytes(garbage=3, deflate=True)
    new_doc.close()
    return create_file_response(pdf_bytes, f"{safe_base}_extracted.pdf")


def _split_fixed(src_doc, fixed_step: int, total_pages: int, safe_base: str):
    """Pecah PDF setiap X halaman menjadi arsip ZIP in-memory."""
    zip_buffer = io.BytesIO()
    with ZipFile(zip_buffer, mode="w", compression=ZIP_DEFLATED) as zipf:
        chunk_counter = 1
        for i in range(0, total_pages, fixed_step):
            start_page = i
            end_page = min(i + fixed_step - 1, total_pages - 1)

            chunk_doc = fitz.open()
            chunk_doc.insert_pdf(src_doc, from_page=start_page, to_page=end_page)
            chunk_bytes = chunk_doc.tobytes(garbage=3, deflate=True)
            chunk_doc.close()

            zipf.writestr(f"{safe_base}_part_{chunk_counter:03d}.pdf", chunk_bytes)
            chunk_counter += 1

    zip_bytes = zip_buffer.getvalue()
    zip_buffer.close()
    return create_file_response(zip_bytes, f"{safe_base}_split.zip")


def _split_all(src_doc, total_pages: int, safe_base: str):
    """Pecah setiap halaman PDF menjadi berkas terpisah dalam ZIP in-memory."""
    zip_buffer = io.BytesIO()
    with ZipFile(zip_buffer, mode="w", compression=ZIP_DEFLATED) as zipf:
        for i in range(total_pages):
            page_doc = fitz.open()
            page_doc.insert_pdf(src_doc, from_page=i, to_page=i)
            page_bytes = page_doc.tobytes(garbage=3, deflate=True)
            page_doc.close()
            zipf.writestr(f"{safe_base}_page_{i+1:03d}.pdf", page_bytes)

    zip_bytes = zip_buffer.getvalue()
    zip_buffer.close()
    return create_file_response(zip_bytes, f"{safe_base}_split.zip")


def _apply_compression(doc, c_type: str, content: bytes, target_size_kb: Optional[int]) -> bytes:
    """Menerapkan strategi kompresi in-memory sesuai mode pilihan."""
    if c_type == "low":
        optimize_embedded_images(doc, max_dimension=2200, quality=85)
        try:
            pdf_bytes = doc.tobytes(garbage=3, deflate=True, clean=True)
        except Exception:
            pdf_bytes = doc.tobytes(garbage=3, deflate=True)

    elif c_type in ("extreme", "high"):
        optimize_embedded_images(doc, max_dimension=1024, quality=50)
        try:
            pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True, use_objstms=True)
        except Exception:
            pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True)

    elif c_type == "target" and target_size_kb:
        target_bytes = target_size_kb * 1024
        optimize_embedded_images(doc, max_dimension=1600, quality=72)
        try:
            pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True, use_objstms=True)
        except Exception:
            pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True)

        if len(pdf_bytes) > target_bytes:
            optimize_embedded_images(doc, max_dimension=1024, quality=48)
            try:
                pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True, use_objstms=True)
            except Exception:
                pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True)

        if len(pdf_bytes) > target_bytes:
            is_scanned = not any(len(p.get_text().strip()) > 30 for p in doc)
            if is_scanned:
                for dpi_level in [96, 72, 50]:
                    if len(pdf_bytes) <= target_bytes:
                        break
                    scan_doc = fitz.open()
                    for page in doc:
                        pix = page.get_pixmap(dpi=dpi_level)
                        img_bytes = pix.pil_tobytes(format="JPEG", quality=60, optimize=True)
                        new_page = scan_doc.new_page(width=page.rect.width, height=page.rect.height)
                        new_page.insert_image(page.rect, stream=img_bytes)
                    scan_bytes = scan_doc.tobytes(garbage=4, deflate=True)
                    scan_doc.close()
                    if len(scan_bytes) < len(pdf_bytes):
                        pdf_bytes = scan_bytes
    else:
        optimize_embedded_images(doc, max_dimension=1500, quality=72)
        try:
            pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True, use_objstms=True)
        except Exception:
            pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True)

    if len(pdf_bytes) >= len(content):
        try:
            clean_bytes = doc.tobytes(garbage=4, deflate=True)
            pdf_bytes = clean_bytes if len(clean_bytes) < len(content) else content
        except Exception:
            pdf_bytes = content

    return pdf_bytes


# === 1. GABUNGKAN PDF (MERGE) ===
@router.post("/merge-pdf")
def merge_pdf(files: List[UploadFile] = File(...)):
    """Menggabungkan beberapa berkas PDF secara in-memory (Zero Disk I/O)."""
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="Minimal unggah 2 file PDF untuk digabungkan.")

    merged_doc = fitz.open()
    try:
        for idx, file in enumerate(files):
            filename = file.filename or f"dokumen_{idx+1}.pdf"
            if not filename.lower().endswith(".pdf"):
                raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

            content = file.file.read()
            if not content.startswith(b"%PDF-"):
                raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan PDF yang sah.")
            if len(content) > MAX_FILE_SIZE:
                max_mb = MAX_FILE_SIZE // (1024 * 1024)
                raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi {max_mb} MB.")

            try:
                doc = fitz.open(stream=content, filetype="pdf")
            except Exception:
                raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak.")

            if doc.needs_pass or doc.is_encrypted:
                doc.close()
                raise HTTPException(status_code=400, detail=f"Berkas '{filename}' terproteksi kata sandi.")

            if len(doc) > 0:
                merged_doc.insert_pdf(doc)
            doc.close()

        if len(merged_doc) == 0:
            raise HTTPException(status_code=400, detail="Tidak ada halaman yang dapat digabungkan.")

        merged_bytes = merged_doc.tobytes(garbage=3, deflate=True)
        merged_doc.close()
        return create_file_response(merged_bytes, "merged_document.pdf")

    except HTTPException:
        merged_doc.close()
        raise
    except Exception as e:
        merged_doc.close()
        logging.error(f"Error saat menggabungkan PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal menggabungkan PDF: {str(e)}")


# === 2. PISAHKAN PDF (SPLIT) ===
@router.post("/split-pdf")
def split_pdf(
    file: UploadFile = File(...),
    split_mode: SplitType = Form(...),
    pages: Optional[str] = Form(None),
    fixed_step: Optional[int] = Form(None)
):
    """Memisahkan berkas PDF secara in-memory (Extract, Fixed, All)."""
    filename = file.filename or "dokumen.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    content = file.file.read()
    validate_pdf_bytes(content, filename)
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas {max_mb} MB.")

    safe_base = get_safe_base_name(filename)
    src_doc = None
    try:
        try:
            src_doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak atau tidak dapat diproses.")

        if src_doc.needs_pass or src_doc.is_encrypted:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' terproteksi kata sandi.")

        total_pages = len(src_doc)
        if total_pages == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

        if split_mode == SplitType.EXTRACT:
            if not pages:
                raise HTTPException(status_code=400, detail="Parameter 'pages' wajib diisi untuk mode Extract.")
            return _split_extract(src_doc, pages, total_pages, safe_base)

        elif split_mode == SplitType.FIXED:
            if not fixed_step or fixed_step < 1:
                raise HTTPException(status_code=400, detail="Parameter 'fixed_step' wajib diisi minimal 1.")
            return _split_fixed(src_doc, fixed_step, total_pages, safe_base)

        elif split_mode == SplitType.ALL:
            return _split_all(src_doc, total_pages, safe_base)

        else:
            raise HTTPException(status_code=400, detail=f"Mode split '{split_mode}' tidak dikenali.")

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error saat memisahkan PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal memisahkan PDF: {str(e)}")
    finally:
        if src_doc and not src_doc.is_closed:
            src_doc.close()


# === 3. KOMPRES PDF (COMPRESS) ===
@router.post("/compress-pdf")
def compress_pdf(
    file: UploadFile = File(...),
    compression_type: str = Form("recommended"),
    target_size_kb: Optional[int] = Form(None)
):
    """Mengompres berkas PDF dengan optimasi Pillow & XObject stream in-memory."""
    filename = file.filename or "dokumen.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    content = file.file.read()
    validate_pdf_bytes(content, filename)
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas {max_mb} MB.")

    safe_base = get_safe_base_name(filename)
    comp_filename = f"compressed_{safe_base}.pdf"

    doc = None
    try:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak atau tidak dapat diproses.")

        if doc.needs_pass or doc.is_encrypted:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' terproteksi kata sandi.")

        if len(doc) == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF kosong.")

        try:
            doc.scrub(metadata=False, xml_metadata=True, attached_files=True, thumbnails=True, reset_fields=False)
        except Exception:
            pass

        c_type = (compression_type or "recommended").lower().strip()
        pdf_bytes = _apply_compression(doc, c_type, content, target_size_kb)

        return create_file_response(pdf_bytes, comp_filename)

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR COMPRESS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal kompres PDF: {str(e)}")
    finally:
        if doc and not doc.is_closed:
            doc.close()
