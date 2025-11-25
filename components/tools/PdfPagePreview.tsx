
import React, { useEffect, useRef } from 'react';

// Tipe sederhana untuk objek dokumen pdf.js
interface PdfJsDoc {
  getPage(pageNumber: number): Promise<any>;
}

interface PdfPagePreviewProps {
  pdfDoc: PdfJsDoc | null;
  pageNumber: number;
}

const PdfPagePreview: React.FC<PdfPagePreviewProps> = ({ pdfDoc, pageNumber }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!pdfDoc) return;
    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Atur ukuran canvas agar sesuai dengan parent dengan tetap menjaga rasio aspek
        const desiredWidth = canvas.parentElement?.clientWidth || 150;
        const viewport = page.getViewport({ scale: 1 });
        const scale = desiredWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
          canvasContext: ctx,
          viewport: scaledViewport,
        };
        await page.render(renderContext).promise;
      } catch (error) {
        console.error(`Gagal merender halaman ${pageNumber}:`, error);
        // Anda bisa menambahkan state untuk menampilkan pesan error di canvas jika diperlukan
      }
    };

    renderPage();
    
    return () => {
      isCancelled = true;
      // Membersihkan canvas saat komponen di-unmount atau di-render ulang
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div className="relative w-full aspect-[2/3] bg-gray-200 rounded-md overflow-hidden flex items-center justify-center border border-gray-300">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default PdfPagePreview;
