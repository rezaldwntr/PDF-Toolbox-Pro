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

interface VisualLine {
  y: number;
  minX: number;
  maxX: number;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  text: string;
  hasHorizontalColumns: boolean;
}

const FORMAL_LAYOUT_KEYWORDS = [
  'lembar pengesahan',
  'halaman pengesahan',
  'pengesahan',
  'lembar persetujuan',
  'halaman persetujuan',
  'mengetahui',
  'menyetujui',
  'pembimbing',
  'penguji',
  'dekan',
  'rektor',
  'ketua jurusan',
  'ketua program studi',
  'kaprodi',
  'koorprodi',
  'direktur',
  'kepala',
  'nip.',
  'nip :',
  'nidn',
  'nim :',
  'nrp',
  'ditandatangani',
  'tanda tangan',
  'sertifikat',
  'piagam',
  'ijazah',
  'transkrip',
  'berita acara',
  'surat keterangan',
  'surat keputusan',
  'invoice',
  'kwitansi',
  'faktur',
];

const escapeXml = (str: string): string =>
  str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Mengevaluasi apakah sebuah halaman PDF dapat dikonversi 100% identik sebagai teks mengalir biasa,
 * atau memiliki tata letak kompleks (scan, tanda tangan, logo, multi-kolom, tabel, lembar pengesahan)
 * sehingga wajib dijadikan foto halaman utuh di dalam Word agar 100% sama dengan aslinya.
 */
async function evaluatePageNeedsPhotoMode(
  page: any,
  pdfjs: any
): Promise<{
  needsPhoto: boolean;
  reason: string;
  lines: VisualLine[];
  pageWidthPt: number;
  pageHeightPt: number;
}> {
  const viewport = page.getViewport({ scale: 1.0 });
  const pageWidthPt = viewport.width || 595.28;
  const pageHeightPt = viewport.height || 841.89;

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
      const separator = isColumnGap ? '    ' : gap > 2 ? ' ' : '';
      lastLine.text += separator + item.text;
      lastLine.minX = Math.min(lastLine.minX, item.x);
      lastLine.maxX = Math.max(lastLine.maxX, item.x + item.width);
      lastLine.fontSize = Math.max(lastLine.fontSize, item.fontSize);
      lastLine.bold = lastLine.bold || item.bold;
      lastLine.italic = lastLine.italic || item.italic;
      if (isColumnGap) {
        lastLine.hasHorizontalColumns = true;
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
        hasHorizontalColumns: false,
      });
    }
  }

  const fullPageText = lines.map((l) => l.text.trim()).join('\n');
  const lowerText = fullPageText.toLowerCase();
  const totalChars = fullPageText.replace(/\s+/g, '').length;

  // 1. Jika halaman scan / minim teks (< 120 karakter)
  if (totalChars < 120) {
    return {
      needsPhoto: true,
      reason: 'Halaman hasil pindaian (scan) atau berbasis visual penuh',
      lines,
      pageWidthPt,
      pageHeightPt,
    };
  }

  // 2. Cek kata kunci dokumen formal / Lembar Pengesahan / Tanda Tangan / Sertifikat
  for (const kw of FORMAL_LAYOUT_KEYWORDS) {
    if (lowerText.includes(kw)) {
      return {
        needsPhoto: true,
        reason: `Terdeteksi tata letak dokumen presisi (${kw})`,
        lines,
        pageWidthPt,
        pageHeightPt,
      };
    }
  }

  // 3. Cek keberadaan objek gambar (logo kop surat, tanda tangan basah, stempel, foto) atau garis vektor/tabel
  try {
    const opList = await page.getOperatorList();
    const OPS = pdfjs.OPS || {};
    let imageOpsCount = 0;
    let vectorOpsCount = 0;

    for (const fnId of opList.fnArray as number[]) {
      if (
        fnId === OPS.paintImageXObject ||
        fnId === OPS.paintInlineImageXObject ||
        fnId === OPS.paintImageMaskXObject ||
        fnId === OPS.paintJpegXObject ||
        fnId === 85 || // paintImageXObject fallback code
        fnId === 86    // paintInlineImageXObject fallback code
      ) {
        imageOpsCount++;
      } else if (
        fnId === OPS.constructPath ||
        fnId === OPS.stroke ||
        fnId === OPS.fill ||
        fnId === OPS.eoFill
      ) {
        vectorOpsCount++;
      }
    }

    if (imageOpsCount > 0) {
      return {
        needsPhoto: true,
        reason: 'Terdeteksi objek gambar/logo/stempel/tanda tangan yang memerlukan posisi presisi 100%',
        lines,
        pageWidthPt,
        pageHeightPt,
      };
    }

    if (vectorOpsCount > 6) {
      return {
        needsPhoto: true,
        reason: 'Terdeteksi garis tabel, bingkai, atau elemen grafis vektor kompleks',
        lines,
        pageWidthPt,
        pageHeightPt,
      };
    }
  } catch {
    // Jika gagal membaca operatorList, lanjutkan ke pemeriksaan struktur kolom teks
  }

  // 4. Cek struktur multi-kolom horizontal / titik dua sejajar (seperti Nama : ... / blok tanda tangan kiri-kanan)
  const columnLinesCount = lines.filter((l) => l.hasHorizontalColumns || /\s:\s/.test(l.text)).length;
  if (columnLinesCount >= 2) {
    return {
      needsPhoto: true,
      reason: 'Terdeteksi tata letak kolom sejajar atau tabulasi formulir',
      lines,
      pageWidthPt,
      pageHeightPt,
    };
  }

  // 5. Cek variasi indentasi kiri (indikasi tata letak bertingkat/kolom tanda tangan)
  const distinctLeftMargins = new Set(lines.map((l) => Math.round(l.minX / 20))).size;
  if (distinctLeftMargins >= 3) {
    return {
      needsPhoto: true,
      reason: 'Terdeteksi multi-indentasi / posisi blok teks kustom',
      lines,
      pageWidthPt,
      pageHeightPt,
    };
  }

  return {
    needsPhoto: false,
    reason: 'Teks paragraf standar',
    lines,
    pageWidthPt,
    pageHeightPt,
  };
}

