import React, { useState, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
import PdfPreview from './PdfPreview';
import {
  FileSpreadsheet,
  Building2,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';
import { formatFileSize } from '../../lib/formatters';
import { triggerFileDownload } from '../../lib/download';

interface BankOption {
  id: string;
  name: string;
  category: 'Auto' | 'Nasional' | 'Syariah' | 'BPD';
  badge?: string;
}

const SUPPORTED_BANKS: BankOption[] = [
  { id: 'auto', name: 'Auto Deteksi Cerdas', category: 'Auto', badge: 'REKOMENDASI' },
  { id: 'kalsel', name: 'Bank Kalsel (Konv & Syariah)', category: 'BPD', badge: 'ASN Kalsel' },
  { id: 'bsi', name: 'Bank Syariah Indonesia (BSI)', category: 'Syariah', badge: 'Kemenag/Aceh' },
  { id: 'bca', name: 'Bank Central Asia (BCA)', category: 'Nasional' },
  { id: 'mandiri', name: 'Bank Mandiri', category: 'Nasional' },
  { id: 'bri', name: 'Bank Rakyat Indonesia (BRI)', category: 'Nasional' },
  { id: 'bni', name: 'Bank Negara Indonesia (BNI)', category: 'Nasional' },
  { id: 'bjb', name: 'Bank BJB (Konv & Syariah)', category: 'BPD', badge: 'ASN Jabar' },
  { id: 'dki', name: 'Bank DKI (Konv & Syariah)', category: 'BPD', badge: 'ASN DKI' },
  { id: 'jatim', name: 'Bank Jatim (Konv & Syariah)', category: 'BPD', badge: 'ASN Jatim' },
  { id: 'aceh', name: 'Bank Aceh Syariah', category: 'Syariah', badge: 'ASN Aceh' },
  { id: 'ntb', name: 'Bank NTB Syariah', category: 'Syariah', badge: 'ASN NTB' },
  { id: 'universal', name: 'BPD Lainnya / Universal', category: 'Auto' },
];

const BankStatementPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [selectedBank, setSelectedBank] = useState<string>('auto');
  const [outputFormat, setOutputFormat] = useState<'xlsx' | 'csv'>('xlsx');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(1);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('rekening_koran.xlsx');
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [summary, setSummary] = useState<{
    bankDetected: string;
    rowsCount: number;
    totalDebit: number;
    totalCredit: number;
  } | null>(null);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && file && !isProcessing && !downloadUrl) {
        e.preventDefault();
        handleParseStatement();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isProcessing, downloadUrl, selectedBank, outputFormat]);

  const handleFileChange = async (files: FileList | null) => {
    const selected = files ? files[0] : null;
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setDownloadUrl(null);
      setSummary(null);
      try {
        const buf = await selected.arrayBuffer();
        setFileBuffer(buf);
      } catch (err) {
        console.warn('Gagal membaca buffer PDF:', err);
      }
    }
  };

  const handleParseStatement = async () => {
    if (!file || !checkQuotaBeforeAction()) return;

    setIsProcessing(true);
    setProcessingStep(1);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bank_type', selectedBank);
    formData.append('output_format', outputFormat);

    try {
      setProcessingStep(2);
      const response = await fetch(`${BACKEND_URL}/tools/parse-bank-statement`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || err.error || 'Gagal mengekstrak rekening koran.');
      }

      setProcessingStep(3);
      const bankHeader = response.headers.get('X-Bank-Detected') || 'Bank Terdeteksi';
      const rowsHeader = parseInt(response.headers.get('X-Rows-Count') || '0', 10);
      const debitHeader = parseFloat(response.headers.get('X-Total-Debit') || '0');
      const creditHeader = parseFloat(response.headers.get('X-Total-Credit') || '0');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const safeBase = file.name.replace(/\.[^/.]+$/, '');
      const outExt = outputFormat === 'csv' ? 'csv' : 'xlsx';

      setDownloadUrl(url);
      setDownloadName(`rekap_mutasi_${safeBase}.${outExt}`);
      setResultSize(blob.size);
      setSummary({
        bankDetected: bankHeader,
        rowsCount: rowsHeader,
        totalDebit: debitHeader,
        totalCredit: creditHeader,
      });

      consumeQuota();
      addToast('Rekening koran berhasil diekstrak ke Excel!', 'success');
    } catch (error: any) {
      addToast(error.message || 'Terjadi kesalahan saat memproses rekening koran.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setFile(null);
    setFileBuffer(null);
    setDownloadUrl(null);
    setSummary(null);
    setSelectedBank('auto');
    setOutputFormat('xlsx');
    setResultSize(null);
  };

  const selectedBankObj = SUPPORTED_BANKS.find((b) => b.id === selectedBank);

  return (
    <ToolContainer
      title="Rekening Koran PDF ke Excel"
      description="Ekstrak mutasi rekening bank nasional & syariah ke format tabel Excel (.xlsx) atau CSV secara rapi dan akurat."
      onBack={onBack}
      canvasSlot={
        file ? (
          <div className="h-full flex flex-col items-center justify-between p-6 bg-canvas overflow-y-auto">
            {/* Top Toolbar */}
            <div className="w-full max-w-xl p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center justify-between shadow-xs mb-4">
              <div className="flex items-center gap-2.5 truncate">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-text-primary truncate">
                  Parser Bank: {selectedBankObj?.name}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0">
                Kolom Terpisah
              </span>
            </div>

            {/* Document Paper Preview */}
            <div className="w-full max-w-xl max-h-[560px] overflow-auto rounded-xl border border-border-subtle bg-white shadow-lg p-3 my-auto">
              {fileBuffer && <PdfPreview buffer={fileBuffer} />}
            </div>

            {/* Bottom Info Bar */}
            <div className="mt-4 flex items-center justify-between w-full max-w-xl text-xs text-text-secondary">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Ganti Dokumen
              </button>
              <span className="truncate max-w-[280px]">
                {file.name} ({formatFileSize(file.size)})
              </span>
            </div>
          </div>
        ) : undefined
      }
      inspectorSlot={
        file ? (
          <div className="p-5 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-accent-primary" />
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  Preset Bank Penerbit
                </h3>
              </div>
              <p className="text-xs text-text-secondary">
                Pilih format bank untuk akurasi pemisahan kolom debit/kredit.
              </p>
            </div>

            {/* Bank Select List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto p-1 bg-canvas rounded-xl border border-border-subtle">
              {SUPPORTED_BANKS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBank(b.id)}
                  className={`w-full p-2.5 rounded-lg text-xs text-left flex items-center justify-between transition-all ${
                    selectedBank === b.id
                      ? 'bg-surface font-bold text-accent-primary shadow-xs border border-border-subtle'
                      : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                  }`}
                >
                  <span className="truncate">{b.name}</span>
                  {b.badge && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary shrink-0 ml-1">
                      {b.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Format Output */}
            <div className="pt-2 border-t border-border-subtle space-y-3">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                Format Luaran Tabel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOutputFormat('xlsx')}
                  className={`p-2.5 rounded-xl border text-xs text-center font-bold transition-all ${
                    outputFormat === 'xlsx'
                      ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                      : 'border-border-subtle bg-canvas text-text-secondary'
                  }`}
                >
                  Excel (.XLSX)
                </button>
                <button
                  type="button"
                  onClick={() => setOutputFormat('csv')}
                  className={`p-2.5 rounded-xl border text-xs text-center font-bold transition-all ${
                    outputFormat === 'csv'
                      ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                      : 'border-border-subtle bg-canvas text-text-secondary'
                  }`}
                >
                  CSV (.CSV)
                </button>
              </div>
            </div>

            {/* Privacy Pill */}
            <div className="p-3 rounded-xl bg-canvas border border-border-subtle flex items-start gap-2 text-xs text-text-secondary">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Data finansial diproses di RAM tanpa disimpan di server (Zero Disk I/O).
              </p>
            </div>
          </div>
        ) : undefined
      }
      floatingBarSlot={
        file ? (
          <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
              <FileSpreadsheet className="w-4 h-4 text-accent-primary" />
              <span>Format: .{outputFormat.toUpperCase()} ({selectedBankObj?.name})</span>
            </div>
            <button
              onClick={() => handleParseStatement()}
              disabled={isProcessing}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-accent-primary hover:bg-accent-hover disabled:bg-canvas disabled:text-text-muted text-accent-contrast font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekstrak Mutasi ke Excel</span>
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
            onFileSelect={handleFileChange}
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={1}
            title="Pilih Berkas Rekening Koran PDF"
            subtitle="Unggah e-Statement BCA, Mandiri, BRI, BNI, BSI, Bank Kalsel, BJB, DKI, atau Jatim"
          />
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="max-w-md mx-auto py-12">
          <ProcessingStepper
            currentStep={processingStep}
            steps={[
              { label: 'Memindai Struktur Tabel & Format Mutasi Bank' },
              { label: 'Mengekstrak Tanggal, Deskripsi, Debit, & Kredit' },
              { label: 'Menyusun Spreadsheet Excel & Rekap Saldo' },
            ]}
          />
        </div>
      )}

      {/* Result State */}
      {downloadUrl && file && (
        <div className="max-w-xl mx-auto py-8 space-y-6">
          <DownloadResultCard
            fileName={downloadName}
            originalSize={file.size}
            resultSize={resultSize || file.size}
            onDownload={() => triggerFileDownload(downloadUrl, downloadName)}
            onReset={handleReset}
            resetLabel="Ekstrak Rekening Lain"
            successTitle="Mutasi Rekening Berhasil Diekstrak!"
            successDescription="Data transaksi telah dipisahkan ke dalam kolom Tanggal, Uraian, Debit, Kredit, dan Saldo secara rapi."
            resultUrl={downloadUrl}
          />

          {summary && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-surface border border-border-subtle text-center">
                <div className="text-lg font-bold text-accent-primary">{summary.rowsCount}</div>
                <div className="text-[11px] text-text-secondary">Baris Transaksi</div>
              </div>
              <div className="p-3.5 rounded-xl bg-surface border border-border-subtle text-center">
                <div className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {summary.totalCredit.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[11px] text-text-secondary mt-0.5">Total Kredit (Masuk)</div>
              </div>
              <div className="p-3.5 rounded-xl bg-surface border border-border-subtle text-center">
                <div className="text-xs font-bold text-rose-600 flex items-center justify-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {summary.totalDebit.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[11px] text-text-secondary mt-0.5">Total Debit (Keluar)</div>
              </div>
            </div>
          )}
        </div>
      )}
    </ToolContainer>
  );
};

export default BankStatementPdf;
