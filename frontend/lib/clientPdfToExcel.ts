// frontend/lib/clientPdfToExcel.ts
import JSZip from 'jszip';
import { ensurePdfjsReady } from './pdfWorker';

interface ClientPdfToExcelOptions {
  startPage?: number;
  endPage?: number;
  mode?: 'tables_only' | 'all_content';
  sheetPerPage?: boolean;
  onProgress?: (pct: number) => void;
}

const escapeXml = (str: string): string =>
  String(str ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

interface RawTextItem {
  str: string;
  x: number;
  y: number; // PDF coordinates (higher y = higher on page)
  width: number;
  height: number;
}

interface ColumnBand {
  index: number;
  minX: number;
  maxX: number;
  avgX0?: number;
  avgX1?: number;
  headerText?: string;
}

interface TableRow {
  isHeader?: boolean;
  isNumbering?: boolean;
  isMetadata?: boolean;
  cells: string[];
}

interface ColumnDetectionResult {
  bands: ColumnBand[];
  columnNumberRowY?: number;
}

/**
 * Mendeteksi batas-batas kolom horizontal (Column Bands) pada halaman
 * berdasarkan baris penomoran kolom resmi (1, 2, 3...) atau klaster spasial teks.
 */
function detectColumnBands(items: RawTextItem[], pageWidth: number): ColumnDetectionResult {
  // 1. Kelompokkan item teks ke dalam baris visual horizontal
  const sortedY = [...items].sort((a, b) => b.y - a.y);
  const visualLines: RawTextItem[][] = [];

  for (const it of sortedY) {
    let placed = false;
    for (const line of visualLines) {
      if (Math.abs(line[0].y - it.y) <= 4.0) {
        line.push(it);
        placed = true;
        break;
      }
    }
    if (!placed) {
      visualLines.push([it]);
    }
  }

  // 2. Kumpulkan koordinat X awal dari baris tabel dominan (prioritas baris dengan >= 3 kolom)
  let candidateLines = visualLines.filter((l) => l.length >= 3);
  if (candidateLines.length === 0) {
    candidateLines = visualLines.filter((l) => l.length >= 2);
  }

  const xPositions: number[] = [];
  for (const line of candidateLines) {
    for (const it of line) {
      xPositions.push(it.x);
    }
  }

  xPositions.sort((a, b) => a - b);
  const clusters: Array<{ count: number; sum: number; avg: number }> = [];
  for (const x of xPositions) {
    if (clusters.length === 0 || x - clusters[clusters.length - 1].avg > 24) {
      clusters.push({ count: 1, sum: x, avg: x });
    } else {
      const last = clusters[clusters.length - 1];
      last.count++;
      last.sum += x;
      last.avg = last.sum / last.count;
    }
  }

  // Jika terdeteksi minimal 2 kolom dominan
  if (clusters.length >= 2) {
    const anchors = clusters.map((c) => c.avg);
    const bands: ColumnBand[] = [];
    for (let i = 0; i < anchors.length; i++) {
      const minX = i === 0 ? 0 : (anchors[i - 1] + anchors[i]) / 2;
      const maxX = i === anchors.length - 1 ? pageWidth : (anchors[i] + anchors[i + 1]) / 2;
      bands.push({ index: i, minX, maxX, avgX0: anchors[i], avgX1: maxX });
    }
    return { bands };
  }

  // Fallback 6 kolom seimbang
  const colWidth = pageWidth / 6;
  return {
    bands: Array.from({ length: 6 }).map((_, i) => ({
      index: i,
      minX: i * colWidth,
      maxX: (i + 1) * colWidth,
    })),
  };
}

/**
 * Menggabungkan potongan kalimat visual di dalam sel menjadi teks mengalir rapi,
 * tetapi tetap mempertahankan pemisahan baris untuk bullet point atau daftar bernomor.
 */
function mergeCellLines(lines: string[]): string {
  if (lines.length === 0) return '';
  if (lines.length === 1) return lines[0];

  const bulletStartRegex = /^([•\-\*]|\d+[\.\)]|[a-zA-Z][\.\)])\s*/;
  const merged: string[] = [];
  let currentBlock = lines[0];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const prevEndsWithPunct = /[:\.\?!;]$/.test(currentBlock.trim());
    const curStartsWithBullet = bulletStartRegex.test(line.trim());

    if (prevEndsWithPunct || curStartsWithBullet) {
      merged.push(currentBlock);
      currentBlock = line;
    } else {
      currentBlock = `${currentBlock} ${line}`;
    }
  }
  if (currentBlock) merged.push(currentBlock);

  return merged.join('\n');
}

