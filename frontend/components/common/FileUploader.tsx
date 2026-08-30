
import React, { useRef, useState, useCallback } from 'react';
import { UploadIcon } from '../icons';

interface FileUploaderProps {
  onFileSelect: (files: FileList | null) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  description?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onFileSelect, 
  accept = ".pdf", 
  multiple = false,
  label = "Upload File PDF",
  description = "Seret file ke sini atau klik untuk memilih"
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files);
    }
  }, [onFileSelect]);

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer flex flex-col items-center justify-center 
        p-10 md:p-14 rounded-[2rem] border-2 border-dashed transition-all duration-300 ease-out
        min-h-[320px] w-full overflow-hidden
        ${isDragOver 
          ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-900/20 scale-[1.02] shadow-xl shadow-blue-500/10' 
          : 'border-gray-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50'
        }
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={(e) => onFileSelect(e.target.files)}
      />

      {/* Background Decor (Glow Effect) */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-50/30 to-transparent dark:via-blue-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Icon Container */}
      <div className={`
        relative mb-6 p-5 rounded-2xl transition-all duration-300 shadow-sm
        ${isDragOver 
            ? 'bg-blue-600 text-white rotate-6 scale-110 shadow-blue-500/30' 
            : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:-rotate-3 shadow-gray-200 dark:shadow-none'
        }
      `}>
        <UploadIcon className="w-10 h-10" />
      </div>

      <h3 className="relative text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center">
        {label}
      </h3>
      
      <p className="relative text-slate-500 dark:text-slate-400 text-center max-w-xs mb-8 text-sm leading-relaxed">
        {description}
      </p>

      <button 
        type="button"
        className="relative px-8 py-3 rounded-xl font-bold text-sm bg-blue-600 text-white shadow-lg shadow-blue-600/20 group-hover:bg-blue-700 transition-colors"
      >
        Pilih File {multiple && '(Multi)'}
      </button>
    </div>
  );
};

export default FileUploader;
