import React, { useState, useRef, useCallback, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import { PDFDocument } from 'pdf-lib';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import {
  PenTool,
  Type,
  Upload,
  Trash2,
  Copy,
  Plus,
  RotateCcw,
  CheckCircle2,
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eraser,
  Sparkles
} from 'lucide-react';

declare const pdfjsLib: any;

// --- TYPES ---
interface PdfFileWithBuffer {
  file: File;
  buffer: ArrayBuffer;
}

interface PagePreview {
  url: string;
  width: number;
  height: number;
}

// Representasi tanda tangan dalam memori galeri
export interface SignatureItem {
  id: string;
  name: string;
  dataUrl: string; // Base64 PNG
  width: number;
  height: number;
  mode: 'draw' | 'type' | 'upload';
}

// Representasi tanda tangan yang ditempatkan di halaman
export interface PlacedSignature {
  id: string;
  signatureId: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

type SignatureMode = 'draw' | 'type' | 'upload';
type TypeFont = 'Caveat' | 'Dancing Script' | 'Great Vibes' | 'Pacifico';

const SIGNATURE_COLORS = [
  { label: 'Hitam', hex: '#000000' },
  { label: 'Biru Resmi', hex: '#1E40AF' },
  { label: 'Merah', hex: '#DC2626' },
];

const PEN_WIDTHS = [
  { label: 'Tipis', size: 2 },
  { label: 'Normal', size: 4 },
  { label: 'Tebal', size: 6 },
];

const TYPE_FONTS: { id: TypeFont; label: string; fontFamily: string }[] = [
  { id: 'Dancing Script', label: 'Dancing Script (Elegan)', fontFamily: '"Dancing Script", cursive' },
  { id: 'Great Vibes', label: 'Great Vibes (Formal Klasik)', fontFamily: '"Great Vibes", cursive' },
  { id: 'Caveat', label: 'Caveat (Tangan Modern)', fontFamily: '"Caveat", cursive' },
  { id: 'Pacifico', label: 'Pacifico (Tegas & Tebal)', fontFamily: '"Pacifico", cursive' },
];

const AddSignature: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [fileWithBuffer, setFileWithBuffer] = useState<PdfFileWithBuffer | null>(null);
  const [pagePreviews, setPagePreviews] = useState<PagePreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  // Galeri Tanda Tangan & Penempatan
  const [signatures, setSignatures] = useState<SignatureItem[]>([]);
  const [placedSignatures, setPlacedSignatures] = useState<PlacedSignature[]>([]);
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);
  
  // Tab Mode & Preferensi Pembuatan
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('draw');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedPenWidth, setSelectedPenWidth] = useState(4);
  const [typedText, setTypedText] = useState('');
  const [selectedTypeFont, setSelectedTypeFont] = useState<TypeFont>('Dancing Script');
  const [removeBg, setRemoveBg] = useState(true);

  // Navigasi & Tampilan Kanvas
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [targetPageSelection, setTargetPageSelection] = useState<'all' | number>(0);
  const [zoom, setZoom] = useState(1.0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSignatureInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  const { addToast } = useToast();
  const { quota, consumeQuota, checkQuotaBeforeAction, setShowLimitModal } = useQuota();

  // Drawing state (Smooth Quadratic Curve Tracking)
  const [isDrawing, setIsDrawing] = useState(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  // Drag & Resize state
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [resizeState, setResizeState] = useState<{
    id: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const resetState = useCallback(() => {
    setFileWithBuffer(null);
    setPagePreviews([]);
    setIsProcessing(false);
    setProcessingMessage('');
    setSignatures([]);
    setPlacedSignatures([]);
    setSelectedPlacedId(null);
    setActivePageIndex(0);
    setTargetPageSelection(0);
    setZoom(1.0);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
  }, [outputUrl]);

  // Sinkronisasi target lembar dengan halaman yang aktif (kecuali jika mode 'all')
  useEffect(() => {
    setTargetPageSelection(prev => (prev === 'all' ? 'all' : activePageIndex));
  }, [activePageIndex]);

  // Deteksi halaman aktif secara dinamis saat kanvas digulir (scroll)
  useEffect(() => {
    const container = pageContainerRef.current;
    if (!container) return;

    let timeoutId: any;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const pageElements = container.querySelectorAll('[data-page-index]');
        const containerRect = container.getBoundingClientRect();
        const containerCenterY = containerRect.top + containerRect.height / 2;

        let closestIdx = activePageIndex;
        let minDistance = Infinity;

        pageElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          const pageCenterY = rect.top + rect.height / 2;
          const dist = Math.abs(pageCenterY - containerCenterY);
          if (dist < minDistance) {
            minDistance = dist;
            const idxAttr = el.getAttribute('data-page-index');
            if (idxAttr !== null) {
              closestIdx = parseInt(idxAttr, 10);
            }
          }
        });

        if (closestIdx !== activePageIndex && !isNaN(closestIdx)) {
          setActivePageIndex(closestIdx);
        }
      }, 60);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [activePageIndex, pagePreviews.length]);

  const handleFileChange = async (files: FileList | null) => {
    const selectedFile = files ? files[0] : null;
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;
    resetState();
    setIsProcessing(true);
    setProcessingMessage('Membaca dokumen dan merender halaman...');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      setFileWithBuffer({ file: selectedFile, buffer: arrayBuffer });

      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
      const previews: PagePreview[] = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
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
    } catch (error) {
      console.error("Gagal memuat PDF:", error);
      addToast("Gagal memuat file PDF. Pastikan file tidak rusak.", 'error');
      resetState();
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // --- DRAWING CANVAS LOGIC (Smooth Quadratic Curves) ---
  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPos(e);
    setIsDrawing(true);
    pointsRef.current = [pos];

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, selectedPenWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = selectedColor;
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPos(e);
    const points = pointsRef.current;
    points.push(pos);

    if (points.length >= 3) {
      const p0 = points[points.length - 3];
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];

      const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      ctx.beginPath();
      ctx.moveTo(mid1.x, mid1.y);
      ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = selectedPenWidth * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDrawing(false);
    pointsRef.current = [];
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pointsRef.current = [];
  };

  // Simpan hasil Gambar ke Galeri
  const handleSaveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cek apakah kanvas kosong
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let isBlank = true;
    for (let i = 3; i < imgData.length; i += 4) {
      if (imgData[i] > 0) {
        isBlank = false;
        break;
      }
    }

    if (isBlank) {
      addToast('Silakan gambar tanda tangan Anda di kanvas terlebih dahulu.', 'warning');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const newSig: SignatureItem = {
      id: `sig-${Date.now()}`,
      name: `Goresan ${signatures.length + 1}`,
      dataUrl,
      width: 180,
      height: 72,
      mode: 'draw',
    };

    setSignatures((prev: SignatureItem[]) => [...prev, newSig]);
    if (targetPageSelection === 'all') {
      placeOnAllPages(newSig);
    } else {
      placeSignatureOnPage(newSig, Number(targetPageSelection));
    }
    clearCanvas();
    addToast('Tanda tangan berhasil dibuat dan ditempatkan!', 'success');
  };

  // Simpan hasil Ketik ke Galeri
  const handleSaveTypedSignature = () => {
    if (!typedText.trim()) {
      addToast('Ketikkan nama atau inisial Anda terlebih dahulu.', 'warning');
      return;
    }

    const fontDef = TYPE_FONTS.find(f => f.id === selectedTypeFont) || TYPE_FONTS[0];
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `italic 78px ${fontDef.fontFamily}`;
    ctx.fillStyle = selectedColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedText.trim(), canvas.width / 2, canvas.height / 2);

    const dataUrl = canvas.toDataURL('image/png');
    const newSig: SignatureItem = {
      id: `sig-${Date.now()}`,
      name: `Ketik: ${typedText.trim().substring(0, 12)}`,
      dataUrl,
      width: 190,
      height: 76,
      mode: 'type',
    };

    setSignatures((prev: SignatureItem[]) => [...prev, newSig]);
    if (targetPageSelection === 'all') {
      placeOnAllPages(newSig);
    } else {
      placeSignatureOnPage(newSig, Number(targetPageSelection));
    }
    setTypedText('');
    addToast('Tanda tangan teks berhasil dibuat dan ditempatkan!', 'success');
  };

  // Unggah File Scan Gambar & Transparansi Otomatis
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        // Jika opsi hapus latar putih aktif, bersihkan warna latar kertas
        if (removeBg) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Jika mendekati warna putih (kertas)
            if (r > 215 && g > 215 && b > 215) {
              data[i + 3] = 0; // Transparan
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        const transparentDataUrl = canvas.toDataURL('image/png');
        const aspectRatio = img.width / img.height;
        const initialWidth = 180;
        const initialHeight = Math.round(initialWidth / aspectRatio);

        const newSig: SignatureItem = {
          id: `sig-${Date.now()}`,
          name: file.name.substring(0, 16),
          dataUrl: transparentDataUrl,
          width: initialWidth,
          height: Math.max(50, Math.min(initialHeight, 140)),
          mode: 'upload',
        };

        setSignatures((prev: SignatureItem[]) => [...prev, newSig]);
        if (targetPageSelection === 'all') {
          placeOnAllPages(newSig);
        } else {
          placeSignatureOnPage(newSig, Number(targetPageSelection));
        }
        addToast('Tanda tangan gambar berhasil dimuat!', 'success');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // --- PLACING & INTERACTION LOGIC ---
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
    setPlacedSignatures((prev: PlacedSignature[]) => [...prev, ...newPlacedList]);
    addToast(`Tanda tangan berhasil dipasang di seluruh ${pagePreviews.length} halaman!`, 'success');
  };

  const placeSignatureOnPage = (signature: SignatureItem, pageIndex: number, customX?: number, customY?: number) => {
    const page = pagePreviews[pageIndex];
    if (!page) return;

    const posX = customX !== undefined ? customX : (page.width / 2) - (signature.width / 2);
    const posY = customY !== undefined ? customY : (page.height * 0.7) - (signature.height / 2);

    const newPlaced: PlacedSignature = {
      id: `placed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      signatureId: signature.id,
      pageIndex,
      x: Math.max(10, Math.min(posX, page.width - signature.width - 10)),
      y: Math.max(10, Math.min(posY, page.height - signature.height - 10)),
      width: signature.width,
      height: signature.height,
    };

    setPlacedSignatures((prev: PlacedSignature[]) => [...prev, newPlaced]);
    setSelectedPlacedId(newPlaced.id);
    setActivePageIndex(pageIndex);
  };

  const duplicatePlacedSignature = (id: string) => {
    const target = placedSignatures.find(p => p.id === id);
    if (!target) return;
    const newPlaced: PlacedSignature = {
      ...target,
      id: `placed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      x: target.x + 20,
      y: target.y + 20,
    };
    setPlacedSignatures(prev => [...prev, newPlaced]);
    setSelectedPlacedId(newPlaced.id);
    addToast('Tanda tangan berhasil diduplikasi', 'info');
  };

  const deletePlacedSignature = (id: string) => {
    setPlacedSignatures(prev => prev.filter(p => p.id !== id));
    if (selectedPlacedId === id) setSelectedPlacedId(null);
  };

  // Dragging handler via Pointer Events
  const handleBoxPointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPlacedId(id);

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetX = (e.clientX - rect.left) / zoom;
    const offsetY = (e.clientY - rect.top) / zoom;

    setDragState({ id, offsetX, offsetY });
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
      setPlacedSignatures(prev => prev.map(sig => {
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
      }));
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
      setPlacedSignatures(prev => prev.map(sig => {
        if (sig.id === resizeState.id) {
          const dx = (e.clientX - resizeState.startX) / zoom;
          const aspectRatio = resizeState.startWidth / resizeState.startHeight;
          const newWidth = Math.max(50, Math.min(500, resizeState.startWidth + dx));
          const newHeight = Math.round(newWidth / aspectRatio);

          return { ...sig, width: newWidth, height: newHeight };
        }
        return sig;
      }));
    };

    const handlePointerUp = () => setResizeState(null);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resizeState, zoom]);

  // Click-to-place langsung pada halaman
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
    if ((e.target as HTMLElement).closest('[data-signature-box]')) return;
    setActivePageIndex(pageIndex);

    // Jika ada tanda tangan tersimpan di galeri, tempatkan tanda tangan aktif/terakhir
    if (signatures.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / zoom;
      const clickY = (e.clientY - rect.top) / zoom;
      const activeSig = signatures[signatures.length - 1];
      placeSignatureOnPage(activeSig, pageIndex, clickX - (activeSig.width / 2), clickY - (activeSig.height / 2));
    }
  };

  // --- SAVE FINAL PDF WITH SINGLE-EMBED IMAGE CACHING ---
  const handleSave = async () => {
    if (!fileWithBuffer || placedSignatures.length === 0) {
      addToast('Tambahkan setidaknya satu tanda tangan ke halaman dokumen.', 'warning');
      return;
    }

    if (!checkQuotaBeforeAction()) {
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Menyematkan tanda tangan ke dalam dokumen PDF...');

    try {
      const pdfDoc = await PDFDocument.load(fileWithBuffer.buffer.slice(0));
      const pages = pdfDoc.getPages();

      // Cache gambar yang sudah di-embed agar tidak diduplikasi di memori PDF
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
          const sig = signatures.find(s => s.id === placed.signatureId);
          if (!sig) continue;

          const imageBytes = await fetch(sig.dataUrl).then(res => res.arrayBuffer());
          if (sig.dataUrl.includes('image/jpeg')) {
            pdfImage = await pdfDoc.embedJpg(imageBytes);
          } else {
            pdfImage = await pdfDoc.embedPng(imageBytes);
          }
          embeddedImagesMap.set(placed.signatureId, pdfImage);
        }

        page.drawImage(pdfImage, {
          x: placed.x * scaleX,
          y: pageHeight - (placed.y * scaleY) - (placed.height * scaleY),
          width: placed.width * scaleX,
          height: placed.height * scaleY,
        });
      }

      const finalPdfBytes = await pdfDoc.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      setOutputUrl(URL.createObjectURL(blob));
      consumeQuota();
      addToast('PDF berhasil ditandatangani dan siap diunduh!', 'success');
    } catch (error) {
      console.error("Gagal menandatangani PDF:", error);
      addToast("Terjadi kesalahan saat menyimpan tanda tangan ke PDF.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderContent = () => {
    // 1. Success State
    if (outputUrl) {
      return (
        <div className="text-center text-slate-600 dark:text-slate-300 flex flex-col items-center gap-6 animate-fade-in py-12">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">PDF Berhasil Ditandatangani!</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Tanda tangan digital Anda telah disematkan dengan kualitas resolusi tinggi.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            <a
              href={outputUrl}
              download={`${fileWithBuffer?.file.name.replace('.pdf', '') || 'dokumen'}-ditandatangani.pdf`}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/25"
            >
              <Download className="w-5 h-5" /> Unduh Dokumen PDF
            </a>
            <button
              onClick={resetState}
              className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-3 px-6 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Tandatangani Dokumen Lain
            </button>
          </div>
        </div>
      );
    }

    // 2. Loading State
    if (isProcessing && pagePreviews.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-lg text-slate-800 dark:text-slate-200 font-semibold">{processingMessage}</p>
        </div>
      );
    }

    // 3. Upload State
    if (!fileWithBuffer) {
      return (
        <FileUploader
          onFileSelect={handleFileChange}
          label="Pilih PDF untuk Ditandatangani"
          description="Tambahkan tanda tangan gambar, goresan tangan langsung, atau tanda tangan ketik resmi"
        />
      );
    }

    // 4. Editor Workspace
    return (
      <div className="flex flex-col gap-4">
        {/* Main Toolbar */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-700 shadow-sm flex-wrap sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">{fileWithBuffer.file.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{pagePreviews.length} Halaman &bull; {placedSignatures.length} Tanda Tangan Dipasang</p>
            </div>
          </div>

          {/* Quick Page Nav */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
            <button
              onClick={() => setActivePageIndex(p => Math.max(0, p - 1))}
              disabled={activePageIndex === 0}
              title="Halaman Sebelumnya"
              className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 rounded-lg disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 px-2 select-none">
              Hal {activePageIndex + 1} / {pagePreviews.length}
            </span>
            <button
              onClick={() => setActivePageIndex(p => Math.min(pagePreviews.length - 1, p + 1))}
              disabled={activePageIndex >= pagePreviews.length - 1}
              title="Halaman Selanjutnya"
              className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 rounded-lg disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isProcessing || placedSignatures.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl transition-colors text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Menyimpan...' : 'Simpan PDF'}
          </button>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Canvas Area (3 Cols) */}
          <div className="lg:col-span-3 relative flex flex-col items-center">
            <div
              ref={pageContainerRef}
              className="w-full bg-slate-100 dark:bg-slate-900/80 p-6 rounded-2xl max-h-[78vh] overflow-auto border border-slate-200 dark:border-slate-800 shadow-inner flex flex-col items-center gap-8"
            >
              {pagePreviews.map((page, index) => {
                const isActive = activePageIndex === index;

                return (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs">
                      Halaman {index + 1}
                    </span>

                    <div
                      data-page-index={index}
                      onClick={e => handlePageClick(e, index)}
                      style={{
                        width: page.width * zoom,
                        height: page.height * zoom,
                      }}
                      className={`relative bg-white shadow-xl transition-all select-none cursor-crosshair rounded-xs ${
                        isActive ? 'ring-2 ring-blue-500/40' : 'opacity-95'
                      }`}
                    >
                      <img
                        src={page.url}
                        alt={`Halaman ${index + 1}`}
                        style={{ width: page.width * zoom, height: page.height * zoom }}
                        className="pointer-events-none select-none w-full h-full"
                      />

                      {/* Placed Signatures on this page */}
                      {placedSignatures
                        .filter(p => p.pageIndex === index)
                        .map(sig => {
                          const isSelected = selectedPlacedId === sig.id;
                          const sigItem = signatures.find(s => s.id === sig.signatureId);

                          return (
                            <div
                              key={sig.id}
                              data-signature-box="true"
                              onPointerDown={e => handleBoxPointerDown(e, sig.id)}
                              style={{
                                left: sig.x * zoom,
                                top: sig.y * zoom,
                                width: sig.width * zoom,
                                height: sig.height * zoom,
                              }}
                              className={`absolute cursor-move select-none transition-all group ${
                                isSelected
                                  ? 'ring-2 ring-blue-500 shadow-xl z-20 border border-blue-400/50'
                                  : 'hover:ring-1 hover:ring-blue-400/80 z-10'
                              }`}
                            >
                              {sigItem && (
                                <img
                                  src={sigItem.dataUrl}
                                  alt="Tanda Tangan"
                                  className="w-full h-full object-contain pointer-events-none select-none"
                                />
                              )}

                              {/* Floating Actions when selected */}
                              {isSelected && (
                                <>
                                  <div className="absolute -top-3.5 -right-3.5 flex items-center gap-1 z-30">
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        duplicatePlacedSignature(sig.id);
                                      }}
                                      title="Duplikat Tanda Tangan"
                                      className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 transition-colors"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        deletePlacedSignature(sig.id);
                                      }}
                                      title="Hapus Tanda Tangan"
                                      className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>

                                  {/* Resize Handle (NWSE Corner) */}
                                  <div
                                    onPointerDown={e => handleResizePointerDown(e, sig)}
                                    title="Tarik untuk Ubah Ukuran"
                                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform z-30"
                                  />
                                </>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating Zoom Bar */}
            <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xl">
              <button
                onClick={() => setZoom(z => Math.max(0.5, Number((z - 0.1).toFixed(1))))}
                className="p-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-colors"
                title="Perkecil"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 w-12 text-center select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(2.0, Number((z + 0.1).toFixed(1))))}
                className="p-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-colors"
                title="Perbesar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(1.0)}
                className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 ml-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Right Controls Panel (1 Col) */}
          <div className="lg:col-span-1 space-y-4">
            {/* Signature Creator Card */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-sm transition-colors space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-blue-500" /> Buat Tanda Tangan
              </h3>

              {/* Mode Switcher (3 Modes) */}
              <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl gap-1">
                <button
                  onClick={() => setSignatureMode('draw')}
                  className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                    signatureMode === 'draw'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" /> Gambar
                </button>
                <button
                  onClick={() => setSignatureMode('type')}
                  className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                    signatureMode === 'type'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" /> Ketik
                </button>
                <button
                  onClick={() => setSignatureMode('upload')}
                  className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                    signatureMode === 'upload'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" /> Unggah
                </button>
              </div>

              {/* MODE 1: DRAW (GAMBAR) */}
              {signatureMode === 'draw' && (
                <div className="space-y-3">
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={240}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      className="w-full h-36 bg-white rounded-xl border border-slate-200 dark:border-slate-600 shadow-inner cursor-crosshair touch-none"
                    />
                    <button
                      onClick={clearCanvas}
                      title="Bersihkan Kanvas"
                      className="absolute top-2 right-2 p-1.5 bg-slate-100/90 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-700/80 dark:hover:bg-rose-950/60 text-slate-500 rounded-lg transition-colors shadow-xs"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Pen Options: Colors & Thickness */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      {SIGNATURE_COLORS.map(c => (
                        <button
                          key={c.hex}
                          onClick={() => setSelectedColor(c.hex)}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                          className={`w-6 h-6 rounded-full border transition-transform ${
                            selectedColor === c.hex ? 'scale-110 ring-2 ring-blue-500 ring-offset-1 border-white' : 'border-slate-300'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-lg">
                      {PEN_WIDTHS.map(w => (
                        <button
                          key={w.size}
                          onClick={() => setSelectedPenWidth(w.size)}
                          className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                            selectedPenWidth === w.size
                              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveDrawnSignature}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm shadow-blue-500/20"
                  >
                    <Plus className="w-4 h-4" /> Pasang Tanda Tangan
                  </button>
                </div>
              )}

              {/* MODE 2: TYPE (KETIK) */}
              {signatureMode === 'type' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nama / Inisial</label>
                    <input
                      type="text"
                      value={typedText}
                      onChange={e => setTypedText(e.target.value)}
                      placeholder="Ketik nama Anda di sini..."
                      className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Gaya Tulisan Tangan</label>
                    <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {TYPE_FONTS.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setSelectedTypeFont(f.id)}
                          style={{ fontFamily: f.fontFamily }}
                          className={`p-2 rounded-xl text-left border text-base transition-all ${
                            selectedTypeFont === f.id
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {typedText.trim() || 'Contoh Tanda Tangan'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Tinta:</span>
                    <div className="flex items-center gap-1.5">
                      {SIGNATURE_COLORS.map(c => (
                        <button
                          key={c.hex}
                          onClick={() => setSelectedColor(c.hex)}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                          className={`w-6 h-6 rounded-full border transition-transform ${
                            selectedColor === c.hex ? 'scale-110 ring-2 ring-blue-500 ring-offset-1 border-white' : 'border-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveTypedSignature}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm shadow-blue-500/20"
                  >
                    <Plus className="w-4 h-4" /> Pasang Tanda Tangan Ketik
                  </button>
                </div>
              )}

              {/* MODE 3: UPLOAD (UNGGAH) */}
              {signatureMode === 'upload' && (
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    ref={uploadSignatureInputRef}
                    className="hidden"
                    onChange={handleSignatureUpload}
                  />

                  <div
                    onClick={() => uploadSignatureInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Pilih Berkas Scan Tanda Tangan</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Mendukung file PNG, JPG, JPEG, WEBP</p>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={removeBg}
                      onChange={e => setRemoveBg(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    Hapus latar belakang putih secara otomatis
                  </label>
                </div>
              )}
            </div>

            {/* Gallery of Saved Signatures */}
            {signatures.length > 0 && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-sm transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Galeri Tanda Tangan Anda</h4>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
                    {signatures.length}
                  </span>
                </div>

                {/* Target Page Selector Dropdown */}
                <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Target Lembar:</span>
                  <select
                    value={targetPageSelection}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'all') {
                        setTargetPageSelection('all');
                      } else {
                        const idx = Number(val);
                        setTargetPageSelection(idx);
                        setActivePageIndex(idx);
                      }
                    }}
                    className="text-xs font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1 outline-none cursor-pointer shadow-xs"
                  >
                    {pagePreviews.map((_, i) => (
                      <option key={i} value={i}>Halaman {i + 1}</option>
                    ))}
                    {pagePreviews.length > 1 && (
                      <option value="all">Semua Halaman (Paraf / Stempel)</option>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                  {signatures.map(sig => (
                    <div
                      key={sig.id}
                      className="group flex items-center justify-between p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:border-blue-400 transition-colors"
                    >
                      <button
                        onClick={() => {
                          if (targetPageSelection === 'all') {
                            placeOnAllPages(sig);
                          } else {
                            placeSignatureOnPage(sig, Number(targetPageSelection));
                          }
                        }}
                        className="flex-1 flex items-center gap-3 text-left overflow-hidden"
                      >
                        <div className="w-16 h-10 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0">
                          <img src={sig.dataUrl} alt={sig.name} className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{sig.name}</p>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                            <Plus className="w-3 h-3" />
                            {targetPageSelection === 'all'
                              ? 'Taruh di Semua Halaman'
                              : `Taruh di Halaman ${Number(targetPageSelection) + 1}`}
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setSignatures((prev: SignatureItem[]) => prev.filter((s: SignatureItem) => s.id !== sig.id));
                          setPlacedSignatures((prev: PlacedSignature[]) => prev.filter((p: PlacedSignature) => p.signatureId !== sig.id));
                        }}
                        title="Hapus dari Galeri"
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center">
                  Tip: Anda juga bisa mengklik langsung pada lembar halaman di kanvas untuk menempelkan tanda tangan.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ToolContainer title="Tambahkan Tanda Tangan" onBack={onBack} maxWidth="max-w-7xl">
      <input
        type="file"
        accept=".pdf"
        ref={fileInputRef}
        className="hidden"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileChange(e.target.files)}
      />
      {renderContent()}
    </ToolContainer>
  );
};

export default AddSignature;
