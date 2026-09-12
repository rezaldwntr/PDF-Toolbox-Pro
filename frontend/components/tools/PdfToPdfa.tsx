import React, { useState } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';
import {
  FileCheck,
  Download,
  RefreshCw,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Info,
  Archive,
  Layers,
  FileCode,
  Award,
  BookOpen,
  X
} from 'lucide-react';

declare const pdfjsLib: any;

type PdfaPart = 1 | 2 | 3;
type ConformanceLevel = 'b' | 'a';

interface StandardOption {
  part: PdfaPart;
  name: string;
  iso: string;
  badge?: string;
  tag: string;
  desc: string;
  features: string[];
}

const STANDARDS: StandardOption[] = [
  {
    part: 2,
    name: 'PDF/A-2',
    iso: 'ISO 19005-2:2011',
    badge: 'Disarankan',
    tag: 'Standar Modern',
    desc: 'Format pengarsipan paling seimbang dan direkomendasikan untuk sebagian besar kebutuhan dokumen saat ini.',
    features: ['Mendukung transparansi grafis', 'Kompresi efisien JPEG 2000', 'Font OpenType mandiri (embedded)']
  },
  {
    part: 1,
    name: 'PDF/A-1',
    iso: 'ISO 19005-1:2005',
    tag: 'Kompatibilitas Legasi',
    desc: 'Standar generasi pertama berbasis PDF 1.4 untuk kompatibilitas mutlak dengan sistem arsip pemerintah lama.',
    features: ['Kompatibilitas pembaca tertinggi', 'Standar resmi lembaga arsip negara', 'Meratakan transparansi visual']
  },
  {
    part: 3,
    name: 'PDF/A-3',
    iso: 'ISO 19005-3:2012',
    tag: 'Dukungan Lampiran',
    desc: 'Mengizinkan penyertaan lampiran berkas terstruktur (seperti faktur XML / ZUGFeRD) di dalam arsip.',
    features: ['Dukungan lampiran berkas biner/XML', 'Ideal untuk e-Faktur & kontrak digital', 'Integritas arsip terjamin']
  }
];

