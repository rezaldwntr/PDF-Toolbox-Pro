
import React from 'react';
import { View } from '../types';
import { MergeIcon, CompressIcon, ConvertIcon, SignatureIcon, SearchIcon, FilePdfIcon } from './icons';

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
    className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all active:scale-95 group"
  >
    <div className={`p-3 rounded-full ${colorClass} bg-opacity-10 text-opacity-90 group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `w-6 h-6` })}
    </div>
    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">{title}</span>
  </button>
);

const LandingPage: React.FC<LandingPageProps> = ({ onSelectView }) => {
  return (
    <div className="flex flex-col pb-20 animate-fade-in">
      {/* Greeting & Search */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Hai, Apa yang ingin <br/> <span className="text-blue-600 dark:text-blue-400">Anda lakukan hari ini?</span>
        </h1>
        
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="Cari alat atau file PDF..." 
            className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Aksi Cepat</h2>
            <button onClick={() => onSelectView(View.TOOLS_TAB)} className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-500">Lihat Semua</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickActionCard 
            icon={<MergeIcon />} 
            title="Gabungkan" 
            colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
            onClick={() => onSelectView(View.MERGE)}
          />
          <QuickActionCard 
            icon={<CompressIcon />} 
            title="Kompres" 
            colorClass="bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
            onClick={() => onSelectView(View.COMPRESS)}
          />
          <QuickActionCard 
            icon={<ConvertIcon />} 
            title="Konversi" 
            colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300"
            onClick={() => onSelectView(View.CONVERT)}
          />
          <QuickActionCard 
            icon={<SignatureIcon />} 
            title="Tanda Tangan" 
            colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300"
            onClick={() => onSelectView(View.ADD_SIGNATURE)}
          />
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
