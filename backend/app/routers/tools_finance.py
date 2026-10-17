# app/routers/tools_finance.py
"""
Router untuk Pemrosesan Dokumen Finansial & Rekening Koran (Bank Statement Parser).
Mendukung: BCA, Mandiri, BRI, BNI, BSI (Bank Syariah Indonesia), Bank Kalsel (Konvensional & Syariah),
BPD Daerah (BJB, DKI, Jatim, Aceh, NTB), serta Universal Heuristic Mode.
Kepatuhan Aturan Ponytail: Prosedural datar, KISS, fungsi < 50 baris, file < 500 baris.
"""
import io
import re
import csv
import logging
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
import pdfplumber
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.core.config import MAX_FILE_SIZE
from app.utils.file_utils import (
    validate_pdf_bytes,
    get_safe_base_name,
    create_file_response,
)

import fitz  # PyMuPDF

router = APIRouter(tags=["Tools - Finance"])

BANK_KEYWORDS = {
    "jago": ["bank jago", "pt bank jago", "kantong utama", "id kantong", "jago"],
    "seabank": ["seabank", "pt bank seabank"],
    "blu": ["blu by bca", "bca digital", "blusaving"],
    "jenius": ["jenius", "bank btpn", "smbc indonesia"],
    "cimb": ["cimb niaga", "octo mobile", "octo clicks"],
    "kalsel": ["bank kalsel", "bpd kalsel", "kalsel syariah", "aksel"],
    "bsi": ["bank syariah indonesia", "bsi mobile", "byond by bsi", "bsi net", "wadiah", "bsi"],
    "bca": ["bank central asia", "bca", "klikbca", "mybca"],
    "mandiri": ["bank mandiri", "mandiri", "livin' by mandiri", "livin"],
    "bri": ["bank rakyat indonesia", "brimo", "bri"],
    "bni": ["bank negara indonesia", "bni mobile", "bni"],
    "bjb": ["bank bjb", "bjb syariah", "bjb"],
    "dki": ["bank dki", "dki syariah", "jakone"],
    "jatim": ["bank jatim", "jatim syariah", "jatim"],
    "aceh": ["bank aceh", "bank aceh syariah", "action mobile"],
    "ntb": ["bank ntb syariah", "bank ntb", "rimo"],
}

BANK_LABELS = {
    "jago": "Bank Jago (Reguler & Syariah)",
    "seabank": "SeaBank Indonesia",
    "blu": "blu by BCA Digital",
    "jenius": "Jenius (Bank BTPN / SMBC)",
    "cimb": "CIMB Niaga (OCTO)",
    "kalsel": "Bank Kalsel (Konvensional & Syariah)",
    "bsi": "Bank Syariah Indonesia (BSI)",
    "bca": "Bank Central Asia (BCA)",
    "mandiri": "Bank Mandiri",
    "bri": "Bank Rakyat Indonesia (BRI)",
    "bni": "Bank Negara Indonesia (BNI)",
    "bjb": "Bank BJB (Konvensional & Syariah)",
    "dki": "Bank DKI (Konvensional & Syariah)",
    "jatim": "Bank Jatim (Konvensional & Syariah)",
    "aceh": "Bank Aceh Syariah",
    "ntb": "Bank NTB Syariah",
    "universal": "Universal Smart Parser",
}


def detect_bank_type(text_sample: str) -> str:
    """Mendeteksi jenis bank berdasarkan kata kunci pada halaman awal dokumen."""
    lower_text = text_sample.lower()
    for bank_code, keywords in BANK_KEYWORDS.items():
        if any(kw in lower_text for kw in keywords):
            return bank_code
    return "universal"


