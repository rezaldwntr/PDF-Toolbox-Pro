import React, { useState, useEffect } from 'react';
import { View } from './types';
import Header from './components/Header';
import Footer from './components/Footer';

// Hub & Catalogs
import LandingPage from './components/LandingPage';
import ToolsPage from './components/pages/ToolsPage';
import ProfilePage from './components/pages/ProfilePage';

// Spokes (Tools)
import MergePdf from './components/tools/MergePdf';
import SplitPdf from './components/tools/SplitPdf';
import CompressPdf from './components/tools/CompressPdf';
import ConvertPdf from './components/tools/ConvertPdf';
import AddText from './components/tools/AddText';
import AddSignature from './components/tools/AddSignature';
import OrganizePdf from './components/tools/OrganizePdf';

// Informational Pages
import AboutUs from './components/pages/AboutUs';
import Blog from './components/pages/Blog';
import Contact from './components/pages/Contact';
import Faq from './components/pages/Faq';
import PrivacyPolicy from './components/pages/PrivacyPolicy';

// Providers & Telemetry
import { ToastProvider } from './contexts/ToastContext';
import { QuotaProvider } from './contexts/QuotaContext';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

function App() {
  const [currentView, setCurrentView] = useState<View>(View.HOME_TAB);

  // Scroll to top whenever view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  const handleBackToHome = () => {
    setCurrentView(View.HOME_TAB);
  };

  const renderContent = () => {
    switch (currentView) {
      // Hub (Home)
      case View.HOME_TAB:
        return <LandingPage onSelectView={setCurrentView} />;
      
      // Catalog
      case View.TOOLS_TAB:
        return <ToolsPage onSelectTool={setCurrentView} />;
      case View.PROFILE_TAB:
        return <ProfilePage />;

      // Spokes (Tools)
      case View.MERGE:
        return <MergePdf onBack={handleBackToHome} />;
      case View.SPLIT:
        return <SplitPdf onBack={handleBackToHome} />;
      case View.COMPRESS:
        return <CompressPdf onBack={handleBackToHome} />;
      case View.PDF_TO_WORD:
        return <ConvertPdf mode="word" onBack={handleBackToHome} />;
      case View.PDF_TO_EXCEL:
        return <ConvertPdf mode="excel" onBack={handleBackToHome} />;
      case View.PDF_TO_PPT:
        return <ConvertPdf mode="ppt" onBack={handleBackToHome} />;
      case View.PDF_TO_IMAGE:
        return <ConvertPdf mode="image" onBack={handleBackToHome} />;
      case View.ADD_TEXT:
        return <AddText onBack={handleBackToHome} />;
      case View.ADD_SIGNATURE:
        return <AddSignature onBack={handleBackToHome} />;
      case View.ORGANIZE:
        return <OrganizePdf onBack={handleBackToHome} />;

      // Informational Pages
      case View.ABOUT:
        return <AboutUs onBack={handleBackToHome} />;
      case View.BLOG:
        return <Blog onBack={handleBackToHome} />;
      case View.CONTACT:
        return <Contact onBack={handleBackToHome} />;
      case View.FAQ:
        return <Faq onBack={handleBackToHome} />;
      case View.PRIVACY:
        return <PrivacyPolicy onBack={handleBackToHome} />;

      default:
        return <LandingPage onSelectView={setCurrentView} />;
    }
  };

  return (
    <ToastProvider>
      <QuotaProvider>
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans">
          {/* Top Sticky Header with Brand, Navigation & Quota Tracker */}
          <Header currentView={currentView} onSelectView={setCurrentView} />

          {/* Main Hub & Spoke Content */}
          <main className="flex-1 w-full">
            {renderContent()}
          </main>

          {/* Footer with Security & Trust Badges */}
          <Footer onSelectView={setCurrentView} />

          {/* Vercel Telemetry */}
          <Analytics />
          <SpeedInsights />
        </div>
      </QuotaProvider>
    </ToastProvider>
  );
}

export default App;
