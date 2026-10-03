import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
import { PDFDocument, degrees } from 'pdf-lib';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import {
  RotateCw,
  Copy,
  Trash2,
  Plus,
  ArrowUpDown,
  RotateCcw,
  FileText,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { triggerFileDownload } from '../../lib/download';
import { ensurePdfjsReady } from '../../lib/pdfWorker';

interface PdfFileWithBuffer {
  file: File;
  buffer: ArrayBuffer;
}

interface PageInfo {
  id: string;
  fileIndex: number;
  originalPageIndex: number;
  previewUrl: string;
  rotation: number;
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
  const [processingStep, setProcessingStep] = useState(1);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();

  // Tactile Pointer-based drag and drop state
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);

  const dragInfoRef = useRef<DragInfo | null>(null);
  const isDraggingRef = useRef(false);
  const targetIndexRef = useRef<number | null>(null);
  const floatingCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && pages.length > 0 && !isProcessing && !outputUrl) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages, isProcessing, outputUrl]);

  const resetState = useCallback(() => {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setFilesWithBuffer([]);
    setPages([]);
    setIsProcessing(false);
    setOutputUrl(null);
    setOutputSize(null);
  }, [outputUrl]);

  const handleAddFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const newFiles = Array.from(selectedFiles).filter((f) => f.type === 'application/pdf');
    if (newFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingStep(1);

    const currentFileCount = filesWithBuffer.length;
    try {
      const pdfjs = await ensurePdfjsReady();
      const newPages: PageInfo[] = [];
      const newFilesWithBuffer: PdfFileWithBuffer[] = [];

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const fileIndex = currentFileCount + i;
        const arrayBuffer = await file.arrayBuffer();
        newFilesWithBuffer.push({ file, buffer: arrayBuffer });

        const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
        for (let j = 1; j <= pdfDoc.numPages; j++) {
          const page = await pdfDoc.getPage(j);
          const viewport = page.getViewport({ scale: 1 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          const desiredWidth = 180;
          const scale = desiredWidth / viewport.width;
          const scaledViewport = page.getViewport({ scale });

          canvas.height = scaledViewport.height;
          canvas.width = scaledViewport.width;
          await page.render({ canvasContext: context, viewport: scaledViewport }).promise;

          newPages.push({
            id: `${fileIndex}-${j - 1}-${Date.now()}-${Math.random()}`,
            fileIndex,
            originalPageIndex: j - 1,
            previewUrl: canvas.toDataURL('image/png'),
            rotation: 0,
            width: canvas.width,
            height: canvas.height,
          });
        }
      }
      setPages((prev) => [...prev, ...newPages]);
      setFilesWithBuffer((prev) => [...prev, ...newFilesWithBuffer]);
    } catch {
      addToast('Gagal memuat file PDF. Pastikan file tidak rusak atau terkunci.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteFile = (fileIndexToDelete: number) => {
    const newFilesWithBuffer = filesWithBuffer.filter((_, idx) => idx !== fileIndexToDelete);
    const newPages = pages
      .filter((p) => p.fileIndex !== fileIndexToDelete)
      .map((p) => {
        if (p.fileIndex > fileIndexToDelete) {
          return { ...p, fileIndex: p.fileIndex - 1 };
        }
        return p;
      });
    setFilesWithBuffer(newFilesWithBuffer);
    setPages(newPages);
  };

  const handleDeletePage = (idToDelete: string) => {
    setPages((prev) => prev.filter((p) => p.id !== idToDelete));
  };

  const handleRotatePage = (idToRotate: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === idToRotate ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const handleDuplicatePage = (indexToDuplicate: number) => {
    const pageToDuplicate = pages[indexToDuplicate];
    const newPage: PageInfo = {
      ...pageToDuplicate,
      id: `${pageToDuplicate.fileIndex}-${pageToDuplicate.originalPageIndex}-${Date.now()}`,
    };
    const newPages = [...pages];
    newPages.splice(indexToDuplicate + 1, 0, newPage);
    setPages(newPages);
  };

  const handleBulkRotate = () => {
    setPages((prev) => prev.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 })));
  };

  const handleReverseOrder = () => {
    setPages((prev) => [...prev].reverse());
  };

  const handleResetOrderAndRotation = () => {
    setPages((prev) =>
      [...prev]
        .sort((a, b) => (a.fileIndex !== b.fileIndex ? a.fileIndex - b.fileIndex : a.originalPageIndex - b.originalPageIndex))
        .map((p) => ({ ...p, rotation: 0 }))
    );
  };

  // Pointer-based tactile drag handlers
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

      if (!isDraggingRef.current && Math.hypot(dx, dy) > 5) {
        isDraggingRef.current = true;
        setIsDragging(true);
        setDragInfo(dragInfoRef.current);
        document.body.style.userSelect = 'none';
      }

      if (isDraggingRef.current) {
        if (floatingCardRef.current) {
          const posX = ev.clientX - dragInfoRef.current.offsetX;
          const posY = ev.clientY - dragInfoRef.current.offsetY;
          floatingCardRef.current.style.transform = `translate3d(${posX}px, ${posY}px, 0) scale(1.05) rotate(2deg)`;
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
      document.body.style.userSelect = '';

      if (isDraggingRef.current && dragInfoRef.current) {
        const fromIdx = dragInfoRef.current.index;
        const toIdx = targetIndexRef.current;
        if (toIdx !== null && toIdx !== undefined && toIdx !== fromIdx) {
          setPages((prev) => {
            const next = [...prev];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next;
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
  };

  const handleSave = async () => {
    if (filesWithBuffer.length === 0 || pages.length === 0 || !checkQuotaBeforeAction()) return;

    setIsProcessing(true);
    setProcessingStep(1);

    try {
      setProcessingStep(2);
      const sourcePdfDocs = await Promise.all(
        filesWithBuffer.map(({ buffer }) => PDFDocument.load(buffer.slice(0)))
      );
      const newPdfDoc = await PDFDocument.create();

      for (const pageInfo of pages) {
        const sourceDoc = sourcePdfDocs[pageInfo.fileIndex];
        const [copiedPage] = await newPdfDoc.copyPages(sourceDoc, [pageInfo.originalPageIndex]);
        const origRotation = sourceDoc.getPage(pageInfo.originalPageIndex).getRotation().angle;
        copiedPage.setRotation(degrees(origRotation + pageInfo.rotation));
        newPdfDoc.addPage(copiedPage);
      }

      setProcessingStep(3);
      const finalPdfBytes = await newPdfDoc.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      setOutputSize(blob.size);
      setOutputUrl(URL.createObjectURL(blob));
      consumeQuota();
      addToast('Dokumen PDF berhasil ditata ulang!', 'success');
    } catch {
      addToast('Terjadi kesalahan saat menyusun dan menyimpan PDF.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalInputSize = filesWithBuffer.reduce((acc, curr) => acc + curr.file.size, 0);

  return (
    <ToolContainer
      title="Atur Halaman PDF"
      description="Urutkan kembali, putar, gandakan, atau hapus halaman PDF dengan antarmuka seret-dan-lepas interaktif."
      onBack={onBack}
      canvasSlot={
        pages.length > 0 ? (
          <div className="h-full flex flex-col p-6 bg-canvas overflow-y-auto">
            {/* Visual Grid of Pages */}
            <div className="flex flex-wrap items-start justify-center gap-4 py-4">
              {pages.map((page, index) => {
                const isSideways = page.rotation === 90 || page.rotation === 270;
                const isBeingDragged = isDragging && dragInfo?.index === index;
                const isDragOver = isDragging && targetIndex === index && dragInfo?.index !== index;

                if (isBeingDragged) {
                  return (
                    <div
                      key={page.id}
                      data-drag-index={index}
                      style={{
                        width: isSideways ? page.height + 16 : page.width + 16,
                        height: isSideways ? page.width + 48 : page.height + 48,
                      }}
                      className="p-3 rounded-xl border-2 border-dashed border-accent-primary bg-accent-primary/10 flex flex-col items-center justify-center select-none"
                    >
                      <span className="text-xs font-bold text-accent-primary">Hal. {index + 1}</span>
                      <span className="text-[10px] text-text-muted">Sedang dipindah</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={page.id}
                    data-drag-index={index}
                    onPointerDown={(e) => handlePointerDown(e, index)}
                    className={`group relative p-2.5 rounded-xl border bg-surface flex flex-col items-center select-none cursor-grab active:cursor-grabbing transition-all ${
                      isDragOver
                        ? 'border-accent-primary ring-2 ring-accent-primary/30 scale-105'
                        : 'border-border-subtle hover:border-text-secondary shadow-xs hover:shadow'
                    }`}
                  >
                    {/* Header: Page Badge */}
                    <div className="w-full flex items-center justify-between mb-1.5 px-0.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-canvas border border-border-subtle text-text-secondary">
                        Hal. {index + 1}
                      </span>
                      {page.rotation > 0 && (
                        <span className="text-[9px] font-mono font-semibold text-accent-primary">
                          {page.rotation}°
                        </span>
                      )}
                    </div>

                    {/* Page Thumbnail with Rotation */}
                    <div
                      style={{
                        width: isSideways ? page.height : page.width,
                        height: isSideways ? page.width : page.height,
                      }}
                      className="relative overflow-hidden flex items-center justify-center bg-white rounded border border-border-subtle"
                    >
                      <img
                        src={page.previewUrl}
                        alt={`Hal ${index + 1}`}
                        style={{
                          transform: `rotate(${page.rotation}deg)`,
                          width: page.width,
                          height: page.height,
                        }}
                        className="object-contain pointer-events-none select-none transition-transform duration-200"
                      />
                    </div>

                    {/* Hover Action Bar */}
                    <div className="w-full flex items-center justify-center gap-1.5 mt-2 pt-1.5 border-t border-border-subtle">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRotatePage(page.id);
                        }}
                        title="Putar 90°"
                        className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-canvas transition-colors"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicatePage(index);
                        }}
                        title="Gandakan Halaman"
                        className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-canvas transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePage(page.id);
                        }}
                        title="Hapus Halaman"
                        className="p-1 rounded text-text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating Portal Card for smooth pointer drag */}
            {isDragging &&
              dragInfo &&
              createPortal(
                <div
                  ref={floatingCardRef}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: `${dragInfo.cardWidth}px`,
                    height: `${dragInfo.cardHeight}px`,
                    pointerEvents: 'none',
                    zIndex: 99999,
                    willChange: 'transform',
                  }}
                  className="rounded-xl border-2 border-accent-primary bg-surface shadow-2xl p-2.5 opacity-95 flex flex-col items-center justify-center"
                >
                  <span className="text-xs font-bold text-accent-primary">Halaman {dragInfo.index + 1}</span>
                </div>,
                document.body
              )}
          </div>
        ) : undefined
      }
      inspectorSlot={
        pages.length > 0 ? (
          <div className="p-5 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-1">
                Aksi Massal Halaman
              </h3>
              <p className="text-xs text-text-secondary">
                Atur seluruh halaman dokumen secara serentak.
              </p>
            </div>

            {/* Bulk Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleBulkRotate}
                className="w-full p-2.5 rounded-xl border border-border-subtle bg-canvas hover:border-accent-primary hover:text-accent-primary text-xs font-semibold text-text-primary flex items-center gap-2 transition-all"
              >
                <RotateCw className="w-4 h-4 text-accent-primary" />
                <span>Putar Semua Halaman (+90°)</span>
              </button>

              <button
                type="button"
                onClick={handleReverseOrder}
                className="w-full p-2.5 rounded-xl border border-border-subtle bg-canvas hover:border-accent-primary hover:text-accent-primary text-xs font-semibold text-text-primary flex items-center gap-2 transition-all"
              >
                <ArrowUpDown className="w-4 h-4 text-accent-primary" />
                <span>Balik Urutan Halaman (Reverse)</span>
              </button>

              <button
                type="button"
                onClick={handleResetOrderAndRotation}
                className="w-full p-2.5 rounded-xl border border-border-subtle bg-canvas hover:border-text-secondary text-xs font-semibold text-text-secondary flex items-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Rotasi & Urutan Awal</span>
              </button>
            </div>

            {/* Loaded Files Management */}
            <div className="pt-2 border-t border-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Berkas Sumber ({filesWithBuffer.length})
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={(e) => handleAddFiles(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-accent-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah PDF
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {filesWithBuffer.map((f, idx) => (
                  <div
                    key={`${f.file.name}-${idx}`}
                    className="p-2.5 rounded-xl bg-canvas border border-border-subtle flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-accent-primary shrink-0" />
                      <span className="text-text-primary font-medium truncate max-w-[170px]" title={f.file.name}>
                        {f.file.name}
                      </span>
                    </div>
                    {filesWithBuffer.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(idx)}
                        className="text-text-muted hover:text-rose-500 transition-colors p-1"
                        title="Hapus berkas ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : undefined
      }
      floatingBarSlot={
        pages.length > 0 ? (
          <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
              <Layers className="w-4 h-4 text-accent-primary" />
              <span>{pages.length} Halaman Siap Disimpan</span>
            </div>
            <button
              onClick={() => handleSave()}
              disabled={isProcessing || pages.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-accent-primary hover:bg-accent-hover disabled:bg-canvas disabled:text-text-muted text-accent-contrast font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Dokumen PDF</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-accent-contrast/20 rounded text-[10px]">↵</kbd>
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Upload Phase */}
      {filesWithBuffer.length === 0 && (
        <div className="max-w-2xl mx-auto space-y-6">
          <FileUploader
            onFileSelect={handleAddFiles}
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={10}
            title="Pilih Satu atau Beberapa Berkas PDF"
            subtitle="Unggah dokumen PDF untuk mulai mengatur urutan, memutar, atau menyortir halaman"
          />
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="max-w-md mx-auto py-12">
          <ProcessingStepper
            currentStep={processingStep}
            steps={[
              { label: 'Menyiapkan Struktur Halaman & Rotasi Dokumen' },
              { label: 'Menyusun Ulang Halaman di Memori Lokal (pdf-lib)' },
              { label: 'Menyimpan & Memvalidasi File PDF Baru' },
            ]}
          />
        </div>
      )}

      {/* Result State */}
      {outputUrl && (
        <div className="max-w-lg mx-auto py-8">
          <DownloadResultCard
            fileName={`${filesWithBuffer[0]?.file.name.replace(/\.pdf$/i, '') || 'dokumen'}-diatur.pdf`}
            originalSize={totalInputSize}
            resultSize={outputSize || totalInputSize}
            onDownload={() =>
              triggerFileDownload(
                outputUrl,
                `${filesWithBuffer[0]?.file.name.replace(/\.pdf$/i, '') || 'dokumen'}-diatur.pdf`
              )
            }
            onReset={resetState}
            resetLabel="Atur Dokumen Lain"
            successTitle="PDF Berhasil Ditata Ulang!"
            successDescription="Semua urutan halaman, duplikasi, dan rotasi telah diterapkan ke berkas PDF baru."
            resultUrl={outputUrl}
          />
        </div>
      )}
    </ToolContainer>
  );
};

export default OrganizePdf;
