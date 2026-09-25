/**
 * frontend/lib/download.ts
 * Utilitas pengunduhan berkas yang aman, konsisten, dan bebas memory leak.
 */

/**
 * Memicu pengunduhan dari Blob binary di peramban, secara otomatis membersihkan URL object setelah unduhan dimulai.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || 'dokumen.pdf';
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
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || 'dokumen.pdf';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
