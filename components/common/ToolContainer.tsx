import React from 'react';
import { ArrowLeftIcon } from '../icons';

interface ToolContainerProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  maxWidth?: string; // Opsional: mengatur lebar maksimum kontainer agar responsif
}

// Komponen pembungkus (Wrapper) yang digunakan oleh semua alat PDF.
// Menyediakan layout konsisten, tombol kembali, judul, dan animasi masuk.
const ToolContainer: React.FC<ToolContainerProps> = ({ title, onBack, children, maxWidth = 'max-w-4xl' }) => {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 text-sm font-medium"
        >
          <ArrowLeftIcon />
          Kembali ke Menu Utama
        </button>
      </div>
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-gray-900 dark:text-white">{title}</h2>
      <div className={`bg-white dark:bg-slate-800 p-8 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-300 ${maxWidth} mx-auto`}>
        {children}
      </div>
    </div>
  );
};

export default ToolContainer;