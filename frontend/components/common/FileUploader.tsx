import React, { useRef, useState, useCallback } from "react";
import { UploadIcon } from "../icons";
import { useQuota } from "../../contexts/QuotaContext";
import { useToast } from "../../contexts/ToastContext";
import { pickFileFromGoogleDrive, pickFileFromDropbox } from "../../lib/cloudStorage";

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
  description = "Seret file ke sini atau klik untuk memilih",
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [cloudMsg, setCloudMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { checkFileSizeLimit, maxFileSizeMB } = useQuota();
  const { addToast } = useToast();

  const handlePickGoogleDrive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoadingCloud(true);
    setCloudMsg('Menghubungkan ke Google Drive...');
    try {
      const file = await pickFileFromGoogleDrive();
      if (checkFileSizeLimit(file.size)) {
        const dt = new DataTransfer();
        dt.items.add(file);
        onFileSelect(dt.files);
        addToast(`Berkas ${file.name} berhasil diimpor dari Google Drive!`, 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal memilih berkas dari Google Drive.', 'error');
    } finally {
      setIsLoadingCloud(false);
      setCloudMsg('');
    }
  };

  const handlePickDropbox = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoadingCloud(true);
    setCloudMsg('Menghubungkan ke Dropbox...');
    try {
      const file = await pickFileFromDropbox();
      if (checkFileSizeLimit(file.size)) {
        const dt = new DataTransfer();
        dt.items.add(file);
        onFileSelect(dt.files);
        addToast(`Berkas ${file.name} berhasil diimpor dari Dropbox!`, 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal memilih berkas dari Dropbox.', 'error');
    } finally {
      setIsLoadingCloud(false);
      setCloudMsg('');
    }
  };

  const validateAndSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      for (let i = 0; i < files.length; i++) {
        if (!checkFileSizeLimit(files[i].size)) return;
      }
      onFileSelect(files);
    },
    [onFileSelect, checkFileSizeLimit]
  );

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

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        validateAndSelect(e.dataTransfer.files);
      }
    },
    [validateAndSelect]
  );

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        google-anno-skip relative group cursor-pointer flex flex-col items-center justify-center
        p-10 md:p-14 rounded-[2rem] border-2 border-dashed transition-all duration-300 ease-out
        min-h-[320px] w-full overflow-hidden
        ${
          isDragOver
            ? "border-blue-500 bg-blue-50/80 dark:bg-blue-900/20 scale-[1.02] shadow-xl shadow-blue-500/10"
            : "border-gray-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50"
        }
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={(e) => validateAndSelect(e.target.files)}
      />

      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-50/30 to-transparent dark:via-blue-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div
        className={`
          relative mb-6 p-5 rounded-2xl transition-all duration-300 shadow-sm
          ${
            isDragOver
              ? "bg-blue-600 text-white rotate-6 scale-110 shadow-blue-500/30"
              : "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:-rotate-3 shadow-gray-200 dark:shadow-none"
          }
        `}
      >
        <UploadIcon className="w-10 h-10" />
      </div>

      <h3 className="relative text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center">
        {label}
      </h3>
      <p className="relative text-slate-500 dark:text-slate-400 text-center max-w-xs mb-4 text-sm leading-relaxed">
        {description}
      </p>
      <p className="relative text-[11px] text-slate-400 dark:text-slate-500 mb-4">
        Batas ukuran:{" "}
        <span className="font-semibold text-slate-500 dark:text-slate-400">
          {maxFileSizeMB} MB
        </span>{" "}
        untuk tier Anda saat ini
      </p>
      <button
        type="button"
        className="relative px-8 py-3.5 rounded-xl font-bold text-sm bg-blue-600 text-white shadow-lg shadow-blue-600/20 group-hover:bg-blue-700 transition-all cursor-pointer min-h-[44px]"
      >
        Pilih File {multiple && "(Multi)"}
      </button>

      {/* Baris Tombol Cloud Storage (Google Drive & Dropbox) */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="relative mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center gap-2.5 w-full max-w-xs"
      >
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          atau impor langsung dari:
        </span>
        
        {isLoadingCloud ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 py-1">
            <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>{cloudMsg}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 w-full">
            <button
              type="button"
              onClick={handlePickGoogleDrive}
              className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Pilih dokumen PDF dari Google Drive Anda"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.5 12c0-.8-.1-1.6-.2-2.3H12v4.5h5.9c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.2-2 3.2-5 3.2-8.4z"/>
                <path fill="#34A853" d="M12 22.7c2.9 0 5.3-1 7.1-2.6l-3.7-2.8c-1 .7-2.2 1.1-3.4 1.1-2.6 0-4.8-1.8-5.6-4.2H2.6v2.9C4.4 20.3 7.9 22.7 12 22.7z"/>
                <path fill="#FBBC05" d="M6.4 14.2c-.2-.7-.3-1.4-.3-2.2s.1-1.5.3-2.2V6.9H2.6C1.9 8.3 1.5 10.1 1.5 12s.4 3.7 1.1 5.1l3.8-2.9z"/>
                <path fill="#EA4335" d="M12 5.3c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.3 2 14.9 1.3 12 1.3 7.9 1.3 4.4 3.7 2.6 7l3.8 2.9c.8-2.4 3-4.6 5.6-4.6z"/>
              </svg>
              <span>Drive</span>
            </button>

            <button
              type="button"
              onClick={handlePickDropbox}
              className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Pilih dokumen PDF dari Dropbox Anda"
            >
              <svg className="w-3.5 h-3.5 shrink-0 text-[#0061FF]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 3.5L0 8.25l6 4.75 6-4.75L6 3.5zm12 0l-6 4.75 6 4.75 6-4.75-6-4.75zM0 17.75l6 4.75 6-4.75-6-4.75-6 4.75zm24 0l-6-4.75-6 4.75 6 4.75 6-4.75zM12 18.5l-6-4.75-6 4.75L6 23.25l6-4.75 6 4.75 6-4.75-6-4.75-6 4.75z"/>
              </svg>
              <span>Dropbox</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
