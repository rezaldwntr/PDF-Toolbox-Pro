
import React, { useState, useEffect } from 'react';
import { View } from './types';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import ToolsPage from './components/pages/ToolsPage';
import ProfilePage from './components/pages/ProfilePage';
import BottomNav from './components/BottomNav';

import MergePdf from './components/tools/MergePdf';
import SplitPdf from './components/tools/SplitPdf';
import CompressPdf from './components/tools/CompressPdf';
import AddText from './components/tools/AddText';
import AddSignature from './components/tools/AddSignature';
import OrganizePdf from './components/tools/OrganizePdf';
import ConvertPdf from './components/tools/ConvertPdf';

import { ToastProvider } from './contexts/ToastContext';
import Blog from './components/pages/Blog';
import Faq from './components/pages/Faq';
import PrivacyPolicy from './components/pages/PrivacyPolicy';
import AboutUs from './components/pages/AboutUs';
import Contact from './components/pages/Contact';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { WrenchIcon } from './components/icons';

function App() {
  const [activeView, setActiveView] = useState<View>(View.HOME_TAB);
  const [showDevModal, setShowDevModal] = useState(false); // Default false for production feel

  useEffect(() => {
    window.history.replaceState({ view: View.HOME_TAB }, '');
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && typeof event.state.view === 'number') {
        setActiveView(event.state.view);
      } else {
        setActiveView(View.HOME_TAB);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newView: View) => {
    if (newView === activeView) return;
    window.history.pushState({ view: newView }, '');
    setActiveView(newView);
  };

  const renderActiveView = () => {
    const backToTools = () => navigateTo(View.TOOLS_TAB);
    const backToHome = () => navigateTo(View.HOME_TAB);

    switch (activeView) {
      case View.HOME_TAB: return <LandingPage onSelectView={navigateTo} />;
      case View.TOOLS_TAB: return <ToolsPage onSelectTool={navigateTo} />;
      case View.PROFILE_TAB: return <ProfilePage />;
      case View.MERGE: return <MergePdf onBack={backToTools} />;
      case View.SPLIT: return <SplitPdf onBack={backToTools} />;
      case View.COMPRESS: return <CompressPdf onBack={backToTools} />;
      case View.PDF_TO_WORD: return <ConvertPdf mode="word" onBack={backToTools} />;
      case View.PDF_TO_EXCEL: return <ConvertPdf mode="excel" onBack={backToTools} />;
      case View.PDF_TO_PPT: return <ConvertPdf mode="ppt" onBack={backToTools} />;
      case View.PDF_TO_IMAGE: return <ConvertPdf mode="image" onBack={backToTools} />;
      case View.ADD_TEXT: return <AddText onBack={backToTools} />;
      case View.ADD_SIGNATURE: return <AddSignature onBack={backToTools} />;
      case View.ORGANIZE: return <OrganizePdf onBack={backToTools} />;
      case View.BLOG: return <Blog onBack={backToHome} />;
      case View.FAQ: return <Faq onBack={backToHome} />;
      case View.PRIVACY: return <PrivacyPolicy onBack={backToHome} />;
      case View.ABOUT: return <AboutUs onBack={backToHome} />;
      case View.CONTACT: return <Contact onBack={backToHome} />;
      default: return <LandingPage onSelectView={navigateTo} />;
    }
  };

  const isToolOrPageActive = activeView > View.PROFILE_TAB;

  return (
    <ToastProvider>
      <div className="bg-[#F3F4F6] dark:bg-[#0f172a] min-h-screen text-gray-900 dark:text-white antialiased flex flex-col relative transition-colors duration-300 font-sans">
        <Header onGoHome={() => navigateTo(View.HOME_TAB)} onNavigate={navigateTo} />
        
        {/* Main Content Area */}
        <main className="flex-grow w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {renderActiveView()}
        </main>

        {!isToolOrPageActive && <BottomNav activeTab={activeView} onTabChange={navigateTo} />}
        
        {showDevModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-8 border border-gray-200 dark:border-slate-700">
                <div className="flex flex-col items-center text-center">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-2xl mb-4">
                        <WrenchIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tighter uppercase">Beta Access</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-8 leading-relaxed">
                        Selamat datang di <strong>PDF Toolbox Pro</strong>. Platform ini menggunakan pemrosesan server penuh.
                    </p>
                    <button 
                        onClick={() => setShowDevModal(false)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg shadow-red-500/20"
                    >
                        Mulai Sekarang
                    </button>
                </div>
            </div>
          </div>
        )}
        <Analytics />
        <SpeedInsights />
      </div>
    </ToastProvider>
  );
}

export default App;
