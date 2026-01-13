
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
    <div className="animate-fade-in pb-20 pt-4 px-2">
      <div className="max-w-7xl mx-auto mb-6">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 px-5 py-2.5 rounded-full text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 text-sm font-bold border border-gray-200 dark:border-slate-700 shadow-sm"
        >
          <div className="transform group-hover:-translate-x-1 transition-transform">
             <ArrowLeftIcon />
          </div>
          Kembali
        </button>
      </div>

      <div className="flex flex-col items-center">
         <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-3 text-slate-900 dark:text-white tracking-tight">
            {title}
         </h2>
         <div className="w-16 h-1.5 bg-blue-600 rounded-full mb-8 opacity-80"></div>

         <div className={`w-full ${maxWidth} bg-white dark:bg-slate-800 p-6 md:p-10 rounded-[2.5rem] border border-gray-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none`}>
            {children}
         </div>
      </div>
    </div>
  );
};

export default ToolContainer;
