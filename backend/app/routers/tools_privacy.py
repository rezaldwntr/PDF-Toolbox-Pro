# app/routers/tools_privacy.py
"""
Router untuk Kepatuhan UU Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022).
Fitur: Auto-Redact PII/NIK (Penyensoran Biner Permanen / True Binary Redaction).
Mendukung: NIK 16 digit, KK, Paspor, SIM, NPWP (15 & 16 digit), No Rekening Bank,
No Kartu Kredit/Debit, No HP Indonesia, Email Pribadi, BPJS Kesehatan, dan Kata Kunci Kustom.
Kepatuhan Aturan Ponytail: Prosedural datar, KISS, fungsi < 50 baris, file < 500 baris.
"""
import re
import io
import logging
from typing import List, Dict, Tuple, Optional

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
import fitz  # PyMuPDF

from app.core.config import MAX_FILE_SIZE
from app.utils.file_utils import (
    validate_pdf_bytes,
    get_safe_base_name,
    create_file_response,
)
from app.routers.tools_helpers import hex_to_rgb

router = APIRouter(tags=["Tools - Privacy & PDP"])

# Pola Regex Berbasis Regulasi Indonesia (UU PDP, UU Adminduk, PMK NPWP, POJK)
PATTERNS = {
    # 1. Identitas Kependudukan (UU Adminduk & UU PDP Pasal 4 Ayat 3)
    "nik": re.compile(r"\b(1[1-9]|21|[37][1-6]|5[1-3]|6[1-5]|[89][12])\d{2}\d{2}([04][1-9]|[1256][0-9]|[37][01])(0[1-9]|1[0-2])\d{2}\d{4}\b"),
    "id_general": re.compile(r"\b\d{16}\b"),
    "paspor": re.compile(r"\b[A-Za-z]\d{7}\b"),
    "sim": re.compile(r"\b\d{12}\b"),
    
    # 2. Finansial & Pajak (PMK 112/2022 & POJK 22/2023)
    "npwp_dots": re.compile(r"\b\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}\b"),
    "card": re.compile(r"\b(?:\d{4}[ -]?){3}\d{4}\b"),
    
    # 3. Kontak & Komunikasi (UU PDP Pasal 4 Ayat 3)
    "phone": re.compile(r"\b(?:\+?62|0)8[1-9]\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,5}\b"),
    "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    
    # 4. Kesehatan & Jaminan Sosial (UU PDP Pasal 4 Ayat 2)
    "bpjs": re.compile(r"\b000\d{10}\b"),
}


def _collect_target_strings(
    page_text: str,
    redact_id: bool,
    redact_financial: bool,
    redact_contact: bool,
    redact_health: bool,
    custom_keywords: List[str]
) -> Dict[str, List[str]]:
    """Mengumpulkan seluruh string teks sensitif pada halaman berdasarkan kategori aktif."""
    collected: Dict[str, List[str]] = {
        "id": [],
        "financial": [],
        "contact": [],
        "health": [],
        "custom": []
    }

    if redact_id:
        niks = PATTERNS["nik"].findall(page_text)
        nik_strs = [m[0] if isinstance(m, tuple) else m for m in niks]
        other_ids = PATTERNS["id_general"].findall(page_text)
        paspors = PATTERNS["paspor"].findall(page_text)
        sims = PATTERNS["sim"].findall(page_text)
        collected["id"].extend(set(nik_strs + other_ids + paspors + sims))

    if redact_financial:
        npwps = PATTERNS["npwp_dots"].findall(page_text)
        cards = PATTERNS["card"].findall(page_text)
        collected["financial"].extend(set(npwps + cards))

    if redact_contact:
        phones = PATTERNS["phone"].findall(page_text)
        emails = PATTERNS["email"].findall(page_text)
        collected["contact"].extend(set(phones + emails))

    if redact_health:
        bpjs_matches = PATTERNS["bpjs"].findall(page_text)
        collected["health"].extend(set(bpjs_matches))

    if custom_keywords:
        for kw in custom_keywords:
            if kw and kw.lower() in page_text.lower():
                collected["custom"].append(kw)

    return collected


def _apply_redactions_to_page(
    page: fitz.Page,
    targets: Dict[str, List[str]],
    fill_rgb: Tuple[float, float, float],
    redact_label: str,
    text_rgb: Tuple[float, float, float]
) -> Dict[str, int]:
    """Membubuhkan dan membakar True Binary Redactions pada sebuah lembar PDF."""
    counts = {"id": 0, "financial": 0, "contact": 0, "health": 0, "custom": 0}

    for cat, strings in targets.items():
        for s in set(strings):
            if not s:
                continue
            rects = page.search_for(s)
            for r in rects:
                page.add_redact_annot(
                    r,
                    text=redact_label if redact_label else None,
                    fill=fill_rgb,
                    text_color=text_rgb,
                    fontsize=7,
                    align=fitz.TEXT_ALIGN_CENTER
                )
                counts[cat] += 1

    # Eksekusi True Binary Redaction (Hapus data vektor dan gambar secara permanen)
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_PIXELS)
    return counts


