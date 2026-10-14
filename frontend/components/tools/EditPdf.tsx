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
  ZoomIn,
  ZoomOut,
  Maximize2,
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
  const [zoom, setZoom] = useState<number>(1.0);
  const [docDimensions, setDocDimensions] = useState<{ width: number; height: number; isLandscape: boolean } | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Mode Tab: Cari & Ganti vs Sunting Visual
  const [editMode, setEditMode] = useState<EditMode>('find_replace');

  // State Mode 1: Cari & Ganti
  const [searchText, setSearchText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [autoMatchFont, setAutoMatchFont] = useState<boolean>(true);
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
        const isLandscape = unscaledViewport.width > unscaledViewport.height;

        setDocDimensions({
          width: unscaledViewport.width,
          height: unscaledViewport.height,
          isLandscape,
        });

        // Ukuran kontainer pratinjau yang fleksibel dan luas
        const containerEl = previewContainerRef.current;
        const rawContainerWidth = containerEl?.clientWidth || 850;
        const availableWidth = Math.max(340, rawContainerWidth - 32);

        // Dokumen landscape dapat menggunakan lebar penuh kontainer (hingga 1100px)
        // Dokumen portrait disesuaikan agar proporsional di layar (hingga 780px)
        const defaultTargetWidth = isLandscape
          ? Math.min(availableWidth, 1100)
          : Math.min(availableWidth, 780);

        const baseScale = defaultTargetWidth / unscaledViewport.width;
        const scale = baseScale * zoom;
        setViewportScale(scale);
        const viewport = page.getViewport({ scale });

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(viewport.width * dpr);
        canvas.height = Math.round(viewport.height * dpr);
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
          const styles = textContent.styles || {};
          const blocks: TextBlockItem[] = textContent.items
            .filter((item: any) => item.str && item.str.trim().length > 0)
            .map((item: any, idx: number) => {
              const tx = item.transform;
              const x = tx[4] * scale;
              const y = viewport.height - tx[5] * scale;
              const width = (item.width || item.str.length * 7) * scale;
              const height = (item.height || 12) * scale;

              // Hitung ukuran font asli unscaled dalam satuan PDF points
              const rawFontSize = Math.hypot(tx[0], tx[1]) || item.height || 12;
              const fontStyle = styles[item.fontName] || {};
              const rawFontFamily = fontStyle.fontFamily || '';

              const isBold = /bold|black|heavy/i.test(item.fontName) || /bold|black|heavy/i.test(rawFontFamily);
              const isItalic = /italic|oblique/i.test(item.fontName) || /italic|oblique/i.test(rawFontFamily);

              return {
                id: `block-${pageNum}-${idx}`,
                str: item.str,
                x,
                y: y - height,
                width,
                height,
                fontSize: Math.round(rawFontSize * 10) / 10,
                fontFamily: rawFontFamily || fontStyle.name || undefined,
                isBold,
                isItalic,
                pageIndex: pageNum - 1,
              };
            });
          setTextBlocks(blocks);
          setSelectedBlock((prev) => {
            if (!prev) return null;
            return blocks.find((b) => b.id === prev.id) || null;
          });
        } catch {}
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      }
    },
    [pdfDoc, zoom]
  );

  useEffect(() => {
    if (pdfDoc) renderPage(currentPage);
  }, [pdfDoc, currentPage, renderPage]);

  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc) renderPage(currentPage);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, currentPage, renderPage]);

  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.round(Math.max(0.5, Math.min(2.5, newZoom)) * 100) / 100;
    setZoom(clamped);
  };

  const handleResetZoom = () => {
    setZoom(1.0);
  };

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
      font_family: selectedBlock.fontFamily,
      is_bold: selectedBlock.isBold,
      is_italic: selectedBlock.isItalic,
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
    formData.append('edit_mode', editMode);
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
    formData.append('auto_match_font', autoMatchFont ? 'true' : 'false');

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
    setZoom(1.0);
    setDocDimensions(null);
    setPendingEdits([]);
    setSelectedBlock(null);
  };

  return (
    <ToolContainer
      title="Edit Teks PDF"
      description="Cari & ganti kata atau kalimat secara massal, serta sunting blok teks langsung pada dokumen PDF Anda."
      onBack={onBack}
      currentStep={!file ? 1 : (resultUrl ? 3 : 2)}
      toolbarSlot={
        file && !isProcessing && !resultUrl ? (
          <div className="flex items-center justify-between w-full gap-3 flex-wrap">
            {/* Navigasi Halaman */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-secondary hidden sm:inline">
                Halaman:
              </span>
              <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-xl border border-border-subtle shadow-xs">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 hover:bg-canvas rounded disabled:opacity-30 text-text-secondary transition-colors"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-medium text-text-primary px-1">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 hover:bg-canvas rounded disabled:opacity-30 text-text-secondary transition-colors"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mode Tag / Status Badge */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-text-muted">
              {editMode === 'block_edits' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-primary/10 text-accent-primary font-medium text-[11px]">
                  <Edit3 className="w-3.5 h-3.5" /> Klik teks di pratinjau untuk menyunting
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border-subtle text-text-secondary text-[11px]">
                  Mode Cari & Ganti Kata
                </span>
              )}
            </div>

            {/* Kontrol Zoom Pratinjau */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-surface px-2 py-1 rounded-xl border border-border-subtle shadow-xs">
                <button
                  onClick={() => handleZoomChange(zoom - 0.15)}
                  disabled={zoom <= 0.5}
                  className="p-1 hover:bg-canvas rounded text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30"
                  title="Perkecil (-)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="text-xs font-mono font-bold text-text-primary px-2 hover:bg-canvas rounded py-0.5 transition-colors"
                  title="Klik untuk reset zoom (Pas Lebar 100%)"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => handleZoomChange(zoom + 0.15)}
                  disabled={zoom >= 2.5}
                  className="p-1 hover:bg-canvas rounded text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30"
                  title="Perbesar (+)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleResetZoom}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface hover:bg-canvas text-text-secondary hover:text-text-primary text-xs font-medium shadow-xs transition-colors"
                title="Sesuaikan dengan lebar kontainer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-accent-primary" />
                <span>Pas Lebar</span>
              </button>
            </div>
          </div>
        ) : undefined
      }
      canvasSlot={
        file && !isProcessing && !resultUrl ? (
          <div
            ref={previewContainerRef}
            className="w-full h-full flex flex-col items-center justify-between min-h-[560px] max-h-[calc(100vh-230px)] overflow-hidden"
          >
            {/* Area Kanvas Scrollable (Horizontal & Vertikal) */}
            <div className="w-full flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4">
              <div
                className="relative border border-border-subtle rounded-xl shadow-lg bg-white select-none transition-all my-auto"
                style={{
                  width: `${canvasDimensions.width}px`,
                  height: `${canvasDimensions.height}px`,
                  minWidth: `${canvasDimensions.width}px`,
                  minHeight: `${canvasDimensions.height}px`,
                }}
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
                          ? 'bg-accent-primary/30 border-2 border-accent-primary ring-2 ring-accent-primary/40'
                          : 'hover:bg-blue-400/25 border border-transparent hover:border-blue-300'
                      }`}
                      title={`${b.str} (${b.fontSize} pt)`}
                    />
                  ))}
              </div>
            </div>

            {/* Baris Status Metadata Dokumen */}
            <div className="w-full pt-3 pb-1 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary select-none">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Ganti Dokumen
              </button>
              <div className="flex items-center gap-3">
                {docDimensions && (
                  <span className="font-mono text-[11px] text-text-muted bg-surface px-2 py-0.5 rounded border border-border-subtle">
                    {docDimensions.isLandscape ? 'Landscape' : 'Portrait'} · {Math.round(docDimensions.width)} × {Math.round(docDimensions.height)} pt
                  </span>
                )}
                <span className="font-medium truncate max-w-[200px] sm:max-w-[320px]" title={file.name}>
                  {file.name}
                </span>
              </div>
            </div>
          </div>
        ) : undefined
      }
      inspectorSlot={
        file && !isProcessing && !resultUrl ? (
          <EditInspector
            editMode={editMode}
            setEditMode={setEditMode}
            searchText={searchText}
            setSearchText={setSearchText}
            replaceText={replaceText}
            setReplaceText={setReplaceText}
            caseSensitive={caseSensitive}
            setCaseSensitive={setCaseSensitive}
            autoMatchFont={autoMatchFont}
            setAutoMatchFont={setAutoMatchFont}
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
        file && !isProcessing && !resultUrl ? (
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
