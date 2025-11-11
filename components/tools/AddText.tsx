import React, { useState, useRef, useCallback, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, CheckCircleIcon, FilePdfIcon, TrashIcon, BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon, TextColorIcon, AddIcon, RotateIcon, ZoomInIcon, ZoomOutIcon } from '../icons';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

declare const pdfjsLib: any;

// --- TYPES AND CONSTANTS ---
interface TextElement {
  id: string;
  pageIndex: number;
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrikethrough: boolean;
  rotation: number;
}

interface PagePreview {
  url: string;
  width: number;
  height: number;
  pdfWidth: number;
  pdfHeight: number;
  rotation: number;
}

const FONT_MAP: Record<string, { name: string, url: string, italicUrl?: string, boldUrl?: string, boldItalicUrl?: string }> = {
  'Arial': { name: 'Helvetica', url: '' }, // Uses standard font
  'Helvetica': { name: 'Helvetica', url: '' }, // Uses standard font
  'Times New Roman': { name: 'TimesRoman', url: '' }, // Uses standard font
  'Roboto': { name: 'Roboto', url: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.ttf', italicUrl: 'https://fonts.gstatic.com/s/roboto/v30/KFOkCnqEu92Fr1Mu51xIIzc.ttf', boldUrl: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc-.ttf', boldItalicUrl: 'https://fonts.gstatic.com/s/roboto/v30/KFOjCnqEu92Fr1Mu51TzIzcLeuA.ttf' },
  'Open Sans': { name: 'OpenSans', url: 'https://fonts.gstatic.com/s/opensans/v34/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0C4n.ttf', italicUrl: 'https://fonts.gstatic.com/s/opensans/v34/memQYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZiyOkpaDwJWUgsjZ0C4n.ttf', boldUrl: 'https://fonts.gstatic.com/s/opensans/v34/memQYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsgH1y4n.ttf', boldItalicUrl: 'https://fonts.gstatic.com/s/opensans/v34/memQYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZiyOkpaDwJWUgsgH1y4n.ttf' },
  'Calibri': { name: 'Carlito', url: 'https://fonts.gstatic.com/s/carlito/v15/syky-zN0bQlfFpRjMAba.ttf', italicUrl: 'https://fonts.gstatic.com/s/carlito/v15/sykx-zN0bQlfFpRjM-hhcQ.ttf', boldUrl: 'https://fonts.gstatic.com/s/carlito/v15/sykh-zN0bQlfFpRjM-TEhr4.ttf', boldItalicUrl: 'https://fonts.gstatic.com/s/carlito/v15/syki-zN0bQlfFpRjM-Tqj3Y-Vg.ttf' },
  'Verdana': { name: 'Arimo', url: 'https://fonts.gstatic.com/s/arimo/v28/P5sfzZCDf9_T_3cV7NCUECyoxNk37cxc.ttf', italicUrl: 'https://fonts.gstatic.com/s/arimo/v28/P5sdzZCDf9_T_10c3i9MeUylxNk37cxc.ttf', boldUrl: 'https://fonts.gstatic.com/s/arimo/v28/P5sazZCDf9_T_3cV7NCUECyoxNk31c9v-Q.ttf', boldItalicUrl: 'https://fonts.gstatic.com/s/arimo/v28/P5sczZCDf9_T_10c3i9MeUylxNk31c9v-Q.ttf' },
  'Garamond': { name: 'EBGaramond', url: 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-6_RUA4V-e6y01Q.ttf', italicUrl: 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGFmQSNjdsmc35JDF1K5GRwUjcd6_RUA4V-e6y01Q.ttf', boldUrl: 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGWmQSNjdsmc35JDF1K5G5w-iBE-7DPuGi-6_RUA4V-e6y01Q.ttf', boldItalicUrl: 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGWmQSNjdsmc35JDF1K5GRw-iBE-7DPuGi-6_RUA4V-e6y01Q.ttf' },
  'Futura': { name: 'Jost', url: 'https://fonts.gstatic.com/s/jost/v14/92zPtBhkbBHi2vU5-Q4.ttf', italicUrl: 'https://fonts.gstatic.com/s/jost/v14/92zJtBhkbBHi2vUW7a8B.ttf', boldUrl: 'https://fonts.gstatic.com/s/jost/v14/92zM-BhkbBHi2vUW7a8B.ttf', boldItalicUrl: 'https://fonts.gstatic.com/s/jost/v14/92zO-BhkbBHi2vUW7a8B.ttf' },
  'Trajan': { name: 'Cinzel', url: 'https://fonts.gstatic.com/s/cinzel/v19/8vIJ7ww64mDbTV1D4q82.ttf', boldUrl: 'https://fonts.gstatic.com/s/cinzel/v19/8vIK7ww64mDbTV1D4q82.ttf' },
};
const fontCache = new Map<string, ArrayBuffer>();

// --- Helper Functions ---
const fetchAndCacheFont = async (url: string) => {
  if (fontCache.has(url)) return fontCache.get(url);
  const fontBytes = await fetch(url).then(res => res.arrayBuffer());
  fontCache.set(url, fontBytes);
  return fontBytes;
};

// --- Main Component ---
const AddText: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pagePreviews, setPagePreviews] = useState<PagePreview[]>([]);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const resetState = useCallback(() => {
    setFile(null);
    setPagePreviews([]);
    setTextElements([]);
    setSelectedElementId(null);
    setZoom(1.0);
    setIsProcessing(false);
    setProcessingMessage('');
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
  }, [outputUrl]);

  const handleFileChange = async (selectedFile: File | null) => {
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;
    resetState();
    setFile(selectedFile);
    setIsProcessing(true);
    setProcessingMessage('Membaca PDF...');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const previews: PagePreview[] = [];

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        setProcessingMessage(`Merender halaman ${i}/${pdfDoc.numPages}...`);
        const page = await pdfDoc.getPage(i);
        const pdfPageSize = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for better quality
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        previews.push({
            url: canvas.toDataURL('image/png'),
            width: viewport.width,
            height: viewport.height,
            pdfWidth: pdfPageSize.width,
            pdfHeight: pdfPageSize.height,
            rotation: 0,
        });
      }
      setPagePreviews(previews);
    } catch (error) {
      console.error("Gagal memuat PDF:", error);
      alert("Gagal memuat file PDF. Pastikan file tidak rusak.");
      resetState();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddText = (pageIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
     // Hanya tambahkan teks jika mengklik langsung pada 'kanvas', bukan pada elemen teks yang ada.
    if (e.target !== e.currentTarget) {
        return;
    }

    const { offsetX, offsetY } = e.nativeEvent;

    const clickX = offsetX / zoom;
    const clickY = offsetY / zoom;

    const page = pagePreviews[pageIndex];
    if(!page) return;
    
    const newElementWidth = 150;
    const newElementHeight = 16 * 1.4; // fontSize * lineHeight
    
    // Pastikan kotak teks baru tetap berada dalam batas halaman.
    const clampedX = Math.max(0, Math.min(clickX, page.width - newElementWidth));
    const clampedY = Math.max(0, Math.min(clickY - (newElementHeight / 2), page.height - newElementHeight));

    const newElement: TextElement = {
        id: `text-${Date.now()}`,
        pageIndex,
        text: 'Ketik disini...',
        x: clampedX,
        y: clampedY,
        width: newElementWidth,
        fontSize: 16,
        lineHeight: 1.4,
        fontFamily: 'Arial',
        color: '#000000',
        isBold: false,
        isItalic: false,
        isUnderline: false,
        isStrikethrough: false,
        rotation: 0,
    };
    setTextElements(prev => [...prev, newElement]);
    setSelectedElementId(newElement.id);
  };

  const handleAddTextButtonClick = () => {
    if (!editorRef.current) return;
    // Temukan kanvas halaman pertama
    const firstPageCanvas = editorRef.current.querySelector(`[data-page-index="0"] [data-page-canvas="true"]`);
    if (firstPageCanvas) {
        const fakeEvent = {
            currentTarget: firstPageCanvas,
            target: firstPageCanvas, // Pastikan target sama dengan currentTarget
            nativeEvent: { offsetX: 50 * zoom, offsetY: 50 * zoom } // Posisi default
        } as any;
        handleAddText(0, fakeEvent);
    }
  };
  
  const handleRotateAllPages = () => {
    setPagePreviews(previews => previews.map(p => {
      return { ...p, rotation: (p.rotation + 90) % 360 };
    }));
  };
  
  const updateTextElement = (id: string, newProps: Partial<TextElement>) => {
    setTextElements(prev => prev.map(el => el.id === id ? { ...el, ...newProps } : el));
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
        e.preventDefault();
        const zoomFactor = -e.deltaY * 0.005;
        setZoom(prevZoom => Math.max(0.2, Math.min(3, prevZoom + zoomFactor)));
    }
  };
  
  const handleSave = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProcessingMessage('Menyiapkan dokumen...');

    try {
        const existingPdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        
        const uniqueFonts = [...new Set(textElements.map(el => el.fontFamily))];
        const embeddedFonts: Record<string, any> = {};

        for (const font of uniqueFonts) {
            setProcessingMessage(`Menanamkan font: ${font}...`);
            const fontInfo = FONT_MAP[font];
            if (!fontInfo) continue;
            
            const isStandard = !fontInfo.url;
            if(isStandard) {
                const baseFontName = fontInfo.name;
                const italicSuffix = baseFontName === 'TimesRoman' ? 'Italic' : 'Oblique';
                
                embeddedFonts[font] = {
                    normal: await pdfDoc.embedFont(StandardFonts[baseFontName as keyof typeof StandardFonts]),
                    bold: await pdfDoc.embedFont(StandardFonts[`${baseFontName}Bold` as keyof typeof StandardFonts]),
                    italic: await pdfDoc.embedFont(StandardFonts[`${baseFontName}${italicSuffix}` as keyof typeof StandardFonts]),
                    boldItalic: await pdfDoc.embedFont(StandardFonts[`${baseFontName}Bold${italicSuffix}` as keyof typeof StandardFonts]),
                }
            } else {
                 const [normal, bold, italic, boldItalic] = await Promise.all([
                    fetchAndCacheFont(fontInfo.url),
                    fontInfo.boldUrl ? fetchAndCacheFont(fontInfo.boldUrl) : null,
                    fontInfo.italicUrl ? fetchAndCacheFont(fontInfo.italicUrl) : null,
                    fontInfo.boldItalicUrl ? fetchAndCacheFont(fontInfo.boldItalicUrl) : null,
                ]);
                embeddedFonts[font] = {
                    normal: await pdfDoc.embedFont(normal!),
                    bold: bold ? await pdfDoc.embedFont(bold) : null,
                    italic: italic ? await pdfDoc.embedFont(italic) : null,
                    boldItalic: boldItalic ? await pdfDoc.embedFont(boldItalic) : null,
                };
            }
        }
        
        const pages = pdfDoc.getPages();
        
        pages.forEach((page, index) => {
            const pagePreview = pagePreviews[index];
            if(pagePreview && pagePreview.rotation !== 0){
                page.setRotation(degrees((page.getRotation().angle + pagePreview.rotation) % 360));
            }
        });

        textElements.forEach((el, index) => {
            setProcessingMessage(`Menambahkan teks ${index + 1}/${textElements.length}...`);
            const pagePreview = pagePreviews[el.pageIndex];
            if (!pagePreview) return;
            
            const page = pages[el.pageIndex];
            const { width: pageWidth, height: pageHeight } = page.getSize();
            const scaleX = pageWidth / pagePreview.pdfWidth;
            const scaleY = pageHeight / pagePreview.pdfHeight;

            const x = el.x * (page.getWidth() / pagePreview.width);
            const y = page.getHeight() - (el.y * (page.getHeight() / pagePreview.height));
            const fontSize = el.fontSize * (page.getWidth() / pagePreview.width);
            
            const color = el.color;
            const [r, g, b] = color.match(/\w\w/g)!.map(x => parseInt(x, 16) / 255);

            const fontInfo = embeddedFonts[el.fontFamily];
            let font = fontInfo.normal;
            if (el.isBold && el.isItalic && fontInfo.boldItalic) font = fontInfo.boldItalic;
            else if (el.isBold && fontInfo.bold) font = fontInfo.bold;
            else if (el.isItalic && fontInfo.italic) font = fontInfo.italic;

            page.drawText(el.text, { x, y, font, size: fontSize, color: rgb(r, g, b), lineHeight: el.lineHeight * fontSize, rotate: degrees(el.rotation) });
            
            if (el.isUnderline || el.isStrikethrough) {
                const textWidth = font.widthOfTextAtSize(el.text, fontSize);
                const textHeight = font.heightAtSize(fontSize);
                const lineYOffset = el.isStrikethrough ? textHeight * el.lineHeight * 0.35 : -textHeight * el.lineHeight * 0.1;

                const angleInRad = (el.rotation * Math.PI) / 180;
                const cosAngle = Math.cos(angleInRad);
                const sinAngle = Math.sin(angleInRad);

                const startXRelRotated = lineYOffset * sinAngle;
                const startYRelRotated = -lineYOffset * cosAngle;

                const endXRelRotated = textWidth * cosAngle + lineYOffset * sinAngle;
                const endYRelRotated = textWidth * sinAngle - lineYOffset * cosAngle;

                page.drawLine({
                    start: { x: x + startXRelRotated, y: y + startYRelRotated },
                    end: { x: x + endXRelRotated, y: y + endYRelRotated },
                    thickness: 1,
                    color: rgb(r, g, b),
                });
            }
        });
        
        setProcessingMessage('Menyimpan PDF...');
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);

    } catch (error) {
        console.error("Gagal menyimpan PDF:", error);
        alert("Terjadi kesalahan saat menyimpan PDF.");
    } finally {
        setIsProcessing(false);
    }
  };
  
  const selectedElement = textElements.find(el => el.id === selectedElementId);

  const renderContent = () => {
    if (outputUrl) {
      return (
         <div className="text-center text-slate-400 flex flex-col items-center gap-6 animate-fade-in">
          <CheckCircleIcon />
          <h3 className="text-2xl font-bold text-slate-100">PDF Berhasil Diperbarui!</h3>
          <p className="text-lg">Teks Anda telah berhasil ditambahkan.</p>
          <a href={outputUrl} download={`${file?.name.replace('.pdf', '')}-edited.pdf`} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg">
            <DownloadIcon />
            Unduh PDF
          </a>
          <button onClick={resetState} className="font-medium text-slate-400 hover:text-blue-400 transition-colors">
            Edit PDF Lain
          </button>
        </div>
      );
    }

    if (isProcessing && !file) { // Initial loading state
      return <div className="text-center text-slate-400"><p>{processingMessage}</p></div>
    }

    if (!file) {
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
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors"
            >
            Pilih File
            </button>
        </div>
      );
    }
    
    // Editor View
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-700/50 p-3 rounded-lg sticky top-20 z-40 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <FilePdfIcon/>
                    <span className="font-medium text-slate-300 truncate" title={file.name}>{file.name}</span>
                    <button onClick={handleRotateAllPages} className="p-1 text-slate-400 hover:text-blue-400 rounded-full transition-colors" title="Putar Semua Halaman">
                        <RotateIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={resetState} className="p-1 text-slate-400 hover:text-red-400 rounded-full transition-colors" title="Hapus PDF dan mulai lagi">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </div>
                <div className="flex items-center gap-4">
                     <button onClick={handleAddTextButtonClick} className="flex items-center gap-2 text-sm bg-slate-600 hover:bg-slate-500 text-slate-200 font-semibold py-2 px-3 rounded-md transition-colors">
                        <AddIcon className="w-5 h-5"/> Tambah Teks
                    </button>
                    <button onClick={handleSave} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-bold py-2 px-5 rounded-md transition-colors flex items-center justify-center">
                        {isProcessing ? 'Memproses...' : 'Simpan PDF'}
                    </button>
                </div>
            </div>

             {selectedElement && (
                <div className="sticky top-[160px] z-40 bg-slate-900/80 backdrop-blur-lg p-2 rounded-lg border border-slate-700 flex flex-wrap items-center justify-center gap-2 md:gap-4 animate-fade-in-fast">
                   <select value={selectedElement.fontFamily} onChange={e => updateTextElement(selectedElement.id, { fontFamily: e.target.value })} className="bg-slate-800 border-slate-700 text-xs rounded p-1.5 focus:ring-blue-500 focus:border-blue-500">
                      {Object.keys(FONT_MAP).map(font => <option key={font} value={font}>{font}</option>)}
                   </select>
                   <input type="number" value={selectedElement.fontSize} onChange={e => updateTextElement(selectedElement.id, { fontSize: parseInt(e.target.value, 10) || 12 })} className="bg-slate-800 border-slate-700 text-xs rounded p-1.5 w-16 focus:ring-blue-500 focus:border-blue-500"/>
                   <div className="flex items-center gap-1">
                      <button onClick={() => updateTextElement(selectedElement.id, { isBold: !selectedElement.isBold })} className={`p-1.5 rounded ${selectedElement.isBold ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700'}`}><BoldIcon/></button>
                      <button onClick={() => updateTextElement(selectedElement.id, { isItalic: !selectedElement.isItalic })} className={`p-1.5 rounded ${selectedElement.isItalic ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700'}`}><ItalicIcon/></button>
                      <button onClick={() => updateTextElement(selectedElement.id, { isUnderline: !selectedElement.isUnderline })} className={`p-1.5 rounded ${selectedElement.isUnderline ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700'}`}><UnderlineIcon/></button>
                      <button onClick={() => updateTextElement(selectedElement.id, { isStrikethrough: !selectedElement.isStrikethrough })} className={`p-1.5 rounded ${selectedElement.isStrikethrough ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700'}`}><StrikethroughIcon/></button>
                   </div>
                   <label className="flex items-center p-1.5 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer">
                      <TextColorIcon/>
                      <input type="color" value={selectedElement.color} onChange={e => updateTextElement(selectedElement.id, { color: e.target.value })} className="opacity-0 w-0 h-0"/>
                   </label>
                   <div className="flex items-center gap-1 bg-slate-800 rounded">
                      <label htmlFor="text-rotation" className="p-1.5 hover:bg-slate-700 rounded-l"><RotateIcon/></label>
                      <input id="text-rotation" type="number" value={selectedElement.rotation} onChange={e => updateTextElement(selectedElement.id, { rotation: parseInt(e.target.value, 10) % 360 || 0 })} className="bg-transparent text-xs w-14 p-1.5 focus:outline-none"/>
                   </div>
                   <button onClick={() => setTextElements(prev => prev.filter(el => el.id !== selectedElementId))} className="p-1.5 rounded bg-slate-800 hover:bg-red-500/50 text-red-400"><TrashIcon className="w-5 h-5"/></button>
                </div>
            )}
            
            <div 
              className="bg-slate-900/50 rounded-lg p-4 lg:p-8 overflow-auto border border-slate-700"
              onWheel={handleWheel}
            >
                <div className="flex flex-col items-center gap-8" ref={editorRef}>
                    {isProcessing && pagePreviews.length === 0 && <p className="text-slate-400">{processingMessage}</p>}
                    {pagePreviews.map((page, index) => {
                        const isRotated = page.rotation === 90 || page.rotation === 270;
                        const containerWidth = (isRotated ? page.height : page.width) * zoom;
                        const containerHeight = (isRotated ? page.width : page.height) * zoom;

                        return (
                            <div
                                key={index}
                                data-page-index={index}
                                className="relative shadow-lg group bg-black/20"
                                style={{
                                    width: containerWidth,
                                    height: containerHeight,
                                    transition: 'width 0.3s ease, height 0.3s ease',
                                }}
                            >
                                <div
                                    className="absolute top-1/2 left-1/2"
                                    style={{
                                        width: page.width * zoom,
                                        height: page.height * zoom,
                                        transform: `translate(-50%, -50%) rotate(${page.rotation}deg)`,
                                        transformOrigin: 'center center',
                                        transition: 'transform 0.3s ease',
                                    }}
                                >
                                    <div 
                                        data-page-canvas="true"
                                        className="relative w-full h-full"
                                        onClick={(e) => handleAddText(index, e)}
                                    >
                                        <img src={page.url} alt={`Page ${index + 1}`} className="w-full h-full" />
                                        {textElements.filter(el => el.pageIndex === index).map(el => (
                                            <EditableText
                                                key={el.id}
                                                element={el}
                                                isSelected={selectedElementId === el.id}
                                                onSelect={() => setSelectedElementId(el.id)}
                                                onUpdate={updateTextElement}
                                                zoom={zoom}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            
             <div className="fixed bottom-6 right-6 z-50 bg-slate-800/80 backdrop-blur-lg p-2 rounded-lg border border-slate-700 flex items-center gap-2 shadow-xl">
                <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 rounded hover:bg-slate-700"><ZoomOutIcon className="w-6 h-6"/></button>
                <button onClick={() => setZoom(1)} className="text-sm font-bold w-16 text-center p-2 rounded hover:bg-slate-700">{Math.round(zoom * 100)}%</button>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2 rounded hover:bg-slate-700"><ZoomInIcon className="w-6 h-6"/></button>
            </div>
        </div>
    );
  };
  
  return (
    <ToolContainer title="Tambahkan Teks" onBack={onBack}>
        <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} />
        {renderContent()}
    </ToolContainer>
  );
};

// --- Sub-component for Editable Text ---
interface EditableTextProps {
    element: TextElement;
    isSelected: boolean;
    onSelect: () => void;
    onUpdate: (id: string, props: Partial<TextElement>) => void;
    zoom: number;
}
const EditableText: React.FC<EditableTextProps> = ({ element, isSelected, onSelect, onUpdate, zoom }) => {
    const textRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, elStartX: 0, elStartY: 0 });

    useEffect(() => {
        if(isSelected && textRef.current) {
            textRef.current.focus();
        }
    }, [isSelected]);
    
    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect();
        dragRef.current = {
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            elStartX: element.x,
            elStartY: element.y,
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!dragRef.current.isDragging) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        onUpdate(element.id, { x: dragRef.current.elStartX + dx / zoom, y: dragRef.current.elStartY + dy / zoom });
    };

    const handleMouseUp = () => {
        dragRef.current.isDragging = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
    
    return (
        <div
            ref={textRef}
            data-text-element="true"
            contentEditable
            suppressContentEditableWarning
            onMouseDown={handleMouseDown}
            onClick={e => e.stopPropagation()}
            onBlur={e => onUpdate(element.id, { text: e.currentTarget.textContent || '' })}
            style={{
                position: 'absolute',
                left: element.x * zoom,
                top: element.y * zoom,
                fontFamily: `'${FONT_MAP[element.fontFamily]?.name || 'Arial'}', sans-serif`,
                fontSize: element.fontSize * zoom,
                fontWeight: element.isBold ? 'bold' : 'normal',
                fontStyle: element.isItalic ? 'italic' : 'normal',
                textDecoration: `${element.isUnderline ? 'underline' : ''} ${element.isStrikethrough ? 'line-through' : ''}`.trim() || 'none',
                color: element.color,
                lineHeight: element.lineHeight,
                minWidth: '20px',
                width: 'auto',
                whiteSpace: 'pre-wrap',
                cursor: 'move',
                outline: 'none',
                border: isSelected ? '1px dashed #3b82f6' : '1px solid transparent',
                transform: `rotate(${element.rotation}deg)`,
                transformOrigin: 'top left',
            }}
        >
            {element.text}
        </div>
    );
};

export default AddText;