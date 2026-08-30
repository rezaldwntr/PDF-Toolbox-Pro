import React, { useState } from 'react';
import { Tool } from './types';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import MergePdf from './components/tools/MergePdf';
import SplitPdf from './components/tools/SplitPdf';
import CompressPdf from './components/tools/CompressPdf';
import AddText from './components/tools/AddText';
import AddSignature from './components/tools/AddSignature';
import OrganizePdf from './components/tools/OrganizePdf';
// Fix: Remove unused import of ToastContainer
import { ToastProvider } from './contexts/ToastContext';

function App() {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.LANDING);

  const renderActiveTool = () => {
    const backToLanding = () => setActiveTool(Tool.LANDING);

    switch (activeTool) {
      case Tool.MERGE:
        return <MergePdf onBack={backToLanding} />;
      case Tool.SPLIT:
        return <SplitPdf onBack={backToLanding} />;
      case Tool.COMPRESS:
        return <CompressPdf onBack={backToLanding} />;
      case Tool.ADD_TEXT:
        return <AddText onBack={backToLanding} />;
      case Tool.ADD_SIGNATURE:
        return <AddSignature onBack={backToLanding} />;
      case Tool.ORGANIZE:
        return <OrganizePdf onBack={backToLanding} />;
      case Tool.LANDING:
      default:
        return <LandingPage onSelectTool={setActiveTool} />;
    }
  };

  return (
    <ToastProvider>
      <div className="bg-slate-900 min-h-screen text-white antialiased">
        <Header />
        <main className="container mx-auto px-4 py-8 md:py-12">
          {renderActiveTool()}
        </main>
        <footer className="text-center py-6 text-slate-500 text-sm">
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
        {/* Fix: Removed redundant ToastContainer as ToastProvider already renders it. */}
      </div>
    </ToastProvider>
  );
}

export default App;
