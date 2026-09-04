import React, { useState, useMemo } from 'react';
import { View } from '../types';
import UniversalDropzone from './UniversalDropzone';
import ToolCard from './ToolCard';
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
  Search,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface LandingPageProps {
  onSelectView: (view: View) => void;
}

interface ToolDefinition {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  active: boolean;
  view?: View;
  category: string;
  keywords: string[];
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectView }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const toolCategories = useMemo(() => [
    {
      id: 'essential',
      title: '1. Esensial & Populer',
      description: 'Alat yang paling sering digunakan untuk produktivitas dokumen harian.',
      tools: [
        {
          id: 'pdf-to-word',
          title: 'PDF ke Word',
          description: 'Ubah dokumen PDF ke format DOCX yang dapat diedit dengan mudah.',
          icon: <FileText size={22} />,
          active: true,
          view: View.PDF_TO_WORD,
          category: 'Esensial & Populer',
          keywords: ['word', 'docx', 'doc', 'convert', 'teks', 'microsoft']
        },
        {
          id: 'merge-pdf',
          title: 'Gabungkan PDF',
          description: 'Satukan beberapa berkas PDF menjadi satu dokumen berurutan.',
          icon: <Layers size={22} />,
          active: true,
          view: View.MERGE,
          category: 'Esensial & Populer',
          keywords: ['merge', 'gabung', 'satukan', 'kombinasi', 'susun']
        },
        {
          id: 'compress-pdf',
          title: 'Kompres PDF',
          description: 'Kecilkan ukuran file PDF tanpa menurunkan kualitas teks & gambar.',
          icon: <Minimize2 size={22} />,
          active: true,
          view: View.COMPRESS,
          category: 'Esensial & Populer',
          keywords: ['kompres', 'kecilkan', 'compress', 'reduce', 'mb', 'kb', 'ringan']
        },
        {
          id: 'sign-pdf',
          title: 'Tanda Tangan',
          description: 'Bubuhkan tanda tangan digital Anda secara instan ke dokumen.',
          icon: <PenTool size={22} />,
          active: true,
          view: View.ADD_SIGNATURE,
          category: 'Esensial & Populer',
          keywords: ['sign', 'tanda tangan', 'paraf', 'ttd', 'signature']
        }
      ]
    },
    {
      id: 'convert',
      title: '2. Konversi PDF',
      description: 'Ekspor dan transformasi dokumen PDF ke format perkantoran lainnya.',
      tools: [
        {
          id: 'pdf-to-excel',
          title: 'PDF ke Excel',
          description: 'Ekstrak tabel dan data PDF langsung ke spreadsheet XLSX.',
          icon: <FileSpreadsheet size={22} />,
          active: true,
          view: View.PDF_TO_EXCEL,
          category: 'Konversi PDF',
          keywords: ['excel', 'xlsx', 'xls', 'spreadsheet', 'tabel', 'angka']
        },
        {
          id: 'pdf-to-ppt',
          title: 'PDF ke PPT',
          description: 'Konversi lembar presentasi PDF menjadi slide PowerPoint PPTX.',
          icon: <Presentation size={22} />,
          active: true,
          view: View.PDF_TO_PPT,
          category: 'Konversi PDF',
          keywords: ['ppt', 'pptx', 'powerpoint', 'slide', 'presentasi']
        },
        {
          id: 'pdf-to-image',
          title: 'PDF ke Gambar (JPG)',
          description: 'Ekspor setiap halaman PDF menjadi gambar berkualitas tinggi.',
          icon: <Image size={22} />,
          active: true,
          view: View.PDF_TO_IMAGE,
          category: 'Konversi PDF',
          keywords: ['jpg', 'jpeg', 'png', 'gambar', 'image', 'foto']
        },
        {
          id: 'pdf-a',
          title: 'PDF/A',
          description: 'Standarisasi dokumen PDF untuk pengarsipan jangka panjang ISO.',
          icon: <FileCheck size={22} />,
          active: false,
          category: 'Konversi PDF',
          keywords: ['pdf/a', 'arsip', 'iso', 'standar']
        }
      ]
    },
    {
      id: 'organize',
      title: '3. Edit & Organisasi',
      description: 'Tata urutan, potong, atau tambahkan anotasi pada berkas PDF.',
      tools: [
        {
          id: 'organize-pdf',
          title: 'Atur PDF',
          description: 'Hapus, putar, atau ubah susunan halaman dengan drag & drop visual.',
          icon: <FolderTree size={22} />,
          active: true,
          view: View.ORGANIZE,
          category: 'Edit & Organisasi',
          keywords: ['atur', 'organize', 'susun', 'rotasi', 'urutan', 'halaman']
        },
        {
          id: 'split-pdf',
          title: 'Pisahkan PDF',
          description: 'Ekstrak rentang halaman tertentu atau pisahkan menjadi beberapa file.',
          icon: <Scissors size={22} />,
          active: true,
          view: View.SPLIT,
          category: 'Edit & Organisasi',
          keywords: ['split', 'pisah', 'potong', 'ekstrak', 'halaman']
        },
        {
          id: 'add-text',
          title: 'Tambah Teks',
          description: 'Ketik dan sisipkan teks tambahan langsung ke dalam halaman PDF.',
          icon: <Type size={22} />,
          active: true,
          view: View.ADD_TEXT,
          category: 'Edit & Organisasi',
          keywords: ['text', 'teks', 'ketik', 'tulis', 'tambah teks']
        },
        {
          id: 'edit-text',
          title: 'Edit Teks',
          description: 'Ubah teks asli yang sudah ada di dalam dokumen PDF.',
          icon: <Edit3 size={22} />,
          active: false,
          category: 'Edit & Organisasi',
          keywords: ['edit', 'sunting', 'ubah teks']
        },
        {
          id: 'crop-pdf',
          title: 'Crop PDF',
          description: 'Pangkas margin atau area kosong yang tidak diinginkan pada dokumen.',
          icon: <Crop size={22} />,
          active: false,
          category: 'Edit & Organisasi',
          keywords: ['crop', 'potong margin', 'pangkas']
        },
        {
          id: 'watermark',
          title: 'Watermark',
          description: 'Sisipkan cap air teks atau logo untuk melindungi hak cipta dokumen.',
          icon: <Stamp size={22} />,
          active: false,
          category: 'Edit & Organisasi',
          keywords: ['watermark', 'cap air', 'logo', 'hak cipta']
        }
      ]
    },
    {
      id: 'security',
      title: '4. Keamanan & Lanjutan',
      description: 'Proteksi, enkripsi, dan teknologi cerdas untuk dokumen Anda.',
      tools: [
        {
          id: 'ocr-pdf',
          title: 'OCR PDF',
          description: 'Kenali dan ubah teks dari pindaian scan/foto menjadi teks digital.',
          icon: <Eye size={22} />,
          active: false,
          category: 'Keamanan & Lanjutan',
          keywords: ['ocr', 'scan', 'pindai', 'baca gambar']
        },
        {
          id: 'protect-pdf',
          title: 'Proteksi PDF',
          description: 'Kunci dokumen dengan kata sandi kuat dan enkripsi tingkat tinggi.',
          icon: <Lock size={22} />,
          active: false,
          category: 'Keamanan & Lanjutan',
          keywords: ['protect', 'kunci', 'sandi', 'password', 'enkripsi']
        },
        {
          id: 'unlock-pdf',
          title: 'Buka Kunci',
          description: 'Hapus proteksi kata sandi pada dokumen PDF milik Anda.',
          icon: <Unlock size={22} />,
          active: false,
          category: 'Keamanan & Lanjutan',
          keywords: ['unlock', 'buka kunci', 'hapus sandi', 'password']
        },
        {
          id: 'translate-pdf',
          title: 'Terjemahkan',
          description: 'Terjemahkan seluruh isi dokumen PDF ke berbagai bahasa dunia.',
          icon: <Languages size={22} />,
          active: false,
          category: 'Keamanan & Lanjutan',
          keywords: ['translate', 'terjemah', 'bahasa', 'inggris', 'indonesia']
        }
      ]
    }
  ], []);

  // Filter tools based on user search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return toolCategories;
    const q = searchQuery.toLowerCase().trim();

    return toolCategories.map(cat => ({
      ...cat,
      tools: cat.tools.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.keywords.some(k => k.includes(q))
      )
    })).filter(cat => cat.tools.length > 0);
  }, [searchQuery, toolCategories]);

  return (
    <div className="w-full">
      {/* HERO SECTION */}
      <section className="pt-12 pb-6 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-6">
          <Sparkles size={14} />
          <span>Platform Solusi PDF Server-Side Tercepat</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-tight mb-4">
          Kelola Dokumen PDF.<br className="hidden sm:inline" /> Lebih Cepat & Bebas Hambatan.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
          Satu tempat untuk menggabungkan, memisahkan, mengompresi, dan mengonversi PDF tanpa perlu membaca panduan manual.
        </p>

        {/* Quick Search Bar */}
        <div className="relative max-w-xl mx-auto mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari alat PDF (misal: word, gabung, kompres, pisah)..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
            >
              Hapus
            </button>
          )}
        </div>
      </section>

      {/* UNIVERSAL DROPZONE (Section 4.1) */}
      {!searchQuery && (
        <section className="px-4 sm:px-6 lg:px-8">
          <UniversalDropzone onSelectView={onSelectView} />
        </section>
      )}

      {/* TOOL CATEGORIES (Section 3) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
            <p className="text-slate-600 font-medium mb-2">
              Tidak ada alat yang cocok dengan pencarian "{searchQuery}".
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              Tampilkan semua alat
            </button>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.id} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-200 pb-3">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {category.title}
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  {category.description}
                </span>
              </div>

              {/* Grid System: 1 col (sm), 2 col (md), 4 col (lg) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {category.tools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    title={tool.title}
                    description={tool.description}
                    icon={tool.icon}
                    active={tool.active}
                    onClick={() => tool.view && onSelectView(tool.view)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default LandingPage;
