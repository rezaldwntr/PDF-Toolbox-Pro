import React, { useRef, useState, useCallback } from 'react';
import { View } from '../types';
import { UploadCloud, FileText, Lock, Clock, AlertCircle, ArrowRight, X, Cpu, HardDrive } from 'lucide-react';
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
    
    // Validasi tipe berkas PDF
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
            p-8 md:p-12 transition-all duration-300 select-none
            rounded-t-[48px] sm:rounded-t-[80px] lg:rounded-t-[100px] rounded-b-3xl
            min-h-[250px] md:min-h-[290px] w-full
            ${errorMessage 
              ? 'border-2 border-status-error bg-status-error/10' 
              : isDragOver
              ? 'border-2 border-[#9B4819] bg-surface scale-[1.01] shadow-paper-float ring-4 ring-[#9B4819]/10'
              : 'border-2 border-dashed border-[#9B4819]/35 hover:border-[#9B4819] bg-surface/90 hover:bg-surface shadow-paper hover:shadow-paper-float'
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
              <AlertCircle size={40} className="mb-2" />
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
              {/* Segel Lilin Arch Icon Dropzone */}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${
                isDragOver 
                  ? 'bg-[#9B4819] text-white scale-110 shadow-lg ring-4 ring-[#9B4819]/20' 
                  : 'bg-[#9B4819]/10 border border-[#9B4819]/25 text-[#9B4819]'
              }`}>
                <UploadCloud size={26} className="stroke-[2.2]" />
              </div>

              <h3 className="font-serif text-lg sm:text-2xl font-bold text-text-primary mb-1.5 tracking-tight">
                Seret & Lepas Berkas PDF di Sini
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary max-w-md mb-5 leading-relaxed">
                Atau klik tombol di bawah untuk menelusuri dari perangkat penyimpanan Anda (Maks. 2GB)
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-full font-serif font-bold text-xs sm:text-sm bg-[#9B4819] hover:bg-[#7E3812] text-white shadow-md hover:shadow-paper transition-all active:scale-95 pointer-events-none"
                >
                  Pilih Berkas PDF
                </button>
              </div>

              {/* Indikator Limit RAM & Privasi */}
              <div className="mt-5 flex items-center gap-2 text-[11px] text-text-secondary select-none font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#314028] animate-pulse"></span>
                <Cpu size={13} className="text-[#314028]" />
                <span>Dokumen ≤100MB diproses lokal di RAM Browser (Nol Jejak Server)</span>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Action selector after files dropped */
        <div className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-paper animate-fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#9B4819]/10 text-[#9B4819] border border-[#9B4819]/20 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div>
                <span className="text-sm sm:text-base font-serif font-bold text-text-primary">
                  {droppedFiles.length} Berkas PDF Dipilih
                </span>
                <span className="text-xs text-text-secondary block font-mono mt-0.5">
                  Total ukuran: {totalSizeMb.toFixed(2)} MB {totalSizeMb <= 100 ? '• Siap diolah di RAM Lokal' : '• Siap diolah Server Fast'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setDroppedFiles([])}
              className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
              title="Batal"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-xs font-serif font-bold text-text-primary uppercase tracking-wider mb-3">
            Pilih tindakan untuk berkas ini:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button
              onClick={() => onSelectView(View.MERGE)}
              className="flex items-center justify-between p-4 rounded-2xl border border-border-subtle hover:border-[#9B4819] bg-surface hover:bg-[#9B4819]/5 text-left transition-all group shadow-2xs hover:shadow-paper"
            >
              <div>
                <div className="font-serif font-bold text-sm text-text-primary group-hover:text-[#9B4819]">Gabungkan PDF</div>
                <div className="text-xs text-text-secondary mt-0.5">Susun halaman berurutan</div>
              </div>
              <ArrowRight size={16} className="text-text-secondary group-hover:text-[#9B4819] group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => onSelectView(View.COMPRESS)}
              className="flex items-center justify-between p-4 rounded-2xl border border-border-subtle hover:border-[#9B4819] bg-surface hover:bg-[#9B4819]/5 text-left transition-all group shadow-2xs hover:shadow-paper"
            >
              <div>
                <div className="font-serif font-bold text-sm text-text-primary group-hover:text-[#9B4819]">Kompres PDF</div>
                <div className="text-xs text-text-secondary mt-0.5">Preset CPNS/BKN 200KB</div>
              </div>
              <ArrowRight size={16} className="text-text-secondary group-hover:text-[#9B4819] group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => onSelectView(View.PDF_TO_WORD)}
              className="flex items-center justify-between p-4 rounded-2xl border border-border-subtle hover:border-[#9B4819] bg-surface hover:bg-[#9B4819]/5 text-left transition-all group shadow-2xs hover:shadow-paper"
            >
              <div>
                <div className="font-serif font-bold text-sm text-text-primary group-hover:text-[#9B4819]">PDF ke Word</div>
                <div className="text-xs text-text-secondary mt-0.5">Format DOCX dapat diedit</div>
              </div>
              <ArrowRight size={16} className="text-text-secondary group-hover:text-[#9B4819] group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
      )}

      {/* Security & Zero-Log Badges under Dropzone */}
      <div className="flex flex-wrap items-center justify-center gap-5 mt-4 text-[11px] font-medium text-text-secondary select-none">
        <div className="flex items-center gap-1.5">
          <Lock size={13} className="text-[#314028]" />
          <span>Kepatuhan UU PDP No. 27/2022</span>
        </div>
        <span className="hidden sm:inline text-border-strong">•</span>
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-[#9B4819]" />
          <span>Auto-Wipe Server 60 Menit</span>
        </div>
        <span className="hidden sm:inline text-border-strong">•</span>
        <div className="flex items-center gap-1.5">
          <Cpu size={13} className="text-[#9B4819]" />
          <span>Zero-Data Retention</span>
        </div>
      </div>
    </div>
  );
};

export default UniversalDropzone;
