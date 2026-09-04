import React, { useRef, useState, useCallback } from 'react';
import { View } from '../types';
import { UploadCloud, FileText, Lock, Clock, AlertCircle, ArrowRight, X } from 'lucide-react';
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
    
    // Check format
    const nonPdf = fileList.find(f => !f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf');
    if (nonPdf) {
      setErrorMessage('Format berkas bukan .pdf. Harap pilih dokumen PDF yang valid.');
      addToast('Format bukan .pdf', 'error');
      return;
    }

    // Check size limit: 25 MB
    const tooLarge = fileList.find(f => f.size > 25 * 1024 * 1024);
    if (tooLarge) {
      setErrorMessage('Ukuran berkas melebihi batas 25 MB.');
      addToast('Ukuran berkas melebihi 25 MB', 'error');
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

  return (
    <div className="w-full max-w-4xl mx-auto my-8">
      {droppedFiles.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative cursor-pointer flex flex-col items-center justify-center text-center
            p-6 md:p-8 rounded-2xl transition-all duration-200 select-none
            h-[200px] md:h-[280px] w-full
            ${errorMessage 
              ? 'border-2 border-rose-600 bg-rose-50/50' 
              : isDragOver
              ? 'border-2 border-blue-600 bg-blue-50 ring-4 ring-blue-600/15'
              : 'border-2 border-dashed border-slate-300 bg-white hover:border-blue-500 hover:bg-slate-50/60 shadow-sm'
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
            <div className="flex flex-col items-center text-rose-600 animate-fade-in">
              <AlertCircle size={44} className="mb-2" />
              <p className="font-semibold text-sm md:text-base">{errorMessage}</p>
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); setErrorMessage(null); }}
                className="mt-3 text-xs font-semibold underline hover:text-rose-700"
              >
                Coba pilih berkas lagi
              </button>
            </div>
          ) : (
            <>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200 ${
                isDragOver ? 'bg-blue-600 text-white scale-110' : 'bg-blue-50 text-blue-600'
              }`}>
                <UploadCloud size={28} />
              </div>

              <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1">
                Pilih berkas PDF atau seret ke sini
              </h3>
              <p className="text-xs md:text-sm text-slate-500 max-w-sm mb-4">
                Dukungan multi-berkas hingga 25 MB per dokumen.
              </p>

              <button
                type="button"
                className="px-5 py-2.5 rounded-xl font-semibold text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all active:scale-95 pointer-events-none"
              >
                Pilih Berkas PDF
              </button>
            </>
          )}
        </div>
      ) : (
        /* File detected: Choose quick action modal/container */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md animate-fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900">
                  {droppedFiles.length} Berkas PDF Dipilih
                </span>
                <span className="text-xs text-slate-500 block">
                  Total ukuran: {(droppedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            </div>

            <button
              onClick={() => setDroppedFiles([])}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
            Pilih tindakan untuk berkas ini:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => onSelectView(View.MERGE)}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/50 text-left transition-all group"
            >
              <div>
                <div className="font-semibold text-sm text-slate-900 group-hover:text-blue-600">Gabungkan PDF</div>
                <div className="text-xs text-slate-500">Susun menjadi satu dokumen</div>
              </div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600" />
            </button>

            <button
              onClick={() => onSelectView(View.COMPRESS)}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/50 text-left transition-all group"
            >
              <div>
                <div className="font-semibold text-sm text-slate-900 group-hover:text-blue-600">Kompres PDF</div>
                <div className="text-xs text-slate-500">Perkecil ukuran dokumen</div>
              </div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600" />
            </button>

            <button
              onClick={() => onSelectView(View.PDF_TO_WORD)}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/50 text-left transition-all group"
            >
              <div>
                <div className="font-semibold text-sm text-slate-900 group-hover:text-blue-600">PDF ke Word</div>
                <div className="text-xs text-slate-500">Ekstrak teks ke dokumen DOCX</div>
              </div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600" />
            </button>
          </div>
        </div>
      )}

      {/* Trust Badges under Dropzone (Section 4.4) */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-xs font-medium text-slate-500 select-none">
        <div className="flex items-center gap-1.5">
          <Lock size={14} className="text-emerald-600" />
          <span>Berkas terenkripsi TLS 256-bit</span>
        </div>
        <span className="hidden sm:inline text-slate-300">•</span>
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-blue-600" />
          <span>Berkas dihapus otomatis dari server dalam 60 menit</span>
        </div>
      </div>
    </div>
  );
};

export default UniversalDropzone;
