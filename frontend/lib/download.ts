/**
 * frontend/lib/download.ts
 * Utilitas pengunduhan berkas yang aman, konsisten, anti-duplikat (debounce), dan bebas memory leak.
 */

let lastDownloadKey = '';
let lastDownloadTime = 0;
const DOWNLOAD_DEBOUNCE_MS = 600;

function shouldBlockDuplicateDownload(key: string): boolean {
  const now = Date.now();
  if (key === lastDownloadKey && now - lastDownloadTime < DOWNLOAD_DEBOUNCE_MS) {
    return true;
  }
  lastDownloadKey = key;
  lastDownloadTime = now;
  return false;
}

/**
 * Memicu pengunduhan dari Blob binary di peramban, secara otomatis membersihkan URL object setelah unduhan dimulai.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const safeName = filename || 'dokumen.pdf';
  if (shouldBlockDuplicateDownload(`blob:${safeName}:${blob.size}`)) {
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Bersihkan memori object URL setelah jeda singkat
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Memicu pengunduhan berkas dari URL yang sudah ada (misal tautan blob atau link penyimpanan awan).
 */
export function triggerFileDownload(url: string, filename: string): void {
  const safeName = filename || 'dokumen.pdf';
  if (shouldBlockDuplicateDownload(`${url}:${safeName}`)) {
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