def parse_idr_amount(raw_str: Any) -> float:
    """Konversi teks nominal rupiah ke angka desimal (float), mempertahankan tanda +/- atau DB/CR."""
    if raw_str is None:
        return 0.0
    raw_text = str(raw_str).strip()
    if not raw_text:
        return 0.0
    first_line = raw_text.split("\n")[0].strip()
    upper_line = first_line.upper()
    is_neg = first_line.startswith("-") or (first_line.startswith("(") and first_line.endswith(")"))
    if any(UpperTag in upper_line for UpperTag in (" DB", "\tDB", " DEBIT", " DEBET")):
        is_neg = True

    s = re.sub(r"[^\d,\.\-]", "", first_line).strip()
    if not s or s in ("-", "--", "."):
        return 0.0

    s_unsigned = s.lstrip("+-")
    if "," in s_unsigned and "." in s_unsigned:
        if s_unsigned.rfind(",") > s_unsigned.rfind("."):
            s_unsigned = s_unsigned.replace(".", "").replace(",", ".")
        else:
            s_unsigned = s_unsigned.replace(",", "")
    elif "," in s_unsigned:
        parts = s_unsigned.split(",")
        s_unsigned = s_unsigned.replace(",", ".") if len(parts[-1]) <= 2 else s_unsigned.replace(",", "")
    elif "." in s_unsigned:
        parts = s_unsigned.split(".")
        if len(parts) > 2 or (len(parts) == 2 and len(parts[1]) == 3):
            s_unsigned = s_unsigned.replace(".", "")
    try:
        val = float(s_unsigned)
        return -abs(val) if is_neg else abs(val)
    except (ValueError, TypeError):
        return 0.0


def is_date_string(val: str) -> bool:
    """Mengecek apakah suatu teks diawali dengan tanggal transaksi yang sah (bukan jam saja)."""
    if not val or len(val.strip()) < 4:
        return False
    first_line = val.strip().split("\n")[0].strip()
    # Tolak jika hanya berupa jam seperti 09.40 atau 12:30
    if re.fullmatch(r"\d{2}[.:]\d{2}([.:]\d{2})?", first_line):
        return False
    patterns = [
        r"^\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?(\s+\d{2}[.:]\d{2}([.:]\d{2})?)?$",
        r"^\d{4}[\/\-]\d{2}[\/\-]\d{2}(\s+\d{2}[.:]\d{2}([.:]\d{2})?)?$",
        r"^\d{1,2}\s+[A-Za-z]{3,9}(\s+\d{2,4})?(\s+\d{2}[.:]\d{2}([.:]\d{2})?)?$",
        r"^PEND$",
    ]
    return any(re.match(p, first_line, re.IGNORECASE) for p in patterns)


def find_column_indices(header_row: List[str]) -> Dict[str, int]:
    """Menemukan posisi index kolom berdasarkan teks header tabel lintas bank."""
    indices = {"date": -1, "desc": -1, "debit": -1, "credit": -1, "balance": -1, "ref": -1, "flag": -1, "mutasi": -1, "note": -1}
    for idx, cell in enumerate(header_row):
        txt = (cell or "").lower().replace("\n", " ").strip()
        if not txt:
            continue
        # Abaikan tabel ringkasan saldo (misal 'Rincian Saldo Personal' / 'Saldo sebelumnya')
        if "saldo sebelumnya" in txt or "rincian saldo" in txt:
            return {"date": -1, "desc": -1, "debit": -1, "credit": -1, "balance": -1, "ref": -1, "flag": -1, "mutasi": -1, "note": -1}
        if any(k in txt for k in ["tgl", "tanggal", "date", "waktu"]) and indices["date"] == -1:
            indices["date"] = idx
        elif any(k in txt for k in ["sumber/tujuan", "sumber", "tujuan", "kd", "reff", "ref", "sandi", "bukti", "no trn", "cbg"]) and indices["ref"] == -1:
            indices["ref"] = idx
        elif any(k in txt for k in ["rincian transaksi", "keterangan", "uraian", "deskripsi", "transaksi", "narration"]) and indices["desc"] == -1:
            indices["desc"] = idx
        elif "catatan" in txt and indices["note"] == -1:
            indices["note"] = idx
        elif any(k in txt for k in ["debet", "debit", "tarik", "keluar"]) and indices["debit"] == -1:
            indices["debit"] = idx
        elif any(k in txt for k in ["kredit", "credit", "masuk", "setoran"]) and indices["credit"] == -1:
            indices["credit"] = idx
        elif any(k in txt for k in ["saldo", "balance", "sisa", "baki"]) and indices["balance"] == -1:
            indices["balance"] = idx
        elif any(k in txt for k in ["d/k", "cr/db", "c/d"]) and indices["flag"] == -1:
            indices["flag"] = idx
        elif any(k in txt for k in ["mutasi", "jumlah", "nominal", "amount"]) and indices["mutasi"] == -1:
            indices["mutasi"] = idx
    return indices


