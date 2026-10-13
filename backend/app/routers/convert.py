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
    """Mengonversi nilai string ke tipe numerik (int/float) jika memungkinkan agar formula Excel berfungsi."""
    if val is None:
        return ""
    val_str = str(val).strip()
    if not val_str:
        return ""
    # Cek apakah string merupakan angka (misal: "12500", "-45.67", "12,500.00")
    cleaned = val_str.replace(",", "")
    if re.match(r'^-?\d+(\.\d+)?$', cleaned):
        try:
            if "." in cleaned:
                return float(cleaned)
            return int(cleaned)
        except ValueError:
            pass
    return val_str


_FORMAL_KEYWORDS = (
    "lembar pengesahan",
    "halaman pengesahan",
    "pengesahan",
    "lembar persetujuan",
    "halaman persetujuan",
    "mengetahui",
    "menyetujui",
    "pembimbing",
    "penguji",
    "dekan",
    "rektor",
    "ketua jurusan",
    "ketua program studi",
    "kaprodi",
    "direktur",
    "kepala",
    "nip.",
    "nip :",
    "nidn",
    "nim :",
    "nrp",
    "ditandatangani",
    "tanda tangan",
    "sertifikat",
    "piagam",
    "ijazah",
    "transkrip",
    "berita acara",
    "surat keterangan",
    "surat keputusan",
    "invoice",
    "kwitansi",
    "faktur",
)


def needs_visual_photo_docx(pdf_path: str, selected_pages: Optional[list] = None) -> bool:
    """
    Memvalidasi apakah dokumen PDF memiliki tata letak kompleks / gambar / tanda tangan / scan / lembar pengesahan
    yang tidak dapat diubah 100% identik menjadi teks mengalir biasa di Word.
    """
    try:
        with fitz.open(pdf_path) as doc:
            pages_to_check = selected_pages if selected_pages is not None else list(range(len(doc)))
            for p_idx in pages_to_check:
                if p_idx < 0 or p_idx >= len(doc):
                    continue
                page = doc[p_idx]
                raw_text = page.get_text("text") or ""
                clean_chars = re.sub(r"\s+", "", raw_text)
                if len(clean_chars) < 120:
                    return True
                lower_text = raw_text.lower()
                if any(kw in lower_text for kw in _FORMAL_KEYWORDS):
                    return True
                if len(page.get_images(full=True)) > 0:
                    return True
                if len(page.get_drawings()) > 6:
                    return True
                if raw_text.count(":") >= 3:
                    return True
        return False
    except Exception:
        return True


