import React, { useState, useRef, useCallback, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, CheckCircleIcon, TrashIcon, DrawIcon, UploadImageIcon, ZoomInIcon, ZoomOutIcon, FilePdfIcon } from '../icons';
import { PDFDocument, rgb } from 'pdf-lib';
import { useToast } from '../../contexts/ToastContext';

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
  pdfWidth: number;
  pdfHeight: number;
}

interface Signature {
  id: string;
  dataUrl: string; // base64 encoded image
  width: number;
  height: number;
}

interface PlacedSignature {
  id: string;
  signatureId: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

type SignatureMode = 'draw' | 'upload';

// --- MAIN COMPONENT ---
const AddSignature: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [fileWithBuffer, setFileWithBuffer] = useState<PdfFileWithBuffer | null>(null);
  const [pagePreviews, setPagePreviews] = useState<PagePreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [placedSignatures, setPlacedSignatures] = useState<PlacedSignature[]>([]);
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('draw');
  const [zoom, setZoom] = useState(1.0);

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSignatureInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#000000'); // Black, Blue, Red
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // --- State for smooth dragging & resizing ---
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
    setZoom(1.0);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
  }, [outputUrl]);

  const handleFileChange = async (selectedFile: File | null) => {
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;
    resetState();
    setIsProcessing(true);
    setProcessingMessage('Membaca file dan merender pratinjau...');
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
          pdfWidth: page.view[2] - page.view[0],
          pdfHeight: page.view[3] - page.view[1],
        });
      }
      setPagePreviews(previews);
    } catch (error) {
      console.error("Gagal memuat PDF:", error);
      addToast("Gagal memuat file PDF. File mungkin rusak.", 'error');
      resetState();
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const editorContainer = editorContainerRef.current;
    if (!editorContainer) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) { // This is the key for pinch-zoom on trackpads and ctrl+scroll on mice
        e.preventDefault();
        
        // Adjust zoom based on wheel delta
        const zoomAmount = e.deltaY * -0.001; // Small multiplier for smooth zoom
        setZoom(prevZoom => {
          const newZoom = prevZoom + zoomAmount;
          return Math.max(0.2, Math.min(3.0, newZoom)); // Clamp between 0.2 and 3.0
        });
      }
    };

    editorContainer.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      if (editorContainer) {
        editorContainer.removeEventListener('wheel', handleWheel);
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Drawing Logic ---
  const getMousePos = (canvas: HTMLCanvasElement, e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.nativeEvent instanceof MouseEvent) {
        clientX = e.nativeEvent.clientX;
        clientY = e.nativeEvent.clientY;
    } else {
        const touch = e.nativeEvent as TouchEvent;
        clientX = touch.touches[0].clientX;
        clientY = touch.touches[0].clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const pos = getMousePos(canvas, e);
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = drawingColor;
    ctx.lineWidth = 5; // Disesuaikan untuk kanvas resolusi tinggi
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  
  const saveSignature = () => {
    if (signatureMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const blank = document.createElement('canvas');
      blank.width = canvas.width;
      blank.height = canvas.height;
      if (canvas.toDataURL() === blank.toDataURL()) {
        addToast("Silakan gambar tanda tangan sebelum menyimpan.", 'warning');
        return;
      }

      const dataUrl = canvas.toDataURL('image/png');
      const newSig: Signature = {
        id: `sig-${Date.now()}`,
        dataUrl,
        width: 150,
        height: 60, // Pertahankan rasio aspek kanvas resolusi tinggi (1200:480 -> 2.5:1)
      };
      setSignatures(prev => [...prev, newSig]);
      clearCanvas();
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const newSig: Signature = {
          id: `sig-${Date.now()}`,
          dataUrl,
          width: 150,
          height: 150 / aspectRatio,
        };
        setSignatures(prev => [...prev, newSig]);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };
  
  // --- Placing Logic ---
  const placeSignatureOnPage = (signature: Signature, pageIndex: number) => {
    const page = pagePreviews[pageIndex];
    if (!page) return;
    const newPlaced: PlacedSignature = {
      id: `placed-${Date.now()}`,
      signatureId: signature.id,
      pageIndex,
      x: (page.width / 2) - (signature.width / 2),
      y: (page.height / 2) - (signature.height / 2),
      width: signature.width,
      height: signature.height,
    };
    setPlacedSignatures(prev => [...prev, newPlaced]);
    setSelectedPlacedId(newPlaced.id);
  };

  const handleMouseDownOnPlaced = (e: React.MouseEvent, sig: PlacedSignature) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedPlacedId(sig.id);
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const offsetX = (e.clientX - rect.left) / zoom;
      const offsetY = (e.clientY - rect.top) / zoom;
      setDragState({ id: sig.id, offsetX, offsetY });
  };
  
  const handleResizeStart = (e: React.MouseEvent, sig: PlacedSignature) => {
    e.preventDefault();
    e.stopPropagation(); // Important: Prevent triggering the drag handler
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

    const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();

        setPlacedSignatures(prev => prev.map(sig => {
            if (sig.id === dragState.id) {
                const pageEl = document.querySelector(`[data-page-index="${sig.pageIndex}"]`) as HTMLElement;
                if (!pageEl) return sig;
                const pageRect = pageEl.getBoundingClientRect();

                const newX = (e.clientX - pageRect.left) / zoom - dragState.offsetX;
                const newY = (e.clientY - pageRect.top) / zoom - dragState.offsetY;

                return { ...sig, x: newX, y: newY };
            }
            return sig;
        }));
    };

    const handleMouseUp = () => {
        setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, zoom]);

  useEffect(() => {
    if (!resizeState) return;

    const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        setPlacedSignatures(prev => prev.map(sig => {
            if (sig.id === resizeState.id) {
                const dx = e.clientX - resizeState.startX;
                const newWidth = Math.max(30, resizeState.startWidth + (dx / zoom));
                const aspectRatio = resizeState.startWidth / resizeState.startHeight;
                const newHeight = newWidth / aspectRatio;
                return { ...sig, width: newWidth, height: newHeight };
            }
            return sig;
        }));
    };

    const handleMouseUp = () => {
        setResizeState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeState, zoom]);

  // --- Save Final PDF ---
  const handleSave = async () => {
    if (!fileWithBuffer) return;
    setIsProcessing(true);
    setProcessingMessage('Menyematkan tanda tangan...');
    try {
      const pdfBytes = fileWithBuffer.buffer;
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      for (const placed of placedSignatures) {
        const signature = signatures.find(s => s.id === placed.signatureId);
        if (!signature) continue;

        const page = pages[placed.pageIndex];
        const preview = pagePreviews[placed.pageIndex];
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const scaleX = pageWidth / preview.width;
        const scaleY = pageHeight / preview.height;

        let imageBytes;
        let image;
        if (signature.dataUrl.startsWith('data:image/png')) {
          imageBytes = await fetch(signature.dataUrl).then(res => res.arrayBuffer());
          image = await pdfDoc.embedPng(imageBytes);
        } else { // Assume JPG or other
          imageBytes = await fetch(signature.dataUrl).then(res => res.arrayBuffer());
          image = await pdfDoc.embedJpg(imageBytes);
        }
        
        page.drawImage(image, {
          x: placed.x * scaleX,
          y: pageHeight - (placed.y * scaleY) - (placed.height * scaleY),
          width: placed.width * scaleX,
          height: placed.height * scaleY,
        });
      }
      
      const finalPdfBytes = await pdfDoc.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      setOutputUrl(URL.createObjectURL(blob));
      addToast('PDF berhasil ditandatangani!', 'success');
    } catch (error) {
      console.error("Gagal menyimpan PDF:", error);
      addToast("Terjadi kesalahan saat menyimpan PDF.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderContent = () => {
    if (outputUrl) {
       return (
        <div className="text-center text-slate-400 flex flex-col items-center gap-6 animate-fade-in">
          <CheckCircleIcon />
          <h3 className="text-2xl font-bold text-slate-100">PDF Berhasil Ditandatangani!</h3>
          <a href={outputUrl} download={`${fileWithBuffer?.file.name.replace('.pdf', '')}-ditandatangani.pdf`} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg">
            <DownloadIcon /> Unduh PDF
          </a>
          <button onClick={resetState} className="font-medium text-slate-400 hover:text-blue-400 transition-colors">
            Tandatangani PDF Lainnya
          </button>
        </div>
      );
    }

     if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <svg className="animate-spin h-10 w-10 text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="text-lg text-slate-300 font-semibold">{processingMessage}</p>
        </div>
      );
    }

    if (!fileWithBuffer) {
      return (
         <div
            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors duration-300 ${isDragOver ? 'border-blue-500 bg-slate-700/50' : 'border-slate-600 hover:border-slate-500'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileChange(e.dataTransfer.files[0]); }}
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

    // Main editor view
    return (
        <div className="flex flex-col gap-4">
            {/* Top Toolbar */}
            <div className="bg-slate-900/70 backdrop-blur-sm p-2 rounded-lg flex items-center justify-between gap-2 border border-slate-700 flex-wrap">
                <div className="flex items-center gap-2">
                    <FilePdfIcon />
                    <span className="text-sm text-slate-300 truncate max-w-[150px]">{fileWithBuffer.file.name}</span>
                    <button onClick={resetState} title="Hapus PDF" className="p-1 text-slate-400 hover:text-red-400"><TrashIcon /></button>
                </div>
                 <button onClick={handleSave} disabled={placedSignatures.length === 0} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                    Simpan PDF
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left/Main Panel: Editor */}
                <div className="lg:col-span-2 relative">
                    <div ref={editorContainerRef} className="bg-slate-900/50 p-4 rounded-lg max-h-[70vh] overflow-auto" data-editor-container>
                        <div className="flex justify-center items-start">
                            <div className="flex flex-col items-center gap-4" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                                {pagePreviews.map((page, index) => (
                                    <div key={index} data-page-index={index} className="relative shadow-lg" style={{ width: page.width, height: page.height }}>
                                        <img src={page.url} alt={`Page ${index + 1}`} width={page.width} height={page.height} />
                                        {placedSignatures.filter(s => s.pageIndex === index).map(sig => (
                                            <div
                                                key={sig.id}
                                                onMouseDown={(e) => handleMouseDownOnPlaced(e, sig)}
                                                className={`absolute cursor-move border-2 ${selectedPlacedId === sig.id ? 'border-blue-500 border-dashed' : 'border-transparent hover:border-blue-500/50'}`}
                                                style={{ left: sig.x, top: sig.y, width: sig.width, height: sig.height }}
                                            >
                                                <img src={signatures.find(s => s.id === sig.signatureId)?.dataUrl} className="w-full h-full" alt="Placed Signature" />
                                                {selectedPlacedId === sig.id && (
                                                    <>
                                                        <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPlacedSignatures(prev => prev.filter(ps => ps.id !== sig.id));
                                                            setSelectedPlacedId(null);
                                                        }}
                                                        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-0.5 w-6 h-6 flex items-center justify-center z-10"
                                                        >
                                                        &times;
                                                        </button>
                                                        <div 
                                                            onMouseDown={(e) => handleResizeStart(e, sig)}
                                                            className="absolute -bottom-2 -right-2 bg-blue-500 w-4 h-4 rounded-full cursor-nwse-resize border-2 border-slate-900 z-10"
                                                            title="Ubah Ukuran"
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-slate-800/80 backdrop-blur-md p-1.5 rounded-lg border border-slate-700">
                        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md"><ZoomOutIcon /></button>
                        <span className="text-sm text-slate-300 font-medium w-10 text-center">{(zoom * 100).toFixed(0)}%</span>
                        <button onClick={() => setZoom(z => Math.min(3.0, z + 0.1))} className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md"><ZoomInIcon /></button>
                    </div>
                </div>

                {/* Right Panel: Controls */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                        <h3 className="font-bold text-slate-200 mb-4">Buat Tanda Tangan</h3>
                        <div className="flex bg-slate-800 p-1 rounded-lg mb-4">
                            <button onClick={() => setSignatureMode('draw')} className={`w-1/2 py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 ${signatureMode === 'draw' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
                                <DrawIcon className="w-5 h-5"/> Gambar
                            </button>
                            <button onClick={() => setSignatureMode('upload')} className={`w-1/2 py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 ${signatureMode === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
                            <UploadImageIcon className="w-5 h-5"/> Unggah
                            </button>
                        </div>
                        {signatureMode === 'draw' && (
                            <div>
                                <canvas
                                    ref={canvasRef}
                                    width="1200"
                                    height="480"
                                    className="bg-white rounded-md cursor-crosshair w-full h-auto"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2">
                                    <button onClick={() => setDrawingColor('#000000')} className={`w-6 h-6 rounded-full bg-black border-2 ${drawingColor === '#000000' ? 'border-blue-400' : 'border-transparent'}`}></button>
                                    <button onClick={() => setDrawingColor('#0000FF')} className={`w-6 h-6 rounded-full bg-blue-600 border-2 ${drawingColor === '#0000FF' ? 'border-blue-400' : 'border-transparent'}`}></button>
                                    <button onClick={() => setDrawingColor('#FF0000')} className={`w-6 h-6 rounded-full bg-red-600 border-2 ${drawingColor === '#FF0000' ? 'border-blue-400' : 'border-transparent'}`}></button>
                                    </div>
                                    <button onClick={clearCanvas} className="text-sm text-slate-400 hover:text-white">Hapus</button>
                                </div>
                            </div>
                        )}
                        {signatureMode === 'upload' && (
                            <div className="text-center">
                                <input type="file" accept="image/png, image/jpeg" ref={uploadSignatureInputRef} className="hidden" onChange={handleSignatureUpload} />
                                <button onClick={() => uploadSignatureInputRef.current?.click()} className="w-full bg-slate-600 hover:bg-slate-500 text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors">
                                    Pilih Gambar
                                </button>
                                <p className="text-xs text-slate-500 mt-2">Gunakan gambar dengan latar belakang transparan untuk hasil terbaik.</p>
                            </div>
                        )}
                        <button onClick={saveSignature} className="w-full bg-slate-600 hover:bg-slate-500 text-slate-100 font-bold py-2 px-4 rounded-lg mt-4">Simpan Tanda Tangan</button>
                    </div>

                    {signatures.length > 0 && (
                    <div className="mt-6 bg-slate-700/50 p-4 rounded-lg">
                        <h3 className="font-bold text-slate-200 mb-2">Tanda Tangan Anda</h3>
                        <p className="text-xs text-slate-400 mb-4">Klik tanda tangan untuk menambahkannya ke halaman PDF.</p>
                        <div className="space-y-2">
                        {signatures.map(sig => (
                            <div key={sig.id} className="bg-slate-800 p-2 rounded-lg flex items-center justify-between">
                                <button onClick={() => placeSignatureOnPage(sig, 0)} className="bg-white p-1 rounded-md flex-grow flex justify-center items-center h-16">
                                    <img src={sig.dataUrl} alt="Signature" className="max-h-full max-w-full" />
                                </button>
                                <button onClick={() => setSignatures(prev => prev.filter(s => s.id !== sig.id))} className="ml-2 p-1 text-slate-500 hover:text-red-400">
                                    <TrashIcon />
                                </button>
                            </div>
                        ))}
                        </div>
                    </div>
                    )}
                </div>
            </div>
        </div>
    );
  };

  return (
    <ToolContainer title="Tambahkan Tanda Tangan" onBack={onBack} maxWidth="max-w-7xl">
      <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} />
      {renderContent()}
    </ToolContainer>
  );
};

export default AddSignature;