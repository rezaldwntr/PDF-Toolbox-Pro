import React from 'react';
import { View } from '../types';
import { 
  MergeIcon, SplitIcon, CompressIcon, 
  FileWordIcon, FileExcelIcon, FileJpgIcon
} from './icons';

interface LandingPageProps {
  onSelectView: (view: View) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectView }) => {
  return (
    <div className="animate-fade-in w-full flex flex-col items-center">
      
      {/* TILE 1: GABUNGKAN (Light Canvas) */}
      <section className="w-full bg-apple-canvas text-apple-ink dark:bg-[#000000] dark:text-white flex flex-col items-center justify-center text-center pt-[120px] pb-[80px]">
        <div className="max-w-[800px] px-4 flex flex-col items-center">
            <h1 className="text-[40px] md:text-[56px] font-semibold tracking-hero leading-tight mb-4 font-display">
                Kelola Dokumen.<br /> Lebih Cerdas.
            </h1>
            <p className="text-[21px] md:text-[28px] font-normal tracking-lead mb-8 text-apple-ink dark:text-white max-w-2xl leading-snug">
                Satu tempat untuk menggabungkan, memisahkan, dan mengonversi PDF. Cepat, aman, dan gratis.
            </p>
            
            <div className="flex items-center justify-center gap-4 mb-16">
                <button 
                    onClick={() => onSelectView(View.MERGE)}
                    className="bg-apple-primary hover:bg-apple-primaryFocus text-white text-[17px] font-normal px-[22px] py-[11px] rounded-pill transition-transform active:scale-95"
                >
                    Mulai Gabungkan
                </button>
                <button 
                    onClick={() => onSelectView(View.TOOLS_TAB)}
                    className="bg-transparent border border-apple-primary text-apple-primary hover:bg-apple-primary/10 text-[17px] font-normal px-[22px] py-[11px] rounded-pill transition-transform active:scale-95"
                >
                    Lihat Alat
                </button>
            </div>
            
            <div className="w-full max-w-md aspect-square relative drop-shadow-2xl opacity-90 mx-auto mt-8">
                <div className="absolute inset-0 flex items-center justify-center">
                    <MergeIcon className="w-48 h-48 text-apple-primary dark:text-apple-primaryOnDark" />
                </div>
            </div>
        </div>
      </section>

      {/* TILE 2: KOMPRES (Dark Tile 1) */}
      <section className="w-full bg-apple-tile1 text-white flex flex-col items-center justify-center text-center py-[80px]">
        <div className="max-w-[800px] px-4 flex flex-col items-center">
            <h2 className="text-[34px] md:text-[40px] font-semibold tracking-display leading-tight mb-4 font-display">
                Kompres PDF
            </h2>
            <p className="text-[21px] md:text-[28px] font-normal tracking-lead mb-8 text-[#cccccc] max-w-2xl leading-snug">
                Perkecil ukuran file tanpa mengorbankan kualitas.
            </p>
            
            <div className="flex items-center justify-center gap-4 mb-16">
                <button 
                    onClick={() => onSelectView(View.COMPRESS)}
                    className="bg-apple-primary hover:bg-apple-primaryFocus text-white text-[17px] font-normal px-[22px] py-[11px] rounded-pill transition-transform active:scale-95"
                >
                    Kompres Sekarang
                </button>
            </div>
            
            <div className="w-full max-w-[300px] aspect-square relative opacity-90 mx-auto drop-shadow-2xl">
                 <div className="absolute inset-0 flex items-center justify-center">
                    <CompressIcon className="w-32 h-32 text-white" />
                </div>
            </div>
        </div>
      </section>

      {/* TILE 3: PISAHKAN (Parchment) */}
      <section className="w-full bg-apple-parchment text-apple-ink dark:bg-apple-tile2 dark:text-white flex flex-col items-center justify-center text-center py-[80px]">
        <div className="max-w-[800px] px-4 flex flex-col items-center">
            <h2 className="text-[34px] md:text-[40px] font-semibold tracking-display leading-tight mb-4 font-display">
                Pisahkan PDF
            </h2>
            <p className="text-[21px] md:text-[28px] font-normal tracking-lead mb-8 text-apple-inkMuted80 dark:text-[#cccccc] max-w-2xl leading-snug">
                Ambil halaman tertentu yang Anda butuhkan.
            </p>
            
            <div className="flex items-center justify-center gap-4 mb-16">
                <button 
                    onClick={() => onSelectView(View.SPLIT)}
                    className="bg-apple-primary hover:bg-apple-primaryFocus text-white text-[17px] font-normal px-[22px] py-[11px] rounded-pill transition-transform active:scale-95"
                >
                    Pisahkan File
                </button>
            </div>
            
            <div className="w-full max-w-[300px] aspect-square relative opacity-90 mx-auto drop-shadow-2xl">
                 <div className="absolute inset-0 flex items-center justify-center">
                    <SplitIcon className="w-32 h-32 text-apple-ink dark:text-white" />
                </div>
            </div>
        </div>
      </section>
      
      {/* TILE 4: KONVERSI CEPAT (Dark Tile 3) */}
      <section className="w-full bg-apple-tile3 text-white flex flex-col items-center justify-center text-center py-[80px]">
        <div className="max-w-[1000px] px-4 flex flex-col items-center w-full">
            <h2 className="text-[34px] md:text-[40px] font-semibold tracking-display leading-tight mb-12 font-display">
                Konversi Cepat
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-[900px]">
                <div onClick={() => onSelectView(View.PDF_TO_WORD)} className="cursor-pointer group flex flex-col items-center p-8 bg-apple-tile1 hover:bg-[#2f2f32] rounded-lg transition-colors border border-[#333333]">
                    <FileWordIcon className="w-16 h-16 text-apple-primaryOnDark mb-6 group-hover:scale-105 transition-transform" />
                    <h3 className="text-[17px] font-semibold tracking-tight-md">PDF ke Word</h3>
                </div>
                <div onClick={() => onSelectView(View.PDF_TO_EXCEL)} className="cursor-pointer group flex flex-col items-center p-8 bg-apple-tile1 hover:bg-[#2f2f32] rounded-lg transition-colors border border-[#333333]">
                    <FileExcelIcon className="w-16 h-16 text-[#34c759] mb-6 group-hover:scale-105 transition-transform" />
                    <h3 className="text-[17px] font-semibold tracking-tight-md">PDF ke Excel</h3>
                </div>
                <div onClick={() => onSelectView(View.PDF_TO_IMAGE)} className="cursor-pointer group flex flex-col items-center p-8 bg-apple-tile1 hover:bg-[#2f2f32] rounded-lg transition-colors border border-[#333333]">
                    <FileJpgIcon className="w-16 h-16 text-[#ff3b30] mb-6 group-hover:scale-105 transition-transform" />
                    <h3 className="text-[17px] font-semibold tracking-tight-md">PDF ke JPG</h3>
                </div>
            </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
