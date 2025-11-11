import React, { useState, useRef, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, CheckCircleIcon, TrashIcon, RotateIcon, RotateCounterClockwiseIcon } from '../icons';
import { PDFDocument, degrees } from 'pdf-lib';

declare const pdfjsLib: any;

interface PageInfo {
  id: number; // Original page index (0-based)
  previewUrl: string;
  rotation: number; // in degrees (0, 90, 180, 270)
}

const OrganizePdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs for drag and drop reordering
  const draggedItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  const resetState = useCallback(() => {
    setFile(null);
    setPages([]);
    setIsProcessing(false);
    setProcessingMessage('');
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
  }, [outputUrl]);

  const handleFileChange = async (selectedFile: File | null) => {
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;
    resetState();
    setFile(selectedFile);
    setIsProcessing(true);
    setProcessingMessage('Merender pratinjau halaman...');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      
      const previews: PageInfo[] = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        setProcessingMessage(`Memuat halaman ${i} dari ${pdfDoc.numPages}...`);
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        const desiredWidth = 200; // a fixed width for previews
        const scale = desiredWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });
        
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
        
        previews.push({
          id: i - 1, // 0-based index
          previewUrl: canvas.toDataURL('image/png'),
          rotation: 0,
        });
      }
      setPages(previews);
    } catch (error) {
      console.error("Gagal memuat PDF:", error);
      alert("Gagal memuat file PDF. Pastikan file tidak rusak.");
      resetState();
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  const handleDeletePage = (idToDelete: number) => {
    setPages(prev => prev.filter(p => p.id !== idToDelete));
  };
  
  const handleRotatePage = (idToRotate: number, direction: 'cw' | 'ccw') => {
    setPages(prev => prev.map(p => {
      if (p.id === idToRotate) {
        const newRotation = direction === 'cw'
          ? (p.rotation + 90) % 360
          : (p.rotation - 90 + 360) % 360;
        return { ...p, rotation: newRotation };
      }
      return p;
    }));
  };

  const handleDragStart = (index: number) => {
    draggedItemIndex.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItemIndex.current = index;
  };

  const handleDrop = () => {
    if (draggedItemIndex.current === null || dragOverItemIndex.current === null || draggedItemIndex.current === dragOverItemIndex.current) return;

    const newPages = [...pages];
    const draggedItem = newPages.splice(draggedItemIndex.current, 1)[0];
    newPages.splice(dragOverItemIndex.current, 0, draggedItem);
    
    setPages(newPages);
    
    draggedItemIndex.current = null;
    dragOverItemIndex.current = null;
  };

  const handleSave = async () => {
    if (!file || pages.length === 0) return;
    setIsProcessing(true);
    setProcessingMessage('Menyusun PDF...');

    try {
        const originalPdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(originalPdfBytes);
        const newPdfDoc = await PDFDocument.create();

        const pageIndicesToCopy = pages.map(p => p.id);
        const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndicesToCopy);
        
        copiedPages.forEach((copiedPage, index) => {
            const pageInfo = pages[index];
            copiedPage.setRotation(degrees(pageInfo.rotation));
            newPdfDoc.addPage(copiedPage);
        });

        const finalPdfBytes = await newPdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        setOutputUrl(URL.createObjectURL(blob));

    } catch (error) {
        console.error("Gagal menyimpan PDF:", error);
        alert("Terjadi kesalahan saat menyimpan PDF.");
    } finally {
        setIsProcessing(false);
    }
  };

  const renderContent = () => {
    if (outputUrl) {
      return (
        <div className="text-center text-slate-400 flex flex-col items-center gap-6 animate-fade-in">
          <CheckCircleIcon />
          <h3 className="text-2xl font-bold text-slate-100">PDF Berhasil Diatur!</h3>
          <p className="text-lg">File Anda telah berhasil disusun ulang.</p>
          <a href={outputUrl} download={`${file?.name.replace('.pdf', '')}-diatur.pdf`} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg">
            <DownloadIcon /> Unduh PDF
          </a>
          <button onClick={resetState} className="font-medium text-slate-400 hover:text-blue-400 transition-colors">
            Atur PDF Lainnya
          </button>
        </div>
      );
    }

    if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <svg className="animate-spin h-10 w-10 text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="text-lg text-slate-300 font-semibold">{processingMessage}</p>
        </div>
      );
    }

    if (!file) {
      return (
        <div
            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors duration-300 ${isDragOver ? 'border-blue-500 bg-slate-700/50' : 'border-slate-600 hover:border-slate-500'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileChange(e.dataTransfer.files[0]); }}
        >
            <UploadIcon className="w-12 h-12 text-slate-500 mb-4" />
            <p className="text-slate-300 font-semibold text-lg mb-2">Seret & lepas file PDF Anda di sini</p>
            <p className="text-slate-500 mb-4">atau</p>
            <button onClick={() => fileInputRef.current?.click()} className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors">
                Pilih File
            </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700">
            <div className="text-slate-300">
                <p className="font-semibold" title={file.name}>{file.name}</p>
                <p className="text-sm text-slate-400">{pages.length} halaman - Seret untuk mengurutkan</p>
            </div>
            <button onClick={handleSave} disabled={pages.length === 0} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                Simpan PDF
            </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {pages.map((page, index) => (
            <div 
              key={page.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative group bg-slate-700/50 p-2 rounded-lg flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing border border-transparent hover:border-blue-500"
            >
              <div className="absolute top-0 right-0 z-10 p-1 flex-col items-center justify-center gap-1.5 bg-slate-800/80 backdrop-blur-sm rounded-bl-lg rounded-tr-md hidden group-hover:flex">
                <button title="Putar Kiri" onClick={() => handleRotatePage(page.id, 'ccw')} className="p-1 text-slate-400 hover:text-blue-400 rounded-full transition-colors"><RotateCounterClockwiseIcon className="w-4 h-4" /></button>
                <button title="Putar Kanan" onClick={() => handleRotatePage(page.id, 'cw')} className="p-1 text-slate-400 hover:text-blue-400 rounded-full transition-colors"><RotateIcon className="w-4 h-4"/></button>
                <button title="Hapus Halaman" onClick={() => handleDeletePage(page.id)} className="p-1 text-slate-400 hover:text-red-400 rounded-full transition-colors"><TrashIcon className="w-4 h-4"/></button>
              </div>
              <img 
                src={page.previewUrl} 
                alt={`Page ${page.id + 1}`} 
                className="rounded-md shadow-md w-full transition-transform duration-300" 
                style={{ transform: `rotate(${page.rotation}deg)` }}
              />
              <span className="bg-slate-800 text-slate-300 font-bold rounded-full w-6 h-6 flex items-center justify-center text-sm">{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <ToolContainer title="Atur PDF" onBack={onBack} maxWidth="max-w-7xl">
      <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} />
      {renderContent()}
    </ToolContainer>
  );
};

export default OrganizePdf;