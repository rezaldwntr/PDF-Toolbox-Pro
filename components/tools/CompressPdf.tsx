
import React, { useState, useRef, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, CheckCircleIcon, FilePdfIcon, TrashIcon } from '../icons';
import { useToast } from '../../contexts/ToastContext';
import FileUploader from '../common/FileUploader';

const BACKEND_URL = 'https://api-backend.club';

const CompressPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [compressionType, setCompressionType] = useState<'recommended' | 'target'>('recommended');
  const [targetSizeKb, setTargetSizeKb] = useState<number>(500);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const { addToast } = useToast();

  const handleFileChange = (files: FileList | null) => {
    const selectedFile = files ? files[0] : null;
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setResultUrl(null);
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    setIsProcessing(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('compression_type', compressionType);
      
      if (compressionType === 'target') {
        formData.append('target_size_kb', targetSizeKb.toString());
      }

      const response = await fetch(`${BACKEND_URL}/tools/compress-pdf`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Gagal mengompres PDF.");
      }

      const blob = await response.blob();
      setResultUrl(URL.createObjectURL(blob));
      addToast('Kompresi berhasil!', 'success');
    } catch (error: any) {
      clearTimeout(timeoutId);
      addToast(error.name === 'AbortError' ? "Waktu habis (5 menit)." : error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (resultUrl) {
    return (
      <ToolContainer title="Kompresi Berhasil!" onBack={onBack}>
        <div className="text-center flex flex-col items-center gap-6 animate-fade-in">
          <CheckCircleIcon />
          <div className="space-y-2">
            <h3 className="text-xl font-bold">PDF Berhasil Dikompres</h3>
            <p className="text-gray-500 dark:text-gray-400">Dokumen Anda telah dioptimalkan melalui server kami.</p>
          </div>
          <a href={resultUrl} download={`compressed-${file?.name}`} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg w-full max-w-sm shadow-lg transition-all">Unduh PDF Hasil Kompres</a>
          <button onClick={() => setResultUrl(null)} className="text-blue-600 hover:underline">Kompres File Lain</button>
        </div>
      </ToolContainer>
    );
  }

  return (
    <ToolContainer title="Kompres PDF (Server)" onBack={onBack}>
      
      {!file ? (
        <FileUploader 
            onFileSelect={handleFileChange} 
            label="Pilih PDF untuk Dikompres"
            description="Seret file PDF ke sini untuk memperkecil ukurannya"
        />
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg flex items-center justify-between border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <FilePdfIcon />
              <div className="text-left">
                <span className="block truncate font-medium max-w-[200px]">{file.name}</span>
                <span className="text-[10px] text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
            <button onClick={() => setFile(null)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full transition-colors"><TrashIcon /></button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setCompressionType('recommended')} 
              className={`p-4 rounded-xl border-2 text-left transition-all ${compressionType === 'recommended' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-slate-700 text-gray-500'}`}
            >
                <span className="block font-bold">Rekomendasi</span>
                <span className="text-[10px] block mt-1">Keseimbangan terbaik antara ukuran dan kualitas.</span>
            </button>
            <button 
              onClick={() => setCompressionType('target')} 
              className={`p-4 rounded-xl border-2 text-left transition-all ${compressionType === 'target' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-slate-700 text-gray-500'}`}
            >
                <span className="block font-bold">Ukuran Target</span>
                <span className="text-[10px] block mt-1">Tentukan batas ukuran dalam KB yang diinginkan.</span>
            </button>
          </div>

          {compressionType === 'target' && (
            <div className="animate-fade-in-down">
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Ukuran Target (KB):</label>
              <input 
                type="number" 
                value={targetSizeKb} 
                onChange={(e) => setTargetSizeKb(Number(e.target.value))} 
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          )}

          <button onClick={handleCompress} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all disabled:opacity-50">
            {isProcessing ? (
               <div className="flex items-center justify-center gap-2">
                 <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 Sedang Mengompres di Server...
               </div>
            ) : "Kompres Sekarang"}
          </button>
        </div>
      )}
    </ToolContainer>
  );
};

export default CompressPdf;
