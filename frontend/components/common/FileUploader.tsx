import React, { useRef, useState, useCallback, useEffect } from "react";
import { UploadIcon } from "../icons";
import { useQuota } from "../../contexts/QuotaContext";
import { useToast } from "../../contexts/ToastContext";
import { pickFileFromGoogleDrive, pickFileFromDropbox } from "../../lib/cloudStorage";
import { consumePendingHandoffFile } from "../../lib/pipelineHandoff";

interface FileUploaderProps {
  onFileSelect: (files: FileList | null) => void;
  accept?: string | Record<string, string[]>;
  multiple?: boolean;
  maxFiles?: number;
  label?: string;
  description?: string;
  title?: string;
  subtitle?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  accept = ".pdf",
  multiple = false,
  label,
  description,
  title,
  subtitle,
}) => {
  const effectiveLabel = title || label || "Upload File PDF";
  const effectiveDescription = subtitle || description || "Seret file ke sini atau klik untuk memilih";
  const effectiveAccept = typeof accept === "string" ? accept : ".pdf";

  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [cloudMsg, setCloudMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { checkFileSizeLimit, maxFileSizeMB } = useQuota();
  const { addToast } = useToast();

  // Otomatis muat berkas dari perkakas sebelumnya jika pengguna mengklik rekomendasi lanjutan
  useEffect(() => {
    const handoffFile = consumePendingHandoffFile();
    if (handoffFile) {
      try {
        const dt = new DataTransfer();
        dt.items.add(handoffFile);
        onFileSelect(dt.files);
        addToast(`Berkas "${handoffFile.name}" otomatis dimuat dari proses sebelumnya!`, 'success');
      } catch (err) {
        console.warn('Gagal memuat berkas handoff otomatis:', err);
      }
    }
  }, [onFileSelect, addToast]);

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
        p-8 sm:p-12 rounded-t-[48px] sm:rounded-t-[80px] rounded-b-3xl border-2 border-dashed transition-all duration-300 ease-out
        min-h-[300px] w-full overflow-hidden select-none
        ${
          isDragOver
            ? "border-[#9B4819] bg-surface scale-[1.01] shadow-paper-float ring-4 ring-[#9B4819]/10"
            : "border-[#9B4819]/35 hover:border-[#9B4819] bg-surface/90 hover:bg-surface shadow-paper hover:shadow-paper-float"
        }
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={effectiveAccept}
        multiple={multiple}
        onChange={(e) => validateAndSelect(e.target.files)}
      />

      {/* Segel Lilin Arch Dropzone Icon */}
      <div
        className={`
          relative mb-5 p-4 rounded-full transition-all duration-300 shadow-xs
          ${
            isDragOver
              ? "bg-[#9B4819] text-white scale-110 shadow-lg ring-4 ring-[#9B4819]/20"
              : "bg-[#9B4819]/10 text-[#9B4819] border border-[#9B4819]/25 group-hover:scale-105"
          }
        `}
      >
        <UploadIcon className="w-8 h-8" />
      </div>

      <h3 className="relative font-serif text-xl sm:text-2xl font-bold text-text-primary mb-1.5 text-center tracking-tight">
        {effectiveLabel}
      </h3>
      <p className="relative text-text-secondary text-center max-w-sm mb-4 text-xs sm:text-sm leading-relaxed">
        {effectiveDescription}
      </p>
      <p className="relative text-[11px] text-text-secondary mb-5">
        Batas ukuran berkas:{" "}
        <span className="font-semibold text-text-primary font-mono">
          {maxFileSizeMB} MB
        </span>{" "}
        untuk tier akun Anda
      </p>

      <button
        type="button"
        className="relative px-7 py-3 rounded-full font-serif font-bold text-xs sm:text-sm bg-[#9B4819] hover:bg-[#7E3812] text-white shadow-md hover:shadow-paper transition-all cursor-pointer min-h-[42px] active:scale-95"
      >
        Pilih File {multiple && "(Multi)"}
      </button>

      {/* Baris Tombol Cloud Storage (Google Drive & Dropbox) */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="relative mt-6 pt-5 border-t border-border-subtle flex flex-col items-center gap-2.5 w-full max-w-xs"
      >
        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
          atau impor langsung dari cloud:
        </span>
        
        {isLoadingCloud ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#9B4819] py-1">
            <svg className="animate-spin h-4 w-4 text-[#9B4819]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>{cloudMsg}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 w-full">
            <button
              type="button"
              onClick={handlePickGoogleDrive}
              className="flex-1 min-h-[38px] px-3.5 py-1.5 rounded-full bg-surface hover:bg-elevated border border-border-subtle text-text-primary font-medium text-xs flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-95 cursor-pointer"
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
              className="flex-1 min-h-[38px] px-3.5 py-1.5 rounded-full bg-surface hover:bg-elevated border border-border-subtle text-text-primary font-medium text-xs flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-95 cursor-pointer"
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
