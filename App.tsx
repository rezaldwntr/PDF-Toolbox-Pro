import React, { useState } from 'react';
import { View } from './types';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import MergePdf from './components/tools/MergePdf';
import SplitPdf from './components/tools/SplitPdf';
import CompressPdf from './components/tools/CompressPdf';
import AddText from './components/tools/AddText';
import AddSignature from './components/tools/AddSignature';
import OrganizePdf from './components/tools/OrganizePdf';
import { ToastProvider } from './contexts/ToastContext';
import Blog from './components/pages/Blog';
import Faq from './components/pages/Faq';
import PrivacyPolicy from './components/pages/PrivacyPolicy';
import AboutUs from './components/pages/AboutUs';
import Contact from './components/pages/Contact';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

function App() {
  const [activeView, setActiveView] = useState<View>(View.LANDING);

  const renderActiveView = () => {
    const backToLanding = () => setActiveView(View.LANDING);

    switch (activeView) {
      case View.MERGE:
        return <MergePdf onBack={backToLanding} />;
      case View.SPLIT:
        return <SplitPdf onBack={backToLanding} />;
      case View.COMPRESS:
        return <CompressPdf onBack={backToLanding} />;
      case View.ADD_TEXT:
        return <AddText onBack={backToLanding} />;
      case View.ADD_SIGNATURE:
        return <AddSignature onBack={backToLanding} />;
      case View.ORGANIZE:
        return <OrganizePdf onBack={backToLanding} />;
      case View.BLOG:
        return <Blog onBack={backToLanding} />;
      case View.FAQ:
        return <Faq onBack={backToLanding} />;
      case View.PRIVACY:
        return <PrivacyPolicy onBack={backToLanding} />;
      case View.ABOUT:
        return <AboutUs onBack={backToLanding} />;
      case View.CONTACT:
        return <Contact onBack={backToLanding} />;
      case View.LANDING:
      default:
        return <LandingPage onSelectView={setActiveView} />;
    }
  };

  return (
    <ToastProvider>
      <div className="bg-slate-900 min-h-screen text-white antialiased flex flex-col">
        <Header onGoHome={() => setActiveView(View.LANDING)} onNavigate={setActiveView} />
        <main className="container mx-auto px-4 py-8 md:py-12 flex-grow">
          {renderActiveView()}
        </main>
        <footer className="text-center py-6 text-slate-500 text-sm border-t border-slate-800">
           <nav className="flex justify-center items-center gap-x-6 gap-y-2 flex-wrap mb-4">
            <button onClick={() => setActiveView(View.ABOUT)} className="font-medium text-slate-400 hover:text-blue-400 transition-colors">Tentang Kami</button>
            <button onClick={() => setActiveView(View.PRIVACY)} className="font-medium text-slate-400 hover:text-blue-400 transition-colors">Kebijakan Privasi</button>
            <button onClick={() => setActiveView(View.CONTACT)} className="font-medium text-slate-400 hover:text-blue-400 transition-colors">Kontak</button>
            <button onClick={() => setActiveView(View.FAQ)} className="font-medium text-slate-400 hover:text-blue-400 transition-colors">FAQ</button>
            <button onClick={() => setActiveView(View.BLOG)} className="font-medium text-slate-400 hover:text-blue-400 transition-colors">Blog</button>
          </nav>
          <div className="flex justify-center items-center gap-4 mb-2">
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-slate-400">
              Privasi Anda terjamin. Semua file diproses langsung di perangkat Anda.
            </p>
          </div>
          <p>
              Created By{' '}
              <a
                href="https://instagram.com/rezaldwntr"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-400 hover:text-blue-400 transition-colors"
              >
                @rezaldwntr
              </a>
            </p>
        </footer>
        <Analytics />
        <SpeedInsights />
      </div>
    </ToastProvider>
  );
}

export default App;