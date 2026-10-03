import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { TextBox, FontFamily } from './TextPropertiesPanel';

export const CUSTOM_FONTS: Record<
  string,
  {
    regular: string;
    bold?: string;
    italic?: string;
    fallbackFamily: 'Helvetica' | 'Times Roman' | 'Courier';
  }
> = {
  Calibri: {
    regular: 'https://cdn.jsdelivr.net/fontsource/fonts/carlito@latest/latin-400-normal.ttf',
    bold: 'https://cdn.jsdelivr.net/fontsource/fonts/carlito@latest/latin-700-normal.ttf',
    italic: 'https://cdn.jsdelivr.net/fontsource/fonts/carlito@latest/latin-400-italic.ttf',
    fallbackFamily: 'Helvetica',
  },
  Roboto: {
    regular: 'https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-400-normal.ttf',
    bold: 'https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf',
    italic: 'https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-400-italic.ttf',
    fallbackFamily: 'Helvetica',
  },
  Garamond: {
    regular: 'https://cdn.jsdelivr.net/fontsource/fonts/eb-garamond@latest/latin-400-normal.ttf',
    bold: 'https://cdn.jsdelivr.net/fontsource/fonts/eb-garamond@latest/latin-700-normal.ttf',
    italic: 'https://cdn.jsdelivr.net/fontsource/fonts/eb-garamond@latest/latin-400-italic.ttf',
    fallbackFamily: 'Times Roman',
  },
  Caveat: {
    regular: 'https://cdn.jsdelivr.net/fontsource/fonts/caveat@latest/latin-400-normal.ttf',
    bold: 'https://cdn.jsdelivr.net/fontsource/fonts/caveat@latest/latin-700-normal.ttf',
    fallbackFamily: 'Helvetica',
  },
};

const fontBytesCache = new Map<string, ArrayBuffer>();

