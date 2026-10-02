/**
 * frontend/lib/officialPresets.ts
 * Sumber kebenaran tunggal (Single Source of Truth) untuk data preset berkas resmi Indonesia.
 * Berdasarkan riset regulasi resmi: SSCASN BKN 2024, SNPMB, LPDP Kemenkeu, FHCI BUMN, & Portal Layanan Publik.
 */

export interface OfficialPreset {
  id: string;
  name: string;
  targetKb: number;
  badge: string;
  sourceNote: string;
  desc: string;
}

export interface PresetCategory {
  id: 'cpns' | 'akademik' | 'umum';
  label: string;
  shortLabel: string;
  icon: string;
  source: string;
  presets: OfficialPreset[];
}

export const OFFICIAL_PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: 'cpns',
    label: 'CPNS / PPPK / SSCASN',
    shortLabel: 'SSCASN & BKN',
    icon: '🏛️',
    source: 'Ketentuan Resmi BKN & Kemenkes 2024',
    presets: [
      {
        id: 'pasfoto_cpns',
        name: 'Pas Foto CPNS',
        targetKb: 200,
        badge: '< 200 KB',
        sourceNote: 'SSCASN BKN',
        desc: 'Foto resmi latar merah pendaftaran',
      },
      {
        id: 'swafoto_cpns',
        name: 'Swafoto / Selfie',
        targetKb: 200,
        badge: '< 200 KB',
        sourceNote: 'SSCASN BKN',
        desc: 'Foto selfie portrait close-up akun BKN',
      },
      {
        id: 'ktp_scan',
        name: 'KTP (Scan Asli)',
        targetKb: 200,
        badge: '< 200 KB',
        sourceNote: 'SSCASN BKN',
        desc: 'Scan e-KTP fisik / kependudukan',
      },
      {
        id: 'ijazah',
        name: 'Ijazah / Serdik / STR',
        targetKb: 800,
        badge: '< 800 KB',
        sourceNote: 'Standar BKN',
        desc: 'Dokumen ijazah asli atau sertifikasi',
      },
      {
        id: 'transkrip',
        name: 'Transkrip Nilai',
        targetKb: 500,
        badge: '< 500 KB',
        sourceNote: 'SSCASN BKN',
        desc: 'Daftar nilai akademik kumulatif',
      },
      {
        id: 'skck',
        name: 'Surat SKCK',
        targetKb: 500,
        badge: '< 500 KB',
        sourceNote: 'Polri / BKN',
        desc: 'Surat Keterangan Catatan Kepolisian',
      },
    ],
  },
  {
    id: 'akademik',
    label: 'Akademik & Beasiswa',
    shortLabel: 'SNPMB & LPDP',
    icon: '🎓',
    source: 'Portal SNPMB, LPDP Kemenkeu & SIAKAD',
    presets: [
      {
        id: 'foto_snpmb',
        name: 'Foto SNPMB / UTBK',
        targetKb: 100,
        badge: '< 100 KB',
        sourceNote: 'Portal SNPMB',
        desc: 'Batas sangat ketat SNPMB (40–100 KB)',
      },
      {
        id: 'lpdp_doc',
        name: 'Beasiswa LPDP',
        targetKb: 1000,
        badge: '< 1 MB',
        sourceNote: 'LPDP Kemenkeu',
        desc: 'Ijazah, LoA, esai & berkas beasiswa',
      },
      {
        id: 'akreditasi',
        name: 'Sertifikat & Akreditasi',
        targetKb: 500,
        badge: '< 500 KB',
        sourceNote: 'BAN-PT / BNSP',
        desc: 'Sertifikat akreditasi prodi & profesi',
      },
    ],
  },
  {
    id: 'umum',
    label: 'Administrasi Umum & Kerja',
    shortLabel: 'BUMN & Publik',
    icon: '📁',
    source: 'FHCI BUMN, Portal Layanan Sipil & HR',
    presets: [
      {
        id: 'surat_lamaran',
        name: 'Surat Lamaran / Pernyataan',
        targetKb: 300,
        badge: '< 300 KB',
        sourceNote: 'Instansi & e-Meterai',
        desc: 'Surat lamaran resmi bertanda tangan',
      },
      {
        id: 'bumn_doc',
        name: 'Rekrutmen Bersama BUMN',
        targetKb: 1000,
        badge: '< 1 MB',
        sourceNote: 'FHCI BUMN',
        desc: 'Berkas umum rekrutmen FHCI BUMN',
      },
      {
        id: 'portal_umum',
        name: 'Layanan Publik / BPJS',
        targetKb: 500,
        badge: '< 500 KB',
        sourceNote: 'Portal Pemerintah',
        desc: 'Dokumen SIM, BPJS, STNK & arsip sipil',
      },
    ],
  },
];

/** Daftar flat semua 12 preset untuk pencarian cepat berdasarkan ID */
export const ALL_OFFICIAL_PRESETS: OfficialPreset[] = OFFICIAL_PRESET_CATEGORIES.flatMap(
  (category) => category.presets
);

export function getOfficialPresetById(id: string): OfficialPreset | undefined {
  return ALL_OFFICIAL_PRESETS.find((preset) => preset.id === id);
}
