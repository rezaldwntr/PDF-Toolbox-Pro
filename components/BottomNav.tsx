
import React from 'react';
import { View } from '../types';
import { HomeIcon, GridIcon, UserIcon } from './icons';

interface BottomNavProps {
  activeTab: View;
  onTabChange: (tab: View) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: View.HOME_TAB, label: 'Beranda', icon: <HomeIcon className="w-6 h-6" /> },
    { id: View.TOOLS_TAB, label: 'Alat', icon: <GridIcon className="w-6 h-6" /> },
    { id: View.PROFILE_TAB, label: 'Profil', icon: <UserIcon className="w-6 h-6" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 pb-safe z-50 md:hidden transition-colors duration-300">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.label}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                {tab.icon}
              </div>
              <span className="text-[10px] font-medium mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
