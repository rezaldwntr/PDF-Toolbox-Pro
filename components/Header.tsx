import React, { useState } from 'react';
import { View } from '../types';
import { HamburgerIcon, CloseIcon, SunIcon, MoonIcon } from './icons';
import { useTheme } from '../contexts/ThemeContext';

// Daftar path logo untuk menangani kemungkinan masalah loading path di berbagai environment
const logoPaths = [
  'logozen.png',
  '/logozen.png',
  '/src/logozen.png',
  'src/logozen.png'
];

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
  // State untuk menangani fallback jika gambar logo gagal dimuat
  const [logoError, setLogoError] = useState(false);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
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

  // Mencoba path logo berikutnya jika yang sekarang gagal dimuat
  const handleLogoError = () => {
    const nextIndex = currentPathIndex + 1;
    if (nextIndex < logoPaths.length) {
      setCurrentPathIndex(nextIndex);
    } else {
      setLogoError(true); // Menyerah dan tampilkan teks
    }
  };

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-50 border-b border-gray-200 dark:border-slate-700 transition-colors duration-300">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo Section */}
        <button onClick={handleGoHome} className="cursor-pointer flex items-center gap-2">
          {!logoError ? (
            <img 
              src={logoPaths[currentPathIndex]}
              alt="Zentridox Logo" 
              className={`h-10 md:h-12 object-contain ${theme === 'dark' ? 'invert' : ''}`} // Membalik warna logo di mode gelap jika logo berwarna hitam
              onError={handleLogoError}
            />
          ) : (
             <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Zentridox
             </span>
          )}
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