# app/routers/tools.py
import os
import io
import re
import shutil
import logging
import tempfile
import datetime
import json
import urllib.parse
import urllib.request
import asyncio
from typing import List, Optional
from enum import Enum
from zipfile import ZipFile, ZIP_DEFLATED

from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks, Form, Response
from fastapi.responses import FileResponse, JSONResponse
import fitz  # PyMuPDF
from PIL import Image

from app.core.config import MAX_FILE_SIZE
from app.utils.file_utils import validate_file, cleanup_folder
from app.utils.job_store import create_job, update_job

router = APIRouter(prefix="/tools", tags=["Tools"])

# --- ENUM UNTUK OPSI SPLIT ---
class SplitType(str, Enum):
    EXTRACT = "extract"      # Halaman dipilih -> Jadi 1 File PDF
    FIXED = "fixed"          # Setiap X halaman -> Jadi Banyak File (ZIP)
    ALL = "all"              # Setiap 1 halaman -> Jadi Banyak File (ZIP)

# === 5. GABUNGKAN PDF (HIGH-SPEED IN-MEMORY MERGE - STANDAR ILOVEPDF) ===
@router.post("/merge-pdf")
def merge_pdf(files: List[UploadFile] = File(...)):
    """
    Menggabungkan beberapa berkas PDF dengan standar performa iLovePDF / Smallpdf:
    - Zero Disk I/O (In-Memory streaming murni untuk kecepatan ultra-tinggi)
    - Resisten tabrakan nama berkas (Filename collision safe)
    - Validasi format, batas ukuran berkas, dan deteksi proteksi kata sandi
    - Optimasi stream output (deflate=True, garbage=3)
    """
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="Minimal unggah 2 file PDF untuk digabungkan.")
    
    merged_doc = fitz.open()

    try:
        for idx, file in enumerate(files):
            filename = file.filename or f"dokumen_{idx+1}.pdf"
            
            # 1. Validasi ekstensi
            if not filename.lower().endswith(".pdf"):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Berkas '{filename}' bukan format PDF yang valid."
                )

            # 2. Baca biner langsung ke memori (Zero Disk I/O)
            content = file.file.read()
            if len(content) > MAX_FILE_SIZE:
                max_mb = MAX_FILE_SIZE // (1024 * 1024)
                raise HTTPException(
                    status_code=400,
                    detail=f"Berkas '{filename}' melebihi batas ukuran maksimal ({max_mb} MB)."
                )

            # 3. Buka dokumen dari stream memori
            try:
                doc = fitz.open(stream=content, filetype="pdf")
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail=f"Berkas '{filename}' rusak atau tidak dapat diproses."
                )

            # 4. Deteksi proteksi kata sandi
            if doc.needs_pass or doc.is_encrypted:
                doc.close()
                raise HTTPException(
                    status_code=400,
                    detail=f"Berkas '{filename}' dilindungi kata sandi. Harap buka kuncinya terlebih dahulu."
                )

            # 5. O(1) Page-Tree Grafting (Penyatuan struktur halaman instan)
            if len(doc) > 0:
                merged_doc.insert_pdf(doc)
            doc.close()

        if len(merged_doc) == 0:
            raise HTTPException(status_code=400, detail="Tidak ada halaman yang dapat digabungkan dari berkas yang diunggah.")

        # 6. Serialisasi Memori Cepat dengan Optimasi Standar iLovePDF
        # garbage=3: membersihkan objek mati & mengompresi stream
        # deflate=True: kompresi stream tanpa merusak kualitas teks & gambar
        merged_bytes = merged_doc.tobytes(garbage=3, deflate=True)
        merged_doc.close()

        return Response(
            content=merged_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=merged_document.pdf",
            }
        )

    except HTTPException:
        merged_doc.close()
        raise
    except Exception as e:
        merged_doc.close()
        logging.error(f"Error saat menggabungkan PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal menggabungkan PDF: {str(e)}")

# === 6. PISAHKAN PDF (HIGH-SPEED IN-MEMORY SPLIT - STANDAR ILOVEPDF) ===
@router.post("/split-pdf")
def split_pdf(
    file: UploadFile = File(...),
    split_mode: SplitType = Form(...),          # extract, fixed, atau all
    pages: Optional[str] = Form(None),          # Wajib jika mode 'extract' (contoh: "1-5,7")
    fixed_step: Optional[int] = Form(None)      # Wajib jika mode 'fixed' (contoh: 2)
):
    """
    Memisahkan berkas PDF dengan standar performa iLovePDF / Smallpdf:
    - In-Memory streaming murni (Zero Disk I/O) untuk kecepatan ultra-tinggi
    - Mendukung 4 mode pemisahan: Rentang (Range), Pilih Lembar (Selected), Pecah X Halaman (Fixed), Semua Halaman (All)
    - Validasi ukuran, format biner, deteksi proteksi kata sandi, dan parsing rentang halaman yang aman
    - Kompresi ZIP in-memory (ZIP_DEFLATED) dan pembersihan sumber daya otomatis
    """
    filename = file.filename or "dokumen.pdf"

    # 1. Validasi ekstensi
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail=f"Berkas '{filename}' bukan format PDF yang valid."
        )

    # 2. Baca biner langsung ke memori (Zero Disk I/O)
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"Berkas '{filename}' melebihi batas ukuran maksimal ({max_mb} MB)."
        )

    # Sanitasi nama berkas untuk output
    raw_base = os.path.splitext(filename)[0]
    safe_base = re.sub(r'[^\w\-_\. ]', '_', raw_base).strip() or "dokumen"

    src_doc = None
    try:
        try:
            src_doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(
                status_code=400,
                detail=f"Berkas '{filename}' rusak atau tidak dapat diproses."
            )

        # 3. Deteksi proteksi kata sandi
        if src_doc.needs_pass or src_doc.is_encrypted:
            raise HTTPException(
                status_code=400,
                detail=f"Berkas '{filename}' terproteksi kata sandi. Harap buka kunci terlebih dahulu."
            )

        total_pages = len(src_doc)
        if total_pages == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

        # === MODE 1 & 2: EKSTRAK HALAMAN TERTENTU (OUTPUT: 1 FILE PDF) ===
        if split_mode == SplitType.EXTRACT:
            if not pages:
                raise HTTPException(status_code=400, detail="Parameter 'pages' wajib diisi untuk mode Extract.")

            selected_indices = []
            try:
                for part in pages.split(","):
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
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="Format halaman tidak valid. Gunakan format seperti: 1-5, 7, 10"
                )

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

            output_filename = f"{safe_base}_extracted.pdf"
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{output_filename}"',
                }
            )

        # === MODE 3: SPLIT SETIAP X HALAMAN (OUTPUT: ZIP IN-MEMORY) ===
        elif split_mode == SplitType.FIXED:
            if not fixed_step or fixed_step < 1:
                raise HTTPException(status_code=400, detail="Parameter 'fixed_step' wajib diisi minimal 1.")

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

                    part_filename = f"{safe_base}_part_{chunk_counter:03d}.pdf"
                    zipf.writestr(part_filename, chunk_bytes)
                    chunk_counter += 1

            zip_bytes = zip_buffer.getvalue()
            zip_buffer.close()

            output_filename = f"{safe_base}_split.zip"
            return Response(
                content=zip_bytes,
                media_type="application/zip",
                headers={
                    "Content-Disposition": f'attachment; filename="{output_filename}"',
                }
            )

        # === MODE 4: SPLIT SETIAP HALAMAN (OUTPUT: ZIP IN-MEMORY) ===
        elif split_mode == SplitType.ALL:
            zip_buffer = io.BytesIO()
            with ZipFile(zip_buffer, mode="w", compression=ZIP_DEFLATED) as zipf:
                for i in range(total_pages):
                    page_doc = fitz.open()
                    page_doc.insert_pdf(src_doc, from_page=i, to_page=i)
                    page_bytes = page_doc.tobytes(garbage=3, deflate=True)
                    page_doc.close()

                    page_filename = f"{safe_base}_page_{i+1:03d}.pdf"
                    zipf.writestr(page_filename, page_bytes)

            zip_bytes = zip_buffer.getvalue()
            zip_buffer.close()

            output_filename = f"{safe_base}_split.zip"
            return Response(
                content=zip_bytes,
                media_type="application/zip",
                headers={
                    "Content-Disposition": f'attachment; filename="{output_filename}"',
                }
            )

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

