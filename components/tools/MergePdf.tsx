
import React, { useState, useRef, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import { PDFDocument } from 'pdf-lib';
import { UploadIcon, TrashIcon, DownloadIcon } from '../icons';
import PdfPreview from './PdfPreview';
import { useToast } from '../../contexts/ToastContext';

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
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  // Refs for drag and drop
  const draggedItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFileChange = async (selectedFiles: FileList | null) => {
    if (selectedFiles) {
      const newFiles = Array.from(selectedFiles).filter(file => file.type === 'application/pdf');
      const processedFiles: PdfFile[] = await Promise.all(
        newFiles.map(async (file) => ({
          id: `${file.name}-${file.lastModified}-${file.size}`,
          file,
          buffer: await file.arrayBuffer(),
        }))
      );
      setFiles(prevFiles => [...prevFiles, ...processedFiles]);
    }
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

  const handleDropOnUploader = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    await handleFileChange(e.dataTransfer.files);
  }, []);

  const removeFile = (indexToRemove: number) => {
    setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    draggedItemIndex.current = index;
    setDragging(true);

    const target = e.currentTarget;
    const ghost = target.cloneNode(true) as HTMLElement;

    ghost.style.width = `${target.offsetWidth}px`;
    ghost.style.height = `${target.offsetHeight}px`;

    ghost.classList.add('drag-ghost');
    document.body.appendChild(ghost);
    
    e.dataTransfer.setDragImage(ghost, target.offsetWidth / 2, target.offsetHeight / 2);

    setTimeout(() => {
        if (ghost.parentNode) {
            ghost.parentNode.removeChild(ghost);
        }
    }, 0);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
     e.preventDefault();
     dragOverItemIndex.current = index;
     const draggedOverEl = e.currentTarget;
     draggedOverEl.classList.add('drag-over-indicator');
  };
  
  const handleDragLeaveList = (e: React.DragEvent<HTMLDivElement>) => {
      e.currentTarget.classList.remove('drag-over-indicator');
  };


  const handleDropOnList = () => {
    if (draggedItemIndex.current === null || dragOverItemIndex.current === null) return;
    
    document.querySelectorAll('.drag-over-indicator').forEach(el => el.classList.remove('drag-over-indicator'));
    
    if (draggedItemIndex.current === dragOverItemIndex.current) {
        draggedItemIndex.current = null;
        dragOverItemIndex.current = null;
        setDragging(false);
        return;
    }

    const newFiles = [...files];
    const draggedFile = newFiles.splice(draggedItemIndex.current, 1)[0];
    newFiles.splice(dragOverItemIndex.current, 0, draggedFile);

    setFiles(newFiles);
    
    draggedItemIndex.current = null;
    dragOverItemIndex.current = null;
    setDragging(false);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      addToast('Silakan pilih setidaknya dua file PDF untuk digabungkan.', 'warning');
      return;
    }

    setIsMerging(true);
    setMergedPdfUrl(null);

    try {
      const mergedPdf = await PDFDocument.create();
      for (const { buffer } of files) {
        const pdf = await PDFDocument.load(buffer.slice(0));
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      
      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setMergedPdfUrl(url);
      addToast('PDF berhasil digabungkan!', 'success');

    } catch (error) {
      console.error('Error merging PDFs:', error);
      addToast('Terjadi kesalahan saat menggabungkan PDF. Silakan coba lagi.', 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setIsMerging(false);
    if(mergedPdfUrl) {
        URL.revokeObjectURL(mergedPdfUrl);
    }
    setMergedPdfUrl(null);
  };

  if (mergedPdfUrl) {
    return (
      <ToolContainer title="PDF Berhasil Digabungkan!" onBack={onBack}>
        <div className="text-center text-gray-600 flex flex-col items-center gap-6">
          <p className="text-lg">File Anda telah berhasil disatukan.</p>
          <a
            href={mergedPdfUrl}
            download={`gabung-pdf-${Date.now()}.pdf`}
            className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg shadow-sm shadow-blue-200"
          >
            <DownloadIcon />
            Unduh PDF Gabungan
          </a>
          <button
            onClick={reset}
            className="font-medium text-gray-500 hover:text-blue-600 transition-colors"
          >
            Gabungkan PDF Lainnya
          </button>
        </div>
      </ToolContainer>
    )
  }

  return (
    <ToolContainer title="Gabungkan PDF" onBack={onBack}>
       <input
        type="file"
        multiple
        accept=".pdf"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files)}
      />
      
      {files.length === 0 && (
        <div 
            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-colors duration-300 ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropOnUploader}
        >
            <UploadIcon className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-700 font-semibold text-lg mb-2">Seret & lepas file PDF Anda di sini</p>
            <p className="text-gray-500 mb-4">atau</p>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
            Pilih File
            </button>
        </div>
      )}
      
      {files.length > 0 && (
        <>
            <div className="mb-6 flex justify-center">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                Tambah File Lain
                </button>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">File yang akan digabungkan ({files.length}):</h3>
                <p className="text-sm text-gray-500 mb-4">Seret dan lepas untuk mengatur urutan file.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 transition-all duration-300">
                    {files.map(({ id, file, buffer }, index) => (
                    <div
                        key={id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragLeave={handleDragLeaveList}
                        onDragEnd={handleDropOnList}
                        onDragOver={(e) => e.preventDefault()}
                        className={`bg-gray-50 p-2 rounded-lg flex flex-col gap-2 cursor-grab active:cursor-grabbing border border-gray-200 hover:border-blue-500 transition-all duration-300 list-item-enter-active shadow-sm ${dragging && draggedItemIndex.current === index ? 'dragging-item' : ''}`}
                    >
                        <div className="flex items-center justify-between text-xs">
                        <span className="bg-white text-gray-600 border border-gray-200 font-bold rounded-full w-6 h-6 flex items-center justify-center">{index + 1}</span>
                        <button onClick={() => removeFile(index)} className="p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                            <TrashIcon />
                        </button>
                        </div>
                        <PdfPreview buffer={buffer} />
                        <div className="text-center">
                        <p className="text-gray-700 truncate text-xs font-medium" title={file.name}>{file.name}</p>
                        <p className="text-gray-500 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                    </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 flex flex-col items-center">
                <button 
                    onClick={handleMerge}
                    disabled={isMerging || files.length < 2}
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg flex items-center justify-center shadow-md"
                >
                {isMerging ? (
                    <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menggabungkan...
                    </>
                ) : `Gabungkan ${files.length} PDF`}
                </button>
                {files.length < 2 && <p className="text-sm text-gray-500 mt-3">Silakan tambahkan setidaknya 2 file untuk digabungkan.</p>}
            </div>
        </>
      )}
    </ToolContainer>
  );
};

export default MergePdf;
