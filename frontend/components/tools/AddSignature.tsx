import React, { useState, useRef, useCallback, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
import { PDFDocument } from 'pdf-lib';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import {
  Trash2,
  Copy,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  FileSignature,
} from 'lucide-react';
import { SignatureSidebar, SignatureItem } from './signature/SignatureSidebar';
import { triggerFileDownload } from '../../lib/download';
import { formatFileSize } from '../../lib/formatters';
import { ensurePdfjsReady } from '../../lib/pdfWorker';

interface PdfFileWithBuffer {
  file: File;
  buffer: ArrayBuffer;
}

interface PagePreview {
  url: string;
  width: number;
  height: number;
}

export type { SignatureItem };

export interface PlacedSignature {
  id: string;
  signatureId: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const AddSignature: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [fileWithBuffer, setFileWithBuffer] = useState<PdfFileWithBuffer | null>(null);
  const [pagePreviews, setPagePreviews] = useState<PagePreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(1);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);

  // Galeri Tanda Tangan & Penempatan
  const [signatures, setSignatures] = useState<SignatureItem[]>([]);
  const [placedSignatures, setPlacedSignatures] = useState<PlacedSignature[]>([]);
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);

  // Navigasi & Zoom
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [zoom, setZoom] = useState(0.85);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();

  // Drag & Resize state
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [resizeState, setResizeState] = useState<{
    id: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && fileWithBuffer && placedSignatures.length > 0 && !isProcessing && !outputUrl) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fileWithBuffer, placedSignatures, isProcessing, outputUrl]);

  const resetState = useCallback(() => {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setFileWithBuffer(null);
    setPagePreviews([]);
    setIsProcessing(false);
    setSignatures([]);
    setPlacedSignatures([]);
    setSelectedPlacedId(null);
    setActivePageIndex(0);
    setZoom(0.85);
    setOutputUrl(null);
    setOutputSize(null);
  }, [outputUrl]);

  const handleFileChange = async (files: FileList | null) => {
    const selectedFile = files ? files[0] : null;
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;
    resetState();
    setIsProcessing(true);
    setProcessingStep(1);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      setFileWithBuffer({ file: selectedFile, buffer: arrayBuffer });

      const pdfjs = await ensurePdfjsReady();
      const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
      const previews: PagePreview[] = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
        previews.push({
          url: canvas.toDataURL('image/png'),
          width: viewport.width,
          height: viewport.height,
        });
      }
      setPagePreviews(previews);
      setActivePageIndex(0);
    } catch {
      addToast('Gagal memuat file PDF. Pastikan file tidak rusak.', 'error');
      resetState();
    } finally {
      setIsProcessing(false);
    }
  };

  const placeOnAllPages = (signature: SignatureItem) => {
    if (pagePreviews.length === 0) return;
    const newPlacedList: PlacedSignature[] = pagePreviews.map((page, pageIndex) => ({
      id: `placed-${Date.now()}-${pageIndex}-${Math.random().toString(36).substring(2, 6)}`,
      signatureId: signature.id,
      pageIndex,
      x: Math.round(page.width - signature.width - 30),
      y: Math.round(page.height - signature.height - 30),
      width: signature.width,
      height: signature.height,
    }));
    setPlacedSignatures((prev) => [...prev, ...newPlacedList]);
    addToast(`Tanda tangan dipasang di semua ${pagePreviews.length} halaman!`, 'success');
  };

  const placeSignatureOnPage = (signature: SignatureItem, pageIndex: number, customX?: number, customY?: number) => {
    const page = pagePreviews[pageIndex];
    if (!page) return;

    const posX = customX !== undefined ? customX : page.width / 2 - signature.width / 2;
    const posY = customY !== undefined ? customY : page.height * 0.7 - signature.height / 2;

    const newPlaced: PlacedSignature = {
      id: `placed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      signatureId: signature.id,
      pageIndex,
      x: Math.max(10, Math.min(posX, page.width - signature.width - 10)),
      y: Math.max(10, Math.min(posY, page.height - signature.height - 10)),
      width: signature.width,
      height: signature.height,
    };

    setPlacedSignatures((prev) => [...prev, newPlaced]);
    setSelectedPlacedId(newPlaced.id);
    setActivePageIndex(pageIndex);
  };

  const duplicatePlacedSignature = (id: string) => {
    const target = placedSignatures.find((p) => p.id === id);
    if (!target) return;
    const newPlaced: PlacedSignature = {
      ...target,
      id: `placed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      x: target.x + 20,
      y: target.y + 20,
    };
    setPlacedSignatures((prev) => [...prev, newPlaced]);
    setSelectedPlacedId(newPlaced.id);
  };

  const deletePlacedSignature = (id: string) => {
    setPlacedSignatures((prev) => prev.filter((p) => p.id !== id));
    if (selectedPlacedId === id) setSelectedPlacedId(null);
  };

  const handleBoxPointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPlacedId(id);
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setDragState({
      id,
      offsetX: (e.clientX - rect.left) / zoom,
      offsetY: (e.clientY - rect.top) / zoom,
    });
  };

  const handleResizePointerDown = (e: React.PointerEvent, sig: PlacedSignature) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeState({
      id: sig.id,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: sig.width,
      startHeight: sig.height,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      setPlacedSignatures((prev) =>
        prev.map((sig) => {
          if (sig.id === dragState.id) {
            const pageEl = document.querySelector(`[data-page-index="${sig.pageIndex}"]`) as HTMLElement;
            if (!pageEl) return sig;
            const pageRect = pageEl.getBoundingClientRect();
            const preview = pagePreviews[sig.pageIndex];

            let newX = (e.clientX - pageRect.left) / zoom - dragState.offsetX;
            let newY = (e.clientY - pageRect.top) / zoom - dragState.offsetY;

            newX = Math.max(0, Math.min(newX, preview.width - sig.width));
            newY = Math.max(0, Math.min(newY, preview.height - sig.height));

            return { ...sig, x: Math.round(newX), y: Math.round(newY) };
          }
          return sig;
        })
      );
    };

    const handlePointerUp = () => setDragState(null);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, zoom, pagePreviews]);

  useEffect(() => {
    if (!resizeState) return;

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      setPlacedSignatures((prev) =>
        prev.map((sig) => {
          if (sig.id === resizeState.id) {
            const dx = (e.clientX - resizeState.startX) / zoom;
            const aspectRatio = resizeState.startWidth / resizeState.startHeight;
            const newWidth = Math.max(40, Math.min(450, resizeState.startWidth + dx));
            const newHeight = Math.round(newWidth / aspectRatio);
            return { ...sig, width: newWidth, height: newHeight };
          }
          return sig;
        })
      );
    };

    const handlePointerUp = () => setResizeState(null);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resizeState, zoom]);

  const handleSave = async () => {
    if (!fileWithBuffer || placedSignatures.length === 0 || !checkQuotaBeforeAction()) {
      addToast('Tambahkan setidaknya satu tanda tangan ke halaman dokumen.', 'warning');
      return;
    }

    setIsProcessing(true);
    setProcessingStep(1);

    try {
      setProcessingStep(2);
      const pdfDoc = await PDFDocument.load(fileWithBuffer.buffer.slice(0));
      const pages = pdfDoc.getPages();
      const embeddedImagesMap = new Map<string, any>();

      for (const placed of placedSignatures) {
        if (placed.pageIndex >= pages.length) continue;
        const page = pages[placed.pageIndex];
        const preview = pagePreviews[placed.pageIndex];
        if (!preview) continue;

        const { width: pageWidth, height: pageHeight } = page.getSize();
        const scaleX = pageWidth / preview.width;
        const scaleY = pageHeight / preview.height;

        let pdfImage = embeddedImagesMap.get(placed.signatureId);
        if (!pdfImage) {
          const sig = signatures.find((s) => s.id === placed.signatureId);
          if (!sig) continue;
          const imageBytes = await fetch(sig.dataUrl).then((res) => res.arrayBuffer());
          pdfImage = sig.dataUrl.includes('image/jpeg')
            ? await pdfDoc.embedJpg(imageBytes)
            : await pdfDoc.embedPng(imageBytes);
          embeddedImagesMap.set(placed.signatureId, pdfImage);
        }

        page.drawImage(pdfImage, {
          x: placed.x * scaleX,
          y: pageHeight - placed.y * scaleY - placed.height * scaleY,
          width: placed.width * scaleX,
          height: placed.height * scaleY,
        });
      }

      setProcessingStep(3);
      const finalPdfBytes = await pdfDoc.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      setOutputSize(blob.size);
      setOutputUrl(URL.createObjectURL(blob));
      consumeQuota();
      addToast('PDF berhasil ditandatangani!', 'success');
    } catch {
      addToast('Gagal menyematkan tanda tangan ke berkas PDF.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPage = pagePreviews[activePageIndex];

  return (
    <ToolContainer
      title="Tanda Tangan & e-Meterai PDF"
      description="Bubuhkan tanda tangan basah, digital, ketikan, atau panduan e-Meterai resmi ke dokumen PDF Anda secara presisi."
      onBack={onBack}
      canvasSlot={
        fileWithBuffer && currentPage ? (
          <div className="h-full flex flex-col items-center justify-between p-6 bg-canvas overflow-y-auto">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between w-full max-w-xl mb-3">
              {/* Pagination */}
              <div className="flex items-center gap-2 bg-surface px-2.5 py-1 rounded-xl border border-border-subtle shadow-xs">
                <button
                  disabled={activePageIndex <= 0}
                  onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
                  className="p-1 hover:bg-canvas rounded disabled:opacity-30 text-text-secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-text-primary">
                  {activePageIndex + 1} / {pagePreviews.length}
                </span>
                <button
                  disabled={activePageIndex >= pagePreviews.length - 1}
                  onClick={() => setActivePageIndex((p) => Math.min(pagePreviews.length - 1, p + 1))}
                  className="p-1 hover:bg-canvas rounded disabled:opacity-30 text-text-secondary"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-xl border border-border-subtle shadow-xs">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                  className="p-1 hover:bg-canvas rounded text-text-secondary"
                  title="Perkecil"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono text-text-primary px-1">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}
                  className="p-1 hover:bg-canvas rounded text-text-secondary"
                  title="Perbesar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Paper Preview with Signatures Overlay */}
            <div
              data-page-index={activePageIndex}
              style={{
                width: `${currentPage.width * zoom}px`,
                height: `${currentPage.height * zoom}px`,
              }}
              className="relative border border-border-subtle rounded-xl shadow-lg bg-white overflow-hidden my-auto select-none"
            >
              <img
                src={currentPage.url}
                alt={`Halaman ${activePageIndex + 1}`}
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* Placed Signatures on this page */}
              {placedSignatures
                .filter((p) => p.pageIndex === activePageIndex)
                .map((placed) => {
                  const sigItem = signatures.find((s) => s.id === placed.signatureId);
                  const isSelected = selectedPlacedId === placed.id;

                  return (
                    <div
                      key={placed.id}
                      data-signature-box="true"
                      onPointerDown={(e) => handleBoxPointerDown(e, placed.id)}
                      style={{
                        left: `${placed.x * zoom}px`,
                        top: `${placed.y * zoom}px`,
                        width: `${placed.width * zoom}px`,
                        height: `${placed.height * zoom}px`,
                      }}
                      className={`absolute cursor-move touch-none group ${
                        isSelected ? 'border-2 border-accent-primary ring-2 ring-accent-primary/20' : 'border border-dashed border-accent-primary/60 hover:border-accent-primary'
                      }`}
                    >
                      {sigItem && (
                        <img
                          src={sigItem.dataUrl}
                          alt="Tanda tangan"
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      )}

                      {/* Controls on hover / select */}
                      {isSelected && (
                        <>
                          <div className="absolute -top-7 right-0 flex items-center gap-1 bg-surface border border-border-subtle rounded-lg p-0.5 shadow-md">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicatePlacedSignature(placed.id);
                              }}
                              className="p-1 hover:bg-canvas rounded text-text-muted hover:text-text-primary"
                              title="Duplikasi"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePlacedSignature(placed.id);
                              }}
                              className="p-1 hover:bg-rose-50 text-text-muted hover:text-rose-500 rounded"
                              title="Hapus"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Resize Handle */}
                          <div
                            onPointerDown={(e) => handleResizePointerDown(e, placed)}
                            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-accent-primary rounded-full cursor-se-resize border-2 border-white shadow-xs"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Bottom Info Bar */}
            <div className="mt-3 flex items-center justify-between w-full max-w-xl text-xs text-text-secondary">
              <button
                onClick={resetState}
                className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Ganti Dokumen
              </button>
              <span>{fileWithBuffer.file.name}</span>
            </div>
          </div>
        ) : undefined
      }
      inspectorSlot={
        fileWithBuffer ? (
          <SignatureSidebar
            signatures={signatures}
            setSignatures={setSignatures}
            placedSignatures={placedSignatures}
            setPlacedSignatures={setPlacedSignatures}
            activePageIndex={activePageIndex}
            setActivePageIndex={setActivePageIndex}
            pagePreviews={pagePreviews}
            onPlaceSignature={(sig) => placeSignatureOnPage(sig, activePageIndex)}
            onPlaceAllPages={placeOnAllPages}
          />
        ) : undefined
      }
      floatingBarSlot={
        fileWithBuffer ? (
          <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
              <FileSignature className="w-4 h-4 text-accent-primary" />
              <span>{placedSignatures.length} Tanda Tangan Ditempatkan</span>
            </div>
            <button
              onClick={() => handleSave()}
              disabled={isProcessing || placedSignatures.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-accent-primary hover:bg-accent-hover disabled:bg-canvas disabled:text-text-muted text-accent-contrast font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <FileSignature className="w-4 h-4" />
              <span>Simpan Dokumen Bertanda Tangan</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-accent-contrast/20 rounded text-[10px]">↵</kbd>
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Upload Phase */}
      {!fileWithBuffer && (
        <div className="max-w-2xl mx-auto space-y-6">
          <FileUploader
            onFileSelect={handleFileChange}
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={1}
            title="Pilih Berkas PDF untuk Ditandatangani"
            subtitle="Unggah dokumen PDF untuk membubuhkan tanda tangan gambar, goresan tangan, atau e-Meterai"
          />
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="max-w-md mx-auto py-12">
          <ProcessingStepper
            currentStep={processingStep}
            steps={[
              { label: 'Menyiapkan Aset Tanda Tangan & Layer' },
              { label: 'Menyematkan Gambar ke Koordinat Halaman PDF (RAM)' },
              { label: 'Menyusun & Memvalidasi Berkas PDF Bertanda Tangan' },
            ]}
          />
        </div>
      )}

      {/* Result State */}
      {outputUrl && fileWithBuffer && (
        <div className="max-w-lg mx-auto py-8">
          <DownloadResultCard
            fileName={`${fileWithBuffer.file.name.replace(/\.pdf$/i, '')}-signed.pdf`}
            originalSize={fileWithBuffer.file.size}
            resultSize={outputSize || fileWithBuffer.file.size}
            onDownload={() =>
              triggerFileDownload(
                outputUrl,
                `${fileWithBuffer.file.name.replace(/\.pdf$/i, '')}-signed.pdf`
              )
            }
            onReset={resetState}
            resetLabel="Tandatangani Berkas Lain"
            successTitle="Dokumen Berhasil Ditandatangani!"
            successDescription="Tanda tangan dan stempel Anda telah disematkan secara permanen ke lembar dokumen PDF."
            resultUrl={outputUrl}
          />
        </div>
      )}
    </ToolContainer>
  );
};

export default AddSignature;
