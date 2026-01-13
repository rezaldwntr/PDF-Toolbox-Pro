
import React, { useState } from 'react';
import { View } from '../types';
import { HamburgerIcon, CloseIcon, SunIcon, MoonIcon, SearchIcon, BellIcon, UserIcon } from './icons';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  onGoHome: () => void;
  onNavigate: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ onGoHome, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [activePill, setActivePill] = useState('Home');

  const handleNavigate = (view: View) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  const navPills = [
    { label: 'Home', active: activePill === 'Home', onClick: () => { setActivePill('Home'); onNavigate(View.HOME_TAB); } },
    { label: 'Tools', active: activePill === 'Tools', onClick: () => { setActivePill('Tools'); onNavigate(View.TOOLS_TAB); } },
  ];

  return (
    <header className="sticky top-0 z-50 transition-colors duration-300 pt-4 px-4 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm px-6 py-4 flex justify-between items-center">
        {/* Logo Section */}
        <button onClick={onGoHome} className="flex items-center gap-2 cursor-pointer outline-none">
          <div className="w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          </div>
        </button>
        
        {/* Center Pills (Desktop) */}
        <div className="hidden md:flex items-center gap-2">
            {navPills.map((pill) => (
                <button
                    key={pill.label}
                    onClick={pill.onClick}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                        pill.active 
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-md' 
                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                >
                    {pill.label}
                </button>
            ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
            <button className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors">
                <SearchIcon className="w-6 h-6" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors relative">
                <BellIcon className="w-6 h-6" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800"></span>
            </button>
            <button 
                onClick={toggleTheme} 
                className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
                {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
            </button>
            <button 
                onClick={() => handleNavigate(View.PROFILE_TAB)}
                className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm"
            >
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile" className="w-full h-full object-cover" />
            </button>
             <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-gray-600 dark:text-gray-300 p-2 ml-2">
                {isMobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
            </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-2 animate-fade-in-down absolute left-4 right-4 z-50">
            <nav className="flex flex-col gap-1">
              {navPills.map(item => (
                <button 
                    key={item.label} 
                    onClick={item.onClick} 
                    className={`w-full text-left font-bold py-3 px-4 rounded-xl ${
                        item.active 
                        ? 'bg-black text-white dark:bg-white dark:text-black' 
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
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
