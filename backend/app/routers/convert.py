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
from openpyxl.drawing.image import Image as OpenpyxlImage

from app.utils.file_utils import validate_file, cleanup_folder, get_safe_base_name, get_mime_type
from app.utils.job_store import create_job, update_job
from app.utils.async_task import create_tracked_task

router = APIRouter(prefix="/convert", tags=["Conversion"])


def sanitize_filename(name: str) -> str:
    """Membersihkan nama berkas dari karakter terlarang."""
    return get_safe_base_name(name, default="document")

def int_color_to_hex(color_int: int) -> str:
    """Mengonversi warna integer sRGB dari PyMuPDF ke string heksadesimal 6-karakter RRGGBB."""
    if not isinstance(color_int, int) or color_int <= 0:
        return "000000"
    r = (color_int >> 16) & 255
    g = (color_int >> 8) & 255
    b = color_int & 255
    return f"{r:02X}{g:02X}{b:02X}"

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
                        ws.column_dimensions[col_letter].width = min(max(max_len + 3, 11), 60)

                # =========================================================================
                # UNIVERSAL SPATIAL GRID & VISUAL LAYOUT ENGINE (SOLID-GRADE PARADIGM)
                # =========================================================================
                def extract_page_spatial_elements(fitz_page, page_idx, include_charts=True):
                    page_rect = fitz_page.rect
                    page_w = page_rect.width
                    page_h = page_rect.height

                    # 1. Ekstraksi gambar latar belakang/fill rect dan diagram grafik vektor
                    drawings = fitz_page.get_drawings()
                    filled_rects = []
                    dense_drawings = []
                    for dw in drawings:
                        r = dw.get("rect")
                        if not r or r.is_empty:
                            continue
                        fill = dw.get("fill")
                        if fill and isinstance(fill, (list, tuple)) and len(fill) >= 3:
                            rf, gf, bf = fill[:3]
                            r_int = int(round(rf * 255))
                            g_int = int(round(gf * 255))
                            b_int = int(round(bf * 255))
                            if not (r_int >= 250 and g_int >= 250 and b_int >= 250):
                                fill_hex = f"{r_int:02X}{g_int:02X}{b_int:02X}"
                                filled_rects.append({"rect": r, "fill_hex": fill_hex})
                        
                        items = dw.get("items", [])
                        has_curve = any(it[0] == "c" for it in items)
                        if (has_curve or len(items) >= 4) and r.width >= 35 and r.height >= 25:
                            dense_drawings.append(r)

                    # Cluster area grafik/diagram vektor (seperti Donut Chart & Line Graph)
                    chart_clusters = []
                    for dr in dense_drawings:
                        merged = False
                        for cl in chart_clusters:
                            if cl.intersects(dr) or cl.distance_to(dr) < 15:
                                cl.include_rect(dr)
                                merged = True
                                break
                        if not merged:
                            chart_clusters.append(fitz.Rect(dr))

                    valid_charts = []
                    for cl in chart_clusters:
                        if cl.width >= 55 and cl.height >= 35 and (cl.width * cl.height < page_w * page_h * 0.75):
                            valid_charts.append(cl)

                    # 2. Ekstraksi text spans dengan koordinat presisi, warna font asli, bold, italic
                    text_page = fitz_page.get_text("dict")
                    raw_spans = []
                    for block in text_page.get("blocks", []):
                        if block.get("type") == 0:  # text block
                            for line in block.get("lines", []):
                                for span in line.get("spans", []):
                                    text = span.get("text", "")
                                    if not text.strip():
                                        continue
                                    bbox = fitz.Rect(span.get("bbox"))
                                    color_int = span.get("color", 0)
                                    color_hex = int_color_to_hex(color_int)
                                    flags = span.get("flags", 0)
                                    is_bold = bool(flags & 16) or "bold" in span.get("font", "").lower()
                                    is_italic = bool(flags & 2) or "italic" in span.get("font", "").lower()
                                    raw_spans.append({
                                        "text": text,
                                        "bbox": bbox,
                                        "x0": bbox.x0,
                                        "y0": bbox.y0,
                                        "x1": bbox.x1,
                                        "y1": bbox.y1,
                                        "font": span.get("font", "Calibri"),
                                        "size": span.get("size", 10.0),
                                        "color": color_hex,
                                        "is_bold": is_bold,
                                        "is_italic": is_italic,
                                    })

                    # Urutkan secara deterministik dari atas ke bawah (y0), kiri ke kanan (x0)
                    raw_spans.sort(key=lambda s: (s["y0"], s["x0"]))

                    # 3. Render potongan visual chart jika terdeteksi
                    chart_images = []
                    chart_ignored_spans = set()
                    if include_charts and valid_charts:
                        for c_idx, ch_rect in enumerate(valid_charts):
                            try:
                                pad_rect = fitz.Rect(
                                    max(0, ch_rect.x0 - 4),
                                    max(0, ch_rect.y0 - 4),
                                    min(page_w, ch_rect.x1 + 4),
                                    min(page_h, ch_rect.y1 + 4)
                                )
                                pix = fitz_page.get_pixmap(clip=pad_rect, dpi=150)
                                chart_path = os.path.join(tmp_dir, f"chart_p{page_idx}_{c_idx}.png")
                                pix.save(chart_path)
                                chart_images.append({
                                    "path": chart_path,
                                    "rect": pad_rect,
                                    "y0": pad_rect.y0,
                                    "y1": pad_rect.y1,
                                    "x0": pad_rect.x0,
                                    "x1": pad_rect.x1,
                                    "width": pad_rect.width,
                                    "height": pad_rect.height
                                })
                                for s_i, sp in enumerate(raw_spans):
                                    if pad_rect.contains(sp["bbox"]):
                                        chart_ignored_spans.add(s_i)
                            except Exception as c_err:
                                logging.warning(f"Gagal merender crop grafik: {c_err}")

                    usable_spans = [sp for idx, sp in enumerate(raw_spans) if idx not in chart_ignored_spans]

                    # 4. Pengelompokan Baris Visual (Visual Lines)
                    visual_lines = []
                    for sp in usable_spans:
                        mid_y = (sp["y0"] + sp["y1"]) / 2.0
                        placed = False
                        for line in visual_lines:
                            line_mid_y = line["mid_y"]
                            line_h = line["avg_h"]
                            tol = max(3.2, min(sp["bbox"].height, line_h) * 0.44)
                            if abs(mid_y - line_mid_y) <= tol:
                                line["spans"].append(sp)
                                line["mid_y"] = sum((s["y0"] + s["y1"]) / 2.0 for s in line["spans"]) / len(line["spans"])
                                line["avg_h"] = sum(s["bbox"].height for s in line["spans"]) / len(line["spans"])
                                line["min_y"] = min(line["min_y"], sp["y0"])
                                line["max_y"] = max(line["max_y"], sp["y1"])
                                placed = True
                                break
                        if not placed:
                            visual_lines.append({
                                "mid_y": mid_y,
                                "avg_h": sp["bbox"].height,
                                "min_y": sp["y0"],
                                "max_y": sp["y1"],
                                "spans": [sp]
                            })

                    visual_lines.sort(key=lambda l: l["min_y"])

                    # Gabungkan potongan kata berdekatan dalam 1 baris
                    processed_lines = []
                    for line in visual_lines:
                        spans_in_line = sorted(line["spans"], key=lambda s: s["x0"])
                        merged_items = []
                        for s in spans_in_line:
                            if not merged_items:
                                merged_items.append(dict(s))
                            else:
                                last = merged_items[-1]
                                gap = s["x0"] - last["x1"]
                                if gap <= 3.8 and s["color"] == last["color"] and s["is_bold"] == last["is_bold"]:
                                    sep = " " if gap > 0.5 and not last["text"].endswith(" ") and not s["text"].startswith(" ") else ""
                                    last["text"] += sep + s["text"]
                                    last["x1"] = max(last["x1"], s["x1"])
                                    last["bbox"] = fitz.Rect(last["x0"], min(last["y0"], s["y0"]), last["x1"], max(last["y1"], s["y1"]))
                                else:
                                    merged_items.append(dict(s))
                        processed_lines.append({
                            "min_y": line["min_y"],
                            "max_y": line["max_y"],
                            "items": merged_items
                        })

                    # 5. Deteksi Anchor Kolom Master Halaman
                    x_positions = []
                    for pl in processed_lines:
                        items = pl["items"]
                        if len(items) >= 2:
                            for it in items:
                                x_positions.append(it["x0"])

                    x_positions.sort()
                    col_clusters = []
                    for x in x_positions:
                        if not col_clusters or (x - col_clusters[-1]["avg"] > 22.0):
                            col_clusters.append({"vals": [x], "avg": x})
                        else:
                            col_clusters[-1]["vals"].append(x)
                            col_clusters[-1]["avg"] = sum(col_clusters[-1]["vals"]) / len(col_clusters[-1]["vals"])

                    if len(col_clusters) < 2:
                        col_width = page_w / 6.0
                        col_anchors = [i * col_width for i in range(6)]
                    else:
                        col_anchors = [c["avg"] for c in col_clusters]

                    return {
                        "page_width": page_w,
                        "page_height": page_h,
                        "processed_lines": processed_lines,
                        "col_anchors": col_anchors,
                        "filled_rects": filled_rects,
                        "chart_images": chart_images
                    }

                def write_spatial_page_to_sheet(ws, page_data, start_row=1):
                    processed_lines = page_data["processed_lines"]
                    col_anchors = page_data["col_anchors"]
                    filled_rects = page_data["filled_rects"]
                    chart_images = page_data["chart_images"]
                    page_w = page_data["page_width"]
                    total_cols = max(1, len(col_anchors))

                    def find_col_idx(x_pos):
                        best_i = 0
                        min_dist = 999999
                        for i, a in enumerate(col_anchors):
                            dist = abs(x_pos - a)
                            if dist < min_dist:
                                min_dist = dist
                                best_i = i
                        return best_i + 1

                    cur_r = start_row
                    chart_idx = 0

                    for pl in processed_lines:
                        line_y = pl["min_y"]
                        # Jika ada chart yang posisinya sebelum baris teks ini, sisipkan gambar chart lebih dulu
                        while chart_idx < len(chart_images) and chart_images[chart_idx]["y0"] <= line_y:
                            ch = chart_images[chart_idx]
                            try:
                                img = OpenpyxlImage(ch["path"])
                                ws.add_image(img, f"A{cur_r}")
                                rows_span = max(3, int(round(ch["height"] / 19)))
                                cur_r += rows_span
                            except Exception as img_err:
                                logging.warning(f"Gagal menyisipkan chart image ke Excel: {img_err}")
                            chart_idx += 1

                        items = pl["items"]
                        if not items:
                            continue

                        # Kasus 1: Judul atau teks lebar membentang (misal Nama Nasabah / Header surat)
                        if len(items) == 1 and (items[0]["x1"] - items[0]["x0"]) > page_w * 0.42:
                            it = items[0]
                            val = it["text"].strip()
                            cell = ws.cell(row=cur_r, column=1, value=val)
                            f_color = it["color"] if it["color"] != "000000" else None
                            cell.font = Font(name="Calibri", size=10, bold=it["is_bold"], italic=it["is_italic"], color=f_color)
                            cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
                            if total_cols > 1:
                                ws.merge_cells(start_row=cur_r, start_column=1, end_row=cur_r, end_column=total_cols)
                            cur_r += 1
                            continue

                        # Kasus 2: Multi-kolom (Tabel, Header, atau Key-Value)
                        for it in items:
                            c_idx = find_col_idx(it["x0"])
                            val = it["text"].strip()
                            parsed = parse_cell_value(val)
                            cell = ws.cell(row=cur_r, column=c_idx)

                            # Format Angka & Teks
                            if isinstance(parsed, (int, float)):
                                cell.value = parsed
                            else:
                                cell.value = str(parsed)
                                cell.number_format = '@'

                            # Font & True Colors (Ungu, Hijau, Merah, dsb.)
                            f_color = it["color"] if it["color"] != "000000" else None
                            cell.font = Font(name="Calibri", size=10, bold=it["is_bold"], italic=it["is_italic"], color=f_color)

                            # Background Fill dari gambar vektor PDF
                            for fr in filled_rects:
                                if fr["rect"].contains(it["bbox"]) or fr["rect"].intersect(it["bbox"]).get_area() > it["bbox"].get_area() * 0.4:
                                    cell.fill = PatternFill(fill_type="solid", start_color=fr["fill_hex"], end_color=fr["fill_hex"])
                                    break

                            # Alignment cerdas
                            is_num_like = (
                                isinstance(parsed, (int, float)) or
                                bool(re.search(r'[+-]?\d{1,3}(\.\d{3})*(,\d+)?', val)) or
                                val.endswith('%')
                            )
                            is_code = len(val) <= 4 and val.isupper()
                            if is_num_like and not (val.startswith("0") and len(val) > 1) and len(re.sub(r'\D', '', val)) < 10:
                                cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
                            elif is_code:
                                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                            else:
                                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)

                            cell.border = thin_border

                        cur_r += 1

                    # Sisipkan sisa gambar chart jika berada di paling bawah halaman
                    while chart_idx < len(chart_images):
                        ch = chart_images[chart_idx]
                        try:
                            img = OpenpyxlImage(ch["path"])
                            ws.add_image(img, f"A{cur_r}")
                            rows_span = max(3, int(round(ch["height"] / 19)))
                            cur_r += rows_span
                        except Exception as img_err:
                            logging.warning(f"Gagal menyisipkan chart image ke Excel: {img_err}")
                        chart_idx += 1

                    return cur_r

                update_job(job_id, progress=30, message="Mengekstrak tata letak spasial dan tabel...")

                if sheet_per_page:
                    for page_idx in range(num_pages):
                        page_data = extract_page_spatial_elements(doc[page_idx], page_idx, include_charts=(mode != "tables_only"))
                        sheet_name = f"Table {page_idx + 1}"
                        if page_idx == 0 and default_sheet is not None:
                            ws = default_sheet
                            ws.title = sheet_name
                        else:
                            ws = wb.create_sheet(title=sheet_name)
                        write_spatial_page_to_sheet(ws, page_data, start_row=1)
                        autofit(ws)
                else:
                    # Mode 1 Sheet Gabungan (Combined / Solid Framework Continuation)
                    ws = default_sheet if default_sheet is not None else wb.create_sheet(title="Table 1")
                    ws.title = "Hasil Ekstraksi"
                    cur_row = 1
                    for page_idx in range(num_pages):
                        page_data = extract_page_spatial_elements(doc[page_idx], page_idx, include_charts=(mode != "tables_only"))
                        cur_row = write_spatial_page_to_sheet(ws, page_data, start_row=cur_row)
                        cur_row += 1
                    autofit(ws)

                wb.save(tmp_xlsx_path)

            finally:
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
            clean_doc = fitz.open(tmp_pdf_path)
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
                        # 1. Ekstrak dan pertahankan grafik background, bentuk vektor, garis, dan grid di layer dasar (z-index 0)
                        drawings = page.get_drawings()
                        if drawings and len(drawings) > 0 and clean_doc and i < len(clean_doc):
                            try:
                                clean_page = clean_doc[i]
                                # Hapus teks dari kanvas vektor agar tidak dobel/kabur
                                for w in clean_page.get_text("words"):
                                    clean_page.add_redact_annot(fitz.Rect(w[:4]), fill=False)
                                # Hapus gambar bitmap dari kanvas vektor agar tidak dobel dengan objek gambar terpisah
                                for img_info in clean_page.get_images():
                                    for img_rect in clean_page.get_image_rects(img_info[0]):
                                        clean_page.add_redact_annot(img_rect, fill=False)
                                clean_page.apply_redactions()

                                bg_pix = clean_page.get_pixmap(dpi=180)
                                bg_vec_path = os.path.join(tmp_dir, f"bg_vec_{i}.png")
                                bg_pix.save(bg_vec_path)
                                slide.shapes.add_picture(bg_vec_path, 0, 0, width=prs.slide_width, height=prs.slide_height)
                            except Exception as vec_err:
                                logging.warning(f"Gagal mengekstrak background vektor slide {i+1}: {vec_err}")

                        # 2. Ekstrak gambar bitmap (foto / logo) sebagai objek gambar terpisah yang bisa dipindah/diedit
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

                        # 3. Ekstrak blok teks sebagai kotak teks yang dapat diedit (editable text boxes)
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
                if clean_doc and not clean_doc.is_closed:
                    clean_doc.close()
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
