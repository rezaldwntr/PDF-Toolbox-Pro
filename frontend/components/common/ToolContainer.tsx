import React from 'react';
import { ArrowLeft, Lock, Clock, ShieldCheck, Cpu } from 'lucide-react';
import ToolGuideSection from './ToolGuideSection';

export interface FileProcessingInfo {
  originalSize?: number;
  estimatedSize?: number;
  isLocalRam?: boolean;
}

interface ToolContainerProps {
  title: string;
  description?: string;
  onBack: () => void;
  children?: React.ReactNode;
  
  // Slot Pattern Sesuai Design Bible Section 4 & 8.1
  canvasSlot?: React.ReactNode;
  inspectorSlot?: React.ReactNode;
  toolbarSlot?: React.ReactNode;
  floatingBarSlot?: React.ReactNode;
  fileInfo?: FileProcessingInfo;

  maxWidth?: string;
  currentStep?: 1 | 2 | 3;
  showGuide?: boolean;
}

const ToolContainer: React.FC<ToolContainerProps> = ({ 
  title, 
  description,
  onBack, 
  children, 
  canvasSlot,
  inspectorSlot,
  toolbarSlot,
  floatingBarSlot,
  fileInfo,
  maxWidth = 'max-w-4xl',
  currentStep = 1,
  showGuide
}) => {
  const shouldShowGuide = showGuide !== undefined 
    ? showGuide 
    : !['Tentang PDF Toolbox Pro', 'Kebijakan Privasi & Keamanan Data', 'Syarat & Ketentuan Layanan', 'Hubungi Kami', 'Pertanyaan yang Sering Diajukan (FAQ)', 'Blog & Wawasan', 'Pesan Berhasil Terkirim!'].includes(title);

  // Jika inspectorSlot diberikan, aktifkan arsitektur Split-View (Section 4)
  const isSplitView = Boolean(inspectorSlot);

  return (
    <div className="animate-fade-in py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Top Bar: Navigasi Kembali & Stepper Alur 3-Tahap */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-text-primary hover:text-accent-primary bg-surface hover:bg-elevated active:scale-98 border border-border-subtle hover:border-border-strong shadow-2xs transition-all duration-200 text-xs sm:text-sm font-semibold cursor-pointer"
        >
          <ArrowLeft size={15} className="transform group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Beranda</span>
        </button>

        {/* 3-Step Workflow Indicator (Section 1: Unggah -> Konfigurasi -> Unduh) */}
        <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary bg-surface border border-border-subtle px-3 py-1.5 rounded-lg shadow-2xs select-none">
          <div className={`flex items-center gap-1.5 ${currentStep >= 1 ? 'text-accent-primary font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              currentStep >= 1 ? 'bg-accent-primary text-white font-bold' : 'bg-elevated border border-border-subtle text-text-secondary'
            }`}>1</span>
            <span>Unggah</span>
          </div>
          <span className="text-border-strong">•</span>
          <div className={`flex items-center gap-1.5 ${currentStep >= 2 ? 'text-accent-primary font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              currentStep >= 2 ? 'bg-accent-primary text-white font-bold' : 'bg-elevated border border-border-subtle text-text-secondary'
            }`}>2</span>
            <span>Konfigurasi</span>
          </div>
          <span className="text-border-strong">•</span>
          <div className={`flex items-center gap-1.5 ${currentStep >= 3 ? 'text-accent-primary font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              currentStep >= 3 ? 'bg-accent-primary text-white font-bold' : 'bg-elevated border border-border-subtle text-text-secondary'
            }`}>3</span>
            <span>Unduh</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Header */}
      <div className="text-center mb-6 max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight leading-tight mb-1.5">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* ARSITEKTUR WORKSPACE SPLIT-VIEW (Design Bible Section 4) */}
      {isSplitView ? (
        <div className="w-full flex flex-col lg:flex-row items-stretch gap-6 mb-8">
          
          {/* KANVAS DOKUMEN (Kiri/Tengah: 70% s.d. 75% Lebar Layar) */}
          <div className="w-full lg:w-[70%] xl:w-[72%] flex flex-col gap-4">
            
            {/* Toolbar Navigasi Halaman & Zoom (Opsional) */}
            {toolbarSlot && (
              <div className="w-full bg-surface border border-border-subtle rounded-xl p-2.5 shadow-2xs flex items-center justify-between text-xs">
                {toolbarSlot}
              </div>
            )}

            {/* Kanvas Kertas Realistis (Paper Sheet with shadow-paper) */}
            <div className="w-full bg-canvas border border-border-subtle rounded-2xl p-4 sm:p-6 shadow-paper flex flex-col items-center justify-center min-h-[520px] relative overflow-hidden">
              {canvasSlot || children}
            </div>

            {/* Floating Bottom Status Bar (Section 4.1) */}
            {floatingBarSlot ? (
              floatingBarSlot
            ) : fileInfo?.originalSize ? (
              <div className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border-subtle shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs select-none">
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-text-secondary">Ukuran Asli:</span>
                  <span className="font-bold text-text-primary">{(fileInfo.originalSize / (1024 * 1024)).toFixed(2)} MB</span>
                  {fileInfo.estimatedSize && (
                    <>
                      <span className="text-text-secondary">→</span>
                      <span className="font-bold text-accent-primary">{(fileInfo.estimatedSize / (1024 * 1024)).toFixed(2)} MB</span>
                      <span className="text-emerald-500 font-bold">
                        ({Math.round(((fileInfo.originalSize - fileInfo.estimatedSize) / fileInfo.originalSize) * -100)}%)
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {fileInfo.isLocalRam ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <Cpu size={11} />
                      <span>Diolah Lokal di RAM Browser</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-accent-primary/10 text-accent-primary border border-accent-primary/30">
                      <Lock size={11} />
                      <span>Enkripsi TLS 1.3 Active</span>
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* PANEL INSPEKTOR KONTROL (Kanan: 25% s.d. 30% Lebar Layar) */}
          <div className="w-full lg:w-[30%] xl:w-[28%] flex flex-col">
            <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-card flex flex-col gap-4 sticky top-20">
              {inspectorSlot}
            </div>
          </div>
        </div>
      ) : (
        /* Single Container Workspace (Backwards Compatibility) */
        <div className={`w-full ${maxWidth} mx-auto bg-surface p-6 sm:p-8 rounded-2xl border border-border-subtle shadow-card transition-all mb-8`}>
          {children}
        </div>
      )}

      {/* Security & Compliance Badges */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-xs font-medium text-text-secondary select-none">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Kepatuhan UU PDP No. 27/2022</span>
        </div>
        <span className="hidden sm:inline text-border-strong">•</span>
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-accent-primary" />
          <span>Auto-Wipe Server 60 Menit</span>
        </div>
        <span className="hidden sm:inline text-border-strong">•</span>
        <div className="flex items-center gap-1.5">
          <Lock size={14} className="text-purple-500" />
          <span>TLS 1.3 Enkripsi Bank-Grade</span>
        </div>
      </div>

      {/* Panduan Penggunaan & FAQ Dinamis */}
      {shouldShowGuide && (
        <div className="mt-12">
          <ToolGuideSection toolTitle={title} />
        </div>
      )}
    </div>
  );
};

export default ToolContainer;
