import React from 'react';
import { ArrowLeft, Lock, Clock, ShieldCheck } from 'lucide-react';

interface ToolContainerProps {
  title: string;
  description?: string;
  onBack: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  currentStep?: 1 | 2 | 3;
}

const ToolContainer: React.FC<ToolContainerProps> = ({ 
  title, 
  description,
  onBack, 
  children, 
  maxWidth = 'max-w-4xl',
  currentStep = 1
}) => {
  return (
    <div className="animate-fade-in py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Top Bar: Back navigation & 3-step indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <button
          onClick={onBack}
          className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-[#1E222B] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all text-xs sm:text-sm font-semibold"
        >
          <ArrowLeft size={16} className="transform group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Beranda</span>
        </button>

        {/* 3-Step Workflow Indicator (Section 1: Upload -> Konfigurasi -> Unduh) */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-[#1E222B] border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-sm">
          <div className={`flex items-center gap-1.5 ${currentStep >= 1 ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>1</span>
            <span>Unggah</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">→</span>
          <div className={`flex items-center gap-1.5 ${currentStep >= 2 ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>2</span>
            <span>Konfigurasi</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">→</span>
          <div className={`flex items-center gap-1.5 ${currentStep >= 3 ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>3</span>
            <span>Unduh</span>
          </div>
        </div>
      </div>

      {/* Main Spoke Workspace */}
      <div className="flex flex-col items-center">
        <div className="text-center mb-6 max-w-xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Workspace Card */}
        <div className={`w-full ${maxWidth} bg-white dark:bg-[#1E222B] p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all`}>
          {children}
        </div>

        {/* Trust Badges under Spoke (Section 4.4) */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-xs font-medium text-slate-500 dark:text-slate-400 select-none">
          <div className="flex items-center gap-1.5">
            <Lock size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Berkas terenkripsi TLS 256-bit</span>
          </div>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-blue-600 dark:text-blue-400" />
            <span>Berkas dihapus otomatis dalam 60 menit</span>
          </div>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-purple-600 dark:text-purple-400" />
            <span>Bebas risiko & tanpa biaya tersembunyi</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolContainer;
