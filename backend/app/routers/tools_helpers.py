# app/routers/tools_helpers.py
import re
import json
import urllib.parse
import urllib.request
import logging
from typing import List, Optional
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
