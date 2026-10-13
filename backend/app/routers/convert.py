# app/routers/convert.py
import os
import io
import re
import shutil
import logging
import tempfile
import asyncio
import multiprocessing
from zipfile import ZipFile, ZIP_DEFLATED
from typing import Optional

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, BackgroundTasks, Response
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse

# Library Konversi
from pdf2docx import Converter
import fitz  # PyMuPDF
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE
import pdfplumber
import pandas as pd
from openpyxl.styles import Border, Side, Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from app.utils.file_utils import validate_file, cleanup_folder, get_safe_base_name, get_mime_type
from app.utils.job_store import create_job, update_job
from app.utils.async_task import create_tracked_task

router = APIRouter(prefix="/convert", tags=["Conversion"])


def sanitize_filename(name: str) -> str:
    """Membersihkan nama berkas dari karakter terlarang."""
    return get_safe_base_name(name, default="document")

def parse_cell_value(val):
    """
    Mengonversi nilai string ke tipe numerik HANYA jika aman.
    Semua nomor identitas (NIP 18 digit, NIK 16 digit, No HP, No Rekening, Kode berawalan 0)
    WAJIB DIPERTAHANKAN SEBAGAI STRING agar Excel tidak merusaknya menjadi notasi ilmiah (2,00112E+17)
    atau memotong digit-digit terakhirnya.
    """
    if val is None:
        return ""
    val_str = str(val).strip()
    if not val_str:
        return ""

    # 1. Awalan '0' dengan panjang > 1 (Nomor HP, Kode Wilayah, dll) -> SELALU STRING
    if val_str.startswith("0") and len(val_str) > 1:
        return val_str

    # 2. Identifier panjang (NIP 18 digit, NIK 16 digit, No Rekening >= 10 digit) -> SELALU STRING
    digits_only = re.sub(r'\D', '', val_str)
    if len(digits_only) >= 10:
        return val_str

    # 3. String dengan spasi/strip di antara angka (misal format NIP: 19980420 202305 1 002) -> STRING
    if (" " in val_str or "-" in val_str) and any(c.isdigit() for c in val_str):
        if not re.match(r'^-?\d+(\.\d+)?$', val_str):
            return val_str

    # 4. Bilangan bulat pendek aman (1 s/d 8 digit, tanpa awalan 0, misal: No Urut 1..9999, Kuantitas, Nilai 85)
    cleaned = val_str.replace(",", "")
    if re.match(r'^-?\d+$', cleaned) and len(cleaned) <= 8 and not cleaned.startswith("0"):
        try:
            return int(cleaned)
        except ValueError:
            pass

    # 5. Bilangan pecahan desimal pendek (misal: 85.5, 12.75)
    if re.match(r'^-?\d+\.\d+$', cleaned) and len(cleaned) <= 9:
        try:
            return float(cleaned)
        except ValueError:
            pass

    return val_str


