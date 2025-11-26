
import React, { useState, useRef, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, CheckCircleIcon, TrashIcon, FileWordIcon, FileExcelIcon, FilePptIcon, FileJpgIcon, ZipIcon, FilePdfIcon } from '../icons';
import { useToast } from '../../contexts/ToastContext';

declare const pdfjsLib: any;
declare const JSZip: any;

// --- CONFIGURATION ---
// Backend URL for high-fidelity conversions
// Pastikan tidak ada garis miring (/) di akhir URL ini
const BACKEND_URL = 'https://pdf-backend-api.onrender.com'; 

interface PdfFileWithBuffer {
  file: File;
  buffer: ArrayBuffer;
}

type ConvertFormat = 'word' | 'excel' | 'ppt' | 'jpg'; // 'jpg' acts as the generic 'Image' category
type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'gif';

const ConvertPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [fileWithBuffer, setFileWithBuffer] = useState<PdfFileWithBuffer | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ConvertFormat | null>(null);
  const [selectedImageFormat, setSelectedImageFormat] = useState<ImageFormat>('jpg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const resetState = useCallback(() => {
    setFileWithBuffer(null);
    setSelectedFormat(null);
    setSelectedImageFormat('jpg');
    setIsProcessing(false);
    setProcessingMessage('');
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputFilename('');
  }, [outputUrl]);

  const handleFileChange = async (selectedFile: File | null) => {
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;
    resetState();
    setIsProcessing(true);
    setProcessingMessage('Membaca file...');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      setFileWithBuffer({ file: selectedFile, buffer: arrayBuffer });
    } catch (error) {
      console.error("Gagal memuat PDF:", error);
      addToast("Gagal memuat file PDF.", 'error');
      resetState();
    } finally {
      setIsProcessing(false);
    }
  };

  // --- BACKEND INTEGRATION ---
  const convertWithBackend = async (format: string): Promise<{ blob: Blob, ext: string }> => {
      if (!fileWithBuffer) throw new Error("No file");
      
      const formData = new FormData();
      formData.append('file', fileWithBuffer.file);
      
      let endpoint = '';
      let ext = '';

      // Map formats to backend endpoints
      if (format === 'word') {
          endpoint = '/convert/pdf-to-docx';
          ext = 'docx';
      } else if (format === 'excel') {
          endpoint = '/convert/pdf-to-excel';
          ext = 'xlsx';
      } else {
          throw new Error("Format ini belum didukung oleh server.");
      }

      try {
          // Set timeout for fetch to handle slow server response gracefully
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout for server processing

          const cleanBackendUrl = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
          const fullUrl = `${cleanBackendUrl}${endpoint}`;

          console.log(`Mengirim request ke: ${fullUrl}`);

          const response = await fetch(fullUrl, {
              method: 'POST',
              body: formData,
              signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) {
              if (response.status === 404) {
                  throw new Error(`Endpoint ${endpoint} tidak ditemukan (404). Periksa konfigurasi server.`);
              } else if (response.status === 500) {
                  throw new Error("Terjadi kesalahan internal di server (500). Silakan coba lagi nanti.");
              } else if (response.status === 422) {
                  throw new Error("Data yang dikirim tidak valid (422). Periksa format file.");
              }
              const errData = await response.json().catch(() => ({}));
              throw new Error(errData.detail || errData.error || `Gagal memproses di server (Status: ${response.status})`);
          }

          const blob = await response.blob();
          
          return { blob, ext };

      } catch (error: any) {
          console.error("Backend error:", error);
          if (error.name === 'AbortError') {
              throw new Error("Waktu habis! Server terlalu lama merespons. Coba lagi dengan file yang lebih kecil.");
          } else if (error.message.includes('Failed to fetch')) {
              throw new Error("Tidak dapat terhubung ke server. Pastikan koneksi internet Anda lancar atau server mungkin sedang offline.");
          }
          throw error;
      }
  };


  // --- CLIENT-SIDE ALGORITHMS (IMAGES ONLY) ---
  // We keep this client-side because it's efficient enough for images and saves server bandwidth.

  const convertToImages = async (pdfDoc: any): Promise<{ blob: Blob, ext: string }> => {
    const zip = new JSZip();
    const baseName = fileWithBuffer!.file.name.replace('.pdf', '');
    
    let mimeType = 'image/jpeg';
    let ext = 'jpg';

    switch (selectedImageFormat) {
        case 'jpeg':
            mimeType = 'image/jpeg';
            ext = 'jpeg';
            break;
        case 'png':
            mimeType = 'image/png';
            ext = 'png';
            break;
        case 'gif':
            mimeType = 'image/gif';
            ext = 'gif';
            break;
        case 'jpg':
        default:
            mimeType = 'image/jpeg';
            ext = 'jpg';
            break;
    }

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        setProcessingMessage(`Merender halaman ${i} dari ${pdfDoc.numPages} ke ${selectedImageFormat.toUpperCase()}...`);
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        
        // Fill white background for JPEG/JPG to avoid black background on transparent PDFs
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        await page.render({ canvasContext: ctx, viewport }).promise;
        
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, 0.9));
        if (blob) {
            zip.file(`${baseName}_halaman_${i}.${ext}`, blob);
        }
    }

    setProcessingMessage('Membuat file ZIP...');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return { blob: zipBlob, ext: 'zip' };
  };

  const handleConvert = async () => {
    if (!fileWithBuffer || !selectedFormat) return;

    setIsProcessing(true);
    
    try {
        const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(fileWithBuffer.buffer.slice(0)) }).promise;
        
        let result: { blob: Blob, ext: string };

        switch (selectedFormat) {
            case 'jpg':
                setProcessingMessage('Memproses gambar lokal...');
                result = await convertToImages(pdfDoc);
                break;
            case 'word':
                setProcessingMessage('Konversi ke Word...');
                result = await convertWithBackend('word');
                break;
            case 'excel':
                setProcessingMessage('Konversi ke Excel...');
                result = await convertWithBackend('excel');
                break;
            case 'ppt':
                 // Placeholders for future backend implementation
                 addToast("Format ini belum tersedia di server saat ini.", 'info');
                 setIsProcessing(false);
                 return;
            default:
                throw new Error("Format tidak dikenal");
        }

        const url = URL.createObjectURL(result.blob);
        
        setOutputUrl(url);
        setOutputFilename(`${fileWithBuffer.file.name.replace('.pdf', '')}.${result.ext}`);
        addToast('Konversi berhasil!', 'success');

    } catch (error: any) {
        console.error("Konversi gagal:", error);
        addToast(error.message || "Terjadi kesalahan saat mengonversi.", 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const renderContent = () => {
    if (outputUrl) {
      return (
        <div className="text-center text-gray-600 dark:text-gray-300 flex flex-col items-center gap-6 animate-fade-in">
          <CheckCircleIcon />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Konversi Selesai!</h3>
          
          <p className="text-lg">File Anda telah berhasil dikonversi ke format {selectedFormat === 'jpg' ? selectedImageFormat.toUpperCase() : selectedFormat?.toUpperCase()}.</p>
          <a href={outputUrl} download={outputFilename} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg shadow-md shadow-blue-200 dark:shadow-none w-full max-w-sm">
            {selectedFormat === 'jpg' ? <ZipIcon /> : <DownloadIcon />}
            Unduh File
          </a>
          <button onClick={resetState} className="font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
            Konversi File Lain
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

    if (fileWithBuffer) {
      return (
        <div className="flex flex-col gap-8 animate-fade-in">
             <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 rounded-lg flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-red-500 font-bold text-2xl"><FilePdfIcon /></span>
                    <div className="text-left">
                        <p className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-[200px] md:max-w-xs" title={fileWithBuffer.file.name}>{fileWithBuffer.file.name}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{(fileWithBuffer.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                </div>
                <button onClick={resetState} className="p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                    <TrashIcon />
                </button>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-center text-gray-800 dark:text-gray-200 mb-6">Pilih Format Konversi</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <button
                        onClick={() => setSelectedFormat('word')}
                        className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ${selectedFormat === 'word' ? 'bg-blue-50 border-blue-500 shadow-md dark:bg-blue-900/20 dark:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600'}`}
                    >
                        <FileWordIcon className="w-12 h-12 text-blue-600" />
                        <span className="font-bold text-gray-800 dark:text-gray-200">Word</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">.docx</span>
                    </button>
                    
                     <button
                        onClick={() => setSelectedFormat('excel')}
                        className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ${selectedFormat === 'excel' ? 'bg-green-50 border-green-500 shadow-md dark:bg-green-900/20 dark:border-green-500' : 'bg-white border-gray-200 hover:border-green-300 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600'}`}
                    >
                        <FileExcelIcon className="w-12 h-12 text-green-600" />
                        <span className="font-bold text-gray-800 dark:text-gray-200">Excel</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">.xlsx</span>
                    </button>
                    
                    <button
                        onClick={() => setSelectedFormat('ppt')}
                        disabled={true}
                        className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 opacity-50 cursor-not-allowed bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700`}
                    >
                        <FilePptIcon className="w-12 h-12 text-gray-400" />
                        <span className="font-bold text-gray-500 dark:text-gray-400">PowerPoint</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">Segera</span>
                    </button>
                    
                     <button
                        onClick={() => setSelectedFormat('jpg')}
                        className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ${selectedFormat === 'jpg' ? 'bg-purple-50 border-purple-500 shadow-md dark:bg-purple-900/20 dark:border-purple-500' : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600'}`}
                    >
                        <FileJpgIcon className="w-12 h-12 text-purple-600" />
                        <span className="font-bold text-gray-800 dark:text-gray-200">Gambar</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">.zip</span>
                    </button>
                </div>
                
                {selectedFormat === 'jpg' && (
                    <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800 animate-fade-in">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Pilih Format Gambar:</h4>
                        <div className="flex flex-wrap justify-center gap-3">
                            {(['jpg', 'jpeg', 'png', 'gif'] as ImageFormat[]).map((fmt) => (
                                <button
                                    key={fmt}
                                    onClick={() => setSelectedImageFormat(fmt)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                        selectedImageFormat === fmt 
                                        ? 'bg-purple-600 text-white border-purple-600' 
                                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-purple-400'
                                    }`}
                                >
                                    {fmt.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="text-center mt-6">
                <button
                    onClick={handleConvert}
                    disabled={!selectedFormat}
                    className="w-full md:w-auto min-w-[200px] bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg shadow-md"
                >
                    Konversi Sekarang
                </button>
            </div>
        </div>
      );
    }

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
            <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} />
        </div>
    );
  };

  return (
    <ToolContainer title="Konversi PDF" onBack={onBack}>
      {renderContent()}
    </ToolContainer>
  );
};

export default ConvertPdf;