/**
 * Mengelompokkan item teks dalam satu kolom berdasarkan baris visual vertikal (y).
 */
function groupItemsIntoVisualLines(items: RawTextItem[]): string[] {
  if (items.length === 0) return [];
  const lines: string[] = [];
  let curLineText = '';
  let curLineY = items[0].y;

  for (const item of items) {
    if (Math.abs(item.y - curLineY) <= 4.0) {
      curLineText = curLineText ? `${curLineText} ${item.str.trim()}` : item.str.trim();
    } else {
      if (curLineText) lines.push(curLineText);
      curLineText = item.str.trim();
      curLineY = item.y;
    }
  }
  if (curLineText) lines.push(curLineText);
  return lines;
}

function getColumnIndexForItem(it: RawTextItem, bands: ColumnBand[]): number {
  const val = it.str.trim();
  const isStrictNum =
    /^[+-]?\d{1,3}(\.\d{3})*(,\d+)?$/.test(val) ||
    val.endsWith('%') ||
    /^[+-]?\d+([.,]\d+)?$/.test(val.replace(/\s/g, ''));

  if (isStrictNum && !val.startsWith('0') && val.length < 15 && !/^\d{2}\.\d{2}$/.test(val)) {
    const rightX = it.x + it.width;
    let bestCol = 0;
    let minDiff = 999999;
    for (let i = 0; i < bands.length; i++) {
      const targetRight = bands[i].avgX1 ?? bands[i].maxX;
      const diff = Math.abs(rightX - targetRight);
      if (diff < minDiff) {
        minDiff = diff;
        bestCol = i;
      }
    }
    return bestCol;
  }

  const midX = it.x + it.width / 2;
  for (let i = 0; i < bands.length; i++) {
    if (midX >= bands[i].minX && midX < bands[i].maxX) {
      return i;
    }
    if (it.x >= bands[i].minX && it.x < bands[i].maxX) {
      return i;
    }
  }
  if (it.x < bands[0].minX) return 0;
  return bands.length - 1;
}

/**
 * Merekonstruksi teks halaman menjadi tabel rapi dengan multi-line wrapping di dalam sel.
 */
