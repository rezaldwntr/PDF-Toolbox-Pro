import React, { useState, useRef, useCallback, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, CheckCircleIcon, FilePdfIcon, TrashIcon, BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon, TextColorIcon, AddIcon, RotateIcon, ZoomInIcon, ZoomOutIcon, TextBoxBackgroundIcon } from '../icons';
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
  height: number;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  color: string;
  backgroundColor: string; // 'transparent' or hex color
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

const FONT_MAP: Record<string, { name: string, url?: string, italicUrl?: string, boldUrl?: string, boldItalicUrl?: string }> = {
  'Arial': { name: 'Helvetica' },
  'Helvetica': { name: 'Helvetica' },
  'Times New Roman': { name: 'TimesRoman' },
  'Roboto': { name: 'Roboto', url: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.ttf', italicUrl: 'https://fonts.gstatic.com/s/roboto/v30/KFOkCnqEu92Fr1Mu51xIIzc.ttf', boldUrl: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc-.ttf', boldItalicUrl: 'https://fonts.gstatic.com/s/roboto/v30/KFOjCnqEu92Fr1Mu51TzIzcLeuA.ttf' },
  'Open Sans': { name: 'OpenSans', url: 'https://fonts.gstatic.com/s/opensans/v34/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0C4n.ttf', italicUrl: 'https://fonts.gstatic.com/s/opensans/v34/memQYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZiyOkpaDwJWUgsjZ0C4n.ttf', boldUrl: 'https://fonts.gstatic.com/s/opensans/v34/memQYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsgH1y4n.ttf', boldItalicUrl: 'https://fonts.gstatic.com/s/opensans/v34/memQYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZiyOkpaDwJWUgsgH1y4n.ttf' },
  'Calibri': { name: 'Carlito', url: 'https://fonts.gstatic.com/s/carlito/v15/syky-zN0bQlfFpRjMAba.ttf', italicUrl: 'https://fonts.gstatic.com/s/carlito/v15/sykx-zN0bQlfFpRjM-hhcQ.ttf', boldUrl: 'https://fonts.gstatic.com/s/carlito/v15/sykh-zN0bQlfFpRjM-TEhr4.ttf', boldItalicUrl: 'https://fonts.gstatic.com/s/carlito/v15/syki-zN0bQlfFpRjM-Tqj3Y-Vg.ttf' },
  'Verdana': { name: 'Arimo', url: 'https://fonts.gstatic.com/s/arimo/v28/P5sfzZCDf9_T_3cV7NCUECyoxNk37cxc.ttf', italicUrl: 'https://fonts.gstatic.com/s/arimo/v28/P5sdzZCDf9_T_10c3i9MeUylxNk37cxc.ttf', boldUrl: 'https://fonts.gstatic.com/s/arimo/v28/P5sazZCDf9_T_3cV7NCUECyoxNk31c9v-Q.ttf', boldItalicUrl: 'https://fonts.gstatic.com/s/arimo/v28/P5sczZCDf9_T_10c3i9MeUylxNk31c9v-Q.ttf' },
  'Garamond': { name: 'EBGaramond', url: 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-6_RUA4V-e6y01Q.ttf', italicUrl: 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGFmQSNjdsmc35JDF1K5GRwUjcd6_RUA4V-e6y01Q.ttf' },
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

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  } : { r: 0, g: 0, b: 0 };
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
        setProcessingMessage(`Merender halaman ${i} dari ${pdfDoc.numPages}...`);
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        
        previews.push({
          url: canvas.toDataURL('image/png'),
          width: viewport.width,
          height: viewport.height,
          pdfWidth: page.view[2] - page.view[0],
          pdfHeight: page.view[3] - page.view[1],
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
      setProcessingMessage('');
    }
  };

  const handleAddText = useCallback(() => {
    const firstPage = pagePreviews[0];
    if (!firstPage) return;

    const newText: TextElement = {
        id: `text-${Date.now()}`,
        pageIndex: 0,
        text: 'Ketik disini...',
        x: firstPage.width / 2 - 75,
        y: firstPage.height / 2 - 10,
        width: 150,
        height: 24, // default height
        fontSize: 16,
        lineHeight: 1.2,
        fontFamily: 'Arial',
        color: '#000000',
        backgroundColor: 'transparent',
        isBold: false,
        isItalic: false,
        isUnderline: false,
        isStrikethrough: false,
        rotation: 0,
    };
    setTextElements(prev => [...prev, newText]);
    setSelectedElementId(newText.id);
  }, [pagePreviews]);
  
  const updateSelectedElement = (updates: Partial<TextElement>) => {
    if (!selectedElementId) return;
    setTextElements(prev => prev.map(el => el.id === selectedElementId ? { ...el, ...updates } : el));
  };

  const handleDeleteElement = () => {
    if (!selectedElementId) return;
    setTextElements(prev => prev.filter(el => el.id !== selectedElementId));
    setSelectedElementId(null);
  };
  
  const handleRotateAllPages = () => {
      setPagePreviews(previews => previews.map(p => ({
          ...p,
          rotation: (p.rotation + 90) % 360,
      })));
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('elementId', id);
      const target = e.currentTarget as HTMLDivElement;
      const rect = target.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      e.dataTransfer.setData('offsetX', String(offsetX));
      e.dataTransfer.setData('offsetY', String(offsetY));
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, pageIndex: number) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('elementId');
      const offsetX = parseFloat(e.dataTransfer.getData('offsetX'));
      const offsetY = parseFloat(e.dataTransfer.getData('offsetY'));
      
      const pageElement = e.currentTarget as HTMLElement;
      const pageBounds = pageElement.getBoundingClientRect();

      const newX = (e.clientX - pageBounds.left) / zoom - offsetX;
      const newY = (e.clientY - pageBounds.top) / zoom - offsetY;

      setTextElements(prev => prev.map(el => el.id === id ? { ...el, x: newX, y: newY, pageIndex } : el));
  };

  const handleSave = async () => {
      if (!file) return;
      setIsProcessing(true);
      setProcessingMessage('Mempersiapkan dokumen...');
      try {
          const pdfBytes = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const pages = pdfDoc.getPages();

          for (let i = 0; i < pagePreviews.length; i++) {
              const preview = pagePreviews[i];
              const page = pages[i];
              if(preview.rotation !== 0) {
                  const currentRotation = page.getRotation().angle;
                  page.setRotation(degrees(currentRotation + preview.rotation));
              }
          }

          setProcessingMessage('Menyematkan font...');
          const embeddedFonts: Record<string, any> = {};
          for (const el of textElements) {
              const fontInfo = FONT_MAP[el.fontFamily];
              const variantKey = `${fontInfo.name}-${el.isBold}-${el.isItalic}`;
              if(embeddedFonts[variantKey]) continue;

              if (fontInfo.url) { // Custom font
                  let urlToFetch = fontInfo.url;
                  if (el.isBold && el.isItalic && fontInfo.boldItalicUrl) urlToFetch = fontInfo.boldItalicUrl;
                  else if (el.isBold && fontInfo.boldUrl) urlToFetch = fontInfo.boldUrl;
                  else if (el.isItalic && fontInfo.italicUrl) urlToFetch = fontInfo.italicUrl;
                  
                  const fontBytes = await fetchAndCacheFont(urlToFetch);
                  embeddedFonts[variantKey] = await pdfDoc.embedFont(fontBytes!);
              } else { // Standard font
                  let fontKey: keyof typeof StandardFonts;
                  const baseFont = fontInfo.name;

                  if (baseFont === 'TimesRoman') {
                      if (el.isBold && el.isItalic) fontKey = 'TimesRomanBoldItalic';
                      else if (el.isBold) fontKey = 'TimesRomanBold';
                      else if (el.isItalic) fontKey = 'TimesRomanItalic';
                      else fontKey = 'TimesRoman';
                  } else if (baseFont === 'Helvetica') { // For Helvetica
                      if (el.isBold && el.isItalic) fontKey = 'HelveticaBoldOblique';
                      else if (el.isBold) fontKey = 'HelveticaBold';
                      else if (el.isItalic) fontKey = 'HelveticaOblique';
                      else fontKey = 'Helvetica';
                  } else { 
                      if (el.isBold && el.isItalic) fontKey = `${baseFont}BoldOblique` as keyof typeof StandardFonts;
                      else if (el.isBold) fontKey = `${baseFont}Bold` as keyof typeof StandardFonts;
                      else if (el.isItalic) fontKey = `${baseFont}Oblique` as keyof typeof StandardFonts;
                      else fontKey = baseFont as keyof typeof StandardFonts;
                  }
                  embeddedFonts[variantKey] = pdfDoc.embedStandardFont(StandardFonts[fontKey]);
              }
          }

          setProcessingMessage('Menambahkan elemen teks...');
          for (const el of textElements) {
              const page = pages[el.pageIndex];
              const preview = pagePreviews[el.pageIndex];
              const { width: pageWidth, height: pageHeight } = page.getSize();
              const scaleX = pageWidth / preview.width;
              const scaleY = pageHeight / preview.height;

              // Draw background if needed
              if (el.backgroundColor !== 'transparent') {
                const bgColor = hexToRgb(el.backgroundColor);
                page.drawRectangle({
                  x: el.x * scaleX,
                  y: pageHeight - (el.y + el.height) * scaleY,
                  width: el.width * scaleX,
                  height: el.height * scaleY,
                  color: rgb(bgColor.r, bgColor.g, bgColor.b),
                });
              }

              const fontInfo = FONT_MAP[el.fontFamily];
              const variantKey = `${fontInfo.name}-${el.isBold}-${el.isItalic}`;
              const font = embeddedFonts[variantKey];
              const color = hexToRgb(el.color);
              
              const options = {
                  font,
                  x: el.x * scaleX,
                  y: pageHeight - (el.y * scaleY) - (el.fontSize * scaleY),
                  size: el.fontSize * scaleY,
                  color: rgb(color.r, color.g, color.b),
                  lineHeight: el.fontSize * scaleY * el.lineHeight,
                  rotate: degrees(-el.rotation),
                  maxWidth: el.width * scaleX,
              };
              page.drawText(el.text, options);
              
              if (el.isUnderline || el.isStrikethrough) {
                const textWidth = font.widthOfTextAtSize(el.text, el.fontSize * scaleY);
                const textHeight = font.heightAtSize(el.fontSize * scaleY);
                const lineYOffset = el.isStrikethrough ? textHeight / 3 : -textHeight / 8;
                const lineThickness = (el.fontSize * scaleY) / 15;
                const lineOptions = { color: options.color, thickness: lineThickness };

                const angleRad = -el.rotation * (Math.PI / 180);
                const cosA = Math.cos(angleRad);
                const sinA = Math.sin(angleRad);
                
                const startX = options.x;
                const startY = options.y + lineYOffset;
                const endX = startX + textWidth * cosA;
                const endY = startY + textWidth * sinA;

                page.drawLine({ start: { x: startX, y: startY }, end: { x: endX, y: endY }, ...lineOptions });
              }
          }

          setProcessingMessage('Menyimpan PDF...');
          const finalPdfBytes = await pdfDoc.save();
          const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
          setOutputUrl(URL.createObjectURL(blob));
      } catch (error) {
          console.error("Gagal menyimpan PDF:", error);
          alert("Terjadi kesalahan saat menyimpan PDF.");
      } finally {
          setIsProcessing(false);
      }
  };

  const selectedTextElement = textElements.find(el => el.id === selectedElementId);

  const renderContent = () => {
    if (outputUrl) {
      return (
        <div className="text-center text-slate-400 flex flex-col items-center gap-6 animate-fade-in">
          <CheckCircleIcon />
          <h3 className="text-2xl font-bold text-slate-100">PDF Berhasil Disimpan!</h3>
          <a href={outputUrl} download={`${file?.name.replace('.pdf', '')}-diedit.pdf`} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg">
            <DownloadIcon /> Unduh PDF
          </a>
          <button onClick={resetState} className="font-medium text-slate-400 hover:text-blue-400 transition-colors">
            Edit PDF Lainnya
          </button>
        </div>
      );
    }

    if (isProcessing) {
      return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
              <svg className="animate-spin h-10 w-10 text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <p className="text-lg text-slate-300 font-semibold">{processingMessage}</p>
              <p className="text-slate-500">Mohon tunggu...</p>
          </div>
      );
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
            <button onClick={() => fileInputRef.current?.click()} className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors">
                Pilih File
            </button>
        </div>
      );
    }

    // Editor View
    return (
      <div className="flex flex-col gap-4">
        {/* Top Toolbar */}
        <div className="bg-slate-900/70 backdrop-blur-sm p-2 rounded-lg flex items-center justify-between gap-2 border border-slate-700 flex-wrap">
          <div className="flex items-center gap-2">
            <FilePdfIcon />
            <span className="text-sm text-slate-300 truncate max-w-[150px]">{file.name}</span>
            <button onClick={resetState} title="Hapus PDF" className="p-1 text-slate-400 hover:text-red-400"><TrashIcon /></button>
            <button onClick={handleRotateAllPages} title="Putar PDF" className="p-1 text-slate-400 hover:text-blue-400"><RotateIcon /></button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleAddText} className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2"><AddIcon className="w-5 h-5"/> Tambah Teks</button>
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">Simpan PDF</button>
          </div>
        </div>

        {/* Floating Element Toolbar */}
        {selectedTextElement && (
            <div className="bg-slate-900/80 backdrop-blur-md p-2 rounded-lg border border-slate-700 flex items-center gap-2 flex-wrap justify-center sticky top-2 z-20">
              <select value={selectedTextElement.fontFamily} onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })} className="bg-slate-800 border-slate-600 text-sm rounded-md p-1.5">
                {Object.keys(FONT_MAP).map(font => <option key={font} value={font}>{font}</option>)}
              </select>
              <input type="number" value={selectedTextElement.fontSize} onChange={(e) => updateSelectedElement({ fontSize: parseInt(e.target.value) || 1 })} className="w-16 bg-slate-800 border-slate-600 text-sm rounded-md p-1.5" />
              <button onClick={() => updateSelectedElement({ isBold: !selectedTextElement.isBold })} className={`p-1.5 rounded-md ${selectedTextElement.isBold ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`}><BoldIcon /></button>
              <button onClick={() => updateSelectedElement({ isItalic: !selectedTextElement.isItalic })} className={`p-1.5 rounded-md ${selectedTextElement.isItalic ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`}><ItalicIcon /></button>
              <button onClick={() => updateSelectedElement({ isUnderline: !selectedTextElement.isUnderline })} className={`p-1.5 rounded-md ${selectedTextElement.isUnderline ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`}><UnderlineIcon /></button>
              <button onClick={() => updateSelectedElement({ isStrikethrough: !selectedTextElement.isStrikethrough })} className={`p-1.5 rounded-md ${selectedTextElement.isStrikethrough ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`}><StrikethroughIcon /></button>
              <label className="p-1.5 rounded-md hover:bg-slate-700 cursor-pointer relative"><TextColorIcon /><input type="color" value={selectedTextElement.color} onChange={(e) => updateSelectedElement({ color: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" /></label>
              <button onClick={() => updateSelectedElement({ backgroundColor: selectedTextElement.backgroundColor === 'transparent' ? '#FFFFFF' : 'transparent' })} className={`p-1.5 rounded-md ${selectedTextElement.backgroundColor !== 'transparent' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`} title="Latar Belakang Teks"><TextBoxBackgroundIcon /></button>
              <div className="flex items-center gap-1"><RotateIcon /><input type="number" value={selectedTextElement.rotation} onChange={(e) => updateSelectedElement({ rotation: parseInt(e.target.value) || 0 })} className="w-16 bg-slate-800 border-slate-600 text-sm rounded-md p-1.5" /></div>
              <button onClick={handleDeleteElement} className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400"><TrashIcon /></button>
            </div>
        )}

        {/* PDF Editor */}
        <div className="relative">
            <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-[70vh] flex justify-center items-start">
            <div className="flex flex-col items-center gap-4" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                {pagePreviews.map((page, index) => (
                <div
                    key={index}
                    data-page-index={index}
                    className="relative shadow-lg"
                    style={{ width: page.width, height: page.height, transform: `rotate(${page.rotation}deg)` }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => setSelectedElementId(null)}
                >
                    <img src={page.url} alt={`Page ${index + 1}`} width={page.width} height={page.height} />
                    {textElements.filter(t => t.pageIndex === index).map(text => (
                    <textarea
                        key={text.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, text.id)}
                        onClick={(e) => { e.stopPropagation(); setSelectedElementId(text.id); }}
                        value={text.text}
                        onChange={(e) => {
                            const target = e.currentTarget;
                            // Reset height to auto to correctly calculate new scrollHeight
                            target.style.height = 'auto';
                            const newHeight = target.scrollHeight;
                            target.style.height = `${newHeight}px`;
                            
                            setTextElements(prev => prev.map(el => el.id === text.id ? {...el, text: e.target.value, height: newHeight / zoom} : el));
                        }}
                        className={`absolute bg-transparent focus:outline-none p-0 border-2 resize-x overflow-hidden whitespace-pre-wrap ${selectedElementId === text.id ? 'border-blue-500 border-dashed' : 'border-transparent hover:border-blue-500/50'}`}
                        style={{
                        left: text.x, top: text.y,
                        width: text.width,
                        height: text.height,
                        fontFamily: FONT_MAP[text.fontFamily].name,
                        fontSize: text.fontSize,
                        color: text.color,
                        backgroundColor: text.backgroundColor,
                        fontWeight: text.isBold ? 'bold' : 'normal',
                        fontStyle: text.isItalic ? 'italic' : 'normal',
                        textDecoration: `${text.isUnderline ? 'underline' : ''} ${text.isStrikethrough ? 'line-through' : ''}`.trim(),
                        lineHeight: text.lineHeight,
                        transform: `rotate(${text.rotation}deg)`,
                        }}
                    />
                    ))}
                </div>
                ))}
            </div>
            </div>
             <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-slate-800/80 backdrop-blur-md p-1.5 rounded-lg border border-slate-700">
                <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md"><ZoomOutIcon /></button>
                <span className="text-sm text-slate-300 font-medium w-10 text-center">{(zoom * 100).toFixed(0)}%</span>
                <button onClick={() => setZoom(z => z + 0.1)} className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md"><ZoomInIcon /></button>
            </div>
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

export default AddText;