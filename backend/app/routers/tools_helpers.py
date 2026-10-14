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
        return "tiro"
    elif "courier" in fam:
        if is_bold and is_italic:
            return "cobi"
        elif is_bold:
            return "cobo"
        elif is_italic:
            return "coit"
        return "cour"
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


def int_to_rgb(color_int: Optional[int]) -> tuple:
    """Mengonversi integer sRGB PyMuPDF ke tuple float (r, g, b) skala 0.0 - 1.0."""
    if color_int is None or color_int < 0:
        return (0.0, 0.0, 0.0)
    r = ((color_int >> 16) & 255) / 255.0
    g = ((color_int >> 8) & 255) / 255.0
    b = (color_int & 255) / 255.0
    return (r, g, b)


def resolve_matching_font(font_raw: str, flags: int = 0) -> str:
    """
    Memetakan font dan flags teks asli ke salah satu Base-14 standard fonts di PyMuPDF:
    - Serif: tiro (regular), tibo (bold), tiit (italic), tibi (bold-italic)
    - Mono: cour (regular), cobo (bold), coit (italic), cobi (bold-italic)
    - Sans: helv (regular), hebo (bold), heit (italic), hebi (bold-italic)
    """
    f_lower = (font_raw or "").lower()
    is_bold = bool(flags & 64) or bool(flags & 262144) or any(k in f_lower for k in ["bold", "black", "heavy", "semibold", "medium", "w6", "w7", "w8", "w9"])
    is_italic = bool(flags & 2) or any(k in f_lower for k in ["italic", "oblique", "slanted"])
    is_serif = bool(flags & 4) or any(k in f_lower for k in ["times", "serif", "roman", "garamond", "georgia", "cambria", "minion", "baskerville", "palatino"])
    is_mono = bool(flags & 16) or any(k in f_lower for k in ["courier", "mono", "consolas", "menlo", "inconsolata", "typewriter"])

    if is_serif:
        if is_bold and is_italic:
            return "tibi"
        if is_bold:
            return "tibo"
        if is_italic:
            return "tiit"
        return "tiro"
    elif is_mono:
        if is_bold and is_italic:
            return "cobi"
        if is_bold:
            return "cobo"
        if is_italic:
            return "coit"
        return "cour"
    else:
        if is_bold and is_italic:
            return "hebi"
        if is_bold:
            return "hebo"
        if is_italic:
            return "heit"
        return "helv"


def find_best_matching_span(page_text_dict, target_rect):
    """
    Mencari span teks asli di dalam halaman yang beririsan terbesar dengan target_rect
    untuk mengekstrak ukuran font asli, jenis font, warna, dan posisi baseline.
    """
    if not page_text_dict:
        return None
    best_span = None
    max_intersect = 0.0
    r = fitz.Rect(target_rect)
    for b in page_text_dict.get("blocks", []):
        if b.get("type") == 0:  # text block
            for l in b.get("lines", []):
                for s in l.get("spans", []):
                    sb = fitz.Rect(s["bbox"])
                    intersect = (r & sb).get_area()
                    if intersect > max_intersect:
                        max_intersect = intersect
                        best_span = s
    return best_span


def apply_find_and_replace(doc, doc_len, search_text, replace_text, case_sensitive, page_selection, current_page, custom_pages, auto_match_font=True):
    """Mencari dan mengganti kata/kalimat di dokumen PDF dengan menjaga font, ukuran, dan warna asli."""
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

        if not matches:
            continue

        page_text_dict = page.get_text("dict") if auto_match_font else None

        for rect in matches:
            orig_span = find_best_matching_span(page_text_dict, rect) if page_text_dict else None

            if orig_span and auto_match_font:
                detected_size = float(orig_span.get("size", 0.0))
                font_size = detected_size if detected_size > 0 else max(7.0, min(24.0, rect.height * 0.8))
                font_name = resolve_matching_font(orig_span.get("font", "helv"), orig_span.get("flags", 0))
                font_color = int_to_rgb(orig_span.get("color", 0))
                orig_point = orig_span.get("origin")
                baseline_y = orig_point[1] if orig_point else (rect.y1 - max(1.5, font_size * 0.2))
            else:
                font_size = max(7.0, min(24.0, rect.height * 0.8))
                font_name = "helv"
                font_color = (0.0, 0.0, 0.0)
                baseline_y = rect.y1 - max(1.5, font_size * 0.2)

            page.add_redact_annot(rect, fill=(1, 1, 1))
            page.apply_redactions()

            if replace_str:
                avail_w = max(30.0, page.rect.width - rect.x0 - 15)
                text_w = fitz.get_text_length(replace_str, fontname=font_name, fontsize=font_size)
                if text_w > avail_w and text_w > 0:
                    font_size = max(6.0, font_size * (avail_w / text_w))
                    text_w = fitz.get_text_length(replace_str, fontname=font_name, fontsize=font_size)

                if "\n" not in replace_str and baseline_y:
                    page.insert_text(
                        fitz.Point(rect.x0, baseline_y),
                        replace_str,
                        fontsize=font_size,
                        fontname=font_name,
                        color=font_color
                    )
                else:
                    target_rect = fitz.Rect(rect.x0, rect.y0, min(page.rect.width - 10, rect.x0 + text_w + 30), rect.y1 + font_size + 4)
                    rc = page.insert_textbox(target_rect, replace_str, fontsize=font_size, fontname=font_name, color=font_color, align=0)
                    if rc < 0:
                        page.insert_text(fitz.Point(rect.x0, baseline_y), replace_str, fontsize=font_size, fontname=font_name, color=font_color)