# === 1. PDF KE DOCX (ASYNC JOB) ===
@router.post("/pdf-to-docx", status_code=202)
async def convert_pdf_to_docx(
    file: UploadFile = File(...),
    start_page: Optional[int] = Form(None),
    end_page: Optional[int] = Form(None),
    layout_mode: str = Form("editable"),
):
    validate_file(file)
    safe_basename = get_safe_base_name(file.filename, default="document")
    docx_filename = f"{safe_basename}.docx"

    # Baca file di main thread sebelum masuk thread pool
    pdf_bytes = await file.read()

    job_id = create_job(message="Mempersiapkan konversi Word...")

    async def _run():
        tmp_dir = tempfile.mkdtemp()
        tmp_pdf_path = os.path.join(tmp_dir, f"input_{safe_basename}.pdf")
        tmp_docx_path = os.path.join(tmp_dir, docx_filename)
        try:
            update_job(job_id, status="processing", progress=10, message="Membaca struktur PDF...")
            with open(tmp_pdf_path, "wb") as f:
                f.write(pdf_bytes)

            selected_pages = None
            if start_page is not None or end_page is not None:
                with fitz.open(tmp_pdf_path) as doc_check:
                    actual_total = len(doc_check)
                s_page = (start_page - 1) if (start_page is not None and start_page > 0) else 0
                e_page = end_page if (end_page is not None and end_page > 0) else actual_total
                if s_page < actual_total:
                    e_page = min(e_page, actual_total)
                    selected_pages = list(range(s_page, e_page))

            update_job(job_id, progress=30, message="Menganalisis tata letak teks dan tabel...")

            def _do_convert():
                cv = Converter(tmp_pdf_path)
                try:
                    if selected_pages is not None:
                        cv.convert(
                            tmp_docx_path,
                            pages=selected_pages,
                            connected_border_tolerance=0.5,
                            line_overlap_threshold=0.9,
                            line_break_free_space_ratio=0.1,
                            line_separate_threshold=5.0,
                            new_paragraph_free_space_ratio=0.85,
                        )
                    else:
                        cv.convert(
                            tmp_docx_path,
                            connected_border_tolerance=0.5,
                            line_overlap_threshold=0.9,
                            line_break_free_space_ratio=0.1,
                            line_separate_threshold=5.0,
                            new_paragraph_free_space_ratio=0.85,
                        )
                except Exception as conv_err:
                    logging.warning(f"pdf2docx tuned convert failed, fallback: {conv_err}")
                    cv.close()
                    cv = Converter(tmp_pdf_path)
                    if selected_pages is not None:
                        cv.convert(tmp_docx_path, pages=selected_pages)
                    else:
                        cv.convert(tmp_docx_path)
                finally:
                    cv.close()

            update_job(job_id, progress=50, message="Mengonversi teks, tabel, dan gambar ke format Word yang dapat diedit...")
            await asyncio.to_thread(_do_convert)

            update_job(job_id, progress=90, message="Menyusun dokumen Word final...")
            with open(tmp_docx_path, "rb") as out_f:
                result_bytes = out_f.read()

            update_job(
                job_id,
                status="done",
                progress=100,
                message="Konversi selesai!",
                result=result_bytes,
                media_type=get_mime_type("docx"),
                filename=docx_filename,
            )
        except Exception as e:
            logging.error(f"[Job {job_id}] PDF to Word error: {e}")
            update_job(job_id, status="error", error=f"Gagal convert Word: {str(e)}", message="Terjadi kesalahan.")
        finally:
            cleanup_folder(tmp_dir)

    create_tracked_task(_run())
    return JSONResponse({"job_id": job_id, "status": "pending", "message": "Konversi Word dimulai..."}, status_code=202)



