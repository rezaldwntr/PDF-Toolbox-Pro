
import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, CheckCircleIcon, TrashIcon, RotateIcon, AddIcon, DuplicateIcon } from '../icons';
import { PDFDocument, degrees } from 'pdf-lib';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import FileUploader from '../common/FileUploader';

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

interface DragInfo {
  index: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  cardWidth: number;
  cardHeight: number;
}

const OrganizePdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [filesWithBuffer, setFilesWithBuffer] = useState<PdfFileWithBuffer[]>([]);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const { quota, consumeQuota, checkQuotaBeforeAction, setShowLimitModal } = useQuota();

  // Pointer-based tactile drag and drop state (Opaque, zero ghosting)
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);

  const dragInfoRef = useRef<DragInfo | null>(null);
  const isDraggingRef = useRef(false);
  const targetIndexRef = useRef<number | null>(null);
  const floatingCardRef = useRef<HTMLDivElement>(null);

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
    setProcessingMessage('Membaca file dan merender pratinjau...');

    const currentFileCount = filesWithBuffer.length;
    
    try {
        const newPages: PageInfo[] = [];
        const newFilesWithBuffer: PdfFileWithBuffer[] = [];

        for(let i = 0; i < newFiles.length; i++) {
            const file = newFiles[i];
            const fileIndex = currentFileCount + i;
            setProcessingMessage(`Membaca ${file.name}...`);
            const arrayBuffer = await file.arrayBuffer();
            newFilesWithBuffer.push({ file, buffer: arrayBuffer });

            const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
            
            for (let j = 1; j <= pdfDoc.numPages; j++) {
                setProcessingMessage(`Memuat halaman ${j} dari ${pdfDoc.numPages} (${file.name})...`);
                const page = await pdfDoc.getPage(j);
                const viewport = page.getViewport({ scale: 1 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                const desiredWidth = 200; // Lebar tetap untuk pratinjau agar seragam
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
        addToast("Gagal memuat file PDF. Pastikan file tidak rusak.", 'error');
    } finally {
        setIsProcessing(false);
        setProcessingMessage('');
    }
  };

  // Menghapus file dan seluruh halaman yang terkait dengannya
  const handleDeleteFile = (fileIndexToDelete: number) => {
    const fileName = filesWithBuffer[fileIndexToDelete].file.name;

    // Hapus file dari state
    const newFilesWithBuffer = filesWithBuffer.filter((_, index) => index !== fileIndexToDelete);
    
    // Hapus halaman yang terkait dengan file tersebut
    const newPages = pages.filter(page => page.fileIndex !== fileIndexToDelete);

    // Indeks ulang halaman yang tersisa agar sinkron dengan array file baru
    const reIndexedPages = newPages.map(page => {
        if (page.fileIndex > fileIndexToDelete) {
            const newFileIndex = page.fileIndex - 1;
            const idParts = page.id.split('-');
            const uniquePart = idParts.length > 2 ? `-${idParts[2]}` : '';
            return {
                ...page,
                fileIndex: newFileIndex,
                id: `${newFileIndex}-${page.originalPageIndex}${uniquePart}`,
            };
        }
        return page;
    });
    
    setFilesWithBuffer(newFilesWithBuffer);
    setPages(reIndexedPages);
    addToast(`File "${fileName}" telah dihapus.`, 'info');
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

  const handleDuplicatePage = (indexToDuplicate: number) => {
    const pageToDuplicate = pages[indexToDuplicate];
    const newPage: PageInfo = {
      ...pageToDuplicate,
      id: `${pageToDuplicate.fileIndex}-${pageToDuplicate.originalPageIndex}-${Date.now()}` // Pastikan ID unik
    };
    const newPages = [...pages];
    newPages.splice(indexToDuplicate + 1, 0, newPage);
    setPages(newPages);
  };

  // --- Tactile Pointer-Based Drag and Drop Handlers (Zero OS Ghosting) ---
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, index: number) => {
    if (e.button !== 0) return;

    const cardElem = e.currentTarget;
    const rect = cardElem.getBoundingClientRect();

    const info: DragInfo = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      cardWidth: rect.width,
      cardHeight: rect.height,
    };

    dragInfoRef.current = info;
    isDraggingRef.current = false;
    targetIndexRef.current = index;

    const handlePointerMove = (ev: PointerEvent) => {
      if (!dragInfoRef.current) return;

      const dx = ev.clientX - dragInfoRef.current.startX;
      const dy = ev.clientY - dragInfoRef.current.startY;

      if (!isDraggingRef.current) {
        if (Math.hypot(dx, dy) > 5) {
          isDraggingRef.current = true;
          setIsDragging(true);
          setDragInfo(dragInfoRef.current);
          document.body.style.userSelect = 'none';
        }
      }

      if (isDraggingRef.current) {
        if (floatingCardRef.current) {
          const posX = ev.clientX - dragInfoRef.current.offsetX;
          const posY = ev.clientY - dragInfoRef.current.offsetY;
          floatingCardRef.current.style.transform = `translate3d(${posX}px, ${posY}px, 0) scale(1.06) rotate(2.5deg)`;
        }

        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const card = el?.closest('[data-drag-index]');
        if (card) {
          const hoverIdx = parseInt(card.getAttribute('data-drag-index') || '', 10);
          if (!isNaN(hoverIdx) && hoverIdx !== targetIndexRef.current) {
            targetIndexRef.current = hoverIdx;
            setTargetIndex(hoverIdx);
          }
        }
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.userSelect = '';

      if (isDraggingRef.current && dragInfoRef.current) {
        const fromIdx = dragInfoRef.current.index;
        const toIdx = targetIndexRef.current;

        if (toIdx !== null && toIdx !== undefined && toIdx !== fromIdx) {
          setPages(prevPages => {
            const newPages = [...prevPages];
            const [moved] = newPages.splice(fromIdx, 1);
            newPages.splice(toIdx, 0, moved);
            return newPages;
          });
        }
      }

      dragInfoRef.current = null;
      isDraggingRef.current = false;
      targetIndexRef.current = null;
      setIsDragging(false);
      setDragInfo(null);
      setTargetIndex(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Menyimpan hasil akhir PDF
  const handleSave = async () => {
    if (filesWithBuffer.length === 0 || pages.length === 0) return;

    if (!checkQuotaBeforeAction()) {
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Menyusun PDF...');

    try {
        // Muat semua dokumen sumber
        const sourcePdfDocs = await Promise.all(
            filesWithBuffer.map(({ buffer }) => PDFDocument.load(buffer.slice(0)))
        );
        const newPdfDoc = await PDFDocument.create();

        setProcessingMessage('Menyalin dan mengatur halaman...');
        for (const pageInfo of pages) {
            const sourceDoc = sourcePdfDocs[pageInfo.fileIndex];
            const [copiedPage] = await newPdfDoc.copyPages(sourceDoc, [pageInfo.originalPageIndex]);
            
            // Terapkan rotasi tambahan (relatif terhadap rotasi asli)
            const originalPage = sourceDoc.getPage(pageInfo.originalPageIndex);
            const originalRotation = originalPage.getRotation().angle;
            copiedPage.setRotation(degrees(originalRotation + pageInfo.rotation));
            
            newPdfDoc.addPage(copiedPage);
        }

        const finalPdfBytes = await newPdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        setOutputUrl(URL.createObjectURL(blob));
        consumeQuota();
        addToast('PDF berhasil diatur!', 'success');

    } catch (error) {
        console.error("Gagal menyimpan PDF:", error);
        addToast("Terjadi kesalahan saat menyimpan PDF.", 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const renderContent = () => {
    // ... UI Rendering Code ...
    if (outputUrl) {
      return (
        <div className="text-center text-gray-600 dark:text-gray-300 flex flex-col items-center gap-6 animate-fade-in">
          <CheckCircleIcon />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">PDF Berhasil Diatur!</h3>
          <p className="text-lg">File Anda telah berhasil disusun ulang.</p>
          <a href={outputUrl} download={`${filesWithBuffer[0]?.file.name.replace('.pdf', '') || 'dokumen'}-diatur.pdf`} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg shadow-md shadow-blue-200 dark:shadow-none">
            <DownloadIcon /> Unduh PDF
          </a>
          <button onClick={resetState} className="font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
            Atur PDF Lainnya
          </button>
        </div>
      );
    }

    if (isProcessing && pages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="text-lg text-gray-800 dark:text-gray-200 font-semibold">{processingMessage}</p>
        </div>
      );
    }

    if (filesWithBuffer.length === 0) {
      return (
        <FileUploader 
            onFileSelect={handleAddFiles} 
            multiple={true}
            label="Pilih PDF untuk Diatur"
            description="Seret satu atau lebih file PDF untuk mulai mengatur halaman"
        />
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 flex-wrap gap-4 shadow-sm transition-colors">
            <div className="text-gray-700 dark:text-gray-300">
                <p className="font-semibold">{filesWithBuffer.length} file dimuat, {pages.length} total halaman</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Seret halaman untuk mengurutkan</p>
            </div>
            <div className="flex items-center gap-2">
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2 border border-gray-300 dark:border-slate-600"
                >
                    <AddIcon className="w-5 h-5"/>
                    Tambah PDF
                </button>
                <button onClick={handleSave} disabled={pages.length === 0 || isProcessing} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm relative shadow-sm">
                    {isProcessing && <span className="absolute left-2 top-1/2 -translate-y-1/2"><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></span>}
                    {isProcessing ? 'Memproses...' : 'Simpan Perubahan'}
                </button>
            </div>
        </div>

        {/* List file yang dimuat */}
        <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">File yang Dimuat</h3>
            <ul className="space-y-2 max-h-48 overflow-y-auto bg-gray-100 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700 shadow-inner transition-colors">
                {filesWithBuffer.map((fileData, index) => (
                    <li key={`${fileData.file.name}-${index}`} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-md text-sm animate-fade-in border border-gray-200 dark:border-slate-600">
                    <span className="text-gray-700 dark:text-gray-300 truncate" title={fileData.file.name}>
                        {fileData.file.name}
                    </span>
                    <button 
                        onClick={() => handleDeleteFile(index)} 
                        className="p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors flex-shrink-0 ml-2"
                        title={`Hapus ${fileData.file.name}`}
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                    </li>
                ))}
            </ul>
        </div>
        
        {/* Grid Halaman */}
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
            
            const isBeingDragged = isDragging && dragInfo?.index === index;
            const isDragOver = isDragging && targetIndex === index && dragInfo?.index !== index;

            if (isBeingDragged) {
              return (
                <div 
                  key={page.id}
                  data-drag-index={index}
                  style={{
                    width: isSideways ? page.height + 20 : page.width + 20,
                    height: isSideways ? page.width + 50 : page.height + 50,
                  }}
                  className="relative p-2.5 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-blue-400 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-500 dark:text-blue-400 select-none transition-all"
                >
                  <span className="text-xs font-bold">Halaman {index + 1}</span>
                  <span className="text-[10px] opacity-75 mt-0.5">Sedang dipindah</span>
                </div>
              );
            }

            return (
              <div 
                key={page.id}
                data-drag-index={index}
                onPointerDown={(e) => handlePointerDown(e, index)}
                className={`drag-card relative group bg-white dark:bg-slate-800 p-2.5 rounded-xl flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing border shadow-sm select-none ${
                  isDragOver 
                    ? 'drag-target-indicator' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md'
                }`}
              >
                <div className="absolute top-1 right-1 z-10 p-1 flex-col items-center justify-center gap-1.5 bg-white/95 dark:bg-slate-700/95 backdrop-blur-sm rounded-lg hidden group-hover:flex border border-slate-200 dark:border-slate-600 shadow-md">
                  <button 
                    title="Duplikat Halaman" 
                    onPointerDown={(e) => e.stopPropagation()} 
                    onClick={(e) => { e.stopPropagation(); handleDuplicatePage(index); }} 
                    className="p-1 text-slate-500 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-full transition-colors"
                  >
                    <DuplicateIcon className="w-4 h-4"/>
                  </button>
                  <button 
                    title="Putar Kanan" 
                    onPointerDown={(e) => e.stopPropagation()} 
                    onClick={(e) => { e.stopPropagation(); handleRotatePage(page.id); }} 
                    className="p-1 text-slate-500 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-full transition-colors"
                  >
                    <RotateIcon className="w-4 h-4"/>
                  </button>
                  <button 
                    title="Hapus Halaman" 
                    onPointerDown={(e) => e.stopPropagation()} 
                    onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id); }} 
                    className="p-1 text-slate-500 hover:text-red-500 dark:text-slate-300 dark:hover:text-red-400 rounded-full transition-colors"
                  >
                    <TrashIcon className="w-4 h-4"/>
                  </button>
                </div>
                <div style={imageContainerStyle}>
                    <img 
                        src={page.previewUrl} 
                        alt={`Page ${page.originalPageIndex + 1}`} 
                        className="rounded-md shadow-xs border border-slate-200 dark:border-slate-600 pointer-events-none"
                        style={imageStyle}
                    />
                </div>
                <span className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-xs">{index + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Floating Lifted Card (100% Solid Opaque, Crisp, Beautiful Elevation - No Ghost!) */}
        {isDragging && dragInfo && createPortal(
          (() => {
            const draggedPage = pages[dragInfo.index];
            if (!draggedPage) return null;

            const isSideways = draggedPage.rotation === 90 || draggedPage.rotation === 270;
            const imgContainerStyle: React.CSSProperties = {
              width: isSideways ? draggedPage.height : draggedPage.width,
              height: isSideways ? draggedPage.width : draggedPage.height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            };
            const imgStyle: React.CSSProperties = {
              transform: `rotate(${draggedPage.rotation}deg)`,
              width: draggedPage.width,
              height: draggedPage.height,
              maxWidth: 'none',
            };

            return (
              <div
                ref={floatingCardRef}
                className="drag-floating-card bg-white dark:bg-slate-800 p-2.5 rounded-xl flex flex-col items-center gap-2 border-2 border-blue-500 ring-4 ring-blue-500/20 select-none shadow-2xl"
                style={{
                  width: dragInfo.cardWidth,
                  height: dragInfo.cardHeight,
                  transform: `translate3d(${dragInfo.startX - dragInfo.offsetX}px, ${dragInfo.startY - dragInfo.offsetY}px, 0) scale(1.06) rotate(2.5deg)`,
                }}
              >
                <div style={imgContainerStyle}>
                  <img
                    src={draggedPage.previewUrl}
                    alt={`Page ${draggedPage.originalPageIndex + 1}`}
                    className="rounded-md shadow-xs border border-slate-200 dark:border-slate-600 pointer-events-none"
                    style={imgStyle}
                  />
                </div>
                <span className="bg-blue-600 text-white font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md">
                  {dragInfo.index + 1}
                </span>
              </div>
            );
          })(),
          document.body
        )}
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
