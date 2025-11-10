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
    <div className="bg-slate-900 min-h-screen text-white antialiased">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        {renderActiveTool()}
      </main>
       <footer className="text-center py-6 text-slate-500 text-sm">
        <p>
            Dibuat dengan ❤️ oleh{' '}
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
    </div>
  );
}

export default App;
