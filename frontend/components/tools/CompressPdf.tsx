import React, { useState, useRef, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, CheckCircleIcon, FilePdfIcon, TrashIcon, CompressIcon } from '../icons';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import FileUploader from '../common/FileUploader';
import PdfPreview from './PdfPreview';

declare const pdfjsLib: any;

import { BACKEND_URL } from '../../config';

type CompressionOption = 'extreme' | 'recommended' | 'low' | 'target';

const CompressPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [compressionType, setCompressionType] = useState<CompressionOption>('recommended');
  const [targetSizeKb, setTargetSizeKb] = useState<number>(500);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);
  const { addToast } = useToast();
  const { quota, consumeQuota, setShowLimitModal } = useQuota();

  const handleFileChange = async (files: FileList | null) => {
    const selectedFile = files ? files[0] : null;
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setResultUrl(null);
      setResultSize(null);

      // Otomatis atur estimasi target ke 50% ukuran berkas jika masuk mode target
      const fileKb = Math.round(selectedFile.size / 1024);
      setTargetSizeKb(Math.max(100, Math.round(fileKb * 0.5)));

      try {
        const buffer = await selectedFile.arrayBuffer();
        setFileBuffer(buffer);
        if (typeof pdfjsLib !== 'undefined') {
          const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
          setPageCount(pdfDoc.numPages);
        }
      } catch (e) {
        console.warn('Gagal membaca preview dokumen:', e);
      }
    }
  };

  const handleCompress = async () => {
    if (!file) return;

    if (quota <= 0) {
      setShowLimitModal(true);
      return;
    }

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
      setResultSize(blob.size);
      setResultUrl(URL.createObjectURL(blob));
      consumeQuota(); // Pemotongan kuota tamu saat proses selesai
      addToast('Kompresi berhasil diselesaikan!', 'success');
    } catch (error: any) {
      clearTimeout(timeoutId);
      addToast(error.name === 'AbortError' ? "Waktu habis (5 menit)." : error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (resultUrl) {
    const origKb = file ? file.size / 1024 : 0;
    const newKb = resultSize ? resultSize / 1024 : 0;
    const savedPercent = origKb > 0 && newKb > 0 ? Math.max(0, Math.round(((origKb - newKb) / origKb) * 100)) : 0;

    return (
      <ToolContainer title="Kompresi Selesai!" onBack={onBack} currentStep={3}>
        <div className="text-center flex flex-col items-center gap-6 animate-fade-in">
          <CheckCircleIcon className="w-16 h-16 text-green-500" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">PDF Berhasil Dikompres</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Dokumen Anda telah dioptimalkan dengan standar kualitas tinggi.
            </p>
          </div>

          {/* Ringkasan Statistik Ukuran Berkas */}
          {file && resultSize && (
            <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-around shadow-xs">
              <div className="text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Ukuran Awal</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{origKb.toFixed(1)} KB</span>
              </div>
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-600" />
              <div className="text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Ukuran Baru</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{newKb.toFixed(1)} KB</span>
              </div>
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-600" />
              <div className="text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Hemat Ruang</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">-{savedPercent}%</span>
              </div>
            </div>
          )}

          <a 
            href={resultUrl} 
            download={`compressed-${file?.name}`} 
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl w-full max-w-sm shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <DownloadIcon className="w-5 h-5" />
            Unduh PDF Hasil Kompres
          </a>
          <button 
            onClick={() => {
              setResultUrl(null);
              setResultSize(null);
            }} 
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
          >
            Kompres File Lain
          </button>
        </div>
      </ToolContainer>
    );
  }

  return (
    <ToolContainer 
      title="Kompres PDF" 
      description="Kecilkan ukuran file PDF tanpa menurunkan kualitas teks & gambar."
      onBack={onBack} 
      maxWidth="max-w-5xl"
      currentStep={!file ? 1 : 2}
    >
      
      {!file ? (
        <FileUploader 
            onFileSelect={handleFileChange} 
            label="Pilih PDF untuk Dikompres"
            description="Seret file PDF ke sini untuk memperkecil ukurannya"
        />
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Card Pratinjau Visual Dokumen Asli */}
          <div className="w-full max-w-md mx-auto bg-white dark:bg-[#1E222B] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:shadow-md transition-all">
            <button 
              onClick={() => { setFile(null); setFileBuffer(null); setPageCount(0); }} 
              className="absolute top-2.5 right-2.5 p-1.5 text-rose-500 bg-white/90 dark:bg-slate-800/90 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full shadow-md z-10 transition-transform active:scale-90 border border-slate-200 dark:border-slate-700"
              title="Hapus dan pilih file lain"
            >
              <TrashIcon className="w-4 h-4" />
            </button>

            {/* Visual Canvas Pratinjau Lembar Pertama */}
            {fileBuffer && (
              <div className="w-full max-w-[220px] mx-auto rounded-lg overflow-hidden shadow-xs">
                <PdfPreview buffer={fileBuffer} />
              </div>
            )}

            {/* Info Berkas */}
            <div className="mt-3 text-center px-2">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {(file.size / 1024).toFixed(1)} KB {pageCount > 0 ? `• ${pageCount} Halaman` : ''}
              </p>
            </div>
          </div>
          
          {/* Pilihan 4 Mode Kompresi */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 text-center">
              Pilih Tingkat Kompresi
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Kompres Tinggi */}
              <button 
                type="button"
                onClick={() => setCompressionType('extreme')} 
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  compressionType === 'extreme' 
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 shadow-sm ring-2 ring-blue-500/20' 
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E222B] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                      Pengecilan Max
                    </span>
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">~70-85%</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Kompres Tinggi</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Ukuran paling kecil. Teks tetap tajam, resolusi gambar standar web.
                  </p>
                </div>
              </button>

              {/* 2. Rekomendasi (Default) */}
              <button 
                type="button"
                onClick={() => setCompressionType('recommended')} 
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  compressionType === 'recommended' 
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 shadow-sm ring-2 ring-blue-500/20' 
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E222B] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      ⭐ Rekomendasi
                    </span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">~50-70%</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Standar Seimbang</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Keseimbangan optimal antara penghematan ruang & kualitas visual dokumen.
                  </p>
                </div>
              </button>

              {/* 3. Kompres Rendah */}
              <button 
                type="button"
                onClick={() => setCompressionType('low')} 
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  compressionType === 'low' 
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 shadow-sm ring-2 ring-blue-500/20' 
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E222B] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Kualitas HD
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">~20-40%</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Kompres Rendah</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Kualitas gambar mendekati aslinya dengan kompresi struktur yang ringan.
                  </p>
                </div>
              </button>

              {/* 4. Ukuran Target */}
              <button 
                type="button"
                onClick={() => setCompressionType('target')} 
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  compressionType === 'target' 
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 shadow-sm ring-2 ring-blue-500/20' 
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E222B] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                      🎯 Kustom KB
                    </span>
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Presisi</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Ukuran Target</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Tentukan batas ukuran berkas yang Anda inginkan secara spesifik dalam KB.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Input Tambahan untuk Mode Ukuran Target */}
          {compressionType === 'target' && (
            <div className="animate-fade-in bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Target Ukuran Maksimal (KB):
                </label>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Ukuran saat ini: {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  min="30"
                  max={Math.max(100, Math.round(file.size / 1024))}
                  value={targetSizeKb} 
                  onChange={(e) => setTargetSizeKb(Math.max(1, Number(e.target.value)))} 
                  className="flex-1 p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  placeholder="Misal: 500"
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 px-4 py-3 bg-slate-200/70 dark:bg-slate-700 rounded-xl">
                  KB
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pilihan Cepat:</span>
                {[200, 500, 1000, 2000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTargetSizeKb(preset)}
                    className={`text-xs px-3 py-1 rounded-lg border font-medium transition-all ${
                      targetSizeKb === preset
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-blue-500'
                    }`}
                  >
                    {preset >= 1000 ? `${preset / 1000} MB` : `${preset} KB`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={handleCompress} 
            disabled={isProcessing} 
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
               <div className="flex items-center justify-center gap-2">
                 <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 Mengompres di Server (In-Memory)...
               </div>
            ) : (
              <>
                <CompressIcon className="w-5 h-5" />
                Kompres PDF Sekarang
              </>
            )}
          </button>
        </div>
      )}
    </ToolContainer>
  );
};

export default CompressPdf;

