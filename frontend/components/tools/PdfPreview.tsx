import React, { useEffect, useRef, useState } from 'react';

// Beri tahu TypeScript tentang variabel global pdfjsLib dari CDN
declare const pdfjsLib: any;

interface PdfPreviewProps {
  buffer: ArrayBuffer;
  className?: string;
}

// Komponen untuk merender halaman pertama dari file PDF sebagai pratinjau visual tajam
const PdfPreview: React.FC<PdfPreviewProps> = ({ buffer, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!buffer || typeof pdfjsLib === 'undefined') {
      setStatus('error');
      return;
    }

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
        
        // Perhitungan resolusi tajam (Hi-DPI / Retina support)
        const parentWidth = canvas.parentElement?.clientWidth || 160;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: 1 });
        const baseScale = parentWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale: baseScale * dpr });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        canvas.style.width = '100%';
        canvas.style.height = '100%';

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
    <div className={`relative w-full aspect-[2/3] bg-slate-100 dark:bg-[#161A22] rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-inner ${className}`}>
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500 text-xs animate-pulse">
          <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Memuat pratinjau...</span>
        </div>
      )}
      {status === 'error' && (
        <div className="text-rose-500 text-xs px-2 text-center">
          Gagal memuat pratinjau
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`transition-opacity duration-300 absolute inset-0 object-contain w-full h-full ${status === 'success' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};

export default PdfPreview;