
import React, { useState, useRef, useCallback, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, TrashIcon, FilePdfIcon, CheckCircleIcon, ZipIcon } from '../icons';
import { useToast } from '../../contexts/ToastContext';

// Deklarasi global untuk pdfjsLib dari CDN
declare const pdfjsLib: any;

const BACKEND_URL = 'https://api-backend.club';

interface SplitPdfProps {
  onBack: () => void;
}

interface PagePreview {
  pageNumber: number;
  url: string;
  selected: boolean;
}

// Frontend modes mapping to UI logic
type FrontendMode = 'range' | 'selected' | 'fixed' | 'all';

const SplitPdf: React.FC<SplitPdfProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pagePreviews, setPagePreviews] = useState<PagePreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputFileType, setOutputFileType] = useState<'pdf' | 'zip'>('pdf');
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  
  // Split Configuration State
  const [mode, setMode] = useState<FrontendMode>('range');
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(1);
  const [fixedStep, setFixedStep] = useState<number>(2); // Default setiap 2 halaman
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const resetState = () => {
    setFile(null);
    setPagePreviews([]);
    setOutputUrl(null);
    setRangeStart(1);
    setRangeEnd(1);
    setFixedStep(2);
    setMode('range');
    setOutputFileType('pdf');
  };

  const handleFileChange = async (selectedFile: File | null) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setOutputUrl(null);
      setIsLoadingFile(true);
      setProcessingMessage('Membaca PDF dan membuat pratinjau...');

      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
        
        const previews: PagePreview[] = [];
        const numPages = pdfDoc.numPages;

        // Render thumbnail untuk setiap halaman
        for (let i = 1; i <= numPages; i++) {
            setProcessingMessage(`Memuat halaman ${i} dari ${numPages}...`);
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.3 }); // Low res for thumbnails
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            previews.push({
                pageNumber: i,
                url: canvas.toDataURL('image/jpeg', 0.8),
                selected: false
            });
        }
        
        setPagePreviews(previews);
        setRangeEnd(numPages); // Default end range to max pages
      } catch (error) {
        console.error(error);
        addToast("Gagal memuat PDF. File mungkin rusak atau terproteksi.", 'error');
        resetState();
      } finally {
        setIsLoadingFile(false);
      }
    }
  };

  const togglePageSelection = (pageNumber: number) => {
    if (mode !== 'selected') setMode('selected');
    setPagePreviews(prev => prev.map(p => 
        p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p
    ));
  };

  const selectAllPages = () => {
    setPagePreviews(prev => prev.map(p => ({ ...p, selected: true })));
    setMode('selected');
  };

  const deselectAllPages = () => {
    setPagePreviews(prev => prev.map(p => ({ ...p, selected: false })));
    setMode('selected');
  };

  const handleProcess = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    // Konfigurasi Parameter Backend berdasarkan Mode Frontend
    let backendMode = 'extract';
    let resultExt: 'pdf' | 'zip' = 'pdf';

    if (mode === 'range') {
        // Mode 1a: Extract Range
        backendMode = 'extract';
        formData.append('split_mode', 'extract');
        formData.append('pages', `${rangeStart}-${rangeEnd}`);
        resultExt = 'pdf';
    } else if (mode === 'selected') {
        // Mode 1b: Extract Selected
        const selectedPages = pagePreviews.filter(p => p.selected).map(p => p.pageNumber);
        if (selectedPages.length === 0) {
            addToast('Pilih setidaknya satu halaman.', 'warning');
            return;
        }
        backendMode = 'extract';
        formData.append('split_mode', 'extract');
        formData.append('pages', selectedPages.join(','));
        resultExt = 'pdf';
    } else if (mode === 'fixed') {
        // Mode 2: Fixed Step (ZIP output)
        backendMode = 'fixed';
        formData.append('split_mode', 'fixed');
        formData.append('fixed_step', fixedStep.toString());
        resultExt = 'zip';
    } else if (mode === 'all') {
        // Mode 3: All Pages (ZIP output)
        backendMode = 'all';
        formData.append('split_mode', 'all');
        resultExt = 'zip';
    }

    setIsProcessing(true);
    setProcessingMessage('Memproses di server...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    try {
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
      setOutputFileType(resultExt);
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
          <CheckCircleIcon className="w-16 h-16 text-green-500"/>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">File Siap Diunduh</h3>
            <p className="text-gray-500 dark:text-gray-400">
                {outputFileType === 'zip' 
                    ? 'Dokumen Anda telah dipecah menjadi beberapa file (ZIP).' 
                    : 'Halaman pilihan Anda telah diekstrak menjadi satu file PDF.'}
            </p>
          </div>
          <a 
            href={outputUrl} 
            download={`split-${file?.name.replace('.pdf', '')}.${outputFileType}`} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg w-full max-w-sm shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {outputFileType === 'zip' ? <ZipIcon className="w-6 h-6"/> : <DownloadIcon className="w-6 h-6"/>}
            Unduh Hasil ({outputFileType.toUpperCase()})
          </a>
          <button onClick={() => setOutputUrl(null)} className="text-blue-600 hover:underline">Pisahkan Bagian Lain</button>
        </div>
      </ToolContainer>
    );
  }

  return (
    <ToolContainer title="Pisahkan PDF Pro" onBack={onBack} maxWidth="max-w-6xl">
      <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} />
      
      {!file ? (
        <div 
          className={`p-16 border-2 border-dashed rounded-2xl text-center transition-colors ${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-slate-800/50' : 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50'}`}
          onDragOver={(e) => {e.preventDefault(); setIsDragOver(true)}}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {e.preventDefault(); setIsDragOver(false); handleFileChange(e.dataTransfer.files[0])}}
        >
          {isLoadingFile ? (
             <div className="flex flex-col items-center">
                <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p className="font-medium text-gray-600 dark:text-gray-300">{processingMessage}</p>
             </div>
          ) : (
            <>
                <UploadIcon className="mx-auto mb-4 w-16 h-16 text-gray-400" />
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">Seret & Lepas PDF Di Sini</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">atau klik tombol di bawah untuk memilih file</p>
                <button onClick={() => fileInputRef.current?.click()} className="bg-gray-900 hover:bg-gray-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-3 px-8 rounded-xl font-bold shadow-lg transition-transform hover:scale-105">
                    Pilih File PDF
                </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          {/* Sidebar Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm sticky top-4">
                <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <FilePdfIcon />
                    <div className="overflow-hidden">
                        <p className="truncate font-bold text-gray-800 dark:text-gray-200 text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{pagePreviews.length} Halaman • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button onClick={resetState} className="ml-auto text-red-500 hover:bg-red-50 p-1 rounded"><TrashIcon className="w-4 h-4"/></button>
                </div>

                <h3 className="font-bold text-gray-900 dark:text-white mb-3">Pilih Mode Pemisahan</h3>
                <div className="flex flex-col gap-2 mb-6">
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${mode === 'range' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                        <input type="radio" name="mode" checked={mode === 'range'} onChange={() => setMode('range')} className="text-blue-600 focus:ring-blue-500" />
                        <div>
                            <span className="block font-semibold text-sm text-gray-800 dark:text-gray-200">Rentang Khusus</span>
                            <span className="text-[10px] text-gray-500">Ambil dari hal X sampai Y (1 PDF)</span>
                        </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${mode === 'selected' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                        <input type="radio" name="mode" checked={mode === 'selected'} onChange={() => setMode('selected')} className="text-blue-600 focus:ring-blue-500" />
                        <div>
                            <span className="block font-semibold text-sm text-gray-800 dark:text-gray-200">Halaman Terpilih</span>
                            <span className="text-[10px] text-gray-500">Pilih manual visual (1 PDF)</span>
                        </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${mode === 'fixed' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                        <input type="radio" name="mode" checked={mode === 'fixed'} onChange={() => setMode('fixed')} className="text-blue-600 focus:ring-blue-500" />
                        <div>
                            <span className="block font-semibold text-sm text-gray-800 dark:text-gray-200">Pecah Per Halaman</span>
                            <span className="text-[10px] text-gray-500">Setiap X halaman jadi 1 file (ZIP)</span>
                        </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${mode === 'all' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                        <input type="radio" name="mode" checked={mode === 'all'} onChange={() => setMode('all')} className="text-blue-600 focus:ring-blue-500" />
                        <div>
                            <span className="block font-semibold text-sm text-gray-800 dark:text-gray-200">Ekstrak Semua</span>
                            <span className="text-[10px] text-gray-500">Semua halaman jadi file terpisah (ZIP)</span>
                        </div>
                    </label>
                </div>

                {/* Dynamic Controls based on Mode */}
                <div className="bg-gray-50 dark:bg-slate-700/30 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-all">
                    {mode === 'range' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Atur Rentang</label>
                            <div className="flex items-center gap-2">
                                <input type="number" min="1" max={pagePreviews.length} value={rangeStart} onChange={(e) => setRangeStart(Number(e.target.value))} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                <span className="text-gray-400">-</span>
                                <input type="number" min="1" max={pagePreviews.length} value={rangeEnd} onChange={(e) => setRangeEnd(Number(e.target.value))} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">Menghasilkan 1 file PDF berisi halaman {rangeStart} sampai {rangeEnd}.</p>
                        </div>
                    )}

                    {mode === 'selected' && (
                         <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Halaman Terpilih</label>
                            <div className="flex gap-2 mb-2">
                                <button onClick={selectAllPages} className="text-xs bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 px-2 py-1 rounded">Pilih Semua</button>
                                <button onClick={deselectAllPages} className="text-xs bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 px-2 py-1 rounded">Reset</button>
                            </div>
                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 break-words mb-2">
                                {pagePreviews.filter(p => p.selected).map(p => p.pageNumber).join(', ') || "Klik halaman di kanan untuk memilih"}
                            </p>
                            <p className="text-[10px] text-gray-500">Menghasilkan 1 file PDF berisi halaman yang dipilih.</p>
                         </div>
                    )}

                    {mode === 'fixed' && (
                        <div>
                             <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Pisahkan Setiap</label>
                             <div className="flex items-center gap-2 mb-2">
                                <input type="number" min="1" max={pagePreviews.length} value={fixedStep} onChange={(e) => setFixedStep(Number(e.target.value))} className="w-20 p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                <span className="text-sm text-gray-600 dark:text-gray-300">Halaman</span>
                             </div>
                             <p className="text-[10px] text-gray-500">
                                Contoh: Jika diisi 2, PDF 10 halaman akan menjadi 5 file PDF (hal 1-2, 3-4, dst) dalam satu ZIP.
                             </p>
                        </div>
                    )}
                    
                    {mode === 'all' && (
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                                Mode ini akan mengekstrak setiap halaman menjadi file PDF terpisah.
                            </p>
                            <p className="text-[10px] text-gray-500 mt-2">
                                Hasil unduhan berupa file ZIP yang berisi {pagePreviews.length} file PDF.
                            </p>
                        </div>
                    )}
                </div>

                <button onClick={handleProcess} disabled={isProcessing} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {isProcessing ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Memproses...
                        </>
                    ) : `Pisahkan PDF ${mode === 'fixed' || mode === 'all' ? '(ZIP)' : ''}`}
                </button>
            </div>
          </div>

          {/* Visual Grid Preview */}
          <div className="lg:col-span-2">
             <div className="bg-gray-100 dark:bg-slate-900 rounded-xl p-4 h-[600px] overflow-y-auto border border-gray-200 dark:border-slate-700 shadow-inner">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {pagePreviews.map((page) => (
                        <div 
                            key={page.pageNumber}
                            onClick={() => togglePageSelection(page.pageNumber)}
                            className={`relative group cursor-pointer rounded-lg overflow-hidden transition-all duration-200 border-2 ${
                                (mode === 'selected' && page.selected) || (mode === 'range' && page.pageNumber >= rangeStart && page.pageNumber <= rangeEnd)
                                ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' 
                                : 'border-transparent hover:border-gray-300 dark:hover:border-slate-500'
                            }`}
                        >
                            <img src={page.url} alt={`Page ${page.pageNumber}`} className="w-full h-auto" />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 text-center font-bold">
                                Halaman {page.pageNumber}
                            </div>
                            
                            {/* Selection Indicator Overlay */}
                            {mode === 'selected' && (
                                <div className={`absolute inset-0 flex items-center justify-center bg-blue-500/20 transition-opacity ${page.selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${page.selected ? 'bg-blue-600 text-white' : 'bg-white/80 text-gray-400'}`}>
                                        <CheckCircleIcon className="w-6 h-6"/>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
             </div>
             <p className="text-center text-xs text-gray-400 mt-2">
                {mode === 'selected' ? 'Klik halaman untuk memilih secara manual' : 'Pratinjau visual dokumen'}
             </p>
          </div>
        </div>
      )}
    </ToolContainer>
  );
};

export default SplitPdf;
