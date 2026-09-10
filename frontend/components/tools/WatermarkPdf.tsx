import React, { useState, useRef, useEffect, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';
import {
  Stamp,
  Type,
  Image as ImageIcon,
  Download,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Sliders,
  Layers,
  Grid,
  FileCheck,
  Eye,
  RefreshCw,
  UploadCloud,
  X,
  Sparkles
} from 'lucide-react';

declare const pdfjsLib: any;

type WatermarkTab = 'text' | 'image';
type PositionAnchor = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

type PageSelectionMode = 'all' | 'odd' | 'even' | 'custom';

interface WatermarkConfig {
  type: WatermarkTab;
  // Mode Teks
  text: string;
  fontFamily: 'helv' | 'times' | 'courier';
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  color: string;
  // Mode Gambar
  imageFile: File | null;
  imagePreviewUrl: string | null;
  imageScale: number; // 0.1 - 1.0
  // Pengaturan Umum
  opacity: number; // 0.05 - 1.0
  rotation: number; // -90 s/d 90
  layer: 'over' | 'under';
  position: PositionAnchor;
  isMosaic: boolean;
  // Pengaturan Halaman
  pageSelection: PageSelectionMode;
  customPages: string;
  excludeFirstPage: boolean;
}

const PRESET_COLORS = [
  '#EF4444', // Merah
  '#64748B', // Abu-abu Slate
  '#2563EB', // Biru
  '#0F172A', // Hitam
  '#D97706', // Amber / Oranye
  '#059669', // Emerald / Hijau
];

const PRESET_TEXTS = [
  'CONFIDENTIAL',
  'DRAFT',
  'RAHASIA',
  'SALINAN RESMI',
  'SAMPLE',
];

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
    fontSize: 42,
    isBold: true,
    isItalic: false,
    color: '#EF4444',
    imageFile: null,
    imagePreviewUrl: null,
    imageScale: 0.35,
    opacity: 0.25,
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
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const renderTaskRef = useRef<any>(null);

  const { addToast } = useToast();
  const { quota, consumeQuota, setShowLimitModal } = useQuota();

  // 1. Tangani pemilihan file PDF
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
      setPageViewport({ width: unscaledViewport.width, height: unscaledViewport.height });

      const containerWidth = canvas.parentElement?.clientWidth || 450;
      const scale = Math.min(containerWidth / unscaledViewport.width, 1.2);
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

  // 3. Tangani unggah gambar watermark
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const img = files[0];
      const previewUrl = URL.createObjectURL(img);
      setConfig(prev => ({
        ...prev,
        imageFile: img,
        imagePreviewUrl: previewUrl,
        type: 'image'
      }));
    }
  };

  // 4. Eksekusi API Watermark Backend
  const handleApplyWatermark = async () => {
    if (!file) return;

    if (quota <= 0) {
      setShowLimitModal(true);
      return;
    }

    if (config.type === 'text' && !config.text.trim()) {
      addToast('Masukkan teks watermark terlebih dahulu.', 'warning');
      return;
    }

    if (config.type === 'image' && !config.imageFile) {
      addToast('Unggah gambar atau logo untuk watermark.', 'warning');
      return;
    }

    setIsProcessing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 menit timeout

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

      const response = await fetch(`${BACKEND_URL}/tools/watermark-pdf`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || err.error || 'Gagal menambahkan watermark.');
      }

      const blob = await response.blob();
      setResultSize(blob.size);
      setResultUrl(URL.createObjectURL(blob));
      consumeQuota();
      addToast('Watermark berhasil dibubuhkan!', 'success');
    } catch (err: any) {
      clearTimeout(timeoutId);
      addToast(err.name === 'AbortError' ? 'Waktu pemrosesan habis.' : err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper konversi posisi 9-grid untuk CSS Pratinjau
  const getAnchorCss = (anchor: PositionAnchor) => {
    switch (anchor) {
      case 'top-left': return 'top-6 left-6 -translate-x-0 -translate-y-0';
      case 'top-center': return 'top-6 left-1/2 -translate-x-1/2 -translate-y-0';
      case 'top-right': return 'top-6 right-6 -translate-x-0 -translate-y-0';
      case 'middle-left': return 'top-1/2 left-6 -translate-x-0 -translate-y-1/2';
      case 'center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'middle-right': return 'top-1/2 right-6 -translate-x-0 -translate-y-1/2';
      case 'bottom-left': return 'bottom-6 left-6 -translate-x-0 -translate-y-0';
      case 'bottom-center': return 'bottom-6 left-1/2 -translate-x-1/2 -translate-y-0';
      case 'bottom-right': return 'bottom-6 right-6 -translate-x-0 -translate-y-0';
    }
  };

  // =========================================================================
  // LANGKAH 3: TAMPILAN SUKSES & UNDUH
  // =========================================================================
  if (resultUrl) {
    const origKb = file ? (file.size / 1024).toFixed(1) : '0';
    const newKb = resultSize ? (resultSize / 1024).toFixed(1) : '0';

    return (
      <ToolContainer title="Watermark Berhasil Ditambahkan!" onBack={onBack} currentStep={3}>
        <div className="text-center flex flex-col items-center gap-6 animate-fade-in py-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Dokumen Anda Siap Diunduh
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cap air hak cipta telah tertanam secara presisi dengan format PDF berstandar tinggi.
            </p>
          </div>

          {/* Statistik Berkas */}
          <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-around shadow-xs">
            <div className="text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Ukuran Awal</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{origKb} KB</span>
            </div>
            <div className="h-8 w-px bg-slate-300 dark:bg-slate-600" />
            <div className="text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Ukuran Akhir</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{newKb} KB</span>
            </div>
            <div className="h-8 w-px bg-slate-300 dark:bg-slate-600" />
            <div className="text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Halaman</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{totalPages}</span>
            </div>
          </div>

          {/* Tombol Unduh */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-2">
            <a
              href={resultUrl}
              download={`watermarked-${file?.name || 'dokumen.pdf'}`}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span>Unduh PDF Ber-Watermark</span>
            </a>
            <button
              onClick={() => {
                setFile(null);
                setPdfDoc(null);
                setResultUrl(null);
              }}
              className="px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Proses Berkas Lain</span>
            </button>
          </div>
        </div>
      </ToolContainer>
    );
  }

  // =========================================================================
  // LANGKAH 1: UNGGAH BERKAS
  // =========================================================================
  if (!file) {
    return (
      <ToolContainer
        title="Watermark PDF"
        description="Sisipkan cap air berupa teks kustom atau logo gambar untuk melindungi hak cipta dokumen PDF Anda."
        onBack={onBack}
        currentStep={1}
      >
        <FileUploader
          onFileSelect={handlePdfSelect}
          accept=".pdf"
          label="Pilih atau Seret Berkas PDF"
          description="Dukungan file hingga 25 MB dengan pratinjau real-time"
        />
      </ToolContainer>
    );
  }

  // =========================================================================
  // LANGKAH 2: WORKSPACE KONFIGURASI & PRATINJAU INTERAKTIF
  // =========================================================================
  return (
    <ToolContainer
      title="Atur Watermark Dokumen"
      description="Sesuaikan teks, font, logo, posisi, dan transparansi dengan pratinjau langsung."
      onBack={onBack}
      maxWidth="max-w-7xl"
      currentStep={2}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* =============================================================== */}
        {/* KOLOM KIRI: LIVE PREVIEW KANVAS                                */}
        {/* =============================================================== */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-center">
          {/* Header Kontrol Pratinjau */}
          <div className="w-full flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Pratinjau Langsung</span>
              <span className="hidden sm:inline text-slate-400 font-normal">
                ({config.layer === 'over' ? 'Lapisan: Di atas konten' : 'Lapisan: Di bawah konten'})
              </span>
            </div>

            {/* Paginator */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-md shadow-2xs font-mono text-[11px]">
                  Hal {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Area Kanvas Pratinjau dengan Overlay Watermark */}
          <div className="relative w-full flex justify-center items-center bg-slate-200/60 dark:bg-slate-900/50 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner min-h-[460px]">
            <div className="relative shadow-2xl rounded-lg overflow-hidden bg-white max-w-full">
              {/* Canvas PDF Asli */}
              <canvas ref={canvasRef} className="block max-w-full h-auto select-none pointer-events-none" />

              {/* OVERLAY WATERMARK INTERAKTIF REAL-TIME */}
              <div
                className={`absolute inset-0 pointer-events-none overflow-hidden ${
                  config.layer === 'under' ? 'mix-blend-multiply opacity-85' : ''
                }`}
              >
                {/* 1. Mode Mosaic (Tiling Berulang Diagonal) */}
                {config.isMosaic ? (
                  <div className="w-full h-full grid grid-cols-3 grid-rows-4 gap-6 p-4 place-items-center">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          opacity: config.opacity,
                          transform: `rotate(${config.rotation}deg)`,
                          color: config.color,
                        }}
                        className="transition-transform duration-150 select-none whitespace-nowrap text-center"
                      >
                        {config.type === 'text' ? (
                          <span
                            style={{
                              fontFamily: config.fontFamily === 'times' ? 'Times New Roman, serif' : config.fontFamily === 'courier' ? 'Courier New, monospace' : 'Arial, sans-serif',
                              fontSize: `${Math.max(12, Math.round(config.fontSize * 0.45))}px`,
                              fontWeight: config.isBold ? 'bold' : 'normal',
                              fontStyle: config.isItalic ? 'italic' : 'normal',
                            }}
                          >
                            {config.text || 'CONFIDENTIAL'}
                          </span>
                        ) : config.imagePreviewUrl ? (
                          <img
                            src={config.imagePreviewUrl}
                            alt="Watermark Logo"
                            style={{ width: `${Math.round(config.imageScale * 80)}px` }}
                            className="object-contain"
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 2. Mode 9-Anchor Single Placement */
                  <div className={`absolute ${getAnchorCss(config.position)} flex items-center justify-center p-2`}>
                    <div
                      style={{
                        opacity: config.opacity,
                        transform: `rotate(${config.rotation}deg)`,
                        color: config.color,
                      }}
                      className="transition-all duration-150 select-none whitespace-nowrap text-center"
                    >
                      {config.type === 'text' ? (
                        <span
                          style={{
                            fontFamily: config.fontFamily === 'times' ? 'Times New Roman, serif' : config.fontFamily === 'courier' ? 'Courier New, monospace' : 'Arial, sans-serif',
                            fontSize: `${Math.max(14, Math.round(config.fontSize * 0.65))}px`,
                            fontWeight: config.isBold ? 'bold' : 'normal',
                            fontStyle: config.isItalic ? 'italic' : 'normal',
                          }}
                        >
                          {config.text || 'CONFIDENTIAL'}
                        </span>
                      ) : config.imagePreviewUrl ? (
                        <img
                          src={config.imagePreviewUrl}
                          alt="Watermark Logo"
                          style={{ width: `${Math.round(config.imageScale * 220)}px` }}
                          className="object-contain"
                        />
                      ) : (
                        <div className="border border-dashed border-slate-400 bg-slate-50/80 px-4 py-2 rounded-lg text-xs text-slate-500 font-medium">
                          Pilih berkas gambar di sebelah kanan
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-full flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-3 px-1">
            <span>📄 {file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
            <button
              onClick={() => {
                setFile(null);
                setPdfDoc(null);
              }}
              className="text-rose-600 hover:underline flex items-center gap-1 font-medium"
            >
              <X className="w-3.5 h-3.5" /> Ganti Berkas
            </button>
          </div>
        </div>

        {/* =============================================================== */}
        {/* KOLOM KANAN: SIDEBAR PENGATURAN ALA ILOVEPDF                   */}
        {/* =============================================================== */}
        <div className="lg:col-span-6 xl:col-span-5 bg-slate-50 dark:bg-slate-800/40 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-6">
          {/* 1. Pemilihan Tab Mode (Teks vs Gambar) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Tipe Cap Air
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/80 dark:bg-slate-700/60 rounded-xl">
              <button
                onClick={() => setConfig(prev => ({ ...prev, type: 'text' }))}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  config.type === 'text'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Type className="w-4 h-4" />
                <span>Cap Air Teks</span>
              </button>
              <button
                onClick={() => setConfig(prev => ({ ...prev, type: 'image' }))}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  config.type === 'image'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Gambar / Logo</span>
              </button>
            </div>
          </div>

          {/* 2. Form Spesifik Mode Teks */}
          {config.type === 'text' ? (
            <div className="space-y-4 pt-1">
              {/* Input Teks & Preset Cepat */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Teks Watermark
                </label>
                <input
                  type="text"
                  value={config.text}
                  onChange={e => setConfig(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Contoh: CONFIDENTIAL"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100"
                />
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PRESET_TEXTS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, text: preset }))}
                      className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                        config.text === preset
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-600 dark:text-blue-400 font-bold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipografi: Font & Style */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Jenis Huruf
                  </label>
                  <select
                    value={config.fontFamily}
                    onChange={e => setConfig(prev => ({ ...prev, fontFamily: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="helv">Arial / Helvetica</option>
                    <option value="times">Times New Roman</option>
                    <option value="courier">Courier New</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Gaya Teks
                  </label>
                  <div className="flex gap-1.5 h-[38px]">
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, isBold: !prev.isBold }))}
                      className={`flex-1 rounded-xl text-xs font-bold transition-all border ${
                        config.isBold
                          ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, isItalic: !prev.isItalic }))}
                      className={`flex-1 rounded-xl text-xs font-serif italic font-bold transition-all border ${
                        config.isItalic
                          ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      I
                    </button>
                  </div>
                </div>
              </div>

              {/* Ukuran Font Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Ukuran Huruf
                  </label>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {config.fontSize} pt
                  </span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="100"
                  step="2"
                  value={config.fontSize}
                  onChange={e => setConfig(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Warna Teks & Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Warna Cap Air
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.color}
                    onChange={e => setConfig(prev => ({ ...prev, color: e.target.value }))}
                    className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer bg-transparent p-0.5"
                    title="Pilih Warna Kustom"
                  />
                  <div className="flex items-center gap-1.5">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, color: c }))}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full border transition-all ${
                          config.color.toLowerCase() === c.toLowerCase()
                            ? 'scale-115 ring-2 ring-blue-500 ring-offset-2 border-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 2. Form Spesifik Mode Gambar */
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Pilih Berkas Gambar (PNG, JPG, SVG)
                </label>
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full py-4 px-4 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl flex flex-col items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors group"
                >
                  <UploadCloud className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span>{config.imageFile ? config.imageFile.name : 'Klik untuk Unggah Logo/Gambar'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">PNG transparan direkomendasikan</span>
                </button>
              </div>

              {/* Skala Gambar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Skala Ukuran Gambar
                  </label>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {Math.round(config.imageScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.8"
                  step="0.05"
                  value={config.imageScale}
                  onChange={e => setConfig(prev => ({ ...prev, imageScale: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* PENGATURAN UMUM: OPASITAS, ROTASI, LAYER, POSISI                */}
          {/* =============================================================== */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
            {/* Opasitas / Transparansi */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Transparansi (Opacity)
                </label>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {Math.round(config.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.9"
                step="0.05"
                value={config.opacity}
                onChange={e => setConfig(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Rotasi / Sudut */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Sudut Kemiringan
                </label>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {config.rotation}°
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[-45, 0, 45, 90].map(deg => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, rotation: deg }))}
                    className={`py-1 text-xs font-mono rounded-lg border transition-all ${
                      config.rotation === deg
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Lapisan / Layer (Benchmark iLovePDF) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Posisi Lapisan (Layer)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, layer: 'over' }))}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                    config.layer === 'over'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  Di Atas Konten
                </button>
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, layer: 'under' }))}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                    config.layer === 'under'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  Di Bawah Konten
                </button>
              </div>
            </div>

            {/* Mode Penempatan: 9-Anchor Grid vs Mosaic Tiling */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Tata Letak (Placement)
                </label>
                <label className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.isMosaic}
                    onChange={e => setConfig(prev => ({ ...prev, isMosaic: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Pola Mosaic (Berulang)</span>
                </label>
              </div>

              {!config.isMosaic ? (
                /* Matriks 9 Titik Jangkar 3x3 */
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                  <span className="text-[11px] text-slate-400 mb-2">Pilih 1 dari 9 posisi penempatan:</span>
                  <div className="grid grid-cols-3 gap-2 w-full max-w-[210px]">
                    {[
                      { id: 'top-left', label: '↖' },
                      { id: 'top-center', label: '↑' },
                      { id: 'top-right', label: '↗' },
                      { id: 'middle-left', label: '←' },
                      { id: 'center', label: '●' },
                      { id: 'middle-right', label: '→' },
                      { id: 'bottom-left', label: '↙' },
                      { id: 'bottom-center', label: '↓' },
                      { id: 'bottom-right', label: '↘' },
                    ].map(btn => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, position: btn.id as PositionAnchor }))}
                        className={`h-9 rounded-lg font-bold text-sm transition-all flex items-center justify-center border ${
                          config.position === btn.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200'
                        }`}
                        title={btn.id}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  ✨ <strong>Mode Mosaic Aktif:</strong> Cap air akan dicap secara berulang diagonal memenuhi seluruh bidang halaman dokumen.
                </div>
              )}
            </div>

            {/* Target Halaman & Exclude Cover */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Terapkan Pada Halaman
              </label>
              <select
                value={config.pageSelection}
                onChange={e => setConfig(prev => ({ ...prev, pageSelection: e.target.value as PageSelectionMode }))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">Semua Halaman (All Pages)</option>
                <option value="odd">Halaman Ganjil Saja (1, 3, 5, ...)</option>
                <option value="even">Halaman Genap Saja (2, 4, 6, ...)</option>
                <option value="custom">Rentang Halaman Kustom</option>
              </select>

              {config.pageSelection === 'custom' && (
                <input
                  type="text"
                  value={config.customPages}
                  onChange={e => setConfig(prev => ({ ...prev, customPages: e.target.value }))}
                  placeholder="Contoh: 1-5, 8, 12"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              )}

              {/* Checkbox Lewati Cover (Benchmark iLovePDF) */}
              <label className="flex items-center gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.excludeFirstPage}
                  onChange={e => setConfig(prev => ({ ...prev, excludeFirstPage: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span>Lewati halaman pertama (Cover Dokumen)</span>
              </label>
            </div>
          </div>

          {/* =============================================================== */}
          {/* TOMBOL UTAMA EKSEKUSI                                          */}
          {/* =============================================================== */}
          <button
            onClick={handleApplyWatermark}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Membubuhkan Watermark...</span>
              </>
            ) : (
              <>
                <Stamp className="w-5 h-5" />
                <span>Tambahkan Watermark ke PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </ToolContainer>
  );
};

export default WatermarkPdf;