# === 2. PDF KE EXCEL (ASYNC JOB) ===
@router.post("/pdf-to-excel", status_code=202)
async def convert_pdf_to_excel(
    file: UploadFile = File(...),
    mode: str = Form("tables_only"),
    sheet_per_page: bool = Form(False),
):
    validate_file(file)
    safe_basename = get_safe_base_name(file.filename, default="document")
    xlsx_filename = f"{safe_basename}.xlsx"
    pdf_bytes = await file.read()
    job_id = create_job(message="Mempersiapkan konversi Excel...")

    async def _run():
        tmp_dir = tempfile.mkdtemp()
        tmp_pdf_path = os.path.join(tmp_dir, f"input_{safe_basename}.pdf")
        tmp_xlsx_path = os.path.join(tmp_dir, xlsx_filename)

        def _do_excel():
            with open(tmp_pdf_path, "wb") as buffer:
                buffer.write(pdf_bytes)

            update_job(job_id, status="processing", progress=10, message="Membaca struktur halaman PDF...")
            doc = fitz.open(tmp_pdf_path)
            num_pages = len(doc)

            # Batas keamanan Denial-of-Service / Resource Exhaustion (Cloudflare Audit VULN-04)
            MAX_EXCEL_PAGES = 150
            if num_pages > MAX_EXCEL_PAGES:
                doc.close()
                raise ValueError(
                    f"Dokumen memiliki {num_pages} halaman (Batas maksimal konversi Excel sekaligus adalah {MAX_EXCEL_PAGES} halaman untuk menjaga stabilitas RAM server). "
                    f"Silakan gunakan alat 'Pisahkan PDF' terlebih dahulu."
                )

            thin_border = Border(
                left=Side(style='thin', color='D3D3D3'),
                right=Side(style='thin', color='D3D3D3'),
                top=Side(style='thin', color='D3D3D3'),
                bottom=Side(style='thin', color='D3D3D3')
            )
            header_fill = PatternFill(start_color='F0F4F8', end_color='F0F4F8', fill_type='solid')
            header_font = Font(bold=True, name='Calibri')
            header_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            data_alignment = Alignment(vertical='top', wrap_text=True)

            plum_doc = None
            try:
                import openpyxl
                wb = openpyxl.Workbook()
                default_sheet = wb.active

                def autofit(ws):
                    for col in ws.columns:
                        max_len = 0
                        col_letter = get_column_letter(col[0].column)
                        for cell in col:
                            if cell.value is not None:
                                first_line = str(cell.value).split('\n')[0]
                                max_len = max(max_len, len(first_line))
                        ws.column_dimensions[col_letter].width = min(max(max_len + 3, 11), 50)

                def is_table_header(row):
                    """Mendeteksi apakah sebuah baris adalah baris judul/header tabel."""
                    if not row or not any(row):
                        return False
                    row_strs = [str(c or "").strip().lower() for c in row if c is not None and str(c).strip()]
                    if not row_strs:
                        return False

                    first_val = row_strs[0]
                    # Jika kolom pertama adalah nomor urut numerik (>0), ini adalah data baris, BUKAN header!
                    if re.match(r'^\d+[\.\)]?$', first_val):
                        num = int(re.sub(r'\D', '', first_val))
                        if num > 0:
                            return False

                    # Kata kunci umum judul kolom tabel Indonesia & Internasional
                    header_keywords = {
                        'no', 'no.', 'nomor', 'nip', 'nik', 'nama', 'nama lengkap', 'unit kerja', 'jabatan',
                        'jadwal', 'tanggal', 'waktu', 'tempat', 'ruang', 'kegiatan', 'uraian', 'keterangan',
                        'standar kompetensi', 'kompetensi', 'tujuan', 'strategi', 'metode', 'mata pelatihan',
                        'jp', 'jumlah jp', 'hari', 'nilai', 'bobot', 'skor', 'status', 'hasil', 'predikat',
                        'instansi', 'pelaksanaan', 'jenis penguatan', 'lokasi', 'sesi'
                    }
                    match_count = sum(1 for s in row_strs if any(kw in s for kw in header_keywords))
                    if match_count >= 2 or (len(row_strs) <= 2 and match_count >= 1):
                        return True

                    # Baris nomor kolom penanda resmi (1, 2, 3, 4, 5...)
                    if all(re.match(r'^\d+$', s) for s in row_strs) and len(row_strs) >= 3:
                        nums = [int(s) for s in row_strs]
                        if nums == list(range(1, len(nums) + 1)):
                            return True

                    return False

                def is_same_header(header1, header2):
                    """Mendeteksi apakah header2 adalah pengulangan dari header1 pada halaman lanjutan."""
                    if not header1 or not header2:
                        return False
                    if len(header1) != len(header2):
                        return False
                    h1 = [str(c or "").strip().lower() for c in header1]
                    h2 = [str(c or "").strip().lower() for c in header2]
                    matches = sum(1 for a, b in zip(h1, h2) if a == b and a != "")
                    return matches >= max(2, len(h1) // 2)

                def write_openpyxl_cell(cell, raw_val, is_header=False):
                    parsed = parse_cell_value(raw_val)
                    cell.border = thin_border
                    if is_header:
                        cell.fill = header_fill
                        cell.font = header_font
                        cell.alignment = header_alignment
                        cell.value = str(parsed)
                        cell.number_format = '@'
                    else:
                        cell.alignment = data_alignment
                        if isinstance(parsed, str):
                            cell.number_format = '@'
                            cell.value = parsed
                        else:
                            cell.value = parsed

                def get_page_tables_and_text(page_idx):
                    nonlocal plum_doc
                    fitz_page = doc[page_idx]
                    tables_data = []
                    if hasattr(fitz_page, 'find_tables'):
                        try:
                            tabs = fitz_page.find_tables()
                            for tab in tabs:
                                extracted = tab.extract()
                                if extracted and len(extracted) > 0:
                                    tables_data.append(extracted)
                        except Exception as tab_err:
                            logging.warning(f"fitz find_tables error on page {page_idx}: {tab_err}")
                    if not tables_data:
                        try:
                            if plum_doc is None:
                                plum_doc = pdfplumber.open(tmp_pdf_path)
                            if plum_doc and page_idx < len(plum_doc.pages):
                                plum_tabs = plum_doc.pages[page_idx].extract_tables()
                                for pt in plum_tabs:
                                    if pt and len(pt) > 0:
                                        tables_data.append(pt)
                        except Exception as plum_err:
                            logging.warning(f"pdfplumber fallback error on page {page_idx}: {plum_err}")
                    text_lines = []
                    if mode == "all_content":
                        blocks = fitz_page.get_text("blocks")
                        for b in blocks:
                            if len(b) > 4 and b[6] == 0:
                                cleaned_block = b[4].strip()
                                if cleaned_block:
                                    text_lines.extend(cleaned_block.split('\n'))
                    return tables_data, text_lines

                update_job(job_id, progress=30, message="Mendeteksi dan mengekstrak tabel...")

                if sheet_per_page:
                    for page_idx in range(num_pages):
                        tables, text_lines = get_page_tables_and_text(page_idx)
                        sheet_name = f"Hal {page_idx + 1}"
                        if page_idx == 0 and default_sheet is not None:
                            ws = default_sheet
                            ws.title = sheet_name
                        else:
                            ws = wb.create_sheet(title=sheet_name)
                        cur_row = 1
                        any_table_found = False
                        for tbl in tables:
                            if not tbl or len(tbl) == 0:
                                continue
                            any_table_found = True
                            first_row = tbl[0]
                            first_row_is_header = is_table_header(first_row)
                            if first_row_is_header:
                                for c_idx, val in enumerate(first_row, start=1):
                                    cell = ws.cell(row=cur_row, column=c_idx)
                                    write_openpyxl_cell(cell, val, is_header=True)
                                cur_row += 1
                                data_start = 1
                            else:
                                data_start = 0

                            for r_idx in range(data_start, len(tbl)):
                                row_data = tbl[r_idx]
                                for c_idx, val in enumerate(row_data, start=1):
                                    cell = ws.cell(row=cur_row, column=c_idx)
                                    write_openpyxl_cell(cell, val, is_header=False)
                                cur_row += 1
                            cur_row += 2
                        if not any_table_found and mode == "tables_only":
                            ws.cell(row=1, column=1, value="Tidak ada tabel terdeteksi di halaman ini.")
                        autofit(ws)
                else:
                    # Mode 1 Sheet Gabungan: Sambung tabel multi-halaman secara seamless
                    page_tables = []
                    pre_table_metadata = []
                    for page_idx in range(num_pages):
                        tables, text_lines = get_page_tables_and_text(page_idx)
                        page_tables.append(tables)
                        if page_idx == 0 and mode == "all_content" and text_lines:
                            pre_table_metadata = text_lines[:6]

                    ws = default_sheet if default_sheet is not None else wb.create_sheet(title="Hasil Ekstraksi")
                    ws.title = "Hasil Ekstraksi"
                    cur_row = 1

                    # Tulis metadata dokumen di paling atas (hanya jika mode all_content)
                    if mode == "all_content" and pre_table_metadata:
                        for meta_line in pre_table_metadata:
                            ws.cell(row=cur_row, column=1, value=meta_line)
                            ws.cell(row=cur_row, column=1).font = Font(bold=True, name='Calibri')
                            cur_row += 1
                        cur_row += 1

                    current_table_cols = 0
                    current_table_header = None
                    total_detected_tables = 0

                    for page_idx, tables_on_page in enumerate(page_tables):
                        for tbl in tables_on_page:
                            if not tbl or len(tbl) == 0:
                                continue

                            first_row = tbl[0]
                            first_row_is_header = is_table_header(first_row)

                            # Evaluasi apakah tabel ini kelanjutan dari tabel aktif sebelumnya
                            is_continuation = False
                            if current_table_cols > 0 and len(first_row) == current_table_cols:
                                if first_row_is_header and current_table_header and is_same_header(current_table_header, first_row):
                                    is_continuation = True
                                elif not first_row_is_header:
                                    is_continuation = True

                            if is_continuation:
                                # Lanjutan tabel sebelumnya: sambung langsung baris data
                                start_r = 1 if first_row_is_header else 0
                                for r_idx in range(start_r, len(tbl)):
                                    row_data = tbl[r_idx]
                                    for c_idx, val in enumerate(row_data, start=1):
                                        cell = ws.cell(row=cur_row, column=c_idx)
                                        write_openpyxl_cell(cell, val, is_header=False)
                                    cur_row += 1
                            else:
                                # Tabel baru
                                total_detected_tables += 1
                                if cur_row > 1 and (cur_row > len(pre_table_metadata) + 2 if pre_table_metadata else True):
                                    cur_row += 2

                                current_table_cols = len(first_row)
                                if first_row_is_header:
                                    current_table_header = first_row
                                    for c_idx, val in enumerate(first_row, start=1):
                                        cell = ws.cell(row=cur_row, column=c_idx)
                                        write_openpyxl_cell(cell, val, is_header=True)
                                    cur_row += 1
                                    data_start = 1
                                else:
                                    current_table_header = None
                                    data_start = 0

                                for r_idx in range(data_start, len(tbl)):
                                    row_data = tbl[r_idx]
                                    for c_idx, val in enumerate(row_data, start=1):
                                        cell = ws.cell(row=cur_row, column=c_idx)
                                        write_openpyxl_cell(cell, val, is_header=False)
                                    cur_row += 1

                    if total_detected_tables == 0:
                        ws.cell(row=1, column=1, value="Tidak ada tabel terdeteksi di dokumen ini.")
                    autofit(ws)

                wb.save(tmp_xlsx_path)

            finally:
                if plum_doc:
                    try:
                        plum_doc.close()
                    except Exception:
                        pass
                try:
                    doc.close()
                except Exception:
                    pass

            update_job(job_id, progress=90, message="Menyusun file Excel...")
            with open(tmp_xlsx_path, "rb") as out_f:
                return out_f.read()

        try:
            result_bytes = await asyncio.to_thread(_do_excel)
            update_job(
                job_id,
                status="done",
                progress=100,
                message="Konversi selesai!",
                result=result_bytes,
                media_type=get_mime_type("xlsx"),
                filename=xlsx_filename,
            )
        except Exception as e:
            logging.error(f"[Job {job_id}] Excel error: {e}")
            update_job(job_id, status="error", error=f"Gagal convert Excel: {str(e)}", message="Terjadi kesalahan.")
        finally:
            cleanup_folder(tmp_dir)

    create_tracked_task(_run())
    return JSONResponse({"job_id": job_id, "status": "pending", "message": "Konversi Excel dimulai..."}, status_code=202)


# === 3. PDF KE PPT (ASYNC JOB) ===
@router.post("/pdf-to-ppt", status_code=202)
async def convert_pdf_to_ppt(
    file: UploadFile = File(...),
    layout_mode: str = Form("editable"),
):
    validate_file(file)
    safe_basename = get_safe_base_name(file.filename, default="document")
    ppt_filename = f"{safe_basename}.pptx"
    pdf_bytes = await file.read()
    job_id = create_job(message="Mempersiapkan konversi PowerPoint...")

    async def _run():
        tmp_dir = tempfile.mkdtemp()
        tmp_pdf_path = os.path.join(tmp_dir, f"input_{safe_basename}.pdf")
        tmp_ppt_path = os.path.join(tmp_dir, ppt_filename)

        def _do_ppt():
            with open(tmp_pdf_path, "wb") as buffer:
                buffer.write(pdf_bytes)

            update_job(job_id, status="processing", progress=15, message="Membaca struktur slide...")
            prs = Presentation()
            doc = fitz.open(tmp_pdf_path)
            try:
                num_pages = len(doc)
                if num_pages > 0:
                    p1 = doc[0]
                    prs.slide_width = int((p1.rect.width / 72) * 914400)
                    prs.slide_height = int((p1.rect.height / 72) * 914400)

                blank_slide_layout = prs.slide_layouts[6]

                for i, page in enumerate(doc):
                    pct = int(20 + (i / max(1, num_pages)) * 70)
                    update_job(job_id, progress=pct, message=f"Menyusun slide {i + 1} dari {num_pages}...")
                    slide = prs.slides.add_slide(blank_slide_layout)

                    if layout_mode == "visual":
                        pix = page.get_pixmap(dpi=150)
                        bg_img_path = os.path.join(tmp_dir, f"bg_{i}.png")
                        pix.save(bg_img_path)
                        slide.shapes.add_picture(bg_img_path, 0, 0, width=prs.slide_width, height=prs.slide_height)

                        text_page = page.get_text("dict")
                        for b in text_page["blocks"]:
                            if b["type"] == 0:
                                bx0, by0, bx1, by1 = b["bbox"]
                                width = max(bx1 - bx0, 25)
                                height = max(by1 - by0, 12)
                                txBox = slide.shapes.add_textbox(Inches(bx0 / 72), Inches(by0 / 72), Inches(width / 72), Inches(height / 72))
                                tf = txBox.text_frame
                                tf.word_wrap = True
                                tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

                                first_p = True
                                for line in b["lines"]:
                                    p = tf.paragraphs[0] if first_p else tf.add_paragraph()
                                    first_p = False
                                    for span in line["spans"]:
                                        text = span["text"].strip()
                                        if not text:
                                            continue
                                        run = p.add_run()
                                        run.text = text + " "
                                        run.font.size = Pt(max(span["size"], 8))
                    else:
                        img_blocks = [b for b in page.get_text("dict", flags=fitz.TEXT_PRESERVE_IMAGES)["blocks"] if b['type'] == 1]
                        for b in img_blocks:
                            img_path = os.path.join(tmp_dir, f"img_{os.urandom(4).hex()}.{b.get('ext', 'png')}")
                            with open(img_path, "wb") as f:
                                f.write(b["image"])
                            x0, y0, x1, y1 = b["bbox"]
                            try:
                                slide.shapes.add_picture(
                                    img_path,
                                    Inches(x0 / 72),
                                    Inches(y0 / 72),
                                    width=Inches((x1 - x0) / 72),
                                    height=Inches((y1 - y0) / 72)
                                )
                            except Exception:
                                pass

                        text_blocks = [b for b in page.get_text("dict")["blocks"] if b['type'] == 0]
                        for b in text_blocks:
                            bx0, by0, bx1, by1 = b["bbox"]
                            width = max(bx1 - bx0, 30)
                            height = max(by1 - by0, 15)
                            txBox = slide.shapes.add_textbox(
                                Inches(bx0 / 72),
                                Inches(by0 / 72),
                                Inches(width / 72),
                                Inches(height / 72)
                            )
                            tf = txBox.text_frame
                            tf.word_wrap = True
                            tf.auto_size = MSO_AUTO_SIZE.SHAPE_TO_FIT_TEXT
                            tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

                            first_paragraph = True
                            for line in b["lines"]:
                                p = tf.paragraphs[0] if first_paragraph else tf.add_paragraph()
                                first_paragraph = False
                                for span in line["spans"]:
                                    if not span["text"]:
                                        continue
                                    run = p.add_run()
                                    run.text = span["text"]
                                    run.font.size = Pt(max(span["size"], 9))
                                    try:
                                        c = span["color"]
                                        run.font.color.rgb = RGBColor((c >> 16) & 0xFF, (c >> 8) & 0xFF, c & 0xFF)
                                    except Exception:
                                        pass
                                    if span.get("flags", 0) & 16:
                                        run.font.bold = True
                                    if span.get("flags", 0) & 2:
                                        run.font.italic = True
                                    if "bold" in span.get("font", "").lower():
                                        run.font.bold = True
            finally:
                if doc and not doc.is_closed:
                    doc.close()

            prs.save(tmp_ppt_path)
            update_job(job_id, progress=95, message="Menyusun file PowerPoint final...")
            with open(tmp_ppt_path, "rb") as out_f:
                return out_f.read()

        try:
            result_bytes = await asyncio.to_thread(_do_ppt)
            update_job(
                job_id,
                status="done",
                progress=100,
                message="Konversi selesai!",
                result=result_bytes,
                media_type=get_mime_type("pptx"),
                filename=ppt_filename,
            )
        except Exception as e:
            logging.error(f"[Job {job_id}] PPT error: {e}")
            update_job(job_id, status="error", error=f"Gagal convert PPT: {str(e)}", message="Terjadi kesalahan.")
        finally:
            cleanup_folder(tmp_dir)

    create_tracked_task(_run())
    return JSONResponse({"job_id": job_id, "status": "pending", "message": "Konversi PowerPoint dimulai..."}, status_code=202)


# === 4. PDF KE IMAGE (ASYNC JOB) ===
@router.post("/pdf-to-image", status_code=202)
async def convert_pdf_to_image(
    file: UploadFile = File(...),
    output_format: str = Form("jpg"),
    dpi: int = Form(150),
    extract_mode: str = Form("pages"),
):
    validate_file(file)
    safe_basename = get_safe_base_name(file.filename, default="document")
    fmt = "jpg" if output_format.lower() in ["jpg", "jpeg"] else "png"
    target_dpi = 300 if dpi >= 300 else 150
    pdf_bytes = await file.read()
    job_id = create_job(message="Mempersiapkan konversi gambar...")

    async def _run():
        def _do_image():
            update_job(job_id, status="processing", progress=15, message="Membaca halaman PDF...")
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            try:
                num_pages = len(doc)

                # MODE 1: Ekstrak Gambar/Foto Tertanam
                if extract_mode == "embedded":
                    update_job(job_id, progress=30, message="Mengekstrak gambar tertanam...")
                    zip_buffer = io.BytesIO()
                    img_count = 0
                    with ZipFile(zip_buffer, 'w', compression=ZIP_DEFLATED) as zipf:
                        seen_xrefs = set()
                        for i, page in enumerate(doc):
                            images = page.get_images(full=True)
                            for img in images:
                                xref = img[0]
                                if xref in seen_xrefs:
                                    continue
                                seen_xrefs.add(xref)
                                base_img = doc.extract_image(xref)
                                image_bytes = base_img["image"]
                                img_ext = base_img["ext"]
                                img_count += 1
                                zipf.writestr(f"image_{img_count}.{img_ext}", image_bytes)

                    if img_count == 0:
                        raise HTTPException(status_code=400, detail="Tidak ada gambar/foto tertanam yang ditemukan di dalam dokumen PDF ini.")

                    zip_buffer.seek(0)
                    zip_filename = f"{safe_basename}_embedded_images.zip"
                    return zip_buffer.getvalue(), "application/zip", zip_filename

                # MODE 2: Konversi Halaman ke Gambar
                if num_pages == 1:
                    update_job(job_id, progress=50, message=f"Merender halaman ({target_dpi} DPI)...")
                    page = doc[0]
                    pix = page.get_pixmap(dpi=target_dpi)
                    img_bytes = pix.tobytes("jpeg" if fmt == "jpg" else "png")

                    media_type = get_mime_type(fmt)
                    single_filename = f"{safe_basename}.{fmt}"
                    return img_bytes, media_type, single_filename

                # Multi-Halaman ke ZIP
                update_job(job_id, progress=25, message=f"Merender {num_pages} halaman ({target_dpi} DPI)...")
                zip_buffer = io.BytesIO()
                with ZipFile(zip_buffer, 'w', compression=ZIP_DEFLATED) as zipf:
                    for i, page in enumerate(doc):
                        pct = int(25 + (i / num_pages) * 65)
                        update_job(job_id, progress=pct, message=f"Merender halaman {i + 1} dari {num_pages}...")
                        pix = page.get_pixmap(dpi=target_dpi)
                        img_bytes = pix.tobytes("jpeg" if fmt == "jpg" else "png")
                        img_name = f"page_{i + 1}.{fmt}"
                        zipf.writestr(img_name, img_bytes)

                zip_buffer.seek(0)
                zip_filename = f"{safe_basename}_images.zip"
                return zip_buffer.getvalue(), "application/zip", zip_filename
            finally:
                if doc and not doc.is_closed:
                    doc.close()

        try:
            result_bytes, media_type, filename = await asyncio.to_thread(_do_image)
            update_job(
                job_id,
                status="done",
                progress=100,
                message="Konversi selesai!",
                result=result_bytes,
                media_type=media_type,
                filename=filename,
            )
        except Exception as e:
            logging.error(f"[Job {job_id}] Image conversion error: {e}")
            err_msg = e.detail if isinstance(e, HTTPException) else str(e)
            update_job(job_id, status="error", error=f"Gagal convert Gambar: {err_msg}", message="Terjadi kesalahan.")

    create_tracked_task(_run())
    return JSONResponse({"job_id": job_id, "status": "pending", "message": "Konversi gambar dimulai..."}, status_code=202)
