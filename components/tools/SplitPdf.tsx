
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
    const sortedPages = Array.from(pages).sort((a, b) => Number(a) - Number(b));
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
    const [splitMode, setSplitMode] = useState<'all' | 'extract' | 'fixed'>('extract');
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [rangeInput, setRangeInput] = useState('');
    const [fixedRange, setFixedRange] = useState<number>(1);
    const [customFilename, setCustomFilename] = useState<string>('');
    const [fixedRangeFilenames, setFixedRangeFilenames] = useState<Record<number, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');
    const [output, setOutput] = useState<{ url: string; filename: string; isZip: boolean } | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    useEffect(() => {
        // Reset state yang relevan saat mode berubah untuk menghindari kebingungan
        setSelectedPages(new Set());
        setRangeInput('');
        setCustomFilename('');
        setFixedRangeFilenames({});
    }, [splitMode]);

    const resetState = useCallback(() => {
        setFileWithBuffer(null);
        setPdfDoc(null);
        setNumPages(0);
        setSelectedPages(new Set<number>());
        setRangeInput('');
        setFixedRange(1);
        setCustomFilename('');
        setFixedRangeFilenames({});
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
        const newSelectedPages = new Set<number>(selectedPages);
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

    const handleFixedFilenameChange = (groupIndex: number, filename: string) => {
        setFixedRangeFilenames(prev => ({
            ...prev,
            [groupIndex]: filename
        }));
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
                const baseFilename = customFilename.trim() || 'halaman';
                
                for (let i = 0; i < originalPdf.getPageCount(); i++) {
                    const newPdf = await PDFDocument.create();
                    const [copiedPage] = await newPdf.copyPages(originalPdf, [i]);
                    newPdf.addPage(copiedPage);
                    const newPdfBytes = await newPdf.save();
                    zip.file(`${baseFilename}_${i + 1}.pdf`, newPdfBytes);
                }

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(zipBlob);
                const finalZipName = `${customFilename.trim() || fileWithBuffer.file.name.replace('.pdf', '')}-dipisah.zip`;
                setOutput({ url, filename: finalZipName, isZip: true });

            } else if (splitMode === 'extract') {
                if (selectedPages.size === 0) {
                    addToast('Pilih setidaknya satu halaman untuk diekstrak.', 'warning');
                    setIsProcessing(false);
                    return;
                }
                const pdfBytes = fileWithBuffer.buffer;
                const originalPdf = await PDFDocument.load(pdfBytes);
                const newPdf = await PDFDocument.create();
                const pageIndices = Array.from(selectedPages).map(p => Number(p) - 1).sort((a,b) => Number(a) - Number(b));
                
                const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
                copiedPages.forEach(page => newPdf.addPage(page));

                const newPdfBytes = await newPdf.save();
                const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);

                let finalFilename = customFilename.trim();
                if (finalFilename) {
                    if (!finalFilename.toLowerCase().endsWith('.pdf')) {
                        finalFilename += '.pdf';
                    }
                } else {
                    finalFilename = `${fileWithBuffer.file.name.replace('.pdf', '')}-diekstrak.pdf`;
                }

                setOutput({ url, filename: finalFilename, isZip: false });
            } else if (splitMode === 'fixed') {
                if (fixedRange < 1) {
                    addToast('Rentang halaman harus minimal 1.', 'warning');
                    setIsProcessing(false);
                    return;
                }
                const zip = new JSZip();
                const pdfBytes = fileWithBuffer.buffer;
                const originalPdf = await PDFDocument.load(pdfBytes);
                const totalPages = originalPdf.getPageCount();
                const originalFilenameBase = fileWithBuffer.file.name.replace('.pdf', '');

                let fileCounter = 0;
                for (let i = 0; i < totalPages; i += fixedRange) {
                    const newPdf = await PDFDocument.create();
                    const startPage = i;
                    const endPage = Math.min(i + fixedRange, totalPages);
                    
                    const pageIndices = [];
                    for (let j = startPage; j < endPage; j++) {
                        pageIndices.push(j);
                    }

                    if (pageIndices.length > 0) {
                        const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
                        copiedPages.forEach(page => newPdf.addPage(page));

                        const newPdfBytes = await newPdf.save();
                        
                        const customName = fixedRangeFilenames[fileCounter]?.trim();
                        const filename = customName 
                            ? `${customName}.pdf`
                            : `${originalFilenameBase}-${fileCounter + 1}.pdf`;

                        zip.file(filename, newPdfBytes);
                        fileCounter++;
                    }
                }
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(zipBlob);
                setOutput({ url, filename: `${originalFilenameBase}-rentang.zip`, isZip: true });
            }

            addToast('PDF berhasil diproses!', 'success');
        } catch (error) {
            console.error("Gagal memisahkan PDF:", error);
            addToast("Terjadi kesalahan saat memproses PDF.", 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const getButtonText = () => {
        if (isProcessing) return 'Memproses...';
        if (splitMode === 'all') return `Pisahkan ${numPages} Halaman`;
        if (splitMode === 'extract') return `Ekstrak ${selectedPages.size} Halaman`;
        if (splitMode === 'fixed') return 'Pisahkan Berdasarkan Rentang';
        return 'Proses';
    };

    if (output) {
        return (
            <ToolContainer title="PDF Berhasil Diproses!" onBack={onBack}>
                <div className="text-center text-gray-600 dark:text-gray-300 flex flex-col items-center gap-6">
                    <p className="text-lg">File Anda telah berhasil dipisahkan.</p>
                    <a href={output.url} download={output.filename} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg shadow-sm shadow-blue-200 dark:shadow-none">
                        {output.isZip ? <ZipIcon /> : <DownloadIcon />}
                        Unduh {output.isZip ? 'File ZIP' : 'PDF Hasil Ekstrak'}
                    </a>
                    <button onClick={resetState} className="font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
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
                    <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="text-lg text-gray-700 dark:text-gray-200 font-semibold">{processingMessage}</p>
                    <p className="text-gray-500 dark:text-gray-400">Mohon tunggu...</p>
                </div>
            </ToolContainer>
        )
    }

    return (
        <ToolContainer title="Pisahkan PDF" onBack={onBack}>
            <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} />
            
            {!fileWithBuffer ? (
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
            ) : (
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Panel Opsi */}
                    <div className="w-full md:w-1/3 lg:w-1/4">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Opsi Pemisahan</h3>
                        <div className="space-y-4">
                            <label onClick={() => setSplitMode('extract')} className={`flex items-center p-4 rounded-lg cursor-pointer border transition-colors ${splitMode === 'extract' ? 'bg-blue-50 border-blue-500 shadow-sm dark:bg-blue-900/20 dark:border-blue-500' : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600'}`}>
                                <input type="radio" name="split-mode" checked={splitMode === 'extract'} onChange={() => {}} className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2 dark:bg-slate-700 dark:border-slate-600" />
                                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-200">Ekstrak Halaman</span>
                            </label>
                            <label onClick={() => setSplitMode('fixed')} className={`flex items-center p-4 rounded-lg cursor-pointer border transition-colors ${splitMode === 'fixed' ? 'bg-blue-50 border-blue-500 shadow-sm dark:bg-blue-900/20 dark:border-blue-500' : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600'}`}>
                                <input type="radio" name="split-mode" checked={splitMode === 'fixed'} onChange={() => {}} className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2 dark:bg-slate-700 dark:border-slate-600" />
                                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-200">Pisahkan Rentang Tetap</span>
                            </label>
                            <label onClick={() => setSplitMode('all')} className={`flex items-center p-4 rounded-lg cursor-pointer border transition-colors ${splitMode === 'all' ? 'bg-blue-50 border-blue-500 shadow-sm dark:bg-blue-900/20 dark:border-blue-500' : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600'}`}>
                                <input type="radio" name="split-mode" checked={splitMode === 'all'} onChange={() => {}} className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2 dark:bg-slate-700 dark:border-slate-600" />
                                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-200">Pisahkan Semua Halaman</span>
                            </label>
                        </div>

                        {splitMode === 'extract' && (
                            <div className="mt-6 space-y-4 animate-fade-in">
                                <div>
                                    <label htmlFor="page-range" className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Pilih halaman atau rentang</label>
                                    <input type="text" id="page-range" value={rangeInput} onChange={handleRangeInputChange} className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm" placeholder="Contoh: 1, 3, 5-8" />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{selectedPages.size} halaman dipilih.</p>
                                </div>
                                <div>
                                    <label htmlFor="custom-filename-extract" className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Nama file kustom (opsional)</label>
                                    <input 
                                        type="text" 
                                        id="custom-filename-extract"
                                        value={customFilename}
                                        onChange={(e) => setCustomFilename(e.target.value)}
                                        className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm"
                                        placeholder="Contoh: Laporan-Penting"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">File akan disimpan sebagai: Nama-File.pdf</p>
                                </div>
                            </div>
                        )}
                         {splitMode === 'fixed' && (
                            <div className="mt-6 space-y-4 animate-fade-in">
                                <div>
                                    <label htmlFor="fixed-range" className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Halaman per file</label>
                                    <input 
                                        type="number" 
                                        id="fixed-range"
                                        value={fixedRange}
                                        onChange={(e) => setFixedRange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                        min="1"
                                        className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm"
                                    />
                                </div>
                            </div>
                        )}
                         {splitMode === 'all' && (
                            <div className="mt-6 animate-fade-in">
                                <p className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700">
                                    Setiap halaman dari PDF Anda akan disimpan sebagai file terpisah, lalu digabungkan dalam satu file ZIP.
                                </p>
                                <div className="mt-4">
                                    <label htmlFor="custom-filename-all" className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Nama dasar file kustom (opsional)</label>
                                    <input 
                                        type="text" 
                                        id="custom-filename-all"
                                        value={customFilename}
                                        onChange={(e) => setCustomFilename(e.target.value)}
                                        className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm"
                                        placeholder="Contoh: Lampiran"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">File akan dinamai: Nama-File_1.pdf, dst.</p>
                                </div>
                            </div>
                        )}
                        <div className="mt-8">
                            <button onClick={handleProcess} disabled={isProcessing || (splitMode === 'extract' && selectedPages.size === 0)} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg flex items-center justify-center shadow-md">
                               {getButtonText()}
                            </button>
                        </div>
                    </div>

                    {/* Panel Pratinjau */}
                    <div className="w-full md:w-2/3 lg:w-3/4 bg-gray-100 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 max-h-[60vh] overflow-y-auto">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                            <span className="truncate font-medium text-gray-700 dark:text-gray-200" title={fileWithBuffer.file.name}>{fileWithBuffer.file.name}</span>
                            <span>- {numPages} Halaman</span>
                            <button
                                onClick={resetState}
                                title="Hapus file dan mulai lagi"
                                className="p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                            >
                                <TrashIcon />
                            </button>
                        </div>

                        {splitMode === 'fixed' && fixedRange > 0 ? (
                            <div className="flex flex-col gap-6">
                                {Array.from({ length: Math.ceil(numPages / fixedRange) }, (_, groupIndex) => {
                                    const startPage = groupIndex * fixedRange + 1;
                                    const endPage = Math.min(startPage + fixedRange - 1, numPages);
                                    const pagesInGroup = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
                                    const defaultFilename = `File-${groupIndex + 1}`;

                                    return (
                                        <div key={groupIndex} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animate-fade-in">
                                            <div className="flex flex-col sm:flex-row gap-2 items-baseline mb-3">
                                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                                                    {defaultFilename} <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">(Halaman {startPage}-{endPage})</span>
                                                </h4>
                                                <div className="flex items-center gap-2 w-full">
                                                    <input
                                                        type="text"
                                                        value={fixedRangeFilenames[groupIndex] || ''}
                                                        onChange={(e) => handleFixedFilenameChange(groupIndex, e.target.value)}
                                                        className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                                                        placeholder={`Nama file kustom (opsional)`}
                                                    />
                                                    <span className="text-gray-500 dark:text-gray-400 text-sm">.pdf</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                                                {pagesInGroup.map(pageNumber => (
                                                    <div key={pageNumber} className="relative rounded-lg border-2 border-transparent">
                                                        <div className="opacity-90">
                                                        <PdfPagePreview pdfDoc={pdfDoc} pageNumber={pageNumber} />
                                                        </div>
                                                        <div className="absolute top-1 left-1 bg-gray-900/80 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{pageNumber}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNumber => (
                                    <div key={pageNumber} onClick={() => splitMode === 'extract' && handleTogglePage(pageNumber)} className={`relative rounded-lg border-2 bg-white dark:bg-slate-800 shadow-sm overflow-hidden ${selectedPages.has(pageNumber) ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-transparent'} ${splitMode === 'extract' ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}>
                                        <div className={`transition-opacity duration-200 ${selectedPages.has(pageNumber) ? 'opacity-100' : 'opacity-80'} ${splitMode === 'extract' && 'hover:opacity-100'}`}>
                                        <PdfPagePreview pdfDoc={pdfDoc} pageNumber={pageNumber} />
                                        </div>
                                        <div className="absolute top-1 left-1 bg-gray-900/80 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">{pageNumber}</div>
                                        {selectedPages.has(pageNumber) && (
                                            <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-500/40 flex items-center justify-center">
                                                <div className="bg-blue-500 rounded-full p-1">
                                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </ToolContainer>
    );
};

export default SplitPdf;
