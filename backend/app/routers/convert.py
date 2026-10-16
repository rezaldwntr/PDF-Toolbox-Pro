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
    if not val_str or "\n" in val_str:
        return val_str

    # 1. Jam 24-jam (misal 09.40, 12.29) -> SELALU STRING
    if re.fullmatch(r'\d{2}\.\d{2}', val_str):
        return val_str

    # 2. Awalan '0' bukan desimal (Nomor HP, Kode Wilayah, dll) -> SELALU STRING
    if val_str.startswith("0") and len(val_str) > 1 and not val_str.startswith(("0,", "0.")):
        return val_str

    # 3. Identifier panjang (NIP 18 digit, NIK 16 digit, No Rekening >= 12 digit) -> SELALU STRING
    digits_only = re.sub(r'\D', '', val_str)
    if len(digits_only) >= 12:
        return val_str

    # 4. Format angka / nominal Indonesia (misal: 34.865,21 | +994.892,24 | -20.015,27 | 0,46)
    if re.fullmatch(r'[+-]?\d{1,3}(\.\d{3})*(,\d+)', val_str) or re.fullmatch(r'[+-]?\d+(,\d+)', val_str):
        try:
            return float(val_str.replace(".", "").replace(",", "."))
        except ValueError:
            return val_str

    # 5. String dengan spasi/strip di antara angka (misal format NIP: 19980420 202305 1 002) -> STRING
    if (" " in val_str or "-" in val_str) and any(c.isdigit() for c in val_str):
        if not re.match(r'^[+-]?\d+(\.\d+)?$', val_str):
            return val_str

    # 6. Bilangan bulat pendek aman (1 s/d 8 digit, tanpa awalan 0)
    cleaned = val_str.replace(",", "")
    if re.fullmatch(r'[+-]?\d+', cleaned) and len(cleaned) <= 8 and not cleaned.startswith("0"):
        try:
            return int(cleaned)
        except ValueError:
            pass

    # 7. Bilangan pecahan desimal pendek Internasional (misal: 85.5, 12.75)
    if re.fullmatch(r'[+-]?\d+\.\d+', cleaned) and len(cleaned) <= 9:
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
                            # Jangan hitung panjang teks pada sel yang di-merge secara horizontal agar kolom A tidak melebar berlebihan
                            is_horiz_merged = False
                            for m_range in ws.merged_cells.ranges:
                                if cell.coordinate in m_range and m_range.min_col != m_range.max_col:
                                    is_horiz_merged = True
                                    break
                            if is_horiz_merged:
                                continue
                            if cell.value is not None:
                                lines = str(cell.value).split('\n')
                                for ln in lines:
                                    max_len = max(max_len, len(ln.strip()))
                        ws.column_dimensions[col_letter].width = min(max(max_len + 4, 13), 42)

                def clean_pdf_text(txt: str) -> str:
                    if not txt:
                        return ""
                    # Normalisasi simbol bullet Private Use Area (misal titik kartu debit Bank Jago) menjadi bullet standar
                    cleaned = re.sub(r'[\uf000-\uf8ff\ufffd]', '•', txt)
                    return cleaned

                def parse_financial_cell(val_str: str):
                    """
                    Mengonversi nilai string ke angka (float/int) beserta format angka Excel yang presisi.
                    Mendukung format angka Indonesia (34.865,21 / +994.892,24 / -2.074.122,45)
                    dan menjaga kode waktu (09.40, 12.29) serta nomor ID panjang tetap sebagai string teks ('@').
                    """
                    if val_str is None:
                        return "", "@"
                    s = str(val_str).strip()
                    if not s or "\n" in s:
                        return s, "@"

                    # 1. Jam transaksi (misal 09.40, 12.29, 00.40) -> WAJIB STRING
                    if re.fullmatch(r'\d{2}\.\d{2}', s):
                        return s, "@"

                    # 2. Awalan '0' bukan desimal (No HP, kode, dsb.) atau angka >= 12 digit (No Rek, NIK, NIP) -> STRING
                    if s.startswith("0") and len(s) > 1 and not s.startswith(("0,", "0.")):
                        return s, "@"
                    digits_only = re.sub(r'\D', '', s)
                    if len(digits_only) >= 12:
                        return s, "@"

                    # 3. Format Angka / Nominal Indonesia: 34.865,21 | +994.892,24 | -20.015,27 | 0,46 | 0,00
                    if re.fullmatch(r'[+-]?\d{1,3}(\.\d{3})*(,\d+)', s) or re.fullmatch(r'[+-]?\d+(,\d+)', s):
                        try:
                            num_val = float(s.replace(".", "").replace(",", "."))
                            num_fmt = "+#,##0.00;-#,##0.00;0.00" if s.startswith("+") else "#,##0.00"
                            return num_val, num_fmt
                        except ValueError:
                            return s, "@"

                    # 4. Format Ribuan Indonesia bulat: +500.000 | -3.120.023
                    if re.fullmatch(r'[+-]?\d{1,3}(\.\d{3})+', s):
                        try:
                            num_val = int(s.replace(".", ""))
                            num_fmt = "+#,##0;-#,##0;0" if s.startswith("+") else "#,##0"
                            return num_val, num_fmt
                        except ValueError:
                            return s, "@"

                    # 5. Format Angka Internasional: 1,234.56
                    if re.fullmatch(r'[+-]?\d{1,3}(,\d{3})+(\.\d+)', s):
                        try:
                            num_val = float(s.replace(",", ""))
                            num_fmt = "+#,##0.00;-#,##0.00;0.00" if s.startswith("+") else "#,##0.00"
                            return num_val, num_fmt
                        except ValueError:
                            return s, "@"

                    # 6. Bilangan bulat pendek (1 s/d 7 digit)
                    if re.fullmatch(r'[+-]?\d{1,7}', s) and not s.startswith("0"):
                        try:
                            return int(s), "0"
                        except ValueError:
                            pass

                    return s, "@"

                # =========================================================================
                # UNIVERSAL SPATIAL GRID & VISUAL LAYOUT ENGINE (SOLID-GRADE PARADIGM)
                # =========================================================================
                def extract_page_spatial_elements(fitz_page, page_idx, prev_column_bands=None, include_charts=True):
                    page_rect = fitz_page.rect
                    page_w = page_rect.width
                    page_h = page_rect.height

                    # 1. Ekstraksi Fill Rects (Header/Summary Shaded Bands & Card Containers) serta Gambar/Vektor Grafik
                    drawings = fitz_page.get_drawings()
                    filled_rects = []
                    dense_drawings = []
                    large_card_rects = []

                    for dw in drawings:
                        r = dw.get("rect")
                        if not r or r.is_empty:
                            continue
                        # Abaikan area header banner atas & footer bawah
                        if r.y1 <= 68.0 or r.y0 >= page_h - 48.0:
                            continue

                        fill = dw.get("fill")
                        if fill and isinstance(fill, (list, tuple)) and len(fill) >= 3:
                            rf, gf, bf = fill[:3]
                            r_int = int(round(rf * 255))
                            g_int = int(round(gf * 255))
                            b_int = int(round(bf * 255))
                            if not (r_int >= 250 and g_int >= 250 and b_int >= 250):
                                fill_hex = f"{r_int:02X}{g_int:02X}{b_int:02X}"
                                if r.height >= 60.0 and r.width >= 100.0:
                                    large_card_rects.append(fitz.Rect(r))
                                else:
                                    filled_rects.append({"rect": fitz.Rect(r), "fill_hex": fill_hex})

                        items = dw.get("items", [])
                        has_curve = any(it[0] == "c" for it in items)
                        if (has_curve or len(items) >= 6) and r.width >= 35 and r.height >= 25:
                            dense_drawings.append(fitz.Rect(r))

                    # Cek juga embedded raster images di badan halaman (seperti Donut Chart & Line Graph di PDF Bank Jago)
                    body_image_rects = []
                    try:
                        for im_info in fitz_page.get_image_info(xrefs=True):
                            ib = fitz.Rect(im_info.get("bbox", (0, 0, 0, 0)))
                            if ib.is_empty or ib.y0 < 68.0 or ib.y1 > page_h - 48.0:
                                continue
                            if ib.width >= 35.0 and ib.height >= 25.0 and (ib.width * ib.height < page_w * page_h * 0.65):
                                body_image_rects.append(ib)
                    except Exception:
                        pass

                    # Tentukan kotak visual grafik (Chart Cards):
                    # Jika ada large_card_rect (misal kartu abu-abu SOROTAN 245x143 dan 294x143) yang memuat gambar grafik atau kurva vektor,
                    # gunakan rect kartu tersebut secara utuh agar legend + angka + grafik ter-render rapi dalam 1 gambar kartu!
                    valid_charts = []
                    if include_charts:
                        used_img_indices = set()
                        for card_r in large_card_rects:
                            has_graphic = any(card_r.intersects(ir) for ir in body_image_rects) or any(card_r.intersects(dr) for dr in dense_drawings)
                            if has_graphic:
                                valid_charts.append(card_r)
                                for idx_ir, ir in enumerate(body_image_rects):
                                    if card_r.intersects(ir):
                                        used_img_indices.add(idx_ir)

                        # Tambahkan sisa gambar grafik atau klaster kurva vektor yang berdiri sendiri di luar card
                        remaining_graphics = [ir for idx_ir, ir in enumerate(body_image_rects) if idx_ir not in used_img_indices]
                        for dr in dense_drawings:
                            if not any(vc.intersects(dr) for vc in valid_charts):
                                remaining_graphics.append(dr)

                        chart_clusters = []
                        for gr in remaining_graphics:
                            merged = False
                            for cl in chart_clusters:
                                if cl.intersects(gr) or (abs(cl.y0 - gr.y0) < 20 and abs(cl.x0 - gr.x0) < 20):
                                    cl.include_rect(gr)
                                    merged = True
                                    break
                            if not merged:
                                chart_clusters.append(fitz.Rect(gr))

                        for cl in chart_clusters:
                            if cl.width >= 50 and cl.height >= 30 and (cl.width * cl.height < page_w * page_h * 0.70):
                                valid_charts.append(cl)

                        valid_charts.sort(key=lambda r: (round(r.y0, 1), round(r.x0, 1)))

                    # 2. Deteksi Presisi Batas Kolom Tabel dari Baris Persegi Header/Summary (Shaded FillRects)
                    # Kelompokkan filled_rects berdasarkan posisi vertikal (y0, y1)
                    rect_rows = []
                    for fr in filled_rects:
                        r = fr["rect"]
                        if 14.0 <= r.height <= 42.0 and r.width >= 35.0:
                            placed = False
                            for rr in rect_rows:
                                if abs(rr["y0"] - r.y0) <= 3.0 and abs(rr["y1"] - r.y1) <= 3.0:
                                    rr["rects"].append(r)
                                    rr["fill_hex"] = fr["fill_hex"]
                                    placed = True
                                    break
                            if not placed:
                                rect_rows.append({"y0": r.y0, "y1": r.y1, "fill_hex": fr["fill_hex"], "rects": [r]})

                    rect_column_bands = []
                    multi_rect_rows = [rr for rr in rect_rows if len(rr["rects"]) >= 3]
                    if multi_rect_rows:
                        # Pilih baris rect dengan jumlah kolom terbanyak (misal 6 kolom header tabel)
                        best_rr = max(multi_rect_rows, key=lambda rr: len(rr["rects"]))
                        sorted_rects = sorted(best_rr["rects"], key=lambda r: r.x0)
                        # Deduplikasi jika ada rect yang bertumpuk pada x0 yang sama
                        unique_rects = []
                        for sr in sorted_rects:
                            if not unique_rects or abs(sr.x0 - unique_rects[-1].x0) > 8.0:
                                unique_rects.append(sr)
                        if len(unique_rects) >= 3:
                            for u_r in unique_rects:
                                rect_column_bands.append({
                                    "min_x": u_r.x0,
                                    "max_x": u_r.x1,
                                    "avg_x0": u_r.x0 + 8.0,
                                    "avg_x1": u_r.x1 - 8.0,
                                    "center": (u_r.x0 + u_r.x1) / 2.0
                                })

                    # 3. Ekstraksi Text Spans (dengan pembersihan Running Header & Footer serta karakter PUA)
                    text_page = fitz_page.get_text("dict")
                    raw_spans = []
                    for block in text_page.get("blocks", []):
                        if block.get("type") == 0:
                            for line in block.get("lines", []):
                                for span in line.get("spans", []):
                                    raw_txt = clean_pdf_text(span.get("text", ""))
                                    if not raw_txt.strip():
                                        continue
                                    bbox = fitz.Rect(span.get("bbox"))
                                    # Eliminasi running header di pojok kanan atas (Laporan Keuangan Bulanan | Halaman X dari Y)
                                    if bbox.y0 < 52.0 and bbox.x0 > page_w * 0.35:
                                        continue
                                    # Eliminasi running footer OJK/LPS di dasar halaman
                                    if bbox.y0 > page_h - 45.0:
                                        continue

                                    color_int = span.get("color", 0)
                                    color_hex = int_color_to_hex(color_int)
                                    flags = span.get("flags", 0)
                                    is_bold = bool(flags & 16) or "bold" in span.get("font", "").lower()
                                    is_italic = bool(flags & 2) or "italic" in span.get("font", "").lower()
                                    raw_spans.append({
                                        "text": raw_txt,
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

                    raw_spans.sort(key=lambda s: (s["y0"], s["x0"]))

                    # 4. Render Gambar Kartu Grafik (PNG) dan Bungkam Teks di Dalam Area Grafik
                    chart_images = []
                    chart_ignored_spans = set()
                    if valid_charts:
                        for c_idx, ch_rect in enumerate(valid_charts):
                            try:
                                pad_rect = fitz.Rect(
                                    max(0, ch_rect.x0 - 2),
                                    max(0, ch_rect.y0 - 2),
                                    min(page_w, ch_rect.x1 + 2),
                                    min(page_h, ch_rect.y1 + 2)
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
                                    inter_r = pad_rect & sp["bbox"]
                                    if pad_rect.contains(sp["bbox"]) or (not inter_r.is_empty and inter_r.get_area() > sp["bbox"].get_area() * 0.30):
                                        chart_ignored_spans.add(s_i)
                            except Exception as c_err:
                                logging.warning(f"Gagal memproses visual grafik: {c_err}")

                    usable_spans = [sp for idx, sp in enumerate(raw_spans) if idx not in chart_ignored_spans]

                    # 5. Pengelompokan Baris Visual (Visual Lines)
                    visual_lines = []
                    for sp in usable_spans:
                        mid_y = (sp["y0"] + sp["y1"]) / 2.0
                        placed = False
                        for line in visual_lines:
                            line_mid_y = line["mid_y"]
                            line_h = line["avg_h"]
                            tol = max(3.2, min(sp["bbox"].height, line_h) * 0.45)
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

                    # 6. Resolusi Master Column Bands terlebih dahulu agar penggabungan span tidak menyeberangi batas kolom tabel
                    if len(rect_column_bands) >= 3:
                        column_bands = rect_column_bands
                    elif prev_column_bands and len(prev_column_bands) >= 3:
                        column_bands = prev_column_bands
                    else:
                        column_bands = []

                    def get_band_idx_for_x(x_val, bands):
                        for b_idx, b in enumerate(bands):
                            if b["min_x"] - 2.0 <= x_val <= b["max_x"] + 2.0:
                                return b_idx
                        return -1

                    # Gabungkan potongan kata yang bersebelahan dalam 1 sel pada baris yang sama
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
                                same_band = True
                                if column_bands:
                                    b1 = get_band_idx_for_x(last["x0"], column_bands)
                                    b2 = get_band_idx_for_x(s["x0"], column_bands)
                                    if b1 != -1 and b2 != -1 and b1 != b2:
                                        same_band = False
                                can_merge = (
                                    same_band
                                    and s["color"] == last["color"]
                                    and ((gap <= 3.0 and s["is_bold"] == last["is_bold"]) or gap <= 1.2)
                                )
                                if can_merge:
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

                    # Fallback jika halaman belum memiliki column_bands dari FillRect maupun prev_column_bands
                    if len(column_bands) < 3:
                        candidate_table_lines = [pl for pl in processed_lines if len(pl["items"]) >= 3]
                        if candidate_table_lines:
                            x_intervals = []
                            for pl in candidate_table_lines:
                                for it in pl["items"]:
                                    x_intervals.append((it["x0"], it["x1"]))
                            x_intervals.sort(key=lambda iv: iv[0])
                            clusters = []
                            for x0, x1 in x_intervals:
                                if not clusters or x0 > clusters[-1]["max_x"] + 12.0:
                                    clusters.append({"min_x": x0, "max_x": x1, "x0s": [x0], "x1s": [x1]})
                                else:
                                    cl = clusters[-1]
                                    cl["min_x"] = min(cl["min_x"], x0)
                                    cl["max_x"] = max(cl["max_x"], x1)
                                    cl["x0s"].append(x0)
                                    cl["x1s"].append(x1)
                            for idx_c, cl in enumerate(clusters):
                                left_bound = 0.0 if idx_c == 0 else (clusters[idx_c - 1]["max_x"] + cl["min_x"]) / 2.0
                                right_bound = page_w if idx_c == len(clusters) - 1 else (cl["max_x"] + clusters[idx_c + 1]["min_x"]) / 2.0
                                avg_x0 = sum(cl["x0s"]) / len(cl["x0s"])
                                avg_x1 = sum(cl["x1s"]) / len(cl["x1s"])
                                column_bands.append({
                                    "min_x": left_bound,
                                    "max_x": right_bound,
                                    "avg_x0": avg_x0,
                                    "avg_x1": avg_x1,
                                    "center": (left_bound + right_bound) / 2.0
                                })

                        if len(column_bands) < 2:
                            col_w = page_w / 6.0
                            column_bands = [{
                                "min_x": i * col_w,
                                "max_x": (i + 1) * col_w,
                                "avg_x0": i * col_w + 10,
                                "avg_x1": (i + 1) * col_w - 10,
                                "center": (i + 0.5) * col_w
                            } for i in range(6)]

                    return {
                        "page_width": page_w,
                        "page_height": page_h,
                        "processed_lines": processed_lines,
                        "column_bands": column_bands,
                        "filled_rects": filled_rects,
                        "rect_rows": rect_rows,
                        "chart_images": chart_images
                    }

                def write_spatial_page_to_sheet(ws, page_data, start_row=1, is_continuation_page=False):
                    processed_lines = page_data["processed_lines"]
                    column_bands = page_data["column_bands"]
                    filled_rects = page_data["filled_rects"]
                    rect_rows = page_data.get("rect_rows", [])
                    chart_images = page_data["chart_images"]
                    page_w = page_data["page_width"]
                    total_cols = max(1, len(column_bands))

                    def find_col_idx(item):
                        mid_x = (item["x0"] + item["x1"]) / 2.0
                        x0 = item["x0"]
                        # 1. Cek apakah awal teks (x0) berada di kolom 1 (misal 'Akun Aktif, mulai 19 Nov 2024')
                        if x0 < column_bands[0]["max_x"] - 10.0:
                            return 1
                        # 2. Cek apakah titik tengah (mid_x) berada tepat di dalam interval [min_x, max_x]
                        for i, band in enumerate(column_bands):
                            if band["min_x"] - 2.0 <= mid_x <= band["max_x"] + 2.0:
                                return i + 1
                        # 3. Cek berdasarkan x0
                        for i, band in enumerate(column_bands):
                            if band["min_x"] - 4.0 <= x0 <= band["max_x"] + 4.0:
                                return i + 1
                        # 4. Fallback jarak terdekat ke center band
                        best_col = 0
                        min_diff = 999999.0
                        for i, band in enumerate(column_bands):
                            diff = abs(mid_x - band["center"])
                            if diff < min_diff:
                                min_diff = diff
                                best_col = i
                        return best_col + 1

                    def get_shared_rect_band(y0, y1):
                        """Cek apakah baris ini berada di dalam pita FillRect (misal baris Header atau baris Total Saldo Personal)."""
                        mid_y = (y0 + y1) / 2.0
                        for rr in rect_rows:
                            if rr["y0"] - 2.0 <= mid_y <= rr["y1"] + 2.0:
                                return rr
                        return None

                    DATE_START_RE = re.compile(r'^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$')
                    TIME_ONLY_RE = re.compile(r'^\d{2}\.\d{2}$')

                    # =====================================================================
                    # KONSOLIDASI BARIS MULTI-LINE CERDAS (SOLID-GRADE ROW CONSOLIDATION)
                    # =====================================================================
                    consolidated_blocks = []
                    idx = 0
                    num_lines = len(processed_lines)

                    while idx < num_lines:
                        pl = processed_lines[idx]
                        items = pl["items"]
                        if not items:
                            idx += 1
                            continue

                        # A. Konsolidasi Blok Nama & Alamat Nasabah di awal halaman pertama
                        if (
                            len(items) == 1
                            and items[0]["x0"] < 35.0
                            and pl["min_y"] < 155.0
                            and not is_continuation_page
                            and idx + 1 < num_lines
                        ):
                            addr_lines = [items[0]["text"].strip()]
                            first_item = dict(items[0])
                            cur_max_y = pl["max_y"]
                            next_i = idx + 1
                            while next_i < num_lines:
                                n_pl = processed_lines[next_i]
                                n_items = n_pl["items"]
                                if (
                                    len(n_items) == 1
                                    and n_items[0]["x0"] < 35.0
                                    and n_pl["min_y"] - cur_max_y <= 10.0
                                    and n_pl["min_y"] < 160.0
                                ):
                                    addr_lines.append(n_items[0]["text"].strip())
                                    cur_max_y = n_pl["max_y"]
                                    next_i += 1
                                else:
                                    break
                            if len(addr_lines) >= 2:
                                first_item["text"] = "\n".join(addr_lines)
                                consolidated_blocks.append({
                                    "type": "merged_banner",
                                    "min_y": pl["min_y"],
                                    "max_y": cur_max_y,
                                    "item": first_item,
                                    "line_count": len(addr_lines)
                                })
                                idx = next_i
                                continue

                        # Petakan item pada baris ini ke indeks kolom (1..total_cols)
                        col_map = {}
                        for it in items:
                            c_i = find_col_idx(it)
                            if c_i not in col_map:
                                col_map[c_i] = dict(it)
                            else:
                                col_map[c_i]["text"] = col_map[c_i]["text"].strip() + " " + it["text"].strip()
                                col_map[c_i]["x1"] = max(col_map[c_i]["x1"], it["x1"])

                        # B. Cek apakah baris ini berada di dalam Shaded Rect Band (misal Header Tabel atau Total Saldo Personal)
                        shared_rr = get_shared_rect_band(pl["min_y"], pl["max_y"])
                        if shared_rr is not None:
                            cur_max_y = pl["max_y"]
                            next_i = idx + 1
                            max_lines_in_band = 1
                            while next_i < num_lines:
                                n_pl = processed_lines[next_i]
                                if get_shared_rect_band(n_pl["min_y"], n_pl["max_y"]) is shared_rr:
                                    for n_it in n_pl["items"]:
                                        c_i = find_col_idx(n_it)
                                        if c_i not in col_map:
                                            col_map[c_i] = dict(n_it)
                                        else:
                                            col_map[c_i]["text"] = col_map[c_i]["text"].strip() + "\n" + n_it["text"].strip()
                                            max_lines_in_band = max(max_lines_in_band, col_map[c_i]["text"].count("\n") + 1)
                                    cur_max_y = max(cur_max_y, n_pl["max_y"])
                                    next_i += 1
                                else:
                                    break
                            consolidated_blocks.append({
                                "type": "table_row",
                                "min_y": pl["min_y"],
                                "max_y": cur_max_y,
                                "col_map": col_map,
                                "shaded_hex": shared_rr["fill_hex"],
                                "line_count": max_lines_in_band
                            })
                            idx = next_i
                            continue

                        # C. Cek apakah baris ini adalah Baris Utama Mutasi Transaksi (Kolom 1 = Tanggal '02 Sep 2026' dan memiliki Nominal/Saldo di Kolom 5/6)
                        col1_txt = col_map.get(1, {}).get("text", "").strip()
                        has_amount_or_bal = (total_cols >= 5 and ((total_cols - 1) in col_map or total_cols in col_map))
                        if DATE_START_RE.match(col1_txt) and has_amount_or_bal:
                            cur_max_y = pl["max_y"]
                            next_i = idx + 1
                            max_tx_lines = 1
                            while next_i < num_lines:
                                n_pl = processed_lines[next_i]
                                # Jangan gabungkan jika melintasi grafik atau jarak vertikal > 14pt
                                if n_pl["min_y"] - cur_max_y > 14.0 or get_shared_rect_band(n_pl["min_y"], n_pl["max_y"]) is not None:
                                    break
                                n_map = {}
                                for n_it in n_pl["items"]:
                                    c_i = find_col_idx(n_it)
                                    n_map[c_i] = n_map[c_i] + " " + n_it["text"].strip() if c_i in n_map else n_it["text"].strip()

                                # Jika baris berikutnya sudah memiliki Tanggal baru di Kolom 1 atau memiliki Nominal/Saldo baru di Kolom 5/6 -> Berhenti!
                                n_col1 = n_map.get(1, "").strip()
                                if DATE_START_RE.match(n_col1):
                                    break
                                if (total_cols - 1) in n_map or total_cols in n_map:
                                    break
                                # Jika Kolom 1 berisi teks yang BUKAN jam (misal judul bagian baru), berhenti!
                                if n_col1 and not TIME_ONLY_RE.match(n_col1) and len(n_map) == 1 and 1 in n_map:
                                    break

                                # Gabungkan sub-baris transaksi ke dalam col_map baris utama
                                for c_i, sub_txt in n_map.items():
                                    if c_i not in col_map:
                                        sample_it = n_pl["items"][0]
                                        col_map[c_i] = {
                                            "text": sub_txt,
                                            "x0": sample_it["x0"],
                                            "x1": sample_it["x1"],
                                            "y0": sample_it["y0"],
                                            "y1": sample_it["y1"],
                                            "bbox": sample_it["bbox"],
                                            "color": "000000",
                                            "is_bold": False,
                                            "is_italic": False
                                        }
                                    else:
                                        prev_txt = col_map[c_i]["text"].strip()
                                        last_ln = prev_txt.split("\n")[-1].strip()
                                        if prev_txt.endswith("•") and (re.fullmatch(r'[•\s]*\d{4}', sub_txt) or len(sub_txt) <= 6):
                                            col_map[c_i]["text"] = prev_txt + " " + sub_txt
                                        elif len(last_ln) >= 18 and " " not in last_ln and len(sub_txt) <= 4 and sub_txt.isalnum():
                                            col_map[c_i]["text"] = prev_txt + sub_txt
                                        else:
                                            col_map[c_i]["text"] = prev_txt + "\n" + sub_txt
                                    max_tx_lines = max(max_tx_lines, col_map[c_i]["text"].count("\n") + 1)

                                cur_max_y = max(cur_max_y, n_pl["max_y"])
                                next_i += 1

                            consolidated_blocks.append({
                                "type": "table_row",
                                "min_y": pl["min_y"],
                                "max_y": cur_max_y,
                                "col_map": col_map,
                                "shaded_hex": None,
                                "line_count": max_tx_lines
                            })
                            idx = next_i
                            continue

                        # D. Judul Bagian / Teks Lebar Tunggal
                        if len(items) == 1 and (items[0]["x1"] - items[0]["x0"]) > page_w * 0.38:
                            consolidated_blocks.append({
                                "type": "merged_banner",
                                "min_y": pl["min_y"],
                                "max_y": pl["max_y"],
                                "item": items[0],
                                "line_count": 1
                            })
                            idx += 1
                            continue

                        # E. Baris Reguler (Key-Value Ringkasan Saldo, Header Kantong, atau Tabel Biasa)
                        consolidated_blocks.append({
                            "type": "table_row",
                            "min_y": pl["min_y"],
                            "max_y": pl["max_y"],
                            "col_map": col_map,
                            "shaded_hex": None,
                            "line_count": 1
                        })
                        idx += 1

                    # =====================================================================
                    # PENULISAN KE WORKSHEET EXCEL (DENGAN SIDE-BY-SIDE CHART PLACEMENT)
                    # =====================================================================
                    cur_r = start_row
                    chart_idx = 0

                    def insert_pending_charts(up_to_y=None):
                        nonlocal cur_r, chart_idx
                        while chart_idx < len(chart_images):
                            ch = chart_images[chart_idx]
                            if up_to_y is not None and ch["y0"] > up_to_y:
                                break
                            same_row_charts = [ch]
                            chart_idx += 1
                            while chart_idx < len(chart_images) and abs(chart_images[chart_idx]["y0"] - ch["y0"]) <= 18.0:
                                same_row_charts.append(chart_images[chart_idx])
                                chart_idx += 1

                            max_ch_h = max(c["height"] for c in same_row_charts)
                            for c_item in same_row_charts:
                                try:
                                    img = OpenpyxlImage(c_item["path"])
                                    img.width = int(round(c_item["width"] * 96.0 / 72.0))
                                    img.height = int(round(c_item["height"] * 96.0 / 72.0))
                                    anchor_col_idx = 1
                                    for b_i, band in enumerate(column_bands):
                                        if band["min_x"] - 10.0 <= c_item["x0"] <= band["max_x"] + 10.0:
                                            anchor_col_idx = b_i + 1
                                            break
                                    anchor_col_letter = get_column_letter(anchor_col_idx)
                                    ws.add_image(img, f"{anchor_col_letter}{cur_r}")
                                except Exception as img_err:
                                    logging.warning(f"Gagal menyisipkan chart image ke Excel: {img_err}")

                            rows_span = max(5, int(round(max_ch_h / 18.0)))
                            for r_step in range(cur_r, cur_r + rows_span):
                                ws.row_dimensions[r_step].height = 18.5
                            cur_r += rows_span

                    for blk in consolidated_blocks:
                        insert_pending_charts(up_to_y=blk["min_y"])

                        if blk["type"] == "merged_banner":
                            it = blk["item"]
                            val = it["text"].strip()
                            cell = ws.cell(row=cur_r, column=1, value=val)
                            f_color = it["color"] if it["color"] != "000000" else None
                            cell.font = Font(name="Calibri", size=10, bold=it["is_bold"], italic=it["is_italic"], color=f_color)
                            cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
                            if total_cols > 1:
                                ws.merge_cells(start_row=cur_r, start_column=1, end_row=cur_r, end_column=total_cols)
                            if blk["line_count"] > 1:
                                ws.row_dimensions[cur_r].height = max(24.0, blk["line_count"] * 15.5)
                            cur_r += 1
                            continue

                        col_map = blk["col_map"]
                        shaded_hex = blk.get("shaded_hex")
                        line_count = blk.get("line_count", 1)

                        # Beri 1 baris jeda pemisah sebelum judul Kantong / Bagian baru (font size >= 13.5pt)
                        col1_item = col_map.get(1)
                        if col1_item and col1_item.get("size", 10.0) >= 13.5 and cur_r > start_row:
                            cur_r += 1
                        elif col1_item and col1_item.get("size", 10.0) >= 13.5 and cur_r > 2:
                            has_prev_val = any(ws.cell(row=cur_r - 1, column=c).value is not None for c in range(1, total_cols + 1))
                            if has_prev_val:
                                cur_r += 1

                        if shaded_hex:
                            bg_fill = PatternFill(fill_type="solid", start_color=shaded_hex, end_color=shaded_hex)
                            for c_fill in range(1, total_cols + 1):
                                c_empty = ws.cell(row=cur_r, column=c_fill)
                                c_empty.fill = bg_fill
                                c_empty.border = thin_border

                        for c_idx, it in col_map.items():
                            val = it["text"].strip()
                            parsed_val, num_fmt = parse_financial_cell(val)
                            cell = ws.cell(row=cur_r, column=c_idx)
                            cell.value = parsed_val
                            cell.number_format = num_fmt

                            f_color = it["color"] if it["color"] != "000000" else None
                            cell.font = Font(name="Calibri", size=10, bold=it["is_bold"], italic=it["is_italic"], color=f_color)

                            if not shaded_hex:
                                for fr in filled_rects:
                                    inter_fr = fr["rect"] & it["bbox"]
                                    if fr["rect"].contains(it["bbox"]) or (not inter_fr.is_empty and inter_fr.get_area() > it["bbox"].get_area() * 0.4):
                                        cell.fill = PatternFill(fill_type="solid", start_color=fr["fill_hex"], end_color=fr["fill_hex"])
                                        break

                            # Penjajaran (Alignment) cerdas
                            is_right_aligned = (
                                isinstance(parsed_val, (int, float))
                                or val.endswith("%")
                                or bool(re.match(r'^[+-]?\d{1,3}(\.\d{3})*(,\d+)?\n', val))
                            )
                            is_code = (val == "IDR" or (len(val) <= 4 and val.isupper() and "\n" not in val))
                            v_align = "top" if line_count > 1 else "center"

                            if is_right_aligned:
                                cell.alignment = Alignment(horizontal="right", vertical=v_align, wrap_text=True)
                            elif is_code:
                                cell.alignment = Alignment(horizontal="center", vertical=v_align, wrap_text=True)
                            else:
                                cell.alignment = Alignment(horizontal="left", vertical=v_align, wrap_text=True)

                            cell.border = thin_border

                        if line_count > 1:
                            ws.row_dimensions[cur_r].height = max(22.0, line_count * 14.5 + 4.0)
                        elif shaded_hex:
                            ws.row_dimensions[cur_r].height = 22.0
                        else:
                            ws.row_dimensions[cur_r].height = 18.0

                        cur_r += 1

                    # Sisipkan grafik yang berada di bagian akhir halaman
                    insert_pending_charts(up_to_y=None)
                    return cur_r

                update_job(job_id, progress=30, message="Mengekstrak tata letak spasial dan tabel...")

                if sheet_per_page:
                    prev_bands = None
                    for page_idx in range(num_pages):
                        page_data = extract_page_spatial_elements(doc[page_idx], page_idx, prev_column_bands=prev_bands, include_charts=True)
                        prev_bands = page_data["column_bands"]
                        sheet_name = f"Table {page_idx + 1}"
                        if page_idx == 0 and default_sheet is not None:
                            ws = default_sheet
                            ws.title = sheet_name
                        else:
                            ws = wb.create_sheet(title=sheet_name)
                        write_spatial_page_to_sheet(ws, page_data, start_row=1, is_continuation_page=(page_idx > 0))
                        autofit(ws)
                else:
                    # Mode 1 Sheet Gabungan (Combined / Solid Framework Continuation)
                    ws = default_sheet if default_sheet is not None else wb.create_sheet(title="Table 1")
                    ws.title = "Hasil Ekstraksi"
                    cur_row = 1
                    prev_bands = None
                    for page_idx in range(num_pages):
                        page_data = extract_page_spatial_elements(doc[page_idx], page_idx, prev_column_bands=prev_bands, include_charts=True)
                        prev_bands = page_data["column_bands"]
                        cur_row = write_spatial_page_to_sheet(ws, page_data, start_row=cur_row, is_continuation_page=(page_idx > 0))
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