/**
 * Memvalidasi apakah dokumen PDF memerlukan konversi mode Foto Halaman Utuh di dalam Word
 * agar hasilnya 100% identik dengan dokumen PDF asli tanpa pergeseran tata letak.
 */
export async function validatePdfNeedsVisualDocx(
  pdfBuffer: ArrayBuffer,
  startPage?: number,
  endPage?: number
): Promise<{ needsVisual: boolean; reason: string }> {
  try {
    const pdfjs = await ensurePdfjsReady();
    const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer.slice(0)) }).promise;
    const totalPages = pdfDoc.numPages;
    const sPage = Math.max(1, startPage || 1);
    const ePage = Math.min(totalPages, Math.max(sPage, endPage || totalPages));

    for (let pNum = sPage; pNum <= ePage; pNum++) {
      const page = await pdfDoc.getPage(pNum);
      const evalRes = await evaluatePageNeedsPhotoMode(page, pdfjs);
      if (evalRes.needsPhoto) {
        return { needsVisual: true, reason: evalRes.reason };
      }
    }
    return { needsVisual: false, reason: 'Dokumen teks standar' };
  } catch {
    return { needsVisual: true, reason: 'Validasi fallback ke presisi visual 100%' };
  }
}

/**
 * Konverter PDF ke Word (.docx OpenXML asli) dengan Validasi Presisi Visual Otomatis:
 * - Jika halaman tidak dapat diubah 100% identik menjadi teks mengalir biasa (misal: Lembar Pengesahan,
 *   ada tanda tangan/stempel/logo, tabel, multi-kolom, atau hasil scan), halaman otomatis dirender
 *   menjadi foto beresolusi tinggi (Full-Page 0-Margin) di dalam lembar Word agar 100% sama persis dengan aslinya.
 */
