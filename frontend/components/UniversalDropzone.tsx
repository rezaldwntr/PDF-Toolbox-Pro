import React, { useRef, useState, useCallback } from 'react';
import { View } from '../types';
import { UploadCloud, FileText, Lock, Clock, AlertCircle, ArrowRight, X, Cpu } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface UniversalDropzoneProps {
  onSelectView: (view: View) => void;
}

const UniversalDropzone: React.FC<UniversalDropzoneProps> = ({ onSelectView }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const validateAndProcessFiles = (files: FileList | null) => {
    setErrorMessage(null);
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    
    // Validasi tipe berkas PDF (Design Bible Section 3.2)
    const nonPdf = fileList.find(f => !f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf');
    if (nonPdf) {
      const msg = 'Format berkas tidak didukung. Harap pilih dokumen PDF.';
      setErrorMessage(msg);
      addToast(msg, 'error');
      return;
    }

    setDroppedFiles(fileList);
  };

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
      validateAndProcessFiles(e.dataTransfer.files);
    }
  }, []);

  const totalSizeMb = droppedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024);

  return (
    <div className="w-full max-w-4xl mx-auto my-6">
      {droppedFiles.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            google-anno-skip relative cursor-pointer flex flex-col items-center justify-center text-center
            p-6 md:p-8 rounded-xl transition-all duration-200 select-none
            h-[220px] md:h-[260px] w-full
            ${errorMessage 
              ? 'border-2 border-status-error bg-status-error/10' 
              : isDragOver
              ? 'border-2 border-accent-primary bg-elevated scale-[1.01] shadow-card-hover'
              : 'border-[1.5px] border-dashed border-border-subtle hover:border-border-strong bg-surface hover:bg-elevated/40 shadow-2xs'
            }
          `}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf"
            multiple
            onChange={(e) => validateAndProcessFiles(e.target.files)}
          />

          {errorMessage ? (
            <div className="flex flex-col items-center text-status-error animate-fade-in">
              <AlertCircle size={38} className="mb-2" />
              <p className="font-bold text-sm md:text-base">{errorMessage}</p>
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); setErrorMessage(null); }}
                className="mt-3 text-xs font-semibold underline hover:opacity-80"
              >
                Coba pilih berkas lagi
              </button>
            </div>
          ) : (
            <>
              {/* Taktil Document Upload Icon (Section 3.2) */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform duration-200 ${
                isDragOver 
                  ? 'bg-accent-primary text-white scale-105 shadow-sm' 
                  : 'bg-elevated border border-border-subtle text-accent-primary'
              }`}>
                <UploadCloud size={24} />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-text-primary mb-1 tracking-tight">
                Seret & Lepas Berkas PDF di Sini
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary max-w-sm mb-4">
                Atau klik untuk menelusuri dari perangkat (Maks. 2GB)
              </p>

              <button
                type="button"
                className="px-5 py-2.5 rounded-lg font-bold text-xs bg-accent-primary hover:bg-accent-hover text-white shadow-2xs transition-all active:scale-95 pointer-events-none"
              >
                Pilih Berkas PDF
              </button>

              {/* Indikator Limit RAM (Section 3.2) */}
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-text-secondary select-none font-medium">
                <Cpu size={12} className="text-emerald-500" />
                <span>Dokumen ≤100MB diolah lokal di RAM Browser (Zero-Upload)</span>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Action selector after files dropped */
        <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-card animate-fade-in">
          <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center justify-center">
                <FileText size={16} />
              </div>
              <div>
                <span className="text-sm font-bold text-text-primary">
                  {droppedFiles.length} Berkas PDF Dipilih
                </span>
                <span className="text-[11px] text-text-secondary block font-mono">
                  Total ukuran: {totalSizeMb.toFixed(2)} MB {totalSizeMb <= 100 ? '• Siap diolah di RAM Lokal' : '• Siap diolah Server Fast'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setDroppedFiles([])}
              className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
              title="Batal"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2.5">
            Pilih tindakan untuk berkas ini:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => onSelectView(View.MERGE)}
              className="flex items-center justify-between p-3.5 rounded-lg border border-border-subtle hover:border-accent-primary bg-surface hover:bg-accent-primary/5 text-left transition-all group"
            >
              <div>
                <div className="font-bold text-xs text-text-primary group-hover:text-accent-primary">Gabungkan PDF</div>
                <div className="text-[11px] text-text-secondary">Susun halaman berurutan</div>
              </div>
              <ArrowRight size={14} className="text-text-secondary group-hover:text-accent-primary group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => onSelectView(View.COMPRESS)}
              className="flex items-center justify-between p-3.5 rounded-lg border border-border-subtle hover:border-accent-primary bg-surface hover:bg-accent-primary/5 text-left transition-all group"
            >
              <div>
                <div className="font-bold text-xs text-text-primary group-hover:text-accent-primary">Kompres PDF</div>
                <div className="text-[11px] text-text-secondary">Preset CPNS/BKN 200KB</div>
              </div>
              <ArrowRight size={14} className="text-text-secondary group-hover:text-accent-primary group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => onSelectView(View.PDF_TO_WORD)}
              className="flex items-center justify-between p-3.5 rounded-lg border border-border-subtle hover:border-accent-primary bg-surface hover:bg-accent-primary/5 text-left transition-all group"
            >
              <div>
                <div className="font-bold text-xs text-text-primary group-hover:text-accent-primary">PDF ke Word</div>
                <div className="text-[11px] text-text-secondary">Format DOCX dapat diedit</div>
              </div>
              <ArrowRight size={14} className="text-text-secondary group-hover:text-accent-primary group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>
      )}

      {/* Security & Zero-Log Badges under Dropzone */}
      <div className="flex flex-wrap items-center justify-center gap-5 mt-3 text-[11px] font-medium text-text-secondary select-none">
        <div className="flex items-center gap-1.5">
          <Lock size={12} className="text-emerald-500" />
          <span>Kepatuhan UU PDP No. 27/2022</span>
        </div>
        <span className="hidden sm:inline text-border-strong">•</span>
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-accent-primary" />
          <span>Auto-Wipe Server 60 Menit</span>
        </div>
        <span className="hidden sm:inline text-border-strong">•</span>
        <div className="flex items-center gap-1.5">
          <Cpu size={12} className="text-purple-500" />
          <span>Zero-Data Retention</span>
        </div>
      </div>
    </div>
  );
};

export default UniversalDropzone;
