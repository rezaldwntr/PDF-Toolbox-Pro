
import React, { useState, useRef, useCallback } from 'react';
import ToolContainer from '../common/ToolContainer';
import { UploadIcon, DownloadIcon, CheckCircleIcon, TrashIcon, FileWordIcon, FileExcelIcon, FilePptIcon, FileJpgIcon, ZipIcon } from '../icons';
import { useToast } from '../../contexts/ToastContext';

declare const pdfjsLib: any;
declare const JSZip: any;

interface PdfFileWithBuffer {
  file: File;
  buffer: ArrayBuffer;
}

type ConvertFormat = 'word' | 'excel' | 'ppt' | 'jpg';

const ConvertPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [fileWithBuffer, setFileWithBuffer] = useState<PdfFileWithBuffer | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ConvertFormat | null>(null);
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

  // --- ALGORITMA KONVERSI ---

  const convertToJpg = async (pdfDoc: any) => {
    const zip = new JSZip();
    const baseName = fileWithBuffer!.file.name.replace('.pdf', '');

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        setProcessingMessage(`Merender halaman ${i} dari ${pdfDoc.numPages} ke JPG...`);
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        
        await page.render({ canvasContext: ctx, viewport }).promise;
        
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        if (blob) {
            zip.file(`${baseName}_halaman_${i}.jpg`, blob);
        }
    }

    setProcessingMessage('Membuat file ZIP...');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return { blob: zipBlob, ext: 'zip' };
  };

  // Algoritma Word "Smart Flow" - Menggunakan Margin untuk Posisi (Bukan Absolute)
  const convertToWord = async (pdfDoc: any) => {
    let bodyContent = '';

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        setProcessingMessage(`Menganalisis halaman ${i}...`);
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();
        
        const pageWidthPt = viewport.width;
        const pageHeightPt = viewport.height;

        // Buka div halaman dengan margin standar Word
        bodyContent += `
        <div class=Section${i} style='width:${pageWidthPt}pt; min-height:${pageHeightPt}pt; margin-bottom: 20pt;'>
        `;

        // 1. Urutkan item: Atas ke Bawah (Y terbalik), lalu Kiri ke Kanan
        const items = textContent.items.map((item: any) => {
            const tx = item.transform;
            return {
                str: item.str,
                x: tx[4], // x coordinate
                y: tx[5], // y coordinate (inverted in PDF)
                h: Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3])), // height (approx font size)
                w: item.width,
                fontName: item.fontName
            };
        }).sort((a: any, b: any) => {
            const yDiff = b.y - a.y; // Sort Y descending (top to bottom)
            if (Math.abs(yDiff) > 5) return yDiff; // Toleransi baris 5pt
            return a.x - b.x; // Sort X ascending
        });

        // 2. Kelompokkan menjadi baris visual
        let rows: any[][] = [];
        let currentRow: any[] = [];
        let lastY = -999;

        items.forEach((item: any) => {
            if (lastY === -999 || Math.abs(item.y - lastY) <= 5) {
                // Baris yang sama
                currentRow.push(item);
            } else {
                // Baris baru
                if (currentRow.length > 0) rows.push(currentRow);
                currentRow = [item];
            }
            lastY = item.y;
        });
        if (currentRow.length > 0) rows.push(currentRow);

        // 3. Render setiap baris sebagai Paragraf dengan Margin Kiri
        let previousBottomY = pageHeightPt; // Mulai dari atas

        rows.forEach((row) => {
            // Ambil properti dari item pertama di baris untuk menentukan gaya paragraf
            const firstItem = row[0];
            const fontSize = firstItem.h || 11;
            
            // Konversi koordinat PDF (Y bawah-ke-atas) ke Word (Y atas-ke-bawah)
            // Namun, karena kita menggunakan flow, kita lebih peduli pada 'margin-top' dari elemen sebelumnya
            // Jarak visual dari baris sebelumnya
            // const currentTopY = pageHeightPt - firstItem.y;
            // const marginTop = Math.max(0, currentTopY - previousBottomY); 
            // ^ Logika margin top seringkali berantakan di MHTML sederhana, 
            // jadi kita gunakan pendekatan spasi baris standar + br jika jaraknya jauh.

            // Indentasi Kiri (Kunci agar terlihat seperti PDF tapi bisa diedit)
            const marginLeft = firstItem.x;
            
            // Gabungkan teks dalam satu baris
            let lineHtml = "";
            let currentX = firstItem.x;

            row.forEach((item: any) => {
                // Deteksi spasi antar kata yang lebar (simulasi tab atau kolom)
                const gap = item.x - currentX;
                if (gap > 5) {
                     // Tambahkan non-breaking spaces untuk gap kecil, atau margin untuk gap besar
                     // Untuk kesederhanaan dan editability, kita gunakan spasi HTML
                     const spaces = Math.floor(gap / 3); // Asumsi lebar spasi ~3pt
                     lineHtml += "&nbsp;".repeat(Math.min(spaces, 10)); 
                }
                
                // Bersihkan string
                const cleanStr = item.str
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                
                lineHtml += `<span style='font-size:${fontSize.toFixed(1)}pt; font-family:"Calibri", sans-serif'>${cleanStr}</span>`;
                currentX = item.x + item.w;
            });

            // Bungkus dalam paragraf dengan margin-left absolut
            bodyContent += `
            <p class=MsoNormal style='margin-left:${marginLeft.toFixed(1)}pt; margin-top:0pt; margin-bottom:0pt; line-height:1.2'>
                ${lineHtml}
            </p>
            `;
            
            // Tambahkan spacer vertikal jika ada jarak besar antar baris PDF (misal paragraf baru)
            // const rowHeight = fontSize * 1.2;
            // previousBottomY = currentTopY + rowHeight;
        });

        bodyContent += `</div>`; // Tutup Section

        // Page Break
        if (i < pdfDoc.numPages) {
            bodyContent += `<br clear=all style='mso-special-character:line-break; page-break-before:always'>`;
        }
    }

    const mhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_NextPart_01C_XYZ"

