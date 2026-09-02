
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-apple-canvas/80 dark:bg-[#000000]/80 backdrop-blur-xl border-t border-apple-hairline dark:border-[#333333] pb-safe">
      <div className="flex justify-around items-center px-2 py-2 h-[64px]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.label}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${
                isActive ? 'text-apple-primary' : 'text-[#7a7a7a]'
              }`}
            >
              <div className="mb-1">
                 {React.cloneElement(tab.icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' })}
              </div>
              <span className="text-[10px] tracking-micro font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
