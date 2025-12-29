
import React, { useState } from 'react';
import { View } from '../types';
import { HamburgerIcon, CloseIcon, SunIcon, MoonIcon, FilePdfIcon } from './icons';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  onGoHome: () => void;
  onNavigate: (view: View) => void;
}

const navItems = [
  { view: View.HOME_TAB, label: 'Beranda' },
  { view: View.TOOLS_TAB, label: 'Alat PDF' },
  { view: View.PROFILE_TAB, label: 'Profil' },
];

const Header: React.FC<HeaderProps> = ({ onGoHome, onNavigate }) => {
  // State untuk mengontrol visibilitas menu di tampilan mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Mengambil tema dan fungsi toggle dari Context
  const { theme, toggleTheme } = useTheme();

  const handleNavigate = (view: View) => {
    onNavigate(view);
    setIsMobileMenuOpen(false); // Tutup menu mobile setelah navigasi
  };

  const handleGoHome = () => {
    onGoHome();
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-50 border-b border-gray-200 dark:border-slate-700 transition-colors duration-300">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo Section - Menggunakan SVG Icon pengganti Image untuk menghindari 404 */}
        <button onClick={handleGoHome} className="cursor-pointer flex items-center gap-2 group">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-200">
             {/* Menggunakan ikon PDF yang sudah ada */}
             <svg className="w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Zentridox
          </span>
        </button>
        
        <div className="flex items-center gap-4">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6 text-sm">
            {navItems.map(item => (
                <button 
                    key={item.label} 
                    onClick={() => handleNavigate(item.view)} 
                    className={`font-medium transition-colors ${item.label === 'Alat PDF' ? 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm shadow-blue-200 dark:shadow-none' : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'}`}
                >
                    {item.label}
                </button>
            ))}
            </nav>

            {/* Tombol Ganti Tema (Dark/Light) */}
            <button 
                onClick={toggleTheme} 
                className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle Theme"
            >
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            
            {/* Tombol Menu Mobile */}
            <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600 dark:text-gray-300 hover:text-blue-600 p-2 -mr-2">
                {isMobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
            </button>
            </div>
        </div>
      </div>
      
      {/* Menu Navigasi Mobile (Dropdown) */}
      {isMobileMenuOpen && (
        <div className="md:hidden animate-fade-in-down bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 absolute w-full left-0 shadow-lg">
            <nav className="px-4 pt-2 pb-4 flex flex-col items-start gap-2">
              {navItems.map(item => (
                <button key={item.label} onClick={() => handleNavigate(item.view)} className="w-full text-left font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md transition-colors py-3 px-3 border-b border-gray-100 dark:border-slate-800 last:border-0">
                    {item.label}
                </button>
              ))}
            </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
