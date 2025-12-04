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

// Utilitas format byte ke KB/MB agar mudah dibaca manusia
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// --- FUNGSI KOMPRESI LANJUTAN ---
// Membuat PDF baru dengan me-render ulang setiap halaman sebagai gambar JPEG (Rasterisasi).
// Teknik ini sangat efektif untuk mengurangi ukuran PDF hasil scan yang berisi gambar besar.
const createPdfWithQuality = async (pdfjsDoc: any, jpegQuality: number): Promise<Uint8Array> => {
    const newPdfDoc = await PDFDocument.create();
    for (let i = 1; i <= pdfjsDoc.numPages; i++) {
        const page = await pdfjsDoc.getPage(i);
        // Menggunakan skala 1.5 untuk menjaga keterbacaan teks (sekitar 108 DPI)
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render halaman PDF ke Canvas
        await page.render({ canvasContext: context, viewport: viewport }).promise;

        // Konversi Canvas ke format JPEG dengan kualitas kompresi tertentu
        const jpegDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
        const jpegImageBytes = await fetch(jpegDataUrl).then(res => res.arrayBuffer());
        
        // Sematkan gambar hasil kompresi ke halaman PDF baru
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
  // Target ukuran untuk mode Advanced (user menentukan sendiri batas ukuran)
  const [targetSize, setTargetSize] = useState<number>(1024);
  const [targetUnit, setTargetUnit] = useState<'KB' | 'MB'>('KB');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('Mengompres...');
  const [result, setResult] = useState<CompressResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  
  // State untuk estimasi ukuran (Mode Recommended)
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
  
  // --- ALGORITMA ESTIMASI CERDAS ---
  // Dijalankan segera setelah file dimuat untuk menghitung potensi penghematan.
  // Menganalisis konten setiap halaman untuk menentukan strategi terbaik (Lossless vs Lossy).
  useEffect(() => {
    setEstimatedSize(null);
    setRecommendedResultBytes(null);

    const calculateRecommendedResult = async () => {
      if (!fileWithBuffer) return;

      setIsEstimating(true);
      try {
        // --- LOGIKA AUDIT PROFESIONAL ---
        // Meniru profil "Cepat & Seimbang" untuk mendapatkan keseimbangan terbaik.
        
        const arrayBuffer = fileWithBuffer.buffer;
        const sourcePdfDoc = await PDFDocument.load(arrayBuffer.slice(0));
        const pdfjsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
        const newPdfDoc = await PDFDocument.create();
        
        // Audit Halaman-demi-Halaman
        for (let i = 0; i < sourcePdfDoc.getPageCount(); i++) {
          const pageNum = i + 1;
          const pdfjsPage = await pdfjsDoc.getPage(pageNum);
          
          // Analisis konten halaman (teks vs gambar)
          const textContent = await pdfjsPage.getTextContent();
          const ops = await pdfjsPage.getOperatorList();
          const viewport = pdfjsPage.getViewport({ scale: 1.0 });
          const pageArea = viewport.width * viewport.height;
          let totalImagePixels = 0;

          // Hitung luas area yang tertutup gambar
          const imagePromises: Promise<void>[] = [];
          for (let j = 0; j < ops.fnArray.length; j++) {
            if (ops.fnArray[j] === pdfjsLib.OPS.paintImageXObject) {
              const imgRef = ops.argsArray[j][0];
              imagePromises.push(
                new Promise(async (resolve) => {
                  try {
                    const img = await pdfjsPage.commonObjs.get(imgRef);
                    if (img && img.width && img.height) {
                        totalImagePixels += img.width * img.height;
                    }
                  } catch (e) {
                    // Abaikan error referensi gambar
                  }
                  resolve();
                })
              );
            }
          }
          await Promise.all(imagePromises);

          // Tentukan apakah halaman dominan gambar atau teks
          const isImageDominant = (totalImagePixels / pageArea > 0.5) || textContent.items.length < 15;
          
          if (isImageDominant) {
            // STRATEGI A: Kompresi Gambar (Rasterisasi)
            // Downsample ke 150 DPI dan kompres JPEG 80%
            const TARGET_DPI = 150;
            const scale = TARGET_DPI / 72; // PDF base 72 DPI
            
            const scaledViewport = pdfjsPage.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;

            await pdfjsPage.render({ canvasContext: context, viewport: scaledViewport }).promise;

            const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.80);
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
            // STRATEGI B: Salin Halaman Asli (Lossless)
            // Jaga teks agar tetap bisa dipilih/dicari (OCR friendly)
            const [copiedPage] = await newPdfDoc.copyPages(sourcePdfDoc, [i]);
            newPdfDoc.addPage(copiedPage);
          }
        }
        
        // Simpan hasil audit
        const compressedBytes = await newPdfDoc.save();
        setEstimatedSize(compressedBytes.byteLength);
        
        // Simpan bytes jika ukurannya memang lebih kecil
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
  
  // Handler untuk menjalankan proses kompresi final
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
        } else { 
            // --- MODE LANJUTAN (Target Ukuran) ---
            // Mencoba mencapai ukuran target dengan menyesuaikan kualitas JPEG secara iteratif
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
            
            // Binary Search sederhana untuk menemukan kualitas JPEG yang pas
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

  // Render UI...
  const renderContent = () => {
    // Tampilan Hasil
    if (result) {
      const savings = 100 - (result.newSize / result.originalSize) * 100;
      return (
        <div className="text-center text-gray-600 dark:text-gray-300 flex flex-col items-center gap-6 animate-fade-in">
          <CheckCircleIcon />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Kompresi Selesai!</h3>
          <div className="flex justify-around w-full max-w-sm bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ukuran Asli</p>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{formatBytes(result.originalSize)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ukuran Baru</p>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{formatBytes(result.newSize)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{savings >= 0 ? 'Hemat' : 'Bertambah'}</p>
              <p className={`text-lg font-bold ${savings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {Math.abs(savings).toFixed(1)}%
              </p>
            </div>
          </div>
          <a href={result.url} download={`${fileWithBuffer?.file.name.replace('.pdf', '')}-dikompres.pdf`} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg shadow-md shadow-blue-200 dark:shadow-none">
            <DownloadIcon />
            Unduh PDF
          </a>
          <button onClick={resetState} className="font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
            Kompres PDF Lainnya
          </button>
        </div>
      );
    }

    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <p className="text-lg text-gray-800 dark:text-gray-200 font-semibold">{processingMessage}</p>
            </div>
        );
    }

    // Tampilan Pilihan Mode
    if (fileWithBuffer) {
      return (
        <div className="animate-fade-in">
          {/* File Info */}
          <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 rounded-lg flex items-center justify-between mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <FilePdfIcon />
              <div className="text-left">
                <p className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-[200px] md:max-w-xs" title={fileWithBuffer.file.name}>{fileWithBuffer.file.name}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{formatBytes(fileWithBuffer.file.size)}</p>
              </div>
            </div>
            <button onClick={resetState} className="p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors">
              <TrashIcon />
            </button>
          </div>

          <h3 className="text-lg font-semibold text-center text-gray-800 dark:text-gray-200 mb-4">Pilih Mode Kompresi</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Mode Direkomendasikan */}
            <label onClick={() => setCompressionMode('recommended')} className={`p-4 rounded-xl cursor-pointer border-2 transition-all text-left flex flex-col justify-between ${compressionMode === 'recommended' ? 'bg-blue-50 border-blue-500 shadow-sm dark:bg-blue-900/20 dark:border-blue-500' : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600'}`}>
                <div className="flex items-center">
                    <input type="radio" name="compression" value="recommended" checked={compressionMode === 'recommended'} onChange={() => {}} className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2 dark:bg-slate-700 dark:border-slate-600" />
                    <div className="ml-3">
                        <span className="block font-bold text-gray-800 dark:text-gray-200">Kompresi Direkomendasikan</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Keseimbangan terbaik antara ukuran dan kualitas.</span>
                    </div>
                </div>
                 <div className="mt-3 pl-8 text-sm h-5">
                  {isEstimating ? (
                    <p className="text-gray-400 animate-pulse">Menganalisis...</p>
                  ) : estimatedSize !== null ? (
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Perkiraan Ukuran:</span> {formatBytes(estimatedSize)}
                      {fileWithBuffer && estimatedSize < fileWithBuffer.file.size ?
                        <span className="text-green-600 dark:text-green-400 ml-2">(-{(100 - (estimatedSize / fileWithBuffer.file.size) * 100).toFixed(1)}%)</span> :
                        <span className="text-gray-400 ml-2">(Tidak ada penghematan)</span>
                      }
                    </p>
                  ) : null}
                </div>
            </label>
            
             {/* Mode Lanjutan */}
             <label onClick={() => setCompressionMode('advanced')} className={`p-4 rounded-xl cursor-pointer border-2 transition-all text-left ${compressionMode === 'advanced' ? 'bg-blue-50 border-blue-500 shadow-sm dark:bg-blue-900/20 dark:border-blue-500' : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600'}`}>
                <div className="flex items-center">
                    <input type="radio" name="compression" value="advanced" checked={compressionMode === 'advanced'} onChange={() => {}} className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2 dark:bg-slate-700 dark:border-slate-600" />
                    <div className="ml-3">
                        <span className="block font-bold text-gray-800 dark:text-gray-200">Kompresi Lanjutan</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Pilih ukuran file target yang Anda inginkan (kualitas mungkin berkurang).</span>
                    </div>
                </div>
            </label>
          </div>
          
          {compressionMode === 'advanced' && (
            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg mb-8 animate-fade-in border border-gray-200 dark:border-slate-700">
                <label htmlFor="target-size" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Ukuran File Target</label>
                <div className="flex">
                    <input 
                        type="number" 
                        id="target-size" 
                        value={targetSize}
                        onChange={(e) => setTargetSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-l-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm" 
                        placeholder="e.g., 500" 
                    />
                    <select 
                        value={targetUnit}
                        onChange={(e) => setTargetUnit(e.target.value as 'KB' | 'MB')}
                        className="bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-r-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 border-l-0"
                    >
                        <option value="KB">KB</option>
                        <option value="MB">MB</option>
                    </select>
                </div>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Aplikasi akan mencoba mengompres sedekat mungkin ke ukuran ini.</p>
            </div>
          )}

          <div className="flex justify-center">
            <button onClick={handleCompress} disabled={isProcessing} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg flex items-center justify-center min-w-[200px] shadow-md">
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
    
    // Tampilan Upload Default
    return (
        <div
            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-colors duration-300 ${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-slate-800/50' : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500 bg-gray-50 dark:bg-slate-800/50'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileChange(e.dataTransfer.files[0]); }}
        >
            <UploadIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-gray-700 dark:text-gray-200 font-semibold text-lg mb-2">Seret & lepas file PDF Anda di sini</p>
            <p className="text-gray-500 dark:text-gray-400 mb-4">atau</p>
            <button onClick={() => fileInputRef.current?.click()} className="bg-gray-800 hover:bg-gray-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
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