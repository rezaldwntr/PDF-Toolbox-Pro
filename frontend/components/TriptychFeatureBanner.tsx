import React from 'react';
import { View } from '../types';
import { ArrowRight, CheckCircle2, Shield, Landmark, FileSpreadsheet } from 'lucide-react';

interface TriptychFeatureBannerProps {
  onSelectView: (view: View) => void;
}

const TriptychFeatureBanner: React.FC<TriptychFeatureBannerProps> = ({ onSelectView }) => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16">
      {/* Container Banner Utama */}
      <div className="bg-[#9B4819]/5 dark:bg-[#222222] border border-[#9B4819]/15 dark:border-[#3A3A3A] rounded-3xl p-6 sm:p-10 shadow-paper relative overflow-hidden">
        
        {/* Header Seksi Banner */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#9B4819]/10 text-[#9B4819] border border-[#9B4819]/20 text-xs mb-3 font-semibold">
            <span>🏛️</span>
            <span>Standar Berkas Indonesia</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-2.5">
            Dibuat Khusus untuk Kebutuhan Dokumen Resmi di Indonesia
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Dari seleksi portal CPNS BKN, audit keuangan mutasi perbankan, hingga kepatuhan hukum sensor identitas pribadi.
          </p>
        </div>

        {/* The 3 Arched Windows (Triptych Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Kubah 1: Surat CPNS & e-Meterai */}
          <div className="bg-surface border border-border-subtle rounded-t-[40px] rounded-b-2xl p-6 flex flex-col justify-between shadow-2xs hover:shadow-paper-float hover:-translate-y-1 transition-all duration-300 group">
            <div>
              {/* Arch Top Header Visual */}
              <div className="w-12 h-12 rounded-full bg-[#314028]/10 text-[#314028] flex items-center justify-center mb-4 ring-4 ring-[#314028]/10 group-hover:scale-105 transition-transform">
                <CheckCircle2 size={24} className="stroke-[2.2]" />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#314028]/10 text-[#314028]">
                  SSCASN BKN Valid
                </span>
                <span className="text-[10px] text-text-secondary font-mono">&lt; 300 KB</span>
              </div>

              <h3 className="font-serif font-bold text-lg text-text-primary mb-2 group-hover:text-[#9B4819] transition-colors">
                Surat Lamaran & e-Meterai CPNS
              </h3>
              
              <p className="text-xs text-text-secondary leading-relaxed mb-4">
                Kompresi berkas otomatis tepat di bawah limit portal pemerintah tanpa memudarkan cap digital e-Meterai Rp10.000 atau teks lampiran.
              </p>
            </div>

            <button
              onClick={() => onSelectView(View.COMPRESS)}
              className="inline-flex items-center justify-between w-full pt-3 border-t border-border-subtle text-xs font-semibold text-[#9B4819] group-hover:text-[#7E3812] transition-colors cursor-pointer"
            >
              <span>Buka Preset Kompres CPNS</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Kubah 2: Mutasi Rekening Koran BCA / Mandiri */}
          <div className="bg-surface border border-border-subtle rounded-t-[40px] rounded-b-2xl p-6 flex flex-col justify-between shadow-2xs hover:shadow-paper-float hover:-translate-y-1 transition-all duration-300 group">
            <div>
              <div className="w-12 h-12 rounded-full bg-[#9B4819]/10 text-[#9B4819] flex items-center justify-center mb-4 ring-4 ring-[#9B4819]/10 group-hover:scale-105 transition-transform">
                <Landmark size={22} className="stroke-[2.2]" />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#9B4819]/10 text-[#9B4819]">
                  Multi-Bank Parser
                </span>
                <span className="text-[10px] text-text-secondary font-mono">BCA • Mandiri • BRI</span>
              </div>

              <h3 className="font-serif font-bold text-lg text-text-primary mb-2 group-hover:text-[#9B4819] transition-colors">
                Mutasi Rekening ke Spreadsheet
              </h3>
              
              <p className="text-xs text-text-secondary leading-relaxed mb-4">
                Ubah PDF rekening koran yang terkunci menjadi tabel Excel berkolom rapi (Tanggal, Keterangan, Mutasi Debit/Kredit, dan Saldo).
              </p>
            </div>

            <button
              onClick={() => onSelectView(View.BANK_STATEMENT)}
              className="inline-flex items-center justify-between w-full pt-3 border-t border-border-subtle text-xs font-semibold text-[#9B4819] group-hover:text-[#7E3812] transition-colors cursor-pointer"
            >
              <span>Ekstrak Rekening Koran</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Kubah 3: Sensor KTP UU PDP No. 27/2022 */}
          <div className="bg-surface border border-border-subtle rounded-t-[40px] rounded-b-2xl p-6 flex flex-col justify-between shadow-2xs hover:shadow-paper-float hover:-translate-y-1 transition-all duration-300 group">
            <div>
              <div className="w-12 h-12 rounded-full bg-[#314028]/10 text-[#314028] flex items-center justify-center mb-4 ring-4 ring-[#314028]/10 group-hover:scale-105 transition-transform">
                <Shield size={22} className="stroke-[2.2]" />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#314028]/10 text-[#314028]">
                  True Binary Redact
                </span>
                <span className="text-[10px] text-text-secondary font-mono">UU PDP 27/2022</span>
              </div>

              <h3 className="font-serif font-bold text-lg text-text-primary mb-2 group-hover:text-[#9B4819] transition-colors">
                Sensor NIK, NPWP & PII Otomatis
              </h3>
              
              <p className="text-xs text-text-secondary leading-relaxed mb-4">
                Bukan sekadar blok visual hitam. Aliran biner teks identitas dimusnahkan secara permanen dari file PDF sebelum dibagikan ke pihak ketiga.
              </p>
            </div>

            <button
              onClick={() => onSelectView(View.REDACT_PDF)}
              className="inline-flex items-center justify-between w-full pt-3 border-t border-border-subtle text-xs font-semibold text-[#9B4819] group-hover:text-[#7E3812] transition-colors cursor-pointer"
            >
              <span>Buka Sensor Privasi (Redact)</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};

export default TriptychFeatureBanner;
