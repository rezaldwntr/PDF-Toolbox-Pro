
import React, { useState, useRef, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, TrashIcon, FilePdfIcon } from '../icons';
import { useToast } from '../../contexts/ToastContext';

const BACKEND_URL = 'https://api-backend.club';

interface SplitPdfProps {
  onBack: () => void;
}

const SplitPdf: React.FC<SplitPdfProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState('1-5');
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setOutputUrl(null);
    }
  };

  const handleProcess = async () => {
    if (!file || !pages.trim()) {
        addToast('Pilih file dan tentukan rentang halaman.', 'warning');
        return;
    }

    setIsProcessing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pages', pages);

      const response = await fetch(`${BACKEND_URL}/tools/split-pdf`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Gagal memisahkan PDF.");
      }

      const blob = await response.blob();
      setOutputUrl(URL.createObjectURL(blob));
      addToast('PDF berhasil dipisahkan!', 'success');
    } catch (error: any) {
      clearTimeout(timeoutId);
      addToast(error.name === 'AbortError' ? "Waktu habis (5 menit)." : error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (outputUrl) {
    return (
      <ToolContainer title="Berhasil Dipisahkan!" onBack={onBack}>
        <div className="text-center flex flex-col items-center gap-6 animate-fade-in">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Halaman {pages} Berhasil Diekstrak</h3>
            <p className="text-gray-500 dark:text-gray-400">File hasil pemisahan siap diunduh.</p>
          </div>
          <a href={outputUrl} download={`split-${pages}-${file?.name}`} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg w-full max-w-sm shadow-lg transition-all">Unduh Hasil PDF</a>
          <button onClick={() => setOutputUrl(null)} className="text-blue-600 hover:underline">Pisahkan Lagi</button>
        </div>
      </ToolContainer>
    );
  }

  return (
    <ToolContainer title="Pisahkan PDF (Server)" onBack={onBack}>
      <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} />
      
      {!file ? (
        <div 
          className={`p-12 border-2 border-dashed rounded-xl text-center transition-colors ${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-slate-800/50' : 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50'}`}
          onDragOver={(e) => {e.preventDefault(); setIsDragOver(true)}}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {e.preventDefault(); setIsDragOver(false); handleFileChange(e.dataTransfer.files[0])}}
        >
          <UploadIcon className="mx-auto mb-4" />
          <p className="font-bold text-gray-700 dark:text-gray-200">Seret PDF di sini</p>
          <button onClick={() => fileInputRef.current?.click()} className="mt-4 bg-gray-800 dark:bg-slate-700 text-white py-2 px-6 rounded-lg font-bold">Pilih File</button>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg flex items-center justify-between border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <FilePdfIcon />
              <span className="truncate font-medium max-w-[250px]">{file.name}</span>
            </div>
            <button onClick={() => setFile(null)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Rentang Halaman:</label>
            <input type="text" value={pages} onChange={(e) => setPages(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: 1-5 atau 1,3,5" />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 italic">Gunakan tanda hubung (-) untuk rentang dan koma (,) untuk halaman spesifik.</p>
          </div>
          <button onClick={handleProcess} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all disabled:opacity-50">
            {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                   <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   Memproses di Server...
                </div>
            ) : "Pisahkan PDF Sekarang"}
          </button>
        </div>
      )}
    </ToolContainer>
  );
};

export default SplitPdf;
