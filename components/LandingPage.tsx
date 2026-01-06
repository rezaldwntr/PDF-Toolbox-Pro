
import React from 'react';
import { View } from '../types';
import { MergeIcon, CompressIcon, FileWordIcon, SplitIcon, FileExcelIcon, FileJpgIcon } from './icons';

interface LandingPageProps {
  onSelectView: (view: View) => void;
}

const MainToolCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  colorClass: string;
  onClick: () => void;
}> = ({ icon, title, desc, colorClass, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-start gap-4 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:border-red-500 dark:hover:border-red-500 hover:shadow-xl transition-all active:scale-95 group text-left"
  >
    <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-10 text-opacity-90 group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `w-8 h-8` })}
    </div>
    <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-red-600 transition-colors">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
    </div>
  </button>
);

const LandingPage: React.FC<LandingPageProps> = ({ onSelectView }) => {
  return (
    <div className="flex flex-col pb-20 animate-fade-in">
      <div className="mb-12 text-center">
        <div className="inline-block px-4 py-1.5 mb-6 text-xs font-black tracking-widest text-red-600 bg-red-50 dark:bg-red-900/20 rounded-full uppercase">
            Professional PDF Server Processing
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 leading-[1.1] tracking-tighter">
          Kelola Dokumen <br/> <span className="text-red-600">Tanpa Batas.</span>
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
            Solusi PDF tingkat lanjut dengan pemrosesan server berkecepatan tinggi. Gabung, Pisah, dan Kompres file besar Anda secara aman.
        </p>
      </div>

      <section className="mb-12">
        <div className="flex justify-between items-center mb-8 px-1">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter border-l-4 border-red-600 pl-4">6 Menu Utama</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <MainToolCard 
            icon={<MergeIcon />} 
            title="Gabungkan PDF" 
            desc="Satukan beberapa file menjadi satu dokumen."
            colorClass="bg-red-100 text-red-600"
            onClick={() => onSelectView(View.MERGE)}
          />
          <MainToolCard 
            icon={<SplitIcon />} 
            title="Pisahkan PDF" 
            desc="Ekstrak halaman tertentu dari dokumen Anda."
            colorClass="bg-blue-100 text-blue-600"
            onClick={() => onSelectView(View.SPLIT)}
          />
          <MainToolCard 
            icon={<CompressIcon />} 
            title="Kompres PDF" 
            desc="Kurangi ukuran file tanpa merusak kualitas."
            colorClass="bg-green-100 text-green-600"
            onClick={() => onSelectView(View.COMPRESS)}
          />
          <MainToolCard 
            icon={<FileWordIcon />} 
            title="PDF ke Word" 
            desc="Ubah dokumen ke format teks yang bisa diedit."
            colorClass="bg-indigo-100 text-indigo-600"
            onClick={() => onSelectView(View.PDF_TO_WORD)}
          />
          <MainToolCard 
            icon={<FileExcelIcon />} 
            title="PDF ke Excel" 
            desc="Ambil tabel data langsung ke spreadsheet."
            colorClass="bg-emerald-100 text-emerald-600"
            onClick={() => onSelectView(View.PDF_TO_EXCEL)}
          />
          <MainToolCard 
            icon={<FileJpgIcon />} 
            title="PDF ke Gambar" 
            desc="Konversi setiap halaman menjadi file gambar."
            colorClass="bg-purple-100 text-purple-600"
            onClick={() => onSelectView(View.PDF_TO_IMAGE)}
          />
        </div>
      </section>

      <div className="bg-slate-900 dark:bg-red-600 rounded-3xl p-10 text-white flex flex-col items-center text-center gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-10">
              <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          <div className="relative z-10">
              <h3 className="text-3xl font-black mb-4 tracking-tighter">Butuh Fitur Lainnya?</h3>
              <p className="text-slate-400 dark:text-red-100 max-w-lg mx-auto mb-8">
                  Masih tersedia banyak alat profesional seperti Tanda Tangan Digital, Atur Halaman, dan Tambah Teks.
              </p>
              <button 
                onClick={() => onSelectView(View.TOOLS_TAB)}
                className="bg-red-600 dark:bg-white text-white dark:text-red-600 font-black py-4 px-10 rounded-2xl hover:scale-105 transition-all shadow-xl"
              >
                  LIHAT SEMUA ALAT
              </button>
          </div>
      </div>
    </div>
  );
};

export default LandingPage;
