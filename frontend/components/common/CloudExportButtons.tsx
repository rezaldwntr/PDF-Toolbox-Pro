// frontend/components/common/CloudExportButtons.tsx
import React, { useState } from 'react';
import { ExternalLink, Check, Cloud, ShieldCheck } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { saveFileToGoogleDrive, saveFileToDropbox } from '../../lib/cloudStorage';

interface CloudExportButtonsProps {
  fileUrl: string;
  fileName?: string;
  fileBlob?: Blob;
  className?: string;
}

const CloudExportButtons: React.FC<CloudExportButtonsProps> = ({
  fileUrl,
  fileName = 'dokumen_hasil.pdf',
  fileBlob,
  className = '',
}) => {
  const { addToast } = useToast();
  const [isSavingGDrive, setIsSavingGDrive] = useState(false);
  const [isSavingDropbox, setIsSavingDropbox] = useState(false);
  const [gDriveLink, setGDriveLink] = useState<string | null>(null);

  const getBlob = async (): Promise<Blob> => {
    if (fileBlob) return fileBlob;
    const res = await fetch(fileUrl);
    return await res.blob();
  };

  const handleSaveToGoogleDrive = async () => {
    setIsSavingGDrive(true);
    try {
      const blob = await getBlob();
      const result = await saveFileToGoogleDrive(blob, fileName);
      if (result.success) {
        if (result.viewUrl) setGDriveLink(result.viewUrl);
        addToast(result.message, 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal menyimpan ke Google Drive.', 'error');
    } finally {
      setIsSavingGDrive(false);
    }
  };

  const handleSaveToDropbox = async () => {
    setIsSavingDropbox(true);
    try {
      const result = await saveFileToDropbox(fileUrl, fileName);
      if (result.success) {
        addToast(result.message, 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal menyimpan ke Dropbox.', 'error');
    } finally {
      setIsSavingDropbox(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 w-full max-w-md ${className}`}>
      <div className="flex items-center gap-2 w-full text-text-secondary text-xs font-semibold my-1">
        <div className="h-px bg-border-subtle flex-1" />
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          <Cloud size={13} className="text-accent-primary" />
          <span>Simpan Langsung ke Cloud</span>
        </span>
        <div className="h-px bg-border-subtle flex-1" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {/* Tombol Google Drive */}
        <button
          type="button"
          onClick={handleSaveToGoogleDrive}
          disabled={isSavingGDrive || isSavingDropbox}
          className="min-h-[44px] px-4 py-2.5 rounded-xl border border-border-subtle hover:border-accent-primary bg-surface text-text-primary font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs hover:shadow-md transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isSavingGDrive ? (
            <svg className="animate-spin h-4 w-4 text-accent-primary" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.5 12c0-.8-.1-1.6-.2-2.3H12v4.5h5.9c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.2-2 3.2-5 3.2-8.4z"/>
              <path fill="#34A853" d="M12 22.7c2.9 0 5.3-1 7.1-2.6l-3.7-2.8c-1 .7-2.2 1.1-3.4 1.1-2.6 0-4.8-1.8-5.6-4.2H2.6v2.9C4.4 20.3 7.9 22.7 12 22.7z"/>
              <path fill="#FBBC05" d="M6.4 14.2c-.2-.7-.3-1.4-.3-2.2s.1-1.5.3-2.2V6.9H2.6C1.9 8.3 1.5 10.1 1.5 12s.4 3.7 1.1 5.1l3.8-2.9z"/>
              <path fill="#EA4335" d="M12 5.3c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.3 2 14.9 1.3 12 1.3 7.9 1.3 4.4 3.7 2.6 7l3.8 2.9c.8-2.4 3-4.6 5.6-4.6z"/>
            </svg>
          )}
          <span>{isSavingGDrive ? 'Menyimpan...' : 'Google Drive'}</span>
        </button>

        {/* Tombol Dropbox */}
        <button
          type="button"
          onClick={handleSaveToDropbox}
          disabled={isSavingGDrive || isSavingDropbox}
          className="min-h-[44px] px-4 py-2.5 rounded-xl border border-border-subtle hover:border-accent-primary bg-surface text-text-primary font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs hover:shadow-md transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isSavingDropbox ? (
            <svg className="animate-spin h-4 w-4 text-accent-primary" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg className="w-4 h-4 shrink-0 text-[#0061FF]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 3.5L0 8.25l6 4.75 6-4.75L6 3.5zm12 0l-6 4.75 6 4.75 6-4.75-6-4.75zM0 17.75l6 4.75 6-4.75-6-4.75-6 4.75zm24 0l-6-4.75-6 4.75 6 4.75 6-4.75zM12 18.5l-6-4.75-6 4.75L6 23.25l6-4.75 6 4.75 6-4.75-6-4.75-6 4.75z"/>
            </svg>
          )}
          <span>{isSavingDropbox ? 'Menyimpan...' : 'Dropbox'}</span>
        </button>
      </div>

      {/* Indikator Privasi Token Cloud (Design Bible Section 10.1) */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-elevated border border-border-subtle text-[11px] text-text-secondary text-center leading-tight">
        <ShieldCheck size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>Pemrosesan In-Memory Client-Side, Berkas & Token Tidak Menyentuh Server Backend</span>
      </div>

      {gDriveLink && (
        <a
          href={gDriveLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-primary hover:underline mt-1"
        >
          <span>Buka di Google Drive</span>
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
};

export default CloudExportButtons;
