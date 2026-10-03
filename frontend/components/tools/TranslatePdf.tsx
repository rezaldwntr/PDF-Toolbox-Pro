import React, { useState, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
import TranslateInspector from './translate/TranslateInspector';
import {
  LANGUAGES,
  PageScope,
  OutputMode,
} from './translate/TranslateLanguages';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { useAuth } from '../../contexts/AuthContext';
import { smartUploadAndProcess } from '../../lib/gcsUploader';
import {
  Languages,
  Sparkles,
  Copy,
  RotateCcw,
  Globe,
  Layers,
  FileCheck,
} from 'lucide-react';
import { formatFileSize } from '../../lib/formatters';
import { triggerFileDownload } from '../../lib/download';
import { getPdfPageCount } from '../../lib/pdfWorker';

const TranslatePdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [activePage, setActivePage] = useState<number>(1);

  // Konfigurasi Bahasa
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('id');
  const [pageScope, setPageScope] = useState<PageScope>('all');
  const [customRange, setCustomRange] = useState<string>('');
  const [outputMode, setOutputMode] = useState<OutputMode>('pdf');

  // Status Pemrosesan & Hasil
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(1);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [extractedSample, setExtractedSample] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();
  const { user } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && file && !isProcessing && !resultUrl) {
        e.preventDefault();
        handleTranslate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isProcessing, resultUrl, sourceLang, targetLang, pageScope, customRange, outputMode]);

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
    setExtractedSample('');

    try {
      const buffer = await selected.arrayBuffer();
      const pages = await getPdfPageCount(buffer);
      setTotalPages(pages);
    } catch (e) {
      console.warn('Gagal membaca info halaman:', e);
    }
  };

  const handleTranslate = async () => {
    if (!file || !checkQuotaBeforeAction()) return;

    setIsProcessing(true);
    setProcessingStep(1);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_lang', sourceLang);
    formData.append('target_lang', targetLang);
    formData.append('page_scope', pageScope);
    if (pageScope === 'current') formData.append('current_page', String(activePage));
    if (pageScope === 'custom' && customRange.trim()) formData.append('custom_range', customRange.trim());
    formData.append('output_mode', outputMode);

    try {
      setProcessingStep(2);
      const jobResult = await smartUploadAndProcess({
        file,
        action: 'translate',
        directEndpoint: '/tools/translate-pdf',
        formData,
        actionOptions: {
          source_lang: sourceLang,
          target_lang: targetLang,
          page_scope: pageScope,
          output_mode: outputMode,
        },
        userTier: user?.tier || 'free',
        onProgress: (pct) => {
          if (pct > 70) setProcessingStep(3);
        },
      });

      if (jobResult.sample) setExtractedSample(jobResult.sample);

      setProcessingStep(3);
      const url = URL.createObjectURL(jobResult.blob);
      setResultUrl(url);
      setResultSize(jobResult.blob.size);

      if (outputMode === 'txt') {
        const textContent = await jobResult.blob.text();
        setExtractedSample(textContent.slice(0, 500));
      }

      consumeQuota();
      addToast('Terjemahan berhasil diselesaikan!', 'success');
    } catch (error: any) {
      addToast(error.message || 'Terjadi kesalahan saat menerjemahkan.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = () => {
    if (!extractedSample) return;
    navigator.clipboard.writeText(extractedSample);
    setCopied(true);
    addToast('Teks terjemahan disalin ke clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    const filename = outputMode === 'txt' ? `terjemahan-${targetLang}-${base}.txt` : `terjemahan-${targetLang}-${base}.pdf`;
    triggerFileDownload(resultUrl, filename);
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setResultUrl(null);
    setResultSize(null);
    setExtractedSample('');
    setTotalPages(0);
  };

  const targetLangItem = LANGUAGES.find((l) => l.code === targetLang);

  return (
    <ToolContainer
      title="Terjemahkan PDF"
      description="Terjemahkan dokumen PDF ke berbagai bahasa dunia dengan kecerdasan Gemini AI tanpa merusak tata letak asli."
      onBack={onBack}
      canvasSlot={
        file ? (
          <div className="h-full flex flex-col items-center justify-center p-6 bg-canvas">
            <div className="w-full max-w-lg bg-surface rounded-2xl border border-border-subtle p-8 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />

              <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center mx-auto mb-5 shadow-xs">
                <Globe className="w-10 h-10 text-accent-primary animate-pulse" />
              </div>

              <h3 className="text-base font-bold text-text-primary mb-1 truncate px-4" title={file.name}>
                {file.name}
              </h3>
              <p className="text-xs text-text-secondary mb-6">
                {formatFileSize(file.size)}
                {totalPages > 0 ? ` • ${totalPages} Halaman` : ''} • Tujuan: {targetLangItem?.native || targetLang}
              </p>

              <div className="grid grid-cols-2 gap-3 text-left mb-6">
                <div className="p-3 rounded-xl bg-canvas border border-border-subtle">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-[11px] font-semibold text-text-primary">Gemini Pro AI</span>
                  </div>
                  <p className="text-[10px] text-text-secondary">Terjemahan kontekstual, idiom, dan istilah teknis akurat.</p>
                </div>
                <div className="p-3 rounded-xl bg-canvas border border-border-subtle">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-accent-primary" />
                    <span className="text-[11px] font-semibold text-text-primary">Tata Letak Utuh</span>
                  </div>
                  <p className="text-[10px] text-text-secondary">Posisi paragraf, gambar, dan tabel tetap dipertahankan.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-xs">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Ganti Dokumen
                </button>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <FileCheck className="w-3.5 h-3.5" /> Preservasi Format Asli
                </span>
              </div>
            </div>
          </div>
        ) : undefined
      }
      inspectorSlot={
        file ? (
          <TranslateInspector
            sourceLang={sourceLang}
            setSourceLang={setSourceLang}
            targetLang={targetLang}
            setTargetLang={setTargetLang}
            pageScope={pageScope}
            setPageScope={setPageScope}
            customRange={customRange}
            setCustomRange={setCustomRange}
            outputMode={outputMode}
            setOutputMode={setOutputMode}
            activePage={activePage}
            totalPages={totalPages}
          />
        ) : undefined
      }
      floatingBarSlot={
        file ? (
          <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
              <Languages className="w-4 h-4 text-accent-primary" />
              <span>Target: {targetLangItem?.native || targetLang} ({outputMode.toUpperCase()})</span>
            </div>
            <button
              onClick={() => handleTranslate()}
              disabled={isProcessing}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-accent-primary hover:bg-accent-hover disabled:bg-canvas disabled:text-text-muted text-accent-contrast font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Globe className="w-4 h-4" />
              <span>Terjemahkan Dokumen PDF</span>
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
            title="Pilih Berkas PDF untuk Diterjemahkan"
            subtitle="Unggah dokumen PDF untuk diterjemahkan ke lebih dari 30 bahasa dunia dengan Gemini AI"
          />
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="max-w-md mx-auto py-12">
          <ProcessingStepper
            currentStep={processingStep}
            steps={[
              { label: 'Mengekstrak Blok Teks & Koordinat Tata Letak Dokumen' },
              { label: `Menerjemahkan Isi secara Kontekstual ke ${targetLangItem?.native || targetLang}` },
              { label: 'Menyusun Ulang Halaman PDF dengan Format Preservasi Asli' },
            ]}
          />
        </div>
      )}

      {/* Result State */}
      {resultUrl && file && (
        <div className="max-w-xl mx-auto py-8 space-y-6">
          <DownloadResultCard
            fileName={outputMode === 'txt' ? `terjemahan-${targetLang}-${file.name.replace(/\.pdf$/i, '')}.txt` : `terjemahan-${targetLang}-${file.name}`}
            originalSize={file.size}
            resultSize={resultSize || file.size}
            onDownload={handleDownload}
            onReset={handleReset}
            resetLabel="Terjemahkan Berkas Lain"
            successTitle="Dokumen Berhasil Diterjemahkan!"
            successDescription={`Dokumen Anda telah diterjemahkan ke bahasa ${targetLangItem?.native || targetLang} dengan mempertahankan format asli.`}
            resultUrl={resultUrl}
          />

          {extractedSample && (
            <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary">Cuplikan Terjemahan:</span>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-1 text-accent-primary hover:underline font-semibold"
                >
                  <Copy className="w-3.5 h-3.5" /> {copied ? 'Tersalin!' : 'Salin Teks'}
                </button>
              </div>
              <pre className="p-3 bg-canvas rounded-lg text-xs font-mono text-text-secondary whitespace-pre-wrap max-h-36 overflow-y-auto border border-border-subtle">
                {extractedSample}
              </pre>
            </div>
          )}
        </div>
      )}
    </ToolContainer>
  );
};

export default TranslatePdf;
