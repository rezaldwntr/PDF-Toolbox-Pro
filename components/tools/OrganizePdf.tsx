import React, { useState, useRef, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, CheckCircleIcon, TrashIcon, RotateIcon, AddIcon } from '../icons';
import { PDFDocument, degrees } from 'pdf-lib';

declare const pdfjsLib: any;

interface PdfFileWithBuffer {
  file: File;
  buffer: ArrayBuffer;
}

interface PageInfo {
  id: string; // Unique ID, e.g., `${fileIndex}-${originalPageIndex}`
  fileIndex: number;
  originalPageIndex: number;
  previewUrl: string;
  rotation: number; // in degrees (0, 90, 180, 270)
  width: number;
  height: number;
}

const OrganizePdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [filesWithBuffer, setFilesWithBuffer] = useState<PdfFileWithBuffer[]>([]);
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
    setFilesWithBuffer([]);
    setPages([]);
    setIsProcessing(false);
    setProcessingMessage('');
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
  }, [outputUrl]);

  const handleAddFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    const newFiles = Array.from(selectedFiles).filter(file => file.type === 'application/pdf');
    if (newFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingMessage('Merender pratinjau halaman...');

    const currentFileCount = filesWithBuffer.length;
    
    try {
        const newPages: PageInfo[] = [];
        const newFilesWithBuffer: PdfFileWithBuffer[] = [];

        for(let i = 0; i < newFiles.length; i++) {
            const file = newFiles[i];
            const fileIndex = currentFileCount + i;

            const arrayBuffer = await file.arrayBuffer();
            newFilesWithBuffer.push({ file, buffer: arrayBuffer });

            const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
            
            for (let j = 1; j <= pdfDoc.numPages; j++) {
                setProcessingMessage(`Memuat halaman ${j} dari ${pdfDoc.numPages} (${file.name})...`);
                const page = await pdfDoc.getPage(j);
                const viewport = page.getViewport({ scale: 1 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                const desiredWidth = 200; // a fixed width for previews
                const scale = desiredWidth / viewport.width;
                const scaledViewport = page.getViewport({ scale });
                
                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;

                await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
                
                newPages.push({
                  id: `${fileIndex}-${j - 1}`, // 0-based index
                  fileIndex,
                  originalPageIndex: j - 1,
                  previewUrl: canvas.toDataURL('image/png'),
                  rotation: 0,
                  width: canvas.width,
                  height: canvas.height,
                });
            }
        }
        setPages(prev => [...prev, ...newPages]);
        setFilesWithBuffer(prev => [...prev, ...newFilesWithBuffer]);
    } catch (error) {
        console.error("Gagal memuat PDF:", error);
        alert("Gagal memuat file PDF. Pastikan file tidak rusak.");
        // We don't call resetState here to preserve already loaded files/pages
    } finally {
        setIsProcessing(false);
        setProcessingMessage('');
    }
  };

  const handleDeletePage = (idToDelete: string) => {
    setPages(prev => prev.filter(p => p.id !== idToDelete));
  };
  
  const handleRotatePage = (idToRotate: string) => {
    setPages(prev => prev.map(p => {
      if (p.id === idToRotate) {
        const newRotation = (p.rotation + 90) % 360;
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
    if (filesWithBuffer.length === 0 || pages.length === 0) return;
    setIsProcessing(true);
    setProcessingMessage('Menyusun PDF...');

    try {
        const sourcePdfDocs = await Promise.all(
            filesWithBuffer.map(({ buffer }) => PDFDocument.load(buffer))
        );
        const newPdfDoc = await PDFDocument.create();

        setProcessingMessage('Menyalin dan mengatur halaman...');
        for (const pageInfo of pages) {
            const sourceDoc = sourcePdfDocs[pageInfo.fileIndex];
            const [copiedPage] = await newPdfDoc.copyPages(sourceDoc, [pageInfo.originalPageIndex]);
            
            const originalPage = sourceDoc.getPage(pageInfo.originalPageIndex);
            const originalRotation = originalPage.getRotation().angle;
            copiedPage.setRotation(degrees(originalRotation + pageInfo.rotation));
            
            newPdfDoc.addPage(copiedPage);
        }

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
          <a href={outputUrl} download={`${filesWithBuffer[0]?.file.name.replace('.pdf', '') || 'dokumen'}-diatur.pdf`} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg">
            <DownloadIcon /> Unduh PDF
          </a>
          <button onClick={resetState} className="font-medium text-slate-400 hover:text-blue-400 transition-colors">
            Atur PDF Lainnya
          </button>
        </div>
      );
    }

    if (isProcessing && pages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <svg className="animate-spin h-10 w-10 text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="text-lg text-slate-300 font-semibold">{processingMessage}</p>
        </div>
      );
    }

    if (filesWithBuffer.length === 0) {
      return (
        <div
            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors duration-300 ${isDragOver ? 'border-blue-500 bg-slate-700/50' : 'border-slate-600 hover:border-slate-500'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleAddFiles(e.dataTransfer.files); }}
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
        <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex-wrap gap-4">
            <div className="text-slate-300">
                <p className="font-semibold">{filesWithBuffer.length} file dimuat</p>
                <p className="text-sm text-slate-400">{pages.length} halaman - Seret untuk mengurutkan</p>
            </div>
            <div className="flex items-center gap-2">
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2"
                >
                    <AddIcon className="w-5 h-5"/>
                    Tambah PDF
                </button>
                <button onClick={handleSave} disabled={pages.length === 0 || isProcessing} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm relative">
                    {isProcessing && <span className="absolute left-2 top-1/2 -translate-y-1/2"><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></span>}
                    {isProcessing ? 'Memproses...' : 'Simpan Perubahan'}
                </button>
            </div>
        </div>
        <div className="flex flex-wrap items-start justify-center gap-4">
          {pages.map((page, index) => {
            const isSideways = page.rotation === 90 || page.rotation === 270;

            const imageContainerStyle: React.CSSProperties = {
              width: isSideways ? page.height : page.width,
              height: isSideways ? page.width : page.height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'width 0.3s ease-in-out, height 0.3s ease-in-out',
            };

            const imageStyle: React.CSSProperties = {
              transform: `rotate(${page.rotation}deg)`,
              width: page.width,
              height: page.height,
              maxWidth: 'none',
              transition: 'transform 0.3s ease-in-out',
            };
            
            return (
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
                  <button title="Putar Kanan" onClick={() => handleRotatePage(page.id)} className="p-1 text-slate-400 hover:text-blue-400 rounded-full transition-colors"><RotateIcon className="w-4 h-4"/></button>
                  <button title="Hapus Halaman" onClick={() => handleDeletePage(page.id)} className="p-1 text-slate-400 hover:text-red-400 rounded-full transition-colors"><TrashIcon className="w-4 h-4"/></button>
                </div>
                <div style={imageContainerStyle}>
                    <img 
                        src={page.previewUrl} 
                        alt={`Page ${page.originalPageIndex + 1}`} 
                        className="rounded-md shadow-md"
                        style={imageStyle}
                    />
                </div>
                <span className="bg-slate-800 text-slate-300 font-bold rounded-full w-6 h-6 flex items-center justify-center text-sm">{index + 1}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <ToolContainer title="Atur & Gabungkan PDF" onBack={onBack} maxWidth="max-w-7xl">
      <input type="file" multiple accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleAddFiles(e.target.files)} />
      {renderContent()}
    </ToolContainer>
  );
};

export default OrganizePdf;