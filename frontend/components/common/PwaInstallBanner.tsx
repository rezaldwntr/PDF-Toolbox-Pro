// frontend/components/common/PwaInstallBanner.tsx
import React, { useState } from 'react';
import { Download, X, Laptop } from 'lucide-react';
import { usePwa } from '../../lib/pwa';

/**
 * Subtle Bottom PWA Install Banner
 * Sesuai UI-UX Design Specification & Design Bible Section 10.2:
 * Banner melayang minimalis di bagian bawah layar yang muncul saat aplikasi dibuka via browser,
 * memberikan opsi 1-klik "Pasang PDF Toolbox Pro sebagai Aplikasi Desktop/Mobile".
 */
const PwaInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, promptInstall } = usePwa();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ptpro_pwa_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  if (!isInstallable || isInstalled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('ptpro_pwa_banner_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  return (
    <aside
      aria-label="Pemberitahuan Pemasangan Aplikasi"
      className="fixed bottom-5 left-5 z-[9990] max-w-sm w-[calc(100vw-2.5rem)] animate-fade-in"
    >
      <div className="bg-surface border border-border-strong rounded-xl p-3.5 shadow-xl flex items-center justify-between gap-3 text-text-primary">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0 border border-accent-primary/20">
            <Laptop size={18} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold truncate">Aplikasi Desktop & Mobile</h4>
            <p className="text-[11px] text-text-secondary truncate">
              Pasang PDF Toolbox Pro untuk akses luring instan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={promptInstall}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-accent-primary hover:bg-accent-hover text-white transition-all duration-200 active:scale-95 shadow-xs cursor-pointer"
          >
            <Download size={13} className="stroke-[2.5]" />
            <span>Pasang</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup banner instalasi"
            className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default PwaInstallBanner;