def apply_block_edits(doc, doc_len, edits_json, auto_match_font=True):
    """Menyunting blok teks visual dengan deteksi font dan ukuran otomatis."""
    if not edits_json:
        raise HTTPException(status_code=400, detail="Tidak ada data perubahan teks yang dikirimkan.")

    try:
        edits = json.loads(edits_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Format JSON data suntingan tidak valid.")

    if not isinstance(edits, list) or len(edits) == 0:
        raise HTTPException(status_code=400, detail="Daftar suntingan teks kosong.")

    pages_dict_cache = {}

    for item in edits:
        p_num = int(item.get("page", 1))
        p_idx = max(0, min(p_num - 1, doc_len - 1))
        page = doc[p_idx]

        raw_rect = item.get("rect", [])
        if len(raw_rect) == 4:
            rect = fitz.Rect(raw_rect[0], raw_rect[1], raw_rect[2], raw_rect[3])
            bg_color = hex_to_rgb(item.get("bg_color", "#ffffff"))
            custom_fg = item.get("color", "#000000")
            new_text = str(item.get("new_text", ""))

            if p_idx not in pages_dict_cache and auto_match_font:
                pages_dict_cache[p_idx] = page.get_text("dict")

            orig_span = find_best_matching_span(pages_dict_cache.get(p_idx), rect) if auto_match_font else None

            if orig_span and auto_match_font:
                detected_size = float(orig_span.get("size", 0.0))
                item_size = float(item.get("font_size", 0.0))
                font_size = detected_size if detected_size > 0 else (item_size if item_size > 0 else 12.0)

                font_name = resolve_matching_font(orig_span.get("font", "helv"), orig_span.get("flags", 0))

                if custom_fg and custom_fg.lower() != "#000000":
                    fg_color = hex_to_rgb(custom_fg)
                else:
                    orig_col = orig_span.get("color", 0)
                    fg_color = int_to_rgb(orig_col) if orig_col else (0.0, 0.0, 0.0)

                orig_point = orig_span.get("origin")
                baseline_y = orig_point[1] if orig_point else (rect.y1 - max(1.5, font_size * 0.2))
            else:
                font_size = float(item.get("font_size", 12.0))
                font_name = "helv"
                fg_color = hex_to_rgb(custom_fg)
                baseline_y = rect.y1 - max(1.5, font_size * 0.2)

            page.add_redact_annot(rect, fill=bg_color)
            page.apply_redactions()

            if new_text.strip():
                avail_w = max(30.0, page.rect.width - rect.x0 - 15)
                text_w = fitz.get_text_length(new_text, fontname=font_name, fontsize=font_size)
                if text_w > avail_w and text_w > 0:
                    font_size = max(6.0, font_size * (avail_w / text_w))
                    text_w = fitz.get_text_length(new_text, fontname=font_name, fontsize=font_size)

                if "\n" not in new_text and baseline_y:
                    page.insert_text(
                        fitz.Point(rect.x0, baseline_y),
                        new_text,
                        fontsize=font_size,
                        fontname=font_name,
                        color=fg_color
                    )
                else:
                    target_rect = fitz.Rect(rect.x0, rect.y0, max(rect.x1, rect.x0 + text_w + 10), rect.y1 + 6)
                    rc = page.insert_textbox(target_rect, new_text, fontsize=font_size, fontname=font_name, color=fg_color, align=0)
                    if rc < 0:
                        page.insert_text(fitz.Point(rect.x0, baseline_y), new_text, fontsize=font_size, fontname=font_name, color=fg_color)
