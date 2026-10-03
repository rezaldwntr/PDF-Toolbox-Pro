
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ToolContainer from '../common/ToolContainer';
import { TrashIcon } from '../icons';
import { Plus, ArrowUpDown, Layers, ShieldCheck, FileText } from 'lucide-react';
import PdfPreview from './PdfPreview';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { useAuth } from '../../contexts/AuthContext';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
import { mergeDocuments, CLIENT_PDF_MAX_SIZE_BYTES } from '../../lib/pdfWorker';

import { BACKEND_URL } from '../../config';

interface MergePdfProps { onBack: () => void; }
interface PdfFile { id: string; file: File; buffer: ArrayBuffer; }
interface FileDragInfo {
  index: number; startX: number; startY: number; offsetX: number; offsetY: number;
  cardWidth: number; cardHeight: number; previewImgUrl: string;
}

const MergePdf: React.FC<MergePdfProps> = ({ onBack }) => {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeStatusText, setMergeStatusText] = useState<string>('');
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Kept for "Tambah File" button logic
  const { addToast } = useToast();

  // Pointer-based tactile drag and drop state (Opaque, zero ghosting)
  const [dragInfo, setDragInfo] = useState<FileDragInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);

  const dragInfoRef = useRef<FileDragInfo | null>(null);
  const isDraggingRef = useRef(false);
  const targetIndexRef = useRef<number | null>(null);
  const floatingCardRef = useRef<HTMLDivElement>(null);

  const handleFileChange = async (selectedFiles: FileList | null) => {
    if (selectedFiles) {
      const newFiles = Array.from(selectedFiles).filter(file => file.type === 'application/pdf');
      const processedFiles: PdfFile[] = await Promise.all(
        newFiles.map(async (file) => ({
          id: `${file.name}-${file.lastModified}-${file.size}-${Math.random()}`,
          file,
          buffer: await file.arrayBuffer(),
        }))
      );
      setFiles(prevFiles => [...prevFiles, ...processedFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const { quota, consumeQuota, checkQuotaBeforeAction, setShowLimitModal, openPaywall } = useQuota();
  const { isPro } = useAuth();

  // --- Tactile Pointer-Based Drag and Drop Handlers (Zero OS Ghosting) ---
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, index: number) => {
    if (e.button !== 0) return;

    const cardElem = e.currentTarget;
    const rect = cardElem.getBoundingClientRect();
    const canvas = cardElem.querySelector('canvas');
    let previewImgUrl = '';
    try {
      if (canvas) previewImgUrl = canvas.toDataURL();
    } catch {
      // ignore
    }

    const info: FileDragInfo = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      cardWidth: rect.width,
      cardHeight: rect.height,
      previewImgUrl,
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
          floatingCardRef.current.style.transform = `translate3d(${posX}px, ${posY}px, 0) scale(1.06) rotate(2deg)`;
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
          setFiles(prevFiles => {
            const newFiles = [...prevFiles];
            const [moved] = newFiles.splice(fromIdx, 1);
            newFiles.splice(toIdx, 0, moved);
            return newFiles;
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

  const [addBlankPage, setAddBlankPage] = useState<boolean>(false);
  const totalSize = useMemo(() => files.reduce((acc, f) => acc + f.file.size, 0), [files]);
  const isClientSide = totalSize <= CLIENT_PDF_MAX_SIZE_BYTES;

  const sortFiles = (ascending = true) => {
    setFiles(prev => [...prev].sort((a, b) => 
      ascending ? a.file.name.localeCompare(b.file.name) : b.file.name.localeCompare(a.file.name)
    ));
    addToast(ascending ? 'Diurutkan A ke Z' : 'Diurutkan Z ke A', 'info');
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      addToast('Silakan pilih setidaknya dua file PDF.', 'warning');
      return;
    }

    // PWA Offline Hybrid Tier Gating:
    // Tamu & Free saat offline dibatasi 10 MB per berkas. Pro = Unlimited Offline.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (!isPro && files.some((f) => f.file.size > 10 * 1024 * 1024)) {
        addToast('Batas Berkas Offline Gratis (Maks 10 MB). Upgrade ke Pro untuk pemrosesan offline tanpa batas!', 'warning');
        openPaywall('offline_large_file');
        return;
      }
    } else {
      if (!checkQuotaBeforeAction()) {
        return;
      }
    }

    setIsMerging(true);

    // 1. Eksekusi Penggabungan Instan di Browser (Client-Side WASM / In-Memory)
    if (isClientSide) {
      setMergeStatusText('Menggabungkan di Browser (Privasi 100% In-Memory)...');
      try {
        const mergedPdfBytes = await mergeDocuments(files.map((item) => item.buffer));
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        setMergedPdfUrl(URL.createObjectURL(blob));
        consumeQuota();
        addToast('PDF berhasil digabungkan secara instan di browser!', 'success');
        setIsMerging(false);
        setMergeStatusText('');
        return;
      } catch (clientError: any) {
        console.warn('Client-side merge gagal, mencoba backend fallback:', clientError);
        setMergeStatusText('Beralih ke Server...');
      }
    } else {
      setMergeStatusText('Menggabungkan di Server (Berkas Besar >50MB)...');
    }

    // 2. Fallback Otomatis ke Backend jika file besar atau dokumen terenkripsi
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f.file));

      const response = await fetch(`${BACKEND_URL}/tools/merge-pdf`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || 'Gagal menggabungkan PDF.');
      }

      const blob = await response.blob();
      setMergedPdfUrl(URL.createObjectURL(blob));
      consumeQuota();
      addToast('PDF berhasil digabungkan di server!', 'success');
    } catch (error: any) {
      clearTimeout(timeoutId);
      addToast(error.name === 'AbortError' ? 'Waktu koneksi habis.' : error.message, 'error');
    } finally {
      setIsMerging(false);
      setMergeStatusText('');
    }
  };

  // Keyboard shortcut Enter: eksekusi jika berkas siap (Design Bible Section 4.2 & 5.1)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && files.length >= 2 && !isMerging && !mergedPdfUrl) {
        e.preventDefault();
        handleMerge();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files.length, isMerging, mergedPdfUrl, handleMerge]);

  const reset = () => {
    setFiles([]);
    setIsMerging(false);
    if (mergedPdfUrl) URL.revokeObjectURL(mergedPdfUrl);
    setMergedPdfUrl(null);
  };

  if (isMerging) {
    return (
      <ToolContainer title="Memproses Penggabungan PDF" onBack={onBack} currentStep={2}>
        <ProcessingStepper toolName="Penggabung PDF" isLocalRam={isClientSide} />
      </ToolContainer>
    );
  }

  if (mergedPdfUrl) {
    return (
      <ToolContainer title="PDF Berhasil Digabungkan!" onBack={onBack} currentStep={3}>
        <DownloadResultCard
          fileName={`merged-${Date.now()}.pdf`}
          downloadUrl={mergedPdfUrl}
          originalSize={totalSize}
          resultSize={totalSize}
          onReset={reset}
          resetLabel="Gabungkan PDF Lainnya"
          customSuccessMessage="Semua berkas Anda telah berhasil disatukan secara berurutan."
          isLocalRam={isClientSide}
        />
      </ToolContainer>
    );
  }

  // KANVAS: Grid Dokumen dengan Pratinjau Taktil & Drag-Reorder (Section 5.1)
  const canvasSlot = files.length > 0 && (
    <div className="w-full space-y-4">
      {/* Hidden Input for Add More */}
      <input 
        type="file" 
        multiple 
        accept=".pdf" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={(e) => handleFileChange(e.target.files)} 
      />

      <div className="flex items-center justify-between text-xs text-text-secondary px-1">
        <span>Tahan & geser kartu thumbnail untuk mengatur urutan penggabungan:</span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1 font-semibold text-accent-primary hover:underline cursor-pointer"
        >
          <Plus size={14} />
          <span>Tambah Berkas</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {files.map(({ id, file, buffer }, index) => {
          const isBeingDragged = isDragging && dragInfo?.index === index;
          const isDragOver = isDragging && targetIndex === index && dragInfo?.index !== index;

          if (isBeingDragged) {
            return (
              <div 
                key={id}
                data-drag-index={index}
                style={{ height: dragInfo?.cardHeight || 170 }}
                className="relative p-2.5 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-accent-primary bg-accent-primary/10 text-accent-primary select-none transition-all"
              >
                <span className="text-xs font-bold text-center truncate max-w-full px-2">{file.name}</span>
                <span className="text-[10px] opacity-75 mt-0.5">Sedang dipindah</span>
              </div>
            );
          }

          return (
            <div 
              key={id} 
              data-drag-index={index}
              onPointerDown={(e) => handlePointerDown(e, index)}
              className={`drag-card bg-surface p-2.5 rounded-xl border shadow-2xs relative group cursor-grab active:cursor-grabbing select-none transition-all ${
                isDragOver 
                  ? 'border-accent-primary ring-2 ring-accent-primary/30 shadow-md' 
                  : 'border-border-subtle hover:border-border-strong hover:shadow-card'
              }`}
            >
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-surface/90 border border-border-subtle text-[10px] font-mono font-bold text-text-secondary z-10">
                #{index + 1}
              </div>
              <button 
                onPointerDown={(e) => e.stopPropagation()} 
                onClick={(e) => { e.stopPropagation(); removeFile(index); }} 
                className="absolute top-1.5 right-1.5 p-1 text-status-error z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-surface rounded-full shadow-2xs hover:bg-status-error/10 border border-border-subtle cursor-pointer"
                title="Hapus berkas ini"
              >
                <TrashIcon className="w-3.5 h-3.5"/>
              </button>
              <div className="rounded-lg overflow-hidden border border-border-subtle">
                <PdfPreview buffer={buffer} />
              </div>
              <p className="text-[11px] truncate mt-2 text-center font-bold text-text-primary px-1" title={file.name}>
                {file.name}
              </p>
              <p className="text-[10px] text-text-secondary text-center font-mono">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          );
        })}

        {/* Add more button card inside grid */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border-subtle hover:border-border-strong rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-text-secondary hover:text-text-primary transition-all hover:bg-elevated/40 min-h-[160px] cursor-pointer"
        >
          <div className="w-9 h-9 rounded-full bg-elevated border border-border-subtle flex items-center justify-center text-text-secondary">
            <Plus size={18} />
          </div>
          <span className="text-xs font-semibold">Tambah File</span>
        </button>
      </div>

      {/* Floating Lifted Card for Pointer Drag (100% Solid Opaque, Crisp) */}
      {isDragging && dragInfo && createPortal(
        (() => {
          const draggedFile = files[dragInfo.index];
          if (!draggedFile) return null;

          return (
            <div
              ref={floatingCardRef}
              className="drag-floating-card bg-surface p-2.5 rounded-xl flex flex-col items-center gap-2 border-2 border-accent-primary ring-4 ring-accent-primary/20 select-none shadow-2xl"
              style={{
                width: dragInfo.cardWidth,
                height: dragInfo.cardHeight,
                transform: `translate3d(${dragInfo.startX - dragInfo.offsetX}px, ${dragInfo.startY - dragInfo.offsetY}px, 0) scale(1.06) rotate(2deg)`,
              }}
            >
              <div className="w-full flex-1 min-h-0 bg-elevated rounded-lg overflow-hidden flex items-center justify-center">
                {dragInfo.previewImgUrl ? (
                  <img src={dragInfo.previewImgUrl} alt={draggedFile.file.name} className="w-full h-full object-contain pointer-events-none" />
                ) : (
                  <span className="text-xs text-text-secondary">PDF</span>
                )}
              </div>
              <p className="text-[11px] truncate w-full mt-1.5 text-center font-bold text-text-primary px-1">
                {draggedFile.file.name}
              </p>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );

  // PANEL INSPEKTOR: Urutan, Blank Page, & CTA (Section 5.1)
  const inspectorSlot = files.length > 0 && (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <h3 className="font-bold text-sm text-text-primary">Pengaturan Berkas</h3>
        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-elevated border border-border-subtle text-text-secondary">
          {files.length} Berkas
        </span>
      </div>

      {/* Quick Sort Actions */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Urutan Berkas</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => sortFiles(true)} className="p-2 rounded-lg bg-surface border border-border-subtle hover:border-border-strong text-xs font-semibold text-text-primary flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs">
            <ArrowUpDown size={13} />
            <span>Nama A-Z</span>
          </button>
          <button type="button" onClick={() => sortFiles(false)} className="p-2 rounded-lg bg-surface border border-border-subtle hover:border-border-strong text-xs font-semibold text-text-primary flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs">
            <ArrowUpDown size={13} />
            <span>Nama Z-A</span>
          </button>
        </div>
      </div>

      {/* Blank Page Option (Design Bible Section 5.1) */}
      <div className="p-3 rounded-xl bg-elevated border border-border-subtle space-y-1.5">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={addBlankPage} onChange={(e) => setAddBlankPage(e.target.checked)} className="mt-0.5 rounded border-border-strong text-accent-primary focus:ring-accent-primary cursor-pointer" />
          <div className="text-xs">
            <span className="font-bold text-text-primary block">Halaman Pembatas Blangko</span>
            <span className="text-[11px] text-text-secondary block mt-0.5 leading-tight">
              Sisipkan halaman kosong jika lembar ganjil (ideal untuk cetak duplex/bolak-balik).
            </span>
          </div>
        </label>
      </div>

      {/* Security Assurance Pill */}
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface border border-border-subtle text-[11px] text-text-secondary">
        <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
        <span>{isClientSide ? 'Penggabungan 100% di RAM lokal browser tanpa upload server.' : 'Ukuran >50 MB diproses aman dengan enkripsi TLS 1.3.'}</span>
      </div>

      {/* Primary Action Button (CTA) with Enter shortcut */}
      <button type="button" onClick={handleMerge} disabled={isMerging || files.length < 2} className="w-full bg-accent-primary hover:bg-accent-hover text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-xs sm:text-sm mt-4">
        <Layers size={16} />
        <span>{files.length < 2 ? 'Pilih Minimal 2 File' : `Gabungkan ${files.length} Berkas (↵)`}</span>
      </button>
    </div>
  );

  return (
    <ToolContainer 
      title="Gabungkan PDF" 
      description="Susun dan gabungkan beberapa dokumen PDF menjadi satu berkas rapi."
      onBack={onBack}
      maxWidth="max-w-5xl"
      currentStep={files.length === 0 ? 1 : 2}
      canvasSlot={files.length > 0 ? canvasSlot : undefined}
      inspectorSlot={files.length > 0 ? inspectorSlot : undefined}
      fileInfo={files.length > 0 ? { originalSize: totalSize, estimatedSize: totalSize, isLocalRam: isClientSide } : undefined}
    >
      {files.length === 0 && (
        <FileUploader 
          onFileSelect={handleFileChange} 
          multiple={true}
          label="Gabungkan Beberapa PDF"
          description="Seret banyak file PDF ke sini untuk disatukan"
        />
      )}
    </ToolContainer>
  );
};

export default MergePdf;
