/**
 * frontend/lib/download.ts
 * Utilitas pengunduhan berkas yang aman, konsisten, anti-duplikat (debounce 2 detik), dan bebas memory leak.
 */

let lastDownloadKey = '';
let lastDownloadTime = 0;
const DOWNLOAD_DEBOUNCE_MS = 2000;

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
 * Membersihkan nama berkas unduhan dari karakter path traversal (../),
 * karakter kontrol, dan karakter terlarang sistem berkas.
 */
export function sanitizeDownloadFilename(filename: string, fallback = 'dokumen.pdf'): string {
  const cleaned = String(filename || '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\.\.[/\\]/g, '')
    .replace(/[<>:"/\\|?*]+/g, '_')
    .replace(/^\.+/, '')
    .trim();
  return cleaned || fallback;
}

/**
 * Memvalidasi skema URL unduhan agar hanya mengizinkan blob:, https:, http:, atau path relatif (/),
 * dan memblokir skema injeksi seperti javascript:, vbscript:, atau data:text/html.
 */
export function isSafeDownloadUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed, typeof window !== 'undefined' ? window.location.origin : 'https://localhost');
    return parsed.protocol === 'blob:' || parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Memicu pengunduhan dari Blob binary di peramban, secara otomatis membersihkan URL object setelah unduhan dimulai.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const safeName = sanitizeDownloadFilename(filename, 'dokumen.pdf');
  if (shouldBlockDuplicateDownload(`blob:${safeName}:${blob.size}`)) {
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = safeName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Bersihkan memori object URL setelah jeda singkat
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

/**
 * Memicu pengunduhan berkas dari URL yang sudah ada (misal tautan blob atau link penyimpanan awan).
 */
export function triggerFileDownload(url: string, filename: string): void {
  if (!isSafeDownloadUrl(url)) {
    console.warn('[Download] Memblokir skema URL unduhan yang tidak aman');
    return;
  }
  const safeName = sanitizeDownloadFilename(filename, 'dokumen.pdf');
  if (shouldBlockDuplicateDownload(`${url}:${safeName}`)) {
    return;
  }

  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = safeName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
