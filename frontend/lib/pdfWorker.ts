/**
 * frontend/lib/pdfWorker.ts
 * Inisialisasi terpusat untuk library PDF.js dan worker CDN.
 * Mencegah duplikasi inisialisasi worker dan deklarasi `declare const pdfjsLib: any` di belasan komponen.
 */

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

const PDFJS_CDN_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjsInitPromise: Promise<any> | null = null;

/**
 * Memastikan library pdfjsLib telah siap dan worker CDN telah dikonfigurasi.
 */
export function ensurePdfjsReady(): Promise<any> {
  if (pdfjsInitPromise) return pdfjsInitPromise;

  pdfjsInitPromise = new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.pdfjsLib) {
      if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CDN_WORKER_URL;
      }
      return resolve(window.pdfjsLib);
    }

    // Polling jika CDN script masih dalam proses pemuatan di index.html
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (typeof window !== 'undefined' && window.pdfjsLib) {
        clearInterval(interval);
        if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CDN_WORKER_URL;
        }
        resolve(window.pdfjsLib);
      } else if (attempts > 50) {
        clearInterval(interval);
        reject(new Error('Gagal memuat PDF.js dari CDN dalam batas waktu yang ditentukan.'));
      }
    }, 100);
  });

  return pdfjsInitPromise;
}

/**
 * Membuka dokumen PDF dari data binary (ArrayBuffer atau Uint8Array) menggunakan PDF.js terpusat.
 */
export async function loadPdfDocument(data: ArrayBuffer | Uint8Array, options?: Record<string, any>): Promise<any> {
  const pdfjs = await ensurePdfjsReady();
  const safeData = data instanceof Uint8Array ? data : new Uint8Array(data.slice(0));
  return pdfjs.getDocument({ data: safeData, ...options }).promise;
}

/**
 * Mengambil jumlah total halaman dokumen PDF secara cepat dari data binary.
 */
export async function getPdfPageCount(data: ArrayBuffer | Uint8Array): Promise<number> {
  try {
    const doc = await loadPdfDocument(data);
    return doc.numPages || 1;
  } catch (err) {
    console.warn('[pdfWorker] Gagal menghitung halaman via PDF.js:', err);
    return 1;
  }
}
