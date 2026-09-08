# app/routers/tools.py
import os
import io
import re
import shutil
import logging
import tempfile
from typing import List, Optional
from enum import Enum
from zipfile import ZipFile, ZIP_DEFLATED

from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks, Form, Response
from fastapi.responses import FileResponse
import fitz  # PyMuPDF

from app.core.config import MAX_FILE_SIZE
from app.utils.file_utils import validate_file, cleanup_folder

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

# === 7. KOMPRES PDF (COMPRESS) ===
class CompressionType(str, Enum):
    RECOMMENDED = "recommended"
    TARGET = "target"

@router.post("/compress-pdf")
def compress_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    compression_type: CompressionType = Form(CompressionType.RECOMMENDED),
    target_size_kb: Optional[int] = Form(None)
):
    validate_file(file)
    tmp_dir = tempfile.mkdtemp()
    tmp_pdf_path = os.path.join(tmp_dir, file.filename)
    comp_filename = f"compressed_{file.filename}"
    tmp_comp_path = os.path.join(tmp_dir, comp_filename)

    try:
        with open(tmp_pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        doc = fitz.open(tmp_pdf_path)

        if compression_type == CompressionType.RECOMMENDED:
            doc.save(tmp_comp_path, garbage=4, deflate=True, clean=True)
        
        elif compression_type == CompressionType.TARGET and target_size_kb:
            target_bytes = target_size_kb * 1024
            doc.save(tmp_comp_path, garbage=4, deflate=True)
            current_size = os.path.getsize(tmp_comp_path)
            
            if current_size > target_bytes:
                for dpi_level in [96, 72, 50]:
                    if current_size <= target_bytes: break
                    new_doc = fitz.open()
                    for page in doc:
                        pix = page.get_pixmap(dpi=dpi_level)
                        img_bytes = pix.pil_tobytes(format="JPEG", quality=70, optimize=True)
                        img_page = new_doc.new_page(width=page.rect.width, height=page.rect.height)
                        img_page.insert_image(page.rect, stream=img_bytes)
                    new_doc.save(tmp_comp_path, garbage=4, deflate=True)
                    new_doc.close()
                    current_size = os.path.getsize(tmp_comp_path)
        else:
            doc.save(tmp_comp_path, garbage=4, deflate=True)

        doc.close()
        background_tasks.add_task(cleanup_folder, tmp_dir)
        return FileResponse(path=tmp_comp_path, filename=comp_filename, media_type='application/pdf')

    except Exception as e:
        cleanup_folder(tmp_dir)
        logging.error(f"ERROR COMPRESS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal kompres PDF: {str(e)}")
