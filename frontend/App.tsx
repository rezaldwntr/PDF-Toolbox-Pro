import React, { useState } from 'react';
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

import { ToastProvider } from './contexts/ToastContext';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

function App() {
  const [openWindows, setOpenWindows] = useState<View[]>([]);
  const [focusedWindow, setFocusedWindow] = useState<View | null>(null);

  const openWindow = (view: View) => {
    if (!openWindows.includes(view)) {
      setOpenWindows([...openWindows, view]);
    }
    setFocusedWindow(view);
  };

  const closeWindow = (view: View) => {
    setOpenWindows(openWindows.filter(v => v !== view));
    if (focusedWindow === view) {
      setFocusedWindow(openWindows.length > 1 ? openWindows[openWindows.length - 2] : null);
    }
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
      <div className="relative w-full h-full overflow-hidden">
        <GlobalMenuBar />
        
        {/* Desktop Area */}
        <div 
            className="absolute inset-0 pt-[28px] pb-[70px] z-10"
            onClick={() => setFocusedWindow(null)} // Click background to unfocus windows
        >
            {/* Desktop Icons could go here */}
            <div className="p-4 grid grid-cols-1 gap-4 w-[100px]">
               {/* Example desktop shortcut */}
               <div 
                 className="flex flex-col items-center gap-1 cursor-pointer group"
                 onDoubleClick={() => openWindow(View.TOOLS_TAB)}
               >
                 <div className="w-16 h-16 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 group-hover:bg-rios-selection transition-colors flex items-center justify-center text-white shadow-lg">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                 </div>
                 <span className="text-white text-[12px] text-shadow drop-shadow-md">Apps</span>
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
                        onClose={closeWindow}
                        onFocus={setFocusedWindow}
                    >
                        {component}
                    </WindowModal>
                );
            })}
        </div>

        <Dock activeWindows={openWindows} focusedWindow={focusedWindow} onOpenWindow={openWindow} />
        
        <Analytics />
        <SpeedInsights />
      </div>
    </ToastProvider>
  );
}

export default App;
