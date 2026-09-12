import React, { useState, useMemo } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';
import {
  Eye,
  FileSearch,
  Download,
  RefreshCw,
  FileText,
  CheckCircle2,
  Sparkles,
  Info,
  Search,
  Check,
  Copy,
  Layers,
  FileCode,
  Languages,
  X
} from 'lucide-react';

declare const pdfjsLib: any;

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
  { code: 'equ', name: 'Math / Equations', native: 'Rumus & Notasi Matematika', group: 'other' },
];

type OutputFormat = 'pdf' | 'txt';

const OcrPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Konfigurasi OCR (Standar iLovePDF: Maksimal 3 Bahasa)
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['ind', 'eng']);
  const [langSearch, setLangSearch] = useState<string>('');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('pdf');

  // State Pemrosesan & Hasil
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStep, setProcessStep] = useState<string>('');
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

  // 2. Toggle pemilihan bahasa (Maksimal 3)
  const toggleLanguage = (code: string) => {
    if (selectedLangs.includes(code)) {
      if (selectedLangs.length <= 1) {
        addToast('Minimal satu bahasa harus dipilih.', 'warning');
        return;
      }
      setSelectedLangs(prev => prev.filter(l => l !== code));
    } else {
      if (selectedLangs.length >= 3) {
        addToast('Maksimal 3 bahasa dapat dipilih sekaligus untuk menjaga akurasi.', 'warning');
        return;
      }
      setSelectedLangs(prev => [...prev, code]);
    }
  };

  // Filter bahasa berdasarkan input pencarian
  const filteredLanguages = useMemo(() => {
    const q = langSearch.toLowerCase().trim();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      l =>
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [langSearch]);

  // 3. Eksekusi OCR PDF (POST /tools/ocr-pdf)
  const handleRunOcr = async () => {
    if (!file) return;

    if (!checkQuotaBeforeAction()) return;

    if (selectedLangs.length === 0) {
      addToast('Pilih setidaknya satu bahasa dokumen.', 'warning');
      return;
    }

    setIsProcessing(true);
    setProcessStep('Membaca citra pindaian halaman...');

    const stepTimer1 = setTimeout(() => {
      setProcessStep('Menjalankan pengenalan karakter multi-bahasa...');
    }, 1500);

    const stepTimer2 = setTimeout(() => {
      setProcessStep('Menyusun lapisan teks Searchable PDF...');
    }, 3500);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('languages', selectedLangs.join('+'));
    formData.append('output_format', outputFormat);

    try {
      const response = await fetch(`${BACKEND_URL}/tools/ocr-pdf`, {
        method: 'POST',
        body: formData,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!response.ok) {
        let errDetail = 'Gagal memproses OCR dokumen';
        try {
          const errJson = await response.json();
          if (errJson.detail) errDetail = errJson.detail;
        } catch {
          // json parse fallback
        }
        addToast(errDetail, 'error');
        setIsProcessing(false);
        return;
      }

      const sampleHeader = response.headers.get('X-Extracted-Text-Sample');
      if (sampleHeader) {
        setExtractedSample(sampleHeader);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize(blob.size);

      // Jika user memilih output format teks, baca cuplikan dari blob
      if (outputFormat === 'txt') {
        const textContent = await blob.text();
        setExtractedSample(textContent.slice(0, 500));
      }

      // Konsumsi kuota pemakaian
      consumeQuota();

      addToast('Proses OCR selesai! Dokumen siap diunduh.', 'success');
    } catch (error: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      console.error('Error OCR PDF:', error);
      addToast(error.message || 'Terjadi kesalahan jaringan saat menjalankan OCR.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Salin teks ke clipboard
  const handleCopyText = () => {
    if (!extractedSample) return;
    navigator.clipboard.writeText(extractedSample);
    setCopied(true);
    addToast('Teks berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // 5. Unduh berkas hasil OCR
  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    const base = file.name.replace(/\.pdf$/i, '');
    link.download = outputFormat === 'txt' ? `ocr-${base}.txt` : `searchable-${base}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 6. Reset state
  const handleReset = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setFile(null);
    setResultUrl(null);
    setResultSize(null);
    setExtractedSample('');
    setTotalPages(0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <ToolContainer
      title="OCR PDF (Searchable PDF)"
      description="Kenali teks dari dokumen pindaian (scan) atau foto untuk menghasilkan Searchable PDF yang dapat dicari dan disalin."
      onBack={onBack}
    >
      {/* =================================================================== */}
      {/* LANGKAH 1: UNGGAH DOKUMEN                                          */}
      {/* =================================================================== */}
      {!file && (
        <div className="max-w-2xl mx-auto space-y-6">
          <FileUploader
            onFileSelect={handlePdfSelect}
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={1}
            title="Pilih Berkas PDF Scan untuk Dikenali Teksnya"
            subtitle="Seret berkas PDF hasil pindaian atau foto ke sini, atau klik untuk memilih berkas"
          />

          {/* Keunggulan Fitur OCR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <FileSearch className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Searchable PDF</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Teks bisa dicari Ctrl+F</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Languages className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">100+ Bahasa</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Pilih maks 3 bahasa</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Lapisan Transparan</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Gambar asli tetap utuh</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LANGKAH 2: KONFIGURASI OCR & PILIHAN BAHASA                         */}
      {/* =================================================================== */}
      {file && !resultUrl && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          {/* Ringkasan Berkas */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3.5 truncate">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/60">
                <Eye className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {file.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>{formatFileSize(file.size)}</span>
                  {totalPages > 0 && (
                    <>
                      <span>•</span>
                      <span>{totalPages} Halaman</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleReset}
              title="Ganti berkas"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Konfigurasi OCR */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-6">
            
            {/* Banner Edukasi Akurasi Bahasa (Standar iLovePDF) */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3 text-xs text-blue-800 dark:text-blue-300">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Tips Akurasi:</strong> Tingkat akurasi pembacaan karakter akan meningkat drastis jika bahasa yang Anda pilih sesuai dengan bahasa utama yang ada pada dokumen.
              </p>
            </div>

            {/* Pemilihan Multibahasa (Maks 3 Bahasa) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Bahasa Dokumen (Maksimal 3)
                </label>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-mono">
                  {selectedLangs.length}/3 Dipilih
                </span>
              </div>

              {/* Kotak Pencarian Bahasa */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={langSearch}
                  onChange={e => setLangSearch(e.target.value)}
                  placeholder="Cari bahasa dokumen (contoh: Indonesia, English, Arab, Mandarin)..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Grid Pilihan Bahasa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 border border-slate-100 dark:border-slate-700/60 p-2 rounded-xl">
                {filteredLanguages.map(lang => {
                  const isChecked = selectedLangs.includes(lang.code);
                  return (
                    <div
                      key={lang.code}
                      onClick={() => toggleLanguage(lang.code)}
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {lang.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {lang.native} ({lang.code})
                        </div>
                      </div>

                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-2 ${
                        isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pilihan Format Output */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5">
                Format Hasil OCR
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setOutputFormat('pdf')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    outputFormat === 'pdf'
                      ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FileSearch className="w-3.5 h-3.5 text-blue-500" />
                      Searchable PDF (Disarankan)
                    </span>
                    <input
                      type="radio"
                      name="outputFormat"
                      value="pdf"
                      checked={outputFormat === 'pdf'}
                      onChange={() => setOutputFormat('pdf')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Dokumen PDF utuh dengan lapisan teks transparan yang dapat dicari dan disalin langsung.
                  </p>
                </label>

                <label
                  onClick={() => setOutputFormat('txt')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    outputFormat === 'txt'
                      ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-emerald-500" />
                      Ekstrak Teks (.txt)
                    </span>
                    <input
                      type="radio"
                      name="outputFormat"
                      value="txt"
                      checked={outputFormat === 'txt'}
                      onChange={() => setOutputFormat('txt')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Hanya mengambil teks bersih hasil pindaian dalam format file teks murni (.txt).
                  </p>
                </label>
              </div>
            </div>

            {/* Tombol Eksekusi OCR */}
            <button
              type="button"
              onClick={handleRunOcr}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-blue-500/25 shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{processStep || 'Menjalankan OCR...'}</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Mulai Pengenalan Teks (OCR)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LANGKAH 3: UNDUH HASIL OCR                                         */}
      {/* =================================================================== */}
      {resultUrl && file && (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-sm animate-fade-in">
          {/* Ikon Sukses */}
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto border-2 border-blue-200 dark:border-blue-800">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> Pengenalan Teks Berhasil
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Dokumen Siap Dicari & Disalin
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Lapisan teks tak terlihat telah ditanamkan ke dalam dokumen. Anda kini dapat mencari kata menggunakan <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">Ctrl+F</code> atau menyalin teksnya secara bebas.
            </p>
          </div>

          {/* Pratinjau Cuplikan Teks yang Dikenali */}
          {extractedSample && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Cuplikan Teks yang Dikenali:
                </span>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
                </button>
              </div>
              <p className="text-xs font-mono text-slate-600 dark:text-slate-400 line-clamp-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                {extractedSample}
              </p>
            </div>
          )}

          {/* Rincian Berkas */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Nama Berkas:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                {outputFormat === 'txt' ? `ocr-${file.name.replace(/\.pdf$/i, '')}.txt` : `searchable-${file.name}`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Bahasa OCR:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {selectedLangs.join(', ').toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Ukuran Berkas:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {resultSize ? formatFileSize(resultSize) : formatFileSize(file.size)}
              </span>
            </div>
          </div>

          {/* Tombol Unduh & Reset */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleDownload}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-blue-500/25 shadow-md active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>
                {outputFormat === 'txt' ? 'Unduh Berkas Teks (.txt)' : 'Unduh Searchable PDF'}
              </span>
            </button>

            <button
              onClick={handleReset}
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>OCR Berkas Lain</span>
            </button>
          </div>
        </div>
      )}
    </ToolContainer>
  );
};

export default OcrPdf;
