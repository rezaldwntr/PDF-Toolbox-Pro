import React, { useState, useEffect } from 'react';
import { View } from './types';
import Header from './components/Header';
import Footer from './components/Footer';

// Hub & Catalogs
import LandingPage from './components/LandingPage';
import ToolsPage from './components/pages/ToolsPage';
import ProfilePage from './components/pages/ProfilePage';
import PricingPage from './components/pages/PricingPage';

// Spokes (Tools)
import MergePdf from './components/tools/MergePdf';
import SplitPdf from './components/tools/SplitPdf';
import CompressPdf from './components/tools/CompressPdf';
import ConvertPdf from './components/tools/ConvertPdf';
import AddText from './components/tools/AddText';
import AddSignature from './components/tools/AddSignature';
import OrganizePdf from './components/tools/OrganizePdf';
import WatermarkPdf from './components/tools/WatermarkPdf';
import ProtectPdf from './components/tools/ProtectPdf';
import UnlockPdf from './components/tools/UnlockPdf';
import CropPdf from './components/tools/CropPdf';
import PdfToPdfa from './components/tools/PdfToPdfa';
import EditPdf from './components/tools/EditPdf';
import OcrPdf from './components/tools/OcrPdf';
import TranslatePdf from './components/tools/TranslatePdf';

// Admin Dashboard
import { AdminDashboard } from './components/admin/AdminDashboard';

// Informational Pages
import AboutUs from './components/pages/AboutUs';
import Blog from './components/pages/Blog';
import Contact from './components/pages/Contact';
import Faq from './components/pages/Faq';
import PrivacyPolicy from './components/pages/PrivacyPolicy';
import TermsOfService from './components/pages/TermsOfService';

// Modals
import PaywallModal from './components/modals/PaywallModal';
import PricingModal from './components/modals/PricingModal';
import CheckoutModal from './components/modals/CheckoutModal';
import UpgradeCelebrationModal from './components/modals/UpgradeCelebrationModal';

// Providers & Telemetry
import { ToastProvider } from './contexts/ToastContext';
import { QuotaProvider, useQuota } from './contexts/QuotaContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useOnlinePresence } from './lib/presence';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const VIEW_TO_TOOL_NAME: Partial<Record<View, string>> = {
  [View.MERGE]: 'Merge PDF',
  [View.SPLIT]: 'Split PDF',
  [View.COMPRESS]: 'Compress PDF',
  [View.PDF_TO_WORD]: 'PDF to Word',
  [View.PDF_TO_EXCEL]: 'PDF to Excel',
  [View.PDF_TO_PPT]: 'PDF to PPT',
  [View.PDF_TO_IMAGE]: 'PDF to Image',
  [View.ADD_TEXT]: 'Add Text',
  [View.ADD_SIGNATURE]: 'Sign PDF',
  [View.ORGANIZE]: 'Organize PDF',
  [View.WATERMARK]: 'Watermark PDF',
  [View.PROTECT_PDF]: 'Protect PDF',
  [View.UNLOCK_PDF]: 'Unlock PDF',
  [View.CROP_PDF]: 'Crop PDF',
  [View.PDF_A]: 'PDF/A Converter',
  [View.EDIT_PDF]: 'Edit PDF',
  [View.OCR_PDF]: 'OCR PDF',
  [View.TRANSLATE_PDF]: 'Translate PDF',
};

function AppContent() {
  const [currentView, setCurrentView] = useState<View>(View.HOME_TAB);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const { user, userTier } = useAuth();
  const { setActiveTool } = useQuota();
  const presence = useOnlinePresence(user, userTier);

  // Trigger celebration modal when user tier was upgraded
  useEffect(() => {
    if (user && user.tier && user.tier !== 'free') {
      const seenTier = localStorage.getItem(`seen_tier_upgrade_${user.id}`);
      if (seenTier !== user.tier && user.lastNotifiedTier !== user.tier) {
        setShowUpgradeModal(true);
      }
    }
  }, [user?.id, user?.tier, user?.lastNotifiedTier]);

  // Hash route support (#admin)
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin') {
        setCurrentView(View.ADMIN_DASHBOARD);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Sync hash with currentView
  useEffect(() => {
    if (currentView === View.ADMIN_DASHBOARD) {
      if (window.location.hash !== '#admin') {
        window.location.hash = 'admin';
      }
    } else if (window.location.hash === '#admin') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [currentView]);

  // Sync activeTool in QuotaContext
  useEffect(() => {
    const toolName = VIEW_TO_TOOL_NAME[currentView];
    if (toolName) {
      setActiveTool(toolName);
    }
  }, [currentView, setActiveTool]);

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
        return <ProfilePage onSelectView={setCurrentView} />;
      case View.PRICING:
        return <PricingPage onSelectView={setCurrentView} />;

      // Admin Dashboard
      case View.ADMIN_DASHBOARD:
        return <AdminDashboard onBack={handleBackToHome} presence={presence} />;

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
      case View.WATERMARK:
        return <WatermarkPdf onBack={handleBackToHome} />;
      case View.PROTECT_PDF:
        return <ProtectPdf onBack={handleBackToHome} />;
      case View.UNLOCK_PDF:
        return <UnlockPdf onBack={handleBackToHome} />;
      case View.CROP_PDF:
        return <CropPdf onBack={handleBackToHome} />;
      case View.PDF_A:
        return <PdfToPdfa onBack={handleBackToHome} />;
      case View.EDIT_PDF:
        return <EditPdf onBack={handleBackToHome} />;
      case View.OCR_PDF:
        return <OcrPdf onBack={handleBackToHome} />;
      case View.TRANSLATE_PDF:
        return <TranslatePdf onBack={handleBackToHome} />;

      // Informational Pages
      case View.ABOUT:
        return <AboutUs onBack={handleBackToHome} onSelectView={setCurrentView} />;
      case View.BLOG:
        return <Blog onBack={handleBackToHome} />;
      case View.CONTACT:
        return <Contact onBack={handleBackToHome} />;
      case View.FAQ:
        return <Faq onBack={handleBackToHome} onSelectView={setCurrentView} />;
      case View.PRIVACY:
        return <PrivacyPolicy onBack={handleBackToHome} />;
      case View.TERMS:
        return <TermsOfService onBack={handleBackToHome} onSelectView={setCurrentView} />;

      default:
        return <LandingPage onSelectView={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0F1218] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Top Sticky Header with Brand, Navigation & Auth */}
      <Header currentView={currentView} onSelectView={setCurrentView} />

      {/* Main Hub & Spoke Content */}
      <main className="flex-1 w-full">
        {renderContent()}
      </main>

      {/* Footer with Security & Trust Badges */}
      <Footer onSelectView={setCurrentView} />

      {/* Global Modals (rendered at root level for z-index isolation) */}
      <PaywallModal />
      <PricingModal onSelectView={setCurrentView} />
      <CheckoutModal onSelectView={setCurrentView} />
      {showUpgradeModal && user && (
        <UpgradeCelebrationModal
          user={user}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      {/* Vercel Telemetry */}
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <QuotaProvider>
            <AppContent />
          </QuotaProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
