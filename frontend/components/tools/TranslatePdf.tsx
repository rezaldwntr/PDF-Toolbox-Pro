import React, { useState, useMemo } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';
import { handleJobOrDirectResponse } from '../../lib/jobPoller';
import {
  Languages,
  FileText,
  Sparkles,
  Download,
  RefreshCw,
  Copy,
  Check,
  Search,
  ArrowRightLeft,
  Layers,
  Globe,
  FileCheck,
  Info,
  ChevronDown,
  X,
  FileCode
} from 'lucide-react';

declare const pdfjsLib: any;

interface LanguageItem {
  code: string;
  name: string;
  native: string;
  group: 'popular' | 'world';
}

const LANGUAGES: LanguageItem[] = [
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', group: 'popular' },
  { code: 'en', name: 'English', native: 'English', group: 'popular' },
  { code: 'ar', name: 'Arabic', native: 'العربية', group: 'popular' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文', group: 'popular' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文', group: 'popular' },
  { code: 'ja', name: 'Japanese', native: '日本語', group: 'popular' },
  { code: 'ko', name: 'Korean', native: '한국어', group: 'popular' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', group: 'popular' },
  { code: 'es', name: 'Spanish', native: 'Español', group: 'world' },
  { code: 'fr', name: 'French', native: 'Français', group: 'world' },
  { code: 'de', name: 'German', native: 'Deutsch', group: 'world' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', group: 'world' },
  { code: 'pt', name: 'Portuguese', native: 'Português', group: 'world' },
  { code: 'ru', name: 'Russian', native: 'Русский', group: 'world' },
  { code: 'it', name: 'Italian', native: 'Italiano', group: 'world' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', group: 'world' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', group: 'world' },
  { code: 'th', name: 'Thai', native: 'ภาษาไทย', group: 'world' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', group: 'world' },
  { code: 'tl', name: 'Filipino / Tagalog', native: 'Tagalog', group: 'world' },
  { code: 'pl', name: 'Polish', native: 'Polski', group: 'world' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська', group: 'world' },
  { code: 'sv', name: 'Swedish', native: 'Svenska', group: 'world' },
  { code: 'da', name: 'Danish', native: 'Dansk', group: 'world' },
  { code: 'fi', name: 'Finnish', native: 'Suomi', group: 'world' },
  { code: 'no', name: 'Norwegian', native: 'Norsk', group: 'world' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά', group: 'world' },
  { code: 'cs', name: 'Czech', native: 'Čeština', group: 'world' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar', group: 'world' },
  { code: 'ro', name: 'Romanian', native: 'Română', group: 'world' },
];

type PageScope = 'all' | 'current' | 'custom';
type OutputMode = 'pdf' | 'txt';

const TranslatePdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [activePage, setActivePage] = useState<number>(1);

  // Konfigurasi Bahasa
  const [sourceLang, setSourceLang] = useState<string>('auto'); // 'auto' = deteksi otomatis
  const [targetLang, setTargetLang] = useState<string>('id');
  const [sourceSearch, setSourceSearch] = useState<string>('');
  const [targetSearch, setTargetSearch] = useState<string>('');
  const [showSourceDropdown, setShowSourceDropdown] = useState<boolean>(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState<boolean>(false);

  // Cakupan Halaman & Mode Output
  const [pageScope, setPageScope] = useState<PageScope>('all');
  const [customRange, setCustomRange] = useState<string>('');
  const [outputMode, setOutputMode] = useState<OutputMode>('pdf');

  // Status Pemrosesan & Hasil
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [translateProgress, setTranslateProgress] = useState<number>(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [extractedSample, setExtractedSample] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();

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
    setExtractedSample('');

    try {
      const buffer = await selected.arrayBuffer();
      if (typeof pdfjsLib !== 'undefined') {
        const loadedDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
        setTotalPages(loadedDoc.numPages);
      }
    } catch (e) {
      console.warn('Gagal membaca info halaman:', e);
    }
  };

  // Filter bahasa sumber & tujuan
  const filteredSourceLanguages = useMemo(() => {
    const q = sourceSearch.toLowerCase().trim();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [sourceSearch]);

  const filteredTargetLanguages = useMemo(() => {
    const q = targetSearch.toLowerCase().trim();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [targetSearch]);

  // Tukar bahasa (Swap)
  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') {
      addToast('Tentukan bahasa sumber spesifik untuk menukar bahasa', 'info');
      return;
    }
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  // Nama bahasa yang sedang aktif
  const getLangName = (code: string) => {
    if (code === 'auto') return 'Deteksi Otomatis (Auto-Detect)';
    const found = LANGUAGES.find((l) => l.code === code);
    return found ? `${found.native} (${found.name})` : code;
  };

  // 2. Eksekusi Terjemahkan PDF
  const handleTranslate = async () => {
    if (!file) {
      addToast('Pilih dokumen PDF terlebih dahulu', 'error');
      return;
    }

    if (pageScope === 'custom' && !customRange.trim()) {
      addToast('Tuliskan rentang halaman yang ingin diterjemahkan (contoh: 1-3, 5)', 'error');
      return;
    }

    // Periksa kuota harian
    if (!checkQuotaBeforeAction()) {
      return;
    }

    setIsProcessing(true);
    setTranslateProgress(5);
    setProcessStep('Mempersiapkan terjemahan dokumen AI...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source_lang', sourceLang);
      formData.append('target_lang', targetLang);
      formData.append('output_format', outputMode);
      formData.append('page_selection', pageScope);
      formData.append('current_page', String(activePage));
      if (pageScope === 'custom') {
        formData.append('custom_pages', customRange);
      }

      const res = await fetch(`${BACKEND_URL}/tools/translate-pdf`, {
        method: 'POST',
        body: formData,
      });

      const jobResult = await handleJobOrDirectResponse(
        res,
        BACKEND_URL,
        (pct, msg) => {
          setTranslateProgress(pct);
          setProcessStep(msg);
        }
      );

      if (jobResult.sample) {
        setExtractedSample(jobResult.sample);
      }

      const url = URL.createObjectURL(jobResult.blob);
      setResultUrl(url);
      setResultSize(jobResult.blob.size);

      // Jika format teks, baca sampel teks
      if (outputMode === 'txt') {
        const txt = await jobResult.blob.text();
        setExtractedSample(txt);
      }

      // Potong kuota setelah berhasil
      consumeQuota();
      addToast('Dokumen PDF berhasil diterjemahkan!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Terjadi kesalahan saat memproses terjemahan.', 'error');
    } finally {
      setIsProcessing(false);
      setProcessStep('');
    }

  };

  // Salin teks sampel
  const handleCopyText = () => {
    if (!extractedSample) return;
    navigator.clipboard.writeText(extractedSample);
    setCopied(true);
    addToast('Teks terjemahan disalin ke clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  // Reset form
  const handleReset = () => {
    setFile(null);
    setTotalPages(0);
    setResultUrl(null);
    setResultSize(null);
    setExtractedSample('');
    setActivePage(1);
    setCustomRange('');
  };

  // Unduh berkas hasil
  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    const base = file.name.replace(/\.[^/.]+$/, '');
    const ext = outputMode === 'pdf' ? 'pdf' : 'txt';
    a.download = `translated-${targetLang}-${base}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <ToolContainer
      title="Terjemahkan PDF"
      description="Terjemahkan dokumen PDF ke lebih dari 30+ bahasa dunia dengan tetap mempertahankan tata letak asli menggunakan AI canggih."
      badge="AI"
      onBack={onBack}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* JIKA BELUM ADA FILE */}
        {!file && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
            <FileUploader
              onFileSelect={handlePdfSelect}
              accept=".pdf"
              label="Pilih atau Letakkan Dokumen PDF di Sini"
              description="Format PDF berekstensi .pdf hingga 25 MB"
            />

            {/* Fitur Utama */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Preservasi Tata Letak</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Menjaga gambar, diagram, dan format dokumen tetap rapi di posisi aslinya.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">30+ Bahasa Global</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Mendukung Bahasa Indonesia, Inggris, Arab, Mandarin, Jepang, dan bahasa lainnya.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">2 Mode Output</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Unduh dalam bentuk PDF berformat rapi atau ringkasan dokumen teks (.txt).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* JIKA FILE SUDAH DIPILIH */}
        {file && (
          <div className="space-y-6">
            {/* Info Berkas Terpilih */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB {totalPages > 0 && `• ${totalPages} Halaman`}
                  </p>
                </div>
              </div>

              {!isProcessing && !resultUrl && (
                <button
                  onClick={handleReset}
                  className="text-xs font-semibold text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Ganti Dokumen
                </button>
              )}
            </div>

            {/* HASIL PEMROSESAN SUKSES */}
            {resultUrl && (
              <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      Dokumen Berhasil Diterjemahkan!
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {resultSize ? `${(resultSize / 1024).toFixed(1)} KB` : ''} • Format:{' '}
                      {outputMode === 'pdf' ? 'PDF (Tata Letak Asli)' : 'Dokumen Teks (.txt)'}
                    </p>
                  </div>
                </div>

                {/* Pratinjau Teks (jika ada sampel) */}
                {extractedSample && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                        Pratinjau Hasil Terjemahan:
                      </span>
                      <button
                        onClick={handleCopyText}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Tersalin!' : 'Salin Teks'}
                      </button>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 max-h-48 overflow-y-auto font-sans text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {extractedSample}
                    </div>
                  </div>
                )}

                {/* Aksi Unduh & Kembali */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-indigo-500/25 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Dokumen Terjemahan ({outputMode.toUpperCase()})
                  </button>

                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Terjemahkan Dokumen Lain
                  </button>
                </div>
              </div>
            )}

            {/* FORM PENGATURAN TERJEMAHAN (JIKA BELUM DITERJEMAHKAN) */}
            {!resultUrl && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                {/* Header Panel AI */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[11px] font-extrabold rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-sm">
                      <Sparkles className="w-3 h-3" /> AI
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Pengaturan Penerjemah Dokumen
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-indigo-500" />
                    Zero Disk I/O In-Memory
                  </span>
                </div>

                {/* 1. SELEKTOR BAHASA (DARI -> KE) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Pilihan Bahasa:
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-center">
                    {/* BAHASA SUMBER */}
                    <div className="relative">
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        Dari:
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSourceDropdown(!showSourceDropdown);
                          setShowTargetDropdown(false);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        <span className="truncate">{getLangName(sourceLang)}</span>
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>

                      {/* Dropdown Bahasa Sumber */}
                      {showSourceDropdown && (
                        <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 space-y-2 max-h-64 overflow-hidden flex flex-col animate-in fade-in duration-150">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Cari bahasa sumber..."
                              value={sourceSearch}
                              onChange={(e) => setSourceSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="overflow-y-auto flex-1 space-y-1">
                            {/* Opsi Deteksi Otomatis */}
                            <button
                              type="button"
                              onClick={() => {
                                setSourceLang('auto');
                                setShowSourceDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
                                sourceLang === 'auto'
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span>✨ Deteksi Otomatis (Auto-Detect)</span>
                              {sourceLang === 'auto' && <Check className="w-3.5 h-3.5" />}
                            </button>

                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

                            {filteredSourceLanguages.map((l) => (
                              <button
                                key={l.code}
                                type="button"
                                onClick={() => {
                                  setSourceLang(l.code);
                                  setShowSourceDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
                                  sourceLang === l.code
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span>
                                  {l.native} <span className="text-[10px] text-slate-400 font-normal">({l.name})</span>
                                </span>
                                {sourceLang === l.code && <Check className="w-3.5 h-3.5" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* TOMBOL TUKAR BAHASA */}
                    <div className="flex justify-center pt-4 md:pt-4">
                      <button
                        type="button"
                        onClick={handleSwapLanguages}
                        title="Tukar Bahasa Sumber & Tujuan"
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-500 dark:text-slate-400 transition-colors shadow-sm"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                    </div>

                    {/* BAHASA TUJUAN */}
                    <div className="relative">
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        Ke (Bahasa Target):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowTargetDropdown(!showTargetDropdown);
                          setShowSourceDropdown(false);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        <span className="truncate">{getLangName(targetLang)}</span>
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>

                      {/* Dropdown Bahasa Tujuan */}
                      {showTargetDropdown && (
                        <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 space-y-2 max-h-64 overflow-hidden flex flex-col animate-in fade-in duration-150">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Cari bahasa tujuan..."
                              value={targetSearch}
                              onChange={(e) => setTargetSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="overflow-y-auto flex-1 space-y-1">
                            {filteredTargetLanguages.map((l) => (
                              <button
                                key={l.code}
                                type="button"
                                onClick={() => {
                                  setTargetLang(l.code);
                                  setShowTargetDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
                                  targetLang === l.code
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span>
                                  {l.native} <span className="text-[10px] text-slate-400 font-normal">({l.name})</span>
                                </span>
                                {targetLang === l.code && <Check className="w-3.5 h-3.5" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. CAKUPAN HALAMAN */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    Cakupan Halaman yang Diterjemahkan:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPageScope('all')}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        pageScope === 'all'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-slate-800 dark:text-slate-200 mb-0.5">Semua Halaman</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {totalPages > 0 ? `Seluruh ${totalPages} halaman` : 'Semua halaman'}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPageScope('current')}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        pageScope === 'current'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-slate-800 dark:text-slate-200 mb-0.5">Halaman Tertentu</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Halaman ke-{activePage}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPageScope('custom')}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        pageScope === 'custom'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-slate-800 dark:text-slate-200 mb-0.5">Rentang Kustom</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Pilih lembar (misal: 1-3, 5)
                      </div>
                    </button>
                  </div>

                  {/* Input Halaman Tertentu Stepper */}
                  {pageScope === 'current' && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                        Pilih nomor halaman:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={activePage <= 1}
                          onClick={() => setActivePage((prev) => Math.max(1, prev - 1))}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                        >
                          ◀
                        </button>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2">
                          Hal {activePage} dari {totalPages || 1}
                        </span>
                        <button
                          type="button"
                          disabled={totalPages > 0 && activePage >= totalPages}
                          onClick={() => setActivePage((prev) => (totalPages > 0 ? Math.min(totalPages, prev + 1) : prev + 1))}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Input Rentang Kustom */}
                  {pageScope === 'custom' && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                        Ketikkan nomor/rentang halaman:
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 1-3, 5, 8"
                        value={customRange}
                        onChange={(e) => setCustomRange(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <p className="text-[10px] text-slate-400">Gunakan tanda hubung (-) untuk rentang dan koma (,) untuk memisahkan halaman.</p>
                    </div>
                  )}
                </div>

                {/* 3. PILIHAN FORMAT OUTPUT */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-indigo-500" />
                    Format Hasil Terjemahan:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setOutputMode('pdf')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        outputMode === 'pdf'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          PDF (Pertahankan Tata Letak)
                        </span>
                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold">
                          Rekomendasi
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Teks terjemahan menggantikan teks asli di posisi koordinat yang sama, gambar dan layout tetap utuh.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOutputMode('txt')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        outputMode === 'txt'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Dokumen Teks Murni (.txt)
                        </span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">
                          Teks Saja
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Ekstrak dan terjemahkan teks lengkap per halaman dalam berkas teks bersih yang siap disalin.
                      </p>
                    </button>
                  </div>
                </div>

                {/* STATUS PEMROSESAN */}
                {isProcessing && (
                  <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 space-y-3 animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                          Sedang Menerjemahkan Dokumen...
                        </p>
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5 truncate">
                          {processStep || 'Memproses berkas secara in-memory...'}
                        </p>
                      </div>
                      {translateProgress > 0 && (
                        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                          {translateProgress}%
                        </span>
                      )}
                    </div>

                    {translateProgress > 0 && (
                      <div className="w-full bg-indigo-200/60 dark:bg-indigo-900/60 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${Math.min(100, Math.max(5, translateProgress))}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}


                {/* TOMBOL EKSEKUSI */}
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleTranslate}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm shadow-md hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  {isProcessing ? 'Sedang Memproses...' : `Terjemahkan PDF ke ${getLangName(targetLang).split('(')[0]}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolContainer>
  );
};

export default TranslatePdf;
