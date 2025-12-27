
import React from 'react';
import { View } from '../types';
import { MergeIcon, CompressIcon, FileWordIcon, SignatureIcon, SearchIcon } from './icons';

interface LandingPageProps {
  onSelectView: (view: View) => void;
}

const QuickActionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  colorClass: string;
  onClick: () => void;
}> = ({ icon, title, colorClass, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all active:scale-95 group"
  >
    <div className={`p-3 rounded-full ${colorClass} bg-opacity-10 text-opacity-90 group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `w-7 h-7` })}
    </div>
    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 transition-colors">{title}</span>
  </button>
);

const LandingPage: React.FC<LandingPageProps> = ({ onSelectView }) => {
  return (
    <div className="flex flex-col pb-20 animate-fade-in">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
          Solusi PDF Terlengkap <br/> <span className="text-blue-600 dark:text-blue-400">Mudah, Cepat, & Aman.</span>
        </h1>
        
        <div className="relative group max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="Cari alat (misal: Word, Gabung, Kompres)..." 
            className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      <section className="mb-10">
        <div className="flex justify-between items-center mb-6 px-1">
            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">Aksi Cepat</h2>
            <button onClick={() => onSelectView(View.TOOLS_TAB)} className="text-sm text-blue-600 dark:text-blue-400 font-bold hover:underline">Lihat Semua Alat</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickActionCard 
            icon={<FileWordIcon />} 
            title="PDF ke Word" 
            colorClass="bg-blue-100 text-blue-600"
            onClick={() => onSelectView(View.PDF_TO_WORD)}
          />
          <QuickActionCard 
            icon={<MergeIcon />} 
            title="Gabungkan" 
            colorClass="bg-indigo-100 text-indigo-600"
            onClick={() => onSelectView(View.MERGE)}
          />
          <QuickActionCard 
            icon={<CompressIcon />} 
            title="Kompres" 
            colorClass="bg-green-100 text-green-600"
            onClick={() => onSelectView(View.COMPRESS)}
          />
          <QuickActionCard 
            icon={<SignatureIcon />} 
            title="Tanda Tangan" 
            colorClass="bg-orange-100 text-orange-600"
            onClick={() => onSelectView(View.ADD_SIGNATURE)}
          />
        </div>
      </section>

      <div className="bg-blue-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-500/20">
          <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2">Butuh Konversi Format Lain?</h3>
              <p className="text-blue-100 opacity-90">Ubah PDF ke Excel, PowerPoint, atau Gambar dalam hitungan detik.</p>
          </div>
          <button 
            onClick={() => onSelectView(View.TOOLS_TAB)}
            className="bg-white text-blue-600 font-bold py-3 px-8 rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
          >
              Buka Semua Menu
          </button>
      </div>
    </div>
  );
};

export default LandingPage;