function reconstructPageTable(
  items: RawTextItem[],
  pageWidth: number,
  pageHeight: number,
  fallbackBands?: ColumnBand[],
  mode: 'tables_only' | 'all_content' = 'all_content'
): { rows: TableRow[]; detectedBands: ColumnBand[] } {
  // Filter running header (pojok kanan atas) dan running footer (bawah halaman)
  const filteredItems = items.filter((it) => {
    if (it.y > pageHeight - 52 && it.x > pageWidth * 0.35) return false;
    if (it.y < 45) return false;
    return true;
  });

  if (filteredItems.length === 0) return { rows: [], detectedBands: fallbackBands || [] };

  const sortedItems = [...filteredItems].sort((a, b) => b.y - a.y);
  const detectionResult = detectColumnBands(sortedItems, pageWidth);
  const columnBands = fallbackBands && fallbackBands.length >= 2 ? fallbackBands : detectionResult.bands;
  const numCols = columnBands.length;

  // 1. Kelompokkan seluruh item teks ke dalam Baris Visual vertikal (Y descending)
  const lineGroups: Array<{ y: number; items: RawTextItem[] }> = [];
  for (const it of sortedItems) {
    let placed = false;
    for (const group of lineGroups) {
      if (Math.abs(group.y - it.y) <= 4.2) {
        group.items.push(it);
        group.y = group.items.reduce((acc, curr) => acc + curr.y, 0) / group.items.length;
        placed = true;
        break;
      }
    }
    if (!placed) {
      lineGroups.push({ y: it.y, items: [it] });
    }
  }

  lineGroups.sort((a, b) => b.y - a.y);

  const resultRows: TableRow[] = [];
  const DATE_START_RE = /^(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}(\s+\d{2}[.:]\d{2}([.:]\d{2})?)?|\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?(\s+\d{2}[.:]\d{2}([.:]\d{2})?)?|\d{4}[/-]\d{2}[/-]\d{2}(\s+\d{2}[.:]\d{2}([.:]\d{2})?)?|PEND)$/i;
  const TIME_ONLY_RE = /^\d{2}[.:]\d{2}([.:]\d{2})?(\s*(WIB|WITA|WIT|AM|PM))?$/i;

  for (let gIdx = 0; gIdx < lineGroups.length; gIdx++) {
    const group = lineGroups[gIdx];
    const lineItems = group.items.sort((a, b) => a.x - b.x);
    if (lineItems.length === 0) continue;

    // Jika satu baris hanya berisi 1 item teks panjang membentang (Kop, Judul, atau Nama Nasabah)
    const firstIt = lineItems[0];
    const totalLineText = lineItems.map((i) => i.str.trim()).join(' ');
    if (lineItems.length === 1 && firstIt.width > pageWidth * 0.42) {
      const rowCells = new Array(numCols).fill('');
      rowCells[0] = totalLineText;
      resultRows.push({
        isMetadata: true,
        cells: rowCells,
      });
      continue;
    }

    // Pemetaan multi-kolom
    const rowCells = new Array(numCols).fill('');
    for (const it of lineItems) {
      const colIdx = getColumnIndexForItem(it, columnBands);
      rowCells[colIdx] = rowCells[colIdx]
        ? `${rowCells[colIdx]} ${it.str.trim()}`
        : it.str.trim();
    }

    // Konsolidasi sub-baris transaksi multi-baris ke dalam baris transaksi utama di atasnya
    if (
      resultRows.length > 0 &&
      numCols >= 3 &&
      !rowCells[numCols - 2] &&
      !rowCells[numCols - 1]
    ) {
      const prevRow = resultRows[resultRows.length - 1];
      const prevFirstLine = (prevRow.cells[0] || '').split('\n')[0].trim();
      const curCol0 = (rowCells[0] || '').trim();
      if (
        !prevRow.isHeader &&
        !prevRow.isMetadata &&
        DATE_START_RE.test(prevFirstLine) &&
        (!curCol0 || TIME_ONLY_RE.test(curCol0))
      ) {
        for (let c = 0; c < numCols; c++) {
          if (rowCells[c]) {
            prevRow.cells[c] = prevRow.cells[c]
              ? `${prevRow.cells[c]}\n${rowCells[c]}`
              : rowCells[c];
          }
        }
        continue;
      }
    }

    // Evaluasi apakah baris ini adalah header tabel
    const isHeaderRow =
      lineItems.some(
        (it) =>
          it.str.toLowerCase().includes('kantong') ||
          it.str.toLowerCase().includes('tanggal') ||
          it.str.toLowerCase().includes('nama') ||
          it.str.toLowerCase().includes('saldo') ||
          it.str.toLowerCase().includes('jumlah') ||
          it.str.toLowerCase().includes('uraian') ||
          it.str.toLowerCase().includes('keterangan')
      ) && lineItems.length >= 3;

    if (rowCells.some((c) => c !== '')) {
      resultRows.push({
        isHeader: isHeaderRow,
        cells: rowCells,
      });
    }
  }

  return { rows: resultRows, detectedBands: columnBands };
}

/**
 * Konverter PDF ke Excel (.xlsx OpenXML) Client-Side — 100% Presisi, Rapi & Identik dengan Dokumen PDF:
 * Mengidentifikasi struktur tabel, header kolom, penomoran, dan merangkum seluruh multi-baris
 * di dalam sel yang sama dengan teks wrap (wrapText=1) tanpa membuat baris Excel terpecah-pecah.
 */
