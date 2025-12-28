
import React, { useState, useRef, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import { 
  UploadIcon, DownloadIcon, CheckCircleIcon, TrashIcon, 
  FileWordIcon, FileExcelIcon, FilePptIcon, FileJpgIcon, 
  ZipIcon, FilePdfIcon 
} from '../icons';
import { useToast } from '../../contexts/ToastContext';

// Deklarasi global untuk library PDF.js yang dimuat via CDN
declare const pdfjsLib: any;

// Mengatur URL Backend ke alamat baru
const BACKEND_URL = 'https://www.api-backend.club'; 

interface PdfFileWithBuffer {
  file: File;
  buffer: ArrayBuffer;
}

type ConvertMode = 'word' | 'excel' | 'ppt' | 'image';
type ImageFormat = 'jpg' | 'jpeg' | 'png';

interface ConvertPdfProps {
  onBack: () => void;
  mode: ConvertMode;
}

const ConvertPdf: React.FC<ConvertPdfProps> = ({ onBack, mode }) => {
  const [fileWithBuffer, setFileWithBuffer] = useState<PdfFileWithBuffer | null>(null);
  const [pageCount, setPageCount] = useState<number>(0); // State untuk menyimpan jumlah halaman
  const [selectedImageFormat, setSelectedImageFormat] = useState<ImageFormat>('jpg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  // Tentukan apakah file dianggap "Berat" (Lebih dari 10MB atau 70+ Halaman)
  const isHeavyDocument = (fileWithBuffer?.file.size || 0) > 10 * 1024 * 1024 || pageCount >= 70;

  const getModeConfig = () => {
    switch (mode) {
      case 'word': return { title: 'PDF ke Word', icon: <FileWordIcon className="w-12 h-12 text-blue-600" />, ext: 'docx', color: 'text-blue-600' };
      case 'excel': return { title: 'PDF ke Excel', icon: <FileExcelIcon className="w-12 h-12 text-green-600" />, ext: 'xlsx', color: 'text-green-600' };
      case 'ppt': return { title: 'PDF ke PowerPoint', icon: <FilePptIcon className="w-12 h-12 text-orange-600" />, ext: 'pptx', color: 'text-orange-600' };
      case 'image': return { title: 'PDF ke Gambar', icon: <FileJpgIcon className="w-12 h-12 text-purple-600" />, ext: 'zip', color: 'text-purple-600' };
    }
  };

  const config = getModeConfig();

  const resetState = useCallback(() => {
    setFileWithBuffer(null);
    setPageCount(0);
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
    setProcessingMessage('Menganalisis file...');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      // Hitung jumlah halaman menggunakan PDF.js
      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
      setPageCount(pdfDoc.numPages);

      setFileWithBuffer({ file: selectedFile, buffer: arrayBuffer });
    } catch (error) {
      console.error(error);
      addToast("Gagal memuat file PDF.", 'error');
      resetState();
    } finally {
      setIsProcessing(false);
    }
  };

  const convertWithBackend = async (): Promise<{ blob: Blob, ext: string }> => {
      if (!fileWithBuffer) throw new Error("No file");
      
      const formData = new FormData();
      formData.append('file', fileWithBuffer.file);
      
      let endpoint = '';
      let ext = '';

      if (mode === 'word') { endpoint = '/convert/pdf-to-docx'; ext = 'docx'; }
      else if (mode === 'excel') { endpoint = '/convert/pdf-to-excel'; ext = 'xlsx'; }
      else if (mode === 'ppt') { endpoint = '/convert/pdf-to-ppt'; ext = 'pptx'; }
      else if (mode === 'image') {
          endpoint = `/convert/pdf-to-image?output_format=${selectedImageFormat}`;
          ext = 'zip';
      }

      // INTEGRASI TIMEOUT 5 MENIT (300.000 ms) DENGAN ABORTCONTROLLER
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); 

      try {
          // Menggunakan BACKEND_URL jika didefinisikan, jika tidak menggunakan relative path (untuk proxy)
          const fullUrl = BACKEND_URL ? `${BACKEND_URL}${endpoint}` : endpoint;

          const response = await fetch(fullUrl, {
              method: 'POST',
              body: formData,
              signal: controller.signal,
              headers: {
                'Connection': 'keep-alive'
              }
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              throw new Error(errData.detail || errData.error || `Gagal memproses (Status: ${response.status})`);
          }

          const blob = await response.blob();
          return { blob, ext };
      } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
              throw new Error("Time limit exceeded! Server memerlukan waktu lebih dari 5 menit untuk memproses dokumen ini.");
          } else if (error.message.includes('Failed to fetch')) {
              throw new Error("Connection lost, server is processing heavy file. Silakan periksa koneksi internet Anda atau coba file yang lebih kecil.");
          }
          throw error;
      }
  };

  const handleConvert = async () => {
    if (!fileWithBuffer) return;
    setIsProcessing(true);
    
    // Sesuaikan pesan loading
    const timeEstimate = isHeavyDocument ? "Dapat memakan waktu hingga 2-3 menit" : "Mohon tunggu sebentar";
    setProcessingMessage(`Sedang mengonversi ke ${mode.toUpperCase()}... (${timeEstimate})`);
    
    try {
        const result = await convertWithBackend();
        const url = URL.createObjectURL(result.blob);
        setOutputUrl(url);
        setOutputFilename(`${fileWithBuffer.file.name.replace('.pdf', '')}.${result.ext}`);
        addToast('Konversi berhasil!', 'success');
    } catch (error: any) {
        addToast(error.message || "Terjadi kesalahan.", 'error');
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
          <p className="text-lg">File Anda telah berhasil dikonversi.</p>
          <a href={outputUrl} download={outputFilename} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg shadow-md w-full max-w-sm">
            {mode === 'image' ? <ZipIcon /> : <DownloadIcon />}
            Unduh Hasil {mode.toUpperCase()}
          </a>
          <button onClick={resetState} className="font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
            Konversi File Lain
          </button>
        </div>
      );
    }

    if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="relative mb-6">
            <svg className="animate-spin h-14 w-14 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
            </div>
          </div>
          
          <h4 className="text-xl text-gray-800 dark:text-gray-200 font-bold mb-2">{processingMessage}</h4>
          
          {/* HANYA TAMPILKAN PERINGATAN ORANYE JIKA FILE BERAT */}
          {isHeavyDocument && (
            <div className="mt-4 p-5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 max-w-sm shadow-sm animate-fade-in">
                <div className="flex gap-3 text-left">
                    <span className="text-amber-500 text-xl font-bold">!</span>
                    <div className="space-y-2">
                        <p className="text-sm text-amber-800 dark:text-amber-300 font-bold">
                            PENTING: Jangan menutup atau menyegarkan halaman ini.
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                            Dokumen besar ({pageCount}+ halaman) memerlukan waktu pemrosesan lebih lama (~100 detik). Kami menjaga koneksi Anda tetap aktif hingga konversi selesai.
                        </p>
                    </div>
                </div>
            </div>
          )}
          
          <div className="mt-8 flex gap-1 justify-center">
             <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
             <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
          </div>
        </div>
      );
    }

    if (fileWithBuffer) {
      return (
        <div className="flex flex-col gap-6 animate-fade-in">
             <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 rounded-lg flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <FilePdfIcon />
                    <div className="text-left">
                        <p className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-[200px]" title={fileWithBuffer.file.name}>{fileWithBuffer.file.name}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {(fileWithBuffer.file.size / 1024 / 1024).toFixed(2)} MB • {pageCount} Halaman
                        </p>
                    </div>
                </div>
                <button onClick={resetState} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon /></button>
            </div>

            {mode === 'image' && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">Pilih Format Gambar:</h4>
                    <div className="flex justify-center gap-3">
                        {['jpg', 'jpeg', 'png'].map((fmt) => (
                            <button
                                key={fmt}
                                onClick={() => setSelectedImageFormat(fmt as ImageFormat)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${selectedImageFormat === fmt ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600'}`}
                            >
                                {fmt.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <button 
                  onClick={handleConvert} 
                  disabled={isProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg shadow-md flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Memproses...
                        </>
                    ) : (
                        'Konversi Sekarang'
                    )}
                </button>
                
                {/* HANYA TAMPILKAN TEKS PERINGATAN JIKA FILE BERAT */}
                {isHeavyDocument && (
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400 italic animate-fade-in">
                    Jangan tutup jendela ini. File besar ({pageCount} halaman) memerlukan waktu sekitar 100-120 detik.
                    </p>
                )}
            </div>

            <div className="text-center space-y-1">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">
                Pemrosesan Server Aman
              </p>
              {isHeavyDocument && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Waktu tunggu telah ditingkatkan hingga 5 menit untuk mendukung file kompleks.
                </p>
              )}
            </div>
        </div>
      );
    }

    return (
        <div
            className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-all duration-300 ${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-slate-800/50' : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 bg-gray-50 dark:bg-slate-800/50'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileChange(e.dataTransfer.files[0]); }}
        >
            <div className="mb-4">{config.icon}</div>
            <p className="text-gray-700 dark:text-gray-200 font-semibold text-lg mb-2 text-center">Seret & lepas PDF untuk diubah ke {mode === 'ppt' ? 'PowerPoint' : mode.toUpperCase()}</p>
            <button onClick={() => fileInputRef.current?.click()} className="mt-4 bg-gray-800 hover:bg-gray-700 dark:bg-slate-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors">
                Pilih File PDF
            </button>
        </div>
    );
  };

  return (
    <ToolContainer title={config.title} onBack={onBack}>
      <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} />
      {renderContent()}
    </ToolContainer>
  );
};

export default ConvertPdf;
