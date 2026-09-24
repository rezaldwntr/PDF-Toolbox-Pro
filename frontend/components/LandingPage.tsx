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
  Clock,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Zap,
  Award,
  Globe,
  BookOpen
} from 'lucide-react';

interface LandingPageProps {
  onSelectView: (view: View) => void;
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
          active: true,
          view: View.PDF_A,
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
          active: true,
          view: View.EDIT_PDF,
          category: 'Edit & Organisasi',
          keywords: ['edit', 'sunting', 'ubah teks']
        },
        {
          id: 'crop-pdf',
          title: 'Crop PDF',
          description: 'Pangkas margin atau area kosong yang tidak diinginkan pada dokumen.',
          icon: <Crop size={22} />,
          active: true,
          view: View.CROP_PDF,
          category: 'Edit & Organisasi',
          keywords: ['crop', 'potong margin', 'pangkas']
        },
        {
          id: 'watermark',
          title: 'Watermark',
          description: 'Sisipkan cap air teks atau logo untuk melindungi hak cipta dokumen.',
          icon: <Stamp size={22} />,
          active: true,
          view: View.WATERMARK,
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
          active: true,
          view: View.OCR_PDF,
          category: 'Keamanan & Lanjutan',
          keywords: ['ocr', 'scan', 'pindai', 'baca gambar']
        },
        {
          id: 'protect-pdf',
          title: 'Proteksi PDF',
          description: 'Kunci dokumen dengan kata sandi kuat dan enkripsi tingkat tinggi.',
          icon: <Lock size={22} />,
          active: true,
          view: View.PROTECT_PDF,
          category: 'Keamanan & Lanjutan',
          keywords: ['protect', 'kunci', 'sandi', 'password', 'enkripsi']
        },
        {
          id: 'unlock-pdf',
          title: 'Buka Kunci',
          description: 'Hapus proteksi kata sandi pada dokumen PDF milik Anda.',
          icon: <Unlock size={22} />,
          active: true,
          view: View.UNLOCK_PDF,
          category: 'Keamanan & Lanjutan',
          keywords: ['unlock', 'buka kunci', 'hapus sandi', 'password']
        },
        {
          id: 'translate-pdf',
          title: 'Terjemahkan PDF',
          description: 'Terjemahkan seluruh dokumen ke 30+ bahasa dengan AI dan tata letak asli.',
          icon: <Languages size={22} />,
          active: true,
          view: View.TRANSLATE_PDF,
          category: 'Keamanan & Lanjutan',
          keywords: ['translate', 'terjemah', 'bahasa', 'inggris', 'indonesia', 'ai']
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-6">
          <Sparkles size={14} />
          <span>Platform Solusi PDF Server-Side Tercepat</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight sm:leading-tight mb-4">
          Kelola Dokumen PDF.<br className="hidden sm:inline" /> Lebih Cepat & Bebas Hambatan.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          Satu tempat untuk menggabungkan, memisahkan, mengompresi, dan mengonversi PDF tanpa perlu membaca panduan manual.
        </p>

        {/* Quick Search Bar */}
        <div className="relative max-w-xl mx-auto mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari alat PDF (misal: word, gabung, kompres, pisah)..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-[#1E222B] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
          <div className="text-center py-12 bg-white dark:bg-[#1E222B] rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">
              Tidak ada alat yang cocok dengan pencarian "{searchQuery}".
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Tampilkan semua alat
            </button>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.id} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {category.title}
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
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

      {/* EDITORIAL SECTION 1: MENGAPA MEMILIH PDF TOOLBOX PRO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200 dark:border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold mb-3 border border-blue-200 dark:border-blue-800/60">
            <Award size={14} />
            <span>Standar Rekayasa Dokumen Generasi Baru</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Mengapa Jutaan Pengguna Memilih PDF Toolbox Pro?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
            Kami membangun platform ini untuk menghadirkan performa manipulasi dokumen sekelas software enterprise global, namun dengan arsitektur privasi yang menjunjung tinggi kerahasiaan data Anda dan harga yang ramah di kantong masyarakat Indonesia.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
              <Zap size={24} className="fill-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Akselerasi CPU Multi-Core</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Arsitektur hybrid cerdas kami membagi beban kerja secara efisien. Tugas ringan seperti penyusunan halaman diproses 0ms di browser Anda, sedangkan konversi dokumen berat dieksekusi secara paralel menggunakan thread server berkecepatan tinggi.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Zero Data Retention (Privasi 100%)</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Privasi Anda adalah hak mutlak. Semua berkas yang diproses di server dikirimkan via koneksi terenkripsi perbankan TLS 256-bit dan dimusnahkan secara permanen oleh sistem otomatis dalam waktu 60 menit. Kami tidak pernah melihat, menyalin, atau melatih AI dari dokumen Anda.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Adil, Transparan & Fleksibel</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Nikmati kuota gratis setiap hari tanpa kewajiban kartu kredit. Jika butuh memproses berkas mendesak dalam jumlah besar, tersedia Flash Pass 24 Jam seharga Rp5.000 via QRIS tanpa jeratan biaya langganan bulanan yang membingungkan.
            </p>
          </div>
        </div>
      </section>

      {/* EDITORIAL SECTION 2: PANDUAN STANDAR DOKUMEN DIGITAL */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#12161F]/40 rounded-3xl my-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-3">
              <BookOpen size={14} />
              <span>Pusat Pengetahuan & Panduan</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Panduan Memahami Standar Dokumen Digital & PDF
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Pelajari wawasan esensial seputar optimasi, pengarsipan jangka panjang, dan keamanan dokumen digital modern.
            </p>
          </div>

          <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
                <span>Kapan Anda Harus Menggunakan Format PDF/A?</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed pl-8">
                PDF/A (ISO 19005) adalah varian format PDF yang distandarisasi khusus untuk pengarsipan jangka panjang dokumen elektronik. Berbeda dengan PDF standar, PDF/A mewajibkan seluruh font disematkan (*embedded font*), menonaktifkan kode skrip eksternal, dan melarang enkripsi kata sandi. Format ini sangat wajib digunakan untuk dokumen hukum, rekam medis, skripsi perguruan tinggi, serta laporan keuangan perpajakan agar dapat dibuka dengan tampilan persis sama hingga puluhan tahun mendatang.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">2</span>
                <span>Bagaimana Algoritma Kompresi Bekerja Tanpa Merusak Ketajaman Teks?</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed pl-8">
                PDF tersusun atas dua komponen utama: data vektor (teks, bentuk garis, kurva font) dan data raster (gambar atau foto). Mesin kompresi PDF Toolbox Pro tidak pernah mengorbankan ketajaman teks vektor. Pengurangan ukuran dicapai dengan menghapus metadata tidak penting, membersihkan objek biner yatim (*dead objects*), dan mengompresi gambar raster dengan rasio DPI optimal yang tetap tajam saat dicetak maupun dibaca di layar retina.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">3</span>
                <span>Keabsahan Hukum Tanda Tangan Digital Menurut Regulasi</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed pl-8">
                Di era digital, membubuhkan tanda tangan secara elektronik pada kontrak kerja, surat perjanjian, atau invoice memiliki kekuatan pembuktian hukum yang sah sesuai Undang-Undang Informasi dan Transaksi Elektronik (UU ITE). Menggunakan alat tanda tangan digital memangkas kebiasaan mencetak kertas (*paperless*), menghemat biaya tinta, dan mempercepat alur persetujuan bisnis hingga 90%.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EDITORIAL SECTION 3: TABEL PERBANDINGAN TIER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200 dark:border-slate-800">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Perbandingan Transparan Fitur & Kapasitas Akun
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Pilih opsi yang paling sesuai dengan intensitas kebutuhan dokumen harian Anda.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse bg-white dark:bg-[#161A22] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#1E222B] border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold">
                <th className="p-4 sm:p-5">Fitur & Parameter</th>
                <th className="p-4 sm:p-5">Tamu (Tanpa Akun)</th>
                <th className="p-4 sm:p-5 text-blue-600 dark:text-blue-400">Akun Gratis (Google)</th>
                <th className="p-4 sm:p-5 text-amber-600 dark:text-amber-400">24-Hour Flash Pass</th>
                <th className="p-4 sm:p-5 text-purple-600 dark:text-purple-400">Monthly / Annual Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
              <tr>
                <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Batas Kuota Operasi Harian</td>
                <td className="p-4">3 tugas / hari</td>
                <td className="p-4 font-bold text-blue-600 dark:text-blue-400">10 tugas / hari</td>
                <td className="p-4 font-bold text-amber-600 dark:text-amber-400">Tanpa Batas (24 Jam)</td>
                <td className="p-4 font-bold text-purple-600 dark:text-purple-400">Tanpa Batas</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Maksimal Ukuran File</td>
                <td className="p-4">20 MB</td>
                <td className="p-4">50 MB</td>
                <td className="p-4">100 MB</td>
                <td className="p-4 font-bold text-purple-600 dark:text-purple-400">250 MB – 500 MB</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Batch Processing (Banyak File)</td>
                <td className="p-4">Hingga 3 file</td>
                <td className="p-4">Hingga 10 file</td>
                <td className="p-4">Hingga 20 file</td>
                <td className="p-4">Hingga 50 file serentak</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Prioritas Antrean Server</td>
                <td className="p-4">Standar</td>
                <td className="p-4">Standar</td>
                <td className="p-4">Jalur Cepat (High)</td>
                <td className="p-4">Jalur VIP Prioritas Utama</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Keamanan & Penghapusan Otomatis</td>
                <td className="p-4">60 Menit</td>
                <td className="p-4">60 Menit</td>
                <td className="p-4">Tersedia hingga 24 Jam</td>
                <td className="p-4">Tersedia hingga 24 Jam</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
