
import React, { useState } from 'react';
import { View } from '../types';
import { HamburgerIcon, CloseIcon, SunIcon, MoonIcon } from './icons';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleNavigate = (view: View) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-50 border-b border-gray-200 dark:border-slate-700 transition-colors duration-300">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <button onClick={onGoHome} className="cursor-pointer flex items-center gap-2 group">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-500/30 group-hover:rotate-12 transition-all duration-300">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <span className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">
            PDF TOOLBOX <span className="text-red-600">PRO</span>
          </span>
        </button>
        
        <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6 text-sm">
            {navItems.map(item => (
                <button 
                    key={item.label} 
                    onClick={() => handleNavigate(item.view)} 
                    className="font-bold text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors"
                >
                    {item.label}
                </button>
            ))}
            </nav>

            <button 
                onClick={toggleTheme} 
                className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-gray-600 dark:text-gray-300 p-2">
                {isMobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
            </button>
        </div>
      </div>
      
      {isMobileMenuOpen && (
        <div className="md:hidden animate-fade-in-down bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
            <nav className="px-4 py-4 flex flex-col gap-2">
              {navItems.map(item => (
                <button key={item.label} onClick={() => handleNavigate(item.view)} className="w-full text-left font-bold text-gray-700 dark:text-gray-200 py-3 px-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg">
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
