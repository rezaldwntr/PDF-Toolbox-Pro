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
  
  // Slot Pattern Sesuai Design Bible & Radley Specs
  canvasSlot?: React.ReactNode;
  inspectorSlot?: React.ReactNode;
  toolbarSlot?: React.ReactNode;
  floatingBarSlot?: React.ReactNode;
  fileInfo?: FileProcessingInfo;

  maxWidth?: string;
  currentStep?: 1 | 2 | 3;
  showGuide?: boolean;
  showStepper?: boolean;
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
  showGuide,
  showStepper
}) => {
  const isInformationalPage = [
    'Tentang PDF Toolbox Pro',
    'Kebijakan Privasi',
    'Syarat & Ketentuan',
    'Hubungi',
    'Pertanyaan yang Sering Diajukan',
    'FAQ',
    'Blog & Wawasan',
    'Pesan Berhasil Terkirim!'
  ].some(item => title.toLowerCase().includes(item.toLowerCase()));

  const shouldShowStepper = showStepper !== undefined ? showStepper : !isInformationalPage;
  const shouldShowGuide = showGuide !== undefined ? showGuide : !isInformationalPage;

  // Jika inspectorSlot diberikan, aktifkan arsitektur Split-View
  const isSplitView = Boolean(inspectorSlot);

  return (
    <div className="animate-fade-in py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Top Bar: Navigasi Kembali & Stepper Alur 3-Tahap */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-full text-text-primary hover:text-[#9B4819] bg-surface hover:bg-elevated active:scale-95 border border-border-subtle hover:border-[#9B4819]/40 shadow-2xs hover:shadow-paper transition-all duration-200 text-xs sm:text-sm font-medium cursor-pointer"
        >
          <ArrowLeft size={15} className="transform group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Beranda</span>
        </button>

        {/* 3-Step Workflow Indicator / Info Page Indicator */}
        {shouldShowStepper ? (
          <div className="flex items-center gap-2.5 text-xs font-medium text-text-secondary bg-surface border border-border-subtle px-4 py-1.5 rounded-full shadow-2xs select-none">
            <div className={`flex items-center gap-1.5 ${currentStep >= 1 ? 'text-[#9B4819] font-bold' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep >= 1 ? 'bg-[#9B4819] text-white font-bold shadow-xs' : 'bg-elevated border border-border-subtle text-text-secondary'
              }`}>1</span>
              <span>Unggah</span>
            </div>
            <span className="text-border-strong">•</span>
            <div className={`flex items-center gap-1.5 ${currentStep >= 2 ? 'text-[#9B4819] font-bold' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep >= 2 ? 'bg-[#9B4819] text-white font-bold shadow-xs' : 'bg-elevated border border-border-subtle text-text-secondary'
              }`}>2</span>
              <span>Konfigurasi</span>
            </div>
            <span className="text-border-strong">•</span>
            <div className={`flex items-center gap-1.5 ${currentStep >= 3 ? 'text-[#9B4819] font-bold' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep >= 3 ? 'bg-[#9B4819] text-white font-bold shadow-xs' : 'bg-elevated border border-border-subtle text-text-secondary'
              }`}>3</span>
              <span>Unduh</span>
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-surface border border-border-subtle text-text-secondary shadow-2xs select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9B4819]" />
            <span>Dokumentasi Resmi & Informasi Layanan</span>
          </div>
        )}
      </div>

      {/* Main Workspace Header */}
      <div className="text-center mb-7 max-w-2xl mx-auto">
        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary tracking-tight leading-tight mb-2">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-xl mx-auto">
            {description}
          </p>
        )}
      </div>

      {/* ARSITEKTUR WORKSPACE SPLIT-VIEW (google-anno-skip melindungi kanvas dari injeksi iklan otomatis AdSense) */}
      {isSplitView ? (
        <div className="google-anno-skip w-full flex flex-col lg:flex-row items-stretch gap-6 mb-8">
          
          {/* KANVAS DOKUMEN (Kiri/Tengah: 70% s.d. 75% Lebar Layar) */}
          <div className="w-full lg:w-[70%] xl:w-[72%] flex flex-col gap-4">
            
            {/* Toolbar Navigasi Halaman & Zoom (Opsional) */}
            {toolbarSlot && (
              <div className="w-full bg-surface border border-border-subtle rounded-2xl p-3 shadow-2xs flex items-center justify-between text-xs">
                {toolbarSlot}
              </div>
            )}

            {/* Kanvas Kertas Realistis (Paper Sheet with shadow-paper) */}
            <div className="w-full bg-canvas border border-border-subtle rounded-3xl p-5 sm:p-7 shadow-paper flex flex-col items-center justify-center min-h-[520px] relative overflow-hidden">
              {canvasSlot || children}
            </div>

            {/* Floating Bottom Status Bar */}
            {floatingBarSlot ? (
              floatingBarSlot
            ) : fileInfo?.originalSize ? (
              <div className="w-full px-5 py-2.5 rounded-full bg-surface border border-border-subtle shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs select-none">
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-text-secondary">Ukuran Asli:</span>
                  <span className="font-bold text-text-primary">{(fileInfo.originalSize / (1024 * 1024)).toFixed(2)} MB</span>
                  {fileInfo.estimatedSize && (
                    <>
                      <span className="text-text-secondary">→</span>
                      <span className="font-bold text-[#9B4819]">{(fileInfo.estimatedSize / (1024 * 1024)).toFixed(2)} MB</span>
                      <span className="text-[#314028] dark:text-emerald-400 font-bold">
                        ({Math.round(((fileInfo.originalSize - fileInfo.estimatedSize) / fileInfo.originalSize) * -100)}%)
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {fileInfo.isLocalRam ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-medium bg-[#314028]/10 text-[#314028] dark:text-emerald-400 border border-[#314028]/25">
                      <Cpu size={12} />
                      <span>Diolah Lokal di RAM Browser</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-medium bg-[#9B4819]/10 text-[#9B4819] border border-[#9B4819]/25">
                      <Lock size={12} />
                      <span>Enkripsi TLS 1.3 Active</span>
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* PANEL INSPEKTOR KONTROL (Kanan: 25% s.d. 30% Lebar Layar) */}
          <div className="w-full lg:w-[30%] xl:w-[28%] flex flex-col">
            <div className="bg-surface rounded-3xl p-6 border border-border-subtle shadow-paper flex flex-col gap-4 sticky top-20">
              {inspectorSlot}
            </div>
          </div>
        </div>
      ) : (
        /* Single Container Workspace (Backwards Compatibility) */
        <div className={`google-anno-skip w-full ${maxWidth} mx-auto bg-surface p-6 sm:p-8 rounded-3xl border border-border-subtle shadow-paper transition-all mb-8`}>
          {children}
        </div>
      )}

      {/* Security & Compliance Badges */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-xs font-medium text-text-secondary select-none">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-[#314028] dark:text-emerald-400" />
          <span>Kepatuhan UU PDP No. 27/2022</span>
        </div>
        <span className="hidden sm:inline text-border-strong">•</span>
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-[#9B4819]" />
          <span>Auto-Wipe Server 60 Menit</span>
        </div>
        <span className="hidden sm:inline text-border-strong">•</span>
        <div className="flex items-center gap-1.5">
          <Lock size={14} className="text-[#9B4819]" />
          <span>TLS 1.3 Enkripsi Bank-Grade</span>
        </div>
      </div>

      {/* Panduan Penggunaan & FAQ Dinamis */}
      {shouldShowGuide && (
        <div className="mt-14">
          <ToolGuideSection toolTitle={title} />
        </div>
      )}
    </div>
  );
};

export default ToolContainer;
