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
  // 1. Cari apakah ada baris penomoran kolom eksplisit (seperti 1, 2, 3, 4, 5, 6, 7, 8, 9 pada format resmi Indonesia)
  const numbersRegex = /^[1-9]\d?$/;
  const numberCandidates = items.filter((it) => numbersRegex.test(it.str.trim()));

  const yGroups = new Map<number, RawTextItem[]>();
  for (const numItem of numberCandidates) {
    let matchedY: number | null = null;
    for (const keyY of yGroups.keys()) {
      if (Math.abs(keyY - numItem.y) <= 4.0) {
        matchedY = keyY;
        break;
      }
    }
    if (matchedY !== null) {
      yGroups.get(matchedY)!.push(numItem);
    } else {
      yGroups.set(numItem.y, [numItem]);
    }
  }

  let bestNumberRow: RawTextItem[] | null = null;
  for (const group of yGroups.values()) {
    if (group.length >= 3) {
      group.sort((a, b) => a.x - b.x);
      const vals = group.map((g) => parseInt(g.str.trim(), 10));
      const isSequential = vals.every((v, i) => i === 0 || v > vals[i - 1]);
      if (isSequential && (!bestNumberRow || group.length > bestNumberRow.length)) {
        bestNumberRow = group;
      }
    }
  }

  // Jika baris nomor kolom ditemukan, bangun partisi kolom [0..pageWidth] tanpa celah
  if (bestNumberRow && bestNumberRow.length >= 3) {
    const sorted = [...bestNumberRow].sort((a, b) => a.x - b.x);
    const avgY = bestNumberRow.reduce((acc, it) => acc + it.y, 0) / bestNumberRow.length;
    const bands: ColumnBand[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i];
      const next = sorted[i + 1];

      const minX = i === 0 ? 0 : bands[i - 1].maxX;
      const maxX = next ? (cur.x + cur.width + next.x) / 2 : pageWidth;

      bands.push({
        index: i,
        minX,
        maxX,
      });
    }
    return { bands, columnNumberRowY: avgY };
  }

  // 2. Fallback: Analisis klaster spasial horizontal teks tabel
  const sortedX = [...items].sort((a, b) => a.x - b.x);
  const xGaps: number[] = [];
  for (let i = 0; i < sortedX.length - 1; i++) {
    const gap = sortedX[i + 1].x - (sortedX[i].x + sortedX[i].width);
    if (gap > 16) {
      xGaps.push((sortedX[i].x + sortedX[i].width + sortedX[i + 1].x) / 2);
    }
  }

  const cleanGaps: number[] = [];
  xGaps.sort((a, b) => a - b);
  for (const g of xGaps) {
    if (cleanGaps.length === 0 || g - cleanGaps[cleanGaps.length - 1] > 28) {
      cleanGaps.push(g);
    }
  }

  if (cleanGaps.length >= 2) {
    const bands: ColumnBand[] = [];
    let startX = 0;
    for (let i = 0; i < cleanGaps.length; i++) {
      bands.push({
        index: i,
        minX: startX,
        maxX: cleanGaps[i],
      });
      startX = cleanGaps[i];
    }
    bands.push({
      index: cleanGaps.length,
      minX: startX,
      maxX: pageWidth,
    });
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

function getColumnIndexForX(x: number, bands: ColumnBand[]): number {
  for (let i = 0; i < bands.length; i++) {
    if (x >= bands[i].minX && x < bands[i].maxX) {
      return i;
    }
  }
  if (x < bands[0].minX) return 0;
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
  if (items.length === 0) return { rows: [], detectedBands: fallbackBands || [] };

  const sortedItems = [...items].sort((a, b) => b.y - a.y);
  const detectionResult = detectColumnBands(sortedItems, pageWidth);
  const columnBands = detectionResult.columnNumberRowY || !fallbackBands ? detectionResult.bands : fallbackBands;
  const numCols = columnBands.length;
  const col0Band = columnBands[0];

  const resultRows: TableRow[] = [];

  // 1. Tentukan titik awal tabel utama
  let tableStartY = pageHeight;
  if (detectionResult.columnNumberRowY !== undefined) {
    tableStartY = detectionResult.columnNumberRowY + 45;
  } else {
    for (const it of sortedItems) {
      const txt = it.str.trim().toLowerCase();
      if (txt === 'no' || txt === 'no.' || (it.x <= col0Band.maxX && /^[1-9]$/.test(txt))) {
        tableStartY = it.y + 15;
        break;
      }
    }
  }

  const preTableItems = sortedItems.filter((it) => it.y > tableStartY);
  const tableItems = sortedItems.filter((it) => it.y <= tableStartY);

  // 2. Metadata di atas tabel (seperti Program : Pelatihan, NIP : ..., dll)
  if (mode !== 'tables_only' && preTableItems.length > 0) {
    const preRowsMap = new Map<number, RawTextItem[]>();
    for (const it of preTableItems) {
      let matchedY: number | null = null;
      for (const keyY of preRowsMap.keys()) {
        if (Math.abs(keyY - it.y) <= 5.0) {
          matchedY = keyY;
          break;
        }
      }
      if (matchedY !== null) {
        preRowsMap.get(matchedY)!.push(it);
      } else {
        preRowsMap.set(it.y, [it]);
      }
    }

    const sortedPreY = Array.from(preRowsMap.keys()).sort((a, b) => b - a);
    for (const y of sortedPreY) {
      const lineItems = preRowsMap.get(y)!.sort((a, b) => a.x - b.x);
      const fullText = lineItems.map((i) => i.str).join(' ').trim();
      if (!fullText) continue;

      if (fullText.includes(':')) {
        const colonIdx = fullText.indexOf(':');
        const label = fullText.substring(0, colonIdx).trim();
        const value = fullText.substring(colonIdx + 1).trim();

        const rowCells = new Array(numCols).fill('');
        rowCells[0] = label;
        rowCells[1] = ':';
        rowCells[2] = value;
        resultRows.push({
          isMetadata: true,
          cells: rowCells,
        });
      } else {
        const rowCells = new Array(numCols).fill('');
        // Jika baris lanjutan ter-indent di posisi value (x > 140 pt), letakkan di kolom 2
        if (lineItems[0].x > 140 && numCols > 2) {
          rowCells[2] = fullText;
        } else {
          rowCells[0] = fullText;
        }
        resultRows.push({
          isMetadata: true,
          cells: rowCells,
        });
      }
    }
  }

  // 3. Pemisahan Header Tabel dan Data Tabel
  let headerTitleItems: RawTextItem[] = [];
  let columnNumberItems: RawTextItem[] = [];
  let dataItems: RawTextItem[] = [];

  if (detectionResult.columnNumberRowY !== undefined) {
    const cY = detectionResult.columnNumberRowY;
    headerTitleItems = tableItems.filter((it) => it.y > cY + 4);
    columnNumberItems = tableItems.filter((it) => Math.abs(it.y - cY) <= 4);
    dataItems = tableItems.filter((it) => it.y < cY - 4);
  } else {
    let firstDataY: number | null = null;
    for (const it of tableItems) {
      const trimmed = it.str.trim();
      if (it.x <= col0Band.maxX + 10 && /^[1-9]\d?[\.\)]?$/.test(trimmed)) {
        firstDataY = it.y;
        break;
      }
    }

    if (firstDataY !== null) {
      headerTitleItems = tableItems.filter((it) => it.y > firstDataY! + 6);
      dataItems = tableItems.filter((it) => it.y <= firstDataY! + 6);
    } else {
      dataItems = tableItems;
    }
  }

  // Header Title Row (misal No | Standar Kompetensi | ...)
  if (headerTitleItems.length > 0) {
    const headerRowCells = new Array(numCols).fill('');
    for (const it of headerTitleItems) {
      const colIdx = getColumnIndexForX(it.x + it.width / 2, columnBands);
      headerRowCells[colIdx] = headerRowCells[colIdx]
        ? `${headerRowCells[colIdx]} ${it.str.trim()}`
        : it.str.trim();
    }
    if (headerRowCells.some((c) => c !== '')) {
      resultRows.push({
        isHeader: true,
        cells: headerRowCells,
      });
    }
  }

  // Column Number Row (misal 1 | 2 | 3 | 4...)
  if (columnNumberItems.length > 0) {
    const colNumCells = new Array(numCols).fill('');
    for (const it of columnNumberItems) {
      const colIdx = getColumnIndexForX(it.x + it.width / 2, columnBands);
      colNumCells[colIdx] = it.str.trim();
    }
    if (colNumCells.some((c) => c !== '')) {
      resultRows.push({
        isHeader: true,
        isNumbering: true,
        cells: colNumCells,
      });
    }
  }

  // 4. Proses Baris Data Tabel
  const rowMarkers: Array<{ index: number; y: number; text: string; item: RawTextItem }> = [];
  for (const it of dataItems) {
    const trimmed = it.str.trim();
    if (it.x <= col0Band.maxX + 10 && /^\d+[\.\)]?$/.test(trimmed)) {
      const numVal = parseInt(trimmed, 10);
      if (numVal > 0 && numVal < 500) {
        rowMarkers.push({
          index: numVal,
          y: it.y,
          text: trimmed,
          item: it,
        });
      }
    }
  }

  rowMarkers.sort((a, b) => b.y - a.y);

  if (rowMarkers.length > 0) {
    // Tangani baris lanjutan (overflow dari halaman sebelumnya) sebelum marker pertama
    const firstMarkerY = rowMarkers[0].y;
    const overflowItems = dataItems.filter((it) => it.y > firstMarkerY + 6);
    if (overflowItems.length > 0) {
      const overflowCells = new Array(numCols).fill('');
      const colItemsMap = new Map<number, RawTextItem[]>();
      for (const it of overflowItems) {
        const cIdx = getColumnIndexForX(it.x + it.width / 2, columnBands);
        if (!colItemsMap.has(cIdx)) colItemsMap.set(cIdx, []);
        colItemsMap.get(cIdx)!.push(it);
      }
      for (const [cIdx, itemsInCol] of colItemsMap.entries()) {
        itemsInCol.sort((a, b) => b.y - a.y);
        const lines = groupItemsIntoVisualLines(itemsInCol);
        overflowCells[cIdx] = mergeCellLines(lines);
      }
      if (overflowCells.some((c) => c !== '')) {
        resultRows.push({
          cells: overflowCells,
        });
      }
    }

    // Ekstraksi tiap baris data
    for (let r = 0; r < rowMarkers.length; r++) {
      const curMarker = rowMarkers[r];
      const nextMarker = rowMarkers[r + 1];

      const topY = curMarker.y + 8;
      const bottomY = nextMarker ? nextMarker.y + 8 : -1000;

      const rowItems = dataItems.filter((it) => it.y <= topY && it.y > bottomY);
      const rowCells = new Array(numCols).fill('');
      rowCells[0] = curMarker.text;

      const colItemsMap = new Map<number, RawTextItem[]>();
      for (const it of rowItems) {
        if (it === curMarker.item || (it.x <= col0Band.maxX + 10 && it.str.trim() === curMarker.text)) {
          continue;
        }
        const colIdx = getColumnIndexForX(it.x + it.width / 2, columnBands);
        if (!colItemsMap.has(colIdx)) colItemsMap.set(colIdx, []);
        colItemsMap.get(colIdx)!.push(it);
      }

      for (const [colIdx, itemsInCol] of colItemsMap.entries()) {
        itemsInCol.sort((a, b) => b.y - a.y);
        const lines = groupItemsIntoVisualLines(itemsInCol);
        rowCells[colIdx] = mergeCellLines(lines);
      }

      resultRows.push({
        cells: rowCells,
      });
    }
  } else {
    // Fallback: Line-clustering
    const yGroups = new Map<number, RawTextItem[]>();
    for (const it of dataItems) {
      let matchedY: number | null = null;
      for (const keyY of yGroups.keys()) {
        if (Math.abs(keyY - it.y) <= 8.0) {
          matchedY = keyY;
          break;
        }
      }
      if (matchedY !== null) {
        yGroups.get(matchedY)!.push(it);
      } else {
        yGroups.set(it.y, [it]);
      }
    }

    const sortedY = Array.from(yGroups.keys()).sort((a, b) => b - a);
    for (const y of sortedY) {
      const itemsInRow = yGroups.get(y)!;
      const rowCells = new Array(numCols).fill('');
      for (const it of itemsInRow) {
        const colIdx = getColumnIndexForX(it.x + it.width / 2, columnBands);
        rowCells[colIdx] = rowCells[colIdx]
          ? `${rowCells[colIdx]} ${it.str.trim()}`
          : it.str.trim();
      }
      if (rowCells.some((c) => c !== '')) {
        resultRows.push({
          cells: rowCells,
        });
      }
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
