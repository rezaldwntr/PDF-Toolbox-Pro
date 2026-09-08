import React from 'react';
import ToolContainer from '../common/ToolContainer';
import { ShieldCheck, Lock, EyeOff, Server, HardDrive, Trash2, CreditCard } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <ToolContainer title="Kebijakan Privasi & Keamanan Data" onBack={onBack} maxWidth="max-w-4xl">
      <div className="space-y-8 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
        
        {/* Highlight Banner */}
        <div className="flex items-start gap-4 p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-bold text-emerald-900 dark:text-emerald-300 text-sm mb-1">
              Prinsip Dasar: Privasi Anda adalah Prioritas Tertinggi Kami
            </h3>
            <p className="text-xs text-emerald-800/90 dark:text-emerald-400/90 leading-relaxed">
              Kami tidak pernah membaca, menyalin, menganalisis, menjual, atau melatih model AI apa pun menggunakan dokumen yang Anda proses di PDF Toolbox Pro. Dokumen Anda adalah milik Anda sepenuhnya.
            </p>
          </div>
        </div>

        {/* 1. Arsitektur Pemrosesan Hybrid */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Server size={18} className="text-blue-600" />
            <span>1. Arsitektur Pemrosesan Hybrid (Client-Side & Server-Side)</span>
          </h3>
          <p className="text-sm">
            PDF Toolbox Pro dirancang menggunakan arsitektur hybrid modern untuk memastikan privasi data maksimal sekaligus performa yang tinggi:
          </p>

          <div className="grid md:grid-cols-2 gap-4 not-prose">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <HardDrive size={18} />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Pemrosesan Lokal (Client-Side)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Untuk fitur <strong>Tambah Teks, Tambah Tanda Tangan, Atur Halaman, dan Potong Rentang</strong>, file Anda diproses 100% di dalam memori peramban browser Anda. Dokumen <strong>sama sekali tidak pernah diunggah</strong> ke server internet mana pun.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <Lock size={18} />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Pemrosesan Server (Server-Side)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Untuk fitur konversi berkecepatan tinggi seperti <strong>PDF ke Word, Excel, PPT, dan Gambar</strong>, file dikirimkan melalui jalur terenkripsi <strong>TLS 256-bit</strong> ke worker server kami, diproses, lalu langsung disediakan untuk diunduh.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Kebijakan Penghapusan Dokumen Otomatis */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trash2 size={18} className="text-rose-500" />
            <span>2. Penghapusan Berkas Otomatis (Auto-Cleanup Cron)</span>
          </h3>
          <p className="text-sm">
            Semua berkas sementara hasil proses di sisi server dihapus secara permanen dan otomatis oleh sistem terjadwal:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 pl-2">
            <li><strong>Pengguna Tamu (Guest) & Pengguna Gratis:</strong> Berkas dihapus permanen maksimal dalam waktu <strong>60 menit</strong>.</li>
            <li><strong>Pengguna Flash Pass & Pro:</strong> Berkas tersedia untuk diunduh ulang sementara hingga maksimal <strong>6–24 jam</strong> sebelum dihapus permanen.</li>
            <li>Kami tidak menyediakan fasilitas pencadangan (*backup*) berkas jangka panjang demi menjamin kerahasiaan dokumen Anda.</li>
          </ul>
        </div>

        {/* 3. Data Pengguna & Akun Google */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <EyeOff size={18} className="text-purple-500" />
            <span>3. Data Akun & Login Google OAuth</span>
          </h3>
          <p className="text-sm">
            Saat Anda memilih untuk masuk menggunakan akun Google, kami hanya meminta akses informasi profil publik dasar:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 pl-2">
            <li><strong>Alamat Email:</strong> Digunakan untuk mengenali akun Anda dan mencatat batas kuota harian.</li>
            <li><strong>Nama Lengkap & Foto Profil:</strong> Ditampilkan di pojok kanan atas antarmuka aplikasi.</li>
            <li>Kami <strong>tidak pernah meminta akses</strong> ke Google Drive, isi kotak masuk Gmail, daftar kontak, atau data pribadi Google Anda lainnya.</li>
          </ul>
        </div>

        {/* 4. Keamanan Pembayaran & Transaksi */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard size={18} className="text-amber-500" />
            <span>4. Keamanan Transaksi & Pembayaran</span>
          </h3>
          <p className="text-sm">
            Semua transaksi pembayaran paket mikro (24-Hour Flash Pass) dan paket langganan diproses melalui Payment Gateway berlisensi resmi Bank Indonesia dengan standar keamanan PCI-DSS:
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kami <strong>tidak pernah menyimpan</strong> data kartu kredit, informasi rekening bank, ataupun PIN dompet digital Anda di server kami. Semua konfirmasi pembayaran dikirimkan secara terenkripsi via webhook aman.
          </p>
        </div>

        {/* 5. Kebijakan Iklan & Kuki */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            5. Kebijakan Iklan (Google AdSense) & Kuki (Cookies)
          </h3>
          <p className="text-sm">
            Untuk membiayai infrastruktur server dan menjaga agar alat ini tetap gratis bagi masyarakat umum:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 pl-2">
            <li>Layanan ini menayangkan iklan display pihak ketiga (seperti Google AdSense) untuk pengguna Tamu dan Free. Mitra periklanan kami dapat menggunakan kuki untuk menayangkan iklan yang relevan.</li>
            <li>Pengguna paket berbayar (Flash Pass, Monthly Pro, Annual VIP) secara otomatis mendapatkan pengalaman <strong>100% Bebas Iklan (Ad-Free)</strong>.</li>
          </ul>
        </div>

        {/* 6. Hak Pengguna & Kontak Privasi */}
        <div className="p-5 bg-slate-50 dark:bg-[#161A22] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">Pertanyaan Mengenai Privasi?</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Jika Anda memiliki pertanyaan tentang kebijakan ini atau ingin meminta penghapusan data akun Anda, silakan kirimkan email ke <strong className="text-blue-600 dark:text-blue-400">rezaldewantara@gmail.com</strong>.
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
            Terakhir diperbarui: September 2026 · Versi Dokumen: 2.1 (Arsitektur Hybrid & Sistem Bisnis Multi-Tier)
          </p>
        </div>

      </div>
    </ToolContainer>
  );
};

export default PrivacyPolicy;