def _extract_row_data(row: List[str], idx_map: Dict[str, int], bank_code: str) -> Optional[Dict[str, Any]]:
    """Mengekstrak 1 baris transaksi menjadi dictionary standar dengan pemisahan otomatis Debet & Kredit."""
    date_val = str(row[idx_map["date"]]).strip() if idx_map["date"] != -1 and idx_map["date"] < len(row) and row[idx_map["date"]] else ""
    if not is_date_string(date_val):
        return None

    desc_val = str(row[idx_map["desc"]]).strip() if idx_map["desc"] != -1 and idx_map["desc"] < len(row) and row[idx_map["desc"]] else ""
    note_idx = idx_map.get("note", -1)
    if note_idx != -1 and note_idx < len(row) and row[note_idx]:
        note_str = str(row[note_idx]).strip()
        if note_str:
            desc_val = f"{desc_val} ({note_str})" if desc_val else note_str

    ref_val = str(row[idx_map["ref"]]).strip() if idx_map["ref"] != -1 and idx_map["ref"] < len(row) and row[idx_map["ref"]] else "-"
    balance_raw = row[idx_map["balance"]] if idx_map["balance"] != -1 and idx_map["balance"] < len(row) else ""
    balance_val = abs(parse_idr_amount(balance_raw))

    debit_val = 0.0
    credit_val = 0.0

    # Model B1: Single column mutasi + kolom flag terpisah (seperti BSI, BNI)
    if idx_map["flag"] != -1 and idx_map["flag"] < len(row) and str(row[idx_map["flag"]]).strip():
        flag_val = str(row[idx_map["flag"]]).upper().strip()
        raw_amount = abs(parse_idr_amount(row[idx_map["mutasi"]])) if idx_map["mutasi"] != -1 and idx_map["mutasi"] < len(row) else 0.0
        if raw_amount == 0.0 and idx_map["debit"] != -1 and idx_map["debit"] < len(row):
            raw_amount = abs(parse_idr_amount(row[idx_map["debit"]]))
        if flag_val in ("D", "DB", "DEBET", "DEBIT", "-"):
            debit_val = raw_amount
        else:
            credit_val = raw_amount
    # Model B2: Single column mutasi/jumlah bertanda +/- atau DB/CR (seperti Bank Jago, BCA, SeaBank, Blu, Jenius)
    elif idx_map["mutasi"] != -1 and idx_map["mutasi"] < len(row) and str(row[idx_map["mutasi"]]).strip():
        signed_amt = parse_idr_amount(row[idx_map["mutasi"]])
        if signed_amt < 0:
            debit_val = abs(signed_amt)
        elif signed_amt > 0:
            credit_val = signed_amt
    # Model A: Dual Column terpisah (Debet & Kredit masing-masing kolom, seperti Mandiri, BRI, Bank Kalsel, BJB)
    else:
        if idx_map["debit"] != -1 and idx_map["debit"] < len(row):
            debit_val = abs(parse_idr_amount(row[idx_map["debit"]]))
        if idx_map["credit"] != -1 and idx_map["credit"] < len(row):
            credit_val = abs(parse_idr_amount(row[idx_map["credit"]]))

    if debit_val == 0.0 and credit_val == 0.0 and balance_val == 0.0:
        return None

    return {
        "date": date_val.replace("\n", " ").strip(),
        "ref": ref_val.replace("\n", " | ").strip() or "-",
        "desc": desc_val.replace("\n", " | ").strip(),
        "debit": debit_val,
        "credit": credit_val,
        "balance": balance_val,
    }


