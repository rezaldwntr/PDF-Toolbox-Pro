
import React, { useState, useRef, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, TrashIcon, DownloadIcon } from '../icons';
import PdfPreview from './PdfPreview';
import { useToast } from '../../contexts/ToastContext';
import FileUploader from '../common/FileUploader';

const BACKEND_URL = 'https://api-backend.club';

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
  const dragOverItemIndex = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    draggedItemIndex.current = index;
    setDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
     e.preventDefault();
     dragOverItemIndex.current = index;
     e.currentTarget.classList.add('drag-over-indicator');
  };
  
  const handleDragLeaveList = (e: React.DragEvent<HTMLDivElement>) => {
      e.currentTarget.classList.remove('drag-over-indicator');
  };

  const handleDropOnList = () => {
    if (draggedItemIndex.current === null || dragOverItemIndex.current === null) return;
    document.querySelectorAll('.drag-over-indicator').forEach(el => el.classList.remove('drag-over-indicator'));
    
    const newFiles = [...files];
    const draggedFile = newFiles.splice(draggedItemIndex.current, 1)[0];
    newFiles.splice(dragOverItemIndex.current, 0, draggedFile);
    setFiles(newFiles);
    setDragging(false);
    draggedItemIndex.current = null;
    dragOverItemIndex.current = null;
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      addToast('Silakan pilih setidaknya dua file PDF.', 'warning');
      return;
    }

    setIsMerging(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    try {
      const formData = new FormData();
      // Appending all files to the same key 'files' to be sent as a list
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
      addToast('PDF berhasil digabungkan!', 'success');
    } catch (error: any) {
      clearTimeout(timeoutId);
      addToast(error.name === 'AbortError' ? "Waktu habis (5 menit)." : error.message, 'error');
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
      <ToolContainer title="PDF Berhasil Digabungkan!" onBack={onBack}>
        <div className="text-center text-gray-600 dark:text-gray-300 flex flex-col items-center gap-6">
          <DownloadIcon className="w-16 h-16 text-green-500" />
          <p className="text-lg">File Anda telah berhasil disatukan melalui server kami.</p>
          <a href={mergedPdfUrl} download={`merged-${Date.now()}.pdf`} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg shadow-md w-full max-w-sm">
            Unduh PDF Gabungan
          </a>
          <button onClick={reset} className="font-medium text-gray-500 hover:text-blue-600">Gabungkan PDF Lainnya</button>
        </div>
      </ToolContainer>
    )
  }

  return (
    <ToolContainer title="Gabungkan PDF (Server)" onBack={onBack}>
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
                {files.map(({ id, file, buffer }, index) => (
                <div key={id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragLeave={handleDragLeaveList} onDragEnd={handleDropOnList} onDragOver={(e) => e.preventDefault()} className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm relative group cursor-move">
                    <button onClick={() => removeFile(index)} className="absolute top-1 right-1 p-1 text-red-500 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-full shadow-sm"><TrashIcon className="w-4 h-4"/></button>
                    <PdfPreview buffer={buffer} />
                    <p className="text-[10px] truncate mt-1 text-center font-bold text-gray-600 dark:text-gray-300">{file.name}</p>
                </div>
                ))}
            </div>

            <div className="mt-8">
                <button onClick={handleMerge} disabled={isMerging || files.length < 2} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50">
                {isMerging ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Sedang Menggabungkan (Server)...
                    </>
                ) : `Gabungkan ${files.length} PDF Sekarang`}
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-2 uppercase tracking-tight">Diproses aman di server backend</p>
            </div>
        </>
      )}
    </ToolContainer>
  );
};

export default MergePdf;
