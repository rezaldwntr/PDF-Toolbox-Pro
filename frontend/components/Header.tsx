import React from 'react';
import { View } from '../types';
import { useQuota } from '../contexts/QuotaContext';
import { Zap, ShieldCheck, X } from 'lucide-react';

interface HeaderProps {
  currentView: View;
  onSelectView: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onSelectView }) => {
  const { quota, maxQuota, showLimitModal, setShowLimitModal } = useQuota();

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div 
            onClick={() => onSelectView(View.HOME_TAB)} 
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/30 group-hover:bg-blue-700 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M9 15h6"/>
                <path d="M9 11h6"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-slate-900 tracking-tight">PDF Toolbox</span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Pro</span>
              </div>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onSelectView(View.HOME_TAB)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === View.HOME_TAB
                  ? 'text-blue-600 bg-blue-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Beranda
            </button>
            <button
              onClick={() => onSelectView(View.TOOLS_TAB)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === View.TOOLS_TAB
                  ? 'text-blue-600 bg-blue-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Semua Alat
            </button>
            <button
              onClick={() => onSelectView(View.ABOUT)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === View.ABOUT
                  ? 'text-blue-600 bg-blue-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Tentang
            </button>
          </nav>

          {/* Right Actions: Quota Tracker & Login Prompt */}
          <div className="flex items-center gap-3">
            {/* Transparent Guest Quota Badge */}
            <div 
              onClick={() => quota === 0 && setShowLimitModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                quota >= 2 
                  ? 'bg-blue-50/80 text-blue-700 border-blue-200/80 hover:bg-blue-100' 
                  : quota === 1
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 animate-pulse'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
              title="Kuota konversi gratis harian untuk pengguna tamu"
            >
              <Zap size={14} className={quota === 1 ? 'fill-amber-500 text-amber-500' : quota === 0 ? 'text-rose-500' : 'text-blue-600'} />
              <span>
                {quota > 1 
                  ? `⚡ ${quota}/${maxQuota} Kuota Hari Ini` 
                  : quota === 1 
                  ? `⚡ 1/${maxQuota} Kuota Tersisa` 
                  : `⚡ Kuota Habis (0/${maxQuota})`}
              </span>
            </div>

            <button
              onClick={() => setShowLimitModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all active:scale-95"
            >
              Masuk
            </button>
          </div>
        </div>
      </header>

      {/* Quota Limit Modal (Section 4.3) */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setShowLimitModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Zap size={24} className="fill-amber-500" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {quota === 0 
                ? "Batas 3 konversi gratis tercapai hari ini" 
                : "Akses Tanpa Batas dengan Akun"}
            </h3>

            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Pengguna tamu dibatasi hingga 3 kali konversi per hari. Masuk untuk menikmati konversi tanpa batas, batas ukuran berkas hingga 100 MB, dan unduhan berkecepatan tinggi.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  alert("Fitur login Google akan segera diaktifkan!");
                  setShowLimitModal(false);
                }}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-semibold text-sm text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Masuk dengan Google
              </button>

              <button
                onClick={() => setShowLimitModal(false)}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Nanti saja
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Privasi berkas terjamin & dihapus otomatis 60 menit</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
