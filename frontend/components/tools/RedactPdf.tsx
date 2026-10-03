import React, { useState, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
import PdfPreview from './PdfPreview';
import {
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Phone,
  HeartPulse,
  Scale,
  Trash2,
  Sliders,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';
import { triggerFileDownload } from '../../lib/download';
import { formatFileSize } from '../../lib/formatters';

interface RedactStats {
  total: number;
  id: number;
  financial: number;
  contact: number;
  health: number;
  custom: number;
}

const COLOR_OPTIONS = [
  { id: '#000000', label: 'Hitam Solid', bgClass: 'bg-black' },
  { id: '#1E293B', label: 'Abu Gelap', bgClass: 'bg-slate-800' },
  { id: '#FFFFFF', label: 'Putih Bersih', bgClass: 'bg-white border border-border-subtle' },
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
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(1);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && file && !isProcessing && !downloadUrl) {
        if (!redactId && !redactFinancial && !redactContact && !redactHealth && !customKeywords.trim()) return;
        e.preventDefault();
        handleExecuteRedaction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isProcessing, downloadUrl, redactId, redactFinancial, redactContact, redactHealth, customKeywords]);

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
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setFile(null);
    setFileBuffer(null);
    setResultBuffer(null);
    setDownloadUrl(null);
    setStats(null);
  };

  const handleExecuteRedaction = async () => {
    if (!file || !checkQuotaBeforeAction()) return;

    if (!redactId && !redactFinancial && !redactContact && !redactHealth && !customKeywords.trim()) {
      addToast('Pilih minimal satu kategori data atau isi kata kunci sensor.', 'warning');
      return;
    }

    setIsProcessing(true);
    setProcessingStep(1);

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

      setProcessingStep(2);
      const response = await fetch(`${BACKEND_URL}/tools/redact-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errMessage = 'Gagal melakukan penyensoran data sensitif.';
        try {
          const errData = await response.json();
          if (errData?.detail) errMessage = errData.detail;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }

      setProcessingStep(3);
      const totalRedacted = parseInt(response.headers.get('X-Redacted-Total') || '0', 10);
      setStats({
        total: totalRedacted,
        id: parseInt(response.headers.get('X-Redacted-Id') || '0', 10),
        financial: parseInt(response.headers.get('X-Redacted-Financial') || '0', 10),
        contact: parseInt(response.headers.get('X-Redacted-Contact') || '0', 10),
        health: parseInt(response.headers.get('X-Redacted-Health') || '0', 10),
        custom: parseInt(response.headers.get('X-Redacted-Custom') || '0', 10),
      });

      const blob = await response.blob();
      const arrayBuf = await blob.arrayBuffer();
      setResultBuffer(arrayBuf);
      setResultSize(blob.size);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      consumeQuota();

      if (totalRedacted > 0) {
        addToast(`Berhasil menyensor ${totalRedacted} data sensitif secara permanen (True Redaction).`, 'success');
      } else {
        addToast('Dokumen diproses, tidak ditemukan data pribadi yang cocok dengan pola yang dipilih.', 'info');
      }
    } catch (err: any) {
      addToast(err.message || 'Terjadi kesalahan saat memproses redaksi PDF.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl || !file) return;
    const safeBase = file.name.replace(/\.pdf$/i, '');
    triggerFileDownload(downloadUrl, `redacted_pdp_${safeBase}.pdf`);
  };

  const activeCategoryCount = [redactId, redactFinancial, redactContact, redactHealth].filter(Boolean).length;

  return (
    <ToolContainer
      title="Sensor Data Sensitif (Auto-Redact PII)"
      description="Sensor permanen (True Binary Redaction) data NIK, KK, Paspor, SIM, NPWP, Rekening, HP, & Email sesuai UU No. 27 Tahun 2022 (UU PDP)."
      onBack={onBack}
      canvasSlot={
        file ? (
          <div className="h-full flex flex-col items-center justify-between p-6 bg-canvas overflow-y-auto">
            {/* Top Security Banner */}
            <div className="w-full max-w-xl p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center justify-between shadow-xs mb-4">
              <div className="flex items-center gap-2.5 truncate">
                <ShieldAlert className="w-4 h-4 text-accent-primary shrink-0" />
                <span className="text-xs font-semibold text-text-primary truncate">
                  Jaminan True Binary Redaction (Anti-Bocor)
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent-primary/10 text-accent-primary uppercase tracking-wider shrink-0">
                UU PDP 27/2022
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
                <Sliders className="w-4 h-4 text-accent-primary" />
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  Kategori UU PDP
                </h3>
              </div>
              <p className="text-xs text-text-secondary">
                Pilih pola data pribadi yang ingin dihancurkan dari berkas.
              </p>
            </div>

            {/* Category Toggles */}
            <div className="space-y-2.5">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-border-subtle bg-canvas hover:border-accent-primary transition-all cursor-pointer">
                <Scale className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-text-primary">Identitas Kependudukan</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface text-text-muted">NIK/KK</span>
                  </div>
                  <p className="text-[10px] text-text-secondary">Pola NIK 16 digit, KK, Paspor RI, & SIM.</p>
                </div>
                <input
                  type="checkbox"
                  checked={redactId}
                  onChange={(e) => setRedactId(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border-subtle text-accent-primary focus:ring-accent-primary cursor-pointer"
                />
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-border-subtle bg-canvas hover:border-accent-primary transition-all cursor-pointer">
                <CreditCard className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-text-primary">Finansial & Pajak</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface text-text-muted">NPWP/Rek</span>
                  </div>
                  <p className="text-[10px] text-text-secondary">NPWP 15/16 digit, nomor rekening & kartu kredit.</p>
                </div>
                <input
                  type="checkbox"
                  checked={redactFinancial}
                  onChange={(e) => setRedactFinancial(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border-subtle text-accent-primary focus:ring-accent-primary cursor-pointer"
                />
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-border-subtle bg-canvas hover:border-accent-primary transition-all cursor-pointer">
                <Phone className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-text-primary">Kontak Personal</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface text-text-muted">HP/Email</span>
                  </div>
                  <p className="text-[10px] text-text-secondary">No. HP Indonesia (+62/08..) dan alamat surel.</p>
                </div>
                <input
                  type="checkbox"
                  checked={redactContact}
                  onChange={(e) => setRedactContact(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border-subtle text-accent-primary focus:ring-accent-primary cursor-pointer"
                />
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-border-subtle bg-canvas hover:border-accent-primary transition-all cursor-pointer">
                <HeartPulse className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-text-primary">Kesehatan & BPJS</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface text-text-muted">BPJS</span>
                  </div>
                  <p className="text-[10px] text-text-secondary">Nomor kepesertaan BPJS (13 digit).</p>
                </div>
                <input
                  type="checkbox"
                  checked={redactHealth}
                  onChange={(e) => setRedactHealth(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border-subtle text-accent-primary focus:ring-accent-primary cursor-pointer"
                />
              </label>
            </div>

            {/* Custom Keywords */}
            <div className="pt-2 border-t border-border-subtle">
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Kata Kunci Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={customKeywords}
                onChange={(e) => setCustomKeywords(e.target.value)}
                placeholder="Pisahkan dengan koma (cth: Budi, Jl. Mawar)"
                className="w-full px-3 py-2 bg-canvas border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-accent-primary"
              />
            </div>

            {/* Redaction Style */}
            <div className="pt-2 border-t border-border-subtle space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Warna Kotak Sensor
                </label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setRedactColor(c.id)}
                      className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                        redactColor === c.id
                          ? 'border-accent-primary ring-2 ring-accent-primary/20 text-text-primary font-bold'
                          : 'border-border-subtle text-text-muted'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.bgClass}`} />
                      <span className="text-[11px]">{c.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Teks Label Kotak
                </label>
                <select
                  value={redactLabel}
                  onChange={(e) => setRedactLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-canvas text-text-primary text-xs outline-none focus:border-accent-primary"
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
        ) : undefined
      }
      floatingBarSlot={
        file ? (
          <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
              <ShieldCheck className="w-4 h-4 text-accent-primary" />
              <span>{activeCategoryCount} kategori UU PDP aktif</span>
            </div>
            <button
              onClick={() => handleExecuteRedaction()}
              disabled={isProcessing || (!redactId && !redactFinancial && !redactContact && !redactHealth && !customKeywords.trim())}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-accent-primary hover:bg-accent-hover disabled:bg-canvas disabled:text-text-muted text-accent-contrast font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sensor Data Pribadi Sekarang</span>
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
            title="Pilih Berkas PDF untuk Disensor"
            subtitle="Mendukung KTP, KK, SPT Pajak, Slip Gaji, Ijazah, CV, dan Berkas Resmi ASN/BUMN"
          />
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="max-w-md mx-auto py-12">
          <ProcessingStepper
            currentStep={processingStep}
            steps={[
              { label: 'Memindai Struktur Teks & Token PII UU PDP' },
              { label: 'Melakukan True Binary Redaction (Anti-Bocor)' },
              { label: 'Membersihkan Metadata & Menyiapkan Output' },
            ]}
          />
        </div>
      )}

      {/* Result State */}
      {downloadUrl && file && (
        <div className="max-w-xl mx-auto py-6 space-y-6">
          <DownloadResultCard
            fileName={`redacted_pdp_${file.name.replace(/\.pdf$/i, '')}.pdf`}
            originalSize={file.size}
            resultSize={resultSize || file.size}
            onDownload={handleDownload}
            onReset={handleReset}
            resetLabel="Sensor Dokumen Lain"
            successTitle="True Redaction UU PDP Selesai!"
            successDescription="Data sensitif telah dihapus secara fisik dari aliran biner berkas PDF (bukan sekadar kotak visual) dan metadata disanitasi penuh."
            resultUrl={downloadUrl}
          />

          {/* Detailed Redaction Audit Stats */}
          {stats && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <div className="p-3 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-center">
                <div className="text-lg font-bold text-accent-primary">{stats.total}</div>
                <div className="text-[10px] text-text-secondary">Total Sensor</div>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border-subtle text-center">
                <div className="text-lg font-bold text-text-primary">{stats.id}</div>
                <div className="text-[10px] text-text-muted">NIK/KK</div>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border-subtle text-center">
                <div className="text-lg font-bold text-text-primary">{stats.financial}</div>
                <div className="text-[10px] text-text-muted">NPWP/Bank</div>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border-subtle text-center">
                <div className="text-lg font-bold text-text-primary">{stats.contact}</div>
                <div className="text-[10px] text-text-muted">Kontak/HP</div>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border-subtle text-center">
                <div className="text-lg font-bold text-text-primary">{stats.health}</div>
                <div className="text-[10px] text-text-muted">BPJS</div>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border-subtle text-center">
                <div className="text-lg font-bold text-text-primary">{stats.custom}</div>
                <div className="text-[10px] text-text-muted">Kustom</div>
              </div>
            </div>
          )}
        </div>
      )}
    </ToolContainer>
  );
};

export default RedactPdf;
