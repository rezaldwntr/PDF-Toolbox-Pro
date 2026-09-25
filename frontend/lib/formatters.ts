/**
 * frontend/lib/formatters.ts
 * Standarisasi utilitas pemformatan angka, mata uang, berkas, dan tanggal.
 */

/**
 * Format angka nominal ke format Rupiah standar Indonesia.
 * Contoh: formatRupiah(5000) => "Rp5.000"
 *         formatRupiah(29000, false) => "29.000"
 */
export function formatRupiah(amount: number, withPrefix: boolean = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return withPrefix ? 'Rp0' : '0';
  }
  const formatted = Math.round(amount).toLocaleString('id-ID');
  return withPrefix ? `Rp${formatted}` : formatted;
}

/**
 * Format ukuran biner berkas (bytes) ke format yang mudah dibaca pengguna (B, KB, MB, GB).
 * Contoh: formatFileSize(1500) => "1.5 KB"
 *         formatFileSize(15728640) => "15.00 MB"
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format tanggal ISO string / Date ke standar tampilan tanggal Indonesia.
 */
export function formatDateIndonesia(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', options || {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

/**
 * Format tanggal dan waktu lengkap Indonesia.
 */
export function formatDateTimeIndonesia(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}
