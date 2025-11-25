
import React, { useState, useEffect } from 'react';
import { View } from './types';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import ToolsPage from './components/pages/ToolsPage';
import ProfilePage from './components/pages/ProfilePage';
import BottomNav from './components/BottomNav';

// Tools
import MergePdf from './components/tools/MergePdf';
import SplitPdf from './components/tools/SplitPdf';
import CompressPdf from './components/tools/CompressPdf';
import AddText from './components/tools/AddText';
import AddSignature from './components/tools/AddSignature';
import OrganizePdf from './components/tools/OrganizePdf';
import ConvertPdf from './components/tools/ConvertPdf';

// Pages
import { ToastProvider } from './contexts/ToastContext';
import Blog from './components/pages/Blog';
import Faq from './components/pages/Faq';
import PrivacyPolicy from './components/pages/PrivacyPolicy';
import AboutUs from './components/pages/AboutUs';
import Contact from './components/pages/Contact';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

function App() {
  const [activeView, setActiveView] = useState<View>(View.HOME_TAB);
  const [lastActiveTab, setLastActiveTab] = useState<View>(View.HOME_TAB);
  const [showDevModal, setShowDevModal] = useState(false);

  useEffect(() => {
    // Cek apakah user sudah pernah melihat modal ini
    const hasSeenModal = localStorage.getItem('hasSeenDevModal');
    if (!hasSeenModal) {
      setShowDevModal(true);
    }
  }, []);

  const handleCloseDevModal = () => {
    setShowDevModal(false);
    localStorage.setItem('hasSeenDevModal', 'true');
  };

  const handleNavigateToContact = () => {
    handleCloseDevModal();
    setActiveView(View.CONTACT);
  };

  // Logika Navigasi Tab
  const handleTabChange = (tab: View) => {
    setActiveView(tab);
    setLastActiveTab(tab);
  };

  const isToolOrPageActive = activeView > View.PROFILE_TAB;

  const renderActiveView = () => {
    const backToHome = () => setActiveView(View.HOME_TAB);
    const backToLastTab = () => setActiveView(lastActiveTab);

    switch (activeView) {
      // Main Tabs
      case View.HOME_TAB:
        return <LandingPage onSelectView={setActiveView} />;
      case View.TOOLS_TAB:
        return <ToolsPage onSelectTool={setActiveView} />;
      case View.PROFILE_TAB:
        return <ProfilePage />;

      // Tools
      case View.MERGE:
        return <MergePdf onBack={backToLastTab} />;
      case View.SPLIT:
        return <SplitPdf onBack={backToLastTab} />;
      case View.COMPRESS:
        return <CompressPdf onBack={backToLastTab} />;
      case View.CONVERT:
        return <ConvertPdf onBack={backToLastTab} />;
      case View.ADD_TEXT:
        return <AddText onBack={backToLastTab} />;
      case View.ADD_SIGNATURE:
        return <AddSignature onBack={backToLastTab} />;
      case View.ORGANIZE:
        return <OrganizePdf onBack={backToLastTab} />;

      // Static Pages
      case View.BLOG:
        return <Blog onBack={backToHome} />;
      case View.FAQ:
        return <Faq onBack={backToHome} />;
      case View.PRIVACY:
        return <PrivacyPolicy onBack={backToHome} />;
      case View.ABOUT:
        return <AboutUs onBack={backToHome} />;
      case View.CONTACT:
        return <Contact onBack={backToHome} />;
      
      default:
        return <LandingPage onSelectView={setActiveView} />;
    }
  };

  return (
    <ToastProvider>
      <div className="bg-gray-50 dark:bg-slate-900 min-h-screen text-gray-900 dark:text-white antialiased flex flex-col relative transition-colors duration-300">
        <Header 
          onGoHome={() => setActiveView(View.HOME_TAB)} 
          onNavigate={setActiveView} 
        />
        
        <main className="container mx-auto px-4 py-6 md:py-8 flex-grow max-w-4xl">
          {renderActiveView()}
        </main>

        {!isToolOrPageActive && (
          <BottomNav activeTab={activeView} onTabChange={handleTabChange} />
        )}

        {/* Footer */}
        {(isToolOrPageActive || window.innerWidth > 768) && (
          <footer className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-slate-800 mb-16 md:mb-0 bg-white dark:bg-slate-900 transition-colors duration-300">
             <nav className="flex justify-center items-center gap-x-6 gap-y-2 flex-wrap mb-4">
              <button onClick={() => setActiveView(View.ABOUT)} className="font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Tentang Kami</button>
              <button onClick={() => setActiveView(View.PRIVACY)} className="font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Kebijakan Privasi</button>
              <button onClick={() => setActiveView(View.CONTACT)} className="font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Kontak</button>
              <button onClick={() => setActiveView(View.FAQ)} className="font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">FAQ</button>
              <button onClick={() => setActiveView(View.BLOG)} className="font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Blog</button>
            </nav>
            <div className="flex justify-center items-center gap-4 mb-2">
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">
                Privasi Anda terjamin. Semua file diproses langsung di perangkat Anda.
              </p>
            </div>
            <p>
                Created By{' '}
                <a
                  href="https://instagram.com/rezaldwntr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  @rezaldwntr
                </a>
              </p>
          </footer>
        )}
        
        <Analytics />
        <SpeedInsights />

        {/* Development Notification Modal */}
        {showDevModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
               <div className="flex flex-col items-center text-center">
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full mb-4">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-yellow-600 dark:text-yellow-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tahap Pengembangan</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                    Selamat datang di Zentridox! Website ini masih dalam tahap pengembangan (Beta). Anda mungkin menemukan beberapa bug atau fitur yang belum sempurna.
                  </p>
                  
                  <div className="flex flex-col gap-3 w-full">
                    <button 
                      onClick={handleNavigateToContact}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      Laporkan Bug / Beri Saran
                    </button>
                    <button 
                      onClick={handleCloseDevModal}
                      className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
                    >
                      Saya Mengerti, Lanjutkan
                    </button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </ToastProvider>
  );
}

export default App;
