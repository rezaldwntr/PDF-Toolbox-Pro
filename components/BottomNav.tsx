
import React from 'react';
import { View } from '../types';
import { HomeIcon, GridIcon, UserIcon } from './icons';

interface BottomNavProps {
  activeTab: View;
  onTabChange: (tab: View) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: View.HOME_TAB, label: 'Beranda', icon: <HomeIcon /> },
    { id: View.TOOLS_TAB, label: 'Alat', icon: <GridIcon /> },
    { id: View.PROFILE_TAB, label: 'Profil', icon: <UserIcon /> },
  ];

  return (
    <nav className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
      {/* Container Floating dengan efek Glassmorphism */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl shadow-blue-900/10 flex justify-around items-center p-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.label}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center justify-center w-full py-3 rounded-xl transition-all duration-300 ${
                isActive ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
                 {React.cloneElement(tab.icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' })}
              </div>
              
              {/* Indikator Aktif (Dot kecil) */}
              {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full mb-2"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
