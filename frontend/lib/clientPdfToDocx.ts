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
 * Konverter Fallback Client-Side PDF ke Word (.docx OpenXML asli)
 * Digunakan secara otomatis apabila server Cloud Run mengalami gangguan jaringan/worker,
 * mendukung baik PDF berbasis teks (dengan deteksi perataan tengah/judul) maupun PDF hasil scan (gambar halaman).
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
  let imageCounter = 0;

  for (let pNum = sPage; pNum <= ePage; pNum++) {
    const progressPct = Math.round(20 + ((pNum - sPage) / Math.max(1, ePage - sPage + 1)) * 70);
    options?.onProgress?.(progressPct, `Menyusun halaman ${pNum} ke format Word (.docx)...`);

    const page = await pdfDoc.getPage(pNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageWidthPt = viewport.width || 595.28;
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

    // Urutkan dari atas ke bawah (y menurun pada koordinat PDF), lalu kiri ke kanan (x menaik)
    rawItems.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 4) return b.y - a.y;
      return a.x - b.x;
    });

    const lines: VisualLine[] = [];
    for (const item of rawItems) {
      const lastLine = lines[lines.length - 1];
      if (lastLine && Math.abs(lastLine.y - item.y) <= Math.max(4, lastLine.fontSize * 0.45)) {
        const gap = item.x - lastLine.maxX;
        const separator = gap > lastLine.fontSize * 1.8 ? '    ' : gap > 2 ? ' ' : '';
        lastLine.text += separator + item.text;
        lastLine.minX = Math.min(lastLine.minX, item.x);
        lastLine.maxX = Math.max(lastLine.maxX, item.x + item.width);
        lastLine.fontSize = Math.max(lastLine.fontSize, item.fontSize);
        lastLine.bold = lastLine.bold || item.bold;
        lastLine.italic = lastLine.italic || item.italic;
      } else {
        lines.push({
          y: item.y,
          minX: item.x,
          maxX: item.x + item.width,
          fontSize: item.fontSize,
          bold: item.bold,
          italic: item.italic,
          text: item.text,
        });
      }
    }

    const totalTextLength = lines.reduce((acc, l) => acc + l.text.trim().length, 0);

    // Jika halaman adalah hasil scan (teks sangat sedikit) atau berkombinasi visual,
    // sematkan citra halaman beresolusi tinggi agar tampilan di Word tetap utuh 100%
    if (totalTextLength < 25 && typeof document !== 'undefined') {
      const renderScale = 2.0;
      const renderVp = page.getViewport({ scale: renderScale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(renderVp.width);
      canvas.height = Math.ceil(renderVp.height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: renderVp }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const base64Data = dataUrl.split(',')[1] || '';
        if (base64Data) {
          imageCounter++;
          const rId = `rIdImg${imageCounter}`;
          const imgFilename = `page_${pNum}.jpg`;
          zip.file(`word/media/${imgFilename}`, base64Data, { base64: true });
          relEntries.push(
            `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imgFilename}"/>`
          );

          // Ukuran EMU (1 pt = 12700 EMU), sesuaikan ke area cetak halaman Word
          const usableWidthPt = 468; // 6.5 inci
          const scaleFactor = usableWidthPt / Math.max(1, viewport.width);
          const cx = Math.round(viewport.width * scaleFactor * 12700);
          const cy = Math.round(viewport.height * scaleFactor * 12700);

          bodyParts.push(`
            <w:p>
              <w:pPr><w:jc w:val="center"/></w:pPr>
              <w:r>
                <w:drawing>
                  <wp:inline distT="0" distB="0" distL="0" distR="0">
                    <wp:extent cx="${cx}" cy="${cy}"/>
                    <wp:docPr id="${imageCounter}" name="Halaman ${pNum}"/>
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
        }
      }
    }

    // Tambahkan baris-baris teks sebagai paragraf Word yang dapat diedit
    let prevY: number | null = null;
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
    }

    // Tambahkan Page Break antar halaman kecuali halaman terakhir
    if (pNum < ePage) {
      bodyParts.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);
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

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:body>
    ${bodyParts.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
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
