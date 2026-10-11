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
  ShieldCheck,
  Code2 
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
    description: 'Perkakas harian favorit untuk konversi naskah, penggabungan, kompresi, dan tanda tangan legal.',
    tools: [
      {
        id: 'pdf-to-word',
        title: 'PDF ke Word',
        description: 'Ekstrak dan transformasi dokumen PDF menjadi berkas DOCX yang dapat disunting penuh.',
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
        description: 'Satukan beberapa berkas dokumen PDF menjadi satu urutan utuh di memori RAM lokal.',
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
        description: 'Kecilkan ukuran dokumen tanpa pecah (Preset resmi CPNS/BKN 200KB & 300KB).',
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
        description: 'Bubuhkan paraf visual legal dan panduan penempatan e-Meterai resmi Rp10.000.',
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
    title: '2. Konversi Format & Finansial',
    description: 'Ekspor tabel mutasi perbankan dan transformasi dokumen PDF ke format spreadsheet & presentasi.',
    tools: [
      {
        id: 'bank-statement',
        title: 'Rekening Koran ke Excel',
        description: 'Parser mutasi bank resmi BCA, Mandiri, BRI, BNI, BSI & BPD ke XLSX otomatis.',
        icon: <Landmark size={20} />,
        badge: 'BARU',
        active: true,
        view: View.BANK_STATEMENT,
        category: 'Konversi Format & Finansial',
        engineType: 'fast',
        keywords: ['bank', 'rekening koran', 'mutasi', 'bca', 'mandiri', 'bri', 'bni', 'bsi', 'kalsel', 'bpd', 'excel']
      },
      {
        id: 'pdf-to-excel',
        title: 'PDF ke Excel',
        description: 'Ekstrak tabel dan data tabular dari naskah PDF langsung ke format spreadsheet XLSX.',
        icon: <FileSpreadsheet size={20} />,
        active: true,
        view: View.PDF_TO_EXCEL,
        category: 'Konversi Format & Finansial',
        engineType: 'cloud',
        keywords: ['excel', 'xlsx', 'xls', 'spreadsheet', 'tabel', 'angka']
      },
      {
        id: 'pdf-to-ppt',
        title: 'PDF ke PPT',
        description: 'Ubah lembar presentasi PDF menjadi slide Microsoft PowerPoint PPTX siap presentasi.',
        icon: <Presentation size={20} />,
        active: true,
        view: View.PDF_TO_PPT,
        category: 'Konversi Format & Finansial',
        engineType: 'cloud',
        keywords: ['ppt', 'pptx', 'powerpoint', 'slide', 'presentasi']
      },
      {
        id: 'pdf-to-image',
        title: 'PDF ke Gambar (JPG/PNG)',
        description: 'Simpan dan ekspor setiap lembar halaman dokumen menjadi gambar resolusi tinggi.',
        icon: <Image size={20} />,
        active: true,
        view: View.PDF_TO_IMAGE,
        category: 'Konversi Format & Finansial',
        engineType: 'cloud',
        keywords: ['jpg', 'jpeg', 'png', 'gambar', 'image', 'foto']
      }
    ]
  },
  {
    id: 'organize',
    title: '3. Edit, Tata Letak & Anotasi',
    description: 'Tata urutan lembar, pangkas margin, atau sisipkan anotasi teks dan cap air langsung di browser.',
    tools: [
      {
        id: 'organize-pdf',
        title: 'Atur & Susun Halaman',
        description: 'Hapus, putar, atau ubah susunan urutan halaman dengan kanvas visual di RAM lokal.',
        icon: <FolderTree size={20} />,
        active: true,
        view: View.ORGANIZE,
        category: 'Edit, Tata Letak & Anotasi',
        engineType: 'client',
        keywords: ['atur', 'organize', 'susun', 'rotasi', 'urutan', 'halaman']
      },
      {
        id: 'split-pdf',
        title: 'Pisahkan PDF',
        description: 'Ekstrak rentang halaman tertentu atau pisahkan menjadi dokumen arsip ZIP mandiri.',
        icon: <Scissors size={20} />,
        active: true,
        view: View.SPLIT,
        category: 'Edit, Tata Letak & Anotasi',
        engineType: 'client',
        keywords: ['split', 'pisah', 'potong', 'ekstrak', 'halaman']
      },
      {
        id: 'add-text',
        title: 'Tambah Teks & Anotasi',
        description: 'Ketik dan letakkan teks tambahan di koordinat presisi pada dokumen PDF.',
        icon: <Type size={20} />,
        active: true,
        view: View.ADD_TEXT,
        category: 'Edit, Tata Letak & Anotasi',
        engineType: 'client',
        keywords: ['text', 'teks', 'ketik', 'tulis', 'tambah teks']
      },
      {
        id: 'edit-text',
        title: 'Edit Teks PDF',
        description: 'Analisis dan sunting teks asli yang sudah ada di dalam berkas dokumen PDF.',
        icon: <Edit3 size={20} />,
        active: true,
        view: View.EDIT_PDF,
        category: 'Edit, Tata Letak & Anotasi',
        engineType: 'cloud',
        keywords: ['edit', 'sunting', 'ubah teks']
      },
      {
        id: 'crop-pdf',
        title: 'Crop & Pangkas PDF',
        description: 'Pangkas bagian tepi berkas atau buang margin kosong dengan titik kontrol responsif.',
        icon: <Crop size={20} />,
        active: true,
        view: View.CROP_PDF,
        category: 'Edit, Tata Letak & Anotasi',
        engineType: 'client',
        keywords: ['crop', 'potong margin', 'pangkas']
      },
      {
        id: 'watermark',
        title: 'Cap Air (Watermark)',
        description: 'Bubuhkan cap air teks atau logo transparan untuk perlindungan hak cipta berkas.',
        icon: <Stamp size={20} />,
        active: true,
        view: View.WATERMARK,
        category: 'Edit, Tata Letak & Anotasi',
        engineType: 'fast',
        keywords: ['watermark', 'cap air', 'logo', 'hak cipta']
      }
    ]
  },
  {
    id: 'security',
    title: '4. Keamanan, Arsip Legal & AI',
    description: 'Sensor data sensitif UU PDP, enkripsi AES-256, standarisasi arsip ISO, dan AI terjemahan.',
    tools: [
      {
        id: 'redact-pdf',
        title: 'Sensor Data Sensitif (UU PDP)',
        description: 'True binary redaction: hancurkan permanen NIK, NPWP, Rekening, HP & Medis.',
        icon: <ShieldCheck size={20} />,
        badge: 'UU PDP',
        active: true,
        view: View.REDACT_PDF,
        category: 'Keamanan, Arsip Legal & AI',
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
        category: 'Keamanan, Arsip Legal & AI',
        engineType: 'fast',
        keywords: ['protect', 'kunci', 'sandi', 'password', 'enkripsi']
      },
      {
        id: 'unlock-pdf',
        title: 'Buka Kunci PDF',
        description: 'Buka dan dekripsi kata sandi perlindungan dokumen PDF sah milik Anda.',
        icon: <Unlock size={20} />,
        active: true,
        view: View.UNLOCK_PDF,
        category: 'Keamanan, Arsip Legal & AI',
        engineType: 'fast',
        keywords: ['unlock', 'buka kunci', 'hapus sandi', 'password']
      },
      {
        id: 'pdf-a',
        title: 'PDF/A Converter (Arsip ISO)',
        description: 'Standarisasi dokumen ke ISO 19005 untuk pengarsipan hukum permanen puluhan tahun.',
        icon: <FileCheck size={20} />,
        active: true,
        view: View.PDF_A,
        category: 'Keamanan, Arsip Legal & AI',
        engineType: 'cloud',
        keywords: ['pdf/a', 'arsip', 'iso', 'standar']
      },
      {
        id: 'ocr-pdf',
        title: 'OCR Dokumen Pindaian',
        description: 'Kenali dan ubah teks dari hasil foto/pindaian scan menjadi Searchable PDF.',
        icon: <Eye size={20} />,
        active: true,
        view: View.OCR_PDF,
        category: 'Keamanan, Arsip Legal & AI',
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
        category: 'Keamanan, Arsip Legal & AI',
        engineType: 'cloud',
        keywords: ['translate', 'terjemah', 'bahasa', 'inggris', 'indonesia', 'ai']
      }
    ]
  },
  {
    id: 'developer-b2b',
    title: '5. Integrasi Sistem & B2B Micro-API',
    description: 'Automasi dokumen skala besar untuk perbankan, ERP, dan aplikasi bisnis via RESTful API berkecepatan tinggi.',
    tools: [
      {
        id: 'b2b-api-hub',
        title: 'B2B Micro-API Gateway',
        description: 'Dapatkan API Key instan, kelola kredit prabayar tanpa kedaluwarsa, dan hubungkan parser mutasi & kompresi ke backend Anda.',
        icon: <Code2 size={20} />,
        badge: 'B2B / API',
        active: true,
        view: View.DEVELOPER_API,
        category: 'Integrasi Sistem & B2B Micro-API',
        engineType: 'fast',
        keywords: ['api', 'developer', 'b2b', 'rest', 'sdk', 'backend', 'curl', 'python', 'token', 'key', 'endpoint', 'integrasi', 'microservice']
      }
    ]
  }
];