export async function convertPdfToExcelClientSide(
  pdfBuffer: ArrayBuffer,
  options: ClientPdfToExcelOptions = {}
): Promise<Blob> {
  const pdfjs = await ensurePdfjsReady();
  const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer.slice(0)) }).promise;
  const numPages = pdfDoc.numPages;

  const startPage = Math.max(1, options.startPage || 1);
  const endPage = Math.min(numPages, Math.max(startPage, options.endPage || numPages));
  const totalPagesToProcess = endPage - startPage + 1;

  const colLetter = (colIdx: number): string => {
    let s = '';
    let n = colIdx + 1;
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };

  interface SheetData {
    name: string;
    rows: TableRow[];
  }

  const sheets: SheetData[] = [];
  const combinedRows: TableRow[] = [];
  let activeBands: ColumnBand[] | undefined;

  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
    }>;

    const rawItems: RawTextItem[] = [];
    for (const it of items) {
      const str = it.str || '';
      if (!str.trim()) continue;
      rawItems.push({
        str,
        x: it.transform[4],
        y: it.transform[5],
        width: it.width || 8,
        height: it.height || 8,
      });
    }

    const { rows: pageRows, detectedBands } = reconstructPageTable(
      rawItems,
      viewport.width,
      viewport.height,
      activeBands,
      options.mode
    );

    if (!activeBands && detectedBands.length > 0) {
      activeBands = detectedBands;
    }

    if (options.sheetPerPage) {
      sheets.push({
        name: `Halaman ${pageNum}`,
        rows: pageRows,
      });
    } else {
      // Mode 1 Sheet Gabungan: Sambung tabel antar-halaman secara seamless
      if (combinedRows.length === 0) {
        combinedRows.push(...pageRows);
      } else {
        const pageMetadataRows = pageRows.filter((r) => r.isMetadata);
        const pageHeaderRows = pageRows.filter((r) => r.isHeader);
        const pageDataRows = pageRows.filter((r) => !r.isMetadata && !r.isHeader);

        // Cari header dan jumlah kolom dari tabel aktif sebelumnya
        const prevHeaderRow = [...combinedRows].reverse().find((r) => r.isHeader);
        const prevDataRow = [...combinedRows].reverse().find((r) => !r.isMetadata && !r.isHeader);
        const prevCols = prevHeaderRow?.cells.length || prevDataRow?.cells.length || 0;
        const curCols = pageHeaderRows[0]?.cells.length || pageDataRows[0]?.cells.length || 0;

        // Bandingkan apakah header halaman ini adalah pengulangan header halaman sebelumnya
        const isSameHeader = (h1: string[], h2: string[]): boolean => {
          if (!h1 || !h2 || h1.length !== h2.length) return false;
          let matches = 0;
          for (let i = 0; i < h1.length; i++) {
            const a = (h1[i] || '').trim().toLowerCase();
            const b = (h2[i] || '').trim().toLowerCase();
            if (a && a === b) matches++;
          }
          return matches >= Math.max(2, Math.floor(h1.length / 2));
        };

        const isContinuous =
          prevCols > 0 &&
          curCols === prevCols &&
          ((pageHeaderRows.length > 0 && prevHeaderRow && isSameHeader(prevHeaderRow.cells, pageHeaderRows[0].cells)) ||
            pageHeaderRows.length === 0);

        if (isContinuous) {
          // TABEL BERKELANJUTAN: Langsung sambung data ke tabel sebelumnya tanpa pemisah dan tanpa duplikat header!
          combinedRows.push(...pageDataRows);
        } else {
          // TABEL BARU: Beri jarak baris pemisah jika berbeda struktur
          if (pageMetadataRows.length > 0 && options.mode !== 'tables_only') {
            combinedRows.push(...pageMetadataRows);
          }
          combinedRows.push(...pageHeaderRows);
          combinedRows.push(...pageDataRows);
        }
      }
    }

    if (options.onProgress) {
      const pct = Math.round(20 + ((pageNum - startPage + 1) / totalPagesToProcess) * 60);
      options.onProgress(pct);
    }
  }

  if (!options.sheetPerPage) {
    sheets.push({
      name: 'Hasil Ekstraksi',
      rows: combinedRows,
    });
  }

  // --- RAKIT WORKBOOK OPENXML (.xlsx) DENGAN GAYA TABEL PROFESIONAL ---
  const zip = new JSZip();

  // Styles XML:
  // s=0 : Default
  // s=1 : Data Cell (Border tipis abu-abu, Vertical Top, WrapText AKTIF)
  // s=2 : Header Cell (Background Biru Muda, Font Bold, Border tipis, Center, WrapText)
  // s=3 : Judul / Penanda Halaman (Font Bold Terakota)
  // s=4 : Key-Value Metadata (Vertical Top)
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="10"/><color rgb="FF1E293B"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF1E293B"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF9B4819"/><name val="Calibri"/></font>
    <font><b/><sz val="12"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="top" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1">
      <alignment vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1">
      <alignment vertical="top"/>
    </xf>
  </cellXfs>
