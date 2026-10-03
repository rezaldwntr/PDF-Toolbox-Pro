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
} from 'lucide-react';
import { triggerFileDownload } from '../../lib/download';
import { ensurePdfjsReady } from '../../lib/pdfWorker';

const WatermarkPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageViewport, setPageViewport] = useState<{ width: number; height: number }>({ width: 595, height: 842 });

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
      setPageViewport({ width: unscaledViewport.width, height: unscaledViewport.height });

      const containerWidth = canvas.parentElement?.clientWidth || 450;
      const scale = Math.min((containerWidth - 32) / unscaledViewport.width, 1.0);
      const viewport = page.getViewport({ scale });

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      ctx.scale(dpr, dpr);
      const renderContext = { canvasContext: ctx, viewport };
      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
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
  };

  const getAnchorCss = (anchor: PositionAnchor) => {
    switch (anchor) {
      case 'top-left': return 'top-8 left-8';
      case 'top-center': return 'top-8 left-1/2 -translate-x-1/2';
      case 'top-right': return 'top-8 right-8';
      case 'middle-left': return 'top-1/2 left-8 -translate-y-1/2';
      case 'center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'middle-right': return 'top-1/2 right-8 -translate-y-1/2';
      case 'bottom-left': return 'bottom-8 left-8';
      case 'bottom-center': return 'bottom-8 left-1/2 -translate-x-1/2';
      case 'bottom-right': return 'bottom-8 right-8';
    }
  };

  return (
    <ToolContainer
      title="Cap Air PDF"
      description="Tambahkan watermark teks atau logo dengan presisi tinggi ke setiap halaman dokumen PDF Anda."
      onBack={onBack}
      canvasSlot={
        file ? (
          <div className="h-full flex flex-col items-center justify-between p-6 bg-canvas overflow-y-auto">
            {/* Top Toolbar: Page Pagination */}
            <div className="flex items-center justify-between w-full max-w-lg mb-4">
              <span className="text-xs font-semibold text-text-secondary">
                Pratinjau Halaman
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

            {/* Document Paper Preview with Live Watermark Overlay */}
            <div className="relative border border-border-subtle rounded-xl shadow-lg bg-white overflow-hidden my-auto max-w-full">
              <canvas ref={canvasRef} className="block mx-auto" />

              {/* Watermark Overlay Layer */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                {config.isMosaic ? (
                  <div
                    className="grid grid-cols-3 grid-rows-3 w-full h-full p-4"
                    style={{ opacity: config.opacity }}
                  >
                    {Array.from({ length: 9 }).map((_, idx) => (
                      <div key={idx} className="flex items-center justify-center overflow-hidden">
                        <span
                          style={{
                            color: config.color,
                            transform: `rotate(${config.rotation}deg)`,
                            fontSize: `${Math.max(14, config.fontSize * 0.45)}px`,
                            fontWeight: config.isBold ? 'bold' : 'normal',
                            fontStyle: config.isItalic ? 'italic' : 'normal',
                          }}
                          className="select-none font-sans whitespace-nowrap"
                        >
                          {config.type === 'text' ? config.text : 'LOGO'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`absolute ${getAnchorCss(config.position)}`}
                    style={{
                      opacity: config.opacity,
                      transform: `${config.position.includes('center') ? '' : ''} rotate(${config.rotation}deg)`,
                    }}
                  >
                    {config.type === 'text' ? (
                      <span
                        style={{
                          color: config.color,
                          fontSize: `${config.fontSize * 0.6}px`,
                          fontWeight: config.isBold ? 'bold' : 'normal',
                          fontStyle: config.isItalic ? 'italic' : 'normal',
                        }}
                        className="select-none whitespace-nowrap block"
                      >
                        {config.text || 'WATERMARK'}
                      </span>
                    ) : config.imagePreviewUrl ? (
                      <img
                        src={config.imagePreviewUrl}
                        alt="Watermark preview"
                        style={{
                          maxWidth: `${Math.max(60, config.imageScale * 250)}px`,
                        }}
                        className="select-none object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="border border-dashed border-text-muted px-3 py-1.5 rounded text-xs text-text-muted">
                        Pilih Gambar
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Info Bar */}
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
        file ? (
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
