
import React from 'react';
import { View } from '../types';
import { 
  MergeIcon, SplitIcon, CompressIcon, 
  FileWordIcon, FileExcelIcon, FileJpgIcon
} from './icons';

interface LandingPageProps {
  onSelectView: (view: View) => void;
}

const QuickActionCard = ({ title, desc, icon, colorClass, onClick }: any) => (
    <button 
        onClick={onClick}
        className="group flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow-md transition-all duration-300 w-full text-left"
    >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass} group-hover:scale-110 transition-transform`}>
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-slate-800 dark:text-white text-sm">{title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
        </div>
    </button>
);

const LandingPage: React.FC<LandingPageProps> = ({ onSelectView }) => {
  return (
    <div className="animate-fade-in pb-24">
      <div className="mb-10 text-center md:text-left mt-8 px-2">
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
            Kelola Dokumen <br className="md:hidden"/> <span className="text-blue-600">Lebih Cerdas</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg">
            Satu tempat untuk menggabungkan, memisahkan, dan mengonversi PDF. Cepat, aman, dan gratis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-2">
        <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Featured Tool */}
                <div 
                    onClick={() => onSelectView(View.MERGE)}
                    className="md:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white relative overflow-hidden group cursor-pointer shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-1"
                >
                    <div className="relative z-10 flex flex-col h-full justify-between min-h-[200px]">
                        <div>
                            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold border border-white/10">POPULER</span>
                            <h2 className="text-3xl font-bold mt-4 mb-2">Gabungkan PDF</h2>
                            <p className="text-blue-100 max-w-sm mb-6">Satukan banyak dokumen menjadi satu file PDF yang rapi.</p>
                        </div>
                        <div className="inline-flex items-center gap-2 font-bold text-sm bg-white text-blue-600 px-5 py-2.5 rounded-xl shadow-lg w-fit">
                            Mulai Gabungkan
                        </div>
                    </div>
                     <div className="absolute right-[-20px] bottom-[-20px] opacity-20 group-hover:opacity-30 transition-all rotate-12">
                        <MergeIcon className="w-48 h-48" />
                    </div>
                </div>

                {/* Secondary Tools */}
                <div onClick={() => onSelectView(View.SPLIT)} className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-purple-500/30 transition-all cursor-pointer group h-64 flex flex-col justify-between">
                    <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <SplitIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Pisahkan PDF</h3>
                        <p className="text-sm text-slate-500 mt-1">Ambil halaman tertentu saja.</p>
                    </div>
                </div>

                <div onClick={() => onSelectView(View.COMPRESS)} className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-green-500/30 transition-all cursor-pointer group h-64 flex flex-col justify-between">
                    <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CompressIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Kompres PDF</h3>
                            <span className="text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">-50%</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">Perkecil ukuran file.</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Sidebar / Quick Access */}
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white px-2 mt-4 lg:mt-0">Konversi Cepat</h3>
            <QuickActionCard title="PDF ke Word" desc="Konversi dokumen" icon={<FileWordIcon className="w-6 h-6 text-blue-600" />} colorClass="bg-blue-50 dark:bg-blue-900/20" onClick={() => onSelectView(View.PDF_TO_WORD)} />
            <QuickActionCard title="PDF ke Excel" desc="Ekstrak tabel" icon={<FileExcelIcon className="w-6 h-6 text-green-600" />} colorClass="bg-green-50 dark:bg-green-900/20" onClick={() => onSelectView(View.PDF_TO_EXCEL)} />
            <QuickActionCard title="PDF ke Gambar" desc="Simpan sbg JPG" icon={<FileJpgIcon className="w-6 h-6 text-red-600" />} colorClass="bg-red-50 dark:bg-red-900/20" onClick={() => onSelectView(View.PDF_TO_IMAGE)} />
             <button onClick={() => onSelectView(View.TOOLS_TAB)} className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all font-bold text-sm mt-4">
                Lihat Semua Alat &rarr;
            </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
