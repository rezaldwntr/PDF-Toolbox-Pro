import React from 'react';
import { View } from '../types';

interface HeaderProps {
  onGoHome: () => void;
  onNavigate: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ onGoHome, onNavigate }) => {
  return (
    <header className="bg-slate-900/70 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-700">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <button onClick={onGoHome} className="cursor-pointer">
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
            PDF Toolbox Pro
          </h1>
        </button>
        <nav className="hidden md:flex items-center gap-4 text-sm">
            <button onClick={() => onNavigate(View.MERGE)} className="font-medium text-slate-300 hover:text-blue-400 transition-colors">Gabungkan</button>
            <button onClick={() => onNavigate(View.SPLIT)} className="font-medium text-slate-300 hover:text-blue-400 transition-colors">Pisahkan</button>
            <button onClick={() => onNavigate(View.COMPRESS)} className="font-medium text-slate-300 hover:text-blue-400 transition-colors">Kompres</button>
            <button onClick={() => onNavigate(View.ADD_TEXT)} className="font-medium text-slate-300 hover:text-blue-400 transition-colors">Tambah Teks</button>
            <button onClick={() => onNavigate(View.ADD_SIGNATURE)} className="font-medium text-slate-300 hover:text-blue-400 transition-colors">Tanda Tangan</button>
            <button onClick={() => onNavigate(View.ORGANIZE)} className="font-medium text-slate-300 hover:text-blue-400 transition-colors">Atur</button>
        </nav>
      </div>
    </header>
  );
};

export default Header;