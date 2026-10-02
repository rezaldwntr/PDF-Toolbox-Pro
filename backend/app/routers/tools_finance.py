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

router = APIRouter(tags=["Tools - Finance"])

BANK_KEYWORDS = {
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
    """Konversi teks nominal rupiah ke angka desimal (float)."""
    if raw_str is None:
        return 0.0
    s = re.sub(r"[^\d,\.\-]", "", str(raw_str)).strip()
    if not s or s in ("-", "--"):
        return 0.0

    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        parts = s.split(",")
        s = s.replace(",", ".") if len(parts[-1]) == 2 else s.replace(",", "")
    elif "." in s:
        parts = s.split(".")
        if len(parts) > 2 or (len(parts) == 2 and len(parts[1]) == 3):
            s = s.replace(".", "")
    try:
        return float(s)
    except (ValueError, TypeError):
        return 0.0


def is_date_string(val: str) -> bool:
    """Mengecek apakah suatu teks adalah tanggal transaksi."""
    if not val or len(val.strip()) < 5:
        return False
    clean = val.strip()
    patterns = [
        r"^\d{1,2}[\/\-\.]\d{1,2}([\/\-\.]\d{2,4})?$",
        r"^\d{1,2}\s+[A-Za-z]{3,9}(\s+\d{2,4})?$",
    ]
    return any(re.match(p, clean) for p in patterns)


def find_column_indices(header_row: List[str]) -> Dict[str, int]:
    """Menemukan posisi index kolom berdasarkan teks header tabel."""
    indices = {"date": -1, "desc": -1, "debit": -1, "credit": -1, "balance": -1, "ref": -1, "flag": -1, "mutasi": -1}
    for idx, cell in enumerate(header_row):
        txt = (cell or "").lower().strip()
        if not txt:
            continue
        if any(k in txt for k in ["tgl", "tanggal", "date"]) and indices["date"] == -1:
            indices["date"] = idx
        elif any(k in txt for k in ["kd", "reff", "ref", "sandi", "bukti", "no trn"]) and indices["ref"] == -1:
            indices["ref"] = idx
        elif any(k in txt for k in ["keterangan", "uraian", "deskripsi", "transaksi", "narration"]) and indices["desc"] == -1:
            indices["desc"] = idx
        elif any(k in txt for k in ["debet", "debit", "tarik", "keluar"]) and indices["debit"] == -1:
            indices["debit"] = idx
        elif any(k in txt for k in ["kredit", "credit", "masuk", "setoran"]) and indices["credit"] == -1:
            indices["credit"] = idx
        elif any(k in txt for k in ["saldo", "balance", "sisa", "baki"]) and indices["balance"] == -1:
            indices["balance"] = idx
        elif any(k in txt for k in ["d/k", "cr/db", "c/d"]) and indices["flag"] == -1:
            indices["flag"] = idx
        elif "mutasi" in txt and indices["mutasi"] == -1:
            indices["mutasi"] = idx
    return indices


def _extract_row_data(row: List[str], idx_map: Dict[str, int], bank_code: str) -> Optional[Dict[str, Any]]:
    """Mengekstrak 1 baris transaksi menjadi dictionary standar."""
    date_val = str(row[idx_map["date"]]).strip() if idx_map["date"] != -1 and idx_map["date"] < len(row) and row[idx_map["date"]] else ""
    if not is_date_string(date_val):
        return None

    desc_val = str(row[idx_map["desc"]]).strip() if idx_map["desc"] != -1 and idx_map["desc"] < len(row) and row[idx_map["desc"]] else ""
    ref_val = str(row[idx_map["ref"]]).strip() if idx_map["ref"] != -1 and idx_map["ref"] < len(row) and row[idx_map["ref"]] else "-"
    balance_val = parse_idr_amount(row[idx_map["balance"]]) if idx_map["balance"] != -1 and idx_map["balance"] < len(row) else 0.0

    debit_val = 0.0
    credit_val = 0.0

    # Model B (Single column mutasi + flag seperti BSI, BCA, BNI)
    if idx_map["flag"] != -1 and idx_map["flag"] < len(row):
        flag_val = str(row[idx_map["flag"]]).upper().strip()
        raw_amount = parse_idr_amount(row[idx_map["mutasi"]]) if idx_map["mutasi"] != -1 and idx_map["mutasi"] < len(row) else 0.0
        if raw_amount == 0.0 and idx_map["debit"] != -1 and idx_map["debit"] < len(row):
            raw_amount = parse_idr_amount(row[idx_map["debit"]])
        if flag_val in ("D", "DB", "DEBET", "DEBIT", "-"):
            debit_val = raw_amount
        else:
            credit_val = raw_amount
    else:
        # Model A (Dual Column terpisah seperti Mandiri, BRI, Bank Kalsel, BJB)
        if idx_map["debit"] != -1 and idx_map["debit"] < len(row):
            debit_val = parse_idr_amount(row[idx_map["debit"]])
        if idx_map["credit"] != -1 and idx_map["credit"] < len(row):
            credit_val = parse_idr_amount(row[idx_map["credit"]])

    return {
        "date": date_val,
        "ref": ref_val,
        "desc": desc_val.replace("\n", " ").strip(),
        "debit": debit_val,
        "credit": credit_val,
        "balance": balance_val,
    }


def extract_bank_transactions(pdf_bytes: bytes, target_bank: str) -> List[Dict[str, Any]]:
    """Mengekstrak seluruh transaksi dari dokumen PDF rekening koran."""
    transactions: List[Dict[str, Any]] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        idx_map = {"date": 0, "ref": 1, "desc": 2, "debit": 3, "credit": 4, "balance": 5, "flag": -1, "mutasi": -1}
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

                    # Deteksi header tabel untuk penyesuaian index kolom
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
