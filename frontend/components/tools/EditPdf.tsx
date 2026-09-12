import React, { useState, useRef, useEffect, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';
import {
  Edit3,
  Search,
  Replace,
  Download,
  RefreshCw,
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Trash2,
  Sliders,
  Type,
  Check,
  X,
  AlertCircle
} from 'lucide-react';

declare const pdfjsLib: any;

type EditMode = 'find_replace' | 'block_edits';
type PageSelection = 'all' | 'current' | 'custom';

interface TextBlockItem {
  id: string;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  pageIndex: number;
}

interface PendingEdit {
  id: string;
  page: number;
  rect: [number, number, number, number]; // [x0, y0, x1, y1] PDF points
  old_text: string;
  new_text: string;
  font_size: number;
  color: string;
  bg_color: string;
}

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
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();

  // 1. Tangani pemilihan file PDF
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
    setSearchText('');
    setReplaceText('');

    try {
      const buffer = await selected.arrayBuffer();
      if (typeof pdfjsLib !== 'undefined') {
        const loadedDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
        setPdfDoc(loadedDoc);
        setTotalPages(loadedDoc.numPages);
      }
    } catch (err: any) {
      console.error('Gagal memuat pratinjau PDF:', err);
      addToast('Gagal membaca struktur berkas PDF.', 'error');
    }
  };

  // 2. Render halaman PDF dan ekstrak blok teks
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = Math.min(canvas.parentElement?.clientWidth || 500, 560);
      const scale = containerWidth / unscaledViewport.width;
      setViewportScale(scale);

      const viewport = page.getViewport({ scale });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      ctx.scale(dpr, dpr);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;

      setCanvasDimensions({ width: viewport.width, height: viewport.height });

      // Ekstraksi teks halaman untuk mode visual click-to-edit
      const textContent = await page.getTextContent();
      const extracted: TextBlockItem[] = [];

      textContent.items.forEach((item: any, idx: number) => {
        if (!item.str || !item.str.trim()) return;

        const tx = item.transform[4];
        const ty = item.transform[5];
        const fontHeight = Math.sqrt(item.transform[2] * item.transform[2] + item.transform[3] * item.transform[3]) || 12;

        // Konversi koordinat PDF ke koordinat canvas viewport
        const [vx, vy] = viewport.convertToViewportPoint(tx, ty);

        extracted.push({
          id: `t_${pageNum}_${idx}`,
          str: item.str,
          x: vx,
          y: vy - fontHeight * scale,
          width: Math.max(item.width * scale, 16),
          height: Math.max(fontHeight * scale, 14),
          fontSize: Math.round(fontHeight),
          pageIndex: pageNum,
        });
      });

      setTextBlocks(extracted);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Error render page:', err);
      }
    }
  }, [pdfDoc]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, renderPage]);

  // 3. Tambah suntingan visual blok ke daftar pending
  const handleApplyBlockEdit = () => {
    if (!selectedBlock || !activeNewText.trim()) return;

    // Hitung koordinat PDF point asli (unscaled)
    const pdfX0 = selectedBlock.x / viewportScale;
    const pdfY0 = selectedBlock.y / viewportScale;
    const pdfX1 = (selectedBlock.x + selectedBlock.width) / viewportScale;
    const pdfY1 = (selectedBlock.y + selectedBlock.height) / viewportScale;

    const newEdit: PendingEdit = {
      id: `${selectedBlock.id}_${Date.now()}`,
      page: selectedBlock.pageIndex,
      rect: [Math.round(pdfX0), Math.round(pdfY0), Math.round(pdfX1), Math.round(pdfY1)],
      old_text: selectedBlock.str,
      new_text: activeNewText.trim(),
      font_size: selectedBlock.fontSize,
      color: '#000000',
      bg_color: '#ffffff',
    };

    setPendingEdits(prev => [...prev.filter(e => e.id !== newEdit.id), newEdit]);
    setSelectedBlock(null);
    setActiveNewText('');
    addToast('Perubahan teks ditambahkan ke daftar antrean.', 'info');
  };

  const handleRemovePendingEdit = (id: string) => {
    setPendingEdits(prev => prev.filter(e => e.id !== id));
  };

  // 4. Eksekusi Sunting Teks PDF (POST /tools/edit-pdf)
  const handleExecuteEdit = async () => {
    if (!file) return;

    if (!checkQuotaBeforeAction()) return;

    if (editMode === 'find_replace' && !searchText.trim()) {
      addToast('Harap masukkan kata atau kalimat yang ingin dicari.', 'warning');
      return;
    }

    if (editMode === 'block_edits' && pendingEdits.length === 0) {
      addToast('Belum ada teks yang disunting. Klik baris teks pada pratinjau untuk menyunting.', 'warning');
      return;
    }

    setIsProcessing(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('edit_mode', editMode);

    if (editMode === 'find_replace') {
      formData.append('search_text', searchText.trim());
      formData.append('replace_text', replaceText.trim());
      formData.append('case_sensitive', caseSensitive.toString());
      formData.append('page_selection', pageSelection);
      formData.append('current_page', currentPage.toString());
      if (pageSelection === 'custom' && customPages.trim()) {
        formData.append('custom_pages', customPages.trim());
      }
    } else {
      formData.append('edits_json', JSON.stringify(pendingEdits));
    }

    try {
      const response = await fetch(`${BACKEND_URL}/tools/edit-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errDetail = 'Gagal menyunting berkas PDF';
        try {
          const errJson = await response.json();
          if (errJson.detail) errDetail = errJson.detail;
        } catch {
          // json parse fallback
        }
        addToast(errDetail, 'error');
        setIsProcessing(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize(blob.size);

      // Konsumsi kuota pemakaian
      consumeQuota();

      addToast('Perubahan teks berhasil diterapkan!', 'success');
    } catch (error: any) {
      console.error('Error edit PDF:', error);
      addToast(error.message || 'Terjadi kesalahan jaringan saat memproses penyuntingan teks.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Unduh berkas hasil suntingan
  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    const base = file.name.replace(/\.pdf$/i, '');
    link.download = `edited-${base}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 6. Reset state
  const handleReset = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setFile(null);
    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);
    setResultUrl(null);
    setResultSize(null);
    setPendingEdits([]);
    setSelectedBlock(null);
    setSearchText('');
    setReplaceText('');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <ToolContainer
      title="Edit Teks PDF"
      description="Ubah, sunting, atau ganti isi teks yang ada pada dokumen PDF Anda dengan preservasi tata letak penuh."
      onBack={onBack}
    >
      {/* =================================================================== */}
      {/* LANGKAH 1: UNGGAH DOKUMEN                                          */}
      {/* =================================================================== */}
      {!file && (
        <div className="max-w-2xl mx-auto space-y-6">
          <FileUploader
            onFileSelect={handlePdfSelect}
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={1}
            title="Pilih Berkas PDF untuk Diedit Teksnya"
            subtitle="Seret berkas PDF ke sini atau klik untuk memilih dokumen dari komputer"
          />

          {/* Fitur Unggulan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Cari & Ganti</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Ganti teks massal otomatis</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Sunting Visual</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Klik teks langsung di halaman</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Tata Letak Terjaga</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Tanpa merusak grafik asli</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LANGKAH 2: STUDIO PENYUNTING TEKS (CANVAS & PENGATURAN)            */}
      {/* =================================================================== */}
      {file && !resultUrl && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Bar Berkas & Mode Tab */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3 truncate">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                  {file.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatFileSize(file.size)} • {totalPages} Halaman
                </p>
              </div>
            </div>

            {/* Tab Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setEditMode('find_replace')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  editMode === 'find_replace'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Cari & Ganti</span>
              </button>
              <button
                type="button"
                onClick={() => setEditMode('block_edits')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  editMode === 'block_edits'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Sunting Visual</span>
              </button>
            </div>

            <button
              onClick={handleReset}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Ganti berkas"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ------------------------------------------------------------- */}
            {/* PANEL KIRI: VISUAL PDF CANVAS & INTERACTIVE TEXT OVERLAY      */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center">
              <div className="w-full bg-slate-100 dark:bg-slate-900/60 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center min-h-[480px] overflow-hidden">
                
                {/* Canvas Container + Interactive Text Blocks */}
                <div
                  className="relative select-none shadow-lg rounded-sm overflow-hidden bg-white"
                  style={{
                    width: canvasDimensions.width > 0 ? `${canvasDimensions.width}px` : 'auto',
                    height: canvasDimensions.height > 0 ? `${canvasDimensions.height}px` : 'auto',
                  }}
                >
                  <canvas ref={canvasRef} className="block pointer-events-none" />

                  {/* Text Overlay untuk Mode Sunting Visual */}
                  {editMode === 'block_edits' && (
                    <div className="absolute inset-0 z-10 pointer-events-auto">
                      {textBlocks.map(b => (
                        <div
                          key={b.id}
                          onClick={() => {
                            setSelectedBlock(b);
                            setActiveNewText(b.str);
                          }}
                          title={`Klik untuk menyunting: "${b.str}"`}
                          className="absolute border border-transparent hover:border-blue-500 hover:bg-blue-500/10 cursor-pointer rounded-xs transition-colors group"
                          style={{
                            left: `${b.x}px`,
                            top: `${b.y}px`,
                            width: `${b.width}px`,
                            height: `${b.height}px`,
                          }}
                        >
                          <span className="hidden group-hover:block absolute -top-5 left-0 bg-blue-600 text-white text-[9px] px-1 py-0.2 rounded font-sans whitespace-nowrap z-20 shadow-xs">
                            ✏ Sunting
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Paginator Navigasi */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center gap-3 bg-white dark:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      Halaman {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* PANEL KANAN: PENGATURAN SUNTING SESUAI MODE                   */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
              
              {/* =========================================================== */}
              {/* TAB 1: CARI & GANTI                                         */}
              {/* =========================================================== */}
              {editMode === 'find_replace' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    <Search className="w-4 h-4 text-blue-500" />
                    <span>Cari & Ganti Teks</span>
                  </div>

                  {/* Input Teks yang Dicari */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Teks yang Dicari *
                    </label>
                    <input
                      type="text"
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      placeholder="Contoh: PT Lama Abadi"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Input Teks Pengganti */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Ganti Menjadi (Teks Baru)
                    </label>
                    <input
                      type="text"
                      value={replaceText}
                      onChange={e => setReplaceText(e.target.value)}
                      placeholder="Contoh: PT Baru Nusantara"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Match Case Toggle */}
                  <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={caseSensitive}
                      onChange={e => setCaseSensitive(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Sensitif Huruf Besar/Kecil (Match Case)
                    </span>
                  </label>

                  {/* Pilihan Target Halaman */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Terapkan Pada
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="pageSelection"
                        value="all"
                        checked={pageSelection === 'all'}
                        onChange={() => setPageSelection('all')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Semua Halaman ({totalPages} hal)</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="pageSelection"
                        value="current"
                        checked={pageSelection === 'current'}
                        onChange={() => setPageSelection('current')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Hanya Halaman Ini (Halaman {currentPage})</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="pageSelection"
                        value="custom"
                        checked={pageSelection === 'custom'}
                        onChange={() => setPageSelection('custom')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Rentang Kustom</span>
                    </label>

                    {pageSelection === 'custom' && (
                      <input
                        type="text"
                        value={customPages}
                        onChange={e => setCustomPages(e.target.value)}
                        placeholder="Contoh: 1-3, 5"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* =========================================================== */}
              {/* TAB 2: SUNTING VISUAL (CLICK-TO-EDIT)                        */}
              {/* =========================================================== */}
              {editMode === 'block_edits' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    <Edit3 className="w-4 h-4 text-blue-500" />
                    <span>Sunting Visual Interaktif</span>
                  </div>

                  {/* Editor Teks yang Sedang Dipilih */}
                  {selectedBlock ? (
                    <div className="p-4 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                          Sunting Teks Terpilih
                        </span>
                        <button
                          onClick={() => setSelectedBlock(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Asli: <span className="font-mono text-slate-800 dark:text-slate-200">"{selectedBlock.str}"</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Teks Baru:
                        </label>
                        <input
                          type="text"
                          value={activeNewText}
                          onChange={e => setActiveNewText(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleApplyBlockEdit}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan Perubahan Ini</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>
                        Arahkan kursor dan klik baris teks yang ingin Anda ubah pada pratinjau halaman PDF di sebelah kiri.
                      </span>
                    </div>
                  )}

                  {/* Daftar Antrean Perubahan */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Antrean Perubahan ({pendingEdits.length})
                      </span>
                      {pendingEdits.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setPendingEdits([])}
                          className="text-[11px] text-rose-500 hover:underline"
                        >
                          Hapus Semua
                        </button>
                      )}
                    </div>

                    {pendingEdits.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Belum ada suntingan teks yang ditambahkan.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {pendingEdits.map((item, idx) => (
                          <div
                            key={item.id}
                            className="p-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl text-xs flex items-center justify-between gap-2"
                          >
                            <div className="truncate">
                              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold block">
                                Hal {item.page}
                              </span>
                              <span className="line-through text-slate-400 truncate block">
                                {item.old_text}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                                → {item.new_text}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePendingEdit(item.id)}
                              className="text-slate-400 hover:text-rose-500 p-1"
                              title="Hapus suntingan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tombol Eksekusi Suntingan */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={handleExecuteEdit}
                  disabled={isProcessing}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-blue-500/25 shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menerapkan Perubahan Teks...</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      <span>Terapkan Perubahan Sekarang</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LANGKAH 3: UNDUH HASIL PENYUNTINGAN                                */}
      {/* =================================================================== */}
      {resultUrl && file && (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-sm animate-fade-in">
          {/* Ikon Sukses */}
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil Disunting
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Teks Dokumen Selesai Diperbarui
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Perubahan teks telah diterapkan secara presisi dengan mempertahankan tata letak asli dokumen PDF Anda.
            </p>
          </div>

          {/* Kartu Ringkasan Hasil */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Nama Berkas:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                edited-{file.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Mode Penyuntingan:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {editMode === 'find_replace' ? 'Cari & Ganti Teks' : 'Sunting Visual Langsung'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Ukuran Berkas:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {resultSize ? formatFileSize(resultSize) : formatFileSize(file.size)}
              </span>
            </div>
          </div>

          {/* Tombol Unduh & Reset */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleDownload}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-emerald-500/25 shadow-md active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>Unduh PDF Hasil Suntingan</span>
            </button>

            <button
              onClick={handleReset}
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sunting Berkas Lain</span>
            </button>
          </div>
        </div>
      )}
    </ToolContainer>
  );
};

export default EditPdf;
