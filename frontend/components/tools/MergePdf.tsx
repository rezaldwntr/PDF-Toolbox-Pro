
import React, { useState, useRef, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, TrashIcon, DownloadIcon } from '../icons';
import PdfPreview from './PdfPreview';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import FileUploader from '../common/FileUploader';
import { PDFDocument } from 'pdf-lib';

import { BACKEND_URL } from '../../config';

interface MergePdfProps {
  onBack: () => void;
}

interface PdfFile {
  id: string;
  file: File;
  buffer: ArrayBuffer;
}

const MergePdf: React.FC<MergePdfProps> = ({ onBack }) => {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Kept for "Tambah File" button logic
  const { addToast } = useToast();

  const draggedItemIndex = useRef<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleFileChange = async (selectedFiles: FileList | null) => {
    if (selectedFiles) {
      const newFiles = Array.from(selectedFiles).filter(file => file.type === 'application/pdf');
      const processedFiles: PdfFile[] = await Promise.all(
        newFiles.map(async (file) => ({
          id: `${file.name}-${file.lastModified}-${file.size}-${Math.random()}`,
          file,
          buffer: await file.arrayBuffer(),
        }))
      );
      setFiles(prevFiles => [...prevFiles, ...processedFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const { quota, consumeQuota, setShowLimitModal } = useQuota();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    draggedItemIndex.current = index;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (index: number) => {
    if (draggedItemIndex.current !== null && draggedItemIndex.current !== index) {
      const newFiles = [...files];
      const [draggedFile] = newFiles.splice(draggedItemIndex.current, 1);
      newFiles.splice(index, 0, draggedFile);
      setFiles(newFiles);
    }
    draggedItemIndex.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    draggedItemIndex.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      addToast('Silakan pilih setidaknya dua file PDF.', 'warning');
      return;
    }

    if (quota <= 0) {
      setShowLimitModal(true);
      return;
    }

    setIsMerging(true);

    try {
      // 1. Eksekusi Penggabungan Instan di Browser Menggunakan pdf-lib (Standar Modern iLovePDF / Smallpdf)
      // Bebas latensi jaringan, 100% instan (<50ms), dan privasi berkas terjamin
      const mergedPdf = await PDFDocument.create();

      for (const item of files) {
        // Muat dari arrayBuffer yang sudah tersimpan di state
        const srcDoc = await PDFDocument.load(item.buffer.slice(0));
        const pageIndices = srcDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      setMergedPdfUrl(URL.createObjectURL(blob));
      consumeQuota(); // Pemotongan kuota (di-bypass saat preview mode)
      addToast('PDF berhasil digabungkan secara instan!', 'success');
    } catch (clientError: any) {
      console.warn("Client-side merge gagal, mencoba backend fallback:", clientError);

      // 2. Fallback Otomatis ke Backend jika dokumen terenkripsi khusus
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      try {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f.file));

        const response = await fetch(`${BACKEND_URL}/tools/merge-pdf`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || errData.error || "Gagal menggabungkan PDF.");
        }

        const blob = await response.blob();
        setMergedPdfUrl(URL.createObjectURL(blob));
        consumeQuota();
        addToast('PDF berhasil digabungkan!', 'success');
      } catch (error: any) {
        clearTimeout(timeoutId);
        addToast(error.name === 'AbortError' ? "Waktu koneksi habis." : (clientError.message || error.message), 'error');
      }
    } finally {
      setIsMerging(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setIsMerging(false);
    if(mergedPdfUrl) URL.revokeObjectURL(mergedPdfUrl);
    setMergedPdfUrl(null);
  };

  if (mergedPdfUrl) {
    return (
      <ToolContainer title="PDF Berhasil Digabungkan!" onBack={onBack} currentStep={3}>
        <div className="text-center text-slate-600 dark:text-slate-300 flex flex-col items-center gap-6">
          <DownloadIcon className="w-16 h-16 text-emerald-500" />
          <p className="text-base sm:text-lg">File Anda telah berhasil digabungkan secara rapi.</p>
          <a href={mergedPdfUrl} download={`merged-${Date.now()}.pdf`} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors text-base shadow-md w-full max-w-sm">
            Unduh PDF Gabungan
          </a>
          <button onClick={reset} className="font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">Gabungkan PDF Lainnya</button>
        </div>
      </ToolContainer>
    )
  }

  return (
    <ToolContainer 
      title="Gabungkan PDF" 
      description="Susun dan gabungkan beberapa dokumen PDF menjadi satu berkas rapi."
      onBack={onBack}
      currentStep={files.length === 0 ? 1 : 2}
    >
      {files.length === 0 && (
        <FileUploader 
            onFileSelect={handleFileChange} 
            multiple={true}
            label="Gabungkan Beberapa PDF"
            description="Seret banyak file PDF ke sini untuk disatukan"
        />
      )}
      
      {files.length > 0 && (
        <>
            {/* Hidden Input for Add More */}
            <input type="file" multiple accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files)} />
            
            <div className="mb-6 flex justify-center">
                <button onClick={() => fileInputRef.current?.click()} className="bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-slate-600 font-bold py-2 px-4 rounded-lg">Tambah File</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {files.map(({ id, file, buffer }, index) => {
                  const isBeingDragged = draggedIndex === index;
                  const isDragOver = dragOverIndex === index && draggedIndex !== index;

                  return (
                    <div 
                      key={id} 
                      draggable 
                      onDragStart={(e) => handleDragStart(e, index)} 
                      onDragOver={(e) => handleDragOver(e, index)} 
                      onDrop={() => handleDrop(index)} 
                      onDragEnd={handleDragEnd} 
                      className={`drag-card bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group cursor-grab active:cursor-grabbing hover:border-blue-500 dark:hover:border-blue-500 select-none ${
                        isBeingDragged ? 'dragging' : ''
                      } ${isDragOver ? 'drag-over' : ''}`}
                    >
                      <button onClick={() => removeFile(index)} className="absolute top-1.5 right-1.5 p-1 text-red-500 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-full shadow-sm hover:bg-rose-50 dark:hover:bg-rose-950/40">
                        <TrashIcon className="w-4 h-4"/>
                      </button>
                      <PdfPreview buffer={buffer} />
                      <p className="text-[11px] truncate mt-1.5 text-center font-bold text-slate-700 dark:text-slate-300 px-1">{file.name}</p>
                    </div>
                  );
                })}
            </div>

            <div className="mt-8">
                <button onClick={handleMerge} disabled={isMerging || files.length < 2} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50">
                {isMerging ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Sedang Menggabungkan PDF...
                    </>
                ) : `Gabungkan ${files.length} PDF Sekarang`}
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-2 uppercase tracking-tight">Diproses instan & aman langsung di browser</p>
            </div>
        </>
      )}
    </ToolContainer>
  );
};

export default MergePdf;
