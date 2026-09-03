import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const GlobalMenuBar: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-[28px] z-[9999] bg-rios-menuLight dark:bg-rios-menuDark text-rios-textLight dark:text-rios-textDark backdrop-blur-xl flex items-center justify-between px-4 text-[14px] font-medium tracking-menu select-none border-b border-rios-borderGlass dark:border-rios-borderGlassDark">
      {/* Left Menu */}
      <div className="flex items-center gap-1 h-full">
        <div className="font-bold cursor-default hover:bg-black/10 dark:hover:bg-white/10 px-2 rounded h-[24px] flex items-center">
          PDF/OS
        </div>
        <div className="cursor-default hover:bg-black/10 dark:hover:bg-white/10 px-2 rounded h-[24px] hidden sm:flex items-center">File</div>
        <div className="cursor-default hover:bg-black/10 dark:hover:bg-white/10 px-2 rounded h-[24px] hidden sm:flex items-center">Edit</div>
        <div className="cursor-default hover:bg-black/10 dark:hover:bg-white/10 px-2 rounded h-[24px] hidden sm:flex items-center">View</div>
        <div className="cursor-default hover:bg-black/10 dark:hover:bg-white/10 px-2 rounded h-[24px] hidden sm:flex items-center">Window</div>
        <div className="cursor-default hover:bg-black/10 dark:hover:bg-white/10 px-2 rounded h-[24px] hidden sm:flex items-center">Help</div>
      </div>

      {/* Right Menu (Tray) */}
      <div className="flex items-center gap-1 h-full text-[13px]">
        <button onClick={toggleTheme} className="hover:bg-black/10 dark:hover:bg-white/10 px-2 rounded h-[24px] transition-colors flex items-center">
            {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <div className="hidden sm:flex items-center hover:bg-black/10 dark:hover:bg-white/10 px-2 rounded h-[24px] cursor-default">
          EN
        </div>
        <div className="flex items-center hover:bg-black/10 dark:hover:bg-white/10 px-2 rounded h-[24px] cursor-default">
          {formatTime(time)}
        </div>
      </div>
    </div>
  );
};

export default GlobalMenuBar;