def _extract_spatial_bank_transactions(pdf_bytes: bytes, target_bank: str) -> List[Dict[str, Any]]:
    """Ekstraksi presisi berbasis Spatial Grid PyMuPDF & konsolidasi multi-baris untuk e-Statement modern (Jago, BCA, Mandiri, dll.)."""
    txs: List[Dict[str, Any]] = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        prev_bands = []
        active_idx_map = None
        for page in doc:
            page_h = page.rect.height
            page_w = page.rect.width
            # 1. Deteksi pita kolom dari FillRect / StrokedRect header tabel
            rect_rows = []
            for dw in page.get_drawings():
                r = dw.get("rect")
                if not r or r.is_empty or r.y1 <= 50.0 or r.y0 >= page_h - 42.0:
                    continue
                if 12.0 <= r.height <= 45.0 and r.width >= 28.0 and (dw.get("fill") or dw.get("color")):
                    placed = False
                    for rr in rect_rows:
                        if abs(rr["y0"] - r.y0) <= 3.0 and abs(rr["y1"] - r.y1) <= 3.0:
                            rr["rects"].append(fitz.Rect(r))
                            placed = True
                            break
                    if not placed:
                        rect_rows.append({"y0": r.y0, "y1": r.y1, "rects": [fitz.Rect(r)]})

            multi_rr = [rr for rr in rect_rows if len(rr["rects"]) >= 3]
            bands = []
            if multi_rr:
                best_rr = max(multi_rr, key=lambda rr: len(rr["rects"]))
                for sr in sorted(best_rr["rects"], key=lambda r: r.x0):
                    if not bands or abs(sr.x0 - bands[-1]["min_x"]) > 8.0:
                        bands.append({"min_x": sr.x0, "max_x": sr.x1, "center": (sr.x0 + sr.x1) / 2.0})
            if len(bands) < 3 and len(prev_bands) >= 3:
                bands = prev_bands
            if len(bands) < 3:
                continue
            prev_bands = bands
            num_cols = len(bands)

            # 2. Kumpulkan dan kelompokkan teks ke dalam baris visual
            spans = []
            for blk in page.get_text("dict").get("blocks", []):
                if blk.get("type") == 0:
                    for ln in blk.get("lines", []):
                        for sp in ln.get("spans", []):
                            txt = re.sub(r"[\uf000-\uf8ff\ufffd]", "•", sp.get("text", "")).strip()
                            if not txt:
                                continue
                            bb = fitz.Rect(sp.get("bbox"))
                            if (bb.y0 < 52.0 and bb.x0 > page_w * 0.35) or bb.y0 > page_h - 45.0:
                                continue
                            spans.append({"text": txt, "x0": bb.x0, "x1": bb.x1, "y0": bb.y0, "y1": bb.y1})
            spans.sort(key=lambda s: (s["y0"], s["x0"]))

            v_lines = []
            for sp in spans:
                mid_y = (sp["y0"] + sp["y1"]) / 2.0
                placed = False
                for vl in v_lines:
                    if abs(mid_y - vl["mid_y"]) <= 3.8:
                        vl["spans"].append(sp)
                        vl["mid_y"] = sum((x["y0"] + x["y1"]) / 2.0 for x in vl["spans"]) / len(vl["spans"])
                        vl["min_y"] = min(vl["min_y"], sp["y0"])
                        vl["max_y"] = max(vl["max_y"], sp["y1"])
                        placed = True
                        break
                if not placed:
                    v_lines.append({"mid_y": mid_y, "min_y": sp["y0"], "max_y": sp["y1"], "spans": [sp]})
            v_lines.sort(key=lambda l: l["min_y"])

            def map_col(sp_item):
                mx = (sp_item["x0"] + sp_item["x1"]) / 2.0
                if sp_item["x0"] < bands[0]["max_x"] - 10.0:
                    return 0
                for idx_b, b in enumerate(bands):
                    if b["min_x"] - 2.5 <= mx <= b["max_x"] + 2.5:
                        return idx_b
                return min(range(num_cols), key=lambda i: abs(mx - bands[i]["center"]))

            # 3. Petakan setiap baris visual ke array kolom dan konsolidasikan sub-baris
            mapped_rows = []
            for vl in v_lines:
                row_arr = [""] * num_cols
                for sp in sorted(vl["spans"], key=lambda s: s["x0"]):
                    c_i = map_col(sp)
                    row_arr[c_i] = (row_arr[c_i] + " " + sp["text"]).strip() if row_arr[c_i] else sp["text"]
                mapped_rows.append({"min_y": vl["min_y"], "max_y": vl["max_y"], "cells": row_arr})

            i = 0
            while i < len(mapped_rows):
                cur_cells = list(mapped_rows[i]["cells"])
                pot_map = find_column_indices(cur_cells)
                if pot_map["date"] != -1 and (pot_map["mutasi"] != -1 or pot_map["debit"] != -1 or pot_map["balance"] != -1):
                    active_idx_map = pot_map
                    i += 1
                    continue

                if active_idx_map and is_date_string(cur_cells[active_idx_map["date"]]):
                    has_amt = any(
                        active_idx_map[k] != -1 and cur_cells[active_idx_map[k]].strip()
                        for k in ("mutasi", "debit", "credit", "balance")
                    )
                    if has_amt:
                        cur_max_y = mapped_rows[i]["max_y"]
                        nxt = i + 1
                        while nxt < len(mapped_rows):
                            nxt_row = mapped_rows[nxt]
                            if nxt_row["min_y"] - cur_max_y > 14.0:
                                break
                            nxt_cells = nxt_row["cells"]
                            if is_date_string(nxt_cells[active_idx_map["date"]]):
                                break
                            if any(active_idx_map[k] != -1 and nxt_cells[active_idx_map[k]].strip() for k in ("mutasi", "debit", "credit", "balance")):
                                break
                            col0_txt = nxt_cells[active_idx_map["date"]].strip()
                            if col0_txt and not re.fullmatch(r"\d{2}[.:]\d{2}([.:]\d{2})?(\s*(WIB|WITA|WIT))?", col0_txt, re.IGNORECASE):
                                break
                            for c_idx in range(num_cols):
                                if nxt_cells[c_idx]:
                                    cur_cells[c_idx] = (cur_cells[c_idx] + "\n" + nxt_cells[c_idx]).strip() if cur_cells[c_idx] else nxt_cells[c_idx]
                            cur_max_y = max(cur_max_y, nxt_row["max_y"])
                            nxt += 1
                        tx_item = _extract_row_data(cur_cells, active_idx_map, target_bank)
                        if tx_item:
                            txs.append(tx_item)
                        i = nxt
                        continue
                i += 1
    finally:
        doc.close()
    return txs


