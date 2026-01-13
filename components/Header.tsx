
import React, { useState } from 'react';
import { View } from '../types';
import { HamburgerIcon, CloseIcon, SunIcon, MoonIcon } from './icons';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  onGoHome: () => void;
  onNavigate: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ onGoHome, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const navLinks = [
    { label: 'Beranda', view: View.HOME_TAB },
    { label: 'Semua Alat', view: View.TOOLS_TAB },
    { label: 'Blog', view: View.BLOG },
  ];

  return (
    <header className="sticky top-0 z-50 pt-4 px-4 sm:px-6 lg:px-8">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm px-6 py-3 flex justify-between items-center transition-all duration-300">
        
        {/* Logo */}
        <button onClick={onGoHome} className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          </div>
          <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">PDF<span className="text-blue-600">Toolbox</span></span>
        </button>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
                <button
                    key={link.label}
                    onClick={() => onNavigate(link.view)}
                    className="text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
                >
                    {link.label}
                </button>
            ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
            <button 
                onClick={toggleTheme} 
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
                {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
            </button>
            
            <button 
                onClick={() => onNavigate(View.PROFILE_TAB)}
                className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white dark:ring-slate-700 shadow-sm ml-2"
            >
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile" className="w-full h-full object-cover" />
            </button>

             <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-slate-600 dark:text-slate-300 p-2">
                {isMobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
            </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 p-4 absolute left-4 right-4 z-50 animate-fade-in-down">
            <nav className="flex flex-col gap-2">
              {navLinks.map(item => (
                <button 
                    key={item.label} 
                    onClick={() => {
                        onNavigate(item.view);
                        setIsMobileMenuOpen(false);
                    }} 
                    className="w-full text-left font-medium py-3 px-4 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
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
