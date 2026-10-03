// frontend/components/tools/signature/SignatureTypes.ts

export interface SignatureItem {
  id: string;
  name: string;
  dataUrl: string; // Base64 PNG
  width: number;
  height: number;
  mode: 'draw' | 'type' | 'upload';
}

export type SignatureMode = 'draw' | 'type' | 'upload';
export type TypeFont = 'Caveat' | 'Dancing Script' | 'Great Vibes' | 'Pacifico';

export const SIGNATURE_COLORS = [
  { label: 'Hitam', hex: '#000000' },
  { label: 'Biru Resmi', hex: '#1E40AF' },
  { label: 'Merah', hex: '#DC2626' },
];

export const PEN_WIDTHS = [
  { label: 'Tipis', size: 2 },
  { label: 'Normal', size: 4 },
  { label: 'Tebal', size: 6 },
];

export const TYPE_FONTS: { id: TypeFont; label: string; fontFamily: string }[] = [
  { id: 'Dancing Script', label: 'Dancing Script (Elegan)', fontFamily: '"Dancing Script", cursive' },
  { id: 'Great Vibes', label: 'Great Vibes (Formal Klasik)', fontFamily: '"Great Vibes", cursive' },
  { id: 'Caveat', label: 'Caveat (Tangan Modern)', fontFamily: '"Caveat", cursive' },
  { id: 'Pacifico', label: 'Pacifico (Tegas & Tebal)', fontFamily: '"Pacifico", cursive' },
];
