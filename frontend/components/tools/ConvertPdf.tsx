import React, { useState, useRef, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import { 
  UploadIcon, DownloadIcon, CheckCircleIcon, TrashIcon, 
  FileWordIcon, FileExcelIcon, FilePptIcon, FileJpgIcon, 
  ZipIcon, FilePdfIcon 
} from '../icons';
import { 
  Sparkles, Layers, Table, FileText, Cpu, Check, 
  Settings2, Sliders, Image as ImageIcon, CheckCircle2, Download, Trash2, ArrowRight
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { useAuth } from '../../contexts/AuthContext';
import FileUploader from '../common/FileUploader';
import PdfPreview from './PdfPreview';

// pdfjsLib is loaded from CDN in index.html
declare const pdfjsLib: any;

import { BACKEND_URL } from '../../config';
import { smartUploadAndProcess } from '../../lib/gcsUploader';

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
  const [processingMessage, setProcessingMessage] = useState('');
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');
  const [isSingleImageOutput, setIsSingleImageOutput] = useState(false);

  // Opsi Rentang Halaman Universal (Word, Excel, PPT, Image)
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const { quota, consumeQuota, checkQuotaBeforeAction, setShowLimitModal } = useQuota();
  const { user } = useAuth();

  const getModeConfig = () => {
    switch (mode) {
      case 'word': return { title: 'PDF ke Word', icon: <FileWordIcon className="w-12 h-12 text-blue-600" />, ext: 'docx', endpoint: '/convert/pdf-to-docx' };
      case 'excel': return { title: 'PDF ke Excel', icon: <FileExcelIcon className="w-12 h-12 text-green-600" />, ext: 'xlsx', endpoint: '/convert/pdf-to-excel' };
      case 'ppt': return { title: 'PDF ke PowerPoint', icon: <FilePptIcon className="w-12 h-12 text-orange-600" />, ext: 'pptx', endpoint: '/convert/pdf-to-ppt' };
      case 'image': return { title: 'PDF ke Gambar', icon: <FileJpgIcon className="w-12 h-12 text-purple-600" />, ext: 'zip', endpoint: '/convert/pdf-to-image' };
    }
  };

  const config = getModeConfig();

  const resetState = useCallback(() => {
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
    setProcessingMessage('');
    setIsSingleImageOutput(false);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputFilename('');
  }, [outputUrl]);

  const handleFileChange = async (files: FileList | null) => {
    const selectedFile = files ? files[0] : null;
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;
    resetState();
    setIsProcessing(true);
    setProcessingMessage('Membaca dan menganalisis dokumen PDF...');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
      setPageCount(pdfDoc.numPages);
      setEndPage(pdfDoc.numPages);
      setFileWithBuffer({ file: selectedFile, buffer: arrayBuffer });
    } catch (error) {
      console.error(error);
      addToast("Gagal memuat file PDF. Pastikan file tidak rusak.", 'error');
      resetState();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvert = async () => {
    if (!fileWithBuffer) return;

    if (!checkQuotaBeforeAction()) {
      return;
    }

    setIsProcessing(true);
    setProcessingMessage(`Sedang mengonversi ke ${mode.toUpperCase()} dengan akselerasi tinggi...`);
    
    let fileToSend: File | Blob = fileWithBuffer.file;
    let sendFilename = fileWithBuffer.file.name;
    let didClientSlice = false;

    // Jika pengguna memilih rentang halaman tertentu (Universal untuk Word, Excel, PPT, Image),
    // kita potong (slice) langsung lembar halamannya via pdf-lib di browser sebelum dikirim ke backend.
    if (pageRangeMode === 'custom') {
      const s = Math.max(1, startPage);
      const e = Math.min(pageCount, Math.max(s, endPage));

      if (s > 1 || e < pageCount) {
        setProcessingMessage(`Mengekstrak lembar halaman ${s} sampai ${e}...`);
        try {
          const srcDoc = await PDFDocument.load(fileWithBuffer.buffer);
          const subDoc = await PDFDocument.create();
          const pageIndices: number[] = [];
          for (let i = s - 1; i <= e - 1; i++) {
            pageIndices.push(i);
          }
          const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
          copiedPages.forEach(p => subDoc.addPage(p));
          const subBytes = await subDoc.save();
          fileToSend = new Blob([subBytes], { type: 'application/pdf' });
          const baseName = fileWithBuffer.file.name.replace(/\.[^/.]+$/, '');
          sendFilename = s === e ? `${baseName}_hal_${s}.pdf` : `${baseName}_hal_${s}-${e}.pdf`;
          didClientSlice = true;
        } catch (subErr) {
          console.error("Gagal mengekstrak rentang halaman PDF di client:", subErr);
        }
      }
    }

    const formData = new FormData();
    formData.append('file', fileToSend, sendFilename);

    if (mode === 'word') {
      if (pageRangeMode === 'custom' && !didClientSlice) {
        formData.append('start_page', String(Math.max(1, startPage)));
        formData.append('end_page', String(Math.min(pageCount, endPage)));
      }
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 menit (didukung async queue)

    setIsProcessing(true);
    setProcessProgress(5);
    setProcessingMessage('Mengirim berkas ke engine pemroses...');

    try {
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
        onProgress: (pct, msg) => {
          setProcessProgress(pct);
          setProcessingMessage(msg);
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let finalFilename = jobResult.filename;
      if (!finalFilename || finalFilename === 'dokumen' || finalFilename === 'hasil-dokumen') {
        const base = fileWithBuffer.file.name.replace(/\.[^/.]+$/, '');
        const isRangeActive = pageRangeMode === 'custom' && (startPage > 1 || endPage < pageCount);
        const rangeSuffix = isRangeActive
          ? (startPage === endPage ? `_hal_${startPage}` : `_hal_${startPage}-${endPage}`)
          : '';

        if (mode === 'image') {
          finalFilename = `${base}${rangeSuffix}.${selectedImageFormat}`;
        } else {
          finalFilename = `${base}${rangeSuffix}.${config.ext}`;
        }
      }

      const isSingleImg = finalFilename.endsWith('.jpg') || finalFilename.endsWith('.png');
      setIsSingleImageOutput(isSingleImg);

      const url = URL.createObjectURL(jobResult.blob);
      setOutputUrl(url);
      setOutputFilename(finalFilename);
      consumeQuota();
      addToast('Konversi berhasil diselesaikan!', 'success');
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        addToast("Batas waktu terlampaui atau proses dibatalkan.", 'error');
      } else {
        addToast(error.message || "Terjadi kesalahan saat konversi.", 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const renderContent = () => {
    if (outputUrl) {
      return (
        <div className="text-center text-gray-600 dark:text-gray-300 flex flex-col items-center gap-6 animate-fade-in max-w-md mx-auto">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Konversi Selesai!</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Dokumen Anda telah berhasil dikonversi dengan presisi tinggi.
            </p>
            <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {outputFilename}
            </span>
          </div>

          <a 
            href={outputUrl} 
            download={outputFilename} 
            className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all text-base shadow-lg shadow-blue-500/25 w-full active:scale-98"
          >
            {isSingleImageOutput ? <ImageIcon className="w-5 h-5" /> : (mode === 'image' ? <ZipIcon className="w-5 h-5" /> : <Download className="w-5 h-5" />)}
            {isSingleImageOutput 
              ? `Unduh Gambar ${selectedImageFormat.toUpperCase()}` 
              : (mode === 'image' ? `Unduh Arsip ZIP Gambar` : `Unduh Hasil ${mode.toUpperCase()}`)}
          </a>

          <button 
            onClick={resetState} 
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
          >
            ← Konversi Dokumen Lain
          </button>
        </div>
      );
    }

    if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in max-w-md mx-auto">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-pulse" />
            </div>
          </div>
          <h4 className="text-lg text-slate-900 dark:text-white font-bold mb-1">{processingMessage || 'Memproses dokumen...'}</h4>

          {processProgress > 0 && (
            <div className="w-full max-w-xs mt-3 mb-2">
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                <span>Kemajuan</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{processProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, Math.max(5, processProgress))}%` }}
                />
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-2">
            Pemrosesan asinkronus aktif untuk stabilitas tanpa batas waktu gateway.
          </p>
        </div>
      );
    }


    if (fileWithBuffer) {
      return (
        <div className="flex flex-col lg:flex-row gap-6 items-start max-w-4xl mx-auto w-full animate-fade-in">
          {/* Sisi Kiri: Kartu Pratinjau Dokumen Asli */}
          <div className="w-full lg:w-72 bg-white dark:bg-[#1E222B] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:shadow-md transition-all shrink-0">
            <button 
              onClick={resetState} 
              className="absolute top-3 right-3 p-1.5 text-rose-500 bg-white/90 dark:bg-slate-800/90 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full shadow-md z-10 transition-transform active:scale-90 border border-slate-200 dark:border-slate-700"
              title="Ganti berkas PDF"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="w-full max-w-[200px] mx-auto rounded-lg overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-700/80">
              <PdfPreview buffer={fileWithBuffer.buffer} />
            </div>

            <div className="mt-3.5 text-center px-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={fileWithBuffer.file.name}>
                {fileWithBuffer.file.name}
              </p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                  {pageCount} Lembar
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {(fileWithBuffer.file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Panel Opsi Cerdas Sesuai Mode */}
          <div className="w-full flex-1 bg-white dark:bg-[#1E222B] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pengaturan Konversi</h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Standar Industri
              </span>
            </div>

            {/* OPSI UNIVERSAL: RENTANG HALAMAN (Word, Excel, PPT, Image) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Rentang Halaman:</span>
                {pageRangeMode === 'custom' && (
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                    {startPage === endPage ? `Hanya Hal ${startPage}` : `Hal ${startPage} - ${endPage} (${Math.min(pageCount, endPage) - Math.max(1, startPage) + 1} Lembar)`}
                  </span>
                )}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPageRangeMode('all')}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                    pageRangeMode === 'all'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Semua Halaman ({pageCount} Hal)
                </button>
                <button
                  onClick={() => setPageRangeMode('custom')}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                    pageRangeMode === 'custom'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Pilih Rentang Halaman
                </button>
              </div>

              {pageRangeMode === 'custom' && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 mt-2 animate-fade-in">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Dari Hal:</span>
                  <input
                    type="number"
                    min={1}
                    max={pageCount}
                    value={startPage}
                    onChange={e => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center text-slate-800 dark:text-slate-200"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Sampai Hal:</span>
                  <input
                    type="number"
                    min={startPage}
                    max={pageCount}
                    value={endPage}
                    onChange={e => setEndPage(Math.min(pageCount, Math.max(startPage, parseInt(e.target.value) || startPage)))}
                    className="w-16 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}
            </div>

            {/* OPSI KHUSUS WORD */}
            {mode === 'word' && (
              <div className="flex items-center gap-2 p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-800/40">
                <Cpu className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-300">Akselerasi Multi-Core Aktif</p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400">Memproses halaman secara paralel dengan performa CPU berkecepatan tinggi.</p>
                </div>
              </div>
            )}

            {/* OPSI KHUSUS EXCEL */}
            {mode === 'excel' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mode Ekstraksi Data:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={() => setExcelExtractionMode('tables_only')}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        excelExtractionMode === 'tables_only'
                          ? 'bg-green-50 dark:bg-green-950/40 border-green-500 text-green-900 dark:text-green-300 ring-2 ring-green-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <Table className="w-3.5 h-3.5 text-green-600" /> Hanya Tabel Bersih
                        </span>
                        {excelExtractionMode === 'tables_only' && <Check className="w-3.5 h-3.5 text-green-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Ekstrak tabel langsung ke spreadsheet tanpa teks pengantar berantakan (Rekomendasi).
                      </p>
                    </button>

                    <button
                      onClick={() => setExcelExtractionMode('all_content')}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        excelExtractionMode === 'all_content'
                          ? 'bg-green-50 dark:bg-green-950/40 border-green-500 text-green-900 dark:text-green-300 ring-2 ring-green-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-green-600" /> Tabel & Teks Dokumen
                        </span>
                        {excelExtractionMode === 'all_content' && <Check className="w-3.5 h-3.5 text-green-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Menyertakan judul, teks pengantar, dan tabel ke dalam spreadsheet.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Struktur Sheet Excel:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setExcelSheetStructure('combined')}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                        excelSheetStructure === 'combined'
                          ? 'bg-green-600 text-white border-green-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Satu Sheet Gabungan
                    </button>
                    <button
                      onClick={() => setExcelSheetStructure('per_page')}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                        excelSheetStructure === 'per_page'
                          ? 'bg-green-600 text-white border-green-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Sheet Per Halaman
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* OPSI KHUSUS PPT */}
            {mode === 'ppt' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mode Tata Letak Presentasi:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={() => setPptLayoutMode('editable')}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        pptLayoutMode === 'editable'
                          ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-300 ring-2 ring-orange-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-orange-600" /> Paragraf Teks Utuh
                        </span>
                        {pptLayoutMode === 'editable' && <Check className="w-3.5 h-3.5 text-orange-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Teks dikelompokkan per blok paragraf rapi sehingga mudah diedit di PowerPoint.
                      </p>
                    </button>

                    <button
                      onClick={() => setPptLayoutMode('visual')}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        pptLayoutMode === 'visual'
                          ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-300 ring-2 ring-orange-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-orange-600" /> Presisi Visual Slide (HD)
                        </span>
                        {pptLayoutMode === 'visual' && <Check className="w-3.5 h-3.5 text-orange-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Latar belakang, ornamen desain & warna slide dipertahankan 100% utuh seperti aslinya.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* OPSI KHUSUS IMAGE */}
            {mode === 'image' && (
              <div className="space-y-4">
                {/* Pilihan Format */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Format Gambar:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['jpg', 'png'] as ImageFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setSelectedImageFormat(fmt)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                          selectedImageFormat === fmt
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {fmt.toUpperCase()} {fmt === 'jpg' ? '(Ukuran Ringkas)' : '(Transparan & Tajam)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode Ekstraksi Gambar */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Metode Konversi:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={() => setImageExtractMode('pages')}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        imageExtractMode === 'pages'
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-300 ring-2 ring-purple-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-purple-600" /> Setiap Halaman ke Gambar
                        </span>
                        {imageExtractMode === 'pages' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {pageCount === 1 ? 'Langsung unduh 1 file gambar siap pakai.' : `Semua ${pageCount} halaman diubah menjadi gambar.`}
                      </p>
                    </button>

                    <button
                      onClick={() => setImageExtractMode('embedded')}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        imageExtractMode === 'embedded'
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-300 ring-2 ring-purple-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-purple-600" /> Ekstrak Foto Saja
                        </span>
                        {imageExtractMode === 'embedded' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Mengambil file foto/grafis asli yang tertanam di dalam PDF.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Resolusi / Kualitas DPI */}
                {imageExtractMode === 'pages' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Resolusi / Kualitas:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setImageDpi(150)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                          imageDpi === 150
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        150 DPI (Standar Cepat)
                      </button>
                      <button
                        onClick={() => setImageDpi(300)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                          imageDpi === 300
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        300 DPI (Ultra HD Jernih)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tombol Eksekusi Konversi */}
            <div className="pt-2">
              <button 
                onClick={handleConvert} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 active:scale-98"
              >
                <span>Konversi ke {config.title.replace('PDF ke ', '')} Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                Privasi terjaga 100% • Berkas diproses di server terenkripsi
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <FileUploader 
        onFileSelect={handleFileChange} 
        label={`Pilih PDF untuk Diubah ke ${mode === 'ppt' ? 'PowerPoint' : mode.toUpperCase()}`}
        description="Seret & lepas file PDF Anda untuk memulai konversi berkecepatan tinggi"
      />
    );
  };

  return (
    <ToolContainer 
      title={config.title} 
      description={`Konversi dokumen PDF ke format ${config.ext.toUpperCase()} secara presisi berkecepatan tinggi.`}
      onBack={onBack}
      currentStep={outputUrl ? 3 : (!fileWithBuffer ? 1 : 2)}
    >
      <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files)} />
      {renderContent()}
    </ToolContainer>
  );
};

export default ConvertPdf;

