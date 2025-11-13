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
        <nav className="hidden md:flex items-center gap-6 text-sm">
            <button onClick={() => onNavigate(View.BLOG)} className="font-medium text-slate-300 hover:text-blue-400 transition-colors">Blog</button>
            <button onClick={() => onNavigate(View.FAQ)} className="font-medium text-slate-300 hover:text-blue-400 transition-colors">FAQ</button>
            <button onClick={() => onNavigate(View.ABOUT)} className="font-medium text-slate-300 hover:text-blue-400 transition-colors">Tentang</button>
            <button onClick={() => onNavigate(View.CONTACT)} className="font-medium text-slate-300 hover:text-blue-400 transition-colors">Kontak</button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
