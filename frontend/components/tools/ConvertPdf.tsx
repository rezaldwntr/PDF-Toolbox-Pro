import React, { useState, useEffect, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
import PdfPreview from './PdfPreview';
import {
  Sparkles,
  Layers,
  Table,
  Cpu,
  Check,
  Sliders,
  Image as ImageIcon,
  RotateCcw,
  FileText,
  FileCode,
} from 'lucide-react';
import {
  FileWordIcon,
  FileExcelIcon,
  FilePptIcon,
  FileJpgIcon,
} from '../icons';
import { PDFDocument } from 'pdf-lib';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { useAuth } from '../../contexts/AuthContext';
import { BACKEND_URL } from '../../config';
import { smartUploadAndProcess } from '../../lib/gcsUploader';
import { formatFileSize } from '../../lib/formatters';
import { triggerFileDownload } from '../../lib/download';
import { ensurePdfjsReady } from '../../lib/pdfWorker';

interface PdfFileWithBuffer {
  file: File;
  buffer: ArrayBuffer;
}

type ConvertMode = 'word' | 'excel' | 'ppt' | 'image';
type ImageFormat = 'jpg' | 'png';

interface ConvertPdfProps {
  onBack: () => void;
  mode: ConvertMode;
}

const ConvertPdf: React.FC<ConvertPdfProps> = ({ onBack, mode }) => {
  const [fileWithBuffer, setFileWithBuffer] = useState<PdfFileWithBuffer | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(1);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');
  const [outputSize, setOutputSize] = useState<number | null>(null);

  // Opsi Rentang Halaman Universal
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'custom'>('all');
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(1);

  // Opsi Khusus Excel
  const [excelExtractionMode, setExcelExtractionMode] = useState<'tables_only' | 'all_content'>('tables_only');
  const [excelSheetStructure, setExcelSheetStructure] = useState<'combined' | 'per_page'>('combined');

  // Opsi Khusus PPT
  const [pptLayoutMode, setPptLayoutMode] = useState<'editable' | 'visual'>('editable');

  // Opsi Khusus Image
  const [selectedImageFormat, setSelectedImageFormat] = useState<ImageFormat>('jpg');
  const [imageDpi, setImageDpi] = useState<150 | 300>(150);
  const [imageExtractMode, setImageExtractMode] = useState<'pages' | 'embedded'>('pages');

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();
  const { user } = useAuth();

  const getModeConfig = () => {
    switch (mode) {
      case 'word': return { title: 'PDF ke Word', ext: 'docx', endpoint: '/convert/pdf-to-docx', icon: FileWordIcon };
      case 'excel': return { title: 'PDF ke Excel', ext: 'xlsx', endpoint: '/convert/pdf-to-excel', icon: FileExcelIcon };
      case 'ppt': return { title: 'PDF ke PowerPoint', ext: 'pptx', endpoint: '/convert/pdf-to-ppt', icon: FilePptIcon };
      case 'image': return { title: 'PDF ke Gambar', ext: 'zip', endpoint: '/convert/pdf-to-image', icon: FileJpgIcon };
    }
  };

  const config = getModeConfig();
  const IconComponent = config.icon;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && fileWithBuffer && !isProcessing && !outputUrl) {
        e.preventDefault();
        handleConvert();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fileWithBuffer, isProcessing, outputUrl, pageRangeMode, startPage, endPage, excelExtractionMode, excelSheetStructure, pptLayoutMode, selectedImageFormat, imageDpi, imageExtractMode]);

  const resetState = useCallback(() => {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setFileWithBuffer(null);
    setPageCount(0);
    setSelectedImageFormat('jpg');
    setImageDpi(150);
    setImageExtractMode('pages');
    setPageRangeMode('all');
    setStartPage(1);
    setEndPage(1);
    setExcelExtractionMode('tables_only');
    setExcelSheetStructure('combined');
    setPptLayoutMode('editable');
    setIsProcessing(false);
    setOutputUrl(null);
    setOutputFilename('');
    setOutputSize(null);
  }, [outputUrl]);

  const handleFileChange = async (files: FileList | null) => {
    const selectedFile = files ? files[0] : null;
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;
    resetState();

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfjs = await ensurePdfjsReady();
      const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
      setPageCount(pdfDoc.numPages);
      setEndPage(pdfDoc.numPages);
      setFileWithBuffer({ file: selectedFile, buffer: arrayBuffer });
    } catch {
      addToast('Gagal memuat file PDF. Pastikan file tidak rusak.', 'error');
      resetState();
    }
  };

  const handleConvert = async () => {
    if (!fileWithBuffer || !checkQuotaBeforeAction()) return;

    setIsProcessing(true);
    setProcessingStep(1);

    let fileToSend: File | Blob = fileWithBuffer.file;
    let sendFilename = fileWithBuffer.file.name;
    let didClientSlice = false;

    if (pageRangeMode === 'custom') {
      const s = Math.max(1, startPage);
      const e = Math.min(pageCount, Math.max(s, endPage));

      if (s > 1 || e < pageCount) {
        try {
          const srcDoc = await PDFDocument.load(fileWithBuffer.buffer);
          const subDoc = await PDFDocument.create();
          const pageIndices: number[] = [];
          for (let i = s - 1; i <= e - 1; i++) pageIndices.push(i);
          const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
          copiedPages.forEach((p) => subDoc.addPage(p));
          const subBytes = await subDoc.save();
          fileToSend = new Blob([subBytes], { type: 'application/pdf' });
          const baseName = fileWithBuffer.file.name.replace(/\.[^/.]+$/, '');
          sendFilename = s === e ? `${baseName}_hal_${s}.pdf` : `${baseName}_hal_${s}-${e}.pdf`;
          didClientSlice = true;
        } catch (subErr) {
          console.error('Gagal mengekstrak rentang halaman PDF di client:', subErr);
        }
      }
    }

    const formData = new FormData();
    formData.append('file', fileToSend, sendFilename);

    if (mode === 'word' && pageRangeMode === 'custom' && !didClientSlice) {
      formData.append('start_page', String(Math.max(1, startPage)));
      formData.append('end_page', String(Math.min(pageCount, endPage)));
    } else if (mode === 'excel') {
      formData.append('mode', excelExtractionMode);
      formData.append('sheet_per_page', String(excelSheetStructure === 'per_page'));
    } else if (mode === 'ppt') {
      formData.append('layout_mode', pptLayoutMode);
    } else if (mode === 'image') {
      formData.append('output_format', selectedImageFormat);
      formData.append('dpi', String(imageDpi));
      formData.append('extract_mode', imageExtractMode);
    }

    try {
      setProcessingStep(2);
      const jobResult = await smartUploadAndProcess({
        file: fileWithBuffer.file,
        action: mode,
        directEndpoint: config.endpoint,
        formData,
        actionOptions: {
          mode: excelExtractionMode,
          sheet_per_page: excelSheetStructure === 'per_page',
          layout_mode: pptLayoutMode,
          output_format: selectedImageFormat,
          dpi: imageDpi,
          extract_mode: imageExtractMode,
        },
        userTier: user?.tier || 'free',
        onProgress: (pct) => {
          if (pct > 60) setProcessingStep(3);
        },
      });

      setProcessingStep(3);
      let finalFilename = jobResult.filename;
      if (!finalFilename || finalFilename === 'dokumen' || finalFilename === 'hasil-dokumen') {
        const base = fileWithBuffer.file.name.replace(/\.[^/.]+$/, '');
        const isRangeActive = pageRangeMode === 'custom' && (startPage > 1 || endPage < pageCount);
        const rangeSuffix = isRangeActive
          ? (startPage === endPage ? `_hal_${startPage}` : `_hal_${startPage}-${endPage}`)
          : '';
        finalFilename = mode === 'image' ? `${base}${rangeSuffix}.${selectedImageFormat}` : `${base}${rangeSuffix}.${config.ext}`;
      }

      const url = URL.createObjectURL(jobResult.blob);
      setOutputUrl(url);
      setOutputFilename(finalFilename);
      setOutputSize(jobResult.blob.size);
      consumeQuota();
      addToast('Konversi berhasil diselesaikan!', 'success');
    } catch (error: any) {
      addToast(error.message || 'Terjadi kesalahan saat konversi.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolContainer
      title={config.title}
      description={`Konversi dokumen PDF Anda ke format ${mode.toUpperCase()} dengan format presisi tinggi dan struktur rapi.`}
      onBack={onBack}
      canvasSlot={
        fileWithBuffer ? (
          <div className="h-full flex flex-col items-center justify-between p-6 bg-canvas overflow-y-auto">
            {/* Top Toolbar */}
            <div className="w-full max-w-xl p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center justify-between shadow-xs mb-4">
              <div className="flex items-center gap-2.5 truncate">
                <IconComponent className="w-5 h-5 shrink-0" />
                <span className="text-xs font-semibold text-text-primary truncate">
                  Target Konversi: {config.title} (.{config.ext})
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent-primary/10 text-accent-primary uppercase tracking-wider shrink-0">
                Akselerasi Tinggi
              </span>
            </div>

            {/* Document Paper Preview */}
            <div className="w-full max-w-xl max-h-[560px] overflow-auto rounded-xl border border-border-subtle bg-white shadow-lg p-3 my-auto">
              <PdfPreview buffer={fileWithBuffer.buffer} />
            </div>

            {/* Bottom Info Bar */}
            <div className="mt-4 flex items-center justify-between w-full max-w-xl text-xs text-text-secondary">
              <button
                onClick={resetState}
                className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Ganti Dokumen
              </button>
              <span className="truncate max-w-[280px]">
                {fileWithBuffer.file.name} ({formatFileSize(fileWithBuffer.file.size)})
              </span>
            </div>
          </div>
        ) : undefined
      }
      inspectorSlot={
        fileWithBuffer ? (
          <div className="p-5 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sliders className="w-4 h-4 text-accent-primary" />
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  Pengaturan Konversi
                </h3>
              </div>
              <p className="text-xs text-text-secondary">
                Konfigurasikan lembar halaman dan format output {mode.toUpperCase()}.
              </p>
            </div>

            {/* Page Range Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                Rentang Halaman
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPageRangeMode('all')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                    pageRangeMode === 'all'
                      ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                      : 'border-border-subtle bg-canvas text-text-secondary'
                  }`}
                >
                  Semua ({pageCount} Hal)
                </button>
                <button
                  type="button"
                  onClick={() => setPageRangeMode('custom')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                    pageRangeMode === 'custom'
                      ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                      : 'border-border-subtle bg-canvas text-text-secondary'
                  }`}
                >
                  Kustom
                </button>
              </div>

              {pageRangeMode === 'custom' && (
                <div className="flex items-center gap-2 p-2.5 bg-canvas rounded-xl border border-border-subtle">
                  <span className="text-[11px] text-text-muted">Hal:</span>
                  <input
                    type="number"
                    min={1}
                    max={pageCount}
                    value={startPage}
                    onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-border-subtle bg-surface text-center text-text-primary"
                  />
                  <span className="text-[11px] text-text-muted">s/d</span>
                  <input
                    type="number"
                    min={startPage}
                    max={pageCount}
                    value={endPage}
                    onChange={(e) => setEndPage(Math.min(pageCount, Math.max(startPage, parseInt(e.target.value) || startPage)))}
                    className="w-14 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-border-subtle bg-surface text-center text-text-primary"
                  />
                </div>
              )}
            </div>

            {/* Mode-Specific Settings */}
            {mode === 'word' && (
              <div className="p-3.5 rounded-xl bg-canvas border border-border-subtle flex items-start gap-2.5">
                <Cpu className="w-4 h-4 text-accent-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-text-primary">Akselerasi Multi-Core Aktif</h4>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Memproses teks, font, dan perataan paragraf secara paralel di memory engine.
                  </p>
                </div>
              </div>
            )}

            {mode === 'excel' && (
              <div className="space-y-4 pt-2 border-t border-border-subtle">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">
                    Mode Ekstraksi Tabel
                  </label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setExcelExtractionMode('tables_only')}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all ${
                        excelExtractionMode === 'tables_only'
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                          : 'border-border-subtle bg-canvas text-text-secondary'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5 inline mr-1.5" /> Hanya Tabel Bersih
                    </button>
                    <button
                      type="button"
                      onClick={() => setExcelExtractionMode('all_content')}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all ${
                        excelExtractionMode === 'all_content'
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                          : 'border-border-subtle bg-canvas text-text-secondary'
                      }`}
                    >
                      Seluruh Konten + Tabel
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">
                    Struktur Sheet Excel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExcelSheetStructure('combined')}
                      className={`p-2 rounded-xl border text-xs text-center transition-all ${
                        excelSheetStructure === 'combined'
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                          : 'border-border-subtle bg-canvas text-text-secondary'
                      }`}
                    >
                      1 Sheet Gabungan
                    </button>
                    <button
                      type="button"
                      onClick={() => setExcelSheetStructure('per_page')}
                      className={`p-2 rounded-xl border text-xs text-center transition-all ${
                        excelSheetStructure === 'per_page'
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                          : 'border-border-subtle bg-canvas text-text-secondary'
                      }`}
                    >
                      Sheet per Halaman
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === 'ppt' && (
              <div className="space-y-3 pt-2 border-t border-border-subtle">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Tata Letak Slide PowerPoint
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setPptLayoutMode('editable')}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all ${
                      pptLayoutMode === 'editable'
                        ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                        : 'border-border-subtle bg-canvas text-text-secondary'
                    }`}
                  >
                    Slide Dapat Diedit (Teks & Bentuk)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPptLayoutMode('visual')}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all ${
                      pptLayoutMode === 'visual'
                        ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                        : 'border-border-subtle bg-canvas text-text-secondary'
                    }`}
                  >
                    Presisi Visual (Gambar Utuh per Slide)
                  </button>
                </div>
              </div>
            )}

            {mode === 'image' && (
              <div className="space-y-4 pt-2 border-t border-border-subtle">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">
                    Format Gambar
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedImageFormat('jpg')}
                      className={`p-2 rounded-xl border text-xs text-center font-bold transition-all ${
                        selectedImageFormat === 'jpg'
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                          : 'border-border-subtle bg-canvas text-text-secondary'
                      }`}
                    >
                      JPG (Ukuran Ringan)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedImageFormat('png')}
                      className={`p-2 rounded-xl border text-xs text-center font-bold transition-all ${
                        selectedImageFormat === 'png'
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                          : 'border-border-subtle bg-canvas text-text-secondary'
                      }`}
                    >
                      PNG (Transparan / Tajam)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">
                    Resolusi Gambar (DPI)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setImageDpi(150)}
                      className={`p-2 rounded-xl border text-xs text-center transition-all ${
                        imageDpi === 150
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                          : 'border-border-subtle bg-canvas text-text-secondary'
                      }`}
                    >
                      150 DPI (Web & Presentasi)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageDpi(300)}
                      className={`p-2 rounded-xl border text-xs text-center transition-all ${
                        imageDpi === 300
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                          : 'border-border-subtle bg-canvas text-text-secondary'
                      }`}
                    >
                      300 DPI (Cetak Resolusi Tinggi)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : undefined
      }
      floatingBarSlot={
        fileWithBuffer ? (
          <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
              <IconComponent className="w-4 h-4 text-accent-primary" />
              <span>Format Tujuan: .{config.ext.toUpperCase()}</span>
            </div>
            <button
              onClick={() => handleConvert()}
              disabled={isProcessing}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-accent-primary hover:bg-accent-hover disabled:bg-canvas disabled:text-text-muted text-accent-contrast font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <IconComponent className="w-4 h-4" />
              <span>Konversi ke {mode.toUpperCase()}</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-accent-contrast/20 rounded text-[10px]">↵</kbd>
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Upload Phase */}
      {!fileWithBuffer && (
        <div className="max-w-2xl mx-auto space-y-6">
          <FileUploader
            onFileSelect={handleFileChange}
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={1}
            title={`Pilih Berkas PDF untuk Dikonversi ke ${mode.toUpperCase()}`}
            subtitle={`Konversi lembar PDF Anda ke berkas ${config.title} yang mudah diedit`}
          />
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="max-w-md mx-auto py-12">
          <ProcessingStepper
            currentStep={processingStep}
            steps={[
              { label: 'Menganalisis Struktur Halaman & Objek PDF' },
              { label: `Menjalankan Engine Konversi ke .${config.ext}` },
              { label: 'Memvalidasi Integritas Output & Menyiapkan Unduhan' },
            ]}
          />
        </div>
      )}

      {/* Result State */}
      {outputUrl && fileWithBuffer && (
        <div className="max-w-lg mx-auto py-8">
          <DownloadResultCard
            fileName={outputFilename || `hasil-${mode}.${config.ext}`}
            originalSize={fileWithBuffer.file.size}
            resultSize={outputSize || fileWithBuffer.file.size}
            onDownload={() => triggerFileDownload(outputUrl, outputFilename || `hasil-${mode}.${config.ext}`)}
            onReset={resetState}
            resetLabel="Konversi Berkas Lain"
            successTitle={`Konversi ke ${mode.toUpperCase()} Selesai!`}
            successDescription={`Dokumen Anda telah berhasil dikonversi ke format .${config.ext.toUpperCase()} dengan struktur rapi.`}
            resultUrl={outputUrl}
          />
        </div>
      )}
    </ToolContainer>
  );
};

export default ConvertPdf;
