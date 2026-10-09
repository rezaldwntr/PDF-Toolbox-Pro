import React from 'react';
import { View } from '../types';
import { ShieldCheck, Lock, Cpu, ArrowUpRight } from 'lucide-react';

interface FooterProps {
  onSelectView: (view: View) => void;
}

const Footer: React.FC<FooterProps> = ({ onSelectView }) => {
  return (
    <footer className="bg-[#9B4819] text-[#F4F1E8] dark:bg-[#181818] dark:text-[#F2EFE9] border-t border-[#7E3812] dark:border-[#3A3A3A] mt-24 pt-16 pb-12 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Editorial Headline Banner (Radley Style) */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-xs text-white/90 border border-white/20 text-xs mb-4 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#D8C6B7] animate-pulse"></span>
            Standar Privasi Dokumen Indonesia
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl leading-tight font-normal text-white mb-4">
            Selesaikan urusan dokumen Anda dengan{' '}
            <span className="relative inline-block italic font-normal text-[#F4F1E8]">
              tenang, cepat,
              <svg 
                className="absolute -inset-x-2 -bottom-1 w-[calc(100%+16px)] h-3 text-[#D8C6B7]/60 pointer-events-none" 
                viewBox="0 0 120 12" 
                fill="none" 
                preserveAspectRatio="none"
              >
                <path d="M2 9 C 30 2, 90 2, 118 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>{' '}
            dan berwibawa.
          </h2>

          <p className="text-sm text-white/80 max-w-xl mx-auto leading-relaxed">
            Dari berkas seleksi CPNS SSCASN BKN, mutasi rekening bank, hingga sensor otomatis PII sesuai amanat UU PDP No. 27/2022.
          </p>
        </div>

        {/* Security & Compliance Badges Banner */}
        <div className="bg-white/10 dark:bg-white/5 border border-white/15 rounded-2xl p-6 mb-12 grid grid-cols-1 md:grid-cols-3 gap-6 backdrop-blur-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0 border border-white/20">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide">Kepatuhan UU PDP No. 27/2022</h4>
              <p className="text-[11px] text-white/75 mt-1 leading-relaxed">Penghapusan biner permanen dan perlindungan ketat terhadap data pribadi Anda.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0 border border-white/20">
              <Lock size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide">TLS 1.3 Encrypted & Auto-Wipe 60m</h4>
              <p className="text-[11px] text-white/75 mt-1 leading-relaxed">Enkripsi bank-grade. Berkas server dimusnahkan secara terjadwal dalam 60 menit.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0 border border-white/20">
              <Cpu size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide">Zero-Log Guarantee (RAM Lokal)</h4>
              <p className="text-[11px] text-white/75 mt-1 leading-relaxed">Alat sisi klien diproses 100% di memori browser tanpa meninggalkan jejak server.</p>
            </div>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 pb-8 border-b border-white/15 text-xs">
          <div>
            <div className="flex items-center gap-2.5 mb-3 select-none">
              <div className="w-7 h-7 rounded-full bg-white text-[#9B4819] flex items-center justify-center font-serif italic font-bold text-xs shadow-xs">
                PT
              </div>
              <span className="font-serif font-bold text-white text-base tracking-tight">PDF Toolbox Pro</span>
            </div>
            <p className="text-[11px] text-white/75 leading-relaxed mb-4">
              Platform manipulasi dokumen PDF Utility-Taktil Modern terlengkap di Indonesia. Dirancang untuk kejelasan, efisiensi eksekusi, dan privasi tanpa kompromi.
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white border border-white/20">
                🇮🇩 Server Indonesia (Jakarta)
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Alat Populer</h4>
            <ul className="space-y-2.5 text-[11px]">
              <li>
                <button onClick={() => onSelectView(View.MERGE)} className="text-white/80 hover:text-white transition-colors cursor-pointer text-left">
                  Gabungkan PDF
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.COMPRESS)} className="text-white/80 hover:text-white transition-colors cursor-pointer text-left">
                  Kompres PDF (Preset CPNS/BKN)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.SPLIT)} className="text-white/80 hover:text-white transition-colors cursor-pointer text-left">
                  Pisahkan PDF
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.PDF_TO_WORD)} className="text-white/80 hover:text-white transition-colors cursor-pointer text-left">
                  PDF ke Word (.docx)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.BANK_STATEMENT)} className="text-white/80 hover:text-white transition-colors cursor-pointer text-left">
                  Bank Statement Parser (BCA/Mandiri)
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Konversi & Keamanan</h4>
            <ul className="space-y-2.5 text-[11px]">
              <li>
                <button onClick={() => onSelectView(View.REDACT_PDF)} className="text-white/80 hover:text-white transition-colors cursor-pointer text-left">
                  Sensor PII (UU PDP No. 27/2022)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.ADD_SIGNATURE)} className="text-white/80 hover:text-white transition-colors cursor-pointer text-left">
                  Tanda Tangan & e-Meterai
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.PDF_A)} className="text-white/80 hover:text-white transition-colors cursor-pointer text-left">
                  Konversi PDF/A (Arsip ISO)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.OCR_PDF)} className="text-white/80 hover:text-white transition-colors cursor-pointer text-left">
                  OCR Dokumen (Teks Pindaian)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.TRANSLATE_PDF)} className="text-white/80 hover:text-white transition-colors cursor-pointer text-left">
                  Terjemahkan PDF (Gemini Multimodal)
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Developer & Legal</h4>
            <ul className="space-y-2.5 text-[11px]">
              <li>
                <button 
                  onClick={() => onSelectView(View.DEVELOPER_API)} 
                  className="inline-flex items-center gap-1 font-semibold text-white hover:underline transition-colors cursor-pointer"
                >
                  <span>B2B Micro-API Hub</span>
                  <ArrowUpRight size={12} />
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.PRIVACY)} className="text-white/80 hover:text-white transition-colors cursor-pointer text-left">
                  Kebijakan Privasi
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.TERMS)} className="text-white/80 hover:text-white transition-colors cursor-pointer text-left">
                  Syarat & Ketentuan Layanan
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.FAQ)} className="text-white/80 hover:text-white transition-colors cursor-pointer text-left">
                  FAQ e-Meterai & Dokumen Resmi
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.CONTACT)} className="text-white/80 hover:text-white transition-colors cursor-pointer text-left">
                  Hubungi Dukungan
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Global Shell Bottom Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 text-xs">
          
          {/* Left: Minimalist link tree */}
          <div className="flex flex-wrap items-center gap-3 text-white/70 text-[11px]">
            <button onClick={() => onSelectView(View.DEVELOPER_API)} className="hover:text-white transition-colors cursor-pointer">
              Dokumentasi API
            </button>
            <span className="text-white/30">•</span>
            <button onClick={() => onSelectView(View.PRIVACY)} className="hover:text-white transition-colors cursor-pointer">
              Keamanan & Privasi
            </button>
            <span className="text-white/30">•</span>
            <button onClick={() => onSelectView(View.TERMS)} className="hover:text-white transition-colors cursor-pointer">
              Syarat Layanan
            </button>
            <span className="text-white/30">•</span>
            <button onClick={() => onSelectView(View.ABOUT)} className="hover:text-white transition-colors cursor-pointer">
              Tentang Kami
            </button>
          </div>

          {/* Center: Security & Compliance Badges */}
          <div className="flex items-center gap-2 text-[10px] font-medium text-white/80">
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15">
              Kepatuhan UU PDP RI
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15">
              TLS 1.3 Encrypted
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 hidden sm:inline">
              Zero-Log RAM
            </span>
          </div>

          {/* Right: System Latency & Uptime Indicator */}
          <div className="flex items-center gap-2 text-[11px] text-white/80 font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="text-white font-medium">All Systems Operational</span>
            <span className="text-white/30">|</span>
            <span className="text-white/70">Latency: 24ms</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
