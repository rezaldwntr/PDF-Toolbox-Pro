import React, { useState, useEffect } from 'react';
import { View } from './types';
import GlobalMenuBar from './components/GlobalMenuBar';
import Dock from './components/Dock';
import WindowModal from './components/WindowModal';

// Pages & Tools
import MergePdf from './components/tools/MergePdf';
import SplitPdf from './components/tools/SplitPdf';
import CompressPdf from './components/tools/CompressPdf';
import ConvertPdf from './components/tools/ConvertPdf';
import AddText from './components/tools/AddText';
import AddSignature from './components/tools/AddSignature';
import OrganizePdf from './components/tools/OrganizePdf';

import ToolsPage from './components/pages/ToolsPage';
import ProfilePage from './components/pages/ProfilePage';
import LandingPage from './components/LandingPage';

import { Home, User, Wrench, FolderKanban } from 'lucide-react';
import { ToastProvider } from './contexts/ToastContext';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

function App() {
  const [openWindows, setOpenWindows] = useState<View[]>([]);
  const [focusedWindow, setFocusedWindow] = useState<View | null>(null);
  const [minimizedWindows, setMinimizedWindows] = useState<View[]>([]);

  // Foolproof fix for mobile 100vh bug
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);

  const openWindow = (view: View) => {
    setOpenWindows(prev => prev.includes(view) ? prev : [...prev, view]);
    setMinimizedWindows(prev => prev.filter(v => v !== view));
    setFocusedWindow(view);
  };

  const closeWindow = (view: View) => {
    setOpenWindows(prev => prev.filter(v => v !== view));
    setMinimizedWindows(prev => prev.filter(v => v !== view));
    setFocusedWindow(prev => prev === view ? null : prev);
  };

  const minimizeWindow = (view: View) => {
    setMinimizedWindows(prev => prev.includes(view) ? prev : [...prev, view]);
    setFocusedWindow(prev => prev === view ? null : prev);
  };

  const getWindowContent = (view: View) => {
    const handleBack = () => closeWindow(view);
    
    switch (view) {
      case View.HOME_TAB: return { title: 'Finder', component: <LandingPage onSelectView={openWindow} /> };
      case View.TOOLS_TAB: return { title: 'Launchpad', component: <ToolsPage onSelectTool={openWindow} /> };
      case View.PROFILE_TAB: return { title: 'System Preferences', component: <ProfilePage /> };
      case View.MERGE: return { title: 'Merge PDF', component: <MergePdf onBack={handleBack} /> };
      case View.SPLIT: return { title: 'Split PDF', component: <SplitPdf onBack={handleBack} /> };
      case View.COMPRESS: return { title: 'Compress PDF', component: <CompressPdf onBack={handleBack} /> };
      case View.PDF_TO_WORD: return { title: 'Convert to Word', component: <ConvertPdf mode="word" onBack={handleBack} /> };
      case View.PDF_TO_EXCEL: return { title: 'Convert to Excel', component: <ConvertPdf mode="excel" onBack={handleBack} /> };
      case View.PDF_TO_PPT: return { title: 'Convert to PPT', component: <ConvertPdf mode="ppt" onBack={handleBack} /> };
      case View.PDF_TO_IMAGE: return { title: 'Convert to Image', component: <ConvertPdf mode="image" onBack={handleBack} /> };
      case View.ADD_TEXT: return { title: 'Add Text', component: <AddText onBack={handleBack} /> };
      case View.ADD_SIGNATURE: return { title: 'Sign PDF', component: <AddSignature onBack={handleBack} /> };
      case View.ORGANIZE: return { title: 'Organize PDF', component: <OrganizePdf onBack={handleBack} /> };
      default: return { title: 'App', component: <div className="p-8">Coming Soon</div> };
    }
  };

  return (
    <ToastProvider>
      {/* The background is handled in index.html CSS, this wrapper just isolates z-index */}
      <div 
        className="relative w-full overflow-hidden"
        style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
      >
        <GlobalMenuBar />
        
        {/* Desktop Area */}
        <div 
            className="absolute inset-0 pt-[40px] lg:pt-[28px] pb-[90px] lg:pb-[70px] z-10 flex flex-col lg:flex-row justify-start lg:justify-between p-6 lg:p-8 overflow-y-auto overflow-x-hidden"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    setFocusedWindow(null);
                }
            }}
        >
            {/* --- MOBILE ONLY WIDGETS --- */}
            <div className="flex lg:hidden gap-3 mb-6 w-full pointer-events-none">
                <div className="bg-[#cfab78] rounded-[24px] p-4 flex flex-col pointer-events-auto w-[120px] shadow-lg shrink-0 text-[#1a1a1a]">
                   <span className="text-[9px] font-bold tracking-widest opacity-60 mb-2 uppercase">Today</span>
                   <span className="text-[42px] font-light leading-none tracking-tighter mb-1">7</span>
                   <span className="text-[10px] font-semibold uppercase mt-auto opacity-80">August</span>
                </div>
                <div className="flex-1 bg-[#ece9df] rounded-[24px] p-4 flex flex-col pointer-events-auto shadow-lg text-[#1a1a1a] justify-center relative overflow-hidden">
                   <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center overflow-hidden shrink-0">
                         <User size={14} className="opacity-60" />
                      </div>
                      <div className="flex flex-col">
                         <span className="font-semibold text-[11px] leading-tight">Welcome to PDF/OS</span>
                         <span className="text-[9px] opacity-60 leading-tight">Now</span>
                      </div>
                   </div>
                   <p className="text-[11px] font-medium leading-snug mt-1 opacity-80">A different way to explore PDF tools.</p>
                   <div className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-black/10 flex items-center justify-center">
                     <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                   </div>
                </div>
            </div>

            {/* --- DESKTOP ICONS --- */}
            <div className="flex flex-col w-full lg:w-auto">
               <span className="text-[10px] font-bold text-gray-500 tracking-widest mb-4 lg:hidden uppercase ml-2">Applications</span>
               <div className="grid grid-cols-3 lg:flex lg:flex-col gap-x-4 gap-y-6 lg:gap-6 pointer-events-none w-full lg:w-auto place-items-center lg:place-items-start">
                  {[
                      { id: View.HOME_TAB, label: 'Home', color: 'bg-[#cfab78]', icon: <Home className="w-6 h-6 lg:w-8 lg:h-8 text-[#1a1a1a]" /> },
                      { id: View.ABOUT, label: 'About me', color: 'bg-[#e5ecf6]', icon: <User className="w-6 h-6 lg:w-8 lg:h-8 text-[#1a1a1a]" /> },
                      { id: View.TOOLS_TAB, label: 'Tools', color: 'bg-[#98a897]', icon: <Wrench className="w-6 h-6 lg:w-8 lg:h-8 text-[#1a1a1a]" /> },
                      { id: View.PROFILE_TAB, label: 'Projects', color: 'bg-[#d8a868]', icon: <FolderKanban className="w-6 h-6 lg:w-8 lg:h-8 text-[#1a1a1a]" /> },
                  ].map(item => (
                      <div 
                        key={item.id}
                        className="flex flex-col items-center gap-2 cursor-pointer group pointer-events-auto"
                        onClick={(e) => { e.stopPropagation(); openWindow(item.id); }}
                      >
                        <div className={`w-[60px] h-[60px] lg:w-[72px] lg:h-[72px] ${item.color} rounded-[24px] flex items-center justify-center shadow-lg group-hover:brightness-110 transition-all`}>
                           {item.icon}
                        </div>
                        <span className="text-white text-[11px] lg:text-[13px] text-shadow drop-shadow-md font-medium tracking-tight text-center leading-tight">{item.label}</span>
                      </div>
                  ))}
               </div>
            </div>

            {/* Right Sidebar: Widgets */}
            <div className="hidden lg:flex flex-col gap-4 w-[320px] pointer-events-none">
                {/* Widget 1 */}
                <div className="bg-[#f5f0eb]/90 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-white/20 pointer-events-auto text-[#1a1a1a]">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[11px] font-bold text-gray-500 tracking-wider">LATEST TOOLS</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex gap-3 items-start cursor-pointer group" onClick={() => openWindow(View.MERGE)}>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg shrink-0 group-hover:bg-blue-200 transition-colors"></div>
                            <div>
                                <h4 className="text-[13px] font-semibold">Merge PDFs Instantly</h4>
                                <p className="text-[11px] text-gray-500 mt-0.5">Combine multiple files into one.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Widget 2 */}
                <div className="bg-[#f5f0eb]/90 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-white/20 pointer-events-auto text-[#1a1a1a]">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[11px] font-bold text-gray-500 tracking-wider">PDF/OS TIPS</span>
                    </div>
                    <div className="bg-black/5 rounded-lg p-2 flex items-center gap-2 text-[13px] text-gray-600 mb-3 cursor-text">
                        <span className="opacity-50">🔍</span> Search for tools
                    </div>
                    <p className="text-[12px] text-gray-500 leading-relaxed mb-2">Use the system dock to jump straight to any section.</p>
                    <button className="text-blue-600 text-[12px] font-medium hover:underline">Open search &rarr;</button>
                </div>
            </div>

            {/* Window Manager */}
            {openWindows.map(view => {
                const { title, component } = getWindowContent(view);
                return (
                    <WindowModal
                        key={view}
                        id={view}
                        title={title}
                        isFocused={focusedWindow === view}
                        isMinimized={minimizedWindows.includes(view)}
                        onClose={closeWindow}
                        onFocus={setFocusedWindow}
                        onMinimize={minimizeWindow}
                    >
                        {component}
                    </WindowModal>
                );
            })}
        </div>
        <Dock activeWindows={openWindows} focusedWindow={focusedWindow} onOpenWindow={openWindow} />
      </div>

      <Analytics />
      <SpeedInsights />
    </ToastProvider>
  );
}

export default App;
