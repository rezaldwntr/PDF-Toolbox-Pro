# app/routers/tools_security.py
import io
import logging
from typing import Optional

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
import fitz  # PyMuPDF
from PIL import Image

from app.core.config import MAX_FILE_SIZE
from app.utils.file_utils import (
    validate_pdf_bytes,
    get_safe_base_name,
    create_file_response,
)
from app.routers.tools_helpers import (
    hex_to_rgb,
    get_fontname,
    get_target_pages,
    calculate_pdf_permissions,
)

router = APIRouter(tags=["Tools - Security"])


def _apply_text_watermark(doc, target_indices, text, font_family, font_size, is_bold, is_italic, color, opacity, rotation, is_overlay, position, is_mosaic):
    """Membubuhkan teks watermark pada halaman yang ditargetkan."""
    watermark_text = (text or "CONFIDENTIAL").strip()
    if not watermark_text:
        raise HTTPException(status_code=400, detail="Teks watermark tidak boleh kosong.")

    font_name = get_fontname(font_family, is_bold, is_italic)
    rgb_color = hex_to_rgb(color)
    f_size = max(8.0, min(160.0, float(font_size)))
    rot_angle = float(rotation)

    for page_idx in target_indices:
        page = doc[page_idx]
        p_width, p_height = page.rect.width, page.rect.height

        try:
            text_w = fitz.get_text_length(watermark_text, fontname=font_name, fontsize=f_size)
        except Exception:
            text_w = len(watermark_text) * f_size * 0.55
        text_h = f_size * 0.85

        if is_mosaic:
            step_x = max(180.0, text_w + 60.0)
            step_y = max(120.0, f_size * 3.8)
            start_x, end_x = -int(step_x), int(p_width + step_x * 2)
            start_y, end_y = -int(step_y), int(p_height + step_y * 2)

            row = 0
            for cy in range(start_y, end_y, int(step_y)):
                x_offset = (row % 2) * (step_x / 2)
                for cx in range(start_x, end_x, int(step_x)):
                    actual_cx = cx + x_offset
                    pt = fitz.Point(actual_cx - text_w / 2, cy + f_size * 0.3)
                    fp = fitz.Point(actual_cx, cy)
                    page.insert_text(
                        pt, watermark_text, fontsize=f_size, fontname=font_name,
                        color=rgb_color, fill_opacity=opacity,
                        morph=(fp, fitz.Matrix(rot_angle)), overlay=is_overlay
                    )
                row += 1
        else:
            margin_x, margin_y = 40.0, 40.0
            pos = (position or "center").lower().strip()
            if pos == "top-left":
                cx, cy = margin_x + text_w / 2, margin_y + text_h / 2
            elif pos == "top-center":
                cx, cy = p_width / 2, margin_y + text_h / 2
            elif pos == "top-right":
                cx, cy = p_width - margin_x - text_w / 2, margin_y + text_h / 2
            elif pos == "middle-left":
                cx, cy = margin_x + text_w / 2, p_height / 2
            elif pos == "middle-right":
                cx, cy = p_width - margin_x - text_w / 2, p_height / 2
            elif pos == "bottom-left":
                cx, cy = margin_x + text_w / 2, p_height - margin_y - text_h / 2
            elif pos == "bottom-center":
                cx, cy = p_width / 2, p_height - margin_y - text_h / 2
            elif pos == "bottom-right":
                cx, cy = p_width - margin_x - text_w / 2, p_height - margin_y - text_h / 2
            else:
                cx, cy = p_width / 2, p_height / 2

            pt = fitz.Point(cx - text_w / 2, cy + f_size * 0.3)
            fp = fitz.Point(cx, cy)
            page.insert_text(
                pt, watermark_text, fontsize=f_size, fontname=font_name,
                color=rgb_color, fill_opacity=opacity,
                morph=(fp, fitz.Matrix(rot_angle)), overlay=is_overlay
            )