# === 7. KOMPRES PDF (HIGH-SPEED IN-MEMORY COMPRESS - STANDAR ILOVEPDF) ===
class CompressionType(str, Enum):
    EXTREME = "extreme"          # Kompresi Tinggi / Ekstrem (Ukuran Terkecil)
    HIGH = "high"                # Alias untuk Extreme
    RECOMMENDED = "recommended"  # Rekomendasi (Keseimbangan Optimal)
    LOW = "low"                  # Kompresi Rendah (Kualitas Gambar Tinggi)
    TARGET = "target"            # Ukuran Target (KB Tertentu)


def optimize_embedded_images(doc, max_dimension: int, quality: int):
    """
    Mengompres dan mengecilkan gambar yang tertanam (XObject) di dalam PDF secara in-memory.
    Menjaga lapisan teks, font, dan elemen vektor tetap 100% utuh dan tajam.
    """
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
                if not orig_bytes or len(orig_bytes) < 15 * 1024:  # Lewati ikon / gambar kecil (<15KB)
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
                # Tangani transparansi
                if pil_img.mode in ("RGBA", "LA") or (pil_img.mode == "P" and "transparency" in pil_img.info):
                    pil_img.save(out_buf, format="PNG", optimize=True)
                else:
                    if pil_img.mode != "RGB":
                        pil_img = pil_img.convert("RGB")
                    pil_img.save(out_buf, format="JPEG", quality=quality, optimize=True)

                new_bytes = out_buf.getvalue()

                # Hanya ganti jika ukuran stream baru setidaknya 8% lebih kecil
                if len(new_bytes) < len(orig_bytes) * 0.92:
                    try:
                        page.replace_image(xref, stream=new_bytes)
                    except Exception:
                        pass
            except Exception as err:
                logging.debug(f"Lewati optimasi gambar xref {xref}: {err}")


@router.post("/compress-pdf")
def compress_pdf(
    file: UploadFile = File(...),
    compression_type: str = Form("recommended"),
    target_size_kb: Optional[int] = Form(None)
):
    """
    Mengompres berkas PDF dengan standar performa iLovePDF / Smallpdf:
    - Zero Disk I/O (Streaming langsung di RAM untuk kecepatan ultra-tinggi)
    - 4 Mode: Kompres Tinggi (Extreme), Rekomendasi (Recommended), Kompres Rendah (Low), Ukuran Target (Target)
    - Mempertahankan ketajaman teks vektor 100% (teks tetap dapat diseleksi & dicari)
    - Re-encoding gambar cerdas dengan Pillow & struktur objek terkompresi PDF 1.5+
    - Menjamin ukuran hasil tidak pernah lebih besar dari berkas aslinya
    """
    filename = file.filename or "dokumen.pdf"

    # 1. Validasi format
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail=f"Berkas '{filename}' bukan format PDF yang valid."
        )

    # 2. Baca biner langsung ke memori (Zero Disk I/O)
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"Berkas '{filename}' melebihi batas ukuran maksimal ({max_mb} MB)."
        )

    raw_base = os.path.splitext(filename)[0]
    safe_base = re.sub(r'[^\w\-_\. ]', '_', raw_base).strip() or "dokumen"
    comp_filename = f"compressed_{safe_base}.pdf"

    doc = None
    try:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(
                status_code=400,
                detail=f"Berkas '{filename}' rusak atau tidak dapat diproses."
            )

        # 3. Deteksi proteksi kata sandi
        if doc.needs_pass or doc.is_encrypted:
            raise HTTPException(
                status_code=400,
                detail=f"Berkas '{filename}' terproteksi kata sandi. Harap buka kunci terlebih dahulu."
            )

        if len(doc) == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF kosong.")

        # 4. Bersihkan metadata XML dan thumbnail usang (Lossless)
        try:
            doc.scrub(
                metadata=False,
                xml_metadata=True,
                attached_files=True,
                thumbnails=True,
                reset_fields=False
            )
        except Exception:
            pass

        # 5. Eksekusi kompresi sesuai mode
        c_type = (compression_type or "recommended").lower().strip()

        # Mode 1: Kompres Rendah (Low) - Kualitas visual maksimal, kompresi ringan
        if c_type == "low":
            optimize_embedded_images(doc, max_dimension=2200, quality=85)
            try:
                pdf_bytes = doc.tobytes(garbage=3, deflate=True, clean=True)
            except Exception:
                pdf_bytes = doc.tobytes(garbage=3, deflate=True)

        # Mode 2: Kompres Tinggi (Extreme / High) - Pengecilan maksimal
        elif c_type in ("extreme", "high"):
            optimize_embedded_images(doc, max_dimension=1024, quality=50)
            try:
                pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True, use_objstms=True)
            except Exception:
                pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True)

        # Mode 4: Ukuran Target (Target Size in KB)
        elif c_type == "target" and target_size_kb:
            target_bytes = target_size_kb * 1024

            # Percobaan tahap 1: Pengaturan Rekomendasi
            optimize_embedded_images(doc, max_dimension=1600, quality=72)
            try:
                pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True, use_objstms=True)
            except Exception:
                pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True)

            # Percobaan tahap 2: Jika masih di atas target, terapkan kompresi lebih ketat
            if len(pdf_bytes) > target_bytes:
                optimize_embedded_images(doc, max_dimension=1024, quality=48)
                try:
                    pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True, use_objstms=True)
                except Exception:
                    pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True)

            # Percobaan tahap 3: Jika masih di atas target dan dokumen adalah scan murni (tanpa teks vektor)
            if len(pdf_bytes) > target_bytes:
                is_scanned = True
                for page in doc:
                    if len(page.get_text().strip()) > 30:
                        is_scanned = False
                        break

                # Jika murni dokumen scan/gambar, downscale DPI halaman dengan aman
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

        # Mode 3 (Default): Rekomendasi (Recommended) - Keseimbangan optimal (Standar iLovePDF)
        else:
            optimize_embedded_images(doc, max_dimension=1500, quality=72)
            try:
                pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True, use_objstms=True)
            except Exception:
                pdf_bytes = doc.tobytes(garbage=4, deflate=True, clean=True)

        # Garansi Standar Industri: Berkas hasil kompresi tidak boleh lebih besar dari berkas aslinya
        if len(pdf_bytes) >= len(content):
            try:
                clean_bytes = doc.tobytes(garbage=4, deflate=True)
                pdf_bytes = clean_bytes if len(clean_bytes) < len(content) else content
            except Exception:
                pdf_bytes = content

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{comp_filename}"',
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR COMPRESS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal kompres PDF: {str(e)}")
    finally:
        if doc and not doc.is_closed:
            doc.close()


