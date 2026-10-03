import React, { useState, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';
import {
  FileCheck,
  ShieldCheck,
  Award,
  Archive,
  BookOpen,
  FileCode,
  RotateCcw,
} from 'lucide-react';
import { formatFileSize } from '../../lib/formatters';
import { triggerFileDownload } from '../../lib/download';
import { getPdfPageCount } from '../../lib/pdfWorker';

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
    features: ['Mendukung transparansi grafis', 'Kompresi efisien JPEG 2000', 'Font OpenType mandiri (embedded)'],
  },
  {
    part: 1,
    name: 'PDF/A-1',
    iso: 'ISO 19005-1:2005',
    tag: 'Kompatibilitas Legasi',
    desc: 'Standar generasi pertama berbasis PDF 1.4 untuk kompatibilitas mutlak dengan sistem arsip lama.',
    features: ['Kompatibilitas pembaca tertinggi', 'Standar resmi arsip negara', 'Meratakan transparansi visual'],
  },
  {
    part: 3,
    name: 'PDF/A-3',
    iso: 'ISO 19005-3:2012',
    tag: 'Dukungan Lampiran',
    desc: 'Mengizinkan penyertaan lampiran berkas terstruktur (seperti faktur XML / ZUGFeRD) di dalam arsip.',
    features: ['Dukungan lampiran berkas biner/XML', 'Ideal untuk e-Faktur & kontrak digital', 'Integritas arsip terjamin'],
  },
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
  const [processingStep, setProcessingStep] = useState<number>(1);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && file && !isProcessing && !resultUrl) {
        e.preventDefault();
        handleConvertPdfa();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isProcessing, resultUrl, selectedPart, conformance]);

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

    try {
      const headerSlice = await selected.slice(0, 30).text();
      const versionMatch = headerSlice.match(/%PDF-(\d\.\d)/);
      if (versionMatch) setPdfVersion(versionMatch[1]);
    } catch {
      setPdfVersion('1.7');
    }

    try {
      const buffer = await selected.arrayBuffer();
      const pages = await getPdfPageCount(buffer);
      setPageCount(pages);
    } catch (e) {
      console.warn('Gagal membaca info halaman:', e);
    }
  };

  const handleConvertPdfa = async () => {
    if (!file || !checkQuotaBeforeAction()) return;

    setIsProcessing(true);
    setProcessingStep(1);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('pdfa_part', selectedPart.toString());
    formData.append('conformance', conformance);

    try {
      setProcessingStep(2);
      const response = await fetch(`${BACKEND_URL}/tools/convert-pdfa`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errDetail = 'Gagal mengonversi dokumen ke PDF/A';
        try {
          const errJson = await response.json();
          if (errJson.detail) errDetail = errJson.detail;
        } catch {}
        addToast(errDetail, 'error');
        setIsProcessing(false);
        return;
      }

      setProcessingStep(3);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize(blob.size);
      consumeQuota();
      addToast(`Dokumen berhasil dikonversi ke PDF/A-${selectedPart}${conformance}!`, 'success');
    } catch (error: any) {
      addToast(error.message || 'Terjadi kesalahan jaringan saat konversi berkas.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    triggerFileDownload(resultUrl, `pdfa-${selectedPart}${conformance}-${base}.pdf`);
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setResultUrl(null);
    setResultSize(null);
    setPageCount(0);
  };

  const currentStandard = STANDARDS.find((s) => s.part === selectedPart)!;

  return (
    <ToolContainer
      title="PDF ke PDF/A"
      description="Konversi dokumen PDF ke format arsip standar ISO 19005 untuk retensi jangka panjang yang diakui secara hukum."
      onBack={onBack}
      canvasSlot={
        file ? (
          <div className="h-full flex flex-col items-center justify-center p-6 bg-canvas">
            <div className="w-full max-w-lg bg-surface rounded-2xl border border-border-subtle p-8 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />

              <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center mx-auto mb-5 shadow-xs">
                <Award className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>

              <h3 className="text-base font-bold text-text-primary mb-1 truncate px-4" title={file.name}>
                {file.name}
              </h3>
              <p className="text-xs text-text-secondary mb-6">
                {formatFileSize(file.size)} • PDF v{pdfVersion}
                {pageCount > 0 ? ` • ${pageCount} Halaman` : ''}
              </p>

              {/* Target Standard Badge */}
              <div className="p-4 rounded-xl bg-canvas border border-border-subtle text-left mb-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary">
                    Target: PDF/A-{selectedPart}{conformance.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary">
                    {currentStandard.iso}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {currentStandard.desc}
                </p>
                <div className="pt-2 border-t border-border-subtle flex flex-wrap gap-1.5">
                  {currentStandard.features.map((feat, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-surface border border-border-subtle text-text-secondary"
                    >
                      ✓ {feat}
                    </span>
                  ))}
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
                  <ShieldCheck className="w-3.5 h-3.5" /> Kepatuhan Standar ISO
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
                Standar ISO PDF/A
              </h3>
              <p className="text-xs text-text-secondary">
                Pilih versi standar ISO untuk masa retensi arsip.
              </p>
            </div>

            <div className="space-y-3">
              {STANDARDS.map((std) => {
                const isSelected = selectedPart === std.part;
                return (
                  <div
                    key={std.part}
                    onClick={() => setSelectedPart(std.part)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-accent-primary bg-accent-primary/5 shadow-xs'
                        : 'border-border-subtle bg-canvas hover:border-text-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-text-primary">{std.name}</span>
                      {std.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary">
                          {std.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-text-muted mb-1">{std.iso}</p>
                    <p className="text-[11px] text-text-secondary leading-snug">{std.tag}</p>
                  </div>
                );
              })}
            </div>

            {/* Tingkat Kepatuhan */}
            <div className="pt-2 border-t border-border-subtle space-y-3">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                Tingkat Kepatuhan (Conformance)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConformance('b')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    conformance === 'b'
                      ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                      : 'border-border-subtle bg-canvas text-text-secondary'
                  }`}
                >
                  <div className="text-xs font-bold">Level B (Basic)</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Integritas visual rendering</div>
                </button>
                <button
                  type="button"
                  onClick={() => setConformance('a')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    conformance === 'a'
                      ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                      : 'border-border-subtle bg-canvas text-text-secondary'
                  }`}
                >
                  <div className="text-xs font-bold">Level A (Accessible)</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Tagged structure & skrin pembaca</div>
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
              <Award className="w-4 h-4 text-accent-primary" />
              <span>Standar: PDF/A-{selectedPart}{conformance.toUpperCase()} ({currentStandard.iso})</span>
            </div>
            <button
              onClick={() => handleConvertPdfa()}
              disabled={isProcessing}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-accent-primary hover:bg-accent-hover disabled:bg-canvas disabled:text-text-muted text-accent-contrast font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              <span>Konversi ke PDF/A-{selectedPart}{conformance.toUpperCase()}</span>
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
            title="Pilih Berkas PDF untuk Dikonversi ke PDF/A"
            subtitle="Seret berkas PDF ke sini atau klik untuk memilih dokumen dari perangkat"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-primary">Standar ISO 19005</h4>
                <p className="text-[11px] text-text-muted">Kepatuhan hukum & audit</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-primary">Arsip Abadi</h4>
                <p className="text-[11px] text-text-muted">Font embedded mandiri</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-primary">Integritas Dokumen</h4>
                <p className="text-[11px] text-text-muted">100% identik di masa depan</p>
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
              { label: 'Menghilangkan Skrip Dinamis & Standarisasi Warna sRGB' },
              { label: 'Menyematkan (Embedding) Semua Font Dokumen' },
              { label: 'Menyuntikkan Metadata XMP Kepatuhan ISO 19005' },
            ]}
          />
        </div>
      )}

      {/* Result State */}
      {resultUrl && file && (
        <div className="max-w-lg mx-auto py-8">
          <DownloadResultCard
            fileName={`pdfa-${selectedPart}${conformance}-${file.name.replace(/\.pdf$/i, '')}.pdf`}
            originalSize={file.size}
            resultSize={resultSize || file.size}
            onDownload={handleDownload}
            onReset={handleReset}
            resetLabel="Konversi Berkas Lain"
            successTitle="Konversi PDF/A Berhasil!"
            successDescription={`Dokumen Anda kini mematuhi standar arsip ${currentStandard.iso} Level ${conformance.toUpperCase()}.`}
            resultUrl={resultUrl}
          />
        </div>
      )}
    </ToolContainer>
  );
};

export default PdfToPdfa;
