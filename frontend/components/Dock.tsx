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
    { id: View.HOME_TAB, label: 'Finder', icon: <HomeIcon className="w-6 h-6 text-rios-primary" />, color: 'bg-[#f0f0f5]' },
    { id: View.MERGE, label: 'Merge', icon: <MergeIcon className="w-6 h-6 text-white" />, color: 'bg-blue-500' },
    { id: View.SPLIT, label: 'Split', icon: <SplitIcon className="w-6 h-6 text-white" />, color: 'bg-purple-500' },
    { id: View.COMPRESS, label: 'Compress', icon: <CompressIcon className="w-6 h-6 text-white" />, color: 'bg-green-500' },
    { id: View.TOOLS_TAB, label: 'Launchpad', icon: <GridIcon className="w-6 h-6 text-white" />, color: 'bg-gray-800' },
    { id: View.PROFILE_TAB, label: 'System Preferences', icon: <UserIcon className="w-6 h-6 text-white" />, color: 'bg-gray-400' },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-[9000] pointer-events-none">
      <div className="pointer-events-auto bg-rios-dockLight dark:bg-rios-dockDark backdrop-blur-xl border border-rios-borderGlass dark:border-rios-borderGlassDark rounded-[20px] p-2 flex items-end gap-2 shadow-2xl h-[70px]">
        {dockItems.map((item) => {
          const isOpen = activeWindows.includes(item.id);
          return (
            <div key={item.id} className="relative group h-full flex flex-col justify-end">
                {/* Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[12px] px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg backdrop-blur-sm">
                    {item.label}
                </div>
                
                {/* Icon */}
                <button
                    onClick={() => onOpenWindow(item.id)}
                    className={`relative w-[48px] h-[48px] rounded-[11px] ${item.color} flex items-center justify-center shadow-md transform origin-bottom transition-all duration-200 hover:w-[60px] hover:h-[60px] hover:-translate-y-2`}
                >
                    {item.icon}
                </button>
                
                {/* Active Indicator */}
                <div className="h-[4px] mt-1 flex justify-center items-center">
                    {isOpen && (
                        <div className="w-[4px] h-[4px] rounded-full bg-black dark:bg-white opacity-50"></div>
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