import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Download,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Minimize2,
  Lock,
  PenTool,
  Stamp,
  ShieldAlert,
  Layers,
  FileCheck,
} from 'lucide-react';
import CloudExportButtons from './CloudExportButtons';
import {
  getSmartNextTools,
  handoffUrlToTool,
  RecommendedToolItem,
} from '../../lib/pipelineHandoff';
import {
  getTelemetryInputSize,
  setTelemetryInputSize,
  setTelemetryOutputSize,
} from '../../lib/telemetry';
import { triggerFileDownload } from '../../lib/download';

interface DownloadResultCardProps {
  fileName: string;
  downloadUrl?: string;
  resultUrl?: string;
  onDownload?: () => void;
  originalSize?: number;
  resultSize?: number;
  onReset: () => void;
  resetLabel?: string;
  successTitle?: string;
  successDescription?: string;
  customSuccessMessage?: string;
  isLocalRam?: boolean;
}

const DownloadResultCard: React.FC<DownloadResultCardProps> = ({
  fileName,
  downloadUrl,
  resultUrl,
  onDownload,
  originalSize,
  resultSize,
  onReset,
  resetLabel = 'Proses Berkas Lain',
  successTitle,
  successDescription,
  customSuccessMessage,
  isLocalRam = false,
}) => {
  const effectiveUrl = downloadUrl || resultUrl || '';
  const effectiveTitle = successTitle || 'Pemrosesan Berhasil!';
  const effectiveMessage =
    successDescription ||
    customSuccessMessage ||
    'Dokumen Anda berhasil diproses dengan presisi tinggi.';

  // Countdown Timer 60 menit (3600 detik)
  const [secondsRemaining, setSecondsRemaining] = useState(3600);
  const [handoffLoadingId, setHandoffLoadingId] = useState<string | null>(null);
  const [detectedResultSize, setDetectedResultSize] = useState<number>(0);

  const effectiveOrigSize = originalSize || getTelemetryInputSize() || 0;
  const effectiveResultSize = resultSize || detectedResultSize || 0;

  // Sinkronisasi ukuran berkas masuk & keluar ke sistem telemetri secara otomatis
  useEffect(() => {
    if (originalSize && originalSize > 0) {
      setTelemetryInputSize(originalSize);
    }
    if (resultSize && resultSize > 0) {
      setTelemetryOutputSize(resultSize);
    } else if (effectiveUrl) {
      fetch(effectiveUrl)
        .then((res) => res.blob())
        .then((blob) => {
          if (blob && blob.size > 0) {
            setDetectedResultSize(blob.size);
            setTelemetryOutputSize(blob.size);
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }, [originalSize, resultSize, effectiveUrl]);

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

  const origKb = effectiveOrigSize ? effectiveOrigSize / 1024 : 0;
  const newKb = effectiveResultSize ? effectiveResultSize / 1024 : 0;
  const savedPercent =
    origKb > 0 && newKb > 0
      ? Math.max(0, Math.round(((origKb - newKb) / origKb) * 100))
      : 0;

  const nextTools = useMemo(
    () => getSmartNextTools(effectiveOrigSize, effectiveResultSize, fileName),
    [effectiveOrigSize, effectiveResultSize, fileName]
  );

  const highlightedTool = useMemo(
    () => nextTools.find((t) => t.isHighlighted) || null,
    [nextTools]
  );

  const secondaryTools = useMemo(
    () =>
      (highlightedTool
        ? nextTools.filter((t) => t.id !== highlightedTool.id)
        : nextTools
      ).slice(0, 3),
    [nextTools, highlightedTool]
  );

  const handleHandoffClick = async (tool: RecommendedToolItem) => {
    if (!effectiveUrl || handoffLoadingId) return;
    setHandoffLoadingId(tool.id);
    try {
      await handoffUrlToTool(effectiveUrl, fileName, tool.route, onReset);
    } finally {
      setHandoffLoadingId(null);
    }
  };

  const renderToolIcon = (iconType: RecommendedToolItem['icon'], isHighlighted?: boolean) => {
    const cls = isHighlighted ? 'w-4 h-4 text-[#9B4819]' : 'w-3.5 h-3.5 text-[#9B4819]';
    switch (iconType) {
      case 'compress':
        return <Minimize2 className={cls} />;
      case 'protect':
        return <Lock className={cls} />;
      case 'sign':
        return <PenTool className={cls} />;
      case 'watermark':
        return <Stamp className={cls} />;
      case 'redact':
        return <ShieldAlert className={cls} />;
      case 'merge':
        return <Layers className={cls} />;
      default:
        return <FileCheck className={cls} />;
    }
  };

  return (
    <div className="google-anno-skip w-full max-w-lg mx-auto bg-surface rounded-3xl border border-border-subtle p-7 sm:p-9 shadow-paper animate-fade-in text-center select-none">
      {/* Icon Sukses Segel Forest Green */}
      <div className="w-16 h-16 rounded-full bg-[#314028]/10 text-[#314028] dark:text-emerald-400 border border-[#314028]/20 flex items-center justify-center mx-auto mb-4 shadow-xs">
        <CheckCircle2 size={34} className="stroke-[2.2]" />
      </div>

      <h3 className="font-serif text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-1.5">
        {effectiveTitle}
      </h3>
      <p className="text-xs sm:text-sm text-text-secondary mb-6 leading-relaxed">
        {effectiveMessage}
      </p>

      {/* Informasi Perbandingan Ukuran Berkas */}
      {effectiveOrigSize && effectiveResultSize ? (
        <div className="bg-elevated p-4 rounded-2xl border border-border-subtle flex items-center justify-around mb-6 font-mono text-xs shadow-2xs">
          <div className="text-center">
            <span className="text-[10px] text-text-secondary block font-sans">Ukuran Awal</span>
            <span className="text-xs sm:text-sm font-bold text-text-primary">
              {origKb >= 1024 ? `${(origKb / 1024).toFixed(2)} MB` : `${origKb.toFixed(1)} KB`}
            </span>
          </div>

          <div className="h-6 w-px bg-border-strong" />

          <div className="text-center">
            <span className="text-[10px] text-text-secondary block font-sans">Ukuran Akhir</span>
            <span className="text-xs sm:text-sm font-bold text-[#9B4819]">
              {newKb >= 1024 ? `${(newKb / 1024).toFixed(2)} MB` : `${newKb.toFixed(1)} KB`}
            </span>
          </div>

          {savedPercent > 0 && (
            <>
              <div className="h-6 w-px bg-border-strong" />
              <div className="text-center">
                <span className="text-[10px] text-text-secondary block font-sans">Penyusutan</span>
                <span className="text-xs sm:text-sm font-bold text-[#314028] dark:text-emerald-400">
                  -{savedPercent}%
                </span>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-elevated p-3 rounded-xl border border-border-subtle mb-6 text-xs text-text-secondary truncate">
          Berkas: <strong className="text-text-primary font-mono">{fileName}</strong>
        </div>
      )}

      {/* Primary Action Button: Unduh Berkas (Tombol tunggal anti-duplikat) */}
      <div className="space-y-3 mb-6">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.blur();
            if (effectiveUrl) {
              triggerFileDownload(effectiveUrl, fileName);
            } else if (onDownload) {
              onDownload();
            }
          }}
          className="w-full bg-[#9B4819] hover:bg-[#7E3812] text-white font-medium py-3.5 px-6 rounded-full shadow-md hover:shadow-paper transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-xs sm:text-sm"
        >
          <Download size={16} />
          <span>
            {fileName.toLowerCase().endsWith('.docx')
              ? 'Unduh Berkas Word Sekarang'
              : fileName.toLowerCase().endsWith('.xlsx')
              ? 'Unduh Berkas Excel Sekarang'
              : fileName.toLowerCase().endsWith('.pptx')
              ? 'Unduh Berkas PPT Sekarang'
              : fileName.toLowerCase().endsWith('.zip')
              ? 'Unduh Arsip ZIP Sekarang'
              : fileName.toLowerCase().match(/\.(jpg|jpeg|png)$/)
              ? 'Unduh Gambar Sekarang'
              : fileName.toLowerCase().endsWith('.txt')
              ? 'Unduh Berkas Teks Sekarang'
              : 'Unduh Berkas PDF Sekarang'}
          </span>
        </button>

        {/* Ekspor ke Cloud Storage (Google Drive & Dropbox) */}
        {effectiveUrl && <CloudExportButtons fileUrl={effectiveUrl} fileName={fileName} />}
      </div>

      {/* Rekomendasi Perkakas Lanjutan Pintar (Zero Manual Re-upload) */}
      {effectiveUrl && nextTools.length > 0 && (
        <div className="mb-6 pt-5 border-t border-border-subtle text-left">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#9B4819]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">
                Lanjutkan Proses (Tanpa Unggah Ulang)
              </span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#9B4819]/10 text-[#9B4819]">
              1-Klik Otomatis Masuk
            </span>
          </div>

          {/* Kartu Highlight Utama (Contoh: Kompres PDF saat ukuran hasil membengkak / besar) */}
          {highlightedTool && (
            <button
              type="button"
              onClick={() => handleHandoffClick(highlightedTool)}
              disabled={Boolean(handoffLoadingId)}
              className="w-full mb-2.5 p-3.5 rounded-2xl border-2 border-[#9B4819]/40 hover:border-[#9B4819] bg-[#9B4819]/5 hover:bg-[#9B4819]/10 transition-all text-left flex items-center justify-between gap-3 group cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-surface border border-[#9B4819]/25 shrink-0 mt-0.5 shadow-2xs">
                  {renderToolIcon(highlightedTool.icon, true)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-[#9B4819] transition-colors">
                      {highlightedTool.title}
                    </span>
                    {highlightedTool.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#9B4819] text-white">
                        {highlightedTool.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary leading-snug">
                    {highlightedTool.description}
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#9B4819] text-white group-hover:translate-x-0.5 transition-transform shadow-xs">
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          )}

          {/* Daftar Rekomendasi Perkakas Lainnya */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {secondaryTools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleHandoffClick(tool)}
                disabled={Boolean(handoffLoadingId)}
                className="p-2.5 rounded-xl border border-border-subtle hover:border-[#9B4819]/50 bg-elevated hover:bg-surface transition-all text-left flex flex-col justify-between gap-1.5 group cursor-pointer active:scale-95"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-1.5 rounded-lg bg-surface border border-border-subtle">
                    {renderToolIcon(tool.icon)}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-[#9B4819] group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <div className="text-xs font-bold text-text-primary group-hover:text-[#9B4819] transition-colors truncate">
                    {tool.title}
                  </div>
                  <div className="text-[10px] text-text-secondary line-clamp-2 leading-tight mt-0.5">
                    {tool.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Countdown Timer Kedaluwarsa Berkas */}
      {!isLocalRam && (
        <div className="flex items-center justify-center gap-1.5 p-2.5 rounded-full bg-elevated border border-border-subtle text-[11px] text-text-secondary font-mono mb-5 select-none">
          <Clock size={13} className="text-[#9B4819] shrink-0" />
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
        className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-[#9B4819] transition-colors cursor-pointer"
      >
        <RotateCcw size={13} />
        <span>{resetLabel}</span>
      </button>
    </div>
  );
};

export default DownloadResultCard;