export async function convertPdfToDocxClientSide(
  pdfBuffer: ArrayBuffer,
  options?: {
    startPage?: number;
    endPage?: number;
    forceVisualMode?: boolean;
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
  let imageCounter = 0;
  let anyVisualPage = false;
  let docWidthTwips = 11906; // Default A4 width (595.28pt * 20)
  let docHeightTwips = 16838; // Default A4 height (841.89pt * 20)

  for (let pNum = sPage; pNum <= ePage; pNum++) {
    const progressPct = Math.round(20 + ((pNum - sPage) / Math.max(1, ePage - sPage + 1)) * 72);
    options?.onProgress?.(progressPct, `Menyusun halaman ${pNum} dengan presisi visual 100%...`);

    const page = await pdfDoc.getPage(pNum);
    const evalRes = await evaluatePageNeedsPhotoMode(page, pdfjs);
    const { lines, pageWidthPt, pageHeightPt } = evalRes;
    const usePhotoMode = Boolean(options?.forceVisualMode || evalRes.needsPhoto);

    if (pNum === sPage) {
      docWidthTwips = Math.round(pageWidthPt * 20);
      docHeightTwips = Math.round(pageHeightPt * 20);
    }

    const isSubsequentPage = pNum > sPage;

    if (usePhotoMode && typeof document !== 'undefined') {
      anyVisualPage = true;
      // Render halaman pada resolusi tinggi (2.4x scale ~ 175-200 DPI) agar teks, logo, dan tanda tangan sangat tajam
      const renderScale = 2.4;
      const renderVp = page.getViewport({ scale: renderScale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(renderVp.width);
      canvas.height = Math.ceil(renderVp.height);
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: renderVp }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const base64Data = dataUrl.split(',')[1] || '';

        if (base64Data) {
          imageCounter++;
          const rId = `rIdImg${imageCounter}`;
          const imgFilename = `page_${pNum}.jpg`;
          zip.file(`word/media/${imgFilename}`, base64Data, { base64: true });
          relEntries.push(
            `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imgFilename}"/>`
          );

          // Ukuran EMU (1 pt = 12700 EMU). Gunakan 99.4% lebar & 99.0% tinggi kertas pada margin 0
          // agar mengisi halaman Word 100% presisi tanpa memicu halaman kosong tambahan di MS Word.
          const cx = Math.round(pageWidthPt * 0.994 * 12700);
          const cy = Math.round(pageHeightPt * 0.990 * 12700);

          bodyParts.push(`
            <w:p>
              <w:pPr>
                ${isSubsequentPage ? '<w:pageBreakBefore/>' : ''}
                <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
                <w:jc w:val="center"/>
                <w:rPr>
                  <w:sz w:val="2"/>
                  <w:szCs w:val="2"/>
                </w:rPr>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:sz w:val="2"/>
                  <w:szCs w:val="2"/>
                </w:rPr>
                <w:drawing>
                  <wp:inline distT="0" distB="0" distL="0" distR="0">
                    <wp:extent cx="${cx}" cy="${cy}"/>
                    <wp:effectExtent l="0" t="0" r="0" b="0"/>
                    <wp:docPr id="${imageCounter}" name="Halaman ${pNum}"/>
                    <wp:cNvGraphicFramePr>
                      <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
                    </wp:cNvGraphicFramePr>
                    <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                          <pic:nvPicPr>
                            <pic:cNvPr id="${imageCounter}" name="${imgFilename}"/>
                            <pic:cNvPicPr/>
                          </pic:nvPicPr>
                          <pic:blipFill>
                            <a:blip r:embed="${rId}"/>
                            <a:stretch><a:fillRect/></a:stretch>
                          </pic:blipFill>
                          <pic:spPr>
                            <a:xfrm>
                              <a:off x="0" y="0"/>
                              <a:ext cx="${cx}" cy="${cy}"/>
                            </a:xfrm>
                            <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                          </pic:spPr>
                        </pic:pic>
                      </a:graphicData>
                    </a:graphic>
                  </wp:inline>
                </w:drawing>
              </w:r>
            </w:p>
          `);
          continue;
        }
      }
    }

    // Mode Teks Mengalir (hanya untuk halaman paragraf biasa yang lolos validasi 100%)
    let prevY: number | null = null;
    let isFirstLineOnPage = true;
    for (const line of lines) {
      const cleanText = escapeXml(line.text.trim());
      if (!cleanText) continue;

      const lineCenter = (line.minX + line.maxX) / 2;
      const pageCenter = pageWidthPt / 2;
      const lineWidth = line.maxX - line.minX;
      const isCentered =
        lineWidth < pageWidthPt * 0.75 &&
        line.minX > pageWidthPt * 0.14 &&
        Math.abs(lineCenter - pageCenter) < pageWidthPt * 0.08;

      const verticalGap = prevY !== null ? Math.max(0, prevY - line.y) : 14;
      prevY = line.y;
      const spaceAfterTwips = verticalGap > line.fontSize * 1.8 ? 200 : 100;
      const halfPtSize = Math.round(line.fontSize * 2);

      bodyParts.push(`
        <w:p>
          <w:pPr>
            ${isSubsequentPage && isFirstLineOnPage ? '<w:pageBreakBefore/>' : ''}
            ${isCentered ? '<w:jc w:val="center"/>' : '<w:jc w:val="left"/>'}
            <w:spacing w:after="${spaceAfterTwips}" w:line="276" w:lineRule="auto"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
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
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="png" ContentType="image/png"/>
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
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
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

  // Jika menggunakan mode foto visual, gunakan margin 0 agar ukuran foto 100% sama persis dengan halaman PDF asli
  const marginAttr = anyVisualPage
    ? `w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"`
    : `w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:body>
    ${bodyParts.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="${docWidthTwips}" w:h="${docHeightTwips}"/>
      <w:pgMar ${marginAttr}/>
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
