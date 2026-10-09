import React, { useState, useMemo } from 'react';
import { View } from '../types';
import UniversalDropzone from './UniversalDropzone';
import ToolCard from './ToolCard';
import TriptychFeatureBanner from './TriptychFeatureBanner';
import { TOOL_CATEGORIES } from '../data/toolsCatalog';
import { 
  Search, 
  ShieldCheck, 
  Zap, 
  Award, 
  BookOpen, 
  CheckCircle2 
} from 'lucide-react';

interface LandingPageProps {
  onSelectView: (view: View) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectView }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tools berdasarkan input pencarian
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return TOOL_CATEGORIES;
    const q = searchQuery.toLowerCase().trim();

    return TOOL_CATEGORIES.map(cat => ({
      ...cat,
      tools: cat.tools.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.keywords.some(k => k.includes(q))
      )
    })).filter(cat => cat.tools.length > 0);
  }, [searchQuery]);

  const totalToolsCount = useMemo(() => {
    return TOOL_CATEGORIES.reduce((acc, cat) => acc + cat.tools.length, 0);
  }, []);

  return (
    <div className="w-full">
      {/* HERO SECTION EDITORIAL RADLEY */}
      <section className="pt-12 pb-6 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#314028]/10 text-[#314028] dark:text-emerald-400 border border-[#314028]/20 text-xs mb-5 font-medium select-none shadow-2xs">
          <ShieldCheck size={14} className="stroke-[2.2]" />
          <span>Kepatuhan UU PDP No. 27/2022 • RAM Lokal & Zero Data Retention</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl text-text-primary tracking-tight leading-[1.18] mb-4">
          <span className="italic font-normal">Hello, urus </span>
          <span className="relative inline-block font-bold">
            PDF
            <svg 
              className="absolute -bottom-1 left-0 w-full h-3 text-[#9B4819]/60 pointer-events-none" 
              viewBox="0 0 100 12" 
              fill="none" 
              preserveAspectRatio="none"
            >
              <path d="M2 9 C 30 2, 70 2, 98 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-normal"> jadi lebih elegan.</span>
        </h1>

        <p className="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed mb-8">
          Satu studio dokumen digital modern untuk seleksi berkas resmi SSCASN BKN, mutasi rekening perbankan, dan manipulasi presisi tanpa kompromi privasi.
        </p>

        {/* Quick Selector Search Bar */}
        <div className="relative max-w-xl mx-auto mb-2">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Cari dari ${totalToolsCount} perkakas (misal: kompres, word, tanda tangan, rekening)...`}
            className="w-full pl-11 pr-20 py-3 rounded-full bg-surface border border-border-subtle text-text-primary placeholder:text-text-secondary text-xs sm:text-sm focus:outline-none focus:border-[#9B4819] focus:ring-2 focus:ring-[#9B4819]/20 shadow-2xs hover:shadow-paper transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-semibold text-[#9B4819] hover:underline"
            >
              Hapus
            </button>
          )}
        </div>
      </section>

      {/* UNIVERSAL DROPZONE (The Arch Window) */}
      {!searchQuery && (
        <section className="px-4 sm:px-6 lg:px-8">
          <UniversalDropzone onSelectView={onSelectView} />
        </section>
      )}

      {/* TRIPTYCH FEATURE BANNER (3 Jendela Kubah Resmi) */}
      {!searchQuery && (
        <TriptychFeatureBanner onSelectView={onSelectView} />
      )}

      {/* KATALOG PERKAKAS GRID 3-KOLOM */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-3xl border border-border-subtle p-8 shadow-paper">
            <p className="text-text-secondary font-serif text-base mb-2">
              Tidak ada perkakas yang cocok dengan pencarian "{searchQuery}".
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-[#9B4819] hover:underline"
            >
              Tampilkan semua perkakas
            </button>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.id} className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-border-subtle pb-3">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                  {category.title}
                </h2>
                <span className="text-xs text-text-secondary font-normal">
                  {category.description}
                </span>
              </div>

              {/* Grid 3 Kolom Sesuai Radley Styling */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-border-subtle">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-elevated text-text-secondary text-xs font-medium mb-3 border border-border-subtle">
            <Award size={14} className="text-[#9B4819]" />
            <span>Standar Rekayasa Dokumen Generasi Baru</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Tiga Lapisan Arsitektur Mesin PDF Toolbox Pro
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-2 leading-relaxed">
            Beban kerja dibagi secara efisien antara eksekusi di memori browser pengguna dan server cepat untuk menjamin privasi maksimal dan kecepatan tinggi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-t-[32px] rounded-b-2xl bg-surface border border-border-subtle shadow-2xs hover:shadow-paper transition-all">
            <div className="w-11 h-11 rounded-full bg-[#314028]/10 text-[#314028] dark:text-emerald-400 flex items-center justify-center mb-4 border border-[#314028]/20">
              <Zap size={22} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-serif font-bold text-base text-text-primary">Grup A: RAM Lokal</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#314028]/10 text-[#314028] dark:text-emerald-400 border border-[#314028]/25">0ms Upload</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Tugas seperti penggabungan, pemotongan, penyusunan halaman, dan penambahan teks dieksekusi 100% di memori browser Anda via WebAssembly. Dokumen tidak pernah diunggah ke server.
            </p>
          </div>

          <div className="p-6 rounded-t-[32px] rounded-b-2xl bg-surface border border-border-subtle shadow-2xs hover:shadow-paper transition-all">
            <div className="w-11 h-11 rounded-full bg-[#9B4819]/10 text-[#9B4819] flex items-center justify-center mb-4 border border-[#9B4819]/20">
              <ShieldCheck size={22} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-serif font-bold text-base text-text-primary">Grup B: Server Fast</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#9B4819]/10 text-[#9B4819] border border-[#9B4819]/25">PyMuPDF</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Kompresi akurat (preset CPNS 200KB), enkripsi AES-256, dan True Binary Redaction UU PDP diproses via engine Python ringan berkecepatan tinggi dengan auto-wipe dalam 60 menit.
            </p>
          </div>

          <div className="p-6 rounded-t-[32px] rounded-b-2xl bg-surface border border-border-subtle shadow-2xs hover:shadow-paper transition-all">
            <div className="w-11 h-11 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 border border-purple-500/20">
              <CheckCircle2 size={22} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-serif font-bold text-base text-text-primary">Grup C: Heavy Cloud</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25">Gemini & OCR</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Konversi kompleks (Word, Excel, PowerPoint, PDF/A) serta terjemahan multimodal Gemini AI dan OCR multi-bahasa dengan antrean paralel terisolasi.
            </p>
          </div>
        </div>
      </section>

      {/* EDITORIAL SECTION 2: PANDUAN STANDAR DOKUMEN DIGITAL */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-border-subtle bg-elevated/40 rounded-3xl my-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-elevated text-text-secondary text-xs font-medium mb-2.5 border border-border-subtle">
              <BookOpen size={14} />
              <span>Pusat Pengetahuan & Standar</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
              Panduan Memahami Standar Dokumen Digital & PDF
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-1.5">
              Wawasan esensial seputar kompresi, pengarsipan jangka panjang ISO, dan kepatuhan UU PDP.
            </p>
          </div>

          <div className="space-y-4 text-xs text-text-secondary">
            <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-2 shadow-2xs">
              <h3 className="font-serif font-bold text-base text-text-primary flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#9B4819]/10 text-[#9B4819] flex items-center justify-center text-xs font-bold font-sans">1</span>
                <span>Kapan Anda Harus Menggunakan Format PDF/A?</span>
              </h3>
              <p className="leading-relaxed pl-8 text-text-secondary">
                PDF/A (ISO 19005) adalah varian khusus untuk pengarsipan jangka panjang dokumen elektronik. PDF/A mewajibkan seluruh font disematkan (*embedded font*), melarang kode skrip eksternal, dan menonaktifkan enkripsi kata sandi agar dokumen hukum, skripsi, dan laporan keuangan tetap dapat dibuka persis sama hingga puluhan tahun mendatang.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-2 shadow-2xs">
              <h3 className="font-serif font-bold text-base text-text-primary flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#9B4819]/10 text-[#9B4819] flex items-center justify-center text-xs font-bold font-sans">2</span>
                <span>Kompresi Presisi Tanpa Merusak Ketajaman Teks Vektor</span>
              </h3>
              <p className="leading-relaxed pl-8 text-text-secondary">
                PDF tersusun atas data vektor (teks, garis, font) dan data raster (foto/gambar). Mesin kompresi kami tidak pernah mengorbankan ketajaman teks vektor. Pengurangan ukuran dilakukan dengan membersihkan metadata berlebih, mengeliminasi objek yatim, dan mengoptimalkan DPI gambar raster agar tetap lolos validasi portal SSCASN/BKN.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-2 shadow-2xs">
              <h3 className="font-serif font-bold text-base text-text-primary flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#9B4819]/10 text-[#9B4819] flex items-center justify-center text-xs font-bold font-sans">3</span>
                <span>Jaminan True Binary Redaction UU PDP No. 27/2022</span>
              </h3>
              <p className="leading-relaxed pl-8 text-text-secondary">
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