def extract_bank_transactions(pdf_bytes: bytes, target_bank: str) -> List[Dict[str, Any]]:
    """Mengekstrak seluruh transaksi dari dokumen PDF rekening koran."""
    # Prioritas 1: Mesin Spatial Grid PyMuPDF (mendukung penuh Bank Jago, BCA, Mandiri, BRI, BNI, BSI, BPD)
    try:
        spatial_txs = _extract_spatial_bank_transactions(pdf_bytes, target_bank)
        if spatial_txs and any(t["debit"] > 0 or t["credit"] > 0 for t in spatial_txs):
            return spatial_txs
    except Exception as sp_err:
        logging.warning(f"Spatial bank parser fallback: {sp_err}")

    transactions: List[Dict[str, Any]] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        idx_map = {"date": 0, "ref": 1, "desc": 2, "debit": 3, "credit": 4, "balance": 5, "flag": -1, "mutasi": -1, "note": -1}
        detected_map = False

        for page in pdf.pages:
            tables = page.extract_tables() or []
            if not tables:
                settings = {"vertical_strategy": "text", "horizontal_strategy": "text"}
                single_table = page.extract_table(settings)
                if single_table:
                    tables = [single_table]

            for table in tables:
                for row in table:
                    clean_row = [str(c or "").strip() for c in row if c is not None]
                    if not clean_row or len(clean_row) < 3:
                        continue

                    if not detected_map:
                        potential_map = find_column_indices(clean_row)
                        if potential_map["date"] != -1 and (potential_map["debit"] != -1 or potential_map["balance"] != -1 or potential_map["mutasi"] != -1):
                            idx_map = potential_map
                            detected_map = True
                            continue

                    tx_data = _extract_row_data(clean_row, idx_map, target_bank)
                    if tx_data:
                        transactions.append(tx_data)

    # Fallback heuristik baris-per-baris jika tabel tidak bergaris / pdfplumber table kosong
    if not transactions:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                txt = page.extract_text() or ""
                txs = _extract_from_text_lines(txt, target_bank)
                transactions.extend(txs)

    return transactions


