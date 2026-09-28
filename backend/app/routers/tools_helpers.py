# app/routers/tools_helpers.py
import re
import json
import urllib.parse
import urllib.request
import logging
from typing import List, Optional
from fastapi import HTTPException
import fitz  # PyMuPDF


def hex_to_rgb(hex_str: str) -> tuple:
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


def get_fontname(font_family: str, is_bold: bool, is_italic: bool) -> str:
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


def get_target_pages(doc_len: int, page_selection: str, custom_pages: Optional[str], exclude_first_page: bool = False) -> List[int]:
    """Menentukan daftar index halaman (0-based) yang ditargetkan."""
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

    if exclude_first_page and 0 in target_indices:
        target_indices.remove(0)

    return target_indices


def calculate_pdf_permissions(allow_print: bool, allow_modify: bool, allow_copy: bool, allow_annotate: bool, allow_fill_forms: bool) -> int:
    """Kalkulasi Bitmask Izin (Permissions) Standar ISO PDF."""
    perm = 0
    if allow_print:
        perm |= getattr(fitz, "PDF_PERM_PRINT", 4)
    if allow_modify:
        perm |= getattr(fitz, "PDF_PERM_MODIFY", 8)
    if allow_copy:
        perm |= getattr(fitz, "PDF_PERM_COPY", 16)
    if allow_annotate:
        perm |= getattr(fitz, "PDF_PERM_ANNOTATE", 32)
    if allow_fill_forms:
        perm |= getattr(fitz, "PDF_PERM_FORM", getattr(fitz, "PDF_PERM_FILL_FORM", 256))
    perm |= getattr(fitz, "PDF_PERM_ACCESSIBILITY", 512)
    return perm


def translate_text_chunk(text: str, source_lang: str = "auto", target_lang: str = "id") -> str:
    """Menerjemahkan teks via Google Translate API client gtx dengan fallback MyMemory."""
    clean_text = text.strip()
    if not clean_text or re.match(r'^[\d\s\W_]+$', clean_text):
        return text

    src = (source_lang or "auto").strip().lower()
    tgt = (target_lang or "id").strip().lower()

    if src == tgt and src != "auto":
        return text

    if len(clean_text) > 1500:
        paragraphs = clean_text.split("\n")
        translated_paragraphs = [
            translate_text_chunk(p, src, tgt) if p.strip() else ""
            for p in paragraphs
        ]
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


def build_pdfa_xmp(part: int, conf: str, doc_title: str, doc_author: str, now_iso: str) -> str:
    """Menyusun paket metadata XMP standar ISO 19005 (PDF/A Identification Schema)."""
    return f"""<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
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


def apply_find_and_replace(doc, doc_len, search_text, replace_text, case_sensitive, page_selection, current_page, custom_pages):
    """Mencari dan mengganti kata/kalimat di dokumen PDF."""
    search_str = (search_text or "").strip()
    replace_str = replace_text or ""
    if not search_str:
        raise HTTPException(status_code=400, detail="Teks pencarian tidak boleh kosong.")

    sel = (page_selection or "all").lower().strip()
    if sel == "current":
        target_pages = [max(0, min(current_page - 1, doc_len - 1))]
    else:
        target_pages = get_target_pages(doc_len, sel, custom_pages, exclude_first_page=False)

    for p_idx in target_pages:
        page = doc[p_idx]
        matches = page.search_for(search_str)
        if not case_sensitive and search_str.lower() != search_str:
            matches += [m for m in page.search_for(search_str.lower()) if m not in matches]
            matches += [m for m in page.search_for(search_str.capitalize()) if m not in matches]
            matches += [m for m in page.search_for(search_str.upper()) if m not in matches]

        for rect in matches:
            page.add_redact_annot(rect, fill=(1, 1, 1))
            page.apply_redactions()
            if replace_str:
                font_size = max(7.0, min(24.0, rect.height * 0.8))
                avail_w = max(40.0, page.rect.width - rect.x0 - 20)
                text_w = fitz.get_text_length(replace_str, fontname="helv", fontsize=font_size)
                if text_w > avail_w and text_w > 0:
                    font_size = max(7.0, font_size * (avail_w / text_w))
                target_rect = fitz.Rect(rect.x0, rect.y0, min(page.rect.width - 10, rect.x0 + text_w + 30), rect.y1 + font_size + 4)
                rc = page.insert_textbox(target_rect, replace_str, fontsize=font_size, fontname="helv", color=(0, 0, 0), align=0)
                if rc < 0:
                    page.insert_text(fitz.Point(rect.x0, rect.y1 - 2), replace_str, fontsize=font_size, fontname="helv", color=(0, 0, 0))


def apply_block_edits(doc, doc_len, edits_json):
    """Menyunting blok teks visual dengan redaksi bersih dan penulisan teks baru."""
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
            bg_color = hex_to_rgb(item.get("bg_color", "#ffffff"))
            fg_color = hex_to_rgb(item.get("color", "#000000"))
            font_size = float(item.get("font_size", 12.0))
            new_text = str(item.get("new_text", ""))

            page.add_redact_annot(rect, fill=bg_color)
            page.apply_redactions()

            if new_text.strip():
                text_w = fitz.get_text_length(new_text, fontname="helv", fontsize=font_size)
                target_rect = fitz.Rect(rect.x0, rect.y0, max(rect.x1, rect.x0 + text_w + 10), rect.y1 + 6)
                rc = page.insert_textbox(target_rect, new_text, fontsize=font_size, fontname="helv", color=fg_color, align=0)
                if rc < 0:
                    page.insert_text(fitz.Point(rect.x0, rect.y1 - 2), new_text, fontsize=font_size, fontname="helv", color=fg_color)
