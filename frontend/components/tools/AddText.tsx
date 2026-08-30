
import React, { useState, useRef, useCallback, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, CheckCircleIcon, FilePdfIcon, TrashIcon, BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon, TextColorIcon, AddIcon, RotateIcon, ZoomInIcon, ZoomOutIcon, TextBoxBackgroundIcon, TextIcon } from '../icons';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { useToast } from '../../contexts/ToastContext';
import FileUploader from '../common/FileUploader';

// Global declaration for pdfjsLib from CDN
declare const pdfjsLib: any;

interface PdfFileWithBuffer {
  file: File;
  buffer: ArrayBuffer;
}

interface PagePreview {
  url: string;
  width: number;
  height: number;
}

interface TextBox {
  id: string;
  text: string;
  x: number;
  y: number;
  pageIndex: number;
  fontSize: number;
  fontFamily: string; // 'Helvetica', 'Times Roman', 'Courier'
  color: string; // Hex color
  isBold: boolean;
  isItalic: boolean;
  isUnderline?: boolean; // Not natively supported by simple pdf-lib drawText, simulated or ignored for now
  isStrikethrough?: boolean; // Not natively supported
  backgroundColor?: string; // Hex color or null/undefined
}

const AddText: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [fileWithBuffer, setFileWithBuffer] = useState<PdfFileWithBuffer | null>(null);
  const [pagePreviews, setPagePreviews] = useState<PagePreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const resetState = useCallback(() => {
    setFileWithBuffer(null);
    setPagePreviews([]);
    setIsProcessing(false);
    setProcessingMessage('');
    setTextBoxes([]);
    setSelectedBoxId(null);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
  }, [outputUrl]);

  const handleFileChange = async (files: FileList | null) => {
    const selectedFile = files ? files[0] : null;
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
        const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for better quality editing
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
        previews.push({
          url: canvas.toDataURL('image/png'),
          width: viewport.width,
          height: viewport.height
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

  const addTextBox = () => {
    if (pagePreviews.length === 0) return;
    const newId = `box-${Date.now()}`;
    const newBox: TextBox = {
      id: newId,
      text: 'Teks Baru',
      x: 50,
      y: 50,
      pageIndex: 0, // Default to first page
      fontSize: 24,
      fontFamily: 'Helvetica',
      color: '#000000',
      isBold: false,
      isItalic: false,
    };
    setTextBoxes(prev => [...prev, newBox]);
    setSelectedBoxId(newId);
  };

  const updateTextBox = (id: string, updates: Partial<TextBox>) => {
    setTextBoxes(prev => prev.map(box => box.id === id ? { ...box, ...updates } : box));
  };

  const deleteTextBox = (id: string) => {
      setTextBoxes(prev => prev.filter(box => box.id !== id));
      if (selectedBoxId === id) setSelectedBoxId(null);
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBoxId(id);
    
    // Get cursor offset relative to the box
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    // Adjust for zoom
    const offsetX = (e.clientX - rect.left) / zoom;
    const offsetY = (e.clientY - rect.top) / zoom;
    
    setDragState({ id, offsetX, offsetY });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        
        setTextBoxes(prev => prev.map(box => {
            if (box.id === dragState.id) {
                // Find the page element to calculate relative position correctly
                const pageEl = document.querySelector(`[data-page-index="${box.pageIndex}"]`) as HTMLElement;
                if (!pageEl) return box;
                const pageRect = pageEl.getBoundingClientRect();
                
                const newX = (e.clientX - pageRect.left) / zoom - dragState.offsetX;
                const newY = (e.clientY - pageRect.top) / zoom - dragState.offsetY;

                return { ...box, x: newX, y: newY };
            }
            return box;
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


  const handleSave = async () => {
    if (!fileWithBuffer) return;
    setIsProcessing(true);
    setProcessingMessage('Menyimpan PDF...');

    try {
        const pdfBytes = fileWithBuffer.buffer;
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        // Embed fonts
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
        const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
        
        const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

        const pages = pdfDoc.getPages();

        for (const box of textBoxes) {
            const page = pages[box.pageIndex];
            const preview = pagePreviews[box.pageIndex];
            
            // Calculate scale between preview and actual PDF
            const { width: pageWidth, height: pageHeight } = page.getSize();
            const scaleX = pageWidth / preview.width;
            const scaleY = pageHeight / preview.height;

            // Select Font
            let font = helveticaFont;
            if (box.fontFamily === 'Times Roman') font = timesFont;
            else if (box.fontFamily === 'Courier') font = courierFont;
            else {
                // Helvetica logic for bold/italic
                if (box.isBold && box.isItalic) font = helveticaBoldOblique;
                else if (box.isBold) font = helveticaBold;
                else if (box.isItalic) font = helveticaOblique;
            }

            // Parse Color
            const r = parseInt(box.color.slice(1, 3), 16) / 255;
            const g = parseInt(box.color.slice(3, 5), 16) / 255;
            const b = parseInt(box.color.slice(5, 7), 16) / 255;

            // Draw Background if exists (Simple rect)
            if (box.backgroundColor) {
                const textWidth = font.widthOfTextAtSize(box.text, box.fontSize * scaleY);
                const textHeight = font.heightAtSize(box.fontSize * scaleY);
                const bgR = parseInt(box.backgroundColor.slice(1, 3), 16) / 255;
                const bgG = parseInt(box.backgroundColor.slice(3, 5), 16) / 255;
                const bgB = parseInt(box.backgroundColor.slice(5, 7), 16) / 255;
                
                page.drawRectangle({
                    x: (box.x * scaleX) - 2,
                    y: pageHeight - (box.y * scaleY) - (textHeight) + (box.fontSize * scaleY * 0.2), // Adjust for baseline
                    width: textWidth + 4,
                    height: textHeight + 4,
                    color: rgb(bgR, bgG, bgB),
                });
            }

            // Draw Text
            // coordinate system in pdf-lib starts from bottom-left
            // box.y is from top-left of preview
            page.drawText(box.text, {
                x: box.x * scaleX,
                y: pageHeight - (box.y * scaleY) - (box.fontSize * scaleY), // Adjust y to bottom baseline approx
                size: box.fontSize * scaleY,
                font: font,
                color: rgb(r, g, b),
            });
        }

        const finalPdfBytes = await pdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        setOutputUrl(URL.createObjectURL(blob));
        addToast('PDF berhasil disimpan!', 'success');

    } catch (error) {
        console.error("Gagal menyimpan PDF:", error);
        addToast("Terjadi kesalahan saat menyimpan PDF.", 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const selectedBox = textBoxes.find(b => b.id === selectedBoxId);

  const renderContent = () => {
    // 1. Success State
    if (outputUrl) {
       return (
        <div className="text-center text-gray-600 dark:text-gray-300 flex flex-col items-center gap-6 animate-fade-in">
          <CheckCircleIcon />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">PDF Berhasil Disimpan!</h3>
          <a href={outputUrl} download={`${fileWithBuffer?.file.name.replace('.pdf', '')}-edited.pdf`} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg shadow-md shadow-blue-200 dark:shadow-none">
            <DownloadIcon /> Unduh PDF
          </a>
          <button onClick={resetState} className="font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
            Edit PDF Lainnya
          </button>
        </div>
      );
    }

     // 2. Loading State
     if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="text-lg text-gray-800 dark:text-gray-200 font-semibold">{processingMessage}</p>
        </div>
      );
    }

    // 3. Upload State
    if (!fileWithBuffer) {
      return (
        <FileUploader 
            onFileSelect={handleFileChange} 
            label="Pilih PDF untuk Menambah Teks"
            description="Seret & lepas file PDF di sini untuk mulai mengedit"
        />
      );
    }

    // 4. Editor State
    return (
        <div className="flex flex-col gap-4">
             {/* Toolbar Header */}
             <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-2 rounded-lg flex items-center justify-between gap-2 border border-gray-200 dark:border-slate-700 flex-wrap shadow-sm transition-colors sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <FilePdfIcon />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px] font-medium">{fileWithBuffer.file.name}</span>
                    <button onClick={resetState} title="Hapus File" className="p-1 text-gray-400 hover:text-red-500 transition-colors"><TrashIcon /></button>
                </div>
                <div className="flex gap-2">
                    <button onClick={addTextBox} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors">
                        <AddIcon className="w-4 h-4" /> Tambah Teks
                    </button>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-md transition-colors text-sm shadow-sm">
                        Simpan PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Main Editor Canvas */}
                <div className="lg:col-span-2 relative">
                    <div className="bg-gray-100 dark:bg-slate-900 p-4 rounded-lg max-h-[75vh] overflow-auto border border-gray-200 dark:border-slate-700 shadow-inner transition-colors scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-slate-600">
                        <div className="flex flex-col items-center gap-6" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                            {pagePreviews.map((page, index) => (
                                <div key={index} data-page-index={index} className="relative shadow-lg bg-white" style={{ width: page.width, height: page.height }}>
                                    <img src={page.url} alt={`Page ${index + 1}`} width={page.width} height={page.height} className="pointer-events-none select-none" />
                                    
                                    {/* Text Boxes Overlay */}
                                    {textBoxes.filter(b => b.pageIndex === index).map((box) => (
                                        <div
                                            key={box.id}
                                            onMouseDown={(e) => handleMouseDown(e, box.id)}
                                            className={`absolute cursor-move hover:ring-1 hover:ring-blue-300 ${selectedBoxId === box.id ? 'ring-2 ring-blue-500 z-10' : 'z-0'}`}
                                            style={{
                                                left: box.x,
                                                top: box.y,
                                                fontSize: box.fontSize,
                                                fontFamily: box.fontFamily === 'Times Roman' ? 'Times New Roman, serif' : box.fontFamily === 'Courier' ? 'Courier New, monospace' : 'Helvetica, Arial, sans-serif',
                                                color: box.color,
                                                fontWeight: box.isBold ? 'bold' : 'normal',
                                                fontStyle: box.isItalic ? 'italic' : 'normal',
                                                backgroundColor: box.backgroundColor || 'transparent',
                                                padding: '2px 4px',
                                                whiteSpace: 'nowrap',
                                                userSelect: 'none',
                                            }}
                                        >
                                            {box.text}
                                            {/* Delete Button for Selected Box */}
                                            {selectedBoxId === box.id && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteTextBox(box.id); }}
                                                    className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm hover:bg-red-600 transition-colors"
                                                >
                                                    &times;
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                     {/* Floating Zoom Controls */}
                     <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-1.5 rounded-full border border-gray-200 dark:border-slate-700 shadow-lg">
                        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"><ZoomOutIcon className="w-4 h-4"/></button>
                        <span className="text-xs text-gray-700 dark:text-gray-200 font-bold w-10 text-center">{(zoom * 100).toFixed(0)}%</span>
                        <button onClick={() => setZoom(z => Math.min(2.0, z + 0.1))} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"><ZoomInIcon className="w-4 h-4"/></button>
                    </div>
                </div>

                {/* Right Panel: Text Properties */}
                <div className="lg:col-span-1">
                    {selectedBox ? (
                         <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5 rounded-xl shadow-sm transition-colors sticky top-20">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <TextIcon className="w-5 h-5 text-blue-500"/> Edit Teks
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Konten Teks</label>
                                    <input 
                                        type="text" 
                                        value={selectedBox.text} 
                                        onChange={(e) => updateTextBox(selectedBox.id, { text: e.target.value })}
                                        className="w-full p-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Ukuran Font</label>
                                        <input 
                                            type="number" 
                                            value={selectedBox.fontSize} 
                                            onChange={(e) => updateTextBox(selectedBox.id, { fontSize: Number(e.target.value) })}
                                            className="w-full p-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                         <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Jenis Font</label>
                                         <select 
                                            value={selectedBox.fontFamily}
                                            onChange={(e) => updateTextBox(selectedBox.id, { fontFamily: e.target.value })}
                                            className="w-full p-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                         >
                                            <option value="Helvetica">Helvetica</option>
                                            <option value="Times Roman">Times Roman</option>
                                            <option value="Courier">Courier</option>
                                         </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Gaya & Warna</label>
                                    <div className="flex flex-wrap gap-2">
                                        <button 
                                            onClick={() => updateTextBox(selectedBox.id, { isBold: !selectedBox.isBold })}
                                            className={`p-2 rounded border ${selectedBox.isBold ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600'}`}
                                            title="Bold"
                                        >
                                            <BoldIcon />
                                        </button>
                                        <button 
                                            onClick={() => updateTextBox(selectedBox.id, { isItalic: !selectedBox.isItalic })}
                                            className={`p-2 rounded border ${selectedBox.isItalic ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600'}`}
                                            title="Italic"
                                        >
                                            <ItalicIcon />
                                        </button>
                                        
                                        <div className="flex items-center gap-2 ml-auto">
                                            <input 
                                                type="color" 
                                                value={selectedBox.color}
                                                onChange={(e) => updateTextBox(selectedBox.id, { color: e.target.value })}
                                                className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                                                title="Warna Teks"
                                            />
                                            <div className="flex items-center gap-1" title="Latar Belakang">
                                                 <input 
                                                    type="checkbox" 
                                                    checked={!!selectedBox.backgroundColor}
                                                    onChange={(e) => updateTextBox(selectedBox.id, { backgroundColor: e.target.checked ? '#FFFF00' : undefined })}
                                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                                />
                                                {selectedBox.backgroundColor && (
                                                     <input 
                                                        type="color" 
                                                        value={selectedBox.backgroundColor}
                                                        onChange={(e) => updateTextBox(selectedBox.id, { backgroundColor: e.target.value })}
                                                        className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                                                    />
                                                )}
                                                {!selectedBox.backgroundColor && <TextBoxBackgroundIcon className="w-5 h-5 text-gray-400"/>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <button 
                                        onClick={() => deleteTextBox(selectedBox.id)}
                                        className="w-full mt-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <TrashIcon className="w-4 h-4"/> Hapus Teks
                                    </button>
                                </div>
                            </div>
                         </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-700 p-8 rounded-xl text-center flex flex-col items-center justify-center h-64 opacity-70">
                            <TextIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Klik pada teks untuk mengedit properti atau tambahkan teks baru.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  };

  return (
    <ToolContainer title="Tambahkan Teks ke PDF" onBack={onBack} maxWidth="max-w-7xl">
      <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files)} />
      {renderContent()}
    </ToolContainer>
  );
};

export default AddText;
