import React, { useState, useRef, useCallback, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, CheckCircleIcon, FilePdfIcon, TrashIcon } from '../icons';
import { PDFDocument } from 'pdf-lib';
import { useToast } from '../../contexts/ToastContext';

declare const pdfjsLib: any;

type CompressionMode = 'recommended' | 'advanced';

interface CompressResult {
  url: string;
  originalSize: number;
  newSize: number;
}

interface PdfFileWithBuffer {
  file: File;
  buffer: ArrayBuffer;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper function to create a compressed PDF with a specific quality by rasterizing all pages
const createPdfWithQuality = async (pdfjsDoc: any, jpegQuality: number): Promise<Uint8Array> => {
    const newPdfDoc = await PDFDocument.create();
    for (let i = 1; i <= pdfjsDoc.numPages; i++) {
        const page = await pdfjsDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // 1.5 scale is approx 108 DPI. Let's use 2.0 for ~150 DPI
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        const jpegDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
        const jpegImageBytes = await fetch(jpegDataUrl).then(res => res.arrayBuffer());
        const jpegImage = await newPdfDoc.embedJpg(jpegImageBytes);

        const newPage = newPdfDoc.addPage([jpegImage.width, jpegImage.height]);
        newPage.drawImage(jpegImage, {
            x: 0,
            y: 0,
            width: newPage.getWidth(),
            height: newPage.getHeight(),
        });
    }
    return newPdfDoc.save();
};


const CompressPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [fileWithBuffer, setFileWithBuffer] = useState<PdfFileWithBuffer | null>(null);
  const [compressionMode, setCompressionMode] = useState<CompressionMode>('recommended');
  const [targetSize, setTargetSize] = useState<number>(1024);
  const [targetUnit, setTargetUnit] = useState<'KB' | 'MB'>('KB');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('Mengompres...');
  const [result, setResult] = useState<CompressResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [recommendedResultBytes, setRecommendedResultBytes] = useState<Uint8Array | null>(null);

  const resetState = useCallback(() => {
    setFileWithBuffer(null);
    setIsProcessing(false);
    setProcessingMessage('Mengompres...');
    if (result) {
      URL.revokeObjectURL(result.url);
    }
    setResult(null);
    setEstimatedSize(null);
    setRecommendedResultBytes(null);
    setIsEstimating(false);
  }, [result]);

