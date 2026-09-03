import React from 'react';
import { View } from '../types';
import { HomeIcon, GridIcon, UserIcon, MergeIcon, SplitIcon, CompressIcon } from './icons';

interface DockProps {
  activeWindows: View[];
  focusedWindow: View | null;
  onOpenWindow: (view: View) => void;
}

const Dock: React.FC<DockProps> = ({ activeWindows, focusedWindow, onOpenWindow }) => {
  const dockItems = [
    { id: View.HOME_TAB, label: 'Finder', icon: <HomeIcon className="w-7 h-7 text-black/80" />, color: 'bg-[#cfab78]' },
    { id: View.MERGE, label: 'Merge', icon: <MergeIcon className="w-7 h-7 text-black/80" />, color: 'bg-[#e5ecf6]' },
    { id: View.SPLIT, label: 'Split', icon: <SplitIcon className="w-7 h-7 text-black/80" />, color: 'bg-[#98a897]' },
    { id: View.COMPRESS, label: 'Compress', icon: <CompressIcon className="w-7 h-7 text-black/80" />, color: 'bg-[#d8a868]' },
    { id: View.TOOLS_TAB, label: 'Launchpad', icon: <GridIcon className="w-7 h-7 text-black/80" />, color: 'bg-[#ece9df]' },
    { id: View.PROFILE_TAB, label: 'System Preferences', icon: <UserIcon className="w-7 h-7 text-black/80" />, color: 'bg-[#cba878]' },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-[9000]">
      <div className="bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/10 rounded-[28px] p-[10px] flex items-end gap-3 shadow-2xl h-[76px]">
        {dockItems.map((item) => {
          const isOpen = activeWindows.includes(item.id);
          return (
            <div key={item.id} className="relative group h-full flex flex-col justify-end">
                {/* Tooltip */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[13px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg backdrop-blur-sm tracking-tight border border-white/10">
                    {item.label}
                </div>
                
                {/* Icon */}
                <button
                    onClick={() => onOpenWindow(item.id)}
                    className={`relative w-[52px] h-[52px] rounded-[22.5%] ${item.color} flex items-center justify-center shadow-lg transform origin-bottom transition-all duration-200 hover:w-[64px] hover:h-[64px] hover:-translate-y-1 hover:shadow-xl active:scale-95`}
                >
                    {item.icon}
                </button>
                
                {/* Active Indicator */}
                <div className="h-[4px] mt-1.5 flex justify-center items-center">
                    {isOpen && (
                        <div className="w-[4px] h-[4px] rounded-full bg-white opacity-80 shadow-[0_0_4px_rgba(255,255,255,0.5)]"></div>
                    )}
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dock;