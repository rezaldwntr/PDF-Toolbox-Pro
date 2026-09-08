import React, { useState } from 'react';
import ToolContainer from '../common/ToolContainer';
import { View } from '../../types';
import { ChevronDown, HelpCircle, MessageSquare, Zap, Shield, Sparkles } from 'lucide-react';

interface FaqProps { 
  onBack: () => void; 
  onSelectView?: (view: View) => void;
}

const faqData = [
  { 
    q: 'Apakah layanan PDF Toolbox Pro benar-benar gratis?', 
    a: 'Ya! Kami menyediakan Free Tier harian. Pengguna Tamu (tanpa akun) mendapatkan 3 tugas gratis per hari. Jika Anda masuk dengan akun Google, kuota gratis otomatis bertambah menjadi 10 tugas gratis setiap hari tanpa biaya selamanya.' 
  },
  { 
    q: 'Apa keuntungan masuk dengan Akun Google?', 
    a: 'Dengan masuk gratis menggunakan akun Google, kuota harian Anda melonjak dari 3 menjadi 10 tugas/hari, batas ukuran berkas naik dari 20 MB menjadi 50 MB, dan statistik pemakaian kuota Anda tercatat rapi di halaman profil.' 
  },
  { 
    q: 'Apa itu 24-Hour Flash Pass (Rp5.000)?', 
    a: '24-Hour Flash Pass adalah paket mikro harian sekali bayar tanpa sistem langganan berulang. Cocok bagi Anda yang butuh menyelesaikan banyak dokumen mendesak hari ini. Cukup bayar Rp5.000 via QRIS, dan Anda langsung mendapatkan akses konversi tanpa batas selama 24 jam penuh, batas ukuran berkas 100 MB, batch hingga 20 file, dan bebas iklan.' 
  },
  { 
    q: 'Metode pembayaran apa saja yang didukung?', 
    a: 'Kami mendukung QRIS dinamis yang dapat dipindai langsung dari layar menggunakan aplikasi m-banking apa saja (BCA, Mandiri, BRI, BNI, CIMB, dll.) serta dompet digital populer di Indonesia seperti GoPay, OVO, Dana, ShopeePay, dan LinkAja. Pembayaran terverifikasi otomatis dalam hitungan detik.' 
  },
  { 
    q: 'Apakah dokumen saya aman dan tidak akan bocor?', 
    a: 'Sangat aman! Kami menerapkan arsitektur hybrid modern: Alat seperti Tambah Teks, Tanda Tangan, dan Atur Halaman diproses 100% di dalam browser Anda (file tidak pernah diunggah). Untuk konversi server, file dikirim melalui jalur terenkripsi TLS 256-bit dan dihapus permanen secara otomatis maksimal dalam 1 jam setelah selesai.' 
  },
  { 
    q: 'Berapa batas ukuran file yang dapat saya proses?', 
    a: 'Batas ukuran file disesuaikan dengan paket Anda: Tamu (maks. 20 MB), Akun Gratis (maks. 50 MB), 24-Hour Flash Pass (maks. 100 MB), Monthly Pro (maks. 250 MB), dan Annual VIP Pass (maks. 500 MB).' 
  },
  { 
    q: 'Mengapa konversi PDF ke Word dan Excel sangat cepat dan rapi?', 
    a: 'Server kami ditenagai oleh mesin akselerasi multi-core CPU paralel berkecepatan tinggi serta parser tabel berbasis C++ native. Selain itu, fitur pemotongan rentang halaman presisi (client-side slicing) memangkas ukuran berkas yang diunggah hingga 95% sebelum diproses.' 
  },
  { 
    q: 'Bisakah saya menggunakan PDF Toolbox Pro di HP Android atau iPhone?', 
    a: 'Tentu saja! Seluruh antarmuka PDF Toolbox Pro dirancang 100% responsif untuk semua ukuran layar, mulai dari smartphone Android, iPhone, iPad, tablet, hingga laptop dan PC desktop.' 
  },
];

const FaqItem: React.FC<{ q: string; a: string; isOpen: boolean; onToggle: () => void }> = ({ q, a, isOpen, onToggle }) => {
  return (
    <div className="mb-3">
      <button 
        onClick={onToggle}
        className={`flex justify-between items-center w-full p-5 sm:p-6 text-left transition-all duration-200 bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800 ${
          isOpen ? 'rounded-t-2xl border-b-transparent shadow-xs' : 'rounded-2xl hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
        }`}
      >
        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base pr-4">
          {q}
        </span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${
          isOpen ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 rotate-180' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
        }`}>
          <ChevronDown size={16} />
        </div>
      </button>

      {isOpen && (
        <div className="p-5 sm:p-6 bg-slate-50/70 dark:bg-[#1E222B]/50 rounded-b-2xl border border-t-0 border-slate-200 dark:border-slate-800 animate-fade-in">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
            {a}
          </p>
        </div>
      )}
    </div>
  );
};

const Faq: React.FC<FaqProps> = ({ onBack, onSelectView }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(prev => (prev === index ? null : index));
  };

  return (
    <ToolContainer title="Pertanyaan yang Sering Diajukan (FAQ)" onBack={onBack} maxWidth="max-w-3xl">
      <div className="space-y-1">
        {faqData.map((item, index) => (
          <FaqItem 
            key={index} 
            q={item.q} 
            a={item.a} 
            isOpen={openIndex === index}
            onToggle={() => toggleItem(index)}
          />
        ))}
      </div>

      {/* Support Card Footer */}
      <div className="mt-10 p-6 bg-blue-50/70 dark:bg-blue-950/30 rounded-3xl text-center border border-blue-200/80 dark:border-blue-900/40 space-y-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mx-auto">
          <MessageSquare size={20} />
        </div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white">
          Masih Memiliki Pertanyaan atau Mengalami Kendala?
        </h4>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Tim kami siap membantu Anda menyelesaikan masalah pemrosesan dokumen atau mendengarkan saran fitur baru.
        </p>
        
        {onSelectView && (
          <div className="pt-2">
            <button 
              onClick={() => onSelectView(View.CONTACT)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              Hubungi Tim Dukungan Kami →
            </button>
          </div>
        )}
      </div>
    </ToolContainer>
  );
};

export default Faq;