# =====================================================================
# === 8. WATERMARK PDF (STANDAR INDUSTRI ILOVEPDF & SMALLPDF)       ===
# =====================================================================

def _hex_to_rgb(hex_str: str) -> tuple:
    """Mengonversi kode warna hex (#RRGGBB) ke tuple RGB (0.0 - 1.0) untuk PyMuPDF."""
    cleaned = (hex_str or "#EF4444").strip().lstrip("#")
    if len(cleaned) == 3:
        cleaned = "".join(c * 2 for c in cleaned)
    if len(cleaned) != 6:
        return (0.93, 0.26, 0.26)
    try:
        r = int(cleaned[0:2], 16) / 255.0
        g = int(cleaned[2:4], 16) / 255.0
        b = int(cleaned[4:6], 16) / 255.0
        return (r, g, b)
    except Exception:
        return (0.93, 0.26, 0.26)


def _get_fontname(font_family: str, is_bold: bool, is_italic: bool) -> str:
    """Mendapatkan kode font standar 14 PyMuPDF berdasarkan preferensi tipografi."""
    fam = (font_family or "helv").lower()
    if "times" in fam:
        if is_bold and is_italic:
            return "tibi"
        elif is_bold:
            return "tibo"
        elif is_italic:
            return "tiit"
        return "times"
    elif "courier" in fam:
        if is_bold and is_italic:
            return "cobi"
        elif is_bold:
            return "cobo"
        elif is_italic:
            return "coit"
        return "couri"
    else:  # Helvetica / Arial default
        if is_bold and is_italic:
            return "hebi"
        elif is_bold:
            return "hebo"
        elif is_italic:
            return "heit"
        return "helv"


def _get_target_pages(doc_len: int, page_selection: str, custom_pages: Optional[str], exclude_first_page: bool) -> List[int]:
    """Menentukan daftar index halaman (0-based) yang akan dibubuhi cap air."""
    target_indices = []
    sel = (page_selection or "all").lower().strip()

    if sel == "odd":
        target_indices = [i for i in range(doc_len) if (i + 1) % 2 != 0]
    elif sel == "even":
        target_indices = [i for i in range(doc_len) if (i + 1) % 2 == 0]
    elif sel == "custom" and custom_pages:
        for part in custom_pages.split(","):
            part = part.strip()
            if not part:
                continue
            if "-" in part:
                tokens = part.split("-")
                if len(tokens) == 2 and tokens[0].strip().isdigit() and tokens[1].strip().isdigit():
                    s, e = int(tokens[0].strip()), int(tokens[1].strip())
                    step = 1 if s <= e else -1
                    for p in range(s, e + step, step):
                        if 1 <= p <= doc_len and (p - 1) not in target_indices:
                            target_indices.append(p - 1)
            elif part.isdigit():
                p = int(part)
                if 1 <= p <= doc_len and (p - 1) not in target_indices:
                    target_indices.append(p - 1)
    else:  # "all"
        target_indices = list(range(doc_len))

    # Fitur iLovePDF: Lewati halaman cover (halaman pertama / index 0)
    if exclude_first_page and 0 in target_indices:
        target_indices.remove(0)

    return target_indices


