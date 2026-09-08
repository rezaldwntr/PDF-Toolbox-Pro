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
      <div className="space-y-10 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
        
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800/60">
            <Sparkles size={13} />
            <span>Platform Dokumen PDF Generasi Baru</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Solusi PDF Andal, Cepat, dan Ramah di Kantong
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Dibuat untuk mempermudah produktivitas jutaan mahasiswa, pekerja kantor, pelaku UMKM, dan profesional di Indonesia tanpa beban biaya langganan global yang mencekik.
          </p>
        </div>

        {/* 3 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 not-prose">
          <div className="p-6 bg-white dark:bg-[#161A22] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
              <Zap size={24} className="fill-blue-500" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1">Akselerasi Tinggi</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Arsitektur hybrid cerdas: pemrosesan instan 0ms di browser untuk tugas ringan dan CPU multi-core server untuk konversi berat.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-[#161A22] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={24} />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1">Privasi Tanpa Kompromi</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Enkripsi perbankan TLS 256-bit dan penghapusan otomatis dokumen server dalam 60 menit. Kami tidak pernah menjual atau melihat isi data Anda.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-[#161A22] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Award size={24} />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1">Harga Adil & Fleksibel</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Gunakan gratis setiap hari. Butuh akses cepat tanpa batas? Beli 24-Hour Pass hanya Rp5.000 via QRIS tanpa paksaan langganan bulanan.
            </p>
          </div>
        </div>

        {/* Cerita di Balik PDF Toolbox Pro */}
        <div className="bg-slate-50 dark:bg-[#161A22] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Heart size={18} className="text-rose-500 fill-rose-500" />
            <span>Mengapa PDF Toolbox Pro Dibuat?</span>
          </h3>
          <p className="text-sm leading-relaxed">
            Hampir setiap orang pernah berada di posisi mendesak: ingin melamar pekerjaan, mengunggah berkas CPNS, mengirim laporan skripsi, atau mengesahkan dokumen bisnis, namun terhambat batas kuota aplikasi PDF luar negeri yang mematok biaya lebih dari Rp110.000–Rp140.000 per bulan.
          </p>
          <p className="text-sm leading-relaxed">
            Bagi seseorang yang hanya butuh memanipulasi dokumen 1–2 kali, sistem langganan bulanan tersebut sangat tidak masuk akal. Kami mendirikan <strong>PDF Toolbox Pro</strong> dengan satu tujuan sederhana: <strong>memberikan pengalaman manipulasi PDF setara atau melampaui alat terkemuka dunia dengan biaya yang sangat terjangkau bagi masyarakat Indonesia</strong>.
          </p>
        </div>

        {/* Model Bisnis Transparan */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Model Bisnis Kami yang Transparan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800 flex items-start gap-3">
              <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Free Tier (Gratis Untuk Semua)</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Semua pengguna tamu berhak atas 3 tugas gratis per hari. Masuk dengan akun Google untuk mendapatkan 10 tugas gratis setiap hari tanpa biaya selamanya.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800 flex items-start gap-3">
              <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Paket Mikro & Pro Indonesia</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Mendukung pembayaran lokal instan QRIS, GoPay, OVO, dan Dana. 24-Hour Flash Pass (Rp5.000) dan Monthly Pro (Rp29.000) yang 75% lebih murah dari kompetitor asing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        {onSelectView && (
          <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-extrabold text-base mb-1">Siap Mengelola Dokumen Anda?</h4>
              <p className="text-xs text-blue-100">Jelajahi 10+ alat PDF pintar kami sekarang juga.</p>
            </div>
            <button
              onClick={() => onSelectView(View.TOOLS_TAB)}
              className="px-5 py-2.5 bg-white text-blue-700 font-bold text-xs rounded-xl hover:bg-blue-50 transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
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
