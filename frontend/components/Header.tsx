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
    <header className="sticky top-0 z-50 bg-[#000000] text-[#f5f5f7] h-[44px] flex items-center justify-between px-4 sm:px-6 lg:px-8 text-[12px] tracking-fine font-normal font-sans w-full">
        {/* Mobile Hamburger (Left on mobile, hidden on desktop) */}
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-[#f5f5f7] opacity-80 hover:opacity-100 transition-opacity">
            {isMobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
        </button>

        {/* Logo (Centered on mobile, Left on desktop) */}
        <button onClick={onGoHome} className="flex items-center group opacity-90 hover:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0">
          <span className="font-semibold tracking-wide text-sm">PDF<span className="text-apple-primaryOnDark">Toolbox</span></span>
        </button>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-[24px]">
            {navLinks.map((link) => (
                <button
                    key={link.label}
                    onClick={() => onNavigate(link.view)}
                    className="opacity-80 hover:opacity-100 transition-opacity"
                >
                    {link.label}
                </button>
            ))}
        </div>

        {/* Actions (Right) */}
        <div className="flex items-center gap-4">
            <button 
                onClick={toggleTheme} 
                className="opacity-80 hover:opacity-100 transition-opacity"
            >
                {theme === 'light' ? <MoonIcon className="w-[14px] h-[14px]" /> : <SunIcon className="w-[14px] h-[14px]" />}
            </button>
            
            <button 
                onClick={() => onNavigate(View.PROFILE_TAB)}
                className="opacity-80 hover:opacity-100 transition-opacity flex items-center"
            >
                <div className="w-[16px] h-[16px] rounded-full overflow-hidden bg-white/20">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile" className="w-full h-full object-cover" />
                </div>
            </button>
        </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-[44px] left-0 right-0 bg-[#000000] z-50 animate-fade-in-down border-t border-[#333333]">
            <nav className="flex flex-col px-6 py-4 gap-4">
              {navLinks.map(item => (
                <button 
                    key={item.label} 
                    onClick={() => {
                        onNavigate(item.view);
                        setIsMobileMenuOpen(false);
                    }} 
                    className="text-left text-[17px] tracking-tight-md text-[#f5f5f7] py-2 border-b border-[#333333] last:border-0 opacity-90 hover:opacity-100 transition-opacity"
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
