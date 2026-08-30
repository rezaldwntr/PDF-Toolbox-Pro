# app/routers/tools.py
import os
import shutil
import logging
import tempfile
from typing import List, Optional
from enum import Enum
from zipfile import ZipFile

from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks, Form
from fastapi.responses import FileResponse
import fitz  # PyMuPDF

from app.utils.file_utils import validate_file, cleanup_folder

router = APIRouter(prefix="/tools", tags=["Tools"])

# --- ENUM UNTUK OPSI SPLIT ---
class SplitType(str, Enum):
    EXTRACT = "extract"      # Halaman dipilih -> Jadi 1 File PDF
    FIXED = "fixed"          # Setiap X halaman -> Jadi Banyak File (ZIP)
    ALL = "all"              # Setiap 1 halaman -> Jadi Banyak File (ZIP)

# === 5. GABUNGKAN PDF (MERGE) ===
@router.post("/merge-pdf")
def merge_pdf(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...)):
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="Minimal upload 2 file PDF.")
    
    tmp_dir = tempfile.mkdtemp()
    merged_filename = "merged_document.pdf"
    tmp_merged_path = os.path.join(tmp_dir, merged_filename)

    try:
        merged_doc = fitz.open()
        for file in files:
            if not file.filename.lower().endswith(".pdf"): continue
            file_path = os.path.join(tmp_dir, file.filename)
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
            doc = fitz.open(file_path)
            merged_doc.insert_pdf(doc)
            doc.close()
        
        merged_doc.save(tmp_merged_path)
        merged_doc.close()
        background_tasks.add_task(cleanup_folder, tmp_dir)
        return FileResponse(path=tmp_merged_path, filename=merged_filename, media_type='application/pdf')
    except Exception as e:
        cleanup_folder(tmp_dir)
        raise HTTPException(status_code=500, detail=f"Gagal Merge: {str(e)}")

# === 6. PISAHKAN PDF (ADVANCED SPLIT) ===
@router.post("/split-pdf")
def split_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    split_mode: SplitType = Form(...),          # extract, fixed, atau all
    pages: Optional[str] = Form(None),          # Wajib jika mode 'extract' (contoh: "1-5,7")
    fixed_step: Optional[int] = Form(None)      # Wajib jika mode 'fixed' (contoh: 2)
):
    validate_file(file)
    tmp_dir = tempfile.mkdtemp()
    tmp_pdf_path = os.path.join(tmp_dir, file.filename)
    
    # Nama output dasar
    base_name = os.path.splitext(file.filename)[0]

    try:
        with open(tmp_pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        src_doc = fitz.open(tmp_pdf_path)
        total_pages = len(src_doc)

        # === MODE 1: EKSTRAK HALAMAN TERTENTU (JADI 1 FILE PDF) ===
        if split_mode == SplitType.EXTRACT:
            if not pages:
                raise HTTPException(status_code=400, detail="Parameter 'pages' wajib diisi untuk mode Extract.")
            
            output_filename = f"{base_name}_extracted.pdf"
            output_path = os.path.join(tmp_dir, output_filename)
            new_doc = fitz.open()

            # Parsing halaman (Contoh: "1-3,5")
            selected_indices = []
            try:
                for part in pages.split(','):
                    part = part.strip()
                    if '-' in part:
                        s, e = map(int, part.split('-'))
                        selected_indices.extend(range(s-1, e))
                    else:
                        selected_indices.append(int(part)-1)
            except:
                raise HTTPException(status_code=400, detail="Format halaman salah. Contoh: 1-5, 7")

            # Insert halaman
            for idx in selected_indices:
                if 0 <= idx < total_pages:
                    new_doc.insert_pdf(src_doc, from_page=idx, to_page=idx)
            
            if len(new_doc) == 0:
                raise HTTPException(status_code=400, detail="Halaman tidak ditemukan/kosong.")

            new_doc.save(output_path)
            new_doc.close()
            src_doc.close()

            background_tasks.add_task(cleanup_folder, tmp_dir)
            return FileResponse(path=output_path, filename=output_filename, media_type='application/pdf')

        # === MODE 2 & 3: HASIL BANYAK FILE (ZIP) ===
        else:
            zip_filename = f"{base_name}_split.zip"
            zip_path = os.path.join(tmp_dir, zip_filename)
            
            with ZipFile(zip_path, 'w') as zipf:
                
                # -- SUB-LOGIC: SPLIT SETIAP HALAMAN (ALL) --
                if split_mode == SplitType.ALL:
                    for i in range(total_pages):
                        new_doc = fitz.open()
                        new_doc.insert_pdf(src_doc, from_page=i, to_page=i)
                        
                        # UPDATE: Menggunakan format 03d (page_001.pdf)
                        pdf_name = f"{base_name}_page_{i+1:03d}.pdf"
                        pdf_path = os.path.join(tmp_dir, pdf_name)
                        new_doc.save(pdf_path)
                        new_doc.close()
                        
                        zipf.write(pdf_path, pdf_name)

                # -- SUB-LOGIC: SPLIT SETIAP X HALAMAN (FIXED) --
                elif split_mode == SplitType.FIXED:
                    if not fixed_step or fixed_step < 1:
                        raise HTTPException(status_code=400, detail="Parameter 'fixed_step' wajib diisi minimal 1.")
                    
                    # Loop dengan step (misal 0, 2, 4...)
                    chunk_counter = 1
                    for i in range(0, total_pages, fixed_step):
                        start_page = i
                        end_page = min(i + fixed_step - 1, total_pages - 1)
                        
                        new_doc = fitz.open()
                        new_doc.insert_pdf(src_doc, from_page=start_page, to_page=end_page)
                        
                        # UPDATE: Menggunakan format 03d (part_001.pdf)
                        pdf_name = f"{base_name}_part_{chunk_counter:03d}.pdf"
                        pdf_path = os.path.join(tmp_dir, pdf_name)
                        new_doc.save(pdf_path)
                        new_doc.close()
                        
                        zipf.write(pdf_path, pdf_name)
                        chunk_counter += 1

            src_doc.close()
            background_tasks.add_task(cleanup_folder, tmp_dir)
            return FileResponse(path=zip_path, filename=zip_filename, media_type='application/zip')

    except Exception as e:
        cleanup_folder(tmp_dir)
        raise HTTPException(status_code=500, detail=f"Gagal Split: {str(e)}")

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
