import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, Clock, RotateCcw, ShieldCheck } from 'lucide-react';
import CloudExportButtons from './CloudExportButtons';

interface DownloadResultCardProps {
  fileName: string;
  downloadUrl: string;
  originalSize?: number;
  resultSize?: number;
  onReset: () => void;
  resetLabel?: string;
  customSuccessMessage?: string;
  isLocalRam?: boolean;
}

const DownloadResultCard: React.FC<DownloadResultCardProps> = ({
  fileName,
  downloadUrl,
  originalSize,
  resultSize,
  onReset,
  resetLabel = 'Proses Berkas Lain',
  customSuccessMessage = 'Dokumen Anda berhasil diproses dengan presisi.',
  isLocalRam = false,
}) => {
  // Countdown Timer 60 menit (3600 detik) sesuai Section 7.2
  const [secondsRemaining, setSecondsRemaining] = useState(3600);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m:${seconds < 10 ? '0' : ''}${seconds}s`;
  };

  const origKb = originalSize ? originalSize / 1024 : 0;
  const newKb = resultSize ? resultSize / 1024 : 0;
  const savedPercent = origKb > 0 && newKb > 0 
    ? Math.max(0, Math.round(((origKb - newKb) / origKb) * 100)) 
    : 0;

  return (
    <div className="w-full max-w-lg mx-auto bg-surface rounded-2xl border border-border-subtle p-6 sm:p-8 shadow-card animate-fade-in text-center select-none">
      
      {/* Icon Sukses Taktil */}
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={32} />
      </div>

      <h3 className="text-lg sm:text-xl font-extrabold text-text-primary tracking-tight mb-1">
        Pemrosesan Berhasil!
      </h3>
      <p className="text-xs sm:text-sm text-text-secondary mb-6">
        {customSuccessMessage}
      </p>

      {/* Informasi Perbandingan Ukuran Berkas (Section 7.2) */}
      {originalSize && resultSize ? (
        <div className="bg-elevated p-4 rounded-xl border border-border-subtle flex items-center justify-around mb-6 font-mono text-xs shadow-2xs">
          <div className="text-center">
            <span className="text-[10px] text-text-secondary block font-sans">Ukuran Awal</span>
            <span className="text-xs sm:text-sm font-bold text-text-primary">
              {origKb >= 1024 ? `${(origKb / 1024).toFixed(2)} MB` : `${origKb.toFixed(1)} KB`}
            </span>
          </div>

          <div className="h-6 w-px bg-border-strong" />

          <div className="text-center">
            <span className="text-[10px] text-text-secondary block font-sans">Ukuran Akhir</span>
            <span className="text-xs sm:text-sm font-bold text-accent-primary">
              {newKb >= 1024 ? `${(newKb / 1024).toFixed(2)} MB` : `${newKb.toFixed(1)} KB`}
            </span>
          </div>

          {savedPercent > 0 && (
            <>
              <div className="h-6 w-px bg-border-strong" />
              <div className="text-center">
                <span className="text-[10px] text-text-secondary block font-sans">Penyusutan</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-500">
                  -{savedPercent}%
                </span>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-elevated p-3 rounded-xl border border-border-subtle mb-6 text-xs text-text-secondary truncate">
          Berkas: <strong className="text-text-primary">{fileName}</strong>
        </div>
      )}

      {/* Primary Action Button: Unduh Berkas */}
      <div className="space-y-3 mb-6">
        <a
          href={downloadUrl}
          download={fileName}
          className="w-full bg-accent-primary hover:bg-accent-hover text-white font-bold py-3.5 px-6 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-xs sm:text-sm"
        >
          <Download size={16} />
          <span>Unduh Berkas PDF Sekarang</span>
        </a>

        {/* Ekspor ke Cloud Storage (Google Drive & Dropbox) */}
        <CloudExportButtons fileUrl={downloadUrl} fileName={fileName} />
      </div>

      {/* Countdown Timer Kedaluwarsa Berkas (Section 7.2) */}
      {!isLocalRam && (
        <div className="flex items-center justify-center gap-1.5 p-2.5 rounded-lg bg-elevated border border-border-subtle text-[11px] text-text-secondary font-mono mb-5 select-none">
          <Clock size={13} className="text-amber-500 shrink-0" />
          <span>
            Demi keamanan data, berkas dihapus otomatis dalam{' '}
            <strong className="text-text-primary">{formatCountdown(secondsRemaining)}</strong>
          </span>
        </div>
      )}

      {/* Reset / Kembali */}
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-accent-primary transition-colors cursor-pointer"
      >
        <RotateCcw size={13} />
        <span>{resetLabel}</span>
      </button>
    </div>
  );
};

export default DownloadResultCard;