def _apply_image_watermark(doc, target_indices, image_file, image_scale, opacity, is_overlay, position, is_mosaic):
    """Membubuhkan logo/gambar watermark pada halaman yang ditargetkan."""
    if not image_file:
        raise HTTPException(status_code=400, detail="Unggah berkas gambar/logo untuk mode cap air gambar.")

    img_bytes = image_file.file.read()
    if len(img_bytes) == 0:
        raise HTTPException(status_code=400, detail="Berkas gambar kosong.")

    processed_img_bytes = img_bytes
    try:
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
        orig_w, orig_h = pil_img.size
        if opacity < 0.98:
            r_ch, g_ch, b_ch, a_ch = pil_img.split()
            a_ch = a_ch.point(lambda p: int(p * opacity))
            pil_img.putalpha(a_ch)
        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        processed_img_bytes = buf.getvalue()
    except Exception as img_err:
        logging.warning(f"Pillow alpha adjustment fallback: {img_err}")
        orig_w, orig_h = (300, 300)

    aspect_ratio = (orig_h / orig_w) if orig_w > 0 else 1.0
    scale = max(0.1, min(1.0, float(image_scale)))

    for page_idx in target_indices:
        page = doc[page_idx]
        p_width, p_height = page.rect.width, page.rect.height
        target_w = p_width * scale
        target_h = target_w * aspect_ratio
        if target_h > p_height * 0.85:
            target_h = p_height * 0.85
            target_w = target_h / aspect_ratio

        if is_mosaic:
            step_x, step_y = max(180.0, target_w * 1.6), max(140.0, target_h * 1.6)
            start_x, end_x = -int(step_x), int(p_width + step_x * 2)
            start_y, end_y = -int(step_y), int(p_height + step_y * 2)

            row = 0
            for cy in range(start_y, end_y, int(step_y)):
                x_offset = (row % 2) * (step_x / 2)
                for cx in range(start_x, end_x, int(step_x)):
                    actual_cx = cx + x_offset
                    img_rect = fitz.Rect(actual_cx - target_w / 2, cy - target_h / 2, actual_cx + target_w / 2, cy + target_h / 2)
                    page.insert_image(img_rect, stream=processed_img_bytes, overlay=is_overlay)
                row += 1
        else:
            margin_x, margin_y = 35.0, 35.0
            pos = (position or "center").lower().strip()
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
            else:
                x0, y0 = (p_width - target_w) / 2, (p_height - target_h) / 2

            img_rect = fitz.Rect(x0, y0, x0 + target_w, y0 + target_h)
            page.insert_image(img_rect, stream=processed_img_bytes, overlay=is_overlay)


# === 1. WATERMARK PDF ===
@router.post("/watermark-pdf")
def watermark_pdf(
    file: UploadFile = File(...),
    watermark_type: str = Form("text"),
    text: str = Form("CONFIDENTIAL"),
    font_family: str = Form("helv"),
    font_size: float = Form(36.0),
    is_bold: bool = Form(False),
    is_italic: bool = Form(False),
    color: str = Form("#EF4444"),
    image_file: Optional[UploadFile] = File(None),
    image_scale: float = Form(0.35),
    opacity: float = Form(0.3),
    rotation: float = Form(-45.0),
    layer: str = Form("over"),
    position: str = Form("center"),
    is_mosaic: bool = Form(False),
    page_selection: str = Form("all"),
    custom_pages: Optional[str] = Form(None),
    exclude_first_page: bool = Form(False)
):
    """Membubuhkan cap air teks atau gambar pada PDF secara in-memory."""
    filename = file.filename or "dokumen.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    content = file.file.read()
    validate_pdf_bytes(content, filename)
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi {max_mb} MB.")

    safe_base = get_safe_base_name(filename)
    out_filename = f"watermarked-{safe_base}.pdf"

    doc = None
    try:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak.")

        if doc.needs_pass or doc.is_encrypted:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' terproteksi kata sandi.")

        total_pages = len(doc)
        if total_pages == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

        target_indices = get_target_pages(total_pages, page_selection, custom_pages, exclude_first_page)
        if not target_indices:
            raise HTTPException(status_code=400, detail="Tidak ada halaman yang cocok dengan pilihan.")

        clamped_opacity = max(0.05, min(1.0, float(opacity)))
        is_overlay = layer.lower() in ("over", "above")

        if watermark_type.lower() == "text":
            _apply_text_watermark(
                doc, target_indices, text, font_family, font_size, is_bold, is_italic,
                color, clamped_opacity, rotation, is_overlay, position, is_mosaic
            )
        elif watermark_type.lower() == "image":
            _apply_image_watermark(
                doc, target_indices, image_file, image_scale, clamped_opacity,
                is_overlay, position, is_mosaic
            )
        else:
            raise HTTPException(status_code=400, detail=f"Tipe watermark '{watermark_type}' tidak dikenali.")

        pdf_bytes = doc.tobytes(garbage=3, deflate=True)
        return create_file_response(pdf_bytes, out_filename)

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR WATERMARK: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal menambahkan watermark: {str(e)}")
    finally:
        if doc and not doc.is_closed:
            doc.close()