export const fetchFontBytes = async (url: string): Promise<ArrayBuffer> => {
  if (fontBytesCache.has(url)) return fontBytesCache.get(url)!;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Gagal mengunduh font: ${url}`);
  const buffer = await response.arrayBuffer();
  fontBytesCache.set(url, buffer);
  return buffer;
};

export const getCssFontFamily = (family: FontFamily): string => {
  switch (family) {
    case 'Calibri':
      return '"Carlito", Calibri, "Segoe UI", sans-serif';
    case 'Roboto':
      return 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif';
    case 'Times Roman':
      return '"Times New Roman", Times, serif';
    case 'Garamond':
      return '"EB Garamond", Garamond, Georgia, serif';
    case 'Courier':
      return '"Courier New", Courier, monospace';
    case 'Caveat':
      return '"Caveat", cursive, sans-serif';
    case 'Helvetica':
    default:
      return 'Helvetica, Arial, sans-serif';
  }
};

export const sanitizeTextForPdf = (input: string, isStandardFont: boolean = true): string => {
  if (!input) return '';
  const normalized = input
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2022\u2023\u25E6\u2043]/g, '*')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u00A0\u202F\u2007]/g, ' ');
  if (isStandardFont) {
    return normalized.replace(/[^\x20-\x7E\xA0-\xFF\n\r]/g, '');
  }
  return normalized;
};

export const renderTextBoxesToPdf = async (
  pdfDoc: PDFDocument,
  textBoxes: TextBox[],
  pagePreviews: { width: number; height: number }[],
  onProgress?: (msg: string) => void
) => {
  const fontkitLib = (window as any).fontkit;
  if (fontkitLib && typeof pdfDoc.registerFontkit === 'function') {
    try {
      pdfDoc.registerFontkit(fontkitLib);
    } catch {}
  }

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const timesBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const courierOblique = await pdfDoc.embedFont(StandardFonts.CourierOblique);
  const courierBoldOblique = await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);

  const selectStandardFont = (
    family: 'Helvetica' | 'Times Roman' | 'Courier',
    isBold: boolean,
    isItalic: boolean
  ) => {
    if (family === 'Times Roman') {
      if (isBold && isItalic) return timesBoldItalic;
      if (isBold) return timesBold;
      if (isItalic) return timesItalic;
      return times;
    }
    if (family === 'Courier') {
      if (isBold && isItalic) return courierBoldOblique;
      if (isBold) return courierBold;
      if (isItalic) return courierOblique;
      return courier;
    }
    if (isBold && isItalic) return helveticaBoldOblique;
    if (isBold) return helveticaBold;
    if (isItalic) return helveticaOblique;
    return helvetica;
  };

  const embeddedCustomFonts = new Map<string, any>();
  const resolveFont = async (family: FontFamily, isBold: boolean, isItalic: boolean) => {
    const customDef = CUSTOM_FONTS[family];
    if (customDef && fontkitLib) {
      let url = customDef.regular;
      if (isBold && customDef.bold) url = customDef.bold;
      else if (isItalic && customDef.italic) url = customDef.italic;

      if (embeddedCustomFonts.has(url)) return embeddedCustomFonts.get(url);
      try {
        if (onProgress) onProgress(`Memuat font ${family}...`);
        const bytes = await fetchFontBytes(url);
        const embedded = await pdfDoc.embedFont(bytes);
        embeddedCustomFonts.set(url, embedded);
        return embedded;
      } catch {
        return selectStandardFont(customDef.fallbackFamily, isBold, isItalic);
      }
    }
    if (family === 'Times Roman') return selectStandardFont('Times Roman', isBold, isItalic);
    if (family === 'Courier') return selectStandardFont('Courier', isBold, isItalic);
    return selectStandardFont('Helvetica', isBold, isItalic);
  };

  const pages = pdfDoc.getPages();
  for (const box of textBoxes) {
    if (box.pageIndex >= pages.length) continue;
    const page = pages[box.pageIndex];
    const preview = pagePreviews[box.pageIndex];
    if (!preview) continue;

    const { width: pageWidth, height: pageHeight } = page.getSize();
    const scaleX = pageWidth / preview.width;
    const scaleY = pageHeight / preview.height;

    const font = await resolveFont(box.fontFamily, box.isBold, box.isItalic);
    const pdfFontSize = box.fontSize * scaleY;
    const lineHeight = pdfFontSize * 1.25;

    const isStandard =
      box.fontFamily === 'Helvetica' || box.fontFamily === 'Times Roman' || box.fontFamily === 'Courier';
    const cleanText = sanitizeTextForPdf(box.text, isStandard);
    const lines = cleanText.split('\n');

    let maxLineWidth = 0;
    const lineWidths = lines.map((line) => {
      const w = font.widthOfTextAtSize(line || ' ', pdfFontSize);
      if (w > maxLineWidth) maxLineWidth = w;
      return w;
    });

    const totalTextHeight = lines.length * lineHeight;
    const textOpacity = Math.max(0.1, Math.min(box.opacity ?? 1.0, 1.0));

    // Optional background highlight
    if (box.backgroundColor) {
      const hexBg = box.backgroundColor.replace('#', '');
      const r = parseInt(hexBg.substring(0, 2), 16) / 255;
      const g = parseInt(hexBg.substring(2, 4), 16) / 255;
      const b = parseInt(hexBg.substring(4, 6), 16) / 255;

      page.drawRectangle({
        x: box.x * scaleX - 4,
        y: pageHeight - box.y * scaleY - totalTextHeight - 2,
        width: maxLineWidth + 8,
        height: totalTextHeight + 4,
        color: rgb(r, g, b),
        opacity: textOpacity,
      });
    }

    const hexColor = (box.color || '#000000').replace('#', '');
    const cr = parseInt(hexColor.substring(0, 2), 16) / 255;
    const cg = parseInt(hexColor.substring(2, 4), 16) / 255;
    const cb = parseInt(hexColor.substring(4, 6), 16) / 255;

    lines.forEach((line, lineIndex) => {
      const currentLineWidth = lineWidths[lineIndex];
      let alignOffset = 0;
      if (box.align === 'center') alignOffset = (maxLineWidth - currentLineWidth) / 2;
      else if (box.align === 'right') alignOffset = maxLineWidth - currentLineWidth;

      const posX = box.x * scaleX + alignOffset;
      const posY = pageHeight - box.y * scaleY - (lineIndex + 1) * lineHeight + lineHeight * 0.2;

      page.drawText(line, {
        x: posX,
        y: posY,
        size: pdfFontSize,
        font,
        color: rgb(cr, cg, cb),
        opacity: textOpacity,
      });
    });
  }
};
