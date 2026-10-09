import React from 'react';
import { View } from '../types';
import { EngineType } from '../components/ToolCard';
import { 
  FileText, 
  Layers, 
  Minimize2, 
  PenTool, 
  FileSpreadsheet, 
  Presentation, 
  Image, 
  FileCheck, 
  FolderTree, 
  Scissors, 
  Type, 
  Edit3, 
  Crop, 
  Stamp, 
  Eye, 
  Lock, 
  Unlock, 
  Languages, 
  Landmark, 
  ShieldCheck 
} from 'lucide-react';

export interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  active: boolean;
  view: View;
  category: string;
  engineType: EngineType;
  badge?: string;
  keywords: string[];
}

export interface ToolCategory {
  id: string;
  title: string;
  description: string;
  tools: ToolItem[];
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'essential',
    title: '1. Esensial & Populer',
    description: 'Perkakas harian untuk manipulasi, pemisahan, dan optimasi berkas.',
    tools: [
      {
        id: 'pdf-to-word',
        title: 'PDF ke Word',
        description: 'Ekstrak dan transformasi dokumen PDF menjadi format DOCX yang dapat diedit.',
        icon: <FileText size={20} />,
        active: true,
        view: View.PDF_TO_WORD,
        category: 'Esensial & Populer',
        engineType: 'cloud',
        keywords: ['word', 'docx', 'doc', 'convert', 'teks', 'microsoft']
      },
      {
        id: 'merge-pdf',
        title: 'Gabungkan PDF',
        description: 'Satukan beberapa berkas PDF menjadi satu dokumen berurutan di RAM lokal.',
        icon: <Layers size={20} />,
        active: true,
        view: View.MERGE,
        category: 'Esensial & Populer',
        engineType: 'client',
        keywords: ['merge', 'gabung', 'satukan', 'kombinasi', 'susun']
      },
      {
        id: 'compress-pdf',
        title: 'Kompres PDF',
        description: 'Kecilkan ukuran berkas tanpa merusak kualitas cetak (Preset CPNS/BKN 200KB).',
        icon: <Minimize2 size={20} />,
        active: true,
        view: View.COMPRESS,
        category: 'Esensial & Populer',
        engineType: 'fast',
        keywords: ['kompres', 'kecilkan', 'compress', 'reduce', 'mb', 'kb', 'ringan']
      },
      {
        id: 'sign-pdf',
        title: 'Tanda Tangan & e-Meterai',
        description: 'Bubuhkan tanda tangan visual dan panduan penempatan e-Meterai Rp10.000.',
        icon: <PenTool size={20} />,
        active: true,
        view: View.ADD_SIGNATURE,
        category: 'Esensial & Populer',
        engineType: 'client',
        keywords: ['sign', 'tanda tangan', 'paraf', 'ttd', 'signature', 'meterai']
      }
    ]
  },
  {
    id: 'convert',
    title: '2. Konversi & Finansial',
    description: 'Ekspor tabel dan transformasi dokumen PDF ke format spreadsheet & presentasi.',
    tools: [
      {
        id: 'bank-statement',
        title: 'Rekening Koran ke Excel',
        description: 'Parser mutasi bank resmi BCA, Mandiri, BRI, BNI, BSI & BPD ke XLSX otomatis.',
        icon: <Landmark size={20} />,
        badge: 'BARU',
        active: true,
        view: View.BANK_STATEMENT,
        category: 'Konversi & Finansial',
        engineType: 'fast',
        keywords: ['bank', 'rekening koran', 'mutasi', 'bca', 'mandiri', 'bri', 'bni', 'bsi', 'kalsel', 'bpd', 'excel']
      },
      {
        id: 'pdf-to-excel',
        title: 'PDF ke Excel',
        description: 'Identifikasi baris dan kolom tabel PDF langsung ke spreadsheet XLSX.',
        icon: <FileSpreadsheet size={20} />,
        active: true,
        view: View.PDF_TO_EXCEL,
        category: 'Konversi & Finansial',
        engineType: 'cloud',
        keywords: ['excel', 'xlsx', 'xls', 'spreadsheet', 'tabel', 'angka']
      },
      {
        id: 'pdf-to-ppt',
        title: 'PDF ke PPT',
        description: 'Konversi lembar presentasi PDF menjadi slide PowerPoint PPTX yang dapat diedit.',
        icon: <Presentation size={20} />,
        active: true,
        view: View.PDF_TO_PPT,
        category: 'Konversi & Finansial',
        engineType: 'cloud',
        keywords: ['ppt', 'pptx', 'powerpoint', 'slide', 'presentasi']
      },
      {
        id: 'pdf-to-image',
        title: 'PDF ke Gambar (JPG/PNG)',
        description: 'Ekspor setiap halaman dokumen menjadi gambar tajam resolusi tinggi.',
        icon: <Image size={20} />,
        active: true,
        view: View.PDF_TO_IMAGE,
        category: 'Konversi & Finansial',
        engineType: 'cloud',
        keywords: ['jpg', 'jpeg', 'png', 'gambar', 'image', 'foto']
      },
      {
        id: 'pdf-a',
        title: 'PDF/A Converter',
        description: 'Standarisasi dokumen PDF untuk pengarsipan hukum jangka panjang standar ISO.',
        icon: <FileCheck size={20} />,
        active: true,
        view: View.PDF_A,
        category: 'Konversi & Finansial',
        engineType: 'cloud',
        keywords: ['pdf/a', 'arsip', 'iso', 'standar']
      }
    ]
  },
  {
    id: 'organize',
    title: '3. Edit & Organisasi Halaman',
    description: 'Tata urutan, potong margin, atau tambahkan anotasi teks langsung di browser.',
    tools: [
      {
        id: 'organize-pdf',
        title: 'Atur & Susun PDF',
        description: 'Hapus, putar, atau ubah urutan halaman dengan drag & drop visual di RAM.',
        icon: <FolderTree size={20} />,
        active: true,
        view: View.ORGANIZE,
        category: 'Edit & Organisasi Halaman',
        engineType: 'client',
        keywords: ['atur', 'organize', 'susun', 'rotasi', 'urutan', 'halaman']
      },
      {
        id: 'split-pdf',
        title: 'Pisahkan PDF',
        description: 'Ekstrak rentang halaman tertentu atau pisahkan menjadi beberapa dokumen terpisah.',
        icon: <Scissors size={20} />,
        active: true,
        view: View.SPLIT,
        category: 'Edit & Organisasi Halaman',
        engineType: 'client',
        keywords: ['split', 'pisah', 'potong', 'ekstrak', 'halaman']
      },
      {
        id: 'add-text',
        title: 'Tambah Teks & Anotasi',
        description: 'Ketik dan sisipkan teks tambahan langsung di koordinat dokumen PDF.',
        icon: <Type size={20} />,
        active: true,
        view: View.ADD_TEXT,
        category: 'Edit & Organisasi Halaman',
        engineType: 'client',
        keywords: ['text', 'teks', 'ketik', 'tulis', 'tambah teks']
      },
      {
        id: 'edit-text',
        title: 'Edit Teks PDF',
        description: 'Analisis dan sunting teks asli yang sudah ada di dalam dokumen PDF.',
        icon: <Edit3 size={20} />,
        active: true,
        view: View.EDIT_PDF,
        category: 'Edit & Organisasi Halaman',
        engineType: 'cloud',
        keywords: ['edit', 'sunting', 'ubah teks']
      },
      {
        id: 'crop-pdf',
        title: 'Crop PDF',
        description: 'Pangkas margin atau area kosong yang tidak diinginkan dengan bounding box.',
        icon: <Crop size={20} />,
        active: true,
        view: View.CROP_PDF,
        category: 'Edit & Organisasi Halaman',
        engineType: 'client',
        keywords: ['crop', 'potong margin', 'pangkas']
      },
      {
        id: 'watermark',
        title: 'Cap Air (Watermark)',
        description: 'Sisipkan cap air teks atau logo untuk melindungi hak cipta dokumen.',
        icon: <Stamp size={20} />,
        active: true,
        view: View.WATERMARK,
        category: 'Edit & Organisasi Halaman',
        engineType: 'fast',
        keywords: ['watermark', 'cap air', 'logo', 'hak cipta']
      }
    ]
  },
  {
    id: 'security',
    title: '4. Keamanan, AI & Privasi',
    description: 'Proteksi kata sandi, enkripsi AES-256, OCR, dan sensor PII kepatuhan UU PDP.',
    tools: [
      {
        id: 'redact-pdf',
        title: 'Sensor Data Sensitif (UU PDP)',
        description: 'True binary redaction: hapus permanen NIK, NPWP, Rekening, HP & Medis.',
        icon: <ShieldCheck size={20} />,
        badge: 'UU PDP',
        active: true,
        view: View.REDACT_PDF,
        category: 'Keamanan, AI & Privasi',
        engineType: 'fast',
        keywords: ['redact', 'sensor', 'nik', 'ktp', 'uu pdp', 'pdp', 'npwp', 'rekening', 'privasi', 'rahasia', 'pii']
      },
      {
        id: 'protect-pdf',
        title: 'Proteksi Sandi PDF',
        description: 'Enkripsi dokumen dengan sandi kuat AES-256 bit dan pembatasan izin cetak.',
        icon: <Lock size={20} />,
        active: true,
        view: View.PROTECT_PDF,
        category: 'Keamanan, AI & Privasi',
        engineType: 'fast',
        keywords: ['protect', 'kunci', 'sandi', 'password', 'enkripsi']
      },
      {
        id: 'unlock-pdf',
        title: 'Buka Kunci PDF',
        description: 'Buka dan dekripsi kata sandi perlindungan dokumen PDF milik Anda.',
        icon: <Unlock size={20} />,
        active: true,
        view: View.UNLOCK_PDF,
        category: 'Keamanan, AI & Privasi',
        engineType: 'fast',
        keywords: ['unlock', 'buka kunci', 'hapus sandi', 'password']
      },
      {
        id: 'ocr-pdf',
        title: 'OCR Dokumen Pindaian',
        description: 'Kenali dan ubah teks dari pindaian scan/foto menjadi Searchable PDF.',
        icon: <Eye size={20} />,
        active: true,
        view: View.OCR_PDF,
        category: 'Keamanan, AI & Privasi',
        engineType: 'cloud',
        keywords: ['ocr', 'scan', 'pindai', 'baca gambar']
      },
      {
        id: 'translate-pdf',
        title: 'Terjemahkan Dokumen',
        description: 'Terjemahkan dokumen ke 30+ bahasa dengan preservasi tata letak Gemini Engine.',
        icon: <Languages size={20} />,
        active: true,
        view: View.TRANSLATE_PDF,
        category: 'Keamanan, AI & Privasi',
        engineType: 'cloud',
        keywords: ['translate', 'terjemah', 'bahasa', 'inggris', 'indonesia', 'ai']
      }
    ]
  }
];
