
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
  label = "Seret & lepas file PDF Anda di sini",
  description = "atau klik tombol di bawah untuk memilih file"
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

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer flex flex-col items-center justify-center 
        p-10 md:p-16 rounded-3xl border-2 border-dashed transition-all duration-300 ease-in-out
        min-h-[300px] w-full
        ${isDragOver 
          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 scale-[1.01]' 
          : 'border-gray-300 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-400 dark:hover:border-slate-500'
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

      <div className={`
        mb-6 p-4 rounded-full transition-transform duration-300 bg-white dark:bg-slate-700 shadow-sm
        ${isDragOver ? 'scale-110 text-blue-500' : 'text-gray-400 dark:text-slate-400 group-hover:scale-110 group-hover:text-gray-600 dark:group-hover:text-slate-200'}
      `}>
        <UploadIcon className="w-10 h-10 md:w-12 md:h-12" />
      </div>

      <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-3 text-center transition-colors">
        {label}
      </h3>
      
      <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-8 text-center max-w-sm mx-auto leading-relaxed">
        {description}
      </p>

      <button 
        type="button"
        className={`
          px-8 py-3.5 rounded-xl font-bold text-sm md:text-base shadow-lg shadow-blue-500/20 transition-all duration-300
          ${isDragOver 
            ? 'bg-blue-600 text-white scale-105' 
            : 'bg-gray-900 dark:bg-blue-600 text-white hover:bg-gray-800 dark:hover:bg-blue-500 hover:-translate-y-1'
          }
        `}
      >
        Pilih File {multiple ? 'PDF' : ''}
      </button>

      {multiple && (
        <div className="absolute top-4 right-4 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Multi-File
        </div>
      )}
    </div>
  );
};

export default FileUploader;
