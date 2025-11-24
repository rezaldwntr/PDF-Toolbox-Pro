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

const zentridoxLogoBase64 = "data:image/png;base64,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";

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
        <button onClick={handleGoHome} className="cursor-pointer">
          <img 
            src={zentridoxLogoBase64} 
            alt="Zentridox Logo" 
            className="h-7 md:h-8"
            style={{ filter: 'invert(1)' }}
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