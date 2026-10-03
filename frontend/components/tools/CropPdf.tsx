import React, { useState, useRef, useEffect, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
import CropInspector from './crop/CropInspector';
import { CropBox, AspectRatio, PageSelection } from './crop/CropTypes';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';
import {
  Crop,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { formatFileSize } from '../../lib/formatters';
import { triggerFileDownload } from '../../lib/download';
import { loadPdfDocument } from '../../lib/pdfWorker';

const CropPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // State Area Pangkas
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, width: 0, height: 0 });
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');
  const [pageSelection, setPageSelection] = useState<PageSelection>('all');
  const [customPages, setCustomPages] = useState<string>('');

  // Status Interaksi Drag & Resize
  const [isDraggingBox, setIsDraggingBox] = useState<boolean>(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; box: CropBox }>({ x: 0, y: 0, box: { x: 0, y: 0, width: 0, height: 0 } });

  // State Pemrosesan & Hasil
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(1);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && file && !isProcessing && !resultUrl && cropBox.width > 20 && cropBox.height > 20) {
        e.preventDefault();
        handleExecuteCrop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isProcessing, resultUrl, cropBox]);

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
      const loadedDoc = await loadPdfDocument(buffer);
      setPdfDoc(loadedDoc);
      setTotalPages(loadedDoc.numPages);
    } catch {
      addToast('Gagal membaca struktur berkas PDF.', 'error');
    }
  };

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      if (renderTaskRef.current) renderTaskRef.current.cancel();

      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = Math.min(canvas.parentElement?.clientWidth || 450, 480);
      const scale = containerWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale });

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      ctx.scale(dpr, dpr);
      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise;

      setCanvasDimensions({ width: viewport.width, height: viewport.height });

      setCropBox((prev) => {
        if (prev.width > 0 && prev.height > 0) return prev;
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
    if (pdfDoc) renderPage(currentPage);
  }, [pdfDoc, currentPage, renderPage]);

  const handleResetCrop = () => {
    if (canvasDimensions.width <= 0) return;
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

  const applyQuickMargin = (pct: number) => {
    if (canvasDimensions.width <= 0) return;
    const insetX = canvasDimensions.width * (pct / 100);
    const insetY = canvasDimensions.height * (pct / 100);
    setCropBox({
      x: Math.round(insetX),
      y: Math.round(insetY),
      width: Math.round(canvasDimensions.width - insetX * 2),
      height: Math.round(canvasDimensions.height - insetY * 2),
    });
  };

  const applyAspectRatio = (ratio: AspectRatio) => {
    setAspectRatio(ratio);
    if (ratio === 'free' || canvasDimensions.width <= 0) return;

    let targetRatio = 1.0;
    if (ratio === '1:1') targetRatio = 1.0;
    else if (ratio === 'a4') targetRatio = 1 / 1.4142;
    else if (ratio === '16:9') targetRatio = 16 / 9;

    let newWidth = cropBox.width;
    let newHeight = Math.round(newWidth / targetRatio);

    if (cropBox.y + newHeight > canvasDimensions.height) {
      newHeight = canvasDimensions.height - cropBox.y;
      newWidth = Math.round(newHeight * targetRatio);
    }

    setCropBox((prev) => ({
      ...prev,
      width: Math.min(newWidth, canvasDimensions.width - prev.x),
      height: Math.min(newHeight, canvasDimensions.height - prev.y),
    }));
  };

  // Pointer Handlers for drag & resize
  const handlePointerDownBox = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDraggingBox(true);
    setDragStart({ x: e.clientX, y: e.clientY, box: { ...cropBox } });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerDownHandle = (e: React.PointerEvent, handle: string) => {
    e.stopPropagation();
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY, box: { ...cropBox } });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const minSize = 30;

    if (isDraggingBox) {
      let newX = Math.max(0, Math.min(dragStart.box.x + dx, canvasDimensions.width - dragStart.box.width));
      let newY = Math.max(0, Math.min(dragStart.box.y + dy, canvasDimensions.height - dragStart.box.height));
      setCropBox({ ...dragStart.box, x: Math.round(newX), y: Math.round(newY) });
      return;
    }

    if (activeHandle) {
      const orig = dragStart.box;
      let { x, y, width, height } = orig;

      if (activeHandle.includes('w')) {
        const potentialWidth = orig.width - dx;
        if (potentialWidth >= minSize) {
          x = Math.max(0, orig.x + dx);
          width = orig.width - (x - orig.x);
        }
      } else if (activeHandle.includes('e')) {
        width = Math.min(Math.max(minSize, orig.width + dx), canvasDimensions.width - orig.x);
      }

      if (activeHandle.includes('n')) {
        const potentialHeight = orig.height - dy;
        if (potentialHeight >= minSize) {
          y = Math.max(0, orig.y + dy);
          height = orig.height - (y - orig.y);
        }
      } else if (activeHandle.includes('s')) {
        height = Math.min(Math.max(minSize, orig.height + dy), canvasDimensions.height - orig.y);
      }

      setCropBox({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDraggingBox(false);
    setActiveHandle(null);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleExecuteCrop = async () => {
    if (!file || canvasDimensions.width <= 0 || !checkQuotaBeforeAction()) return;

    setIsProcessing(true);
    setProcessingStep(1);

    const relX = cropBox.x / canvasDimensions.width;
    const relY = cropBox.y / canvasDimensions.height;
    const relW = cropBox.width / canvasDimensions.width;
    const relH = cropBox.height / canvasDimensions.height;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('x_ratio', relX.toFixed(5));
      formData.append('y_ratio', relY.toFixed(5));
      formData.append('width_ratio', relW.toFixed(5));
      formData.append('height_ratio', relH.toFixed(5));
      formData.append('page_selection', pageSelection);
      if (pageSelection === 'current') formData.append('current_page', currentPage.toString());
      if (pageSelection === 'custom' && customPages.trim()) formData.append('custom_pages', customPages.trim());

      setProcessingStep(2);
      const response = await fetch(`${BACKEND_URL}/tools/crop-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Gagal memotong dokumen PDF.');
      }

      setProcessingStep(3);
      const blob = await response.blob();
      setResultSize(blob.size);
      setResultUrl(URL.createObjectURL(blob));
      consumeQuota();
      addToast('Dokumen berhasil dipangkas!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Gagal memproses pangkas PDF.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    triggerFileDownload(resultUrl, `${base}-cropped.pdf`);
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setPdfDoc(null);
    setResultUrl(null);
    setResultSize(null);
    setTotalPages(0);
    setCurrentPage(1);
  };

  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  return (
    <ToolContainer
      title="Pangkas PDF (Crop Area)"
      description="Potong margin, sesuaikan rasio aspek, atau isolasi bagian tertentu dari dokumen PDF Anda secara visual."
      onBack={onBack}
      canvasSlot={
        file ? (
          <div className="h-full flex flex-col items-center justify-between p-6 bg-canvas overflow-y-auto">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between w-full max-w-lg mb-4">
              <span className="text-xs font-semibold text-text-secondary">
                Pratinjau Halaman & Kotak Potong
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2 bg-surface px-2.5 py-1 rounded-xl border border-border-subtle shadow-xs">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 hover:bg-canvas rounded disabled:opacity-30 text-text-secondary"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-text-primary">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 hover:bg-canvas rounded disabled:opacity-30 text-text-secondary"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Canvas with Interactive Bounding Box Overlay */}
            <div
              className="relative border border-border-subtle rounded-xl shadow-lg bg-white overflow-hidden my-auto select-none"
              style={{ width: canvasDimensions.width || 'auto', height: canvasDimensions.height || 'auto' }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <canvas ref={canvasRef} className="block mx-auto" />

              {/* Shaded Area Outside Crop Box */}
              {canvasDimensions.width > 0 && cropBox.width > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Top */}
                  <div className="absolute bg-black/50" style={{ top: 0, left: 0, right: 0, height: cropBox.y }} />
                  {/* Bottom */}
                  <div className="absolute bg-black/50" style={{ top: cropBox.y + cropBox.height, left: 0, right: 0, bottom: 0 }} />
                  {/* Left */}
                  <div className="absolute bg-black/50" style={{ top: cropBox.y, left: 0, width: cropBox.x, height: cropBox.height }} />
                  {/* Right */}
                  <div className="absolute bg-black/50" style={{ top: cropBox.y, left: cropBox.x + cropBox.width, right: 0, height: cropBox.height }} />
                </div>
              )}

              {/* Draggable & Resizable Box */}
              {canvasDimensions.width > 0 && cropBox.width > 0 && (
                <div
                  onPointerDown={handlePointerDownBox}
                  style={{
                    position: 'absolute',
                    left: `${cropBox.x}px`,
                    top: `${cropBox.y}px`,
                    width: `${cropBox.width}px`,
                    height: `${cropBox.height}px`,
                  }}
                  className="border-2 border-accent-primary shadow-sm cursor-move touch-none"
                >
                  {/* 8 Resize Handles */}
                  {handles.map((h) => (
                    <div
                      key={h}
                      onPointerDown={(e) => handlePointerDownHandle(e, h)}
                      className={`absolute w-3 h-3 bg-white border-2 border-accent-primary rounded-full shadow-xs z-10 ${
                        h.includes('n') ? '-top-1.5' : h.includes('s') ? '-bottom-1.5' : 'top-1/2 -translate-y-1/2'
                      } ${
                        h.includes('w') ? '-left-1.5' : h.includes('e') ? '-right-1.5' : 'left-1/2 -translate-x-1/2'
                      } ${
                        h === 'nw' || h === 'se' ? 'cursor-nwse-resize' : h === 'ne' || h === 'sw' ? 'cursor-nesw-resize' : h === 'n' || h === 's' ? 'cursor-ns-resize' : 'cursor-ew-resize'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Info */}
            <div className="mt-4 flex items-center justify-between w-full max-w-lg text-xs text-text-secondary">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Ganti Dokumen
              </button>
              <span>{file.name}</span>
            </div>
          </div>
        ) : undefined
      }
      inspectorSlot={
        file ? (
          <CropInspector
            cropBox={cropBox}
            setCropBox={setCropBox}
            canvasDimensions={canvasDimensions}
            aspectRatio={aspectRatio} applyAspectRatio={applyAspectRatio}
            applyQuickMargin={applyQuickMargin} handleResetCrop={handleResetCrop}
            pageSelection={pageSelection} setPageSelection={setPageSelection}
            customPages={customPages} setCustomPages={setCustomPages}
            currentPage={currentPage} totalPages={totalPages}
          />
        ) : undefined
      }
      floatingBarSlot={
        file ? (
          <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
              <Crop className="w-4 h-4 text-accent-primary" />
              <span>
                Area: {cropBox.width} × {cropBox.height} px
              </span>
            </div>
            <button
              onClick={() => handleExecuteCrop()}
              disabled={isProcessing || cropBox.width < 20 || cropBox.height < 20}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-accent-primary hover:bg-accent-hover disabled:bg-canvas disabled:text-text-muted text-accent-contrast font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Crop className="w-4 h-4" />
              <span>Pangkas Dokumen PDF</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-accent-contrast/20 rounded text-[10px]">↵</kbd>
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Upload Phase */}
      {!file && (
        <div className="max-w-2xl mx-auto space-y-6">
          <FileUploader
            onFileSelect={handlePdfSelect}
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={1}
            title="Pilih Berkas PDF untuk Dipangkas"
            subtitle="Potong margin berlebih, sesuaikan ukuran kertas, atau crop area tertentu"
          />
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="max-w-md mx-auto py-12">
          <ProcessingStepper
            currentStep={processingStep}
            steps={[
              { label: 'Menghitung Koordinat Titik Pangkas & Bounding Box' },
              { label: 'Memotong Dimensi Halaman Melalui PyMuPDF' },
              { label: 'Menyusun & Memvalidasi Berkas PDF Terpotong' },
            ]}
          />
        </div>
      )}

      {/* Result State */}
      {resultUrl && file && (
        <div className="max-w-lg mx-auto py-8">
          <DownloadResultCard
            fileName={`${file.name.replace(/\.pdf$/i, '')}-cropped.pdf`}
            originalSize={file.size}
            resultSize={resultSize || file.size}
            onDownload={handleDownload}
            onReset={handleReset}
            resetLabel="Pangkas Berkas Lain"
            successTitle="Dokumen Berhasil Dipangkas!"
            successDescription="Margin atau area target dokumen Anda telah dipotong dengan presisi tinggi."
            resultUrl={resultUrl}
          />
        </div>
      )}
    </ToolContainer>
  );
};

export default CropPdf;
