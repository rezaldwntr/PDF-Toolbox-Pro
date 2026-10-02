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

// Batas ukuran berkas untuk pemrosesan murni di memori browser (50 MB)
export const CLIENT_PDF_MAX_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Menggabungkan beberapa dokumen PDF murni di browser menggunakan pdf-lib.
 * Zero server load, privasi 100%, latensi instan.
 */
export async function mergeDocuments(buffers: ArrayBuffer[]): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib');
  const mergedPdf = await PDFDocument.create();

  for (const buf of buffers) {
    const srcDoc = await PDFDocument.load(buf.slice(0));
    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Mengekstrak nomor-nomor halaman tertentu ke dalam dokumen PDF tunggal baru.
 * pageNumbers: array nomor halaman (1-based, misal [1, 2, 3] atau [1, 3, 5]).
 */
export async function extractPagesToPdf(
  buffer: ArrayBuffer,
  pageNumbers: number[]
): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib');
  const srcDoc = await PDFDocument.load(buffer.slice(0));
  const newDoc = await PDFDocument.create();
  const totalPages = srcDoc.getPageCount();

  const validIndices = pageNumbers
    .map((num) => num - 1)
    .filter((idx) => idx >= 0 && idx < totalPages);

  const copiedPages = await newDoc.copyPages(srcDoc, validIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));
  return await newDoc.save();
}

/**
 * Memecah dokumen PDF ke dalam kelompok halaman tetap (fixed step) atau per halaman tunggal.
 */
export async function splitDocumentToParts(
  buffer: ArrayBuffer,
  step: number
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const { PDFDocument } = await import('pdf-lib');
  const srcDoc = await PDFDocument.load(buffer.slice(0));
  const totalPages = srcDoc.getPageCount();
  const parts: { name: string; bytes: Uint8Array }[] = [];

  for (let start = 0; start < totalPages; start += step) {
    const end = Math.min(start + step, totalPages);
    const chunkDoc = await PDFDocument.create();
    const indices: number[] = [];
    for (let i = start; i < end; i++) indices.push(i);

    const copiedPages = await chunkDoc.copyPages(srcDoc, indices);
    copiedPages.forEach((p) => chunkDoc.addPage(p));
    const bytes = await chunkDoc.save();
    const label = step === 1 ? `halaman_${start + 1}.pdf` : `halaman_${start + 1}-${end}.pdf`;
    parts.push({ name: label, bytes });
  }

  return parts;
}

/**
 * Mengompresi daftar berkas PDF ke dalam format berkas ZIP murni di browser.
 */
export async function bundlePdfsToZip(
  files: { name: string; bytes: Uint8Array }[]
): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  files.forEach((f) => zip.file(f.name, f.bytes));
  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
