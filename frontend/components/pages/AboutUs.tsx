import React from 'react';
import ToolContainer from '../common/ToolContainer';
import { View } from '../../types';
import { Zap, ShieldCheck, Heart, Sparkles, Award, Users, CheckCircle2, ArrowRight } from 'lucide-react';

interface AboutUsProps {
  onBack: () => void;
  onSelectView?: (view: View) => void;
}

const AboutUs: React.FC<AboutUsProps> = ({ onBack, onSelectView }) => {
  return (
    <ToolContainer title="Tentang PDF Toolbox Pro" onBack={onBack} maxWidth="max-w-4xl">
      <div className="space-y-10 text-text-secondary leading-relaxed text-sm sm:text-base">
        
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#9B4819]/10 text-[#9B4819] dark:text-[#E06D3B] text-xs font-bold border border-[#9B4819]/25 shadow-2xs">
            <Sparkles size={13} />
            <span>Platform Dokumen PDF Generasi Baru</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary tracking-tight leading-tight">
            Solusi PDF Andal, Cepat, dan Ramah di Kantong
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            Dibuat untuk mempermudah produktivitas jutaan mahasiswa, pekerja kantor, pelaku UMKM, dan profesional di Indonesia tanpa beban biaya langganan global yang mencekik.
          </p>
        </div>

        {/* 3 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 not-prose">
          <div className="p-6 bg-surface rounded-2xl border border-border-subtle shadow-paper text-center">
            <div className="w-12 h-12 rounded-xl bg-[#9B4819]/10 text-[#9B4819] dark:text-[#E06D3B] flex items-center justify-center mx-auto mb-4">
              <Zap size={24} className="fill-[#9B4819] dark:fill-[#E06D3B]" />
            </div>
            <h4 className="font-serif font-bold text-text-primary text-base mb-1">Akselerasi Tinggi</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Arsitektur hybrid cerdas: pemrosesan instan 0ms di browser untuk tugas ringan dan CPU multi-core server untuk konversi berat.
            </p>
          </div>

          <div className="p-6 bg-surface rounded-2xl border border-border-subtle shadow-paper text-center">
            <div className="w-12 h-12 rounded-xl bg-[#314028]/10 text-[#314028] dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={24} />
            </div>
            <h4 className="font-serif font-bold text-text-primary text-base mb-1">Privasi Tanpa Kompromi</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Enkripsi perbankan TLS 256-bit dan penghapusan otomatis dokumen server dalam 60 menit. Kami tidak pernah menjual atau melihat isi data Anda.
            </p>
          </div>

          <div className="p-6 bg-surface rounded-2xl border border-border-subtle shadow-paper text-center">
            <div className="w-12 h-12 rounded-xl bg-[#9B4819]/10 text-[#9B4819] dark:text-[#E06D3B] flex items-center justify-center mx-auto mb-4">
              <Award size={24} />
            </div>
            <h4 className="font-serif font-bold text-text-primary text-base mb-1">Harga Adil & Fleksibel</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Gunakan gratis setiap hari. Butuh akses cepat tanpa batas? Beli 24-Hour Pass hanya Rp5.000 via QRIS tanpa paksaan langganan bulanan.
            </p>
          </div>
        </div>

        {/* Cerita di Balik PDF Toolbox Pro */}
        <div className="bg-elevated p-6 sm:p-8 rounded-3xl border border-border-subtle space-y-4 shadow-2xs">
          <h3 className="font-serif text-xl font-bold text-text-primary flex items-center gap-2">
            <Heart size={18} className="text-[#9B4819] fill-[#9B4819]" />
            <span>Mengapa PDF Toolbox Pro Dibuat?</span>
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            Hampir setiap orang pernah berada di posisi mendesak: ingin melamar pekerjaan, mengunggah berkas CPNS, mengirim laporan skripsi, atau mengesahkan dokumen bisnis, namun terhambat batas kuota aplikasi PDF luar negeri yang mematok biaya lebih dari Rp110.000–Rp140.000 per bulan.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            Bagi seseorang yang hanya butuh memanipulasi dokumen 1–2 kali, sistem langganan bulanan tersebut sangat tidak masuk akal. Kami mendirikan <strong>PDF Toolbox Pro</strong> dengan satu tujuan sederhana: <strong>memberikan pengalaman manipulasi PDF setara atau melampaui alat terkemuka dunia dengan biaya yang sangat terjangkau bagi masyarakat Indonesia</strong>.
          </p>
        </div>

        {/* Model Bisnis Transparan */}
        <div className="space-y-4">
          <h3 className="font-serif text-xl font-bold text-text-primary">
            Model Bisnis Kami yang Transparan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-surface border border-border-subtle shadow-paper flex items-start gap-3">
              <CheckCircle2 size={18} className="text-[#314028] dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-serif text-sm font-bold text-text-primary">Free Tier (Gratis Untuk Semua)</h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Semua pengguna tamu berhak atas 3 tugas gratis per hari. Masuk dengan akun Google untuk mendapatkan 10 tugas gratis setiap hari tanpa biaya selamanya.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-border-subtle shadow-paper flex items-start gap-3">
              <CheckCircle2 size={18} className="text-[#314028] dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-serif text-sm font-bold text-text-primary">Paket Mikro & Pro Indonesia</h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Mendukung pembayaran lokal instan QRIS, GoPay, OVO, dan Dana. 24-Hour Flash Pass (Rp5.000) dan Monthly Pro (Rp29.000) yang 75% lebih murah dari kompetitor asing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Identitas Penayang, Pengembang & Tanggung Jawab Operasional */}
        <div className="bg-elevated p-6 sm:p-8 rounded-3xl border border-border-subtle space-y-4 shadow-2xs">
          <h3 className="font-serif text-xl font-bold text-text-primary flex items-center gap-2">
            <Users size={18} className="text-[#9B4819] dark:text-[#E06D3B]" />
            <span>Pengembang, Tim Redaksi & Penanggung Jawab Situs</span>
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            <strong>PDF Toolbox Pro</strong> (<a href="https://pdftoolbox.app" className="text-[#9B4819] dark:text-[#E06D3B] font-semibold underline">pdftoolbox.app</a>) didirikan, dikembangkan, dan dipelihara secara aktif oleh <strong>Rezal Dewantara</strong> bersama tim rekayasa perangkat lunak dan kurator konten dokumen digital di Indonesia.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-4 bg-surface rounded-xl border border-border-subtle shadow-2xs">
              <span className="text-[11px] text-text-muted block uppercase font-bold">Integritas & Pemeliharaan</span>
              <p className="text-text-secondary mt-1 leading-relaxed">
                Platform diperbarui secara rutin dengan algoritma kompresi terkini, standar kepatuhan regulasi UU PDP No. 27/2022, dan kompatibilitas format PDF/A (ISO 19005).
              </p>
            </div>
            <div className="p-4 bg-surface rounded-xl border border-border-subtle shadow-2xs">
              <span className="text-[11px] text-text-muted block uppercase font-bold">Kontak & Dukungan Resmi</span>
              <p className="text-text-secondary mt-1 leading-relaxed">
                Email Dukungan: <a href="mailto:support@pdftoolbox.app" className="text-[#9B4819] dark:text-[#E06D3B] underline font-semibold">support@pdftoolbox.app</a> / <a href="mailto:rezaldewantara@gmail.com" className="text-[#9B4819] dark:text-[#E06D3B] underline font-semibold">rezaldewantara@gmail.com</a>
              </p>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        {onSelectView && (
          <div 
            className="p-6 sm:p-8 bg-gradient-to-br from-[#9B4819] via-[#853C14] to-[#5F280A] rounded-3xl text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-paper-float border border-[#9B4819]/40"
            style={{ backgroundColor: '#9B4819', backgroundImage: 'linear-gradient(135deg, #9B4819 0%, #853C14 50%, #5F280A 100%)' }}
          >
            <div>
              <h4 className="font-serif font-bold text-xl sm:text-2xl mb-1 text-[#F4F1E8]">Siap Mengelola Dokumen Anda?</h4>
              <p className="text-xs sm:text-sm text-white/85">Jelajahi 10+ alat PDF pintar kami sekarang juga.</p>
            </div>
            <button
              onClick={() => onSelectView(View.TOOLS_TAB)}
              className="px-6 py-3 bg-[#F4F1E8] hover:bg-white text-[#9B4819] font-bold text-xs sm:text-sm rounded-full transition-all shadow-paper hover:shadow-paper-float active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Buka Semua Alat PDF</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

      </div>
    </ToolContainer>
  );
};

export default AboutUs;
