// frontend/components/tools/BankStatementPdf.tsx
import React, { useState } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import PdfPreview from './PdfPreview';
import { 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Building2, 
  RefreshCw, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';

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
  
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('rekening_koran.xlsx');
  const [summary, setSummary] = useState<{
    bankDetected: string;
    rowsCount: number;
    totalDebit: number;
    totalCredit: number;
  } | null>(null);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();

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
    if (!file) return;
    if (!checkQuotaBeforeAction()) return;

    setIsProcessing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 menit

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bank_type', selectedBank);
      formData.append('output_format', outputFormat);

      const response = await fetch(`${BACKEND_URL}/tools/parse-bank-statement`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || err.error || 'Gagal mengekstrak rekening koran.');
      }

      // Membaca header hasil deteksi
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
      setSummary({
        bankDetected: bankHeader,
        rowsCount: rowsHeader,
        totalDebit: debitHeader,
        totalCredit: creditHeader,
      });

      consumeQuota();
      addToast('Rekening koran berhasil diekstrak ke Excel!', 'success');
    } catch (error: any) {
      clearTimeout(timeoutId);
      addToast(error.name === 'AbortError' ? 'Waktu pemrosesan habis.' : error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileBuffer(null);
    setDownloadUrl(null);
    setSummary(null);
  };

  // Tampilan Hasil Ekstraksi
  if (downloadUrl && summary) {
    return (
      <ToolContainer title="Ekstraksi Berhasil!" onBack={onBack} currentStep={3}>
        <div className="text-center flex flex-col items-center gap-6 animate-fade-in max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Tabel Rekening Koran Siap Diunduh
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Format transaksi berhasil dinormalisasi ke dalam baris dan kolom Excel terstruktur.
            </p>
          </div>

          {/* Kartu Ringkasan Metrik Finansial */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E222B] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-medium text-slate-400 block">Bank Terdeteksi</span>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={summary.bankDetected}>
                {summary.bankDetected}
              </p>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block">
                {summary.rowsCount} Baris Transaksi
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E222B] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                <TrendingUp size={12} />
                <span>Total Kredit (Masuk)</span>
              </div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                Rp {summary.totalCredit.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400 block">Gaji & Pemasukan</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E222B] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-[11px] font-bold">
                <TrendingDown size={12} />
                <span>Total Debet (Keluar)</span>
              </div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                Rp {summary.totalDebit.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400 block">Pengeluaran & Biaya</span>
            </div>
          </div>

          {/* Tombol Unduh Utama */}
          <div className="w-full space-y-3 pt-2">
            <a
              href={downloadUrl}
              download={downloadName}
              className="min-h-[48px] bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-xl w-full shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              <FileSpreadsheet size={20} />
              <span>Unduh Hasil Rekap ({outputFormat.toUpperCase()})</span>
            </a>

            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold underline py-2 cursor-pointer transition-colors"
            >
              Ekstrak Berkas Rekening Koran Lainnya
            </button>
          </div>
        </div>
      </ToolContainer>
    );
  }

  return (
    <ToolContainer
      title="Ekstrak Rekening Koran ke Excel"
      description="Ubah PDF mutasi rekening koran BCA, Mandiri, BRI, BNI, BSI, Bank Kalsel, dan seluruh BPD ke file Excel rapi otomatis."
      onBack={onBack}
      maxWidth="max-w-4xl"
      currentStep={!file ? 1 : 2}
    >
      {!file ? (
        <div className="space-y-6">
          <FileUploader
            onFileSelect={handleFileChange}
            label="Unggah Rekening Koran PDF"
            description="Seret berkas e-statement atau rekening koran bank Anda ke sini"
          />

          {/* Kartu Informasi Kompatibilitas Bank */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1E222B] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                Mendukung Seluruh Bank Nasional, Syariah, dan BPD Daerah
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Dilengkapi algoritma heuristik cerdas untuk membaca format dua kolom (Debet/Kredit terpisah) maupun satu kolom mutasi kode bendera D/K:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['BCA', 'Mandiri', 'BRI', 'BNI', 'BSI Syariah', 'Bank Kalsel (ASN)', 'Bank BJB', 'Bank DKI', 'Bank Jatim', 'Bank Aceh Syariah', 'Bank NTB Syariah'].map((b) => (
                <span key={b} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                  {b}
                </span>
              ))}
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                + Semua Bank Lainnya
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Card Ringkasan Dokumen */}
          <div className="w-full max-w-md mx-auto bg-white dark:bg-[#1E222B] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative">
            <button
              type="button"
              onClick={handleReset}
              className="absolute top-2.5 right-2.5 p-1.5 text-rose-500 bg-white/90 dark:bg-slate-800/90 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full shadow-md z-10 transition-transform active:scale-90 border border-slate-200 dark:border-slate-700"
              title="Hapus dan pilih berkas lain"
            >
              <Trash2 size={16} />
            </button>

            {fileBuffer && (
              <div className="w-full max-w-[200px] mx-auto rounded-lg overflow-hidden shadow-xs">
                <PdfPreview buffer={fileBuffer} />
              </div>
            )}

            <div className="mt-3 text-center px-2">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          {/* Konfigurasi Ekstraksi */}
          <div className="bg-white dark:bg-[#1E222B] p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                1. Pilih Format Bank Asal:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {SUPPORTED_BANKS.map((b) => {
                  const isSelected = selectedBank === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBank(b.id)}
                      className={`min-h-[46px] p-2.5 rounded-xl border text-left transition-all duration-200 relative flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-xs ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full gap-1">
                        <span className="font-bold text-xs leading-tight truncate">
                          {b.name}
                        </span>
                        {b.badge && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
                            {b.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pilihan Format Ekspor */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                2. Format Berkas Keluaran:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOutputFormat('xlsx')}
                  className={`min-h-[44px] p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    outputFormat === 'xlsx'
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <FileSpreadsheet size={22} className="text-emerald-600 dark:text-emerald-400" />
                  <div className="text-left">
                    <span className="text-xs font-bold block">Microsoft Excel (.xlsx)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Rekomendasi: Rumus SUM, warna zebra, dan angka moneter aktif</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setOutputFormat('csv')}
                  className={`min-h-[44px] p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    outputFormat === 'csv'
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <FileText size={22} className="text-blue-600 dark:text-blue-400" />
                  <div className="text-left">
                    <span className="text-xs font-bold block">Comma-Separated Values (.csv)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Format teks ringan untuk sistem akuntansi & database</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Jaminan Keamanan & Privasi */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-blue-800 dark:text-blue-200 text-xs">
              <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Privasi Data Finansial 100% Terjaga:</strong> Berkas rekening koran diproses murni di memori RAM server (*Zero Disk Write*) dan langsung dihapus saat file Excel diunduh. Kami tidak pernah menyimpan saldo, nomor rekening, atau riwayat transaksi Anda.
              </p>
            </div>
          </div>

          {/* Tombol Eksekusi */}
          <button
            type="button"
            onClick={handleParseStatement}
            disabled={isProcessing}
            className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw size={18} className="animate-spin text-white" />
                <span>Membedah Tabel Rekening Koran & Menghitung Saldo...</span>
              </div>
            ) : (
              <>
                <FileSpreadsheet size={18} />
                <span>Ekstrak Rekening Koran ke {outputFormat.toUpperCase()} Sekarang</span>
              </>
            )}
          </button>
        </div>
      )}
    </ToolContainer>
  );
};

export default BankStatementPdf;
