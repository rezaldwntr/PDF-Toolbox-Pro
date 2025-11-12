import React, { useState, useRef, useCallback, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, ZipIcon, TrashIcon } from '../icons';
import PdfPagePreview from './PdfPagePreview';
import { PDFDocument } from 'pdf-lib';
import { useToast } from '../../contexts/ToastContext';

// Memberi tahu TypeScript tentang variabel global dari CDN
declare const pdfjsLib: any;
declare const JSZip: any;

interface PdfFileWithBuffer {
  file: File;
  buffer: ArrayBuffer;
}

// Fungsi utilitas untuk mem-parsing rentang halaman
const parsePageRanges = (rangeStr: string, maxPage: number): Set<number> => {
    const pages = new Set<number>();
    if (!rangeStr) return pages;
    rangeStr.split(',').forEach(part => {
        part = part.trim();
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(p => parseInt(p.trim(), 10));
            if (!isNaN(start) && !isNaN(end) && start <= end) {
                for (let i = start; i <= Math.min(end, maxPage); i++) {
                    if (i > 0) pages.add(i);
                }
            }
        } else {
            const page = parseInt(part, 10);
            if (!isNaN(page) && page > 0 && page <= maxPage) {
                pages.add(page);
            }
        }
    });
    return pages;
};

// Fungsi utilitas untuk mengubah set halaman menjadi string rentang
const pagesToRangeString = (pages: Set<number>): string => {
    if (pages.size === 0) return '';
    const sortedPages = Array.from(pages).sort((a, b) => a - b);
    const ranges = [];
    let start = sortedPages[0];
    let end = sortedPages[0];
    for (let i = 1; i < sortedPages.length; i++) {
        if (sortedPages[i] === end + 1) {
            end = sortedPages[i];
        } else {
            ranges.push(start === end ? `${start}` : `${start}-${end}`);
            start = sortedPages[i];
            end = sortedPages[i];
        }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges.join(', ');
};

const SplitPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [fileWithBuffer, setFileWithBuffer] = useState<PdfFileWithBuffer | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [splitMode, setSplitMode] = useState<'all' | 'extract'>('extract');
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [rangeInput, setRangeInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');
    const [output, setOutput] = useState<{ url: string; filename: string; isZip: boolean } | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    const resetState = useCallback(() => {
        setFileWithBuffer(null);
        setPdfDoc(null);
        setNumPages(0);
        setSelectedPages(new Set());
        setRangeInput('');
        setIsProcessing(false);
        setProcessingMessage('');
        if (output) {
            URL.revokeObjectURL(output.url);
        }
        setOutput(null);
    }, [output]);

    const handleFileChange = async (selectedFile: File | null) => {
        if (!selectedFile || selectedFile.type !== 'application/pdf') return;
        resetState();
        setIsProcessing(true);
        setProcessingMessage('Membaca file, mohon tunggu...');
        
        try {
            const buffer = await selectedFile.arrayBuffer();
            setFileWithBuffer({ file: selectedFile, buffer });
            
            setProcessingMessage('Merender pratinjau PDF...');
            const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
            setPdfDoc(doc);
            setNumPages(doc.numPages);
        } catch (error) {
            console.error("Gagal memuat PDF:", error);
            addToast("Gagal memuat file PDF. Pastikan file tidak rusak.", 'error');
            resetState();
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleTogglePage = (pageNumber: number) => {
        const newSelectedPages = new Set(selectedPages);
        if (newSelectedPages.has(pageNumber)) {
            newSelectedPages.delete(pageNumber);
        } else {
            newSelectedPages.add(pageNumber);
        }
        setSelectedPages(newSelectedPages);
        setRangeInput(pagesToRangeString(newSelectedPages));
    };

    const handleRangeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newRangeInput = e.target.value;
        setRangeInput(newRangeInput);
        const newSelectedPages = parsePageRanges(newRangeInput, numPages);
        setSelectedPages(newSelectedPages);
    };

    const handleProcess = async () => {
        if (!fileWithBuffer) return;
        
        setIsProcessing(true);
        setProcessingMessage('Memproses PDF...');
        try {
            if (splitMode === 'all') {
                const zip = new JSZip();
                const pdfBytes = fileWithBuffer.buffer;
                const originalPdf = await PDFDocument.load(pdfBytes);
                
                for (let i = 0; i < originalPdf.getPageCount(); i++) {
                    const newPdf = await PDFDocument.create();
                    const [copiedPage] = await newPdf.copyPages(originalPdf, [i]);
                    newPdf.addPage(copiedPage);
                    const newPdfBytes = await newPdf.save();
                    zip.file(`halaman_${i + 1}.pdf`, newPdfBytes);
                }

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(zipBlob);
                setOutput({ url, filename: `${fileWithBuffer.file.name.replace('.pdf', '')}-dipisah.zip`, isZip: true });

            } else { // extract mode
                if (selectedPages.size === 0) {
                    addToast('Pilih setidaknya satu halaman untuk diekstrak.', 'warning');
                    setIsProcessing(false);
                    return;
                }
                const pdfBytes = fileWithBuffer.buffer;
                const originalPdf = await PDFDocument.load(pdfBytes);
                const newPdf = await PDFDocument.create();
                const pageIndices = Array.from(selectedPages).map(p => p - 1).sort((a,b) => a - b);
                
                const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
                copiedPages.forEach(page => newPdf.addPage(page));

                const newPdfBytes = await newPdf.save();
                const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                setOutput({ url, filename: `${fileWithBuffer.file.name.replace('.pdf', '')}-diekstrak.pdf`, isZip: false });
            }
            addToast('PDF berhasil diproses!', 'success');
        } catch (error) {
            console.error("Gagal memisahkan PDF:", error);
            addToast("Terjadi kesalahan saat memproses PDF.", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    if (output) {
        return (
            <ToolContainer title="PDF Berhasil Diproses!" onBack={onBack}>
                <div className="text-center text-slate-400 flex flex-col items-center gap-6">
                    <p className="text-lg">File Anda telah berhasil dipisahkan.</p>
                    <a href={output.url} download={output.filename} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg">
                        {output.isZip ? <ZipIcon /> : <DownloadIcon />}
                        Unduh {output.isZip ? 'File ZIP' : 'PDF Hasil Ekstrak'}
                    </a>
                    <button onClick={resetState} className="font-medium text-slate-400 hover:text-blue-400 transition-colors">
                        Pisahkan PDF Lainnya
                    </button>
                </div>
            </ToolContainer>
        );
    }
    
    if (isProcessing) {
        return (
            <ToolContainer title="Pisahkan PDF" onBack={onBack}>
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <svg className="animate-spin h-10 w-10 text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="text-lg text-slate-300 font-semibold">{processingMessage}</p>
                    <p className="text-slate-500">Mohon tunggu...</p>
                </div>
            </ToolContainer>
        )
    }

    return (
        <ToolContainer title="Pisahkan PDF" onBack={onBack}>
            <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} />
            
            {!fileWithBuffer ? (
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
            ) : (
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Panel Opsi */}
                    <div className="w-full md:w-1/3 lg:w-1/4">
                        <h3 className="font-bold text-slate-200 mb-4">Opsi Pemisahan</h3>
                        <div className="space-y-4">
                            <label onClick={() => setSplitMode('extract')} className={`flex items-center p-4 rounded-lg cursor-pointer border-2 transition-colors ${splitMode === 'extract' ? 'bg-blue-900/50 border-blue-500' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'}`}>
                                <input type="radio" name="split-mode" checked={splitMode === 'extract'} onChange={() => {}} className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                <span className="ml-3 text-sm font-medium text-slate-300">Ekstrak Halaman</span>
                            </label>
                             <label onClick={() => setSplitMode('all')} className={`flex items-center p-4 rounded-lg cursor-pointer border-2 transition-colors ${splitMode === 'all' ? 'bg-blue-900/50 border-blue-500' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'}`}>
                                <input type="radio" name="split-mode" checked={splitMode === 'all'} onChange={() => {}} className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                <span className="ml-3 text-sm font-medium text-slate-300">Pisahkan Semua Halaman</span>
                            </label>
                        </div>

                        {splitMode === 'extract' && (
                            <div className="mt-6">
                                <label htmlFor="page-range" className="block mb-2 text-sm font-medium text-slate-400">Pilih halaman atau rentang</label>
                                <input type="text" id="page-range" value={rangeInput} onChange={handleRangeInputChange} className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="Contoh: 1, 3, 5-8" />
                                <p className="text-xs text-slate-500 mt-2">{selectedPages.size} halaman dipilih.</p>
                            </div>
                        )}
                         {splitMode === 'all' && (
                            <div className="mt-6 p-4 bg-slate-700/50 rounded-lg text-sm text-slate-400">
                                Setiap halaman dari PDF Anda akan disimpan sebagai file terpisah, lalu digabungkan dalam satu file ZIP.
                            </div>
                        )}
                        <div className="mt-8">
                            <button onClick={handleProcess} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg flex items-center justify-center">
                               {isProcessing ? 'Memproses...' : (splitMode === 'all' ? `Pisahkan ${numPages} Halaman` : 'Ekstrak Halaman')}
                            </button>
                        </div>
                    </div>

                    {/* Panel Pratinjau */}
                    <div className="w-full md:w-2/3 lg:w-3/4 bg-slate-900/50 p-4 rounded-lg max-h-[60vh] overflow-y-auto">
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-400 mb-4">
                            <span className="truncate" title={fileWithBuffer.file.name}>{fileWithBuffer.file.name}</span>
                            <span>- {numPages} Halaman</span>
                            <button
                                onClick={resetState}
                                title="Hapus file dan mulai lagi"
                                className="p-1 text-slate-500 hover:text-red-400 rounded-full transition-colors"
                            >
                                <TrashIcon />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNumber => (
                                <div key={pageNumber} onClick={() => splitMode === 'extract' && handleTogglePage(pageNumber)} className={`relative rounded-lg border-2 ${selectedPages.has(pageNumber) ? 'border-blue-500' : 'border-transparent'} ${splitMode === 'extract' ? 'cursor-pointer' : 'cursor-default'}`}>
                                    <div className={`transition-opacity duration-200 ${selectedPages.has(pageNumber) ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}>
                                      <PdfPagePreview pdfDoc={pdfDoc} pageNumber={pageNumber} />
                                    </div>
                                    <div className="absolute top-1 left-1 bg-slate-800/80 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">{pageNumber}</div>
                                    {selectedPages.has(pageNumber) && (
                                        <div className="absolute inset-0 bg-blue-500/30 rounded-md flex items-center justify-center">
                                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </ToolContainer>
    );
};

export default SplitPdf;