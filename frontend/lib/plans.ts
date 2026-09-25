/**
 * frontend/lib/plans.ts
 * Sumber kebenaran tunggal (Single Source of Truth) untuk data paket langganan,
 * harga dasar, deskripsi fitur, dan tabel perbandingan.
 */

export interface PlanItem {
  id: 'free' | 'flash' | 'monthly' | 'annual';
  name: string;
  price: string;
  priceNumber: number;
  rawPrice: number; // alias kompatibilitas untuk priceNumber
  priceNote: string;
  desc?: string;
  iconName: 'Gift' | 'Zap' | 'Star' | 'Crown';
  iconBg: string;
  highlight: boolean;
  badge?: string;
  features: string[];
  cta: string;
  ctaVariant: 'primary' | 'secondary';
  note?: string;
}

export const PLANS: PlanItem[] = [
  {
    id: 'free',
    name: 'Gratis (Free Tier)',
    price: 'Rp0',
    priceNumber: 0,
    rawPrice: 0,
    priceNote: 'Selamanya',
    desc: 'Akses gratis standar untuk kebutuhan harian',
    iconName: 'Gift',
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    highlight: false,
    features: [
      'Akses standar: Tamu 3 / Login 10 tugas/hari',
      'Alat berat/OCR: Uji coba 1 file (maks 5 hal)',
      'Berkas standar s.d. 30 MB (Alat berat 10 MB)',
      'Pemrosesan 1 file per tugas',
      'Penghapusan berkas instan (Privasi 100%)',
      'Iklan AdSense aktif',
    ],
    cta: 'Masuk Gratis',
    ctaVariant: 'secondary',
    note: 'Tidak perlu kartu kredit',
  },
  {
    id: 'flash',
    name: '24-Hour Flash Pass',
    price: 'Rp5.000',
    priceNumber: 5000,
    rawPrice: 5000,
    priceNote: 'sekali bayar · berlaku 24 jam',
    desc: 'Solusi cepat untuk kebutuhan mendesak',
    iconName: 'Zap',
    iconBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
    highlight: true,
    badge: 'TERPOPULER',
    features: [
      'Akses alat standar tanpa batas (24 jam)',
      'Alat berat & OCR: Kuota 25 tugas (150 hal)',
      'Berkas standar s.d. 100 MB (Alat berat 35 MB)',
      'Batch hingga 10 file sekaligus',
      'Tautan unduh aktif 6 jam · Bebas iklan',
      'Antrean eksekusi Jalur Cepat',
    ],
    cta: 'Beli Flash Pass',
    ctaVariant: 'primary',
    note: 'Bayar instan via QRIS semua bank',
  },
  {
    id: 'monthly',
    name: 'Monthly Pro',
    price: 'Rp29.000',
    priceNumber: 29000,
    rawPrice: 29000,
    priceNote: '/bulan · batalkan kapan saja',
    desc: 'Untuk produktivitas harian tanpa batas',
    iconName: 'Star',
    iconBg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
    highlight: false,
    features: [
      'Semua alat standar tanpa batas setiap hari',
      'Alat berat & OCR tanpa batas (FUP 100/hari)',
      'Berkas standar s.d. 200 MB (Alat berat 50 MB)',
      'Batch hingga 30 file sekaligus',
      'Tautan unduh aktif 24 jam · Bebas iklan',
      'Antrean eksekusi Jalur Prioritas',
    ],
    cta: 'Berlangganan Bulanan',
    ctaVariant: 'secondary',
    note: 'Batalkan kapan saja',
  },
  {
    id: 'annual',
    name: 'Annual Pass',
    price: 'Rp149.000',
    priceNumber: 149000,
    rawPrice: 149000,
    priceNote: '/tahun · hemat 57% vs bulanan',
    desc: 'Nilai terbaik untuk pengguna daya tinggi',
    iconName: 'Crown',
    iconBg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
    highlight: false,
    badge: 'HEMAT 57%',
    features: [
      'Semua keunggulan paket Monthly Pro',
      'Alat berat & OCR tanpa batas (FUP 250/hari)',
      'Berkas standar s.d. 300 MB (Alat berat 50 MB)',
      'Batch hingga 50 file sekaligus',
      'Tautan unduh aktif 48 jam · Bebas iklan',
      'Antrean eksekusi Jalur Prioritas Utama',
    ],
    cta: 'Beli Annual Pass',
    ctaVariant: 'secondary',
    note: 'Setara ~Rp12.400/bulan',
  },
];

export const PLANS_BY_ID: Record<string, PlanItem> = Object.fromEntries(
  PLANS.map((plan) => [plan.id, plan])
);

export interface CompareRow {
  label: string;
  free: string;
  flash: string;
  monthly: string;
  annual: string;
}

export const COMPARE_ROWS: CompareRow[] = [
  { label: 'Harga', free: 'Rp0', flash: 'Rp5.000 (QRIS/E-Wallet)', monthly: 'Rp29.000 / bln', annual: 'Rp149.000 / thn' },
  { label: 'Akses Alat Standar (Kompres, Gabung, Pisah, Watermark, dll.)', free: 'Tamu 3 · Login 10/hari', flash: 'Tanpa Batas (24 jam)', monthly: 'Tanpa Batas', annual: 'Tanpa Batas' },
  { label: 'Akses Alat Berat (Word, Excel, PPT, OCR, Translate)', free: 'Percobaan 1 file (maks 5 hal)', flash: 'Kuota 25 tugas (150 hal OCR)', monthly: 'Tanpa Batas (FUP: 100/hari)', annual: 'Tanpa Batas (FUP: 250/hari)' },
  { label: 'Batas Ukuran File (Alat Standar)', free: 'Hingga 30 MB', flash: 'Hingga 100 MB', monthly: 'Hingga 200 MB', annual: 'Hingga 300 MB' },
  { label: 'Batas Ukuran File (Alat Berat / OCR)', free: 'Maksimal 10 MB', flash: 'Maksimal 35 MB', monthly: 'Maksimal 50 MB', annual: 'Maksimal 50 MB (Batas aman RAM)' },
  { label: 'Pemrosesan Batch', free: '1 file per proses', flash: 'Hingga 10 file', monthly: 'Hingga 30 file', annual: 'Hingga 50 file' },
  { label: 'Penyimpanan Cloud / Tautan Unduh', free: 'Langsung dihapus (0 jam)', flash: '6 jam', monthly: '24 jam', annual: '48 jam' },
  { label: 'Antrean Eksekusi', free: 'Jalur Reguler', flash: 'Jalur Cepat', monthly: 'Jalur Prioritas', annual: 'Jalur Prioritas Utama' },
  { label: 'Iklan', free: 'Ya (AdSense aktif)', flash: 'Bebas Iklan (24 jam)', monthly: 'Bebas Iklan', annual: 'Bebas Iklan' },
];

export function getPlanById(id: string): PlanItem | undefined {
  return PLANS_BY_ID[id];
}
