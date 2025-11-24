import React, { useState } from 'react';
import { View } from '../types';
import { HamburgerIcon, CloseIcon } from './icons';

interface HeaderProps {
  onGoHome: () => void;
  onNavigate: (view: View) => void;
}

const navItems = [
  { view: View.MERGE, label: 'Gabungkan' },
  { view: View.SPLIT, label: 'Pisahkan' },
  { view: View.COMPRESS, label: 'Kompres' },
  { view: View.ADD_TEXT, label: 'Tambah Teks' },
  { view: View.ADD_SIGNATURE, label: 'Tanda Tangan' },
  { view: View.ORGANIZE, label: 'Atur' },
];

// Menggunakan path file yang diunggah
const logoUrl = "/src/Gemini_Generated_Image_5bgfv65bgfv65bgf.png";

const Header: React.FC<HeaderProps> = ({ onGoHome, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (view: View) => {
    onNavigate(view);
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  const handleGoHome = () => {
    onGoHome();
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  return (
    <header className="bg-slate-900/70 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-700">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <button onClick={handleGoHome} className="cursor-pointer flex items-center">
          <img 
            src={logoUrl} 
            alt="Zentridox Logo" 
            className="h-10 md:h-12 object-contain"
          />
        </button>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          {navItems.map(item => (
            <button key={item.view} onClick={() => handleNavigate(item.view)} className="font-medium text-slate-300 hover:text-blue-400 transition-colors">{item.label}</button>
          ))}
        </nav>
        
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-300 hover:text-blue-400 p-2 -mr-2">
            {isMobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden animate-fade-in-down">
            <nav className="px-4 pt-2 pb-4 border-t border-slate-700 flex flex-col items-start gap-1">
              {navItems.map(item => (
                <button key={item.view} onClick={() => handleNavigate(item.view)} className="w-full text-left font-medium text-slate-300 hover:text-blue-400 hover:bg-slate-800 rounded-md transition-colors py-2 px-2">{item.label}</button>
              ))}
            </nav>
        </div>
      )}
    </header>
  );
};

export default Header;