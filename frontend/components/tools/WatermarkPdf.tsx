import React, { useState, useRef, useEffect, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
import WatermarkInspector from './watermark/WatermarkInspector';
import {
  WatermarkConfig,
  PositionAnchor,
} from './watermark/WatermarkTypes';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';
import {
  Stamp,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { triggerFileDownload } from '../../lib/download';
import { ensurePdfjsReady } from '../../lib/pdfWorker';

const WatermarkPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [viewportScale, setViewportScale] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [docDimensions, setDocDimensions] = useState<{ width: number; height: number; isLandscape: boolean } | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Konfigurasi Watermark
  const [config, setConfig] = useState<WatermarkConfig>({
    type: 'text',
    text: 'CONFIDENTIAL',
    fontFamily: 'helv',
    fontSize: 36,
    isBold: true,
    isItalic: false,
    color: '#EF4444',
    imageFile: null,
    imagePreviewUrl: null,
    imageScale: 0.35,
    opacity: 0.3,
    rotation: -45,
    layer: 'over',
    position: 'center',
    isMosaic: false,
    pageSelection: 'all',
    customPages: '',
    excludeFirstPage: false,
  });

  // State Eksekusi
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(1);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const renderTaskRef = useRef<any>(null);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();

  // Keyboard shortcut: Enter to execute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && file && !isProcessing && !resultUrl) {
        if (config.type === 'text' && !config.text.trim()) return;
        if (config.type === 'image' && !config.imageFile) return;
        e.preventDefault();
        handleApplyWatermark();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isProcessing, resultUrl, config]);

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
      const pdfjs = await ensurePdfjsReady();
      const loadedDoc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
      setPdfDoc(loadedDoc);
      setTotalPages(loadedDoc.numPages);
    } catch (err: any) {
      console.error('Gagal memuat pratinjau PDF:', err);
      addToast('Gagal membaca struktur berkas PDF.', 'error');
    }
  };

  const renderPage = useCallback(
    async (pageNum: number) => {
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
        const isLandscape = unscaledViewport.width > unscaledViewport.height;

        setDocDimensions({
          width: unscaledViewport.width,
          height: unscaledViewport.height,
          isLandscape,
        });

        // Ukuran kontainer pratinjau yang fleksibel dan luas
        const containerEl = previewContainerRef.current;
        const rawContainerWidth = containerEl?.clientWidth || 850;
        const availableWidth = Math.max(340, rawContainerWidth - 32);

        // Dokumen landscape dapat menggunakan lebar penuh kontainer (hingga 1100px)
        // Dokumen portrait disesuaikan agar proporsional di layar (hingga 780px)
        const defaultTargetWidth = isLandscape
          ? Math.min(availableWidth, 1100)
          : Math.min(availableWidth, 780);

        const baseScale = defaultTargetWidth / unscaledViewport.width;
        const scale = baseScale * zoom;
        setViewportScale(scale);

        const viewport = page.getViewport({ scale });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(viewport.width * dpr);
        canvas.height = Math.round(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        ctx.scale(dpr, dpr);
        const renderContext = { canvasContext: ctx, viewport };
        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;

        setCanvasDimensions({ width: viewport.width, height: viewport.height });
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      }
    },
    [pdfDoc, zoom]
  );

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, renderPage]);

  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc) renderPage(currentPage);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, currentPage, renderPage]);

  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.round(Math.max(0.5, Math.min(2.5, newZoom)) * 100) / 100;
    setZoom(clamped);
  };

  const handleResetZoom = () => {
    setZoom(1.0);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const img = files[0];
      const previewUrl = URL.createObjectURL(img);
      setConfig((prev) => ({
        ...prev,
        imageFile: img,
        imagePreviewUrl: previewUrl,
        type: 'image',
      }));
    }
  };

  const handleApplyWatermark = async () => {
    if (!file || !checkQuotaBeforeAction()) return;

    if (config.type === 'text' && !config.text.trim()) {
      addToast('Masukkan teks watermark terlebih dahulu.', 'warning');
      return;
    }

    if (config.type === 'image' && !config.imageFile) {
      addToast('Unggah gambar atau logo untuk watermark.', 'warning');
      return;
    }

    setIsProcessing(true);
    setProcessingStep(1);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('watermark_type', config.type);
      formData.append('opacity', config.opacity.toString());
      formData.append('rotation', config.rotation.toString());
      formData.append('layer', config.layer);
      formData.append('position', config.position);
      formData.append('is_mosaic', config.isMosaic ? 'true' : 'false');
      formData.append('page_selection', config.pageSelection);
      if (config.pageSelection === 'custom' && config.customPages) {
        formData.append('custom_pages', config.customPages);
      }
      formData.append('exclude_first_page', config.excludeFirstPage ? 'true' : 'false');

      if (config.type === 'text') {
        formData.append('text', config.text);
        formData.append('font_family', config.fontFamily);
        formData.append('font_size', config.fontSize.toString());
        formData.append('is_bold', config.isBold ? 'true' : 'false');
        formData.append('is_italic', config.isItalic ? 'true' : 'false');
        formData.append('color', config.color);
      } else if (config.type === 'image' && config.imageFile) {
        formData.append('image_file', config.imageFile);
        formData.append('image_scale', config.imageScale.toString());
      }

      setProcessingStep(2);
      const response = await fetch(`${BACKEND_URL}/tools/watermark-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || err.error || 'Gagal menambahkan watermark.');
      }

      setProcessingStep(3);
      const blob = await response.blob();
      setResultSize(blob.size);
      setResultUrl(URL.createObjectURL(blob));
      consumeQuota();
      addToast('Watermark berhasil dibubuhkan!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Gagal membubuhkan watermark.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    triggerFileDownload(resultUrl, `${base}-watermarked.pdf`);
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setPdfDoc(null);
    setResultUrl(null);
    setResultSize(null);
    setTotalPages(0);
    setCurrentPage(1);
    setZoom(1.0);
    setDocDimensions(null);
    setCanvasDimensions({ width: 0, height: 0 });
  };

  const getFontFamilyCss = (fontFamily: string) => {
    switch ((fontFamily || '').toLowerCase()) {
      case 'times':
      case 'tiro':
        return 'serif';
      case 'courier':
      case 'cour':
        return 'monospace';
      default:
        return 'sans-serif';
    }
  };

  const getPositionStyles = (anchor: PositionAnchor, scale: number): React.CSSProperties => {
    // Margin proporsional terhadap skala kanvas (seperti 36pt di PyMuPDF)
    const margin = Math.round(36 * scale);
    switch (anchor) {
      case 'top-left':
        return { top: `${margin}px`, left: `${margin}px` };
      case 'top-center':
        return { top: `${margin}px`, left: '50%', transform: 'translateX(-50%)' };
      case 'top-right':
        return { top: `${margin}px`, right: `${margin}px` };
      case 'middle-left':
        return { top: '50%', left: `${margin}px`, transform: 'translateY(-50%)' };
      case 'center':
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      case 'middle-right':
        return { top: '50%', right: `${margin}px`, transform: 'translateY(-50%)' };
      case 'bottom-left':
        return { bottom: `${margin}px`, left: `${margin}px` };
      case 'bottom-center':
        return { bottom: `${margin}px`, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-right':
        return { bottom: `${margin}px`, right: `${margin}px` };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  return (
    <ToolContainer
      title="Cap Air PDF"
      description="Tambahkan watermark teks atau logo dengan presisi tinggi ke setiap halaman dokumen PDF Anda."
      onBack={onBack}
      currentStep={!file ? 1 : (resultUrl ? 3 : 2)}
      toolbarSlot={
        file && !isProcessing && !resultUrl ? (
          <div className="flex items-center justify-between w-full gap-3 flex-wrap">
            {/* Navigasi Halaman */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-secondary hidden sm:inline">
                Halaman:
              </span>
              <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-xl border border-border-subtle shadow-xs">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 hover:bg-canvas rounded disabled:opacity-30 text-text-secondary transition-colors"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-medium text-text-primary px-1">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 hover:bg-canvas rounded disabled:opacity-30 text-text-secondary transition-colors"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mode Tag / Status Badge */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-primary/10 text-accent-primary font-medium text-[11px]">
                <Stamp className="w-3.5 h-3.5" />
                Format: {config.type === 'text' ? 'Teks Cap Air' : 'Logo / Gambar'} · {config.isMosaic ? 'Mosaik Berulang' : `Posisi: ${config.position}`}
              </span>
            </div>

            {/* Kontrol Zoom Pratinjau */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-surface px-2 py-1 rounded-xl border border-border-subtle shadow-xs">
                <button
                  onClick={() => handleZoomChange(zoom - 0.15)}
                  disabled={zoom <= 0.5}
                  className="p-1 hover:bg-canvas rounded text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30"
                  title="Perkecil (-)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="text-xs font-mono font-bold text-text-primary px-2 hover:bg-canvas rounded py-0.5 transition-colors"
                  title="Klik untuk reset zoom (Pas Lebar 100%)"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => handleZoomChange(zoom + 0.15)}
                  disabled={zoom >= 2.5}
                  className="p-1 hover:bg-canvas rounded text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30"
                  title="Perbesar (+)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleResetZoom}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface hover:bg-canvas text-text-secondary hover:text-text-primary text-xs font-medium shadow-xs transition-colors"
                title="Sesuaikan dengan lebar kontainer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-accent-primary" />
                <span>Pas Lebar</span>
              </button>
            </div>
          </div>
        ) : undefined
      }
      canvasSlot={
        file && !isProcessing && !resultUrl ? (
          <div
            ref={previewContainerRef}
            className="w-full h-full flex flex-col items-center justify-between min-h-[560px] max-h-[calc(100vh-230px)] overflow-hidden"
          >
            {/* Area Kanvas Scrollable (Horizontal & Vertikal) */}
            <div className="w-full flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4">
              <div
                className="relative border border-border-subtle rounded-xl shadow-lg bg-white select-none transition-all my-auto"
                style={{
                  width: `${canvasDimensions.width}px`,
                  height: `${canvasDimensions.height}px`,
                  minWidth: `${canvasDimensions.width}px`,
                  minHeight: `${canvasDimensions.height}px`,
                }}
              >
                <canvas ref={canvasRef} className="block mx-auto" />

                {/* Watermark Overlay Layer - Mengikuti dimensi kanvas persis */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {config.isMosaic ? (
                    <div
                      className="grid grid-cols-3 grid-rows-3 w-full h-full p-4 pointer-events-none select-none"
                      style={{ opacity: config.opacity }}
                    >
                      {Array.from({ length: 9 }).map((_, idx) => (
                        <div key={idx} className="flex items-center justify-center overflow-hidden">
                          <span
                            style={{
                              color: config.color,
                              transform: `rotate(${config.rotation}deg)`,
                              fontSize: `${Math.max(12, Math.round(config.fontSize * viewportScale * 0.7))}px`,
                              fontFamily: getFontFamilyCss(config.fontFamily),
                              fontWeight: config.isBold ? 'bold' : 'normal',
                              fontStyle: config.isItalic ? 'italic' : 'normal',
                            }}
                            className="select-none whitespace-nowrap block"
                          >
                            {config.type === 'text' ? (config.text || 'WATERMARK') : 'LOGO'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="absolute pointer-events-none select-none transition-all duration-150"
                      style={getPositionStyles(config.position, viewportScale)}
                    >
                      <div
                        style={{
                          transform: `rotate(${config.rotation}deg)`,
                          transformOrigin: 'center center',
                          opacity: config.opacity,
                        }}
                        className="transition-transform duration-150 inline-block"
                      >
                        {config.type === 'text' ? (
                          <span
                            style={{
                              color: config.color,
                              fontSize: `${Math.max(10, Math.round(config.fontSize * viewportScale))}px`,
                              fontFamily: getFontFamilyCss(config.fontFamily),
                              fontWeight: config.isBold ? 'bold' : 'normal',
                              fontStyle: config.isItalic ? 'italic' : 'normal',
                              lineHeight: 1.1,
                            }}
                            className="select-none whitespace-nowrap block drop-shadow-2xs"
                          >
                            {config.text || 'WATERMARK'}
                          </span>
                        ) : config.imagePreviewUrl ? (
                          <img
                            src={config.imagePreviewUrl}
                            alt="Watermark preview"
                            style={{
                              width: `${Math.max(40, Math.round(canvasDimensions.width * config.imageScale))}px`,
                              height: 'auto',
                              maxWidth: 'none',
                            }}
                            className="select-none object-contain pointer-events-none block drop-shadow-2xs"
                          />
                        ) : (
                          <div className="border border-dashed border-text-muted px-3 py-1.5 rounded text-xs text-text-muted">
                            Pilih Gambar
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Baris Status Metadata Dokumen */}
            <div className="w-full pt-3 pb-1 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary select-none">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Ganti Dokumen
              </button>
              <div className="flex items-center gap-3">
                {docDimensions && (
                  <span className="font-mono text-[11px] text-text-muted bg-surface px-2 py-0.5 rounded border border-border-subtle">
                    {docDimensions.isLandscape ? 'Landscape' : 'Portrait'} · {Math.round(docDimensions.width)} × {Math.round(docDimensions.height)} pt
                  </span>
                )}
                <span className="font-medium truncate max-w-[200px] sm:max-w-[320px]" title={file.name}>
                  {file.name}
                </span>
              </div>
            </div>
          </div>
        ) : undefined
      }
      inspectorSlot={
        file && !isProcessing && !resultUrl ? (
          <WatermarkInspector
            config={config}
            setConfig={setConfig}
            totalPages={totalPages}
            onImageSelect={handleImageSelect}
            imageInputRef={imageInputRef}
          />
        ) : undefined
      }
      floatingBarSlot={
        file && !isProcessing && !resultUrl ? (
          <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
              <Stamp className="w-4 h-4 text-accent-primary" />
              <span>
                {config.type === 'text'
                  ? `Teks: "${config.text.slice(0, 18)}${config.text.length > 18 ? '...' : ''}"`
                  : config.imageFile?.name || 'Gambar Belum Dipilih'}
              </span>
            </div>
            <button
              onClick={() => handleApplyWatermark()}
              disabled={
                isProcessing ||
                (config.type === 'text' && !config.text.trim()) ||
                (config.type === 'image' && !config.imageFile)
              }
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-accent-primary hover:bg-accent-hover disabled:bg-canvas disabled:text-text-muted text-accent-contrast font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Stamp className="w-4 h-4" />
              <span>Terapkan Watermark</span>
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
            title="Pilih Berkas PDF untuk Diberi Cap Air"
            subtitle="Unggah dokumen untuk menambahkan tanda kepemilikan, stempel rahasia, atau logo institusi"
          />
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="max-w-md mx-auto py-12">
          <ProcessingStepper
            currentStep={processingStep}
            steps={[
              { label: 'Menyiapkan Aset & Lapisan Watermark' },
              { label: 'Menempelkan Watermark ke Seluruh Halaman PDF' },
              { label: 'Memvalidasi Integritas Struktur Dokumen' },
            ]}
          />
        </div>
      )}

      {/* Result State */}
      {resultUrl && file && (
        <div className="max-w-lg mx-auto py-8">
          <DownloadResultCard
            fileName={`${file.name.replace(/\.pdf$/i, '')}-watermarked.pdf`}
            originalSize={file.size}
            resultSize={resultSize || file.size}
            onDownload={handleDownload}
            onReset={handleReset}
            resetLabel="Cap Air Berkas Lain"
            successTitle="Watermark Berhasil Dibubuhkan!"
            successDescription="Dokumen PDF Anda telah diperbarui dengan cap air resmi sesuai spesifikasi posisi dan opasitas."
            resultUrl={resultUrl}
          />
        </div>
      )}
    </ToolContainer>
  );
};

export default WatermarkPdf;
