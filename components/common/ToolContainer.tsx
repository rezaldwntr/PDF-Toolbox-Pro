
import React from 'react';
import { ArrowLeftIcon } from '../icons';

interface ToolContainerProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

const ToolContainer: React.FC<ToolContainerProps> = ({ title, onBack, children, maxWidth = 'max-w-4xl' }) => {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors duration-200 text-sm font-medium"
        >
          <ArrowLeftIcon />
          Kembali ke Menu Utama
        </button>
      </div>
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-slate-100">{title}</h2>
      <div className={`bg-slate-800 p-8 rounded-xl border border-slate-700 ${maxWidth} mx-auto`}>
        {children}
      </div>
    </div>
  );
};

export default ToolContainer;