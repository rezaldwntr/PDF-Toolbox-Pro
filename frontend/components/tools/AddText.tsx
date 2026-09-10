
import React, { useState, useRef, useCallback, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import {
  Type,
  Plus,
  Trash2,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  RotateCcw,
  CheckCircle2,
  FileText
} from 'lucide-react';

// Global declaration for pdfjsLib from CDN
declare const pdfjsLib: any;

interface PdfFileWithBuffer {
  file: File;
  buffer: ArrayBuffer;
}

interface PagePreview {
  url: string;
  width: number;
  height: number;
}

export type TextAlignment = 'left' | 'center' | 'right';
export type FontFamily = 
  | 'Helvetica' 
  | 'Times Roman' 
  | 'Calibri'
  | 'Roboto'
  | 'Garamond'
  | 'Courier'
  | 'Caveat';

interface TextBox {
  id: string;
  text: string;
  x: number;
  y: number;
  pageIndex: number;
  fontSize: number;
  fontFamily: FontFamily;
  color: string; // Hex color
  isBold: boolean;
  isItalic: boolean;
  align: TextAlignment;
  opacity: number; // 0.1 to 1.0
  backgroundColor?: string; // Hex color or undefined
}

// Konfigurasi URL font kustom (TTF) yang bersumber dari Fontsource / jsDelivr
const CUSTOM_FONTS: Record<string, {
  regular: string;
  bold?: string;
  italic?: string;
  fallbackFamily: 'Helvetica' | 'Times Roman' | 'Courier';
}> = {
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

// Cache font bytes in-memory agar unduhan font hanya dilakukan sekali
const fontBytesCache = new Map<string, ArrayBuffer>();

const fetchFontBytes = async (url: string): Promise<ArrayBuffer> => {
  if (fontBytesCache.has(url)) {
    return fontBytesCache.get(url)!;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gagal mengunduh font: ${url} (status: ${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  fontBytesCache.set(url, buffer);
  return buffer;
};

// Pemetaan CSS font-family untuk kanvas pratinjau browser
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

// Sanitasi teks untuk mencegah crash WinAnsi encoding pada standard fonts PDF
const sanitizeTextForPdf = (input: string, isStandardFont: boolean = true): string => {
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

const PRESET_COLORS = ['#000000', '#1E40AF', '#DC2626', '#16A34A', '#D97706', '#9333EA', '#FFFFFF'];

const AddText: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [fileWithBuffer, setFileWithBuffer] = useState<PdfFileWithBuffer | null>(null);
  const [pagePreviews, setPagePreviews] = useState<PagePreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();
  const { quota, consumeQuota, checkQuotaBeforeAction, setShowLimitModal } = useQuota();

  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    if (pageContainerRef.current) {
      const activeEl = pageContainerRef.current.querySelector(`[data-page-index="${activePageIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activePageIndex]);

  const resetState = useCallback(() => {
    setFileWithBuffer(null);
    setPagePreviews([]);
    setIsProcessing(false);
    setProcessingMessage('');
    setTextBoxes([]);
    setSelectedBoxId(null);
    setEditingBoxId(null);
    setActivePageIndex(0);
    setZoom(1.0);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
  }, [outputUrl]);

  const handleFileChange = async (files: FileList | null) => {
    const selectedFile = files ? files[0] : null;
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;
    resetState();
    setIsProcessing(true);
    setProcessingMessage('Membaca file dan merender pratinjau...');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      setFileWithBuffer({ file: selectedFile, buffer: arrayBuffer });

      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
      
      const previews: PagePreview[] = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for better quality editing
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
        previews.push({
          url: canvas.toDataURL('image/png'),
          width: viewport.width,
          height: viewport.height
        });
      }
      setPagePreviews(previews);
      setActivePageIndex(0);
    } catch (error) {
      console.error("Gagal memuat PDF:", error);
      addToast("Gagal memuat file PDF. Pastikan file tidak rusak.", 'error');
      resetState();
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Menambah kotak teks baru
  const addTextBox = (targetPage?: number, customX?: number, customY?: number) => {
    if (pagePreviews.length === 0) return;
    const pageIdx = targetPage !== undefined ? targetPage : activePageIndex;
    const page = pagePreviews[pageIdx];
    const newId = `box-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Default di tengah halaman atau pada koordinat klik
    const posX = customX !== undefined ? Math.max(10, Math.min(customX, page.width - 150)) : (page.width / 2) - 75;
    const posY = customY !== undefined ? Math.max(10, Math.min(customY, page.height - 50)) : (page.height / 3);

    const newBox: TextBox = {
      id: newId,
      text: 'Ketik teks di sini',
      x: Math.round(posX),
      y: Math.round(posY),
      pageIndex: pageIdx,
      fontSize: 20,
      fontFamily: 'Helvetica',
      color: '#000000',
      isBold: false,
      isItalic: false,
      align: 'left',
      opacity: 1.0,
      backgroundColor: undefined,
    };

    setTextBoxes(prev => [...prev, newBox]);
    setSelectedBoxId(newId);
    setEditingBoxId(newId);
  };

  const updateTextBox = (id: string, updates: Partial<TextBox>) => {
    setTextBoxes(prev => prev.map(box => box.id === id ? { ...box, ...updates } : box));
  };

  const duplicateTextBox = (id: string) => {
    const box = textBoxes.find(b => b.id === id);
    if (!box) return;
    const newId = `box-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newBox: TextBox = {
      ...box,
      id: newId,
      x: box.x + 20,
      y: box.y + 20,
    };
    setTextBoxes(prev => [...prev, newBox]);
    setSelectedBoxId(newId);
    addToast('Teks berhasil diduplikasi', 'info');
  };

  const deleteTextBox = (id: string) => {
    setTextBoxes(prev => prev.filter(box => box.id !== id));
    if (selectedBoxId === id) setSelectedBoxId(null);
    if (editingBoxId === id) setEditingBoxId(null);
  };

  // Interaksi Drag Kotak Teks
  const handleBoxPointerDown = (e: React.PointerEvent, id: string) => {
    if (editingBoxId === id) return; // Izinkan seleksi teks saat sedang mengedit inline
    e.preventDefault();
    e.stopPropagation();
    setSelectedBoxId(id);
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetX = (e.clientX - rect.left) / zoom;
    const offsetY = (e.clientY - rect.top) / zoom;
    
    setDragState({ id, offsetX, offsetY });
  };

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      
      setTextBoxes(prev => prev.map(box => {
        if (box.id === dragState.id) {
          const pageEl = document.querySelector(`[data-page-index="${box.pageIndex}"]`) as HTMLElement;
          if (!pageEl) return box;
          const pageRect = pageEl.getBoundingClientRect();
          const preview = pagePreviews[box.pageIndex];
          
          let newX = (e.clientX - pageRect.left) / zoom - dragState.offsetX;
          let newY = (e.clientY - pageRect.top) / zoom - dragState.offsetY;

          // Batasi agar tidak keluar halaman
          newX = Math.max(0, Math.min(newX, preview.width - 40));
          newY = Math.max(0, Math.min(newY, preview.height - 20));

          return { ...box, x: Math.round(newX), y: Math.round(newY) };
        }
        return box;
      }));
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, zoom, pagePreviews]);

  // Click-to-place: klik pada halaman untuk menambahkan teks langsung
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
    if ((e.target as HTMLElement).closest('[data-textbox]')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom;
    const clickY = (e.clientY - rect.top) / zoom;

    setActivePageIndex(pageIndex);
    addTextBox(pageIndex, clickX, clickY);
  };


  // Menyimpan PDF Akhir dengan Penataan Vektor Presisi
  const handleSave = async () => {
    if (!fileWithBuffer || textBoxes.length === 0) {
      addToast('Tambahkan setidaknya satu teks sebelum menyimpan.', 'warning');
      return;
    }

    if (!checkQuotaBeforeAction()) {
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Menyimpan teks ke dalam PDF...');

    try {
      const pdfDoc = await PDFDocument.load(fileWithBuffer.buffer.slice(0));

      // 1. Inisialisasi fontkit jika tersedia di window
      const fontkitLib = (window as any).fontkit;
      if (fontkitLib && typeof pdfDoc.registerFontkit === 'function') {
        try {
          pdfDoc.registerFontkit(fontkitLib);
        } catch (e) {
          console.warn('Fontkit registration warning:', e);
        }
      }

      // 2. Embed Matrix Font Standar (12 varian lengkap)
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

      const selectStandardFont = (family: 'Helvetica' | 'Times Roman' | 'Courier', isBold: boolean, isItalic: boolean) => {
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

      // 3. Dynamic Font Resolver (Custom TTF Embed + Graceful Fallback)
      const embeddedCustomFonts = new Map<string, any>();

      const resolveFont = async (family: FontFamily, isBold: boolean, isItalic: boolean) => {
        const customDef = CUSTOM_FONTS[family];
        if (customDef && fontkitLib) {
          let url = customDef.regular;
          if (isBold && customDef.bold) {
            url = customDef.bold;
          } else if (isItalic && customDef.italic) {
            url = customDef.italic;
          }

          if (embeddedCustomFonts.has(url)) {
            return embeddedCustomFonts.get(url);
          }

          try {
            setProcessingMessage(`Memuat font ${family}...`);
            const bytes = await fetchFontBytes(url);
            const embedded = await pdfDoc.embedFont(bytes);
            embeddedCustomFonts.set(url, embedded);
            return embedded;
          } catch (err) {
            console.warn(`Fallback font ${family} (${url}) ke standar:`, err);
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

        // Sanitasi teks (hanya karakter standard font yang di-filter ketat)
        const isStandard = box.fontFamily === 'Helvetica' || box.fontFamily === 'Times Roman' || box.fontFamily === 'Courier';
        const cleanText = sanitizeTextForPdf(box.text, isStandard);
        const lines = cleanText.split('\n');

        // Hitung lebar baris terpanjang untuk alignment dan background
        let maxLineWidth = 0;
        const lineWidths = lines.map(line => {
          const w = font.widthOfTextAtSize(line || ' ', pdfFontSize);
          if (w > maxLineWidth) maxLineWidth = w;
          return w;
        });

        const totalTextHeight = lines.length * lineHeight;
        const textOpacity = Math.max(0.1, Math.min(box.opacity ?? 1.0, 1.0));

        // Gambar Latar Belakang jika diaktifkan
        if (box.backgroundColor) {
          const bgR = parseInt(box.backgroundColor.slice(1, 3), 16) / 255;
          const bgG = parseInt(box.backgroundColor.slice(3, 5), 16) / 255;
          const bgB = parseInt(box.backgroundColor.slice(5, 7), 16) / 255;

          page.drawRectangle({
            x: (box.x * scaleX) - 4,
            y: pageHeight - (box.y * scaleY) - totalTextHeight + (pdfFontSize * 0.2),
            width: maxLineWidth + 8,
            height: totalTextHeight + 4,
            color: rgb(bgR, bgG, bgB),
            opacity: textOpacity * 0.9,
          });
        }

        // Parse Warna Teks
        const r = parseInt(box.color.slice(1, 3), 16) / 255;
        const g = parseInt(box.color.slice(3, 5), 16) / 255;
        const b = parseInt(box.color.slice(5, 7), 16) / 255;

        // Gambar tiap baris teks dengan kalkulasi perataan (*Text Alignment*)
        lines.forEach((line, lineIdx) => {
          const lineWidth = lineWidths[lineIdx];
          let alignOffsetX = 0;
          if (box.align === 'center') {
            alignOffsetX = (maxLineWidth - lineWidth) / 2;
          } else if (box.align === 'right') {
            alignOffsetX = maxLineWidth - lineWidth;
          }

          const lineX = (box.x * scaleX) + alignOffsetX;
          const lineY = pageHeight - (box.y * scaleY) - (lineIdx + 0.8) * lineHeight;

          page.drawText(line, {
            x: lineX,
            y: lineY,
            size: pdfFontSize,
            font: font,
            color: rgb(r, g, b),
            opacity: textOpacity,
          });
        });
      }

      const finalPdfBytes = await pdfDoc.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      setOutputUrl(URL.createObjectURL(blob));
      consumeQuota();
      addToast('PDF berhasil diperbarui dan disimpan!', 'success');

    } catch (error) {
      console.error("Gagal menyimpan PDF:", error);
      addToast("Terjadi kesalahan saat menyimpan teks ke PDF.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedBox = textBoxes.find(b => b.id === selectedBoxId);

  const renderContent = () => {
    // 1. Success State
    if (outputUrl) {
      return (
        <div className="text-center text-slate-600 dark:text-slate-300 flex flex-col items-center gap-6 animate-fade-in py-12">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Teks Berhasil Ditambahkan!</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Dokumen PDF Anda telah diperbarui dengan teks dan pemformatan presisi.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            <a
              href={outputUrl}
              download={`${fileWithBuffer?.file.name.replace('.pdf', '') || 'dokumen'}-diedit.pdf`}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/25"
            >
              <Download className="w-5 h-5" /> Unduh Dokumen PDF
            </a>
            <button
              onClick={resetState}
              className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-3 px-6 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Edit Dokumen Lain
            </button>
          </div>
        </div>
      );
    }

    // 2. Loading State
    if (isProcessing && pagePreviews.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-lg text-slate-800 dark:text-slate-200 font-semibold">{processingMessage}</p>
        </div>
      );
    }

    // 3. Upload State
    if (!fileWithBuffer) {
      return (
        <FileUploader
          onFileSelect={handleFileChange}
          label="Pilih PDF untuk Tambah Teks"
          description="Tambahkan teks, catatan, paraf, atau stempel tulisan langsung ke halaman PDF"
        />
      );
    }

    // 4. Editor Workspace
    return (
      <div className="flex flex-col gap-4">
        {/* Main Toolbar */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-700 shadow-sm flex-wrap sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">{fileWithBuffer.file.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{pagePreviews.length} Halaman &bull; {textBoxes.length} Kotak Teks</p>
            </div>
          </div>

          {/* Quick Page Nav */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
            <button
              onClick={() => setActivePageIndex(p => Math.max(0, p - 1))}
              disabled={activePageIndex === 0}
              title="Halaman Sebelumnya"
              className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 rounded-lg disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 px-2 select-none">
              Hal {activePageIndex + 1} / {pagePreviews.length}
            </span>
            <button
              onClick={() => setActivePageIndex(p => Math.min(pagePreviews.length - 1, p + 1))}
              disabled={activePageIndex >= pagePreviews.length - 1}
              title="Halaman Selanjutnya"
              className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 rounded-lg disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => addTextBox(activePageIndex)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Tambah Teks
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl transition-colors text-xs shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {isProcessing ? 'Menyimpan...' : 'Simpan PDF'}
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Canvas Area (3 Cols) */}
          <div className="lg:col-span-3 relative flex flex-col items-center">
            <div
              ref={pageContainerRef}
              className="w-full bg-slate-100 dark:bg-slate-900/80 p-6 rounded-2xl max-h-[78vh] overflow-auto border border-slate-200 dark:border-slate-800 shadow-inner flex flex-col items-center gap-8"
            >
              {pagePreviews.map((page, index) => {
                const isActive = activePageIndex === index;

                return (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs">
                      Halaman {index + 1}
                    </span>

                    <div
                      data-page-index={index}
                      onClick={e => handlePageClick(e, index)}
                      style={{
                        width: page.width * zoom,
                        height: page.height * zoom,
                      }}
                      className={`relative bg-white shadow-xl transition-all select-none cursor-crosshair rounded-xs ${
                        isActive ? 'ring-2 ring-blue-500/40' : 'opacity-95'
                      }`}
                    >
                      <img
                        src={page.url}
                        alt={`Halaman ${index + 1}`}
                        style={{ width: page.width * zoom, height: page.height * zoom }}
                        className="pointer-events-none select-none w-full h-full"
                      />

                      {/* Text Boxes on this page */}
                      {textBoxes
                        .filter(b => b.pageIndex === index)
                        .map(box => {
                          const isSelected = selectedBoxId === box.id;
                          const isEditing = editingBoxId === box.id;

                          return (
                            <div
                              key={box.id}
                              data-textbox="true"
                              onPointerDown={e => handleBoxPointerDown(e, box.id)}
                              onDoubleClick={e => {
                                e.stopPropagation();
                                setEditingBoxId(box.id);
                              }}
                              style={{
                                left: box.x * zoom,
                                top: box.y * zoom,
                                fontSize: box.fontSize * zoom,
                                fontFamily: getCssFontFamily(box.fontFamily),
                                color: box.color,
                                fontWeight: box.isBold ? 'bold' : 'normal',
                                fontStyle: box.isItalic ? 'italic' : 'normal',
                                textAlign: box.align,
                                backgroundColor: box.backgroundColor || 'transparent',
                                opacity: box.opacity ?? 1.0,
                                padding: `${2 * zoom}px ${6 * zoom}px`,
                                borderRadius: '4px',
                                lineHeight: 1.25,
                              }}
                              className={`absolute cursor-move select-none transition-all whitespace-pre-wrap ${
                                isSelected
                                  ? 'ring-2 ring-blue-500 shadow-lg z-20'
                                  : 'hover:ring-1 hover:ring-blue-400/80 z-10'
                              }`}
                            >
                              {isEditing ? (
                                <textarea
                                  autoFocus
                                  value={box.text}
                                  onChange={e => updateTextBox(box.id, { text: e.target.value })}
                                  onBlur={() => setEditingBoxId(null)}
                                  onKeyDown={e => {
                                    if (e.key === 'Escape') setEditingBoxId(null);
                                  }}
                                  style={{
                                    fontSize: 'inherit',
                                    fontFamily: 'inherit',
                                    color: 'inherit',
                                    fontWeight: 'inherit',
                                    fontStyle: 'inherit',
                                    textAlign: box.align,
                                    minWidth: '100px',
                                  }}
                                  className="bg-transparent border-0 outline-none resize-none p-0 m-0 w-full overflow-hidden"
                                  rows={box.text.split('\n').length || 1}
                                />
                              ) : (
                                <span>{box.text || <em className="text-slate-400">Klik 2x untuk ketik</em>}</span>
                              )}

                              {/* Floating action buttons when selected */}
                              {isSelected && !isEditing && (
                                <div className="absolute -top-3.5 -right-3.5 flex items-center gap-1 z-30">
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      duplicateTextBox(box.id);
                                    }}
                                    title="Duplikat Teks"
                                    className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 transition-colors"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      deleteTextBox(box.id);
                                    }}
                                    title="Hapus Teks"
                                    className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating Zoom Bar */}
            <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xl">
              <button
                onClick={() => setZoom(z => Math.max(0.5, Number((z - 0.1).toFixed(1))))}
                className="p-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-colors"
                title="Perkecil"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 w-12 text-center select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(2.0, Number((z + 0.1).toFixed(1))))}
                className="p-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-colors"
                title="Perbesar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(1.0)}
                className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 ml-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Right Properties Panel (1 Col) */}
          <div className="lg:col-span-1">
            {selectedBox ? (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm transition-colors sticky top-20 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                    <Type className="w-4 h-4 text-blue-500" /> Format Teks
                  </h3>
                  <span className="text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                    Hal {selectedBox.pageIndex + 1}
                  </span>
                </div>

                {/* Text Content Area */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Konten Teks (Mendukung Enter)
                  </label>
                  <textarea
                    rows={3}
                    value={selectedBox.text}
                    onChange={e => updateTextBox(selectedBox.id, { text: e.target.value })}
                    className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                    placeholder="Tuliskan teks di sini..."
                  />
                </div>

                {/* Font Family & Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Jenis Font</label>
                    <select
                      value={selectedBox.fontFamily}
                      onChange={e => updateTextBox(selectedBox.id, { fontFamily: e.target.value as FontFamily })}
                      className="w-full p-2 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <optgroup label="Standar & Dokumen Bisnis">
                        <option value="Helvetica">Arial / Helvetica (Standar)</option>
                        <option value="Calibri">Calibri (Microsoft Word)</option>
                        <option value="Roboto">Roboto (Google / Modern)</option>
                      </optgroup>
                      <optgroup label="Resmi, Hukum & Akademik">
                        <option value="Times Roman">Times New Roman (Skripsi/Dinas)</option>
                        <option value="Garamond">Garamond (Elegan/Buku)</option>
                      </optgroup>
                      <optgroup label="Faktur & Tabel">
                        <option value="Courier">Courier New (Monospace)</option>
                      </optgroup>
                      <optgroup label="Tulisan Tangan & Catatan">
                        <option value="Caveat">Caveat (Gaya Tangan / Paraf)</option>
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Ukuran Font</label>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateTextBox(selectedBox.id, { fontSize: Math.max(8, selectedBox.fontSize - 2) })}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 text-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="8"
                        max="120"
                        value={selectedBox.fontSize}
                        onChange={e => updateTextBox(selectedBox.id, { fontSize: Math.max(8, Number(e.target.value)) })}
                        className="w-full p-1.5 text-center text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                      />
                      <button
                        onClick={() => updateTextBox(selectedBox.id, { fontSize: Math.min(120, selectedBox.fontSize + 2) })}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Gaya & Perataan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Gaya & Perataan</label>
                  <div className="flex items-center justify-between gap-1 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateTextBox(selectedBox.id, { isBold: !selectedBox.isBold })}
                        className={`p-1.5 rounded-lg transition-colors ${
                          selectedBox.isBold
                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Tebal (Bold)"
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateTextBox(selectedBox.id, { isItalic: !selectedBox.isItalic })}
                        className={`p-1.5 rounded-lg transition-colors ${
                          selectedBox.isItalic
                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Miring (Italic)"
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateTextBox(selectedBox.id, { align: 'left' })}
                        className={`p-1.5 rounded-lg transition-colors ${
                          selectedBox.align === 'left'
                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Rata Kiri"
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateTextBox(selectedBox.id, { align: 'center' })}
                        className={`p-1.5 rounded-lg transition-colors ${
                          selectedBox.align === 'center'
                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Rata Tengah"
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateTextBox(selectedBox.id, { align: 'right' })}
                        className={`p-1.5 rounded-lg transition-colors ${
                          selectedBox.align === 'right'
                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Rata Kanan"
                      >
                        <AlignRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Warna Teks & Presets */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Warna Teks</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedBox.color}
                      onChange={e => updateTextBox(selectedBox.id, { color: e.target.value })}
                      className="w-8 h-8 p-0.5 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer bg-white dark:bg-slate-700"
                      title="Pilih Warna Kustom"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => updateTextBox(selectedBox.id, { color: c })}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border transition-transform ${
                            selectedBox.color.toLowerCase() === c.toLowerCase()
                              ? 'scale-110 ring-2 ring-blue-500 ring-offset-1 border-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Transparansi / Opacity Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Transparansi (Opacity)</label>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {Math.round((selectedBox.opacity ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={selectedBox.opacity ?? 1.0}
                    onChange={e => updateTextBox(selectedBox.id, { opacity: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Latar Belakang Kotak Teks */}
                <div className="pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!selectedBox.backgroundColor}
                        onChange={e =>
                          updateTextBox(selectedBox.id, {
                            backgroundColor: e.target.checked ? '#FFFF00' : undefined,
                          })
                        }
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      Sorotan Latar (Highlight)
                    </label>
                    {selectedBox.backgroundColor && (
                      <input
                        type="color"
                        value={selectedBox.backgroundColor}
                        onChange={e => updateTextBox(selectedBox.id, { backgroundColor: e.target.value })}
                        className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer"
                      />
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                  <button
                    onClick={() => duplicateTextBox(selectedBox.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold py-2 px-3 rounded-xl transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Duplikat
                  </button>
                  <button
                    onClick={() => deleteTextBox(selectedBox.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 text-xs font-semibold py-2 px-3 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 rounded-2xl text-center flex flex-col items-center justify-center h-64 sticky top-20">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 mb-3">
                  <Type className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Belum Ada Teks Dipilih</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[180px]">
                  Klik salah satu teks di kanvas untuk mengedit properti atau klik tombol <strong>Tambah Teks</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ToolContainer title="Tambahkan Teks ke PDF" onBack={onBack} maxWidth="max-w-7xl">
      <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileChange(e.target.files)} />
      {renderContent()}
    </ToolContainer>
  );
};

export default AddText;
