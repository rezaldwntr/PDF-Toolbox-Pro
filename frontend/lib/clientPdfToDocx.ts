// frontend/lib/clientPdfToDocx.ts
import JSZip from 'jszip';
import { ensurePdfjsReady } from './pdfWorker';

interface TextRunItem {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  bold: boolean;
  italic: boolean;
}

interface ColumnSegment {
  x: number;
  maxX: number;
  text: string;
  bold: boolean;
  italic: boolean;
  fontSize: number;
}

interface VisualLine {
  y: number;
  minX: number;
  maxX: number;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  text: string;
  segments: ColumnSegment[];
}

const escapeXml = (str: string): string =>
  str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Konverter PDF ke Word (.docx OpenXML) — 100% Dapat Diedit:
 * Menghasilkan dokumen Word (.docx) yang sepenuhnya dapat diedit di Microsoft Word
 * (teks, paragraf, perataan judul tengah, indentasi, serta tabel otomatis dengan lebar kolom
 * proporsional untuk bagian titik dua dan blok tanda tangan multi-kolom).
 */
export async function convertPdfToDocxClientSide(
  pdfBuffer: ArrayBuffer,
  options?: {
    startPage?: number;
    endPage?: number;
    onProgress?: (pct: number, msg: string) => void;
  }
): Promise<Blob> {
  const pdfjs = await ensurePdfjsReady();
  const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer.slice(0)) }).promise;
  const totalPages = pdfDoc.numPages;

  const sPage = Math.max(1, options?.startPage || 1);
  const ePage = Math.min(totalPages, Math.max(sPage, options?.endPage || totalPages));

  const zip = new JSZip();
  const bodyParts: string[] = [];
  const relEntries: string[] = [
    `<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
  ];

  let docWidthTwips = 11906; // Default A4 width (595.28pt * 20)
  let docHeightTwips = 16838; // Default A4 height (841.89pt * 20)

  for (let pNum = sPage; pNum <= ePage; pNum++) {
    const progressPct = Math.round(20 + ((pNum - sPage) / Math.max(1, ePage - sPage + 1)) * 72);
    options?.onProgress?.(progressPct, `Menyusun halaman ${pNum} ke format Word (.docx) yang dapat diedit...`);

    const page = await pdfDoc.getPage(pNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageWidthPt = viewport.width || 595.28;
    const pageHeightPt = viewport.height || 841.89;

    if (pNum === sPage) {
      docWidthTwips = Math.round(pageWidthPt * 20);
      docHeightTwips = Math.round(pageHeightPt * 20);
    }

    const textContent = await page.getTextContent();
    const rawItems: TextRunItem[] = [];

    for (const item of textContent.items as any[]) {
      const str = typeof item.str === 'string' ? item.str : '';
      if (!str.trim()) continue;
      const tx = item.transform || [12, 0, 0, 12, 72, 72];
      const fontSize = Math.max(8, Math.min(36, Math.round(Math.hypot(tx[0], tx[1]) || Math.abs(tx[3]) || 11)));
      const x = tx[4] || 0;
      const y = tx[5] || 0;
      const width = item.width || str.length * fontSize * 0.5;
      const fontName = String(item.fontName || '').toLowerCase();
      const bold = fontName.includes('bold') || fontName.includes('black') || fontName.includes('heavy');
      const italic = fontName.includes('italic') || fontName.includes('oblique');

      rawItems.push({ text: str, x, y, width, fontSize, bold, italic });
    }

    rawItems.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 4) return b.y - a.y;
      return a.x - b.x;
    });

    const lines: VisualLine[] = [];
    for (const item of rawItems) {
      const lastLine = lines[lines.length - 1];
      if (lastLine && Math.abs(lastLine.y - item.y) <= Math.max(4, lastLine.fontSize * 0.45)) {
        const gap = item.x - lastLine.maxX;
        const isColumnGap = gap > Math.max(18, lastLine.fontSize * 1.4);
        const separator = isColumnGap ? '    ' : gap > 1.5 ? ' ' : '';
        lastLine.text += separator + item.text;
        lastLine.minX = Math.min(lastLine.minX, item.x);
        lastLine.maxX = Math.max(lastLine.maxX, item.x + item.width);
        lastLine.fontSize = Math.max(lastLine.fontSize, item.fontSize);
        lastLine.bold = lastLine.bold || item.bold;
        lastLine.italic = lastLine.italic || item.italic;

        const lastSeg = lastLine.segments[lastLine.segments.length - 1];
        if (isColumnGap || !lastSeg) {
          lastLine.segments.push({
            x: item.x,
            maxX: item.x + item.width,
            text: item.text,
            bold: item.bold,
            italic: item.italic,
            fontSize: item.fontSize,
          });
        } else {
          lastSeg.text += (gap > 1.5 ? ' ' : '') + item.text;
          lastSeg.maxX = Math.max(lastSeg.maxX, item.x + item.width);
          lastSeg.bold = lastSeg.bold || item.bold;
          lastSeg.italic = lastSeg.italic || item.italic;
          lastSeg.fontSize = Math.max(lastSeg.fontSize, item.fontSize);
        }
      } else {
        lines.push({
          y: item.y,
          minX: item.x,
          maxX: item.x + item.width,
          fontSize: item.fontSize,
          bold: item.bold,
          italic: item.italic,
          text: item.text,
          segments: [
            {
              x: item.x,
              maxX: item.x + item.width,
              text: item.text,
              bold: item.bold,
              italic: item.italic,
              fontSize: item.fontSize,
            },
          ],
        });
      }
    }

    const isSubsequentPage = pNum > sPage;
    let prevY: number | null = null;
    let isFirstLineOnPage = true;
    const marginTwips = 1000; // Margin kiri/kanan ~1.76cm
    const usablePageWidthTwips = Math.max(4000, docWidthTwips - marginTwips * 2);

    if (lines.length === 0 && isSubsequentPage) {
      bodyParts.push(`<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>`);
    }

    for (const line of lines) {
      const cleanText = escapeXml(line.text.trim());
      if (!cleanText) continue;

      const verticalGap = prevY !== null ? Math.max(0, prevY - line.y) : 14;
      prevY = line.y;
      const spaceAfterTwips = verticalGap > line.fontSize * 1.9 ? 140 : 40;
      const halfPtSize = Math.round(line.fontSize * 2);

      // Jika baris memiliki multi-kolom horizontal (misal: blok tanda tangan kiri-kanan atau Label : Nilai),
      // susun sebagai tabel Word tanpa garis (borderless table) dengan lebar kolom proporsional sesuai posisi X PDF
      if (line.segments.length >= 2 && line.segments.length <= 5) {
        if (isSubsequentPage && isFirstLineOnPage) {
          bodyParts.push(`<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>`);
          isFirstLineOnPage = false;
        }

        const leftMarginPt = marginTwips / 20;
        const usableWidthPt = usablePageWidthTwips / 20;
        const cellsXml = line.segments
          .map((seg, idx) => {
            const segText = escapeXml(seg.text.trim());
            const segHalfPt = Math.round(seg.fontSize * 2);
            const nextSegX =
              idx < line.segments.length - 1
                ? line.segments[idx + 1].x
                : Math.max(seg.maxX + 20, leftMarginPt + usableWidthPt);
            const startPt = idx === 0 ? Math.min(seg.x, leftMarginPt + 10) : seg.x;
            const rawWidthPt = Math.max(36, nextSegX - startPt);
            const cellWidthTwips = Math.max(720, Math.round(rawWidthPt * 20));

            return `
              <w:tc>
                <w:tcPr>
                  <w:tcW w:w="${cellWidthTwips}" w:type="dxa"/>
                </w:tcPr>
                <w:p>
                  <w:pPr>
                    <w:spacing w:before="0" w:after="${spaceAfterTwips}" w:line="240" w:lineRule="auto"/>
                  </w:pPr>
                  <w:r>
                    <w:rPr>
                      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
                      ${seg.bold ? '<w:b/>' : ''}
                      ${seg.italic ? '<w:i/>' : ''}
                      <w:sz w:val="${segHalfPt}"/>
                      <w:szCs w:val="${segHalfPt}"/>
                    </w:rPr>
                    <w:t xml:space="preserve">${segText}</w:t>
                  </w:r>
                </w:p>
              </w:tc>
            `;
          })
          .join('');

        bodyParts.push(`
          <w:tbl>
            <w:tblPr>
              <w:tblW w:w="${usablePageWidthTwips}" w:type="dxa"/>
              <w:tblBorders>
                <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
              </w:tblBorders>
            </w:tblPr>
            <w:tr>${cellsXml}</w:tr>
          </w:tbl>
        `);
        isFirstLineOnPage = false;
        continue;
      }

      const lineCenter = (line.minX + line.maxX) / 2;
      const pageCenter = pageWidthPt / 2;
      const lineWidth = line.maxX - line.minX;
      const isCentered =
        lineWidth < pageWidthPt * 0.78 &&
        line.minX > pageWidthPt * 0.12 &&
        Math.abs(lineCenter - pageCenter) < pageWidthPt * 0.09;

      const leftIndentTwips =
        !isCentered && line.minX > 85 ? Math.min(5500, Math.round((line.minX - 50) * 20)) : 0;

      bodyParts.push(`
        <w:p>
          <w:pPr>
            ${isSubsequentPage && isFirstLineOnPage ? '<w:pageBreakBefore/>' : ''}
            ${isCentered ? '<w:jc w:val="center"/>' : '<w:jc w:val="left"/>'}
            ${leftIndentTwips > 0 ? `<w:ind w:left="${leftIndentTwips}"/>` : ''}
            <w:spacing w:before="0" w:after="${spaceAfterTwips}" w:line="250" w:lineRule="auto"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              ${line.bold ? '<w:b/>' : ''}
              ${line.italic ? '<w:i/>' : ''}
              <w:sz w:val="${halfPtSize}"/>
              <w:szCs w:val="${halfPtSize}"/>
            </w:rPr>
            <w:t xml:space="preserve">${cleanText}</w:t>
          </w:r>
        </w:p>
      `);
      isFirstLineOnPage = false;
    }
  }

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${relEntries.join('\n  ')}
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
</w:styles>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:body>
    ${bodyParts.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="${docWidthTwips}" w:h="${docHeightTwips}"/>
      <w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="560" w:footer="560" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', rootRelsXml);
  zip.file('word/_rels/document.xml.rels', docRelsXml);
  zip.file('word/styles.xml', stylesXml);
  zip.file('word/document.xml', documentXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
}

