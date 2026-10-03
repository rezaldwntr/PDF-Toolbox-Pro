import React, { useState, useRef, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, CheckCircleIcon, FilePdfIcon, TrashIcon, CompressIcon } from '../icons';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import FileUploader from '../common/FileUploader';
import CloudExportButtons from '../common/CloudExportButtons';
import PdfPreview from './PdfPreview';
import { 
  OFFICIAL_PRESET_CATEGORIES, 
  OfficialPreset, 
  getOfficialPresetById 
} from '../../lib/officialPresets';

declare const pdfjsLib: any;

import { BACKEND_URL } from '../../config';

type CompressionOption = 'extreme' | 'recommended' | 'low' | 'target';

const CompressPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [compressionType, setCompressionType] = useState<CompressionOption>('recommended');
  const [targetSizeKb, setTargetSizeKb] = useState<number>(500);
  const [selectedPresetCategory, setSelectedPresetCategory] = useState<'cpns' | 'akademik' | 'umum'>('cpns');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);
  const { addToast } = useToast();
  const { quota, consumeQuota, checkQuotaBeforeAction, setShowLimitModal } = useQuota();

  const activePreset = activePresetId ? getOfficialPresetById(activePresetId) : null;

  const handleSelectOfficialPreset = (preset: OfficialPreset) => {
    setActivePresetId(preset.id);
    setCompressionType('target');
    setTargetSizeKb(preset.targetKb);
    addToast(`Preset resmi "${preset.name}" (${preset.badge}) diaktifkan.`, 'info');
  };

  const handleClearPreset = () => {
    setActivePresetId(null);
  };

  const handleFileChange = async (files: FileList | null) => {
    const selectedFile = files ? files[0] : null;
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setResultUrl(null);
      setResultSize(null);
      setActivePresetId(null);

      // Otomatis atur estimasi target ke 50% ukuran berkas jika masuk mode target
      const fileKb = Math.round(selectedFile.size / 1024);
      setTargetSizeKb(Math.max(100, Math.round(fileKb * 0.5)));

      try {
        const buffer = await selectedFile.arrayBuffer();
        setFileBuffer(buffer);
        if (typeof pdfjsLib !== 'undefined') {
          const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
          setPageCount(pdfDoc.numPages);
        }
      } catch (e) {
        console.warn('Gagal membaca preview dokumen:', e);
      }
    }
  };

  const handleCompress = async () => {
    if (!file) return;

    if (!checkQuotaBeforeAction()) {
      return;
    }

    setIsProcessing(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Pemetaan mode adaptif yang 100% kompatibel dengan server Cloud Run
      let backendCompressionType = 'recommended';
      let targetKb: number | null = null;

      if (compressionType === 'extreme') {
        // Kompres Tinggi: Perintahkan server mengecilkan file secara agresif (~30% ukuran awal)
        backendCompressionType = 'target';
        const fileKb = Math.round(file.size / 1024);
        targetKb = Math.max(50, Math.round(fileKb * 0.3));
      } else if (compressionType === 'recommended') {
        backendCompressionType = 'recommended';
      } else if (compressionType === 'low') {
        backendCompressionType = 'recommended';
      } else if (compressionType === 'target') {
        backendCompressionType = 'target';
        targetKb = targetSizeKb;
      }

      formData.append('compression_type', backendCompressionType);
      if (targetKb !== null) {
        formData.append('target_size_kb', targetKb.toString());
      }

      const response = await fetch(`${BACKEND_URL}/tools/compress-pdf`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Gagal mengompres PDF.");
      }

      const blob = await response.blob();
      setResultSize(blob.size);
      setResultUrl(URL.createObjectURL(blob));
      consumeQuota(); // Pemotongan kuota tamu saat proses selesai
      addToast('Kompresi berhasil diselesaikan!', 'success');
    } catch (error: any) {
      clearTimeout(timeoutId);
      addToast(error.name === 'AbortError' ? "Waktu habis (5 menit)." : error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (resultUrl) {
    const origKb = file ? file.size / 1024 : 0;
    const newKb = resultSize ? resultSize / 1024 : 0;
    const savedPercent = origKb > 0 && newKb > 0 ? Math.max(0, Math.round(((origKb - newKb) / origKb) * 100)) : 0;

    return (
      <ToolContainer title="Kompresi Selesai!" onBack={onBack} currentStep={3}>
        <div className="text-center flex flex-col items-center gap-6 animate-fade-in">
          <CheckCircleIcon className="w-16 h-16 text-green-500" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">PDF Berhasil Dikompres</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Dokumen Anda telah dioptimalkan dengan standar kualitas tinggi.
            </p>
          </div>

          {/* Ringkasan Statistik Ukuran Berkas */}
          {file && resultSize && (
            <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-around shadow-xs">
              <div className="text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Ukuran Awal</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{origKb.toFixed(1)} KB</span>
              </div>
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-600" />
              <div className="text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Ukuran Baru</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{newKb.toFixed(1)} KB</span>
              </div>
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-600" />
              <div className="text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Hemat Ruang</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">-{savedPercent}%</span>
              </div>
            </div>
          )}

          <a 
            href={resultUrl} 
            download={`compressed-${file?.name}`} 
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl w-full max-w-sm shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <DownloadIcon className="w-5 h-5" />
            Unduh PDF Hasil Kompres
          </a>

          {/* Ekspor ke Cloud Storage (Google Drive & Dropbox) */}
          <div className="w-full max-w-sm">
            <CloudExportButtons 
              fileUrl={resultUrl} 
              fileName={`compressed-${file?.name || 'document.pdf'}`} 
            />
          </div>

          <button 
            onClick={() => {
              setResultUrl(null);
              setResultSize(null);
            }} 
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
          >
            Kompres File Lain
          </button>
        </div>
      </ToolContainer>
    );
  }

  // Shortcut keyboard Enter: jalankan kompresi jika berkas siap (Design Bible Section 4.2)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && file && !isProcessing && !resultUrl) {
        e.preventDefault();
        handleCompress();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isProcessing, resultUrl, handleCompress]);

  const estimatedSize = useMemo(() => {
    if (!file) return undefined;
    if (compressionType === 'target') return targetSizeKb * 1024;
    if (compressionType === 'extreme') return Math.round(file.size * 0.25);
    if (compressionType === 'recommended') return Math.round(file.size * 0.55);
    return Math.round(file.size * 0.8);
  }, [file, compressionType, targetSizeKb]);

  // KANVAS DOKUMEN: Pratinjau Kertas Realistis & Info Berkas (Section 4.1)
  const canvasSlot = file && (
    <div className="w-full flex flex-col items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-sm bg-surface p-4 rounded-xl border border-border-subtle shadow-paper relative group transition-all">
        <button 
          onClick={() => { setFile(null); setFileBuffer(null); setPageCount(0); setActivePresetId(null); }} 
          className="absolute top-2.5 right-2.5 p-1.5 text-status-error bg-surface hover:bg-status-error/10 rounded-full shadow-xs z-10 transition-transform active:scale-90 border border-border-subtle cursor-pointer"
          title="Hapus dan pilih berkas lain"
        >
          <TrashIcon className="w-4 h-4" />
        </button>

        {fileBuffer ? (
          <div className="w-full max-w-[220px] mx-auto rounded-lg overflow-hidden shadow-2xs border border-border-subtle">
            <PdfPreview buffer={fileBuffer} />
          </div>
        ) : (
          <div className="w-full h-44 flex items-center justify-center bg-elevated rounded-lg">
            <span className="text-xs text-text-secondary">Memuat pratinjau...</span>
          </div>
        )}

        <div className="mt-3 text-center px-2">
          <p className="text-sm font-bold text-text-primary truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-text-secondary mt-0.5 font-mono">
            {(file.size / 1024).toFixed(1)} KB {pageCount > 0 ? `• ${pageCount} Halaman` : ''}
          </p>
        </div>
      </div>
    </div>
  );

  // PANEL INSPEKTOR KONTROL: Preset Cepat BKN/SSCASN & Slider (Section 4.2)
  const inspectorSlot = file && (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div>
          <h3 className="font-bold text-sm text-text-primary">Parameter Kompresi</h3>
          <p className="text-[11px] text-text-secondary">Pilih preset atau atur ukuran target</p>
        </div>
        {activePreset && (
          <button
            type="button"
            onClick={handleClearPreset}
            className="text-[11px] text-text-secondary hover:text-status-error font-medium underline transition-colors cursor-pointer"
          >
            Atur Ulang
          </button>
        )}
      </div>

      {/* Preset Berkas Resmi Indonesia (SSCASN & BKN) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <span>🇮🇩</span>
            <span>Preset Resmi BKN/SSCASN</span>
          </span>
          {activePreset && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              {activePreset.name} ({activePreset.badge})
            </span>
          )}
        </div>

        {/* Tab Kategori */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {OFFICIAL_PRESET_CATEGORIES.map((cat) => {
            const isActive = selectedPresetCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedPresetCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? 'bg-accent-primary text-white border-accent-primary shadow-2xs'
                    : 'bg-elevated hover:bg-surface text-text-secondary border-border-subtle'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Kartu Grid Preset Kompak */}
        <div className="grid grid-cols-2 gap-2">
          {OFFICIAL_PRESET_CATEGORIES.find((c) => c.id === selectedPresetCategory)?.presets.slice(0, 4).map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectOfficialPreset(preset)}
                className={`p-2 rounded-lg border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-accent-primary bg-accent-primary/10 text-text-primary ring-1 ring-accent-primary'
                    : 'border-border-subtle bg-surface hover:border-border-strong text-text-primary'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-bold text-[11px] truncate">{preset.name}</span>
                  <span className="text-[9px] font-extrabold px-1 rounded bg-accent-primary/10 text-accent-primary">
                    {preset.badge}
                  </span>
                </div>
                <span className="text-[10px] text-text-secondary truncate">{preset.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Kompresi 4 Opsi */}
      <div className="space-y-2 pt-2 border-t border-border-subtle">
        <label className="block text-xs font-bold text-text-primary">
          Pilihan Tingkat Kompresi
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button 
            type="button"
            onClick={() => { setCompressionType('recommended'); setActivePresetId(null); }} 
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              compressionType === 'recommended' 
                ? 'border-accent-primary bg-accent-primary/10 ring-1 ring-accent-primary' 
                : 'border-border-subtle bg-surface hover:border-border-strong'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-bold text-xs text-text-primary">⭐ Standar</span>
              <span className="text-[10px] font-bold text-accent-primary">~55%</span>
            </div>
            <p className="text-[10px] text-text-secondary leading-snug">Seimbang visual & ukuran</p>
          </button>

          <button 
            type="button"
            onClick={() => { setCompressionType('extreme'); setActivePresetId(null); }} 
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              compressionType === 'extreme' 
                ? 'border-accent-primary bg-accent-primary/10 ring-1 ring-accent-primary' 
                : 'border-border-subtle bg-surface hover:border-border-strong'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-bold text-xs text-text-primary">Kompres Tinggi</span>
              <span className="text-[10px] font-bold text-rose-500">~75%</span>
            </div>
            <p className="text-[10px] text-text-secondary leading-snug">Paling kecil untuk web</p>
          </button>

          <button 
            type="button"
            onClick={() => { setCompressionType('low'); setActivePresetId(null); }} 
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              compressionType === 'low' 
                ? 'border-accent-primary bg-accent-primary/10 ring-1 ring-accent-primary' 
                : 'border-border-subtle bg-surface hover:border-border-strong'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-bold text-xs text-text-primary">Kompres Rendah</span>
              <span className="text-[10px] font-bold text-emerald-500">~30%</span>
            </div>
            <p className="text-[10px] text-text-secondary leading-snug">Kualitas gambar tinggi</p>
          </button>

          <button 
            type="button"
            onClick={() => setCompressionType('target')} 
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              compressionType === 'target' 
                ? 'border-accent-primary bg-accent-primary/10 ring-1 ring-accent-primary' 
                : 'border-border-subtle bg-surface hover:border-border-strong'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-bold text-xs text-text-primary">🎯 Kustom KB</span>
              <span className="text-[10px] font-bold text-purple-500">Presisi</span>
            </div>
            <p className="text-[10px] text-text-secondary leading-snug">Target angka spesifik</p>
          </button>
        </div>
      </div>

      {/* Target KB Input jika mode target aktif */}
      {compressionType === 'target' && (
        <div className="p-3 rounded-lg bg-elevated border border-border-subtle space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-text-primary">Target Ukuran Maksimal:</span>
            <span className="font-mono text-[11px] text-text-secondary">{(file.size / 1024).toFixed(0)} KB asal</span>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              min="30"
              max={Math.max(100, Math.round(file.size / 1024))}
              value={targetSizeKb} 
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value));
                setTargetSizeKb(val);
                if (activePreset && activePreset.targetKb !== val) {
                  setActivePresetId(null);
                }
              }} 
              className="flex-1 p-2 border border-border-subtle rounded-md bg-surface text-text-primary font-semibold text-xs focus:ring-1 focus:ring-accent-primary outline-none" 
            />
            <span className="text-xs font-bold px-3 py-2 bg-surface border border-border-subtle rounded-md text-text-secondary">
              KB
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[200, 300, 500, 800].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTargetSizeKb(preset)}
                className={`text-[10px] px-2 py-0.5 rounded border font-medium transition-all ${
                  targetSizeKb === preset
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : 'bg-surface text-text-secondary border-border-subtle hover:border-border-strong'
                }`}
              >
                {preset} KB
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Primary Action Button (CTA) Sesuai Section 4.2 */}
      <button 
        onClick={handleCompress} 
        disabled={isProcessing} 
        className="w-full bg-accent-primary hover:bg-accent-hover text-white font-bold py-3 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-xs sm:text-sm mt-2"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>Mengompres Dokumen...</span>
          </div>
        ) : (
          <>
            <CompressIcon className="w-4 h-4" />
            <span>Kompres Sekarang (↵)</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <ToolContainer 
      title="Kompres PDF" 
      description="Kecilkan ukuran file PDF tanpa menurunkan kualitas teks & gambar."
      onBack={onBack} 
      maxWidth="max-w-5xl"
      currentStep={!file ? 1 : 2}
      canvasSlot={file ? canvasSlot : undefined}
      inspectorSlot={file ? inspectorSlot : undefined}
      fileInfo={file ? { originalSize: file.size, estimatedSize, isLocalRam: false } : undefined}
    >
      {!file && (
        <FileUploader 
          onFileSelect={handleFileChange} 
          label="Pilih PDF untuk Dikompres"
          description="Seret file PDF ke sini untuk memperkecil ukurannya"
        />
      )}
    </ToolContainer>
  );
};

export default CompressPdf;