const PdfToPdfa: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfVersion, setPdfVersion] = useState<string>('1.7');
  const [pageCount, setPageCount] = useState<number>(0);

  // Konfigurasi Standar PDF/A
  const [selectedPart, setSelectedPart] = useState<PdfaPart>(2);
  const [conformance, setConformance] = useState<ConformanceLevel>('b');

  // State Pemrosesan & Hasil
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

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
    setPageCount(0);

    // Baca versi PDF dari header berkas (%PDF-x.x)
    try {
      const headerSlice = await selected.slice(0, 30).text();
      const versionMatch = headerSlice.match(/%PDF-(\d\.\d)/);
      if (versionMatch) {
        setPdfVersion(versionMatch[1]);
      }
    } catch {
      setPdfVersion('1.7');
    }

    // Baca jumlah halaman dengan pdfjsLib
    try {
      const buffer = await selected.arrayBuffer();
      if (typeof pdfjsLib !== 'undefined') {
        const loadedDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
        setPageCount(loadedDoc.numPages);
      }
    } catch (e) {
      console.warn('Gagal membaca info halaman:', e);
    }
  };

  // 2. Eksekusi Konversi PDF/A (POST /tools/convert-pdfa)
  const handleConvertPdfa = async () => {
    if (!file) return;

    if (!checkQuotaBeforeAction()) return;

    setIsProcessing(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('pdfa_part', selectedPart.toString());
    formData.append('conformance', conformance);

    try {
      const response = await fetch(`${BACKEND_URL}/tools/convert-pdfa`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errDetail = 'Gagal mengonversi dokumen ke PDF/A';
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

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize(blob.size);

      // Konsumsi kuota pemakaian
      consumeQuota();

      addToast(`Dokumen berhasil dikonversi ke PDF/A-${selectedPart}${conformance}!`, 'success');
    } catch (error: any) {
      console.error('Error convert PDF/A:', error);
      addToast(error.message || 'Terjadi kesalahan jaringan saat konversi berkas.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Unduh berkas hasil konversi
  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    const base = file.name.replace(/\.pdf$/i, '');
    link.download = `pdfa-${selectedPart}${conformance}-${base}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. Reset state
  const handleReset = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setFile(null);
    setResultUrl(null);
    setResultSize(null);
    setPageCount(0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <ToolContainer
      title="PDF ke PDF/A"
      description="Konversi dokumen PDF ke format arsip standar ISO 19005 untuk retensi jangka panjang yang diakui secara hukum."
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
            title="Pilih Berkas PDF untuk Dikonversi ke PDF/A"
            subtitle="Seret berkas PDF ke sini atau klik untuk memilih dokumen dari komputer"
          />

          {/* Keunggulan Standar ISO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Standar ISO 19005</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Kepatuhan hukum & audit</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Arsip Abadi</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Font embedded mandiri</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Integritas Dokumen</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">100% identik di masa depan</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LANGKAH 2: PENGATURAN STANDAR PDF/A & TINGKAT KEPATUHAN           */}
      {/* =================================================================== */}
      {file && !resultUrl && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          {/* Ringkasan Berkas */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3.5 truncate">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/60">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {file.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>Versi PDF {pdfVersion}</span>
                  {pageCount > 0 && (
                    <>
                      <span>•</span>
                      <span>{pageCount} Halaman</span>
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

          {/* Form Pemilihan Standar ISO PDF/A */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-6">
            
            {/* Bagian 1: Pilih Standar ISO */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  1. Pilih Standar ISO PDF/A
                </label>
                <span className="text-[11px] text-slate-400">Berdasarkan tahun spesifikasi</span>
              </div>

              <div className="space-y-3">
                {STANDARDS.map(std => {
                  const isSelected = selectedPart === std.part;
                  return (
                    <div
                      key={std.part}
                      onClick={() => setSelectedPart(std.part)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {std.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              ({std.iso})
                            </span>
                            {std.badge && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
                                ⭐ {std.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {std.desc}
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {std.features.map((feat, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"
                              >
                                ✓ {feat}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bagian 2: Conformance Level (B vs A) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  2. Tingkat Kepatuhan (Conformance Level)
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setConformance('b')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    conformance === 'b'
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Level B (Basic Conformance)
                    </span>
                    <input
                      type="radio"
                      name="conformance"
                      value="b"
                      checked={conformance === 'b'}
                      onChange={() => setConformance('b')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Menjamin tampilan visual dokumen akan tetap 100% sama saat dibuka di masa depan di perangkat apa pun.
                  </p>
                </label>

                <label
                  onClick={() => setConformance('a')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    conformance === 'a'
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Level A (Accessible / Tagged)
                    </span>
                    <input
                      type="radio"
                      name="conformance"
                      value="a"
                      checked={conformance === 'a'}
                      onChange={() => setConformance('a')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Kepatuhan penuh visual ditambah penandaan hierarki konten untuk pembaca layar (screen reader tuna netra).
                  </p>
                </label>
              </div>
            </div>

            {/* Edukasi & Catatan ISO Archival */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Informasi Standar ISO PDF/A:
                </span>
                <p className="text-[11px] leading-relaxed">
                  Dokumen akan disematkan metadata identifikasi XMP resmi (<code className="font-mono text-indigo-600 dark:text-indigo-400">pdfaid:part="{selectedPart}"</code>, <code className="font-mono text-indigo-600 dark:text-indigo-400">pdfaid:conformance="{conformance.toUpperCase()}"</code>) dan font diselaraskan agar dokumen bersifat mandiri tanpa ketergantungan software pembaca.
                </p>
              </div>
            </div>

            {/* Tombol Eksekusi Konversi */}
            <button
              type="button"
              onClick={handleConvertPdfa}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-indigo-500/25 shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengonversi Dokumen ke PDF/A-{selectedPart}{conformance}...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Konversi ke PDF/A-{selectedPart}{conformance} Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LANGKAH 3: UNDUH HASIL KONVERSI PDF/A                              */}
      {/* =================================================================== */}
      {resultUrl && file && (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-sm animate-fade-in">
          {/* Ikon Sertifikat Sukses */}
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto border-2 border-indigo-200 dark:border-indigo-800">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> Tersertifikasi Standar ISO
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Dokumen Berhasil Dikonversi ke PDF/A-{selectedPart}{conformance}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Berkas Anda kini memenuhi standar pengarsipan digital internasional dan siap disimpan untuk jangka panjang dengan keandalan visual absolut.
            </p>
          </div>

          {/* Rincian Hasil */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Nama Berkas:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                pdfa-{selectedPart}{conformance}-{file.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Standar ISO:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                ISO 19005-{selectedPart} (PDF/A-{selectedPart}{conformance})
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
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-indigo-500/25 shadow-md active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Berkas PDF/A</span>
            </button>

            <button
              onClick={handleReset}
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Konversi Berkas Lain</span>
            </button>
          </div>
        </div>
      )}
    </ToolContainer>
  );
};

export default PdfToPdfa;
