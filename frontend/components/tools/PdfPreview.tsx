import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { loadPdfDocument } from '../../lib/pdfWorker';

interface PdfPreviewProps {
  buffer: ArrayBuffer;
  className?: string;
  showAllPages?: boolean;
  activeStartPage?: number;
  activeEndPage?: number;
}

interface SinglePageItemProps {
  pdfDoc: any;
  pageNumber: number;
  isSelected: boolean;
  isSinglePageDoc: boolean;
  itemRef?: (el: HTMLDivElement | null) => void;
}

const PdfSinglePageItem: React.FC<SinglePageItemProps> = ({
  pdfDoc,
  pageNumber,
  isSelected,
  isSinglePageDoc,
  itemRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const targetWidth = isSinglePageDoc ? 420 : 240;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: 1 });
        const baseScale = targetWidth / Math.max(1, viewport.width);
        const scaledViewport = page.getViewport({ scale: baseScale * dpr });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';

        await page.render({
          canvasContext: ctx,
          viewport: scaledViewport,
        }).promise;

        if (!isCancelled) {
          setRendered(true);
        }
      } catch (err) {
        console.error(`Gagal merender halaman ${pageNumber}:`, err);
      }
    };

    renderPage();
    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pageNumber, isSinglePageDoc]);

  return (
    <div
      ref={itemRef}
      className={`relative rounded-xl overflow-hidden transition-all duration-300 border ${
        isSelected
          ? 'opacity-100 brightness-100 grayscale-0 scale-100 border-accent-primary ring-2 ring-accent-primary/40 shadow-md bg-white'
          : 'opacity-35 brightness-75 grayscale-[60%] scale-[0.97] border-border-subtle bg-slate-200 dark:bg-neutral-900 shadow-none'
      }`}
    >
      {/* Canvas Container */}
      <div className="relative w-full aspect-[1/1.414] bg-white flex items-center justify-center overflow-hidden">
        {!rendered && (
          <div className="flex flex-col items-center gap-1.5 text-slate-400 text-[11px] animate-pulse">
            <div className="w-4 h-4 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
            <span>Hal {pageNumber}...</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-contain transition-opacity duration-300 ${
            rendered ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Overlay Redup saat Halaman Tidak Dipilih */}
        {!isSelected && (
          <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none transition-opacity duration-300">
            <span className="px-2.5 py-1 rounded-full bg-black/75 text-white text-[10px] font-bold tracking-wider uppercase shadow-sm">
              Tidak Dipilih
            </span>
          </div>
        )}
      </div>

      {/* Footer Label Halaman */}
      <div
        className={`px-3 py-1.5 text-[11px] font-bold flex items-center justify-between border-t transition-colors ${
          isSelected
            ? 'bg-surface text-text-primary border-border-subtle'
            : 'bg-canvas text-text-muted border-border-subtle'
        }`}
      >
        <span>Halaman {pageNumber}</span>
        {isSelected ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-accent-primary font-bold">
            <Check className="w-3 h-3 stroke-[2.5]" /> Dipilih
          </span>
        ) : (
          <span className="text-[10px] text-text-muted">Diabaikan</span>
        )}
      </div>
    </div>
  );
};

// Komponen untuk merender halaman PDF (mendukung halaman tunggal maupun seluruh halaman dengan sorotan rentang halaman)
const PdfPreview: React.FC<PdfPreviewProps> = ({
  buffer,
  className = '',
  showAllPages = false,
  activeStartPage,
  activeEndPage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [pdfDocInstance, setPdfDocInstance] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!buffer) {
      setStatus('error');
      return;
    }

    let isCancelled = false;
    setStatus('loading');

    const renderPdf = async () => {
      try {
        if (isCancelled) return;

        const pdf = await loadPdfDocument(buffer);
        if (isCancelled) return;

        if (showAllPages) {
          setPdfDocInstance(pdf);
          setNumPages(pdf.numPages);
          setStatus('success');
          return;
        }

        // Mode Default: Ambil halaman pertama saja
        const page = await pdf.getPage(1);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const parentWidth = canvas.parentElement?.clientWidth || 160;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: 1 });
        const baseScale = parentWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale: baseScale * dpr });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        await page.render({
          canvasContext: ctx,
          viewport: scaledViewport,
        }).promise;

        if (!isCancelled) {
          setStatus('success');
        }
      } catch (err) {
        console.error('Gagal merender pratinjau PDF:', err);
        if (!isCancelled) {
          setStatus('error');
        }
      }
    };

    renderPdf();

    return () => {
      isCancelled = true;
    };
  }, [buffer, showAllPages]);

  // Gulir otomatis ke halaman awal yang dipilih saat rentang kustom diubah
  useEffect(() => {
    if (!showAllPages || !activeStartPage) return;
    const targetEl = pageRefs.current[activeStartPage];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showAllPages, activeStartPage]);

  if (showAllPages) {
    const start = activeStartPage ?? 1;
    const end = activeEndPage ?? numPages;

    return (
      <div className={`w-full ${className}`}>
        {status === 'loading' && (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs animate-pulse">
            <div className="w-6 h-6 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
            <span>Memuat seluruh halaman PDF...</span>
          </div>
        )}
        {status === 'error' && (
          <div className="py-12 text-rose-500 text-xs px-2 text-center">
            Gagal memuat pratinjau halaman PDF
          </div>
        )}
        {status === 'success' && pdfDocInstance && (
          <div
            className={`grid gap-4 p-1 ${
              numPages === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            {Array.from({ length: numPages }, (_, idx) => {
              const pageNum = idx + 1;
              const isSelected = pageNum >= start && pageNum <= end;
              return (
                <PdfSinglePageItem
                  key={pageNum}
                  pdfDoc={pdfDocInstance}
                  pageNumber={pageNum}
                  isSelected={isSelected}
                  isSinglePageDoc={numPages === 1}
                  itemRef={(el) => {
                    pageRefs.current[pageNum] = el;
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full aspect-[2/3] bg-slate-100 dark:bg-[#161A22] rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-inner ${className}`}
    >
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500 text-xs animate-pulse">
          <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Memuat pratinjau...</span>
        </div>
      )}
      {status === 'error' && (
        <div className="text-rose-500 text-xs px-2 text-center">Gagal memuat pratinjau</div>
      )}
      <canvas
        ref={canvasRef}
        className={`transition-opacity duration-300 absolute inset-0 object-contain w-full h-full ${
          status === 'success' ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

export default PdfPreview;