  const handleFileChange = async (selectedFile: File | null) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      resetState();
      setIsProcessing(true);
      setProcessingMessage('Membaca file besar, mohon tunggu...');
      try {
        const buffer = await selectedFile.arrayBuffer();
        setFileWithBuffer({ file: selectedFile, buffer });
      } catch (e) {
        addToast('Gagal membaca file.', 'error');
        resetState();
      } finally {
        setIsProcessing(false);
      }
    }
  };
  
  // Pre-calculate the result for "Recommended" mode as soon as a file is loaded.
  useEffect(() => {
    setEstimatedSize(null);
    setRecommendedResultBytes(null);

    const calculateRecommendedResult = async () => {
      if (!fileWithBuffer) return;

      setIsEstimating(true);
      try {
        // This logic implements a sophisticated, balanced compression pipeline inspired by professional tools,
        // adapted for a web-based environment. It mirrors the "Profile 1: Fast & Balanced" approach.

        // Pass 1: Audit & Analysis (Per-Page)
        // We audit each page to determine if it's primarily image-based (like a scan) or text/vector-based.
        // This allows us to apply the correct compression strategy to each page individually.
        // We use the presence of text content as a heuristic: no text strongly implies a scanned page.
        
        const arrayBuffer = fileWithBuffer.buffer;
        const sourcePdfDoc = await PDFDocument.load(arrayBuffer.slice(0));
        const pdfjsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
        
        const newPdfDoc = await PDFDocument.create();
        
        for (let i = 0; i < sourcePdfDoc.getPageCount(); i++) {
          const pdfjsPage = await pdfjsDoc.getPage(i + 1);
          const textContent = await pdfjsPage.getTextContent();
          
          // AUDIT RESULT: If page has no text, treat as scanned (isScanned == true).
          if (textContent.items.length === 0) {
            // Pass 2 (for Scanned Pages): Asset Compression (Lossy)
            // This mirrors the behavior of Ghostscript's `-dPDFSETTINGS=/ebook` preset.
            // We downsample the image to a web-friendly resolution and convert it to an efficient JPEG.
            
            const TARGET_DPI = 150;
            const scale = TARGET_DPI / 72; // PDF's default DPI is 72
            
            const viewport = pdfjsPage.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await pdfjsPage.render({ canvasContext: context, viewport: viewport }).promise;

            const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.75); // Balanced quality (medium-high)
            const jpegImageBytes = await fetch(jpegDataUrl).then(res => res.arrayBuffer());
            const jpegImage = await newPdfDoc.embedJpg(jpegImageBytes);

            const newPage = newPdfDoc.addPage([jpegImage.width, jpegImage.height]);
            newPage.drawImage(jpegImage, {
              x: 0,
              y: 0,
              width: newPage.getWidth(),
              height: newPage.getHeight(),
            });

          } else { 
            // Pass 2 (for Text/Vector Pages): Cleanup (Lossless)
            // For pages with text, we avoid rasterization to maintain text clarity,
            // searchability, and selection capabilities. We copy the page as is.
            const [copiedPage] = await newPdfDoc.copyPages(sourcePdfDoc, [i]);
            newPdfDoc.addPage(copiedPage);
          }
        }
        
        // Pass 3 & 4: Font Subsetting & Structural Rewrite
        // When pdf-lib saves the document, it performs a structural rewrite, similar to what qpdf does.
        // It cleans up object references and recompresses streams. Any custom fonts that might be added
        // would be automatically subsetted by pdf-lib, but for existing fonts, we rely on the lossless copy.
        const compressedBytes = await newPdfDoc.save();
        setEstimatedSize(compressedBytes.byteLength);
        
        if (compressedBytes.byteLength < fileWithBuffer.file.size) {
            setRecommendedResultBytes(compressedBytes);
        } else {
            setRecommendedResultBytes(null);
        }

      } catch (error) {
        console.error("Gagal menghitung hasil kompresi yang direkomendasikan:", error);
        setEstimatedSize(null);
        setRecommendedResultBytes(null);
        addToast("Tidak dapat menganalisis PDF untuk kompresi.", 'warning');
      } finally {
        setIsEstimating(false);
      }
    };

    calculateRecommendedResult();
  }, [fileWithBuffer, addToast]);
  
  const handleCompress = async () => {
    if (!fileWithBuffer) return;

    setIsProcessing(true);

    try {
        const arrayBuffer = fileWithBuffer.buffer;
        let finalPdfBytes: Uint8Array;

        if (compressionMode === 'recommended') {
            setProcessingMessage('Menyelesaikan kompresi...');
            if (recommendedResultBytes) {
                finalPdfBytes = recommendedResultBytes;
            } else {
                addToast("Kompresi tidak akan mengurangi ukuran file. Proses dibatalkan.", 'info');
                setIsProcessing(false);
                return;
            }
        } else { // Advanced Mode
            const pdfjsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
            const targetSizeBytes = targetUnit === 'MB' ? targetSize * 1024 * 1024 : targetSize * 1024;
            if (targetSizeBytes >= fileWithBuffer.file.size) {
                addToast("Ukuran target harus lebih kecil dari ukuran file asli.", 'warning');
                setIsProcessing(false);
                return;
            }

            setProcessingMessage('Mencari kualitas optimal...');
            let bestPdfBytes: Uint8Array | null = null;
            let minDiff = Infinity;
            
            let minQuality = 0.01;
            let maxQuality = 1.0;

            for (let i = 0; i < 7; i++) {
                const currentQuality = (minQuality + maxQuality) / 2;
                setProcessingMessage(`Mencoba kualitas ${(currentQuality * 100).toFixed(0)}%... (${i+1}/7)`);
                
                const currentPdfBytes = await createPdfWithQuality(pdfjsDoc, currentQuality);
                const currentSize = currentPdfBytes.byteLength;
                const diff = Math.abs(currentSize - targetSizeBytes);
                
                if (diff < minDiff) {
                    minDiff = diff;
                    bestPdfBytes = currentPdfBytes;
                }

                if (currentSize > targetSizeBytes) {
                    maxQuality = currentQuality;
                } else {
                    minQuality = currentQuality;
                }
            }
            finalPdfBytes = bestPdfBytes!;

            if (finalPdfBytes.byteLength >= fileWithBuffer.file.size) {
              addToast("Tidak dapat mengompres file ke ukuran yang lebih kecil dari aslinya.", 'warning');
              setIsProcessing(false);
              return;
            }
        }

        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        setResult({
            url,
            originalSize: fileWithBuffer.file.size,
            newSize: blob.size,
        });
        addToast('Kompresi PDF berhasil!', 'success');

    } catch (error) {
        console.error("Gagal mengkompres PDF:", error);
        addToast("Gagal mengompres PDF. File mungkin rusak atau terlalu kompleks.", 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const renderContent = () => {
    if (result) {
      const savings = 100 - (result.newSize / result.originalSize) * 100;
      return (
        <div className="text-center text-slate-400 flex flex-col items-center gap-6 animate-fade-in">
          <CheckCircleIcon />
          <h3 className="text-2xl font-bold text-slate-100">Kompresi Selesai!</h3>
          <div className="flex justify-around w-full max-w-sm bg-slate-700/50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-slate-500">Ukuran Asli</p>
              <p className="text-lg font-semibold text-slate-200">{formatBytes(result.originalSize)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Ukuran Baru</p>
              <p className="text-lg font-semibold text-slate-200">{formatBytes(result.newSize)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">{savings >= 0 ? 'Hemat' : 'Bertambah'}</p>
              <p className={`text-lg font-bold ${savings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {Math.abs(savings).toFixed(1)}%
              </p>
            </div>
          </div>
          <a href={result.url} download={`${fileWithBuffer?.file.name.replace('.pdf', '')}-dikompres.pdf`} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg">
            <DownloadIcon />
            Unduh PDF
          </a>
          <button onClick={resetState} className="font-medium text-slate-400 hover:text-blue-400 transition-colors">
            Kompres PDF Lainnya
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

    if (fileWithBuffer) {
      return (
        <div className="animate-fade-in">
          <div className="bg-slate-700/50 p-4 rounded-lg flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FilePdfIcon />
              <div className="text-left">
                <p className="text-slate-200 font-medium truncate max-w-[200px] md:max-w-xs" title={fileWithBuffer.file.name}>{fileWithBuffer.file.name}</p>
                <p className="text-slate-400 text-sm">{formatBytes(fileWithBuffer.file.size)}</p>
              </div>
            </div>
            <button onClick={resetState} className="p-1 text-slate-500 hover:text-red-400 rounded-full transition-colors">
              <TrashIcon />
            </button>
          </div>

          <h3 className="text-lg font-semibold text-center text-slate-300 mb-4">Pilih Mode Kompresi</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <label onClick={() => setCompressionMode('recommended')} className={`p-4 rounded-lg cursor-pointer border-2 transition-colors text-left flex flex-col justify-between ${compressionMode === 'recommended' ? 'bg-blue-900/50 border-blue-500' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'}`}>
                <div className="flex items-center">
                    <input type="radio" name="compression" value="recommended" checked={compressionMode === 'recommended'} onChange={() => {}} className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                    <div className="ml-3">
                        <span className="block font-bold text-slate-200">Kompresi Direkomendasikan</span>
                        <span className="text-xs text-slate-400">Keseimbangan terbaik antara ukuran dan kualitas.</span>
                    </div>
                </div>
                 <div className="mt-3 pl-8 text-sm h-5">
                  {isEstimating ? (
                    <p className="text-slate-400 animate-pulse">Menganalisis...</p>
                  ) : estimatedSize !== null ? (
                    <p className="text-slate-300">
                      <span className="font-semibold">Perkiraan Ukuran:</span> {formatBytes(estimatedSize)}
                      {fileWithBuffer && estimatedSize < fileWithBuffer.file.size ?
                        <span className="text-green-400 ml-2">(-{(100 - (estimatedSize / fileWithBuffer.file.size) * 100).toFixed(1)}%)</span> :
                        <span className="text-slate-500 ml-2">(Tidak ada penghematan)</span>
                      }
                    </p>
                  ) : null}
                </div>
            </label>
             <label onClick={() => setCompressionMode('advanced')} className={`p-4 rounded-lg cursor-pointer border-2 transition-colors text-left ${compressionMode === 'advanced' ? 'bg-blue-900/50 border-blue-500' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'}`}>
                <div className="flex items-center">
                    <input type="radio" name="compression" value="advanced" checked={compressionMode === 'advanced'} onChange={() => {}} className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                    <div className="ml-3">
                        <span className="block font-bold text-slate-200">Kompresi Lanjutan</span>
                        <span className="text-xs text-slate-400">Pilih ukuran file target yang Anda inginkan (kualitas mungkin berkurang).</span>
                    </div>
                </div>
            </label>
          </div>
          
          {compressionMode === 'advanced' && (
            <div className="bg-slate-700/50 p-4 rounded-lg mb-8 animate-fade-in">
                <label htmlFor="target-size" className="block mb-2 text-sm font-medium text-slate-300">Ukuran File Target</label>
                <div className="flex">
                    <input 
                        type="number" 
                        id="target-size" 
                        value={targetSize}
                        onChange={(e) => setTargetSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-l-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" 
                        placeholder="e.g., 500" 
                    />
                    <select 
                        value={targetUnit}
                        onChange={(e) => setTargetUnit(e.target.value as 'KB' | 'MB')}
                        className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-r-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 border-l-0"
                    >
                        <option value="KB">KB</option>
                        <option value="MB">MB</option>
                    </select>
                </div>
                 <p className="text-xs text-slate-500 mt-2">Aplikasi akan mencoba mengompres sedekat mungkin ke ukuran ini.</p>
            </div>
          )}

          <div className="flex justify-center">
            <button onClick={handleCompress} disabled={isProcessing} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg flex items-center justify-center min-w-[200px]">
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>{processingMessage}</span>
                </>
              ) : 'Kompres PDF'}
            </button>
          </div>
        </div>
      );
    }
    
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
  };

  return (
    <ToolContainer title="Kompres PDF" onBack={onBack}>
      <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} />
      {renderContent()}
    </ToolContainer>
  );
};

export default CompressPdf;