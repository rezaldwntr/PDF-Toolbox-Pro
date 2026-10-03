import React, { useState, useRef, useCallback, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
import { PDFDocument } from 'pdf-lib';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import {
  Type,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import {
  TextPropertiesPanel,
  TextBox,
  FontFamily,
  TextAlignment,
} from './text/TextPropertiesPanel';
import {
  getCssFontFamily,
  renderTextBoxesToPdf,
} from './text/PdfFontEmbedder';
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

export type { TextBox, FontFamily, TextAlignment };

const AddText: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [fileWithBuffer, setFileWithBuffer] = useState<PdfFileWithBuffer | null>(null);
  const [pagePreviews, setPagePreviews] = useState<PagePreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(1);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);

  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [zoom, setZoom] = useState(0.85);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && fileWithBuffer && textBoxes.length > 0 && !isProcessing && !outputUrl) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fileWithBuffer, textBoxes, isProcessing, outputUrl]);

  const resetState = useCallback(() => {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setFileWithBuffer(null);
    setPagePreviews([]);
    setIsProcessing(false);
    setTextBoxes([]);
    setSelectedBoxId(null);
    setEditingBoxId(null);
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

  const addTextBox = (targetPage?: number, customX?: number, customY?: number) => {
    if (pagePreviews.length === 0) return;
    const pageIdx = targetPage !== undefined ? targetPage : activePageIndex;
    const page = pagePreviews[pageIdx];
    const newId = `box-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const posX = customX !== undefined ? Math.max(10, Math.min(customX, page.width - 150)) : page.width / 2 - 75;
    const posY = customY !== undefined ? Math.max(10, Math.min(customY, page.height - 50)) : page.height / 3;

    const newBox: TextBox = {
      id: newId,
      text: 'Ketik teks di sini',
      x: Math.round(posX),
      y: Math.round(posY),
      pageIndex: pageIdx,
      fontSize: 20,
      fontFamily: 'Helvetica',
      color: '#000000',
      isBold: false,
      isItalic: false,
      align: 'left',
      opacity: 1.0,
      backgroundColor: undefined,
    };

    setTextBoxes((prev) => [...prev, newBox]);
    setSelectedBoxId(newId);
    setEditingBoxId(newId);
  };

  const updateTextBox = (id: string, updates: Partial<TextBox>) => {
    setTextBoxes((prev) => prev.map((box) => (box.id === id ? { ...box, ...updates } : box)));
  };

  const duplicateTextBox = (id: string) => {
    const box = textBoxes.find((b) => b.id === id);
    if (!box) return;
    const newId = `box-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newBox: TextBox = { ...box, id: newId, x: box.x + 20, y: box.y + 20 };
    setTextBoxes((prev) => [...prev, newBox]);
    setSelectedBoxId(newId);
  };

  const deleteTextBox = (id: string) => {
    setTextBoxes((prev) => prev.filter((box) => box.id !== id));
    if (selectedBoxId === id) setSelectedBoxId(null);
    if (editingBoxId === id) setEditingBoxId(null);
  };

  const handleBoxPointerDown = (e: React.PointerEvent, id: string) => {
    if (editingBoxId === id) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedBoxId(id);
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setDragState({
      id,
      offsetX: (e.clientX - rect.left) / zoom,
      offsetY: (e.clientY - rect.top) / zoom,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      setTextBoxes((prev) =>
        prev.map((box) => {
          if (box.id === dragState.id) {
            const pageEl = document.querySelector(`[data-page-index="${box.pageIndex}"]`) as HTMLElement;
            if (!pageEl) return box;
            const pageRect = pageEl.getBoundingClientRect();
            const preview = pagePreviews[box.pageIndex];

            let newX = (e.clientX - pageRect.left) / zoom - dragState.offsetX;
            let newY = (e.clientY - pageRect.top) / zoom - dragState.offsetY;

            newX = Math.max(0, Math.min(newX, preview.width - 40));
            newY = Math.max(0, Math.min(newY, preview.height - 20));

            return { ...box, x: Math.round(newX), y: Math.round(newY) };
          }
          return box;
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

  const handleSave = async () => {
    if (!fileWithBuffer || textBoxes.length === 0 || !checkQuotaBeforeAction()) {
      addToast('Tambahkan setidaknya satu teks sebelum menyimpan.', 'warning');
      return;
    }

    setIsProcessing(true);
    setProcessingStep(1);

    try {
      setProcessingStep(2);
      const pdfDoc = await PDFDocument.load(fileWithBuffer.buffer.slice(0));
      await renderTextBoxesToPdf(pdfDoc, textBoxes, pagePreviews);

      setProcessingStep(3);
      const finalPdfBytes = await pdfDoc.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      setOutputSize(blob.size);
      setOutputUrl(URL.createObjectURL(blob));
      consumeQuota();
      addToast('PDF berhasil diperbarui dengan teks baru!', 'success');
    } catch {
      addToast('Gagal menyematkan teks ke berkas PDF.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPage = pagePreviews[activePageIndex];
  const selectedBox = textBoxes.find((b) => b.id === selectedBoxId);

  return (
    <ToolContainer
      title="Tambahkan Teks ke PDF"
      description="Ketik dan tempatkan teks bebas, catatan, atau anotasi langsung ke lembar PDF dengan kontrol tipografi penuh."
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

            {/* Document Paper Preview with Text Boxes Overlay */}
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

              {/* Placed Text Boxes */}
              {textBoxes
                .filter((b) => b.pageIndex === activePageIndex)
                .map((box) => {
                  const isSelected = selectedBoxId === box.id;
                  const isEditing = editingBoxId === box.id;

                  return (
                    <div
                      key={box.id}
                      data-textbox="true"
                      onPointerDown={(e) => handleBoxPointerDown(e, box.id)}
                      onDoubleClick={() => setEditingBoxId(box.id)}
                      style={{
                        left: `${box.x * zoom}px`,
                        top: `${box.y * zoom}px`,
                        fontFamily: getCssFontFamily(box.fontFamily),
                        fontSize: `${box.fontSize * zoom}px`,
                        color: box.color,
                        fontWeight: box.isBold ? 'bold' : 'normal',
                        fontStyle: box.isItalic ? 'italic' : 'normal',
                        textAlign: box.align,
                        opacity: box.opacity ?? 1.0,
                        backgroundColor: box.backgroundColor || 'transparent',
                      }}
                      className={`absolute cursor-move touch-none px-2 py-1 rounded transition-shadow ${
                        isSelected ? 'border-2 border-accent-primary ring-2 ring-accent-primary/20 shadow-md' : 'border border-dashed border-accent-primary/60 hover:border-accent-primary'
                      }`}
                    >
                      {isEditing ? (
                        <textarea
                          autoFocus
                          value={box.text}
                          onChange={(e) => updateTextBox(box.id, { text: e.target.value })}
                          onBlur={() => setEditingBoxId(null)}
                          className="bg-transparent border-none outline-none resize-none p-0 m-0 w-full"
                          rows={box.text.split('\n').length || 1}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap select-none">{box.text}</div>
                      )}

                      {/* Floating actions for selected text */}
                      {isSelected && !isEditing && (
                        <div className="absolute -top-7 right-0 flex items-center gap-1 bg-surface border border-border-subtle rounded-lg p-0.5 shadow-md">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateTextBox(box.id);
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
                              deleteTextBox(box.id);
                            }}
                            className="p-1 hover:bg-rose-50 text-text-muted hover:text-rose-500 rounded"
                            title="Hapus"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
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
          <TextPropertiesPanel
            selectedBox={selectedBox || null}
            onUpdateBox={(updates) => {
              if (selectedBoxId) updateTextBox(selectedBoxId, updates);
            }}
            onAddTextBox={() => addTextBox(activePageIndex)}
            onDeleteBox={() => {
              if (selectedBoxId) deleteTextBox(selectedBoxId);
            }}
            activePageIndex={activePageIndex}
            totalPages={pagePreviews.length}
          />
        ) : undefined
      }
      floatingBarSlot={
        fileWithBuffer ? (
          <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
              <Type className="w-4 h-4 text-accent-primary" />
              <span>{textBoxes.length} Kotak Teks Ditambahkan</span>
            </div>
            <button
              onClick={() => handleSave()}
              disabled={isProcessing || textBoxes.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-accent-primary hover:bg-accent-hover disabled:bg-canvas disabled:text-text-muted text-accent-contrast font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Type className="w-4 h-4" />
              <span>Simpan Dokumen Bertulisan</span>
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
            title="Pilih Berkas PDF untuk Ditambahkan Teks"
            subtitle="Unggah dokumen PDF untuk mengetikkan teks, catatan, atau menambahkan paragraf baru"
          />
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="max-w-md mx-auto py-12">
          <ProcessingStepper
            currentStep={processingStep}
            steps={[
              { label: 'Mengunduh & Memuat Font Glyphs Dokumen' },
              { label: 'Menyematkan Blok Teks ke Koordinat PDF (RAM)' },
              { label: 'Menyusun File PDF Baru dengan Teks Vektor' },
            ]}
          />
        </div>
      )}

      {/* Result State */}
      {outputUrl && fileWithBuffer && (
        <div className="max-w-lg mx-auto py-8">
          <DownloadResultCard
            fileName={`${fileWithBuffer.file.name.replace(/\.pdf$/i, '')}-edited.pdf`}
            originalSize={fileWithBuffer.file.size}
            resultSize={outputSize || fileWithBuffer.file.size}
            onDownload={() =>
              triggerFileDownload(
                outputUrl,
                `${fileWithBuffer.file.name.replace(/\.pdf$/i, '')}-edited.pdf`
              )
            }
            onReset={resetState}
            resetLabel="Tambah Teks ke Berkas Lain"
            successTitle="Teks Berhasil Disematkan!"
            successDescription="Semua kotak teks dan gaya tipografi telah disimpan secara permanen ke dokumen PDF Anda."
            resultUrl={outputUrl}
          />
        </div>
      )}
    </ToolContainer>
  );
};

export default AddText;
