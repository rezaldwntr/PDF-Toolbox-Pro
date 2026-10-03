
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import ToolContainer from '../common/ToolContainer';
import { TrashIcon, FilePdfIcon, CheckCircleIcon } from '../icons';
import { Scissors, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { useAuth } from '../../contexts/AuthContext';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
import { 
  extractPagesToPdf, 
  splitDocumentToParts, 
  bundlePdfsToZip, 
  CLIENT_PDF_MAX_SIZE_BYTES 
} from '../../lib/pdfWorker';

// Deklarasi global untuk pdfjsLib dari CDN
declare const pdfjsLib: any;

import { BACKEND_URL } from '../../config';

interface SplitPdfProps { onBack: () => void; }
interface PagePreview { pageNumber: number; url: string; selected: boolean; }
type FrontendMode = 'range' | 'selected' | 'fixed' | 'all';

/** Helper prosedural untuk eksekusi pemisahan PDF di memori browser (Client-Side). */
const executeClientSplit = async (
  buffer: ArrayBuffer, splitMode: FrontendMode, start: number, end: number, selectedPages: number[], step: number
): Promise<{ blob: Blob; ext: 'pdf' | 'zip' }> => {
  if (splitMode === 'range') {
    const pageNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    const bytes = await extractPagesToPdf(buffer, pageNumbers);
    return { blob: new Blob([bytes], { type: 'application/pdf' }), ext: 'pdf' };
  }
  if (splitMode === 'selected') {
    const bytes = await extractPagesToPdf(buffer, selectedPages);
    return { blob: new Blob([bytes], { type: 'application/pdf' }), ext: 'pdf' };
  }
  const parts = await splitDocumentToParts(buffer, splitMode === 'fixed' ? step : 1);
  return { blob: await bundlePdfsToZip(parts), ext: 'zip' };
};

const SplitPdf: React.FC<SplitPdfProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pagePreviews, setPagePreviews] = useState<PagePreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputFileType, setOutputFileType] = useState<'pdf' | 'zip'>('pdf');
  const [processingMessage, setProcessingMessage] = useState('');
  
  const [mode, setMode] = useState<FrontendMode>('range');
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(1);
  const [fixedStep, setFixedStep] = useState<number>(2);
  
  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();

  const resetState = () => {
    setFile(null); setPagePreviews([]); setOutputUrl(null);
    setRangeStart(1); setRangeEnd(1); setFixedStep(2);
    setMode('range'); setOutputFileType('pdf');
  };

  const handleFileChange = async (files: FileList | null) => {
    const selectedFile = files ? files[0] : null;
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setOutputUrl(null);
      setIsLoadingFile(true);
      setProcessingMessage('Membaca PDF dan membuat pratinjau...');

      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
        
        const previews: PagePreview[] = [];
        const numPages = pdfDoc.numPages;

        // Render thumbnail untuk setiap halaman
        for (let i = 1; i <= numPages; i++) {
            setProcessingMessage(`Memuat halaman ${i} dari ${numPages}...`);
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.3 }); // Low res for thumbnails
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            previews.push({
                pageNumber: i,
                url: canvas.toDataURL('image/jpeg', 0.8),
                selected: false
            });
        }
        
        setPagePreviews(previews);
        setRangeEnd(numPages); // Default end range to max pages
      } catch (error) {
        console.error(error);
        addToast("Gagal memuat PDF. File mungkin rusak atau terproteksi.", 'error');
        resetState();
      } finally {
        setIsLoadingFile(false);
      }
    }
  };

  const togglePageSelection = (pageNumber: number) => {
    if (mode !== 'selected') setMode('selected');
    setPagePreviews(prev => prev.map(p => 
        p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p
    ));
  };

  const selectAllPages = () => {
    setPagePreviews(prev => prev.map(p => ({ ...p, selected: true })));
    setMode('selected');
  };

  const deselectAllPages = () => {
    setPagePreviews(prev => prev.map(p => ({ ...p, selected: false })));
    setMode('selected');
  };

  const handleProcess = async () => {
    if (!file) return;

    // PWA Offline Hybrid Tier Gating:
    // Tamu & Free saat offline dibatasi 10 MB per berkas. Pro = Unlimited Offline.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (!isPro && file.size > 10 * 1024 * 1024) {
        addToast('Batas Berkas Offline Gratis (Maks 10 MB). Upgrade ke Pro untuk pemrosesan offline tanpa batas!', 'warning');
        openPaywall('offline_large_file');
        return;
      }
    } else {
      if (!checkQuotaBeforeAction()) {
        return;
      }
    }

    const selectedPages = pagePreviews.filter((p) => p.selected).map((p) => p.pageNumber);
    if (mode === 'selected' && selectedPages.length === 0) {
      addToast('Pilih setidaknya satu halaman.', 'warning');
      return;
    }

    setIsProcessing(true);
    const isClientSide = file.size <= CLIENT_PDF_MAX_SIZE_BYTES;

    // 1. Eksekusi Pemisahan Instan di Browser (Client-Side WASM / In-Memory)
    if (isClientSide) {
      setProcessingMessage('Memisahkan di browser (Privasi 100% In-Memory)...');
      try {
        const buffer = await file.arrayBuffer();
        const { blob, ext } = await executeClientSplit(
          buffer,
          mode,
          rangeStart,
          rangeEnd,
          selectedPages,
          fixedStep
        );
        setOutputUrl(URL.createObjectURL(blob));
        setOutputFileType(ext);
        consumeQuota();
        addToast('Pemisahan PDF instan selesai di browser!', 'success');
        setIsProcessing(false);
        setProcessingMessage('');
        return;
      } catch (clientError: any) {
        console.warn('Client-side split gagal, beralih ke backend fallback:', clientError);
        setProcessingMessage('Beralih ke Server...');
      }
    } else {
      setProcessingMessage('Memproses berkas besar di server...');
    }

    // 2. Fallback Otomatis ke Backend jika file besar (>50MB) atau terenkripsi
    const formData = new FormData();
    formData.append('file', file);
    let resultExt: 'pdf' | 'zip' = 'pdf';

    if (mode === 'range') {
      formData.append('split_mode', 'extract');
      formData.append('pages', `${rangeStart}-${rangeEnd}`);
      resultExt = 'pdf';
    } else if (mode === 'selected') {
      formData.append('split_mode', 'extract');
      formData.append('pages', selectedPages.join(','));
      resultExt = 'pdf';
    } else if (mode === 'fixed') {
      formData.append('split_mode', 'fixed');
      formData.append('fixed_step', fixedStep.toString());
      resultExt = 'zip';
    } else if (mode === 'all') {
      formData.append('split_mode', 'all');
      resultExt = 'zip';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    try {
      const response = await fetch(`${BACKEND_URL}/tools/split-pdf`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || err.error || 'Gagal memisahkan PDF.');
      }

      const blob = await response.blob();
      setOutputUrl(URL.createObjectURL(blob));
      setOutputFileType(resultExt);
      consumeQuota();
      addToast('Pemisahan berhasil diselesaikan di server!', 'success');
    } catch (error: any) {
      clearTimeout(timeoutId);
      addToast(error.name === 'AbortError' ? 'Waktu habis (5 menit).' : error.message, 'error');
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Keyboard shortcut Enter: eksekusi jika berkas siap (Design Bible Section 4.2 & 5.2)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && file && !isProcessing && !outputUrl && !isLoadingFile) {
        e.preventDefault();
        handleProcess();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isProcessing, outputUrl, isLoadingFile, handleProcess]);

  if (isProcessing) {
    return (
      <ToolContainer title="Memproses Pemisahan PDF" onBack={onBack} currentStep={2}>
        <ProcessingStepper toolName="Pemisah PDF" isLocalRam={file ? file.size <= CLIENT_PDF_MAX_SIZE_BYTES : true} />
      </ToolContainer>
    );
  }

  if (outputUrl) {
    return (
      <ToolContainer title="Pemisahan Selesai!" onBack={onBack} currentStep={3}>
        <DownloadResultCard
          fileName={`split-${file?.name.replace('.pdf', '') || 'document'}.${outputFileType}`}
          downloadUrl={outputUrl}
          originalSize={file?.size}
          resultSize={file?.size ? Math.round(file.size * (mode === 'all' || mode === 'fixed' ? 0.9 : 0.4)) : undefined}
          onReset={() => setOutputUrl(null)}
          resetLabel="Pisahkan Bagian Lain"
          customSuccessMessage="Dokumen Anda berhasil dipotong dan siap diunduh."
          isLocalRam={file ? file.size <= CLIENT_PDF_MAX_SIZE_BYTES : true}
        />
      </ToolContainer>
    );
  }

  // KANVAS: Pratinjau Grid Halaman Interaktif (Section 5.2)
  const canvasSlot = file && (
    <div className="w-full space-y-3">
      {isLoadingFile ? (
        <div className="flex flex-col items-center justify-center p-16 bg-surface rounded-2xl border border-border-subtle shadow-card">
          <div className="w-10 h-10 border-3 border-accent-primary/20 border-t-accent-primary rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold text-text-secondary">{processingMessage}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-text-secondary px-1">
            <span>Pratinjau Halaman Dokumen ({pagePreviews.length} Lembar):</span>
            <span className="text-[11px] text-text-secondary">
              {mode === 'selected' ? 'Klik kartu untuk memilih' : `Rentang aktif: Hal ${rangeStart} s.d ${rangeEnd}`}
            </span>
          </div>

          <div className="bg-canvas rounded-2xl p-4 max-h-[640px] overflow-y-auto border border-border-subtle">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {pagePreviews.map((page) => {
                const isSelected = 
                  (mode === 'selected' && page.selected) || 
                  (mode === 'range' && page.pageNumber >= rangeStart && page.pageNumber <= rangeEnd);

                return (
                  <div 
                    key={page.pageNumber}
                    onClick={() => togglePageSelection(page.pageNumber)}
                    className={`relative group cursor-pointer rounded-xl overflow-hidden transition-all duration-200 border-2 bg-surface shadow-paper ${
                      isSelected
                        ? 'border-accent-primary ring-2 ring-accent-primary/20' 
                        : 'border-border-subtle hover:border-border-strong'
                    }`}
                  >
                    <img src={page.url} alt={`Halaman ${page.pageNumber}`} className="w-full h-auto object-contain" />
                    <div className="p-1.5 bg-surface border-t border-border-subtle text-center">
                      <span className="text-[11px] font-bold text-text-primary">Hal {page.pageNumber}</span>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center shadow-xs">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // PANEL INSPEKTOR: Mode Selector & Parameter Dinamis (Section 5.2)
  const inspectorSlot = file && (
    <div className="space-y-4">
      {/* File Info Card */}
      <div className="flex items-center gap-2.5 p-3 bg-surface rounded-xl border border-border-subtle shadow-2xs">
        <div className="w-8 h-8 rounded-lg bg-status-error/10 text-status-error flex items-center justify-center shrink-0">
          <FilePdfIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-xs text-text-primary" title={file.name}>{file.name}</p>
          <p className="text-[11px] text-text-secondary font-mono">{pagePreviews.length} Hal • {(file.size / 1024).toFixed(0)} KB</p>
        </div>
        <button
          type="button"
          onClick={resetState}
          title="Ganti berkas"
          className="text-text-secondary hover:text-status-error p-1.5 rounded-lg hover:bg-elevated transition-colors cursor-pointer"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Mode Pemisahan</label>
        <div className="space-y-1.5">
          {[
            { id: 'range', title: 'Rentang Halaman', desc: 'Satu PDF berisi halaman X s.d Y' },
            { id: 'selected', title: 'Halaman Terpilih', desc: 'Pilih manual visual pada kanvas' },
            { id: 'fixed', title: 'Pecah per X Halaman', desc: 'Setiap X halaman jadi 1 berkas (ZIP)' },
            { id: 'all', title: 'Ekstrak Semua Halaman', desc: 'Setiap halaman jadi berkas terpisah (ZIP)' },
          ].map((m) => (
            <label
              key={m.id}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                mode === m.id
                  ? 'border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary/30'
                  : 'border-border-subtle bg-surface hover:bg-elevated'
              }`}
            >
              <input
                type="radio"
                name="splitMode"
                checked={mode === m.id}
                onChange={() => setMode(m.id as FrontendMode)}
                className="mt-0.5 text-accent-primary focus:ring-accent-primary cursor-pointer"
              />
              <div className="text-xs min-w-0">
                <span className="font-bold text-text-primary block leading-tight">{m.title}</span>
                <span className="text-[10px] text-text-secondary block mt-0.5">{m.desc}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Dynamic Controls based on Mode */}
      <div className="p-3 bg-surface rounded-xl border border-border-subtle shadow-2xs">
        {mode === 'range' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-primary block">Atur Rentang (Dari - Sampai)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={pagePreviews.length}
                value={rangeStart}
                onChange={(e) => setRangeStart(Number(e.target.value))}
                className="w-full p-2 border border-border-subtle rounded-lg bg-surface text-text-primary text-xs font-semibold focus:ring-1 focus:ring-accent-primary outline-none"
              />
              <span className="text-text-secondary text-xs">-</span>
              <input
                type="number"
                min="1"
                max={pagePreviews.length}
                value={rangeEnd}
                onChange={(e) => setRangeEnd(Number(e.target.value))}
                className="w-full p-2 border border-border-subtle rounded-lg bg-surface text-text-primary text-xs font-semibold focus:ring-1 focus:ring-accent-primary outline-none"
              />
            </div>
            <p className="text-[10px] text-text-secondary">Menghasilkan 1 PDF berisi halaman {rangeStart} s.d {rangeEnd}.</p>
          </div>
        )}

        {mode === 'selected' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-primary">Halaman Terpilih</label>
              <div className="flex gap-1">
                <button type="button" onClick={selectAllPages} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-elevated border border-border-subtle text-text-primary hover:bg-surface cursor-pointer">Pilih Semua</button>
                <button type="button" onClick={deselectAllPages} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-elevated border border-border-subtle text-text-secondary hover:text-text-primary cursor-pointer">Reset</button>
              </div>
            </div>
            <p className="text-xs font-mono font-medium text-text-primary truncate">
              {pagePreviews.filter(p => p.selected).map(p => p.pageNumber).join(', ') || 'Klik lembar di kiri'}
            </p>
          </div>
        )}

        {mode === 'fixed' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-primary block">Pisahkan Setiap</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={pagePreviews.length}
                value={fixedStep}
                onChange={(e) => setFixedStep(Number(e.target.value))}
                className="w-20 p-2 border border-border-subtle rounded-lg bg-surface text-text-primary text-xs font-semibold outline-none focus:ring-1 focus:ring-accent-primary"
              />
              <span className="text-xs text-text-secondary">Halaman per berkas</span>
            </div>
          </div>
        )}

        {mode === 'all' && (
          <p className="text-xs text-text-secondary leading-snug">
            Mengekstrak seluruh {pagePreviews.length} halaman menjadi {pagePreviews.length} berkas PDF individual di dalam arsip ZIP.
          </p>
        )}
      </div>

      {/* Security Assurance */}
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface border border-border-subtle text-[11px] text-text-secondary">
        <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
        <span>Pemrosesan lokal cepat di memori browser (Zero upload).</span>
      </div>

      {/* Primary Action Button (CTA) with Enter shortcut */}
      <button
        type="button"
        onClick={handleProcess}
        disabled={isProcessing || (mode === 'selected' && !pagePreviews.some(p => p.selected))}
        className="w-full bg-accent-primary hover:bg-accent-hover text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-xs sm:text-sm mt-3"
      >
        <Scissors size={15} />
        <span>Pisahkan PDF {mode === 'fixed' || mode === 'all' ? '(ZIP)' : ''} (↵)</span>
      </button>
    </div>
  );

  return (
    <ToolContainer 
      title="Pisahkan PDF" 
      description="Ekstrak halaman tertentu atau potong dokumen menjadi beberapa bagian terpisah."
      onBack={onBack} 
      maxWidth="max-w-6xl"
      currentStep={!file ? 1 : 2}
      canvasSlot={file ? canvasSlot : undefined}
      inspectorSlot={file ? inspectorSlot : undefined}
      fileInfo={file ? { originalSize: file.size, estimatedSize: Math.round(file.size * (mode === 'all' || mode === 'fixed' ? 0.9 : 0.4)), isLocalRam: file.size <= CLIENT_PDF_MAX_SIZE_BYTES } : undefined}
    >
      {!file && (
        <FileUploader 
          onFileSelect={handleFileChange} 
          label="Pilih PDF untuk Dipisahkan"
          description="Seret file PDF ke sini untuk memilih atau mengekstrak halaman"
        />
      )}
    </ToolContainer>
  );
};

export default SplitPdf;
