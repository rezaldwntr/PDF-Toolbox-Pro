import React, { useState, useRef, useEffect, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';
import {
  Crop,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  FileText,
  Sliders,
  CheckCircle2,
  Layers,
  Sparkles,
  Info,
  RotateCcw,
  Square,
  RectangleHorizontal,
  X
} from 'lucide-react';

declare const pdfjsLib: any;

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type AspectRatio = 'free' | '1:1' | 'a4' | '16:9';
type PageSelection = 'all' | 'current' | 'custom';

const CropPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // State Area Pangkas (Pixel relatif terhadap canvas preview)
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, width: 0, height: 0 });
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');
  const [pageSelection, setPageSelection] = useState<PageSelection>('all');
  const [customPages, setCustomPages] = useState<string>('');

  // Status Interaksi Drag & Resize
  const [isDraggingBox, setIsDraggingBox] = useState<boolean>(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [isDrawingNew, setIsDrawingNew] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; box: CropBox }>({
    x: 0,
    y: 0,
    box: { x: 0, y: 0, width: 0, height: 0 }
  });

  // State Pemrosesan & Hasil
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();

  // 1. Tangani pemilihan berkas PDF
  const handlePdfSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      addToast('Harap pilih berkas berekstensi .PDF', 'error');
      return;
    }

    setFile(selected);
    setResultUrl(null);
    setResultSize(null);
    setCurrentPage(1);

    try {
      const buffer = await selected.arrayBuffer();
      if (typeof pdfjsLib !== 'undefined') {
        const loadedDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
        setPdfDoc(loadedDoc);
        setTotalPages(loadedDoc.numPages);
      }
    } catch (err: any) {
      console.error('Gagal memuat pratinjau PDF:', err);
      addToast('Gagal membaca struktur berkas PDF.', 'error');
    }
  };

  // 2. Render halaman PDF ke canvas
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = Math.min(canvas.parentElement?.clientWidth || 500, 560);
      const scale = containerWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale });

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      ctx.scale(dpr, dpr);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;

      setCanvasDimensions({ width: viewport.width, height: viewport.height });

      // Inisialisasi kotak pangkas default (margin 8% di setiap sisi) jika belum ada
      setCropBox(prev => {
        if (prev.width > 0 && prev.height > 0) {
          // Sesuaikan proporsi bila canvas berubah
          return prev;
        }
        const insetX = viewport.width * 0.08;
        const insetY = viewport.height * 0.08;
        return {
          x: Math.round(insetX),
          y: Math.round(insetY),
          width: Math.round(viewport.width - insetX * 2),
          height: Math.round(viewport.height - insetY * 2),
        };
      });
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
      }
    }
  }, [pdfDoc]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, renderPage]);

  // 3. Reset Area Pangkas
  const handleResetCrop = () => {
    if (canvasDimensions.width <= 0 || canvasDimensions.height <= 0) return;
    const insetX = canvasDimensions.width * 0.08;
    const insetY = canvasDimensions.height * 0.08;
    setCropBox({
      x: Math.round(insetX),
      y: Math.round(insetY),
      width: Math.round(canvasDimensions.width - insetX * 2),
      height: Math.round(canvasDimensions.height - insetY * 2),
    });
    setAspectRatio('free');
  };

  // Set Preset Margin Cepat
  const applyQuickMargin = (pct: number) => {
    if (canvasDimensions.width <= 0 || canvasDimensions.height <= 0) return;
    const insetX = canvasDimensions.width * (pct / 100);
    const insetY = canvasDimensions.height * (pct / 100);
    setCropBox({
      x: Math.round(insetX),
      y: Math.round(insetY),
      width: Math.round(canvasDimensions.width - insetX * 2),
      height: Math.round(canvasDimensions.height - insetY * 2),
    });
  };

  // 4. Logika Interaksi Pointer Drag & Resize
  const handlePointerDownBox = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDraggingBox(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      box: { ...cropBox }
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerDownHandle = (e: React.PointerEvent, handleName: string) => {
    e.stopPropagation();
    setActiveHandle(handleName);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      box: { ...cropBox }
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerDownOverlay = (e: React.PointerEvent) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const startX = Math.max(0, Math.min(e.clientX - rect.left, canvasDimensions.width));
    const startY = Math.max(0, Math.min(e.clientY - rect.top, canvasDimensions.height));

    setIsDrawingNew(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      box: { x: startX, y: startY, width: 0, height: 0 }
    });
    overlayRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const minSize = 30;

    // A. Menggeser seluruh kotak seleksi
    if (isDraggingBox) {
      let newX = dragStart.box.x + dx;
      let newY = dragStart.box.y + dy;

      newX = Math.max(0, Math.min(newX, canvasDimensions.width - dragStart.box.width));
      newY = Math.max(0, Math.min(newY, canvasDimensions.height - dragStart.box.height));

      setCropBox({
        ...dragStart.box,
        x: Math.round(newX),
        y: Math.round(newY),
      });
      return;
    }

    // B. Mengubah ukuran dengan salah satu dari 8 titik handle
    if (activeHandle) {
      const orig = dragStart.box;
      let { x, y, width, height } = orig;

      // Handle horizontal
      if (activeHandle.includes('w')) {
        const potentialWidth = orig.width - dx;
        if (potentialWidth >= minSize) {
          x = Math.max(0, orig.x + dx);
          width = orig.x + orig.width - x;
        }
      } else if (activeHandle.includes('e')) {
        const potentialWidth = orig.width + dx;
        width = Math.max(minSize, Math.min(potentialWidth, canvasDimensions.width - orig.x));
      }

      // Handle vertikal
      if (activeHandle.includes('n')) {
        const potentialHeight = orig.height - dy;
        if (potentialHeight >= minSize) {
          y = Math.max(0, orig.y + dy);
          height = orig.y + orig.height - y;
        }
      } else if (activeHandle.includes('s')) {
        const potentialHeight = orig.height + dy;
        height = Math.max(minSize, Math.min(potentialHeight, canvasDimensions.height - orig.y));
      }

      setCropBox({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      });
      return;
    }

    // C. Menggambar kotak baru saat drag di luar seleksi
    if (isDrawingNew && overlayRef.current) {
      const rect = overlayRef.current.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(e.clientX - rect.left, canvasDimensions.width));
      const currentY = Math.max(0, Math.min(e.clientY - rect.top, canvasDimensions.height));

      const originX = dragStart.box.x;
      const originY = dragStart.box.y;

      const newX = Math.min(originX, currentX);
      const newY = Math.min(originY, currentY);
      const newW = Math.max(minSize, Math.abs(currentX - originX));
      const newH = Math.max(minSize, Math.abs(currentY - originY));

      setCropBox({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDraggingBox(false);
    setActiveHandle(null);
    setIsDrawingNew(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Abaikan jika pointer capture telah terlepas
    }
  };

  // 5. Eksekusi Pemotongan PDF (POST /tools/crop-pdf)
  const handleCropPdf = async () => {
    if (!file || canvasDimensions.width <= 0 || canvasDimensions.height <= 0) return;

    if (!checkQuotaBeforeAction()) return;

    // Normalisasi koordinat ke rasio 0.0 - 1.0
    const cropXRatio = Math.max(0, cropBox.x / canvasDimensions.width);
    const cropYRatio = Math.max(0, cropBox.y / canvasDimensions.height);
    const cropWRatio = Math.min(1.0 - cropXRatio, cropBox.width / canvasDimensions.width);
    const cropHRatio = Math.min(1.0 - cropYRatio, cropBox.height / canvasDimensions.height);

    setIsProcessing(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('crop_x', cropXRatio.toString());
    formData.append('crop_y', cropYRatio.toString());
    formData.append('crop_width', cropWRatio.toString());
    formData.append('crop_height', cropHRatio.toString());
    formData.append('page_selection', pageSelection);
    formData.append('current_page', currentPage.toString());
    if (pageSelection === 'custom' && customPages.trim()) {
      formData.append('custom_pages', customPages.trim());
    }

    try {
      const response = await fetch(`${BACKEND_URL}/tools/crop-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errDetail = 'Gagal memangkas berkas PDF';
        try {
          const errJson = await response.json();
          if (errJson.detail) errDetail = errJson.detail;
        } catch {
          // json parse fallback
        }
        addToast(errDetail, 'error');
        setIsProcessing(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize(blob.size);

      // Pengurangan kuota pemakaian
      consumeQuota();

      addToast('Berkas PDF berhasil dipangkas!', 'success');
    } catch (error: any) {
      console.error('Error crop PDF:', error);
      addToast(error.message || 'Terjadi kesalahan jaringan saat memproses pemangkasan berkas.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. Unduh berkas hasil crop
  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    const base = file.name.replace(/\.pdf$/i, '');
    link.download = `cropped-${base}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 7. Reset semua state untuk file baru
  const handleResetAll = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setFile(null);
    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);
    setResultUrl(null);
    setResultSize(null);
    setCropBox({ x: 0, y: 0, width: 0, height: 0 });
    setCanvasDimensions({ width: 0, height: 0 });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <ToolContainer
      title="Crop PDF"
      description="Pangkas margin berlebih atau potong area spesifik pada dokumen PDF Anda dengan presisi visual tinggi."
      onBack={onBack}
    >
      {/* =================================================================== */}
      {/* LANGKAH 1: UNGGAH DOKUMEN                                          */}
      {/* =================================================================== */}
      {!file && (
        <div className="max-w-2xl mx-auto space-y-6">
          <FileUploader
            onFileSelect={handlePdfSelect}
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={1}
            title="Pilih Berkas PDF untuk Dipangkas"
            subtitle="Seret berkas PDF ke sini atau klik untuk memilih dokumen dari komputer"
          />

          {/* Fitur Utama */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Crop className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Pangkas Visual</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Drag & resize 8 titik presisi</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Fleksibel Halaman</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Semua hal atau halaman aktif</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Kualitas Vektor</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Teks tetap tajam tanpa pecah</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LANGKAH 2: CROP STUDIO (CANVAS INTERAKTIF & SIDEBAR KONFIGURASI)   */}
      {/* =================================================================== */}
      {file && !resultUrl && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Bar Berkas & Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3 truncate">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                  {file.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatFileSize(file.size)} • {totalPages} Halaman
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetCrop}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Area
              </button>

              <button
                onClick={handleResetAll}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Ganti berkas"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ------------------------------------------------------------- */}
            {/* PANEL KIRI: VISUAL CROP CANVAS                                */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center">
              <div className="w-full bg-slate-100 dark:bg-slate-900/60 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center min-h-[480px] overflow-hidden">
                
                {/* Kontainer Canvas + Crop Overlay */}
                <div
                  ref={overlayRef}
                  onPointerDown={handlePointerDownOverlay}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative select-none shadow-lg rounded-sm overflow-hidden bg-white cursor-crosshair touch-none"
                  style={{
                    width: canvasDimensions.width > 0 ? `${canvasDimensions.width}px` : 'auto',
                    height: canvasDimensions.height > 0 ? `${canvasDimensions.height}px` : 'auto',
                  }}
                >
                  {/* Canvas Asli PDF */}
                  <canvas ref={canvasRef} className="block pointer-events-none" />

                  {/* Top Mask */}
                  <div
                    className="absolute bg-slate-900/65 pointer-events-none transition-all"
                    style={{
                      top: 0,
                      left: 0,
                      right: 0,
                      height: `${cropBox.y}px`,
                    }}
                  />

                  {/* Bottom Mask */}
                  <div
                    className="absolute bg-slate-900/65 pointer-events-none transition-all"
                    style={{
                      top: `${cropBox.y + cropBox.height}px`,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  />

                  {/* Left Mask */}
                  <div
                    className="absolute bg-slate-900/65 pointer-events-none transition-all"
                    style={{
                      top: `${cropBox.y}px`,
                      left: 0,
                      width: `${cropBox.x}px`,
                      height: `${cropBox.height}px`,
                    }}
                  />

                  {/* Right Mask */}
                  <div
                    className="absolute bg-slate-900/65 pointer-events-none transition-all"
                    style={{
                      top: `${cropBox.y}px`,
                      left: `${cropBox.x + cropBox.width}px`,
                      right: 0,
                      height: `${cropBox.height}px`,
                    }}
                  />

                  {/* Kotak Area Pangkas Aktif */}
                  <div
                    onPointerDown={handlePointerDownBox}
                    className="absolute border-2 border-blue-500 shadow-xs cursor-move"
                    style={{
                      left: `${cropBox.x}px`,
                      top: `${cropBox.y}px`,
                      width: `${cropBox.width}px`,
                      height: `${cropBox.height}px`,
                    }}
                  >
                    {/* Garis Grid Rule of Thirds Faint */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/20">
                      <div className="border-r border-b border-white/20" />
                      <div className="border-r border-b border-white/20" />
                      <div className="border-b border-white/20" />
                      <div className="border-r border-b border-white/20" />
                      <div className="border-r border-b border-white/20" />
                      <div className="border-b border-white/20" />
                      <div className="border-r border-white/20" />
                      <div className="border-r border-white/20" />
                      <div />
                    </div>

                    {/* Badge Dimensi / Proporsi */}
                    <div className="absolute -top-7 left-0 bg-blue-600 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-sm pointer-events-none">
                      {Math.round((cropBox.width / (canvasDimensions.width || 1)) * 100)}% ×{' '}
                      {Math.round((cropBox.height / (canvasDimensions.height || 1)) * 100)}%
                    </div>

                    {/* ======================================================= */}
                    {/* 8 TITIK HANDLE (CORNER & EDGES)                         */}
                    {/* ======================================================= */}
                    {/* Sudut Top-Left (NW) */}
                    <div
                      onPointerDown={e => handlePointerDownHandle(e, 'nw')}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs shadow-sm cursor-nwse-resize z-20"
                    />
                    {/* Sisi Top (N) */}
                    <div
                      onPointerDown={e => handlePointerDownHandle(e, 'n')}
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs shadow-sm cursor-ns-resize z-20"
                    />
                    {/* Sudut Top-Right (NE) */}
                    <div
                      onPointerDown={e => handlePointerDownHandle(e, 'ne')}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs shadow-sm cursor-nesw-resize z-20"
                    />
                    {/* Sisi Right (E) */}
                    <div
                      onPointerDown={e => handlePointerDownHandle(e, 'e')}
                      className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs shadow-sm cursor-ew-resize z-20"
                    />
                    {/* Sudut Bottom-Right (SE) */}
                    <div
                      onPointerDown={e => handlePointerDownHandle(e, 'se')}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs shadow-sm cursor-nwse-resize z-20"
                    />
                    {/* Sisi Bottom (S) */}
                    <div
                      onPointerDown={e => handlePointerDownHandle(e, 's')}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs shadow-sm cursor-ns-resize z-20"
                    />
                    {/* Sudut Bottom-Left (SW) */}
                    <div
                      onPointerDown={e => handlePointerDownHandle(e, 'sw')}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs shadow-sm cursor-nesw-resize z-20"
                    />
                    {/* Sisi Left (W) */}
                    <div
                      onPointerDown={e => handlePointerDownHandle(e, 'w')}
                      className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs shadow-sm cursor-ew-resize z-20"
                    />
                  </div>
                </div>

                {/* Kontrol Paginasi Halaman */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center gap-3 bg-white dark:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      Halaman {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* PANEL KANAN: PENGATURAN AREA & AKSI (STANDAR ILOVEPDF)        */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
              
              {/* Petunjuk Interaksi */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Seret kotak pangkas untuk mengatur posisi, atau tarik titik kendali di setiap sudut dan sisi untuk menyesuaikan ukuran area yang ingin dipertahankan.
                </span>
              </div>

              {/* Preset Margin Cepat */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Margin Cepat
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Penuh', pct: 0 },
                    { label: '5%', pct: 5 },
                    { label: '10%', pct: 10 },
                    { label: '15%', pct: 15 },
                  ].map(item => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => applyQuickMargin(item.pct)}
                      className="py-1.5 px-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opsi Target Halaman (Standar iLovePDF) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                  Terapkan Pangkas Ke
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                    <input
                      type="radio"
                      name="pageSelection"
                      value="all"
                      checked={pageSelection === 'all'}
                      onChange={() => setPageSelection('all')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        Semua Halaman
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Potong seluruh dokumen dengan batas yang sama ({totalPages} hal)
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                    <input
                      type="radio"
                      name="pageSelection"
                      value="current"
                      checked={pageSelection === 'current'}
                      onChange={() => setPageSelection('current')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        Hanya Halaman Ini
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Hanya pangkas halaman aktif (Halaman {currentPage})
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                    <input
                      type="radio"
                      name="pageSelection"
                      value="custom"
                      checked={pageSelection === 'custom'}
                      onChange={() => setPageSelection('custom')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        Rentang Halaman Kustom
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Pilih halaman tertentu (contoh: 1-3, 5)
                      </div>
                    </div>
                  </label>

                  {pageSelection === 'custom' && (
                    <div className="pl-6 pt-1 animate-fade-in">
                      <input
                        type="text"
                        value={customPages}
                        onChange={e => setCustomPages(e.target.value)}
                        placeholder="Contoh: 1-3, 5"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tombol Eksekusi Pangkas */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={handleCropPdf}
                  disabled={isProcessing}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-blue-500/25 shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memangkas Dokumen...</span>
                    </>
                  ) : (
                    <>
                      <Crop className="w-4 h-4" />
                      <span>Pangkas PDF Sekarang</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LANGKAH 3: UNDUH HASIL PEMOTONGAN                                  */}
      {/* =================================================================== */}
      {resultUrl && file && (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-sm animate-fade-in">
          {/* Ikon Sukses */}
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil Dipangkas
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Dokumen PDF Berhasil Dipangkas
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Margin berlebih telah dipotong sesuai batas pilihan Anda. Ketajaman teks dan resolusi gambar dokumen tetap terjaga sempurna.
            </p>
          </div>

          {/* Kartu Ringkasan Hasil */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Nama Berkas:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                cropped-{file.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Ukuran Berkas:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {resultSize ? formatFileSize(resultSize) : formatFileSize(file.size)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Cakupan Halaman:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {pageSelection === 'all'
                  ? `Semua Halaman (${totalPages} hal)`
                  : pageSelection === 'current'
                  ? `Halaman ${currentPage}`
                  : `Halaman ${customPages}`}
              </span>
            </div>
          </div>

          {/* Tombol Unduh & Reset */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleDownload}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-emerald-500/25 shadow-md active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>Unduh PDF Terpangkas</span>
            </button>

            <button
              onClick={handleResetAll}
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Pangkas Berkas Lain</span>
            </button>
          </div>
        </div>
      )}
    </ToolContainer>
  );
};

export default CropPdf;