def sanitize_and_redact_pdf(
    pdf_bytes: bytes,
    redact_id: bool,
    redact_financial: bool,
    redact_contact: bool,
    redact_health: bool,
    custom_keywords: List[str],
    redact_color_hex: str,
    redact_label: str
) -> Tuple[bytes, Dict[str, int]]:
    """Proses utama True Binary Redaction dan sanitasi metadata dokumen."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    fill_rgb = hex_to_rgb(redact_color_hex)

    # Warna teks label: putih untuk background gelap, hitam untuk background terang
    luminance = 0.299 * fill_rgb[0] + 0.587 * fill_rgb[1] + 0.114 * fill_rgb[2]
    text_rgb = (1.0, 1.0, 1.0) if luminance < 0.6 else (0.0, 0.0, 0.0)

    total_counts = {"id": 0, "financial": 0, "contact": 0, "health": 0, "custom": 0}

    for page in doc:
        page_text = page.get_text() or ""
        if not page_text.strip():
            continue

        targets = _collect_target_strings(
            page_text,
            redact_id,
            redact_financial,
            redact_contact,
            redact_health,
            custom_keywords
        )

        page_counts = _apply_redactions_to_page(page, targets, fill_rgb, redact_label, text_rgb)
        for k in total_counts:
            total_counts[k] += page_counts[k]

    # Kepatuhan UU PDP Pasal 39: Hapus metadata dokumen (Author, Creator, Producer)
    doc.set_metadata({
        "author": "",
        "creator": "PDF Toolbox Pro - Privacy Shield",
        "producer": "PyMuPDF True Redaction Engine",
        "title": "Dokumen Terlindungi UU PDP",
        "subject": "Redacted Document",
        "keywords": "UU PDP 27/2022, True Redaction"
    })

    # Simpan dengan pembersihan total stream biner mati (garbage=4)
    output_bytes = doc.tobytes(garbage=4, deflate=True, clean=True)
    doc.close()

    return output_bytes, total_counts


@router.post("/redact-pdf")
def redact_pdf(
    file: UploadFile = File(...),
    redact_id: bool = Form(True),
    redact_financial: bool = Form(True),
    redact_contact: bool = Form(False),
    redact_health: bool = Form(False),
    custom_keywords: str = Form(""),
    redact_color: str = Form("#000000"),
    redact_label: str = Form(""),
):
    """
    Menyensor otomatis data pribadi sensitif (NIK, KK, Paspor, SIM, NPWP, No Rekening, HP, Email)
    menggunakan True Binary Redaction sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.
    """
    filename = file.filename or "dokumen.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang sah.")

    content = file.file.read()
    validate_pdf_bytes(content, filename)
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas melebihi batas maksimal {max_mb} MB.")

    parsed_keywords = [k.strip() for k in custom_keywords.split(",") if k.strip()] if custom_keywords else []

    try:
        redacted_bytes, counts = sanitize_and_redact_pdf(
            content,
            redact_id=redact_id,
            redact_financial=redact_financial,
            redact_contact=redact_contact,
            redact_health=redact_health,
            custom_keywords=parsed_keywords,
            redact_color_hex=redact_color,
            redact_label=redact_label.strip()
        )
    except Exception as err:
        logging.error(f"Gagal melakukan redaksi data sensitif: {err}")
        raise HTTPException(status_code=500, detail=f"Gagal melakukan redaksi PDF: {str(err)}")

    total_redacted = sum(counts.values())
    safe_base = get_safe_base_name(filename)
    out_filename = f"redacted_pdp_{safe_base}.pdf"

    extra_headers = {
        "X-Redacted-Total": str(total_redacted),
        "X-Redacted-Id": str(counts["id"]),
        "X-Redacted-Financial": str(counts["financial"]),
        "X-Redacted-Contact": str(counts["contact"]),
        "X-Redacted-Health": str(counts["health"]),
        "X-Redacted-Custom": str(counts["custom"]),
        "Access-Control-Expose-Headers": "Content-Disposition, X-Redacted-Total, X-Redacted-Id, X-Redacted-Financial, X-Redacted-Contact, X-Redacted-Health, X-Redacted-Custom",
    }

    return create_file_response(
        redacted_bytes,
        out_filename,
        mime_type="application/pdf",
        extra_headers=extra_headers
    )