def _extract_from_text_lines(text: str, target_bank: str) -> List[Dict[str, Any]]:
    """Ekstraksi cadangan baris-per-baris jika tabel tidak memiliki garis pembatas fisik."""
    txs: List[Dict[str, Any]] = []
    lines = text.split("\n")
    for line in lines:
        l = line.strip()
        m_date = re.match(r"^(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)\s+(.*)", l)
        if not m_date:
            continue
        date_str = m_date.group(1)
        body = m_date.group(2).strip()
        tokens = body.split()
        if len(tokens) < 2:
            continue

        num_tokens = []
        i = len(tokens) - 1
        while i >= 0 and len(num_tokens) < 3:
            tok = tokens[i]
            clean = re.sub(r"[^\d,\.\-]", "", tok).strip()
            if clean and re.search(r"\d", clean) and ("," in clean or "." in clean or clean.isdigit()):
                num_tokens.insert(0, tok)
                i -= 1
            else:
                break

        if not num_tokens:
            continue

        desc_tokens = tokens[:i + 1]
        ref = "-"
        if desc_tokens and len(desc_tokens[0]) <= 8 and (desc_tokens[0].isdigit() or desc_tokens[0].isupper()):
            ref = desc_tokens[0]
            desc = " ".join(desc_tokens[1:])
        else:
            desc = " ".join(desc_tokens)

        balance_val = parse_idr_amount(num_tokens[-1])
        debit_val = 0.0
        credit_val = 0.0

        if len(num_tokens) >= 3:
            debit_val = parse_idr_amount(num_tokens[0])
            credit_val = parse_idr_amount(num_tokens[1])
        elif len(num_tokens) == 2:
            amt = parse_idr_amount(num_tokens[0])
            if any(f in body.upper() for f in (" DB", " D ", " DEBET", "-")):
                debit_val = amt
            else:
                credit_val = amt

        txs.append({
            "date": date_str,
            "ref": ref,
            "desc": desc,
            "debit": debit_val,
            "credit": credit_val,
            "balance": balance_val,
        })
    return txs


