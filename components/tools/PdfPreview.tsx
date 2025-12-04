import React, { useEffect, useRef, useState } from 'react';

// Beri tahu TypeScript tentang variabel global pdfjsLib dari CDN
declare const pdfjsLib: any;

interface PdfPreviewProps {
  buffer: ArrayBuffer;
}

// Komponen untuk merender halaman pertama dari file PDF sebagai pratinjau (thumbnail)
const PdfPreview: React.FC<PdfPreviewProps> = ({ buffer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!buffer || typeof pdfjsLib === 'undefined') {
        setStatus('error');
        return;
    };

    let isCancelled = false;
    setStatus('loading');

    const renderPdf = async () => {
      try {
        if (isCancelled) return;
        
        // Salin buffer agar rendering tidak mempengaruhi data asli
        const bufferCopy = buffer.slice(0);
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bufferCopy) }).promise;
        if (isCancelled) return;

        // Ambil halaman pertama
        const page = await pdf.getPage(1);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Atur ukuran canvas agar sesuai dengan parent dengan tetap menjaga rasio aspek
        const desiredWidth = canvas.parentElement?.clientWidth || 120;
        const viewport = page.getViewport({ scale: 1 });
        const scale = desiredWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale: scale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
          canvasContext: ctx,
          viewport: scaledViewport,
        };

        await page.render(renderContext).promise;

        if (!isCancelled) {
          setStatus('success');
        }
      } catch (err) {
        console.error(`Gagal merender pratinjau PDF:`, err);
        if (!isCancelled) {
          setStatus('error');
        }
      }
    };

    renderPdf();

    return () => {
      isCancelled = true;
    };
  }, [buffer]);

  return (
    <div className="relative w-full aspect-[2/3] bg-gray-200 rounded-md overflow-hidden flex items-center justify-center border border-gray-300">
      {status === 'loading' && <div className="text-gray-500 text-xs animate-pulse">Memuat...</div>}
      {status === 'error' && <div className="text-red-500 text-xs px-2 text-center">Gagal memuat pratinjau</div>}
      <canvas
        ref={canvasRef}
        className={`transition-opacity duration-300 absolute top-0 left-0 ${status === 'success' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};

export default PdfPreview;