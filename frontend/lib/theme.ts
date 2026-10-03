// frontend/lib/theme.ts
/**
 * UI/UX Design Specification & Design Bible — PDF Toolbox Pro (Section 1.3 & 8.2)
 * Standar Desain Minimalis Modern & Sistem Token Warna Warm Paper.
 * 
 * Filosofi: Utility-Taktil Modern (Linear clarity, Raycast efficiency, Notion modularity, iA Writer calm).
 * Eliminasi AI generic tropes: no magenta/indigo neon gradients, no blurry colored shadows.
 */

export interface ColorTokenPair {
  light: string;
  dark: string;
  usage: string;
}

export const THEME_COLORS: Record<string, ColorTokenPair> = {
  // Surface
  canvas: {
    light: '#F7F6F3', // Warm Paper
    dark: '#181818',  // Dark Charcoal
    usage: 'Latar belakang aplikasi utama & workspace',
  },
  surface: {
    light: '#FFFFFF',
    dark: '#222222',
    usage: 'Panel inspektor, kartu perkakas, & header',
  },
  elevated: {
    light: '#F1EFEA',
    dark: '#2D2D2D',
    usage: 'Dropdown, modal, tooltip, & state hover',
  },

  // Border
  borderSubtle: {
    light: '#E2DFD8',
    dark: '#3A3A3A',
    usage: 'Pemisah seksi, garis tabel, & border input',
  },
  borderStrong: {
    light: '#C8C4BC',
    dark: '#525252',
    usage: 'Focus ring, active state, & hover border',
  },

  // Typography
  textPrimary: {
    light: '#2D2B28',
    dark: '#F2EFE9',
    usage: 'Judul utama, teks dokumen, & angka numerik',
  },
  textSecondary: {
    light: '#6B6862',
    dark: '#A8A49A',
    usage: 'Meta-data, label input, & petunjuk aksi',
  },

  // Action
  accentPrimary: {
    light: '#2563EB', // Royal Cobalt
    dark: '#2563EB',
    usage: 'Tombol CTA utama, status aktif, & slider',
  },
  accentHover: {
    light: '#1D4ED8',
    dark: '#3B82F6',
    usage: 'Hover state tombol utama',
  },

  // Status
  statusSuccessText: {
    light: '#064E3B',
    dark: '#34D399',
    usage: 'Lolos validasi, konversi selesai, e-Meterai valid',
  },
  statusSuccessBg: {
    light: '#34D399',
    dark: '#064E3B',
    usage: 'Badge / indicator success background',
  },
  statusWarningText: {
    light: '#3D2808',
    dark: '#F59E0B',
    usage: 'Dekat batas RAM, peringatan kuota harian',
  },
  statusWarningBg: {
    light: '#F59E0B',
    dark: '#3D2808',
    usage: 'Badge / indicator warning background',
  },
  statusErrorText: {
    light: '#451010',
    dark: '#F87171',
    usage: 'Berkas terproteksi, format invalid, gagal OCR',
  },
  statusErrorBg: {
    light: '#F87171',
    dark: '#451010',
    usage: 'Badge / indicator error background',
  },
};

/**
 * Sistem Radius Sesuai Design Bible (Section 1.3)
 */
export const RADIUS = {
  sm: '4px',  // Badge, chip, button icon tunggal, tooltip
  md: '6px',  // Form input, select box, tombol standar, kartu thumbnail
  lg: '8px',  // Kartu perkakas beranda, panel kontrol inspektor, dropzone
  xl: '12px', // Modal dialog, floating bottom status bar
} as const;

/**
 * Sistem Spacing Grid 4px/8px
 */
export const SPACING_GRID = [4, 8, 12, 16, 24, 32, 48] as const;

/**
 * Font Features Settings untuk Tabular Figures & Clean Glyphs
 */
export const FONT_FEATURES = "'cv05', 'cv08', 'tnum'";

/**
 * Helper untuk mendapatkan token warna secara langsung berdasarkan tema
 */
export function getThemeToken(tokenName: keyof typeof THEME_COLORS, isDark: boolean): string {
  const token = THEME_COLORS[tokenName];
  if (!token) return '';
  return isDark ? token.dark : token.light;
}
