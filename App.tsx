
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
  const [showDevModal, setShowDevModal] = useState(true);

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
      <div className="bg-gray-50 dark:bg-slate-900 min-h-screen text-gray-900 dark:text-white antialiased flex flex-col relative transition-colors duration-300">
        <Header onGoHome={() => navigateTo(View.HOME_TAB)} onNavigate={navigateTo} />
        <main className="container mx-auto px-4 py-8 flex-grow max-w-5xl">
          {renderActiveView()}
        </main>
        {!isToolOrPageActive && <BottomNav activeTab={activeView} onTabChange={navigateTo} />}
        {!isToolOrPageActive && (
          <footer className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-slate-800 mb-16 md:mb-0 bg-white dark:bg-slate-900">
               <nav className="flex justify-center gap-8 flex-wrap mb-6 font-bold uppercase tracking-tighter">
                <button onClick={() => navigateTo(View.ABOUT)} className="hover:text-red-600 transition-colors">Tentang</button>
                <button onClick={() => navigateTo(View.PRIVACY)} className="hover:text-red-600 transition-colors">Privasi</button>
                <button onClick={() => navigateTo(View.CONTACT)} className="hover:text-red-600 transition-colors">Kontak</button>
                <button onClick={() => navigateTo(View.FAQ)} className="hover:text-red-600 transition-colors">FAQ</button>
                <button onClick={() => navigateTo(View.BLOG)} className="hover:text-red-600 transition-colors">Blog</button>
              </nav>
              <p className="px-4 mb-2">Seluruh pemrosesan file dilakukan pada server backend yang aman dengan enkripsi SSL.</p>
              <p className="font-bold text-gray-400">© 2024 PDF Toolbox Pro</p>
          </footer>
        )}
        
        {showDevModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-8 border border-gray-200 dark:border-slate-700">
                <div className="flex flex-col items-center text-center">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-2xl mb-4">
                        <WrenchIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tighter uppercase">Beta Access</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-8 leading-relaxed">
                        Selamat datang di <strong>PDF Toolbox Pro</strong>. Platform ini menggunakan pemrosesan server penuh. Mohon maklumi jika terjadi keterlambatan pada file yang sangat besar.
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
