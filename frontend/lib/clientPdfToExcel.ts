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

interface ExtractedCell {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ExtractedRow {
  y: number;
  cells: ExtractedCell[];
}

/**
 * Konverter PDF ke Excel (.xlsx OpenXML) Client-Side — 100% Privasi di Browser:
 * Mengekstrak teks dan baris-baris tabel dari PDF menggunakan pdfjs, mengelompokkannya
 * ke dalam kolom-kolom sel teratur, dan merakit workbook OpenXML (.xlsx) asli menggunakan JSZip.
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

  interface SheetTableData {
    name: string;
    rows: string[][];
  }

  const sheetsData: SheetTableData[] = [];
  const combinedRows: string[][] = [];

  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
    }>;

    // Kumpulkan sel teks dengan koordinat visual (y dibalik agar urut dari atas ke bawah)
    const rawCells: ExtractedCell[] = [];
    for (const item of items) {
      const str = item.str || '';
      if (!str.trim()) continue;
      const x = item.transform[4];
      const y = item.transform[5];
      rawCells.push({
        text: str,
        x,
        y,
        width: item.width || 10,
        height: item.height || 10,
      });
    }

    // Urutkan berdasarkan koordinat y (dari atas ke bawah: y lebih besar berada di atas dalam PDF)
    rawCells.sort((a, b) => b.y - a.y);

    // Kelompokkan sel yang memiliki posisi baris y berdekatan (toleransi 4.5 pt)
    const rowTolerance = 4.5;
    const rows: ExtractedRow[] = [];
    for (const cell of rawCells) {
      let matchedRow = rows.find((r) => Math.abs(r.y - cell.y) <= rowTolerance);
      if (!matchedRow) {
        matchedRow = { y: cell.y, cells: [] };
        rows.push(matchedRow);
      }
      matchedRow.cells.push(cell);
    }

    // Urutkan baris dari atas ke bawah, lalu urutkan sel dalam setiap baris dari kiri ke kanan (x)
    rows.sort((a, b) => b.y - a.y);
    const pageGrid: string[][] = [];

    // Jika mode gabungan dan multi-halaman, tambahkan penanda halaman
    if (!options.sheetPerPage && totalPagesToProcess > 1) {
      combinedRows.push([`=== Halaman ${pageNum} ===`]);
    }

    for (const r of rows) {
      r.cells.sort((a, b) => a.x - b.x);

      // Kelompokkan sel per kolom berdasarkan jarak spasi horizontal x
      const rowStrings: string[] = [];
      let lastCell: ExtractedCell | null = null;

      for (const c of r.cells) {
        if (!lastCell) {
          rowStrings.push(c.text);
        } else {
          const gap = c.x - (lastCell.x + lastCell.width);
          // Jika teks berada sangat dekat (< 6pt), gabungkan dalam satu sel
          if (gap < 6 && rowStrings.length > 0) {
            rowStrings[rowStrings.length - 1] += ` ${c.text}`;
          } else {
            rowStrings.push(c.text);
          }
        }
        lastCell = c;
      }

      if (rowStrings.length > 0) {
        pageGrid.push(rowStrings);
        if (!options.sheetPerPage) {
          combinedRows.push(rowStrings);
        }
      }
    }

    if (pageGrid.length === 0) {
      pageGrid.push(['Tidak ada tabel/konten terdeteksi di halaman ini']);
      if (!options.sheetPerPage) {
        combinedRows.push(['Tidak ada tabel/konten terdeteksi di halaman ini']);
      }
    }

    if (options.sheetPerPage) {
      sheetsData.push({
        name: `Halaman ${pageNum}`,
        rows: pageGrid,
      });
    }

    if (options.onProgress) {
      const pct = Math.round(20 + ((pageNum - startPage + 1) / totalPagesToProcess) * 60);
      options.onProgress(pct);
    }
  }

  if (!options.sheetPerPage) {
    sheetsData.push({
      name: 'Hasil Ekstraksi',
      rows: combinedRows.length > 0 ? combinedRows : [['Dokumen PDF tidak memuat baris teks']],
    });
  }

  // --- RAKIT OPENXML (.xlsx) WORKBOOK ---
  const zip = new JSZip();

  // Styles XML (Font Calibri, Border Thin, Header Background)
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><color rgb="FF1E293B"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF1E293B"/><name val="Calibri"/></font>
    <font><b/><sz val="12"/><color rgb="FF9B4819"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="4">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>
  </cellXfs>
</styleSheet>`;

  // Sheet XML generation
  const sheetEntriesXml: string[] = [];
  const workbookRelsXmlArr: string[] = [];
  const contentTypesOverridesXml: string[] = [];

  sheetsData.forEach((sheetData, sIdx) => {
    const sheetId = sIdx + 1;
    const rId = `rId${sheetId}`;
    const safeSheetTitle = sheetData.name.replace(/[\\/*?:[\]]/g, '_').substring(0, 31);
    sheetEntriesXml.push(`<sheet name="${escapeXml(safeSheetTitle)}" sheetId="${sheetId}" r:id="${rId}"/>`);
    workbookRelsXmlArr.push(
      `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetId}.xml"/>`
    );
    contentTypesOverridesXml.push(
      `<Override PartName="/xl/worksheets/sheet${sheetId}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    );

    const rowsXml: string[] = [];
    const maxCols = Math.max(1, ...sheetData.rows.map((r) => r.length));
    const colMaxLens: number[] = new Array(maxCols).fill(10);

    sheetData.rows.forEach((row, rIdx) => {
      const rowNum = rIdx + 1;
      const isHeaderRow = rIdx === 0 && row.length > 1;
      const isPageHeader = row.length === 1 && row[0].startsWith('=== Halaman');

      const cellsXml = row
        .map((val, cIdx) => {
          const colRef = `${colLetter(cIdx)}${rowNum}`;
          const strVal = String(val ?? '').trim();
          colMaxLens[cIdx] = Math.max(colMaxLens[cIdx] || 10, Math.min(60, strVal.length + 3));

          if (isPageHeader) {
            return `<c r="${colRef}" s="3" t="inlineStr"><is><t>${escapeXml(strVal)}</t></is></c>`;
          }

          // Uji apakah nilai berupa angka murni tanpa awalan 0 (misal 15000, 2.5)
          const isNumeric =
            strVal.length > 0 &&
            !strVal.startsWith('0') &&
            !isNaN(Number(strVal.replace(/,/g, ''))) &&
            !strVal.includes('-');

          if (isNumeric) {
            const num = Number(strVal.replace(/,/g, ''));
            return `<c r="${colRef}" s="${isHeaderRow ? 2 : 1}"><v>${num}</v></c>`;
          }

          return `<c r="${colRef}" s="${isHeaderRow ? 2 : 1}" t="inlineStr"><is><t>${escapeXml(strVal)}</t></is></c>`;
        })
        .join('');

      rowsXml.push(`<row r="${rowNum}" ht="${isHeaderRow || isPageHeader ? 24 : 20}">${cellsXml}</row>`);
    });

    const colsWidthXml = colMaxLens
      .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
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
