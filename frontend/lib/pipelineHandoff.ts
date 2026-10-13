/**
 * frontend/lib/pipelineHandoff.ts
 * Sistem Pipeline Otomatis Antar-Perkakas (Zero Manual Re-upload) & Rekomendasi Pintar.
 * Memungkinkan berkas PDF hasil dari satu perkakas langsung masuk ke perkakas berikutnya
 * hanya dengan 1 klik.
 */

export interface RecommendedToolItem {
  id: string;
  title: string;
  description: string;
  route: string;
  badge?: string;
  isHighlighted?: boolean;
  icon: 'compress' | 'protect' | 'sign' | 'watermark' | 'redact' | 'merge' | 'split' | 'pdfa';
}

let pendingHandoffFile: File | null = null;

/** Menyimpan berkas PDF hasil proses ke memori sementara untuk diteruskan ke perkakas tujuan. */
export function setPendingHandoffFile(file: File | null): void {
  pendingHandoffFile = file;
}

/** Mengambil dan mengosongkan berkas PDF dari antrean memori saat perkakas tujuan dimuat. */
export function consumePendingHandoffFile(): File | null {
  const file = pendingHandoffFile;
  pendingHandoffFile = null;
  return file;
}

function formatShortSize(bytes: number): string {
  const kb = bytes / 1024;
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(2)} MB`;
  }
  return `${kb.toFixed(1)} KB`;
}

/**
 * Mengambil Blob dari URL hasil unduhan, membungkusnya menjadi objek File,
 * menyimpannya ke memori pipeline, lalu menavigasikan ke rute perkakas tujuan.
 */
export async function handoffUrlToTool(
  fileUrl: string,
  fileName: string,
  targetRoute: string,
  onSameRouteReset?: () => void
): Promise<boolean> {
  if (!fileUrl) return false;
  try {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const cleanName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const handoffFile = new File([blob], cleanName, {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    setPendingHandoffFile(handoffFile);

    const currentPath = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
    if (currentPath === targetRoute && onSameRouteReset) {
      onSameRouteReset();
    } else {
      window.history.pushState(null, '', targetRoute);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  } catch (err) {
    console.error('[PipelineHandoff] Gagal memindahkan berkas antar perkakas:', err);
    return false;
  }
}

/**
 * Menghasilkan daftar rekomendasi perkakas lanjutan yang kontekstual
 * berdasarkan rute saat ini dan ukuran berkas hasil.
 */
export function getSmartNextTools(
  originalSize?: number,
  resultSize?: number,
  fileName?: string
): RecommendedToolItem[] {
  if (fileName && !fileName.toLowerCase().endsWith('.pdf')) {
    return [];
  }

  const currentPath =
    typeof window !== 'undefined'
      ? window.location.pathname.toLowerCase().replace(/\/$/, '') || '/'
      : '/';

  const sizeIncreased = Boolean(originalSize && resultSize && resultSize > originalSize * 1.05);
  const isLargeOutput = Boolean(resultSize && resultSize >= 500 * 1024);
  const shouldHighlightCompress = currentPath !== '/compress-pdf' && (sizeIncreased || isLargeOutput);

  let compressBadge = 'Optimasi Ukuran';
  let compressDesc = 'Perkecil ukuran berkas PDF ini secara otomatis tanpa perlu unggah ulang.';

  if (resultSize && sizeIncreased) {
    compressBadge = `Ukuran ${formatShortSize(resultSize)} • Perkecil Otomatis`;
    compressDesc = `Ukuran akhir (${formatShortSize(resultSize)}) cukup besar. Klik untuk langsung mengompres berkas ini tanpa input manual.`;
  } else if (resultSize && resultSize >= 1024 * 1024) {
    compressBadge = `Ukuran ${formatShortSize(resultSize)} • Rekomendasi Utama`;
    compressDesc = `Perkecil ukuran berkas (${formatShortSize(resultSize)}) agar siap unggah ke SSCASN, portal kerja, atau email.`;
  }

  const catalog: Record<string, RecommendedToolItem> = {
    compress: {
      id: 'compress',
      title: 'Kompres PDF',
      description: compressDesc,
      route: '/compress-pdf',
      badge: compressBadge,
      isHighlighted: shouldHighlightCompress,
      icon: 'compress',
    },
    protect: {
      id: 'protect',
      title: 'Kunci / Proteksi PDF',
      description: 'Amankan berkas hasil ini dengan kata sandi enkripsi AES-256.',
      route: '/protect-pdf',
      icon: 'protect',
    },
    sign: {
      id: 'sign',
      title: 'Tanda Tangan PDF',
      description: 'Bubuhkan tanda tangan digital atau paraf resmi langsung di atas dokumen.',
      route: '/sign-pdf',
      icon: 'sign',
    },
    watermark: {
      id: 'watermark',
      title: 'Beri Watermark',
      description: 'Tambahkan cap "SALINAN RESMI" atau teks pelindung kepemilikan.',
      route: '/watermark-pdf',
      icon: 'watermark',
    },
    redact: {
      id: 'redact',
      title: 'Sensor Data (UU PDP)',
      description: 'Hapus permanen NIK, NPWP, atau data sensitif sebelum dibagikan.',
      route: '/redact-pdf',
      icon: 'redact',
    },
    merge: {
      id: 'merge',
      title: 'Gabungkan PDF',
      description: 'Satukan berkas hasil ini dengan dokumen PDF lainnya.',
      route: '/merge-pdf',
      icon: 'merge',
    },
    pdfa: {
      id: 'pdfa',
      title: 'Konversi ke PDF/A',
      description: 'Ubah menjadi standar arsip digital jangka panjang berstandar ISO.',
      route: '/convert-pdfa',
      icon: 'pdfa',
    },
  };

  let orderedKeys: string[];

  if (currentPath === '/redact-pdf') {
    orderedKeys = ['compress', 'protect', 'watermark', 'sign'];
  } else if (currentPath === '/compress-pdf') {
    orderedKeys = ['redact', 'protect', 'sign', 'merge'];
  } else if (currentPath === '/protect-pdf') {
    orderedKeys = ['compress', 'merge'];
  } else if (currentPath === '/sign-pdf') {
    orderedKeys = ['compress', 'protect', 'watermark', 'redact'];
  } else if (currentPath === '/watermark-pdf') {
    orderedKeys = ['compress', 'protect', 'sign', 'redact'];
  } else if (currentPath === '/merge-pdf' || currentPath === '/split-pdf') {
    orderedKeys = ['compress', 'redact', 'sign', 'protect'];
  } else {
    orderedKeys = ['compress', 'redact', 'protect', 'sign'];
  }

  return orderedKeys
    .map((k) => catalog[k])
    .filter((item): item is RecommendedToolItem => Boolean(item) && item.route !== currentPath);
}