def build_excel_report(rows: List[Dict[str, Any]], bank_name: str) -> bytes:
    """Menyusun dokumen Excel (.xlsx) dengan tata letak profesional dan rumus otomatis."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Rekening Koran"
    ws.views.sheetView[0].showGridLines = True

    # Header Judul
    ws.merge_cells("A1:G1")
    title_cell = ws["A1"]
    title_cell.value = f"REKAPITULASI MUTASI REKENING KORAN — {bank_name.upper()}"
    title_cell.font = Font(name="Calibri", size=13, bold=True, color="1E3A8A")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    # Header Kolom
    headers = ["No", "Tanggal", "No Referensi", "Uraian / Keterangan Transaksi", "Debet (Keluar)", "Kredit (Masuk)", "Saldo Akhir"]
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    border_thin = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1")
    )

    ws.append(headers)
    ws.row_dimensions[2].height = 24
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=2, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    # Isi Data Baris
    zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    start_row = 3
    for idx, tx in enumerate(rows, start=1):
        r_num = start_row + idx - 1
        ws.append([
            idx,
            tx["date"],
            tx["ref"],
            tx["desc"],
            tx["debit"],
            tx["credit"],
            tx["balance"],
        ])
        ws.row_dimensions[r_num].height = 20

        # Penataan gaya sel
        ws.cell(row=r_num, column=1).alignment = Alignment(horizontal="center")
        ws.cell(row=r_num, column=2).alignment = Alignment(horizontal="center")
        ws.cell(row=r_num, column=3).alignment = Alignment(horizontal="center")
        ws.cell(row=r_num, column=4).alignment = Alignment(horizontal="left", wrap_text=True)

        for c_idx in (5, 6, 7):
            num_cell = ws.cell(row=r_num, column=c_idx)
            num_cell.number_format = "#,##0.00"
            num_cell.alignment = Alignment(horizontal="right")

        if idx % 2 == 0:
            for c_idx in range(1, 8):
                ws.cell(row=r_num, column=c_idx).fill = zebra_fill
        for c_idx in range(1, 8):
            ws.cell(row=r_num, column=c_idx).border = border_thin

    # Baris Total Akumulasi
    tot_row = start_row + len(rows)
    ws.cell(row=tot_row, column=4, value="TOTAL AKUMULASI:").font = Font(bold=True)
    ws.cell(row=tot_row, column=4).alignment = Alignment(horizontal="right")
    ws.cell(row=tot_row, column=5, value=f"=SUM(E{start_row}:E{tot_row-1})").number_format = "#,##0.00"
    ws.cell(row=tot_row, column=5).font = Font(bold=True, color="DC2626")
    ws.cell(row=tot_row, column=6, value=f"=SUM(F{start_row}:F{tot_row-1})").number_format = "#,##0.00"
    ws.cell(row=tot_row, column=6).font = Font(bold=True, color="16A34A")
    for c_idx in range(1, 8):
        ws.cell(row=tot_row, column=c_idx).border = border_thin

    # Lebar kolom otomatis
    col_widths = [6, 14, 18, 45, 18, 18, 20]
    for i, w in enumerate(col_widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.freeze_panes = "A3"
    out_buf = io.BytesIO()
    wb.save(out_buf)
    return out_buf.getvalue()


def build_csv_report(rows: List[Dict[str, Any]]) -> bytes:
    """Menyusun dokumen teks format CSV."""
    out_str = io.StringIO()
    writer = csv.writer(out_str, delimiter=",")
    writer.writerow(["No", "Tanggal", "No Referensi", "Keterangan", "Debet", "Kredit", "Saldo"])
    for idx, tx in enumerate(rows, start=1):
        writer.writerow([idx, tx["date"], tx["ref"], tx["desc"], tx["debit"], tx["credit"], tx["balance"]])
    return out_str.getvalue().encode("utf-8")


@router.post("/parse-bank-statement")
def parse_bank_statement(
    file: UploadFile = File(...),
    bank_type: str = Form("auto"),
    output_format: str = Form("xlsx"),
):
    """
    Ekstraksi data mutasi rekening koran PDF bank lokal/syariah menjadi file Excel (.xlsx) atau CSV.
    """
    filename = file.filename or "rekening_koran.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Berkas '{filename}' bukan format PDF yang sah.")

    content = file.file.read()
    validate_pdf_bytes(content, filename)
    if len(content) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Berkas melebihi batas {max_mb} MB.")

    # Deteksi jenis bank
    target_bank = (bank_type or "auto").lower().strip()
    if target_bank == "auto":
        sample_text = ""
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                if len(pdf.pages) > 0:
                    sample_text = pdf.pages[0].extract_text() or ""
        except Exception as e:
            logging.warning(f"Gagal membaca teks awal PDF: {e}")
        target_bank = detect_bank_type(sample_text)

    bank_display_name = BANK_LABELS.get(target_bank, "Universal Bank")

    try:
        transactions = extract_bank_transactions(content, target_bank)
    except Exception as err:
        logging.error(f"Gagal mengekstrak transaksi rekening koran: {err}")
        raise HTTPException(status_code=500, detail=f"Gagal mengekstrak struktur tabel rekening koran: {str(err)}")

    if not transactions:
        raise HTTPException(
            status_code=422,
            detail=(
                "Tidak ditemukan baris transaksi yang valid dalam berkas PDF ini. "
                "Pastikan berkas adalah rekening koran resmi yang memuat kolom tanggal dan mutasi, "
                "bukan hasil scan foto tanpa OCR."
            )
        )

    safe_base = get_safe_base_name(filename)
    total_debit = sum(tx["debit"] for tx in transactions)
    total_credit = sum(tx["credit"] for tx in transactions)

    extra_headers = {
        "X-Bank-Detected": bank_display_name,
        "X-Rows-Count": str(len(transactions)),
        "X-Total-Debit": f"{total_debit:.2f}",
        "X-Total-Credit": f"{total_credit:.2f}",
        "Access-Control-Expose-Headers": "Content-Disposition, X-Bank-Detected, X-Rows-Count, X-Total-Debit, X-Total-Credit",
    }

    if output_format.lower() == "csv":
        csv_bytes = build_csv_report(transactions)
        out_name = f"rekening_koran_{safe_base}.csv"
        return create_file_response(csv_bytes, out_name, mime_type="text/csv", extra_headers=extra_headers)

    xlsx_bytes = build_excel_report(transactions, bank_display_name)
    out_name = f"rekening_koran_{safe_base}.xlsx"
    mime_xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return create_file_response(xlsx_bytes, out_name, mime_type=mime_xlsx, extra_headers=extra_headers)
