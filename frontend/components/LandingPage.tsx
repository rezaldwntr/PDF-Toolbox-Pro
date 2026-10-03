import React, { useState, useMemo } from 'react';
import { View } from '../types';
import UniversalDropzone from './UniversalDropzone';
import ToolCard, { EngineType } from './ToolCard';
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
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Award,
  BookOpen
} from 'lucide-react';

interface ToolItem {
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

interface ToolCategory {
  id: string;
  title: string;
  description: string;
  tools: ToolItem[];
}

interface LandingPageProps {
  onSelectView: (view: View) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectView }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // 18+ Perkakas dengan Klasifikasi Mesin (Grup A: RAM Lokal, Grup B: Server Fast, Grup C: Heavy Cloud)
  const toolCategories: ToolCategory[] = useMemo(() => [
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
  ], []);

  // Filter tools berdasarkan input pencarian
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

  const totalToolsCount = useMemo(() => {
    return toolCategories.reduce((acc, cat) => acc + cat.tools.length, 0);
  }, [toolCategories]);

  return (
    <div className="w-full">
      {/* HERO SECTION BERORIENTASI AKSI (Design Bible Section 3.1) */}
      <section className="pt-10 pb-4 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-elevated border border-border-subtle text-text-secondary text-xs font-semibold mb-4 select-none">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>Kepatuhan UU PDP No. 27/2022 • Pemrosesan RAM Lokal & Zero Data Retention</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text-primary tracking-tight leading-tight mb-3">
          Platform Rekayasa Dokumen PDF.<br className="hidden sm:inline" /> Cepat, Taktil & Berstandar Presisi.
        </h1>

        <p className="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed mb-6">
          Satu antarmuka utilitas modern untuk menggabungkan, memisahkan, mengompresi, dan menyunting dokumen PDF dengan enkripsi bank-grade tanpa jeda.
        </p>

        {/* Quick Selector Search Bar (Section 3.1) */}
        <div className="relative max-w-xl mx-auto mb-2">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Cari dari ${totalToolsCount} perkakas (misal: kompres, word, tanda tangan, rekening)...`}
            className="w-full pl-10 pr-16 py-2.5 rounded-lg bg-surface border border-border-subtle text-text-primary placeholder:text-text-secondary text-xs sm:text-sm focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-accent-primary shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              Hapus
            </button>
          )}
        </div>
      </section>

      {/* UNIVERSAL DROPZONE (Section 3.2) */}
      {!searchQuery && (
        <section className="px-4 sm:px-6 lg:px-8">
          <UniversalDropzone onSelectView={onSelectView} />
        </section>
      )}

      {/* KATALOG PERKAKAS GRID 3-KOLOM (Design Bible Section 3.3) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-xl border border-border-subtle p-8">
            <p className="text-text-secondary font-medium text-sm mb-2">
              Tidak ada perkakas yang cocok dengan pencarian "{searchQuery}".
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-accent-primary hover:underline"
            >
              Tampilkan semua perkakas
            </button>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.id} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-border-subtle pb-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                  {category.title}
                </h2>
                <span className="text-xs text-text-secondary font-normal">
                  {category.description}
                </span>
              </div>

              {/* Grid 3 Kolom Sesuai Spesifikasi Section 3.3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {category.tools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    title={tool.title}
                    description={tool.description}
                    icon={tool.icon}
                    active={tool.active}
                    engineType={tool.engineType}
                    badge={tool.badge}
                    onClick={() => tool.view && onSelectView(tool.view)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* EDITORIAL SECTION 1: ARSITEKTUR MESIN & KEUNGGULAN UTAMA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-border-subtle">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-elevated text-text-secondary text-xs font-semibold mb-2.5 border border-border-subtle">
            <Award size={13} className="text-accent-primary" />
            <span>Standar Rekayasa Dokumen Generasi Baru</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Tiga Lapisan Arsitektur Mesin PDF Toolbox Pro
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-2 leading-relaxed">
            Beban kerja dibagi secara efisien antara eksekusi di memori browser pengguna dan server cepat untuk menjamin privasi maksimal dan kecepatan tinggi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-xl bg-surface border border-border-subtle shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
              <Zap size={20} />
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-sm font-bold text-text-primary">Grup A: RAM Lokal</h3>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">0ms Upload</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Tugas seperti penggabungan, pemotongan, penyusunan halaman, dan penambahan teks dieksekusi 100% di memori browser Anda via WebAssembly. Dokumen tidak pernah diunggah ke server.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border-subtle shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center mb-4 border border-accent-primary/20">
              <ShieldCheck size={20} />
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-sm font-bold text-text-primary">Grup B: Server Fast</h3>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-accent-primary/10 text-accent-primary border border-accent-primary/30">PyMuPDF</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Kompresi akurat (preset CPNS 200KB), enkripsi AES-256, dan True Binary Redaction UU PDP diproses via engine Python ringan berkecepatan tinggi dengan auto-wipe dalam 60 menit.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border-subtle shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20">
              <CheckCircle2 size={20} />
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-sm font-bold text-text-primary">Grup C: Heavy Cloud</h3>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">Gemini & OCR</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Konversi kompleks (Word, Excel, PowerPoint, PDF/A) serta terjemahan multimodal Gemini AI dan OCR multi-bahasa dengan antrean paralel terisolasi.
            </p>
          </div>
        </div>
      </section>

      {/* EDITORIAL SECTION 2: PANDUAN STANDAR DOKUMEN DIGITAL */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-border-subtle bg-elevated/40 rounded-2xl my-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-elevated text-text-secondary text-xs font-semibold mb-2 border border-border-subtle">
              <BookOpen size={13} />
              <span>Pusat Pengetahuan & Standar</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
              Panduan Memahami Standar Dokumen Digital & PDF
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Wawasan esensial seputar kompresi, pengarsipan jangka panjang ISO, dan kepatuhan UU PDP.
            </p>
          </div>

          <div className="space-y-4 text-xs text-text-secondary">
            <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-1.5 shadow-2xs">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-accent-primary/10 text-accent-primary flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Kapan Anda Harus Menggunakan Format PDF/A?</span>
              </h3>
              <p className="leading-relaxed pl-7 text-text-secondary">
                PDF/A (ISO 19005) adalah varian khusus untuk pengarsipan jangka panjang dokumen elektronik. PDF/A mewajibkan seluruh font disematkan (*embedded font*), melarang kode skrip eksternal, dan menonaktifkan enkripsi kata sandi agar dokumen hukum, skripsi, dan laporan keuangan tetap dapat dibuka persis sama hingga puluhan tahun mendatang.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-1.5 shadow-2xs">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-accent-primary/10 text-accent-primary flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Kompresi Presisi Tanpa Merusak Ketajaman Teks Vektor</span>
              </h3>
              <p className="leading-relaxed pl-7 text-text-secondary">
                PDF tersusun atas data vektor (teks, garis, font) dan data raster (foto/gambar). Mesin kompresi kami tidak pernah mengorbankan ketajaman teks vektor. Pengurangan ukuran dilakukan dengan membersihkan metadata berlebih, mengeliminasi objek yatim, dan mengoptimalkan DPI gambar raster agar tetap lolos validasi portal SSCASN/BKN.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-1.5 shadow-2xs">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-accent-primary/10 text-accent-primary flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Jaminan True Binary Redaction UU PDP No. 27/2022</span>
              </h3>
              <p className="leading-relaxed pl-7 text-text-secondary">
                Berbeda dari alat biasa yang hanya menaruh kotak hitam visual (teks aslinya masih dapat disalin), fitur Redact PDF kami menghancurkan aliran data biner teks sensitif (NIK, NPWP, nomor rekening) secara fisik dari berkas PDF sehingga aman dari kebocoran data.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
