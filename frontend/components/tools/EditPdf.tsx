import React, { useState, useRef, useEffect, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
import EditInspector from './edit/EditInspector';
import {
  EditMode,
  PageSelection,
  TextBlockItem,
  PendingEdit,
} from './edit/EditTypes';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';
import {
  Edit3,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { triggerFileDownload } from '../../lib/download';
import { loadPdfDocument } from '../../lib/pdfWorker';

const EditPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [viewportScale, setViewportScale] = useState<number>(1);

  // Mode Tab: Cari & Ganti vs Sunting Visual
  const [editMode, setEditMode] = useState<EditMode>('find_replace');

  // State Mode 1: Cari & Ganti
  const [searchText, setSearchText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [pageSelection, setPageSelection] = useState<PageSelection>('all');
  const [customPages, setCustomPages] = useState<string>('');
  const [foundMatchesCount, setFoundMatchesCount] = useState<number>(0);

  // State Mode 2: Sunting Visual
  const [textBlocks, setTextBlocks] = useState<TextBlockItem[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<TextBlockItem | null>(null);
  const [activeNewText, setActiveNewText] = useState<string>('');
  const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([]);

  // State Pemrosesan & Hasil
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(1);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && file && !isProcessing && !resultUrl) {
        if (editMode === 'find_replace' && !searchText.trim()) return;
        if (editMode === 'block_edits' && pendingEdits.length === 0) return;
        e.preventDefault();
        handleExecuteEdit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isProcessing, resultUrl, editMode, searchText, pendingEdits]);

  const handlePdfSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      addToast('Harap pilih berkas berekstensi .PDF', 'error');
      return;
    }

    setFile(selected);
    setResultUrl(null);
    setResultSize(null);
    setCurrentPage(1);
    setPendingEdits([]);
    setSelectedBlock(null);

    try {
      const buffer = await selected.arrayBuffer();
      const loadedDoc = await loadPdfDocument(buffer);
      setPdfDoc(loadedDoc);
      setTotalPages(loadedDoc.numPages);
    } catch {
      addToast('Gagal membaca struktur berkas PDF.', 'error');
    }
  };

  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        if (renderTaskRef.current) renderTaskRef.current.cancel();

        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const containerWidth = Math.min(canvas.parentElement?.clientWidth || 450, 480);
        const scale = containerWidth / unscaledViewport.width;
        setViewportScale(scale);
        const viewport = page.getViewport({ scale });

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        ctx.scale(dpr, dpr);
        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;

        setCanvasDimensions({ width: viewport.width, height: viewport.height });

        // Ekstraksi teks block untuk visual edit
        try {
          const textContent = await page.getTextContent();
          const blocks: TextBlockItem[] = textContent.items
            .filter((item: any) => item.str && item.str.trim().length > 0)
            .map((item: any, idx: number) => {
              const tx = item.transform;
              const x = tx[4] * scale;
              const y = viewport.height - tx[5] * scale;
              const width = (item.width || item.str.length * 7) * scale;
              const height = (item.height || 12) * scale;

              return {
                id: `block-${pageNum}-${idx}`,
                str: item.str,
                x,
                y: y - height,
                width,
                height,
                fontSize: Math.round(item.height || 12),
                pageIndex: pageNum - 1,
              };
            });
          setTextBlocks(blocks);
        } catch {}
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      }
    },
    [pdfDoc]
  );

  useEffect(() => {
    if (pdfDoc) renderPage(currentPage);
  }, [pdfDoc, currentPage, renderPage]);

  const handleApplyBlockEdit = () => {
    if (!selectedBlock || !activeNewText.trim()) return;

    const pdfX0 = selectedBlock.x / viewportScale;
    const pdfY0 = selectedBlock.y / viewportScale;
    const pdfX1 = (selectedBlock.x + selectedBlock.width) / viewportScale;
    const pdfY1 = (selectedBlock.y + selectedBlock.height) / viewportScale;

    const newEdit: PendingEdit = {
      id: `edit-${Date.now()}-${Math.random()}`,
      page: selectedBlock.pageIndex + 1,
      rect: [pdfX0, pdfY0, pdfX1, pdfY1],
      old_text: selectedBlock.str,
      new_text: activeNewText,
      font_size: selectedBlock.fontSize,
      color: '#000000',
      bg_color: '#FFFFFF',
    };

    setPendingEdits((prev) => [...prev, newEdit]);
    setSelectedBlock(null);
    setActiveNewText('');
    addToast('Perubahan ditambahkan ke daftar sunting.', 'info');
  };

  const handleRemovePendingEdit = (id: string) => {
    setPendingEdits((prev) => prev.filter((e) => e.id !== id));
  };

  const handleExecuteEdit = async () => {
    if (!file || !checkQuotaBeforeAction()) return;

    setIsProcessing(true);
    setProcessingStep(1);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', editMode);

    if (editMode === 'find_replace') {
      formData.append('search_text', searchText.trim());
      formData.append('replace_text', replaceText);
      formData.append('case_sensitive', caseSensitive ? 'true' : 'false');
      formData.append('page_selection', pageSelection);
      if (pageSelection === 'current') formData.append('current_page', currentPage.toString());
      if (pageSelection === 'custom' && customPages.trim()) formData.append('custom_pages', customPages.trim());
    } else {
      formData.append('edits_json', JSON.stringify(pendingEdits));
    }

    try {
      setProcessingStep(2);
      const response = await fetch(`${BACKEND_URL}/tools/edit-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Gagal menyunting teks dokumen PDF.');
      }

      setProcessingStep(3);
      const blob = await response.blob();
      setResultSize(blob.size);
      setResultUrl(URL.createObjectURL(blob));
      consumeQuota();
      addToast('Suntingan teks PDF berhasil diterapkan!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Gagal memproses suntingan PDF.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    triggerFileDownload(resultUrl, `${base}-edited.pdf`);
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setPdfDoc(null);
    setResultUrl(null);
    setResultSize(null);
    setTotalPages(0);
    setCurrentPage(1);
    setPendingEdits([]);
    setSelectedBlock(null);
  };

  return (
    <ToolContainer
      title="Edit Teks PDF"
      description="Cari & ganti kata atau kalimat secara massal, serta sunting blok teks langsung pada dokumen PDF Anda."
      onBack={onBack}
      canvasSlot={
        file ? (
          <div className="h-full flex flex-col items-center justify-between p-6 bg-canvas overflow-y-auto">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between w-full max-w-lg mb-4">
              <span className="text-xs font-semibold text-text-secondary">
                Pratinjau Halaman
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2 bg-surface px-2.5 py-1 rounded-xl border border-border-subtle shadow-xs">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 hover:bg-canvas rounded disabled:opacity-30 text-text-secondary"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-text-primary">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 hover:bg-canvas rounded disabled:opacity-30 text-text-secondary"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Canvas with Text Highlight Overlays */}
            <div
              className="relative border border-border-subtle rounded-xl shadow-lg bg-white overflow-hidden my-auto select-none"
              style={{ width: canvasDimensions.width || 'auto', height: canvasDimensions.height || 'auto' }}
            >
              <canvas ref={canvasRef} className="block mx-auto" />

              {/* Block Edits Interactive Highlight */}
              {editMode === 'block_edits' &&
                textBlocks.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      setSelectedBlock(b);
                      setActiveNewText(b.str);
                    }}
                    style={{
                      position: 'absolute',
                      left: `${b.x}px`,
                      top: `${b.y}px`,
                      width: `${b.width}px`,
                      height: `${b.height}px`,
                    }}
                    className={`cursor-pointer transition-colors ${
                      selectedBlock?.id === b.id
                        ? 'bg-accent-primary/30 border border-accent-primary ring-1 ring-accent-primary'
                        : 'hover:bg-blue-400/20'
                    }`}
                    title={b.str}
                  />
                ))}
            </div>

            {/* Bottom Info Bar */}
            <div className="mt-4 flex items-center justify-between w-full max-w-lg text-xs text-text-secondary">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Ganti Dokumen
              </button>
              <span>{file.name}</span>
            </div>
          </div>
        ) : undefined
      }
      inspectorSlot={
        file ? (
          <EditInspector
            editMode={editMode}
            setEditMode={setEditMode}
            searchText={searchText}
            setSearchText={setSearchText}
            replaceText={replaceText}
            setReplaceText={setReplaceText}
            caseSensitive={caseSensitive}
            setCaseSensitive={setCaseSensitive}
            pageSelection={pageSelection}
            setPageSelection={setPageSelection}
            customPages={customPages}
            setCustomPages={setCustomPages}
            foundMatchesCount={foundMatchesCount}
            selectedBlock={selectedBlock}
            activeNewText={activeNewText}
            setActiveNewText={setActiveNewText}
            pendingEdits={pendingEdits}
            onApplyBlockEdit={handleApplyBlockEdit}
            onRemovePendingEdit={handleRemovePendingEdit}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        ) : undefined
      }
      floatingBarSlot={
        file ? (
          <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
              <Edit3 className="w-4 h-4 text-accent-primary" />
              <span>
                {editMode === 'find_replace'
                  ? `Cari: "${searchText.slice(0, 15)}"`
                  : `${pendingEdits.length} Suntingan Blok`}
              </span>
            </div>
            <button
              onClick={() => handleExecuteEdit()}
              disabled={
                isProcessing ||
                (editMode === 'find_replace' && !searchText.trim()) ||
                (editMode === 'block_edits' && pendingEdits.length === 0)
              }
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-accent-primary hover:bg-accent-hover disabled:bg-canvas disabled:text-text-muted text-accent-contrast font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Terapkan Suntingan PDF</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-accent-contrast/20 rounded text-[10px]">↵</kbd>
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Upload Phase */}
      {!file && (
        <div className="max-w-2xl mx-auto space-y-6">
          <FileUploader
            onFileSelect={handlePdfSelect}
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={1}
            title="Pilih Berkas PDF untuk Diedit Teksnya"
            subtitle="Cari dan ganti kata secara massal atau sunting blok teks langsung"
          />
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="max-w-md mx-auto py-12">
          <ProcessingStepper
            currentStep={processingStep}
            steps={[
              { label: 'Memindai & Mencocokkan Token Teks PDF' },
              { label: 'Menerapkan Suntingan Redaksi di PyMuPDF' },
              { label: 'Menyusun Ulang Berkas Output Terpelihara' },
            ]}
          />
        </div>
      )}

      {/* Result State */}
      {resultUrl && file && (
        <div className="max-w-lg mx-auto py-8">
          <DownloadResultCard
            fileName={`${file.name.replace(/\.pdf$/i, '')}-edited.pdf`}
            originalSize={file.size}
            resultSize={resultSize || file.size}
            onDownload={handleDownload}
            onReset={handleReset}
            resetLabel="Edit Berkas Lain"
            successTitle="Suntingan Berhasil Diterapkan!"
            successDescription="Perubahan teks Anda telah disimpan ke dokumen PDF baru dengan tata letak presisi."
            resultUrl={resultUrl}
          />
        </div>
      )}
    </ToolContainer>
  );
};

export default EditPdf;