def build_visual_photo_docx(pdf_path: str, out_docx_path: str, selected_pages: Optional[list] = None) -> None:
    """
    Menyusun dokumen Word (.docx OpenXML) berisi foto halaman utuh beresolusi tinggi (margin 0)
    agar hasil konversi 100% sama persis dengan dokumen PDF aslinya.
    """
    with fitz.open(pdf_path) as doc:
        pages_to_render = selected_pages if selected_pages is not None else list(range(len(doc)))
        if not pages_to_render:
            pages_to_render = [0]

        first_page = doc[pages_to_render[0]]
        doc_w_twips = int(round(first_page.rect.width * 20))
        doc_h_twips = int(round(first_page.rect.height * 20))

        body_parts = []
        rel_entries = [
            '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        ]

        with ZipFile(out_docx_path, "w", compression=ZIP_DEFLATED) as zf:
            for idx, p_idx in enumerate(pages_to_render, start=1):
                if p_idx < 0 or p_idx >= len(doc):
                    continue
                page = doc[p_idx]
                pix = page.get_pixmap(dpi=180)
                img_bytes = pix.tobytes("jpeg")
                img_filename = f"page_{idx}.jpg"
                r_id = f"rIdImg{idx}"

                zf.writestr(f"word/media/{img_filename}", img_bytes)
                rel_entries.append(
                    f'<Relationship Id="{r_id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{img_filename}"/>'
                )

                cx = int(round(page.rect.width * 0.994 * 12700))
                cy = int(round(page.rect.height * 0.990 * 12700))
                page_break_xml = "<w:pageBreakBefore/>" if idx > 1 else ""

                body_parts.append(
                    f"""<w:p>
                      <w:pPr>
                        {page_break_xml}
                        <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
                        <w:jc w:val="center"/>
                        <w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr>
                      </w:pPr>
                      <w:r>
                        <w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr>
                        <w:drawing>
                          <wp:inline distT="0" distB="0" distL="0" distR="0">
                            <wp:extent cx="{cx}" cy="{cy}"/>
                            <wp:effectExtent l="0" t="0" r="0" b="0"/>
                            <wp:docPr id="{idx}" name="Halaman {idx}"/>
                            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                  <pic:nvPicPr>
                                    <pic:cNvPr id="{idx}" name="{img_filename}"/>
                                    <pic:cNvPicPr/>
                                  </pic:nvPicPr>
                                  <pic:blipFill>
                                    <a:blip r:embed="{r_id}"/>
                                    <a:stretch><a:fillRect/></a:stretch>
                                  </pic:blipFill>
                                  <pic:spPr>
                                    <a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>
                                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                                  </pic:spPr>
                                </pic:pic>
                              </a:graphicData>
                            </a:graphic>
                          </wp:inline>
                        </w:drawing>
                      </w:r>
                    </w:p>"""
                )

            content_types_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>"""

            root_rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

            doc_rels_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  {"".join(rel_entries)}
</Relationships>"""

            styles_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
</w:styles>"""

            document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:body>
    {"".join(body_parts)}
    <w:sectPr>
      <w:pgSz w:w="{doc_w_twips}" w:h="{doc_h_twips}"/>
      <w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>"""

            zf.writestr("[Content_Types].xml", content_types_xml)
            zf.writestr("_rels/.rels", root_rels_xml)
            zf.writestr("word/_rels/document.xml.rels", doc_rels_xml)
            zf.writestr("word/styles.xml", styles_xml)
            zf.writestr("word/document.xml", document_xml)


# === 1. PDF KE DOCX (ASYNC JOB) ===
@router.post("/pdf-to-docx", status_code=202)
async def convert_pdf_to_docx(
    file: UploadFile = File(...),
    start_page: Optional[int] = Form(None),
    end_page: Optional[int] = Form(None),
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

            cpu_cores = max(1, multiprocessing.cpu_count())
            use_multiprocess = cpu_cores > 1

            selected_pages = None
            if start_page is not None or end_page is not None:
                with fitz.open(tmp_pdf_path) as doc_check:
                    actual_total = len(doc_check)
                s_page = (start_page - 1) if (start_page is not None and start_page > 0) else 0
                e_page = end_page if (end_page is not None and end_page > 0) else actual_total
                if s_page < actual_total:
                    e_page = min(e_page, actual_total)
                    selected_pages = list(range(s_page, e_page))

            update_job(job_id, progress=30, message="Memvalidasi presisi tata letak dokumen...")

            def _do_convert():
                # Validasi otomatis: jika tidak bisa 100% sama lewat teks biasa, gunakan mode foto halaman utuh di Word
                if needs_visual_photo_docx(tmp_pdf_path, selected_pages):
                    build_visual_photo_docx(tmp_pdf_path, tmp_docx_path, selected_pages)
                    return

                cv = Converter(tmp_pdf_path)
                try:
                    if selected_pages is not None:
                        cv.convert(tmp_docx_path, pages=selected_pages)
                    else:
                        cv.convert(tmp_docx_path, multi_processing=use_multiprocess, cpu_count=cpu_cores)
                except Exception as conv_err:
                    logging.warning(f"pdf2docx multi_processing failed, fallback: {conv_err}")
                    cv.close()
                    cv = Converter(tmp_pdf_path)
                    if selected_pages is not None:
                        cv.convert(tmp_docx_path, pages=selected_pages)
                    else:
                        cv.convert(tmp_docx_path)
                finally:
                    cv.close()

            update_job(job_id, progress=50, message="Menyusun halaman ke format Word presisi tinggi...")
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

            plum_doc = None
            try:
                with pd.ExcelWriter(tmp_xlsx_path, engine='openpyxl') as writer:
                    wb = writer.book

                    def autofit(ws):
                        for col in ws.columns:
                            max_len = 0
                            col_letter = get_column_letter(col[0].column)
                            for cell in col:
                                if cell.value is not None:
                                    max_len = max(max_len, len(str(cell.value)))
                            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 11), 50)

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
                        ws = wb.create_sheet(title=sheet_name)
                        cur_row = 1
                        any_table_found = False
                        for tbl in tables:
                            any_table_found = True
                            for r_idx, row_data in enumerate(tbl):
                                is_header_row = r_idx == 0
                                for c_idx, val in enumerate(row_data, start=1):
                                    cell = ws.cell(row=cur_row, column=c_idx, value=parse_cell_value(val))
                                    cell.border = thin_border
                                    if is_header_row:
                                        cell.fill = header_fill
                                        cell.font = header_font
                                cur_row += 1
                            cur_row += 2
                        if mode == "all_content" and text_lines:
                            ws.cell(row=cur_row, column=1, value="--- Konten Teks ---")
                            cur_row += 1
                            for line in text_lines:
                                ws.cell(row=cur_row, column=1, value=line)
                                cur_row += 1
                        if not any_table_found and mode == "tables_only":
                            ws.cell(row=1, column=1, value="Tidak ada tabel terdeteksi di halaman ini.")
                        autofit(ws)
                else:
                    ws = wb.create_sheet(title="Hasil Ekstraksi")
                    cur_row = 1
                    any_table_found = False
                    for page_idx in range(num_pages):
                        tables, text_lines = get_page_tables_and_text(page_idx)
                        if tables or (mode == "all_content" and text_lines):
                            ws.cell(row=cur_row, column=1, value=f"=== Halaman {page_idx + 1} ===")
                            ws.cell(row=cur_row, column=1).font = Font(bold=True, name='Calibri')
                            cur_row += 1
                        for tbl in tables:
                            any_table_found = True
                            for r_idx, row_data in enumerate(tbl):
                                is_header_row = r_idx == 0
                                for c_idx, val in enumerate(row_data, start=1):
                                    cell = ws.cell(row=cur_row, column=c_idx, value=parse_cell_value(val))
                                    cell.border = thin_border
                                    if is_header_row:
                                        cell.fill = header_fill
                                        cell.font = header_font
                                cur_row += 1
                            cur_row += 2
                        if mode == "all_content" and text_lines:
                            for line in text_lines:
                                ws.cell(row=cur_row, column=1, value=line)
                                cur_row += 1
                            cur_row += 1
                    if not any_table_found and mode == "tables_only":
                        ws.cell(row=1, column=1, value="Tidak ada tabel terdeteksi di dokumen ini. Coba gunakan opsi 'Tabel & Teks Dokumen'.")
                    autofit(ws)

                if "Sheet" in wb.sheetnames and len(wb.sheetnames) > 1:
                    del wb["Sheet"]

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
