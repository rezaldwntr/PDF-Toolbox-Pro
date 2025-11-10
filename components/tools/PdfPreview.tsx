import React, { useEffect, useRef, useState } from 'react';

// Beri tahu TypeScript tentang variabel global pdfjsLib dari CDN
declare const pdfjsLib: any;

interface PdfPreviewProps {
  file: File;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ file }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!file || typeof pdfjsLib === 'undefined') {
        setStatus('error');
        return;
    };

    let isCancelled = false;
    setStatus('loading');

    const renderPdf = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (isCancelled) return;
        
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        if (isCancelled) return;

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
        console.error(`Gagal merender pratinjau PDF untuk ${file.name}:`, err);
        if (!isCancelled) {
          setStatus('error');
        }
      }
    };

    renderPdf();

    return () => {
      isCancelled = true;
    };
  }, [file]);

  return (
    <div className="relative w-full aspect-[2/3] bg-slate-800 rounded-md overflow-hidden flex items-center justify-center">
      {status === 'loading' && <div className="text-slate-500 text-xs animate-pulse">Memuat...</div>}
      {status === 'error' && <div className="text-red-400 text-xs px-2 text-center">Gagal memuat pratinjau</div>}
      <canvas
        ref={canvasRef}
        className={`transition-opacity duration-300 absolute top-0 left-0 ${status === 'success' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};

export default PdfPreview;
