
import React, { useState, useRef, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import { 
  UploadIcon, DownloadIcon, CheckCircleIcon, TrashIcon, 
  FileWordIcon, FileExcelIcon, FilePptIcon, FileJpgIcon, 
  ZipIcon, FilePdfIcon 
} from '../icons';
import { useToast } from '../../contexts/ToastContext';
import FileUploader from '../common/FileUploader';

// pdfjsLib is loaded from CDN in index.html
declare const pdfjsLib: any;

const BACKEND_URL = 'https://api-backend.club'; 

interface PdfFileWithBuffer {
  file: File;
  buffer: ArrayBuffer;
}

type ConvertMode = 'word' | 'excel' | 'ppt' | 'image';
type ImageFormat = 'jpg' | 'png';

interface ConvertPdfProps {
  onBack: () => void;
  mode: ConvertMode;
}

const ConvertPdf: React.FC<ConvertPdfProps> = ({ onBack, mode }) => {
  const [fileWithBuffer, setFileWithBuffer] = useState<PdfFileWithBuffer | null>(null);
  const [pageCount, setPageCount] = useState<number>(0); 
  const [selectedImageFormat, setSelectedImageFormat] = useState<ImageFormat>('png');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const isHeavyDocument = (fileWithBuffer?.file.size || 0) > 10 * 1024 * 1024 || pageCount >= 70;

  const getModeConfig = () => {
    switch (mode) {
      case 'word': return { title: 'PDF ke Word', icon: <FileWordIcon className="w-12 h-12 text-blue-600" />, ext: 'docx', endpoint: '/convert/pdf-to-docx' };
      case 'excel': return { title: 'PDF ke Excel', icon: <FileExcelIcon className="w-12 h-12 text-green-600" />, ext: 'xlsx', endpoint: '/convert/pdf-to-excel' };
      case 'ppt': return { title: 'PDF ke PowerPoint', icon: <FilePptIcon className="w-12 h-12 text-orange-600" />, ext: 'pptx', endpoint: '/convert/pdf-to-ppt' };
      case 'image': return { title: 'PDF ke Gambar', icon: <FileJpgIcon className="w-12 h-12 text-purple-600" />, ext: 'zip', endpoint: '/convert/pdf-to-image' };
    }
  };

  const config = getModeConfig();

  const resetState = useCallback(() => {
    setFileWithBuffer(null);
    setPageCount(0);
    setSelectedImageFormat('png');
    setIsProcessing(false);
    setProcessingMessage('');
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputFilename('');
  }, [outputUrl]);

  const handleFileChange = async (files: FileList | null) => {
    const selectedFile = files ? files[0] : null;
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;
    resetState();
    setIsProcessing(true);
    setProcessingMessage('Menganalisis file...');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
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

  const handleConvert = async () => {
    if (!fileWithBuffer) return;
    setIsProcessing(true);
    
    const timeEstimate = isHeavyDocument ? "Dapat memakan waktu hingga 3-5 menit" : "Mohon tunggu sebentar";
    setProcessingMessage(`Sedang mengonversi ke ${mode.toUpperCase()}... (${timeEstimate})`);
    
    const formData = new FormData();
    formData.append('file', fileWithBuffer.file);
    if (mode === 'image') {
      formData.append('output_format', selectedImageFormat);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    try {
        const fullUrl = `${BACKEND_URL}${config.endpoint}`;
        const response = await fetch(fullUrl, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || errData.error || `Gagal memproses (Status: ${response.status})`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);
        setOutputFilename(`${fileWithBuffer.file.name.replace('.pdf', '')}.${config.ext}`);
        addToast('Konversi berhasil!', 'success');
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            addToast("Batas waktu terlampaui (5 menit). Server terlalu sibuk atau file terlalu besar.", 'error');
        } else {
            addToast(error.message || "Terjadi kesalahan.", 'error');
        }
    } finally {
        setIsProcessing(false);
    }
  };

  const renderContent = () => {
    if (outputUrl) {
      return (
        <div className="text-center text-gray-600 dark:text-gray-300 flex flex-col items-center gap-6 animate-fade-in">
          <CheckCircleIcon />
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Konversi Selesai!</h3>
            <p className="text-lg">File Anda telah berhasil dikonversi melalui server kami.</p>
          </div>
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
        <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="relative mb-6">
            <svg className="animate-spin h-14 w-14 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </div>
          <h4 className="text-xl text-gray-800 dark:text-gray-200 font-bold mb-2">{processingMessage}</h4>
          {isHeavyDocument && (
            <div className="mt-4 p-5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 max-w-sm shadow-sm animate-fade-in">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-bold mb-2">PENTING: Jangan menutup halaman ini.</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">Pemrosesan server untuk dokumen besar memerlukan waktu lebih lama.</p>
            </div>
          )}
        </div>
      );
    }

    if (fileWithBuffer) {
      return (
        <div className="flex flex-col gap-6 animate-fade-in">
             <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 rounded-lg flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-left">
                    <FilePdfIcon />
                    <div>
                        <p className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-[200px]">{fileWithBuffer.file.name}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                            {(fileWithBuffer.file.size / 1024 / 1024).toFixed(2)} MB • {pageCount} Halaman
                        </p>
                    </div>
                </div>
                <button onClick={resetState} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><TrashIcon /></button>
            </div>

            {mode === 'image' && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800 text-center">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Format Gambar Output:</h4>
                    <div className="flex justify-center gap-3">
                        {(['jpg', 'png'] as ImageFormat[]).map((fmt) => (
                            <button
                                key={fmt}
                                onClick={() => setSelectedImageFormat(fmt)}
                                className={`px-6 py-2 rounded-lg text-sm font-bold border transition-all ${selectedImageFormat === fmt ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600'}`}
                            >
                                {fmt.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <button 
              onClick={handleConvert} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-all text-lg shadow-md flex items-center justify-center gap-2"
            >
                Konversi Sekarang
            </button>
            <p className="text-center text-[10px] text-gray-400 uppercase tracking-tight">Diproses aman di server berkecepatan tinggi</p>
        </div>
      );
    }

    return (
        <FileUploader 
            onFileSelect={handleFileChange} 
            label={`Pilih PDF untuk Diubah ke ${mode === 'ppt' ? 'PowerPoint' : mode.toUpperCase()}`}
            description="Seret & lepas file PDF Anda untuk memulai konversi"
        />
    );
  };

  return (
    <ToolContainer title={config.title} onBack={onBack}>
      <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files)} />
      {renderContent()}
    </ToolContainer>
  );
};

export default ConvertPdf;