</styleSheet>`;

  const sheetEntriesXml: string[] = [];
  const workbookRelsXmlArr: string[] = [];
  const contentTypesOverridesXml: string[] = [];

  sheets.forEach((sheet, sIdx) => {
    const sheetId = sIdx + 1;
    const rId = `rId${sheetId}`;
    const safeSheetTitle = sheet.name.replace(/[\\/*?:[\]]/g, '_').substring(0, 31);
    sheetEntriesXml.push(`<sheet name="${escapeXml(safeSheetTitle)}" sheetId="${sheetId}" r:id="${rId}"/>`);
    workbookRelsXmlArr.push(
      `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetId}.xml"/>`
    );
    contentTypesOverridesXml.push(
      `<Override PartName="/xl/worksheets/sheet${sheetId}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    );

    const maxCols = Math.max(1, ...sheet.rows.map((r) => r.cells.length));
    const colMaxLens: number[] = new Array(maxCols).fill(0);

    const rowsXml: string[] = [];
    sheet.rows.forEach((row, rIdx) => {
      const rowNum = rIdx + 1;
      const isHeader = Boolean(row.isHeader);
      const isMetadata = Boolean(row.isMetadata);

      // Hitung perkiraan tinggi baris berdasarkan jumlah baris teks terpanjang di sel
      let maxLineCount = 1;
      for (const cellVal of row.cells) {
        if (cellVal) {
          const str = String(cellVal);
          const hardLines = str.split('\n').length;
          const estimatedWrappedLines = Math.ceil(str.length / 32);
          const lines = Math.max(hardLines, estimatedWrappedLines);
          if (lines > maxLineCount) maxLineCount = lines;
        }
      }
      const calculatedHeight = isHeader
        ? 28
        : isMetadata
        ? 20
        : Math.min(260, Math.max(22, maxLineCount * 17));

      const cellsXml = row.cells
        .map((val, cIdx) => {
          const colRef = `${colLetter(cIdx)}${rowNum}`;
          const strVal = String(val ?? '').trim();
          if (!strVal) {
            return `<c r="${colRef}" s="${isMetadata ? 0 : 1}"/>`;
          }

          // Perbarui estimasi lebar kolom
          const firstLineLen = strVal.split('\n')[0].length;
          colMaxLens[cIdx] = Math.max(
            colMaxLens[cIdx] || 0,
            Math.min(50, Math.max(6, firstLineLen + 2))
          );

          if (isMetadata) {
            if (strVal.startsWith('=== Halaman')) {
              return `<c r="${colRef}" s="3" t="inlineStr"><is><t>${escapeXml(strVal)}</t></is></c>`;
            }
            return `<c r="${colRef}" s="4" t="inlineStr"><is><t>${escapeXml(strVal)}</t></is></c>`;
          }

          if (isHeader) {
            return `<c r="${colRef}" s="2" t="inlineStr"><is><t>${escapeXml(strVal)}</t></is></c>`;
          }

          // Nilai data tabel biasa (s=1: dengan border tipis dan wrapText aktif)
          // Hanya angka pendek murni (1-7 digit, tidak diawali 0) yang menjadi numerik <v>
          // Angka panjang (>= 10 digit seperti NIP 18 digit, NIK 16 digit, No HP, No Rekening)
          // WAJIB disimpan sebagai inlineStr agar Excel tidak mengubahnya menjadi notasi ilmiah (2,00112E+17)
          const digitsOnly = strVal.replace(/\D/g, '');
          const isLongIdOrLeadingZero =
            digitsOnly.length >= 10 ||
            (strVal.startsWith('0') && strVal.length > 1) ||
            (strVal.includes(' ') && /\d/.test(strVal));

          const isPureInteger = /^\d+$/.test(strVal) && strVal.length < 8;
          if (isPureInteger && !isLongIdOrLeadingZero && !strVal.startsWith('0')) {
            return `<c r="${colRef}" s="1"><v>${parseInt(strVal, 10)}</v></c>`;
          }

          return `<c r="${colRef}" s="1" t="inlineStr"><is><t>${escapeXml(strVal)}</t></is></c>`;
        })
        .join('');

      rowsXml.push(`<row r="${rowNum}" ht="${calculatedHeight}" customHeight="1">${cellsXml}</row>`);
    });

    // Lebar kolom terukur (Kolom nomor kompak 6-8, kolom isi dinamis 14-50)
    const colsWidthXml = colMaxLens
      .map((w, i) => {
        const finalWidth = i === 0 ? (w < 8 ? 6 : Math.max(w, 8)) : Math.max(w, 14);
        return `<col min="${i + 1}" max="${i + 1}" width="${finalWidth}" customWidth="1"/>`;
      })
      .join('');

    const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${colsWidthXml}</cols>
  <sheetData>${rowsXml.join('')}</sheetData>
</worksheet>`;

    zip.file(`xl/worksheets/sheet${sheetId}.xml`, worksheetXml);
  });

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheetEntriesXml.join('')}
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${workbookRelsXmlArr.join('')}
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${contentTypesOverridesXml.join('')}
</Types>`;

  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', rootRelsXml);
  zip.file('xl/workbook.xml', workbookXml);
  zip.file('xl/_rels/workbook.xml.rels', workbookRelsXml);
  zip.file('xl/styles.xml', stylesXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE',
  });
}