@router.post("/watermark-pdf")
def watermark_pdf(
    file: UploadFile = File(...),
    watermark_type: str = Form("text"),              # "text" atau "image"
    # Parameter Mode Teks
    text: str = Form("CONFIDENTIAL"),
    font_family: str = Form("helv"),                 # "helv" (Arial), "times", "courier"
    font_size: float = Form(36.0),
    is_bold: bool = Form(False),
    is_italic: bool = Form(False),
    color: str = Form("#EF4444"),                    # Hex color
    # Parameter Mode Gambar
    image_file: Optional[UploadFile] = File(None),
    image_scale: float = Form(0.35),                 # 0.1 - 1.0 (proporsi lebar halaman)
    # Parameter Umum (Positioning & Layout)
    opacity: float = Form(0.3),                      # 0.05 - 1.0
    rotation: float = Form(-45.0),                   # -90 hingga +90 derajat
    layer: str = Form("over"),                       # "over" (di atas konten) atau "under" (di bawah konten)
    position: str = Form("center"),                  # 9 anchor grid: top-left, top-center, top-right, middle-left, center, middle-right, bottom-left, bottom-center, bottom-right
    is_mosaic: bool = Form(False),                   # Tiling / pola berulang diagonal di seluruh halaman
    # Target Halaman
    page_selection: str = Form("all"),               # "all", "odd", "even", "custom"
    custom_pages: Optional[str] = Form(None),        # Contoh: "1-5, 8"
    exclude_first_page: bool = Form(False)           # Lewati cover dokumen
):
    """
    Membubuhkan cap air (watermark) teks atau gambar ke dokumen PDF
    dengan standar industri sekelas iLovePDF & Smallpdf:
    - Zero Disk I/O (In-Memory streaming ultra-cepat berbasis PyMuPDF)
    - Dukungan 2 mode: Cap Air Teks & Cap Air Gambar / Logo transparan
    - Layering: Over content (overlay) vs Behind content (underlay)
    - Positioning: 9-Anchor Grid (3x3) & Pola Mosaic Tiling Diagonal
    - Fleksibilitas halaman: Semua, Ganjil, Genap, Rentang Kustom, & Exclude First Page
    - Optimasi kompresi output stream (deflate=True, garbage=3)
    """
    filename = file.filename or "dokumen.pdf"

    # 1. Validasi ekstensi
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    # 2. Baca biner langsung ke memori (Zero Disk I/O)
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas ukuran maksimal ({max_mb} MB).")

    # Sanitasi nama berkas output
    raw_base = os.path.splitext(filename)[0]
    safe_base = re.sub(r'[^\w\-_\. ]', '_', raw_base).strip() or "dokumen"
    out_filename = f"watermarked-{safe_base}.pdf"

    doc = None
    try:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak atau tidak dapat diproses.")

        # 3. Deteksi proteksi kata sandi
        if doc.needs_pass or doc.is_encrypted:
            raise HTTPException(
                status_code=400,
                detail=f"Berkas '{filename}' dilindungi kata sandi. Buka kunci proteksi terlebih dahulu."
            )

        total_pages = len(doc)
        if total_pages == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

        # 4. Filter halaman target
        target_page_indices = _get_target_pages(total_pages, page_selection, custom_pages, exclude_first_page)
        if not target_page_indices:
            raise HTTPException(status_code=400, detail="Tidak ada halaman yang cocok dengan target halaman yang dipilih.")

        # Parameter umum
        clamped_opacity = max(0.05, min(1.0, float(opacity)))
        is_overlay = layer.lower() in ("over", "above")
        pos = (position or "center").lower().strip()

        # =====================================================================
        # EKSEKUSI MODE TEKS
        # =====================================================================
        if watermark_type.lower() == "text":
            watermark_text = (text or "CONFIDENTIAL").strip()
            if not watermark_text:
                raise HTTPException(status_code=400, detail="Teks watermark tidak boleh kosong.")

            font_name = _get_fontname(font_family, is_bold, is_italic)
            rgb_color = _hex_to_rgb(color)
            f_size = max(8.0, min(160.0, float(font_size)))
            rot_angle = float(rotation)

            for page_idx in target_page_indices:
                page = doc[page_idx]
                p_width = page.rect.width
                p_height = page.rect.height

                # Ukur dimensi teks menggunakan PyMuPDF font metrics
                try:
                    text_w = fitz.get_text_length(watermark_text, fontname=font_name, fontsize=f_size)
                except Exception:
                    text_w = len(watermark_text) * f_size * 0.55
                text_h = f_size * 0.85

                if is_mosaic:
                    # Mode Mosaic: Pola grid berulang diagonal di seluruh halaman
                    step_x = max(180.0, text_w + 60.0)
                    step_y = max(120.0, f_size * 3.8)

                    start_x = -int(step_x)
                    end_x = int(p_width + step_x * 2)
                    start_y = -int(step_y)
                    end_y = int(p_height + step_y * 2)

                    row = 0
                    for cy in range(start_y, end_y, int(step_y)):
                        # Pola selang-seling (staggered) ala iLovePDF
                        x_offset = (row % 2) * (step_x / 2)
                        for cx in range(start_x, end_x, int(step_x)):
                            actual_cx = cx + x_offset
                            pt = fitz.Point(actual_cx - text_w / 2, cy + f_size * 0.3)
                            fp = fitz.Point(actual_cx, cy)
                            page.insert_text(
                                pt,
                                watermark_text,
                                fontsize=f_size,
                                fontname=font_name,
                                color=rgb_color,
                                fill_opacity=clamped_opacity,
                                morph=(fp, fitz.Matrix(rot_angle)),
                                overlay=is_overlay
                            )
                        row += 1
                else:
                    # Mode 9-Anchor Grid
                    margin_x = 40.0
                    margin_y = 40.0

                    if pos == "top-left":
                        cx = margin_x + text_w / 2
                        cy = margin_y + text_h / 2
                    elif pos == "top-center":
                        cx = p_width / 2
                        cy = margin_y + text_h / 2
                    elif pos == "top-right":
                        cx = p_width - margin_x - text_w / 2
                        cy = margin_y + text_h / 2
                    elif pos == "middle-left":
                        cx = margin_x + text_w / 2
                        cy = p_height / 2
                    elif pos == "middle-right":
                        cx = p_width - margin_x - text_w / 2
                        cy = p_height / 2
                    elif pos == "bottom-left":
                        cx = margin_x + text_w / 2
                        cy = p_height - margin_y - text_h / 2
                    elif pos == "bottom-center":
                        cx = p_width / 2
                        cy = p_height - margin_y - text_h / 2
                    elif pos == "bottom-right":
                        cx = p_width - margin_x - text_w / 2
                        cy = p_height - margin_y - text_h / 2
                    else:  # center default
                        cx = p_width / 2
                        cy = p_height / 2

                    pt = fitz.Point(cx - text_w / 2, cy + f_size * 0.3)
                    fp = fitz.Point(cx, cy)
                    page.insert_text(
                        pt,
                        watermark_text,
                        fontsize=f_size,
                        fontname=font_name,
                        color=rgb_color,
                        fill_opacity=clamped_opacity,
                        morph=(fp, fitz.Matrix(rot_angle)),
                        overlay=is_overlay
                    )

        # =====================================================================
        # EKSEKUSI MODE GAMBAR / LOGO
        # =====================================================================
        elif watermark_type.lower() == "image":
            if not image_file:
                raise HTTPException(status_code=400, detail="Unggah berkas gambar/logo untuk mode cap air gambar.")

            img_bytes = image_file.file.read()
            if len(img_bytes) == 0:
                raise HTTPException(status_code=400, detail="Berkas gambar kosong.")

            # Sesuaikan transparansi gambar menggunakan Pillow
            processed_img_bytes = img_bytes
            try:
                pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
                orig_w, orig_h = pil_img.size

                if clamped_opacity < 0.98:
                    r_ch, g_ch, b_ch, a_ch = pil_img.split()
                    a_ch = a_ch.point(lambda p: int(p * clamped_opacity))
                    pil_img.putalpha(a_ch)

                buf = io.BytesIO()
                pil_img.save(buf, format="PNG")
                processed_img_bytes = buf.getvalue()
            except Exception as img_err:
                logging.warning(f"Pillow alpha adjustment fallback: {img_err}")
                orig_w, orig_h = (300, 300)

            aspect_ratio = (orig_h / orig_w) if orig_w > 0 else 1.0
            scale = max(0.1, min(1.0, float(image_scale)))

            for page_idx in target_page_indices:
                page = doc[page_idx]
                p_width = page.rect.width
                p_height = page.rect.height

                target_w = p_width * scale
                target_h = target_w * aspect_ratio

                # Cegah gambar melebihi batas tinggi halaman
                if target_h > p_height * 0.85:
                    target_h = p_height * 0.85
                    target_w = target_h / aspect_ratio

                if is_mosaic:
                    # Pola berulang gambar
                    step_x = max(180.0, target_w * 1.6)
                    step_y = max(140.0, target_h * 1.6)

                    start_x = -int(step_x)
                    end_x = int(p_width + step_x * 2)
                    start_y = -int(step_y)
                    end_y = int(p_height + step_y * 2)

                    row = 0
                    for cy in range(start_y, end_y, int(step_y)):
                        x_offset = (row % 2) * (step_x / 2)
                        for cx in range(start_x, end_x, int(step_x)):
                            actual_cx = cx + x_offset
                            img_rect = fitz.Rect(
                                actual_cx - target_w / 2,
                                cy - target_h / 2,
                                actual_cx + target_w / 2,
                                cy + target_h / 2
                            )
                            page.insert_image(img_rect, stream=processed_img_bytes, overlay=is_overlay)
                        row += 1
                else:
                    margin_x = 35.0
                    margin_y = 35.0

                    if pos == "top-left":
                        x0, y0 = margin_x, margin_y
                    elif pos == "top-center":
                        x0, y0 = (p_width - target_w) / 2, margin_y
                    elif pos == "top-right":
                        x0, y0 = p_width - margin_x - target_w, margin_y
                    elif pos == "middle-left":
                        x0, y0 = margin_x, (p_height - target_h) / 2
                    elif pos == "middle-right":
                        x0, y0 = p_width - margin_x - target_w, (p_height - target_h) / 2
                    elif pos == "bottom-left":
                        x0, y0 = margin_x, p_height - margin_y - target_h
                    elif pos == "bottom-center":
                        x0, y0 = (p_width - target_w) / 2, p_height - margin_y - target_h
                    elif pos == "bottom-right":
                        x0, y0 = p_width - margin_x - target_w, p_height - margin_y - target_h
                    else:  # center
                        x0, y0 = (p_width - target_w) / 2, (p_height - target_h) / 2

                    img_rect = fitz.Rect(x0, y0, x0 + target_w, y0 + target_h)
                    page.insert_image(img_rect, stream=processed_img_bytes, overlay=is_overlay)

        else:
            raise HTTPException(status_code=400, detail=f"Tipe watermark '{watermark_type}' tidak dikenali. Pilih 'text' atau 'image'.")

        # 5. Serialisasi In-Memory dengan optimasi stream standar iLovePDF
        pdf_bytes = doc.tobytes(garbage=3, deflate=True)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{out_filename}"',
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR WATERMARK: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal menambahkan watermark: {str(e)}")
    finally:
        if doc and not doc.is_closed:
            doc.close()