# === 2. PROTEKSI PDF ===
@router.post("/protect-pdf")
def protect_pdf(
    file: UploadFile = File(...),
    password: str = Form(...),
    owner_password: Optional[str] = Form(None),
    allow_print: bool = Form(True),
    allow_copy: bool = Form(True),
    allow_modify: bool = Form(False),
    allow_annotate: bool = Form(True),
    allow_fill_forms: bool = Form(True)
):
    """Mengunci PDF dengan enkripsi AES-256 bit dan granular access permissions."""
    filename = file.filename or "dokumen.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    clean_password = (password or "").strip()
    if len(clean_password) < 4:
        raise HTTPException(status_code=400, detail="Kata sandi minimal harus terdiri dari 4 karakter.")

    content = file.file.read()
    validate_pdf_bytes(content, filename)
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi batas {max_mb} MB.")

    safe_base = get_safe_base_name(filename)
    out_filename = f"protected-{safe_base}.pdf"

    doc = None
    try:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak.")

        if doc.needs_pass or doc.is_encrypted:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' sudah dilindungi kata sandi.")

        if len(doc) == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

        perm = calculate_pdf_permissions(allow_print, allow_modify, allow_copy, allow_annotate, allow_fill_forms)
        try:
            enc_algo = fitz.PDF_ENCRYPT_AES_256
        except AttributeError:
            enc_algo = fitz.PDF_ENCRYPT_AES_128

        clean_owner = owner_password.strip() if (owner_password and owner_password.strip()) else clean_password
        pdf_bytes = doc.tobytes(
            encryption=enc_algo, user_pw=clean_password, owner_pw=clean_owner,
            permissions=perm, garbage=3, deflate=True
        )
        return create_file_response(pdf_bytes, out_filename)

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR PROTECT PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal memproteksi PDF: {str(e)}")
    finally:
        if doc and not doc.is_closed:
            doc.close()


# === 3. BUKA KUNCI PDF (UNLOCK) ===
@router.post("/unlock-pdf")
def unlock_pdf(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None)
):
    """Membuka kunci dan menghapus proteksi kata sandi pada dokumen PDF."""
    filename = file.filename or "dokumen.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang valid.")

    content = file.file.read()
    validate_pdf_bytes(content, filename)
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' melebihi {max_mb} MB.")

    safe_base = get_safe_base_name(filename)
    if safe_base.startswith("protected-"):
        safe_base = safe_base[len("protected-"):]
    out_filename = f"unlocked-{safe_base}.pdf"

    doc = None
    try:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' rusak.")

        if not doc.is_encrypted and not doc.needs_pass:
            raise HTTPException(status_code=400, detail=f"Berkas '{filename}' tidak terproteksi kata sandi.")

        clean_pw = (password or "").strip()
        auth_success = False
        if clean_pw:
            auth_result = doc.authenticate(clean_pw)
            if auth_result > 0:
                auth_success = True
            else:
                raise HTTPException(status_code=401, detail="Kata sandi salah. Silakan periksa kembali kata sandi.")
        else:
            try:
                auth_result = doc.authenticate("")
                if auth_result > 0:
                    auth_success = True
            except Exception:
                pass
            if not auth_success:
                raise HTTPException(status_code=400, detail="Dokumen ini dilindungi kata sandi.")

        if len(doc) == 0:
            raise HTTPException(status_code=400, detail="Dokumen PDF tidak memiliki halaman.")

        pdf_bytes = doc.tobytes(garbage=3, deflate=True)
        return create_file_response(pdf_bytes, out_filename)

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR UNLOCK PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal membuka kunci PDF: {str(e)}")
    finally:
        if doc and not doc.is_closed:
            doc.close()
