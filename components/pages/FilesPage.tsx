
import React from 'react';
import { FolderIcon, SearchIcon } from '../icons';

const FilesPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full pb-20 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-100 mb-2">File Saya</h2>
        <div className="relative mt-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="w-5 h-5 text-slate-500" />
          </div>
          <input 
            type="text" 
            placeholder="Cari dokumen..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center text-center p-8 bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">
        <div className="bg-slate-800 p-6 rounded-full mb-4">
          <FolderIcon className="w-12 h-12 text-slate-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-300 mb-2">Penyimpanan Lokal</h3>
        <p className="text-slate-500 max-w-xs">
          Saat ini Zentridox memproses file langsung di browser Anda untuk privasi maksimal. Riwayat file lokal akan segera hadir!
        </p>
      </div>
    </div>
  );
};

export default FilesPage;