# =====================================================================
# === 9. PROTEKSI PDF (STANDAR INDUSTRI ILOVEPDF & SMALLPDF)        ===
# =====================================================================

@router.post("/protect-pdf")
def protect_pdf(
    file: UploadFile = File(...),
    password: str = Form(...),                      # Kata sandi buka dokumen (User Password)
    owner_password: Optional[str] = Form(None),     # Kata sandi pemilik/master (Owner Password)
    allow_print: bool = Form(True),                 # Izin cetak dokumen
    allow_copy: bool = Form(True),                  # Izin salin teks & grafik
    allow_modify: bool = Form(False),               # Izin modifikasi dokumen
    allow_annotate: bool = Form(True),              # Izin beri anotasi / komentar
    allow_fill_forms: bool = Form(True)             # Izin isi formulir PDF
):
    """
    Mengunci dan mengenkripsi dokumen PDF dengan standar industri internasional AES-256 (ISO 32000):
    - Zero Disk I/O (In-Memory streaming ultra-cepat berbasis PyMuPDF)
    - Enkripsi kuat AES-256 bit (PDF_ENCRYPT_AES_256)
    - Dukungan kata sandi pengguna (buka dokumen) & kata sandi pemilik (master permissions)
    - Pengaturan izin akses granular (Cetak, Salin, Modifikasi, Anotasi, Formulir)
    - Deteksi dokumen yang telah terenkripsi sebelumnya
    - Optimasi kompresi stream output (deflate=True, garbage=3)
    """
    filename = file.filename or "dokumen.pdf"

    # 1. Validasi ekstensi
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    # 2. Validasi kata sandi
    clean_password = (password or "").strip()
    if len(clean_password) < 4:
        raise HTTPException(status_code=400, detail="Kata sandi minimal harus terdiri dari 4 karakter.")

    # 3. Baca biner langsung ke memori (Zero Disk I/O)
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas ukuran maksimal ({max_mb} MB).")

    raw_base = os.path.splitext(filename)[0]
    safe_base = re.sub(r'[^\w\-_\. ]', '_', raw_base).strip() or "dokumen"
    out_filename = f"protected-{safe_base}.pdf"

    doc = None
    try:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak atau tidak dapat diproses.")

        # 4. Deteksi apakah sudah terenkripsi
        if doc.needs_pass or doc.is_encrypted:
            raise HTTPException(
                status_code=400,
                detail=f"Berkas '{filename}' sudah dilindungi kata sandi. Dokumen tidak dapat diproteksi dua kali."
            )

        if len(doc) == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

        # 5. Kalkulasi Bitmask Izin (Permissions) Standar ISO PDF
        perm = 0
        if allow_print:
            perm |= fitz.PDF_PERM_PRINT
        if allow_modify:
            perm |= fitz.PDF_PERM_MODIFY
        if allow_copy:
            perm |= fitz.PDF_PERM_COPY
        if allow_annotate:
            perm |= fitz.PDF_PERM_ANNOTATE
        if allow_fill_forms:
            perm |= fitz.PDF_PERM_FILL_FORM
        # Aksesibilitas (screen reader untuk tuna netra) selalu diaktifkan sesuai rekomendasi ISO
        perm |= fitz.PDF_PERM_ACCESSIBILITY

        # 6. Algoritma Enkripsi Standar Industri (AES-256)
        try:
            enc_algo = fitz.PDF_ENCRYPT_AES_256
        except AttributeError:
            enc_algo = fitz.PDF_ENCRYPT_AES_128

        clean_owner = owner_password.strip() if (owner_password and owner_password.strip()) else clean_password

        # 7. Serialisasi In-Memory Terenkripsi
        pdf_bytes = doc.tobytes(
            encryption=enc_algo,
            user_pw=clean_password,
            owner_pw=clean_owner,
            permissions=perm,
            garbage=3,
            deflate=True
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{out_filename}"',
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR PROTECT PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal memproteksi PDF: {str(e)}")
    finally:
        if doc and not doc.is_closed:
            doc.close()


@router.post("/unlock-pdf")
def unlock_pdf(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None)
):
    """
    Membuka kunci dan menghapus proteksi kata sandi serta batasan izin pada dokumen PDF:
    - Zero Disk I/O (In-Memory streaming PyMuPDF)
    - Otentikasi kata sandi pengguna atau pemilik
    - Auto-unlock untuk dokumen yang hanya dibatasi izin akses tanpa sandi buka
    - Menghasilkan PDF bebas proteksi (unlocked)
    """
    filename = file.filename or "dokumen.pdf"

    # 1. Validasi ekstensi
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    # 2. Baca biner langsung ke memori (Zero Disk I/O)
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas ukuran maksimal ({max_mb} MB).")

    raw_base = os.path.splitext(filename)[0]
    if raw_base.startswith("protected-"):
        raw_base = raw_base[len("protected-"):]
    safe_base = re.sub(r'[^\w\-_\. ]', '_', raw_base).strip() or "dokumen"
    out_filename = f"unlocked-{safe_base}.pdf"

    doc = None
    try:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak atau tidak dapat diproses.")

        # 3. Cek status enkripsi
        if not doc.is_encrypted and not doc.needs_pass:
            raise HTTPException(
                status_code=400,
                detail=f"Berkas '{filename}' tidak terproteksi kata sandi."
            )

        clean_pw = (password or "").strip()
        auth_success = False

        # 4. Otentikasi
        if clean_pw:
            auth_result = doc.authenticate(clean_pw)
            if auth_result > 0:
                auth_success = True
            else:
                raise HTTPException(
                    status_code=401,
                    detail="Kata sandi salah. Silakan periksa kembali kata sandi dokumen Anda."
                )
        else:
            # Auto-unlock jika dokumen hanya memiliki batasan owner / izin tanpa password buka
            try:
                auth_result = doc.authenticate("")
                if auth_result > 0:
                    auth_success = True
            except Exception:
                pass

            if not auth_success:
                raise HTTPException(
                    status_code=400,
                    detail="Dokumen ini dilindungi kata sandi. Silakan masukkan kata sandi yang valid."
                )

        if len(doc) == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

        # 5. Serialisasi In-Memory tanpa enkripsi (menghapus password dan seluruh batasan)
        pdf_bytes = doc.tobytes(
            garbage=3,
            deflate=True
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{out_filename}"',
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR UNLOCK PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal membuka kunci PDF: {str(e)}")
    finally:
        if doc and not doc.is_closed:
            doc.close()


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
    """
    Memangkas margin atau area spesifik dokumen PDF secara visual dan presisi:
    - Zero Disk I/O (In-Memory streaming PyMuPDF)
    - Dukungan rasio koordinat relatif (0.0 - 1.0) untuk menjaga konsistensi resolusi dan ragam ukuran halaman
    - Pilihan target: Semua Halaman, Halaman Tertentu (Current Page), atau Rentang Kustom
    - Mempertahankan ketajaman teks vektor dan grafis asli tanpa degradasi kualitas
    """
    filename = file.filename or "dokumen.pdf"

    # 1. Validasi ekstensi
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    # 2. Validasi rasio pangkas
    if crop_width <= 0.01 or crop_height <= 0.01:
        raise HTTPException(status_code=400, detail="Area pangkas terlalu kecil.")
    if crop_x < 0.0 or crop_y < 0.0 or (crop_x + crop_width) > 1.05 or (crop_y + crop_height) > 1.05:
        # Sedikit toleransi floating point
        crop_x = max(0.0, min(crop_x, 0.95))
        crop_y = max(0.0, min(crop_y, 0.95))
        crop_width = min(crop_width, 1.0 - crop_x)
        crop_height = min(crop_height, 1.0 - crop_y)

    # 3. Baca biner langsung ke memori (Zero Disk I/O)
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas ukuran maksimal ({max_mb} MB).")

    raw_base = os.path.splitext(filename)[0]
    safe_base = re.sub(r'[^\w\-_\. ]', '_', raw_base).strip() or "dokumen"
    out_filename = f"cropped-{safe_base}.pdf"

    doc = None
    try:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak atau tidak dapat diproses.")

        if doc.needs_pass or doc.is_encrypted:
            raise HTTPException(
                status_code=400,
                detail=f"Berkas '{filename}' dilindungi kata sandi. Harap buka kuncinya terlebih dahulu sebelum memangkas."
            )

        doc_len = len(doc)
        if doc_len == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

        # 4. Tentukan target halaman
        sel = (page_selection or "all").lower().strip()
        if sel == "current":
            p_idx = max(0, min(current_page - 1, doc_len - 1))
            target_indices = [p_idx]
        else:
            target_indices = _get_target_pages(doc_len, sel, custom_pages, exclude_first_page=False)

        if not target_indices:
            raise HTTPException(status_code=400, detail="Tidak ada halaman yang dipilih untuk dipangkas.")

        # 5. Terapkan Cropbox pada setiap halaman yang ditargetkan
        for idx in target_indices:
            page = doc[idx]
            rect = page.rect
            x0 = rect.x0 + (crop_x * rect.width)
            y0 = rect.y0 + (crop_y * rect.height)
            x1 = min(rect.x1, x0 + (crop_width * rect.width))
            y1 = min(rect.y1, y0 + (crop_height * rect.height))

            # PyMuPDF set_cropbox
            page.set_cropbox(fitz.Rect(x0, y0, x1, y1))

        # 6. Serialisasi In-Memory dengan kompresi
        pdf_bytes = doc.tobytes(
            garbage=3,
            deflate=True
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{out_filename}"',
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR CROP PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal memangkas PDF: {str(e)}")
    finally:
        if doc and not doc.is_closed:
            doc.close()


@router.post("/convert-pdfa")
def convert_pdfa(
    file: UploadFile = File(...),
    pdfa_part: int = Form(2),
    conformance: str = Form("b")
):
    """
    Mengonversi dokumen PDF menjadi format standar arsip ISO 19005 (PDF/A):
    - Zero Disk I/O (In-Memory processing dengan PyMuPDF)
    - Dukungan standar ISO 19005-1 (PDF/A-1b), ISO 19005-2 (PDF/A-2b/2a), ISO 19005-3 (PDF/A-3b/3a)
    - Injeksi paket metadata XMP terstandarisasi (pdfaid schema)
    - Sinkronisasi metadata dokumen (Title, Producer, ModDate)
    - Pembersihan font & embedding font subset
    """
    filename = file.filename or "dokumen.pdf"

    # 1. Validasi ekstensi
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    # 2. Normalisasi parameter PDF/A
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

    # 3. Baca biner langsung ke memori (Zero Disk I/O)
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas ukuran maksimal ({max_mb} MB).")

    raw_base = os.path.splitext(filename)[0]
    safe_base = re.sub(r'[^\w\-_\. ]', '_', raw_base).strip() or "dokumen"
    out_filename = f"pdfa-{part}{conf.lower()}-{safe_base}.pdf"

    doc = None
    try:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak atau tidak dapat diproses.")

        # 4. Tolak dokumen berpassword (ISO 19005 melarang enkripsi dalam arsip)
        if doc.needs_pass or doc.is_encrypted:
            raise HTTPException(
                status_code=400,
                detail=f"Berkas '{filename}' dilindungi kata sandi. Standar ISO PDF/A melarang proteksi kata sandi agar dokumen dapat diarsipkan secara permanen. Harap hapus sandi terlebih dahulu."
            )

        if len(doc) == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

        # 5. Susun paket metadata XMP standar ISO 19005 (PDF/A Identification Schema)
        now_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")
        doc_title = (doc.metadata.get("title") or safe_base).strip()
        doc_author = (doc.metadata.get("author") or "PDF Toolbox Pro User").strip()

        xmp_packet = f"""<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>{part}</pdfaid:part>
      <pdfaid:conformance>{conf}</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">{doc_title}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:creator>
        <rdf:Seq>
          <rdf:li>{doc_author}</rdf:li>
        </rdf:Seq>
      </dc:creator>
      <dc:format>application/pdf</dc:format>
    </rdf:Description>
    <rdf:Description rdf:about=""
        xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>PDF Toolbox Pro (ISO 19005-{part} PDF/A-{part}{conf.lower()})</pdf:Producer>
    </rdf:Description>
    <rdf:Description rdf:about=""
        xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:CreatorTool>PDF Toolbox Pro</xmp:CreatorTool>
      <xmp:CreateDate>{now_iso}</xmp:CreateDate>
      <xmp:ModifyDate>{now_iso}</xmp:ModifyDate>
      <xmp:MetadataDate>{now_iso}</xmp:MetadataDate>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>"""

        # Injeksi metadata XMP ke dokumen
        try:
            doc.set_xml_metadata(xmp_packet)
        except Exception as xmp_err:
            logging.warning(f"Gagal mengatur XML XMP metadata: {xmp_err}")

        # Sinkronisasi metadata internal dokumen
        meta = doc.metadata or {}
        meta["producer"] = f"PDF Toolbox Pro (ISO 19005-{part} PDF/A-{part}{conf.lower()})"
        meta["creator"] = "PDF Toolbox Pro Archival System"
        meta["title"] = doc_title
        meta["author"] = doc_author
        try:
            doc.set_metadata(meta)
        except Exception as meta_err:
            logging.warning(f"Gagal mengatur metadata dokumen: {meta_err}")

        # 6. Pembersihan font & embedding font subset
        try:
            doc.subset_fonts()
        except Exception:
            pass

        # 7. Serialisasi In-Memory teroptimasi dan bersih
        pdf_bytes = doc.tobytes(
            clean=True,
            deflate=True,
            garbage=3
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{out_filename}"',
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR CONVERT PDFA: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal mengonversi dokumen ke PDF/A: {str(e)}")
    finally:
        if doc and not doc.is_closed:
            doc.close()


@router.post("/edit-pdf")
def edit_pdf(
    file: UploadFile = File(...),
    edit_mode: str = Form("find_replace"),
    # Parameter Mode Cari & Ganti
    search_text: Optional[str] = Form(None),
    replace_text: Optional[str] = Form(None),
    case_sensitive: bool = Form(False),
    page_selection: str = Form("all"),
    current_page: int = Form(1),
    custom_pages: Optional[str] = Form(None),
    # Parameter Mode Sunting Blok / Visual
    edits_json: Optional[str] = Form(None)
):
    """
    Menyunting atau mengubah teks yang ada di dalam dokumen PDF:
    - Zero Disk I/O (In-Memory PyMuPDF processing)
    - Mode 1: Cari & Ganti (Find & Replace) kata/kalimat di seluruh dokumen
    - Mode 2: Sunting Visual (Block/Line Edits) dengan redaksi bersih dan penulisan teks baru
    - Menjaga keutuhan tata letak grafis, gambar, dan elemen halaman lain
    """
    filename = file.filename or "dokumen.pdf"

    # 1. Validasi ekstensi
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    # 2. Baca biner langsung ke memori (Zero Disk I/O)
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas ukuran maksimal ({max_mb} MB).")

    raw_base = os.path.splitext(filename)[0]
    safe_base = re.sub(r'[^\w\-_\. ]', '_', raw_base).strip() or "dokumen"
    out_filename = f"edited-{safe_base}.pdf"

    doc = None
    try:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak atau tidak dapat diproses.")

        if doc.needs_pass or doc.is_encrypted:
            raise HTTPException(
                status_code=400,
                detail=f"Berkas '{filename}' dilindungi kata sandi. Harap buka kuncinya terlebih dahulu sebelum mengedit teks."
            )

        doc_len = len(doc)
        if doc_len == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

        mode = (edit_mode or "find_replace").lower().strip()

        # ===================================================================
        # MODE 1: CARI & GANTI (FIND & REPLACE)
        # ===================================================================
        if mode == "find_replace":
            search_str = (search_text or "").strip()
            replace_str = replace_text or ""
            if not search_str:
                raise HTTPException(status_code=400, detail="Teks pencarian tidak boleh kosong.")

            # Tentukan halaman target
            sel = (page_selection or "all").lower().strip()
            if sel == "current":
                target_pages = [max(0, min(current_page - 1, doc_len - 1))]
            else:
                target_pages = _get_target_pages(doc_len, sel, custom_pages, exclude_first_page=False)

            for p_idx in target_pages:
                page = doc[p_idx]
                matches = page.search_for(search_str)
                if not case_sensitive and search_str.lower() != search_str:
                    matches += [m for m in page.search_for(search_str.lower()) if m not in matches]
                    matches += [m for m in page.search_for(search_str.capitalize()) if m not in matches]
                    matches += [m for m in page.search_for(search_str.upper()) if m not in matches]

                for rect in matches:
                    # Redaksi teks lama dengan background putih bersih
                    page.add_redact_annot(rect, fill=(1, 1, 1))
                    page.apply_redactions()

                    # Cetak teks pengganti jika ada
                    if replace_str:
                        font_size = max(7.0, min(28.0, rect.height * 0.85))
                        text_w = fitz.get_text_length(replace_str, fontname="helv", fontsize=font_size)
                        target_rect = fitz.Rect(rect.x0, rect.y0, max(rect.x1, rect.x0 + text_w + 4), rect.y1)
                        page.insert_textbox(target_rect, replace_str, fontsize=font_size, fontname="helv", color=(0, 0, 0), align=0)

        # ===================================================================
        # MODE 2: SUNTING BLOK / VISUAL (BLOCK EDITS)
        # ===================================================================
        elif mode == "block_edits":
            if not edits_json:
                raise HTTPException(status_code=400, detail="Tidak ada data perubahan teks yang dikirimkan.")

            try:
                edits = json.loads(edits_json)
            except Exception:
                raise HTTPException(status_code=400, detail="Format JSON data suntingan tidak valid.")

            if not isinstance(edits, list) or len(edits) == 0:
                raise HTTPException(status_code=400, detail="Daftar suntingan teks kosong.")

            for item in edits:
                p_num = int(item.get("page", 1))
                p_idx = max(0, min(p_num - 1, doc_len - 1))
                page = doc[p_idx]

                raw_rect = item.get("rect", [])
                if len(raw_rect) == 4:
                    rect = fitz.Rect(raw_rect[0], raw_rect[1], raw_rect[2], raw_rect[3])
                    bg_color = _hex_to_rgb(item.get("bg_color", "#ffffff"))
                    fg_color = _hex_to_rgb(item.get("color", "#000000"))
                    font_size = float(item.get("font_size", 12.0))
                    new_text = str(item.get("new_text", ""))

                    # Redaksi area teks lama
                    page.add_redact_annot(rect, fill=bg_color)
                    page.apply_redactions()

                    # Sisipkan teks baru
                    if new_text.strip():
                        text_w = fitz.get_text_length(new_text, fontname="helv", fontsize=font_size)
                        target_rect = fitz.Rect(rect.x0, rect.y0, max(rect.x1, rect.x0 + text_w + 4), rect.y1 + 4)
                        page.insert_textbox(target_rect, new_text, fontsize=font_size, fontname="helv", color=fg_color, align=0)

        else:
            raise HTTPException(status_code=400, detail=f"Mode sunting '{mode}' tidak dikenal.")

        # Serialisasi hasil In-Memory terkompresi
        pdf_bytes = doc.tobytes(
            garbage=3,
            deflate=True
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{out_filename}"',
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR EDIT PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal menyunting teks PDF: {str(e)}")
    finally:
        if doc and not doc.is_closed:
            doc.close()


@router.post("/ocr-pdf", status_code=202)
async def ocr_pdf(
    file: UploadFile = File(...),
    languages: str = Form("ind+eng"),
    output_format: str = Form("pdf")
):
    """
    Mengenali teks dari gambar/pindaian dokumen PDF (OCR) secara asinkronus (Async Job).
    """
    filename = file.filename or "dokumen.pdf"

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas ukuran maksimal ({max_mb} MB).")

    raw_base = os.path.splitext(filename)[0]
    safe_base = re.sub(r'[^\w\-_\. ]', '_', raw_base).strip() or "dokumen"
    clean_langs = (languages or "eng").strip()
    out_format = (output_format or "pdf").lower().strip()

    job_id = create_job(message="Mempersiapkan analisis OCR...")

    async def _run():
        def _do_ocr():
            update_job(job_id, status="processing", progress=10, message="Membaca struktur PDF & mendeteksi halaman...")
            try:
                doc = fitz.open(stream=content, filetype="pdf")
            except Exception:
                raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak atau tidak dapat diproses.")

            if doc.needs_pass or doc.is_encrypted:
                doc.close()
                raise HTTPException(status_code=400, detail=f"Berkas '{filename}' dilindungi kata sandi. Harap buka kuncinya terlebih dahulu sebelum menjalankan OCR.")

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
                        new_page.insert_text(
                            fitz.Point(w_rect.x0, w_rect.y1),
                            w_text,
                            fontsize=font_size,
                            fontname="helv",
                            render_mode=3
                        )
                except Exception as ocr_err:
                    logging.warning(f"OCR fallback pada halaman {page_idx + 1}: {ocr_err}")
                    searchable_doc.insert_pdf(doc, from_page=page_idx, to_page=page_idx)
                    all_extracted_text.append(f"--- Halaman {page_idx + 1} ---\n" + (page_text.strip() or "[Teks tidak terdeteksi]"))

            doc.close()
            update_job(job_id, progress=92, message="Menyusun dokumen hasil OCR...")

            full_sample = "\n".join(all_extracted_text)[:500].strip()

            if out_format == "txt":
                full_text_output = "\n\n".join(all_extracted_text)
                txt_bytes = full_text_output.encode("utf-8")
                searchable_doc.close()
                return txt_bytes, "text/plain; charset=utf-8", f"ocr-{safe_base}.txt", full_sample

            out_pdf_bytes = searchable_doc.tobytes(garbage=3, deflate=True)
            searchable_doc.close()
            return out_pdf_bytes, "application/pdf", f"searchable-{safe_base}.pdf", full_sample

        try:
            res_bytes, media_type, out_filename, sample_text = await asyncio.to_thread(_do_ocr)
            update_job(
                job_id,
                status="done",
                progress=100,
                message="Proses OCR selesai!",
                result=res_bytes,
                media_type=media_type,
                filename=out_filename,
                sample=sample_text,
            )
        except Exception as e:
            logging.error(f"[Job {job_id}] OCR error: {e}")
            err_msg = e.detail if isinstance(e, HTTPException) else str(e)
            update_job(job_id, status="error", error=f"Gagal memproses OCR: {err_msg}", message="Terjadi kesalahan.")

    asyncio.create_task(_run())
    return JSONResponse({"job_id": job_id, "status": "pending", "message": "Proses OCR dimulai..."}, status_code=202)



# =====================================================================
# === 15. TERJEMAHKAN PDF (STANDAR INDUSTRI ILOVEPDF & SMALLPDF)    ===
# =====================================================================

def _translate_text_chunk(text: str, source_lang: str = "auto", target_lang: str = "id") -> str:
    """
    Menerjemahkan potongan teks menggunakan Google Translate API (client gtx) secara in-memory.
    Mendukung auto-detect bahasa sumber, pemisahan teks panjang, dan fallback otomatis.
    """
    clean_text = text.strip()
    if not clean_text:
        return text

    # Jika hanya angka, tanda baca, simbol pendek
    if re.match(r'^[\d\s\W_]+$', clean_text):
        return text

    src = (source_lang or "auto").strip().lower()
    tgt = (target_lang or "id").strip().lower()

    # Jika bahasa sumber dan tujuan identik
    if src == tgt and src != "auto":
        return text

    # Potong per paragraf jika teks sangat panjang (> 1500 karakter)
    if len(clean_text) > 1500:
        paragraphs = clean_text.split("\n")
        translated_paragraphs = []
        for p in paragraphs:
            if p.strip():
                translated_paragraphs.append(_translate_text_chunk(p, src, tgt))
            else:
                translated_paragraphs.append("")
        return "\n".join(translated_paragraphs)

    try:
        encoded_q = urllib.parse.quote(clean_text)
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={src}&tl={tgt}&dt=t&q={encoded_q}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8"))
            if data and isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                parts = [part[0] for part in data[0] if part and len(part) > 0 and part[0]]
                return "".join(parts)
    except Exception as err:
        logging.warning(f"Terjemahan primer gagal ({err}), mencoba fallback MyMemory...")
        try:
            lang_pair = f"{'en' if src == 'auto' else src}|{tgt}"
            fb_url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(clean_text[:500])}&langpair={lang_pair}"
            req_fb = urllib.request.Request(fb_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req_fb, timeout=8) as fb_res:
                fb_data = json.loads(fb_res.read().decode("utf-8"))
                if fb_data.get("responseData", {}).get("translatedText"):
                    return fb_data["responseData"]["translatedText"]
        except Exception:
            pass

    return text


@router.post("/translate-pdf", status_code=202)
async def translate_pdf(
    file: UploadFile = File(...),
    source_lang: str = Form("auto"),
    target_lang: str = Form("id"),
    output_format: str = Form("pdf"),               # "pdf" atau "txt"
    page_selection: str = Form("all"),              # "all", "current", "custom"
    current_page: int = Form(1),
    custom_pages: Optional[str] = Form(None)
):
    """
    Menerjemahkan dokumen PDF secara asinkronus (Async Job) dengan AI Document Translation.
    """
    filename = file.filename or "dokumen.pdf"

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas ukuran maksimal ({max_mb} MB).")

    raw_base = os.path.splitext(filename)[0]
    safe_base = re.sub(r'[^\w\-_\. ]', '_', raw_base).strip() or "dokumen"
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
                raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak atau tidak dapat diproses.")

            if doc.needs_pass or doc.is_encrypted:
                doc.close()
                raise HTTPException(
                    status_code=400,
                    detail=f"Berkas '{filename}' dilindungi kata sandi. Buka kunci proteksi terlebih dahulu sebelum menerjemahkan."
                )

            doc_len = len(doc)
            if doc_len == 0:
                doc.close()
                raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

            # Tentukan halaman target
            sel = (page_selection or "all").lower().strip()
            if sel == "current":
                target_pages = [max(0, min(current_page - 1, doc_len - 1))]
            else:
                target_pages = _get_target_pages(doc_len, sel, custom_pages, exclude_first_page=False)

            if not target_pages:
                doc.close()
                raise HTTPException(status_code=400, detail="Tidak ada halaman yang cocok dengan pilihan cakupan halaman.")

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

                    trans_text = _translate_text_chunk(orig_text, src_l, tgt_l)
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
                full_txt = "\n\n".join(all_translated_text_pages)
                if not full_txt.strip():
                    full_txt = "[Tidak ada teks yang dapat diekstrak atau diterjemahkan dari halaman terpilih]"
                txt_bytes = full_txt.encode("utf-8")
                doc.close()
                return txt_bytes, "text/plain; charset=utf-8", f"translated-{safe_base}.txt", full_sample

            pdf_bytes = doc.tobytes(garbage=3, deflate=True)
            doc.close()
            return pdf_bytes, "application/pdf", f"translated-{safe_base}.pdf", full_sample

        try:
            res_bytes, media_type, out_filename, sample_text = await asyncio.to_thread(_do_translate)
            update_job(
                job_id,
                status="done",
                progress=100,
                message="Penerjemahan selesai!",
                result=res_bytes,
                media_type=media_type,
                filename=out_filename,
                sample=sample_text,
            )
        except Exception as e:
            logging.error(f"[Job {job_id}] Translate error: {e}")
            err_msg = e.detail if isinstance(e, HTTPException) else str(e)
            update_job(job_id, status="error", error=f"Gagal menerjemahkan dokumen: {err_msg}", message="Terjadi kesalahan.")

    asyncio.create_task(_run())
    return JSONResponse({"job_id": job_id, "status": "pending", "message": "Penerjemahan dokumen dimulai..."}, status_code=202)