------=_NextPart_01C_XYZ
Content-Location: file:///C:/fake/document.htm
Content-Transfer-Encoding: quoted-printable
Content-Type: text/html; charset="utf-8"

<html xmlns:o=3D"urn:schemas-microsoft-com:office:office"
xmlns:w=3D"urn:schemas-microsoft-com:office:word"
xmlns=3D"http://www.w3.org/TR/REC-html40">

<head>
<meta http-equiv=3DContent-Type content=3D"text/html; charset=3Dutf-8">
<style>
 @page WordSection1
	{size:595.3pt 841.9pt;
	margin:36.0pt 36.0pt 36.0pt 36.0pt;}
 div.WordSection1
	{page:WordSection1;}
 p.MsoNormal
    {margin-bottom:.0001pt; line-height:normal;}
</style>
</head>

<body lang=3DEN-US>
<div class=WordSection1>
${bodyContent}
</div>
</body>
</html>

------=_NextPart_01C_XYZ--
`;

    const blob = new Blob([mhtml], { type: 'application/msword' });
    return { blob, ext: 'doc' };
  };

  const convertToExcel = async (pdfDoc: any) => {
    let csvContent = "";
    csvContent += "\uFEFF"; // BOM

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        setProcessingMessage(`Menganalisis tabel halaman ${i}...`);
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        
        const rows: Record<number, {x: number, str: string}[]> = {};
        
        textContent.items.forEach((item: any) => {
             const y = Math.round(item.transform[5] / 5) * 5; 
             if (!rows[y]) rows[y] = [];
             rows[y].push({ x: item.transform[4], str: item.str });
        });
        
        const sortedY = Object.keys(rows).sort((a, b) => Number(b) - Number(a));
        
        sortedY.forEach(y => {
            const rowItems = rows[Number(y)].sort((a, b) => a.x - b.x);
            const rowStr = rowItems.map(item => `"${item.str.replace(/"/g, '""')}"`).join(",");
            csvContent += rowStr + "\n";
        });
        csvContent += "\n";
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return { blob, ext: 'csv' };
  };

  const convertToPpt = async (pdfDoc: any) => {
    let htmlContent = `
    <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:p="urn:schemas-microsoft-com:office:powerpoint">
    <head><title>PDF to PPT</title></head><body>
    `;
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        setProcessingMessage(`Merender slide ${i}...`);
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        const imgData = canvas.toDataURL('image/jpeg', 0.85);

        htmlContent += `
        <div class=Slide><img src="${imgData}" style='width:100%; height:auto' /></div>
        <br style='page-break-before:always' />
        `;
    }
    
    htmlContent += "</body></html>";
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-powerpoint' });
    return { blob, ext: 'ppt' };
  };

  const handleConvert = async () => {
    if (!fileWithBuffer || !selectedFormat) return;

    setIsProcessing(true);
    setProcessingMessage('Memulai konversi...');

    try {
        const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(fileWithBuffer.buffer.slice(0)) }).promise;
        
        let result: { blob: Blob, ext: string };

        switch (selectedFormat) {
            case 'jpg':
                result = await convertToJpg(pdfDoc);
                break;
            case 'word':
                result = await convertToWord(pdfDoc);
                break;
            case 'excel':
                result = await convertToExcel(pdfDoc);
                break;
            case 'ppt':
                result = await convertToPpt(pdfDoc);
                break;
            default:
                throw new Error("Format tidak dikenal");
        }

        const url = URL.createObjectURL(result.blob);
        setOutputUrl(url);
        setOutputFilename(`${fileWithBuffer.file.name.replace('.pdf', '')}.${result.ext}`);
        addToast('Konversi berhasil!', 'success');

    } catch (error) {
        console.error("Konversi gagal:", error);
        addToast("Terjadi kesalahan saat mengonversi.", 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const renderContent = () => {
    if (outputUrl) {
      return (
        <div className="text-center text-slate-400 flex flex-col items-center gap-6 animate-fade-in">
          <CheckCircleIcon />
          <h3 className="text-2xl font-bold text-slate-100">Konversi Selesai!</h3>
          <p className="text-lg">File Anda telah berhasil dikonversi ke format {selectedFormat?.toUpperCase()}.</p>
          <a href={outputUrl} download={outputFilename} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg">
            {selectedFormat === 'jpg' ? <ZipIcon /> : <DownloadIcon />}
            Unduh File
          </a>
          <button onClick={resetState} className="font-medium text-slate-400 hover:text-blue-400 transition-colors">
            Konversi File Lain
          </button>
        </div>
      );
    }

    if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <svg className="animate-spin h-10 w-10 text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="text-lg text-slate-300 font-semibold">{processingMessage}</p>
        </div>
      );
    }

    if (fileWithBuffer) {
      return (
        <div className="flex flex-col gap-8 animate-fade-in">
             <div className="bg-slate-700/50 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-red-400 font-bold text-2xl">PDF</span>
                    <div className="text-left">
                        <p className="text-slate-200 font-medium truncate max-w-[200px] md:max-w-xs" title={fileWithBuffer.file.name}>{fileWithBuffer.file.name}</p>
                        <p className="text-slate-400 text-sm">{(fileWithBuffer.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                </div>
                <button onClick={resetState} className="p-1 text-slate-500 hover:text-red-400 rounded-full transition-colors">
                    <TrashIcon />
                </button>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-center text-slate-300 mb-6">Pilih Format Konversi</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <button
                        onClick={() => setSelectedFormat('word')}
                        className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ${selectedFormat === 'word' ? 'bg-blue-900/50 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-slate-800 border-slate-700 hover:border-blue-500/50 hover:bg-slate-700'}`}
                    >
                        <FileWordIcon className="w-12 h-12 text-blue-500" />
                        <span className="font-bold text-slate-200">Word</span>
                        <span className="text-xs text-slate-500">.doc</span>
                    </button>
                    
                     <button
                        onClick={() => setSelectedFormat('excel')}
                        className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ${selectedFormat === 'excel' ? 'bg-green-900/50 border-green-500 shadow-lg shadow-green-500/20' : 'bg-slate-800 border-slate-700 hover:border-green-500/50 hover:bg-slate-700'}`}
                    >
                        <FileExcelIcon className="w-12 h-12 text-green-500" />
                        <span className="font-bold text-slate-200">Excel</span>
                        <span className="text-xs text-slate-500">.csv</span>
                    </button>
                    
                    <button
                        onClick={() => setSelectedFormat('ppt')}
                        className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ${selectedFormat === 'ppt' ? 'bg-orange-900/50 border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-slate-800 border-slate-700 hover:border-orange-500/50 hover:bg-slate-700'}`}
                    >
                        <FilePptIcon className="w-12 h-12 text-orange-500" />
                        <span className="font-bold text-slate-200">PowerPoint</span>
                        <span className="text-xs text-slate-500">.ppt</span>
                    </button>
                    
                     <button
                        onClick={() => setSelectedFormat('jpg')}
                        className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ${selectedFormat === 'jpg' ? 'bg-purple-900/50 border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-slate-800 border-slate-700 hover:border-purple-500/50 hover:bg-slate-700'}`}
                    >
                        <FileJpgIcon className="w-12 h-12 text-purple-500" />
                        <span className="font-bold text-slate-200">JPG</span>
                        <span className="text-xs text-slate-500">.zip</span>
                    </button>
                </div>
            </div>
            
            <div className="text-center mt-6">
                <button
                    onClick={handleConvert}
                    disabled={!selectedFormat}
                    className="w-full md:w-auto min-w-[200px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
                >
                    Konversi Sekarang
                </button>
            </div>
        </div>
      );
    }

    return (
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
