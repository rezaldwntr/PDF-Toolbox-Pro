import React, { useState, useMemo, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { useAuth } from '../../contexts/AuthContext';
import { smartUploadAndProcess } from '../../lib/gcsUploader';
import {
  FileSearch,
  Sparkles,
  Search,
  Check,
  Copy,
  Languages,
  RotateCcw,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { formatFileSize } from '../../lib/formatters';
import { triggerFileDownload } from '../../lib/download';
import { getPdfPageCount } from '../../lib/pdfWorker';

interface LanguageOption {
  code: string;
  name: string;
  native: string;
  group: 'popular' | 'other';
}

const LANGUAGES: LanguageOption[] = [
  { code: 'ind', name: 'Indonesian', native: 'Bahasa Indonesia', group: 'popular' },
  { code: 'eng', name: 'English', native: 'English', group: 'popular' },
  { code: 'ara', name: 'Arabic', native: 'العربية', group: 'popular' },
  { code: 'chi_sim', name: 'Chinese (Simplified)', native: '简体中文', group: 'popular' },
  { code: 'chi_tra', name: 'Chinese (Traditional)', native: '繁體中文', group: 'popular' },
  { code: 'jpn', name: 'Japanese', native: '日本語', group: 'popular' },
  { code: 'kor', name: 'Korean', native: '한국어', group: 'popular' },
  { code: 'spa', name: 'Spanish', native: 'Español', group: 'other' },
  { code: 'fra', name: 'French', native: 'Français', group: 'other' },
  { code: 'deu', name: 'German', native: 'Deutsch', group: 'other' },
  { code: 'nld', name: 'Dutch', native: 'Nederlands', group: 'other' },
  { code: 'por', name: 'Portuguese', native: 'Português', group: 'other' },
  { code: 'rus', name: 'Russian', native: 'Русский', group: 'other' },
  { code: 'vie', name: 'Vietnamese', native: 'Tiếng Việt', group: 'other' },
  { code: 'tha', name: 'Thai', native: 'ภาษาไทย', group: 'other' },
  { code: 'hin', name: 'Hindi', native: 'हिन्दी', group: 'other' },
];

type OutputFormat = 'pdf' | 'txt';

const OcrPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Konfigurasi OCR (Maksimal 3 Bahasa)
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['ind', 'eng']);
  const [langSearch, setLangSearch] = useState<string>('');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('pdf');

  // State Pemrosesan & Hasil
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
      if (e.key === 'Enter' && file && !isProcessing && !resultUrl && selectedLangs.length > 0) {
        e.preventDefault();
        handleRunOcr();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isProcessing, resultUrl, selectedLangs, outputFormat]);

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

  const toggleLanguage = (code: string) => {
    if (selectedLangs.includes(code)) {
      if (selectedLangs.length <= 1) {
        addToast('Minimal satu bahasa harus dipilih.', 'warning');
        return;
      }
      setSelectedLangs((prev) => prev.filter((l) => l !== code));
    } else {
      if (selectedLangs.length >= 3) {
        addToast('Maksimal 3 bahasa dapat dipilih sekaligus untuk menjaga akurasi.', 'warning');
        return;
      }
      setSelectedLangs((prev) => [...prev, code]);
    }
  };

  const filteredLanguages = useMemo(() => {
    const q = langSearch.toLowerCase().trim();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [langSearch]);

  const handleRunOcr = async () => {
    if (!file || !checkQuotaBeforeAction()) return;

    if (selectedLangs.length === 0) {
      addToast('Pilih setidaknya satu bahasa dokumen.', 'warning');
      return;
    }

    setIsProcessing(true);
    setProcessingStep(1);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('languages', selectedLangs.join('+'));
    formData.append('output_format', outputFormat);

    try {
      setProcessingStep(2);
      const jobResult = await smartUploadAndProcess({
        file,
        action: 'ocr',
        directEndpoint: '/tools/ocr-pdf',
        formData,
        actionOptions: {
          languages: selectedLangs.join('+'),
          output_format: outputFormat,
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

      if (outputFormat === 'txt') {
        const textContent = await jobResult.blob.text();
        setExtractedSample(textContent.slice(0, 500));
      }

      consumeQuota();
      addToast('Proses OCR selesai! Dokumen siap diunduh.', 'success');
    } catch (error: any) {
      addToast(error.message || 'Terjadi kesalahan saat menjalankan OCR.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = () => {
    if (!extractedSample) return;
    navigator.clipboard.writeText(extractedSample);
    setCopied(true);
    addToast('Teks berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    const filename = outputFormat === 'txt' ? `ocr-${base}.txt` : `searchable-${base}.pdf`;
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

  return (
    <ToolContainer
      title="OCR PDF (Searchable PDF)"
      description="Kenali teks dari dokumen pindaian (scan) atau foto untuk menghasilkan Searchable PDF yang dapat dicari dan disalin."
      onBack={onBack}
      canvasSlot={
        file ? (
          <div className="h-full flex flex-col items-center justify-center p-6 bg-canvas">
            <div className="w-full max-w-lg bg-surface rounded-2xl border border-border-subtle p-8 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

              <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center mx-auto mb-5 shadow-xs">
                <FileSearch className="w-10 h-10 text-accent-primary animate-pulse" />
              </div>

              <h3 className="text-base font-bold text-text-primary mb-1 truncate px-4" title={file.name}>
                {file.name}
              </h3>
              <p className="text-xs text-text-secondary mb-6">
                {formatFileSize(file.size)}
                {totalPages > 0 ? ` • ${totalPages} Halaman` : ''} • Format: {outputFormat.toUpperCase()}
              </p>

              <div className="grid grid-cols-2 gap-3 text-left mb-6">
                <div className="p-3 rounded-xl bg-canvas border border-border-subtle">
                  <div className="flex items-center gap-2 mb-1">
                    <Search className="w-4 h-4 text-accent-primary" />
                    <span className="text-[11px] font-semibold text-text-primary">Searchable Layer</span>
                  </div>
                  <p className="text-[10px] text-text-secondary">Teks transparan disematkan di atas gambar pindaian.</p>
                </div>
                <div className="p-3 rounded-xl bg-canvas border border-border-subtle">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span className="text-[11px] font-semibold text-text-primary">Kualitas Asli</span>
                  </div>
                  <p className="text-[10px] text-text-secondary">Resolusi visual dan gambar pindaian tetap tajam.</p>
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
                  <ShieldCheck className="w-3.5 h-3.5" /> Mesin Tesseract Multi-Bahasa
                </span>
              </div>
            </div>
          </div>
        ) : undefined
      }
      inspectorSlot={
        file ? (
          <div className="p-5 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-1">
                Bahasa Dokumen (Maks 3)
              </h3>
              <p className="text-xs text-text-secondary">
                Pilih bahasa yang terkandung dalam dokumen scan Anda.
              </p>
            </div>

            {/* Selected Language Badges */}
            <div className="flex flex-wrap gap-1.5">
              {selectedLangs.map((code) => {
                const lang = LANGUAGES.find((l) => l.code === code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleLanguage(code)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent-primary text-accent-contrast shadow-xs"
                  >
                    <span>{lang?.native || lang?.name}</span>
                    <span className="text-[10px] opacity-75">✕</span>
                  </button>
                );
              })}
            </div>

            {/* Language Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                placeholder="Cari bahasa..."
                className="w-full pl-8 pr-3 py-1.5 bg-canvas border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-accent-primary"
              />
            </div>

            {/* Language Grid */}
            <div className="max-h-44 overflow-y-auto space-y-1 p-1 bg-canvas rounded-xl border border-border-subtle">
              {filteredLanguages.map((l) => {
                const isSelected = selectedLangs.includes(l.code);
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => toggleLanguage(l.code)}
                    className={`w-full p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-surface font-bold text-accent-primary shadow-xs'
                        : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                    }`}
                  >
                    <span>{l.native} ({l.name})</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-accent-primary" />}
                  </button>
                );
              })}
            </div>

            {/* Output Format */}
            <div className="pt-2 border-t border-border-subtle space-y-3">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                Format Luaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOutputFormat('pdf')}
                  className={`p-2.5 rounded-xl border text-xs text-center transition-all ${
                    outputFormat === 'pdf'
                      ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                      : 'border-border-subtle bg-canvas text-text-secondary'
                  }`}
                >
                  Searchable PDF
                </button>
                <button
                  type="button"
                  onClick={() => setOutputFormat('txt')}
                  className={`p-2.5 rounded-xl border text-xs text-center transition-all ${
                    outputFormat === 'txt'
                      ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                      : 'border-border-subtle bg-canvas text-text-secondary'
                  }`}
                >
                  Ekstrak Teks (.TXT)
                </button>
              </div>
            </div>
          </div>
        ) : undefined
      }
      floatingBarSlot={
        file ? (
          <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
              <Languages className="w-4 h-4 text-accent-primary" />
              <span>{selectedLangs.length} Bahasa OCR Dipilih</span>
            </div>
            <button
              onClick={() => handleRunOcr()}
              disabled={isProcessing || selectedLangs.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-accent-primary hover:bg-accent-hover disabled:bg-canvas disabled:text-text-muted text-accent-contrast font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <FileSearch className="w-4 h-4" />
              <span>Jalankan OCR PDF</span>
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
            title="Pilih Berkas PDF Scan untuk Dikenali Teksnya"
            subtitle="Unggah dokumen pindaian untuk menghasilkan PDF yang dapat dicari atau mengekstrak teksnya"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <FileSearch className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-primary">Searchable PDF</h4>
                <p className="text-[11px] text-text-muted">Teks bisa dicari Ctrl+F</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Languages className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-primary">100+ Bahasa</h4>
                <p className="text-[11px] text-text-muted">Multi-bahasa simultan</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-primary">Lapisan Transparan</h4>
                <p className="text-[11px] text-text-muted">Citra asli tetap utuh</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="max-w-md mx-auto py-12">
          <ProcessingStepper
            currentStep={processingStep}
            steps={[
              { label: 'Pra-pemrosesan Citra Pindaian & Binarisasi Halaman' },
              { label: `Mengekstrak Teks Melalui Engine OCR (${selectedLangs.join(', ')})` },
              { label: 'Menyusun Lapisan Teks Searchable PDF Transparan' },
            ]}
          />
        </div>
      )}

      {/* Result State */}
      {resultUrl && file && (
        <div className="max-w-xl mx-auto py-8 space-y-6">
          <DownloadResultCard
            fileName={outputFormat === 'txt' ? `ocr-${file.name.replace(/\.pdf$/i, '')}.txt` : `searchable-${file.name}`}
            originalSize={file.size}
            resultSize={resultSize || file.size}
            onDownload={handleDownload}
            onReset={handleReset}
            resetLabel="OCR Berkas Lain"
            successTitle="OCR Berhasil Diselesaikan!"
            successDescription="Teks pindaian kini telah dikenali secara digital dan siap disalin maupun dicari menggunakan tombol Ctrl+F."
            resultUrl={resultUrl}
          />

          {extractedSample && (
            <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary">Cuplikan Teks yang Dikenali:</span>
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

export default OcrPdf;
