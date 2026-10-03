export type WatermarkTab = 'text' | 'image';

export type PositionAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type PageSelectionMode = 'all' | 'odd' | 'even' | 'custom';

export interface WatermarkConfig {
  type: WatermarkTab;
  // Mode Teks
  text: string;
  fontFamily: 'helv' | 'times' | 'courier';
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  color: string;
  // Mode Gambar
  imageFile: File | null;
  imagePreviewUrl: string | null;
  imageScale: number; // 0.1 - 1.0
  // Pengaturan Umum
  opacity: number; // 0.05 - 1.0
  rotation: number; // -90 s/d 90
  layer: 'over' | 'under';
  position: PositionAnchor;
  isMosaic: boolean;
  // Pengaturan Halaman
  pageSelection: PageSelectionMode;
  customPages: string;
  excludeFirstPage: boolean;
}

export const PRESET_COLORS = [
  '#EF4444', // Merah
  '#64748B', // Abu-abu Slate
  '#2563EB', // Biru
  '#0F172A', // Hitam
  '#D97706', // Amber / Oranye
  '#059669', // Emerald / Hijau
];

export const PRESET_TEXTS = [
  'CONFIDENTIAL',
  'DRAFT',
  'RAHASIA',
  'SALINAN RESMI',
  'SAMPLE',
];
