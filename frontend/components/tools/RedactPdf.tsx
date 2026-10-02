// frontend/components/tools/RedactPdf.tsx
import React, { useState } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import PdfPreview from './PdfPreview';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Download, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  CreditCard, 
  Phone, 
  HeartPulse, 
  EyeOff, 
  Sparkles, 
  Trash2,
  Sliders,
  Scale
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';

interface RedactStats {
  total: number;
  id: number;
  financial: number;
  contact: number;
  health: number;
  custom: number;
}

const COLOR_OPTIONS = [
  { id: '#000000', label: 'Hitam Solid', bgClass: 'bg-black border-slate-700' },
  { id: '#1E293B', label: 'Abu Gelap', bgClass: 'bg-slate-800 border-slate-600' },
  { id: '#FFFFFF', label: 'Putih Bersih', bgClass: 'bg-white border-slate-300' },
];

const LABEL_OPTIONS = [
  { id: '', label: 'Polos (Tanpa Teks)' },
  { id: '[DISENSOR]', label: '[DISENSOR]' },
  { id: '[TERLINDUNGI UU PDP]', label: '[TERLINDUNGI UU PDP]' },
  { id: '[RAHASIA]', label: '[RAHASIA]' },
];

const RedactPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [resultBuffer, setResultBuffer] = useState<ArrayBuffer | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('redacted_dokumen.pdf');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [stats, setStats] = useState<RedactStats | null>(null);

  // Opsi Kategori Sensor
  const [redactId, setRedactId] = useState<boolean>(true);
  const [redactFinancial, setRedactFinancial] = useState<boolean>(true);
  const [redactContact, setRedactContact] = useState<boolean>(false);
  const [redactHealth, setRedactHealth] = useState<boolean>(false);
  const [customKeywords, setCustomKeywords] = useState<string>('');
  const [redactColor, setRedactColor] = useState<string>('#000000');
  const [redactLabel, setRedactLabel] = useState<string>('');

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();

  const handleFileChange = async (files: FileList | null) => {
    const selected = files ? files[0] : null;
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setDownloadUrl(null);
      setResultBuffer(null);
      setStats(null);
      try {
        const buf = await selected.arrayBuffer();
        setFileBuffer(buf);
      } catch (err) {
        console.warn('Gagal membaca buffer PDF:', err);
      }
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileBuffer(null);
    setResultBuffer(null);
    setDownloadUrl(null);
    setStats(null);
  };

  const handleExecuteRedaction = async () => {
    if (!file) return;
    if (!checkQuotaBeforeAction()) return;

    if (!redactId && !redactFinancial && !redactContact && !redactHealth && !customKeywords.trim()) {
      addToast('warning', 'Pilih minimal satu kategori data atau isi kata kunci sensor.');
      return;
    }

    setIsProcessing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 menit

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('redact_id', String(redactId));
      formData.append('redact_financial', String(redactFinancial));
      formData.append('redact_contact', String(redactContact));
      formData.append('redact_health', String(redactHealth));
      formData.append('custom_keywords', customKeywords.trim());
      formData.append('redact_color', redactColor);
      formData.append('redact_label', redactLabel);

      const response = await fetch(`${BACKEND_URL}/tools/redact-pdf`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errMessage = 'Gagal melakukan penyensoran data sensitif.';
        try {
          const errData = await response.json();
          if (errData?.detail) errMessage = errData.detail;
        } catch {
          // ignore parsing error
        }
        throw new Error(errMessage);
      }

      // Parsing header audit UU PDP
      const totalRedacted = parseInt(response.headers.get('X-Redacted-Total') || '0', 10);
      const parsedStats: RedactStats = {
        total: totalRedacted,
        id: parseInt(response.headers.get('X-Redacted-Id') || '0', 10),
        financial: parseInt(response.headers.get('X-Redacted-Financial') || '0', 10),
        contact: parseInt(response.headers.get('X-Redacted-Contact') || '0', 10),
        health: parseInt(response.headers.get('X-Redacted-Health') || '0', 10),
        custom: parseInt(response.headers.get('X-Redacted-Custom') || '0', 10),
      };
      setStats(parsedStats);

      const blob = await response.blob();
      const arrayBuf = await blob.arrayBuffer();
      setResultBuffer(arrayBuf);

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      const safeBase = file.name.replace(/\.pdf$/i, '');
      setDownloadName(`redacted_pdp_${safeBase}.pdf`);

      consumeQuota();
      if (totalRedacted > 0) {
        addToast('success', `Berhasil menyensor ${totalRedacted} data sensitif secara permanen (True Redaction).`);
      } else {
        addToast('info', 'Dokumen diproses, tidak ditemukan data pribadi yang cocok dengan pola yang dipilih.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        addToast('error', 'Waktu proses habis (timeout). Dokumen mungkin terlalu rumit.');
      } else {
        addToast('error', err.message || 'Terjadi kesalahan saat memproses redaksi PDF.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const currentStep = resultBuffer ? 3 : file ? 2 : 1;

  return (
    <ToolContainer
      title="Sensor Data Sensitif (Auto-Redact PII)"
      description="Sensor permanen (True Binary Redaction) data NIK, KK, Paspor, SIM, NPWP, Rekening, HP, & Email sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi."
      onBack={onBack}
      currentStep={currentStep}
      maxWidth="max-w-6xl"
    >
      {/* Step 1: Upload */}
      {!file && (
        <div className="space-y-6">
          <TrustBanner />
          <FileUploader
            accept={{ 'application/pdf': ['.pdf'] }}
            onFilesSelected={handleFileChange}
            title="Pilih atau Seret Dokumen PDF yang Ingin Disensor"
            subtitle="Mendukung KTP, KK, SPT Pajak, Slip Gaji, Ijazah, CV, dan Berkas Resmi ASN/BUMN"
          />
        </div>
      )}

      {/* Step 2: Konfigurasi & Preview Pra-Redaksi */}
      {file && !resultBuffer && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <FileInfoHeader file={file} onReset={handleReset} />
            <TrustBanner compact />

            {/* Kategori Pemilihan Sensor */}
            <div className="bg-white dark:bg-[#161A22] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Sliders size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Kategori Data Sensitif (UU PDP)
                </h3>
              </div>

              <div className="space-y-3">
                {/* 1. Kependudukan */}
                <CategoryToggle
                  title="Identitas Kependudukan (NIK, KK, Paspor, SIM)"
                  desc="Pola NIK 16 digit sesuai wilayah/tanggal lahir, nomor KK, Paspor RI, & SIM."
                  badge="UU Adminduk"
                  checked={redactId}
                  onChange={setRedactId}
                  icon={<Scale size={18} className="text-emerald-500" />}
                />

                {/* 2. Finansial & Pajak */}
                <CategoryToggle
                  title="Finansial & Pajak (NPWP, No Rekening, Kartu)"
                  desc="NPWP format lama (15 digit), NPWP baru (16 digit), serta nomor kartu perbankan."
                  badge="PMK & POJK"
                  checked={redactFinancial}
                  onChange={setRedactFinancial}
                  icon={<CreditCard size={18} className="text-blue-500" />}
                />

                {/* 3. Kontak Personal */}
                <CategoryToggle
                  title="Kontak Personal (No HP & Email)"
                  desc="Nomor seluler/WhatsApp format Indonesia (+62/08...) dan alamat surel pribadi."
                  badge="Data Umum"
                  checked={redactContact}
                  onChange={setRedactContact}
                  icon={<Phone size={18} className="text-amber-500" />}
                />

                {/* 4. Kesehatan */}
                <CategoryToggle
                  title="Kesehatan & Jaminan Sosial (BPJS)"
                  desc="Nomor kepesertaan BPJS Kesehatan & Ketenagakerjaan (13 digit)."
                  badge="Data Spesifik"
                  checked={redactHealth}
                  onChange={setRedactHealth}
                  icon={<HeartPulse size={18} className="text-rose-500" />}
                />
              </div>

              {/* Kata Kunci Kustom */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kata Kunci Kustom Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={customKeywords}
                  onChange={(e) => setCustomKeywords(e.target.value)}
                  placeholder="Contoh: Budi Santoso, Jalan Mawar No. 12, Rahasia Bank (pisahkan dengan koma)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#1E222B] text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Sistem akan menyensor setiap kemunculan kata kunci ini di seluruh halaman dokumen.
                </span>
              </div>
            </div>

            {/* Opsi Visual Gaya Sensor */}
            <div className="bg-white dark:bg-[#161A22] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Gaya Tampilan Sensor
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Warna Kotak Sensor
                  </label>
                  <div className="flex gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setRedactColor(c.id)}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                          redactColor === c.id
                            ? 'ring-2 ring-blue-500 font-bold border-blue-500'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border ${c.bgClass}`} />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Teks Label pada Sensor
                  </label>
                  <select
                    value={redactLabel}
                    onChange={(e) => setRedactLabel(e.target.value)}
                    aria-label="Pilih teks label pada sensor"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#1E222B] text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {LABEL_OPTIONS.map((lbl) => (
                      <option key={lbl.id} value={lbl.id}>
                        {lbl.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tombol Aksi Utama */}
            <button
              type="button"
              onClick={handleExecuteRedaction}
              disabled={isProcessing}
              className="w-full min-h-[48px] py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Menyensor Permanen secara Biner...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  <span>Sensor Data Pribadi Sekarang (True Redact)</span>
                </>
              )}
            </button>
          </div>

          {/* Pratinjau Dokumen Asli */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full bg-slate-100 dark:bg-[#11141A] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col items-center sticky top-24">
              <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText size={15} className="text-blue-500" />
                  Pratinjau Dokumen Asli
                </span>
                <span className="text-[11px] text-slate-500">Hal. 1</span>
              </div>
              <div className="w-full max-h-[520px] overflow-auto rounded-xl flex justify-center bg-white dark:bg-black/40 p-2 shadow-inner">
                {fileBuffer && <PdfPreview buffer={fileBuffer} />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Hasil Redaksi Sukses */}
      {resultBuffer && downloadUrl && (
        <div className="space-y-8 animate-fade-in">
          {/* Audit Banner UU PDP */}
          <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-1">
                <CheckCircle2 size={14} />
                <span>Kepatuhan Pasal 4 & 39 UU PDP No. 27/2022 Berhasil</span>
              </div>
              <h3 className="text-lg font-extrabold text-emerald-900 dark:text-white">
                Dokumen Terproteksi: True Binary Redaction Selesai
              </h3>
              <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300/90 leading-relaxed max-w-2xl">
                Data sensitif telah dihapus secara fisik dari aliran biner berkas PDF (bukan sekadar ditutup kotak visual). Metadata pencipta dokumen juga telah disanitasi penuh.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <a
                href={downloadUrl}
                download={downloadName}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Download size={18} />
                <span>Unduh PDF Bersih</span>
              </a>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 min-h-[46px] rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-white dark:bg-[#161A22] text-emerald-800 dark:text-emerald-200 font-semibold text-xs sm:text-sm hover:bg-emerald-100/50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>Sensor Dokumen Lain</span>
              </button>
            </div>
          </div>

          {/* Rincian Statistik Data yang Dihanguskan */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Total Disensor" value={stats.total} highlight />
              <StatCard label="NIK & Identitas" value={stats.id} />
              <StatCard label="NPWP & Finansial" value={stats.financial} />
              <StatCard label="Kontak & HP" value={stats.contact} />
              <StatCard label="BPJS Kesehatan" value={stats.health} />
              <StatCard label="Kata Kunci Kustom" value={stats.custom} />
            </div>
          )}

          {/* Pratinjau Dokumen Bersih */}
          <div className="bg-white dark:bg-[#161A22] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <EyeOff size={16} className="text-emerald-500" />
                Pratinjau Hasil Sensor (Halaman 1)
              </span>
              <span className="text-xs text-slate-400">Teks tidak dapat diblok atau disalin</span>
            </div>
            <div className="max-w-md w-full bg-slate-50 dark:bg-black/30 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-inner">
              <PdfPreview buffer={resultBuffer} />
            </div>
          </div>
        </div>
      )}
    </ToolContainer>
  );
};

// Sub-komponen: Banner Edukasi & Jaminan UU PDP
const TrustBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className={`p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 ${compact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
    <div className="flex items-start gap-3">
      <ShieldAlert size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-blue-950 dark:text-blue-100">
            Jaminan True Binary Redaction (UU PDP No. 27/2022)
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-200/60 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px] font-extrabold uppercase">
            Anti-Bocor
          </span>
        </div>
        <p className="text-blue-800/90 dark:text-blue-300/80 leading-relaxed">
          Berbeda dari aplikasi biasa yang hanya menaruh kotak hitam visual (teks masih tersimpan dan bisa di-copy paste), sistem ini <strong>menghancurkan teks target secara permanen dari berkas biner</strong> dan membersihkan metadata dokumen demi kepatuhan hukum penuh.
        </p>
      </div>
    </div>
  </div>
);

// Sub-komponen: File Info Header
const FileInfoHeader: React.FC<{ file: File; onReset: () => void }> = ({ file, onReset }) => {
  const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
  return (
    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161A22] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <FileText size={20} />
        </div>
        <div className="overflow-hidden">
          <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate">
            {file.name}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {sizeMb} MB • Dokumen PDF Siap Disensor
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
        title="Ganti Berkas"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

// Sub-komponen: Toggle Kategori Data Sensitif
const CategoryToggle: React.FC<{
  title: string;
  desc: string;
  badge: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  icon: React.ReactNode;
}> = ({ title, desc, badge, checked, onChange, icon }) => (
  <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
    checked 
      ? 'border-blue-500/50 bg-blue-50/30 dark:bg-blue-950/20' 
      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E222B]/50 hover:border-slate-300'
  }`}>
    <div className="mt-0.5 shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
          {title}
        </span>
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          {badge}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
        {desc}
      </p>
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
    />
  </label>
);

// Sub-komponen: Stat Card Ringkasan
const StatCard: React.FC<{ label: string; value: number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className={`p-3.5 rounded-2xl border text-center ${
    highlight 
      ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
      : 'bg-white dark:bg-[#161A22] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
  }`}>
    <div className={`text-xl sm:text-2xl font-black ${highlight ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>
      {value}
    </div>
    <div className={`text-[10px] sm:text-xs font-semibold mt-0.5 ${highlight ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
      {label}
    </div>
  </div>
);

export default RedactPdf;
