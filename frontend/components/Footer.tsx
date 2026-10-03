import React from 'react';
import { View } from '../types';
import { ShieldCheck, Lock, Cpu, Activity, ExternalLink } from 'lucide-react';

interface FooterProps {
  onSelectView: (view: View) => void;
}

const Footer: React.FC<FooterProps> = ({ onSelectView }) => {
  return (
    <footer className="bg-surface border-t border-border-subtle mt-20 pt-12 pb-8 text-text-secondary transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Security & Compliance Badges Banner (Design Bible Section 2.2) */}
        <div className="bg-elevated border border-border-subtle rounded-xl p-5 mb-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0 border border-accent-primary/20">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">Kepatuhan UU PDP No. 27/2022</h4>
              <p className="text-[11px] text-text-secondary mt-0.5">Penghapusan biner permanen & perlindungan data pribadi penuh.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Lock size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">TLS 1.3 Encrypted & Auto-Wipe 60m</h4>
              <p className="text-[11px] text-text-secondary mt-0.5">Enkripsi bank-grade, berkas server dihapus otomatis dalam 60 menit.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
              <Cpu size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">Zero-Log Guarantee (Pemrosesan RAM Lokal)</h4>
              <p className="text-[11px] text-text-secondary mt-0.5">Grup A diproses 100% di memori browser tanpa meninggalkan jejak server.</p>
            </div>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10 pb-8 border-b border-border-subtle text-xs">
          <div>
            <div className="flex items-center gap-2 mb-3 select-none">
              <div className="w-6 h-6 rounded-md bg-accent-primary text-white flex items-center justify-center font-bold text-xs">
                P
              </div>
              <span className="font-bold text-text-primary text-sm tracking-tight">PDF Toolbox Pro</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed mb-3">
              Platform manipulasi dokumen PDF Utility-Taktil Modern tercepat di Indonesia. Dirancang untuk kejelasan, efisiensi eksekusi, dan privasi tanpa kompromi.
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                🇮🇩 Server Indonesia (Jakarta)
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3">Alat Populer</h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <button onClick={() => onSelectView(View.MERGE)} className="hover:text-accent-primary transition-colors cursor-pointer">
                  Gabungkan PDF
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.COMPRESS)} className="hover:text-accent-primary transition-colors cursor-pointer">
                  Kompres PDF (Preset CPNS/BKN)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.SPLIT)} className="hover:text-accent-primary transition-colors cursor-pointer">
                  Pisahkan PDF
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.PDF_TO_WORD)} className="hover:text-accent-primary transition-colors cursor-pointer">
                  PDF ke Word (.docx)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.BANK_STATEMENT)} className="hover:text-accent-primary transition-colors cursor-pointer">
                  Bank Statement Parser (BCA/Mandiri)
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3">Konversi & Keamanan</h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <button onClick={() => onSelectView(View.REDACT_PDF)} className="hover:text-accent-primary transition-colors cursor-pointer">
                  Sensor PII (UU PDP No. 27/2022)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.ADD_SIGNATURE)} className="hover:text-accent-primary transition-colors cursor-pointer">
                  Tanda Tangan & e-Meterai
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.PDF_A)} className="hover:text-accent-primary transition-colors cursor-pointer">
                  Konversi PDF/A (Arsip ISO)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.OCR_PDF)} className="hover:text-accent-primary transition-colors cursor-pointer">
                  OCR Dokumen (Teks Pindaian)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.TRANSLATE_PDF)} className="hover:text-accent-primary transition-colors cursor-pointer">
                  Terjemahkan PDF (Gemini Multimodal)
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3">Developer & Legal</h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <button 
                  onClick={() => onSelectView(View.DEVELOPER_API)} 
                  className="inline-flex items-center gap-1 font-bold text-accent-primary hover:underline transition-colors"
                >
                  <span>B2B Micro-API Hub</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-accent-primary/10 text-accent-primary text-[9px] font-extrabold border border-accent-primary/20">Baru</span>
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.PRIVACY)} className="hover:text-accent-primary transition-colors cursor-pointer">
                  Kebijakan Privasi
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.TERMS)} className="hover:text-accent-primary transition-colors cursor-pointer">
                  Syarat & Ketentuan Layanan
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.FAQ)} className="hover:text-accent-primary transition-colors cursor-pointer">
                  FAQ e-Meterai & Dokumen Resmi
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.CONTACT)} className="hover:text-accent-primary transition-colors cursor-pointer">
                  Hubungi Dukungan
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Global Shell Bottom Bar (Design Bible Section 2.2) */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 text-xs">
          
          {/* Left: Minimalist link tree */}
          <div className="flex flex-wrap items-center gap-3 text-text-secondary text-[11px]">
            <button onClick={() => onSelectView(View.DEVELOPER_API)} className="hover:text-text-primary transition-colors cursor-pointer">
              Dokumentasi API
            </button>
            <span className="text-border-strong">•</span>
            <button onClick={() => onSelectView(View.PRIVACY)} className="hover:text-text-primary transition-colors cursor-pointer">
              Keamanan & Privasi
            </button>
            <span className="text-border-strong">•</span>
            <button onClick={() => onSelectView(View.TERMS)} className="hover:text-text-primary transition-colors cursor-pointer">
              Syarat Layanan
            </button>
            <span className="text-border-strong">•</span>
            <button onClick={() => onSelectView(View.ABOUT)} className="hover:text-text-primary transition-colors cursor-pointer">
              Tentang Kami
            </button>
          </div>

          {/* Center: Security & Compliance Badges */}
          <div className="flex items-center gap-2 text-[10px] font-semibold text-text-secondary">
            <span className="px-2 py-0.5 rounded bg-elevated border border-border-subtle">
              Kepatuhan UU PDP RI
            </span>
            <span className="px-2 py-0.5 rounded bg-elevated border border-border-subtle">
              TLS 1.3 Encrypted
            </span>
            <span className="px-2 py-0.5 rounded bg-elevated border border-border-subtle hidden sm:inline">
              Zero-Log RAM
            </span>
          </div>

          {/* Right: System Latency & Uptime Indicator */}
          <div className="flex items-center gap-2 text-[11px] text-text-secondary font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-text-primary font-medium">All Systems Operational</span>
            <span className="text-border-strong">|</span>
            <span className="text-text-secondary">Latency: 24ms</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
