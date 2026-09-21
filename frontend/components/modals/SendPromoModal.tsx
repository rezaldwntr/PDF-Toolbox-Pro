// frontend/components/modals/SendPromoModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Mail,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Users,
  Zap,
  Crown,
  FileText,
} from 'lucide-react';

interface SendPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipients: string[];
}

export const SendPromoModal: React.FC<SendPromoModalProps> = ({
  isOpen,
  onClose,
  defaultRecipients,
}) => {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>(
    'Penawaran Eksklusif & Diskon Spesial PDF Toolbox Pro 🚀'
  );
  const [body, setBody] = useState<string>(
    `Halo Pengguna Setia,\n\nTerima kasih telah mempercayakan pengelolaan dokumen Anda pada PDF Toolbox Pro!\n\nKami memberikan penawaran harga promo khusus untuk upgrade paket Pro tanpa batas hari ini. Kunjungi dasbor atau halaman upgrade untuk mengklaim diskon spesial Anda.\n\nKunjungi sekarang: https://www.pdftoolbox.app/#pricing\n\nSalam hangat,\nTim PDF Toolbox Pro`
  );
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setRecipients(defaultRecipients || []);
      setCopied(false);
    }
  }, [isOpen, defaultRecipients]);

  if (!isOpen) return null;

  // Preset Templates
  const handleApplyTemplate = (type: 'monthly' | 'flash' | 'annual') => {
    if (type === 'flash') {
      setSubject('⚡ Promo Kilat 24 Jam: Akses Penuh PDF Toolbox Pro!');
      setBody(
        `Halo Pengguna Setia,\n\nButuh memproses banyak file PDF hari ini tanpa batasan? Nikmati promo kilat Flash Pass 24 Jam dengan harga spesial!\n\nFitur yang didapatkan:\n- Akses seluruh 20+ alat PDF tanpa batas\n- Upload dokumen hingga ukuran besar\n- Konversi & kompresi prioritas kilat\n\nKlaim penawaran Anda sekarang: https://www.pdftoolbox.app/#pricing\n\nSalam hangat,\nTim PDF Toolbox Pro`
      );
    } else if (type === 'monthly') {
      setSubject('🚀 Diskon Spesial Langganan Bulanan PDF Toolbox Pro');
      setBody(
        `Halo Pengguna Setia,\n\nTerima kasih telah aktif menggunakan PDF Toolbox Pro! Khusus hari ini, kami memberikan potongan harga spesial untuk paket Monthly Pro.\n\nManfaat Paket Monthly Pro:\n- Kuota operasi PDF tanpa batas selama sebulan\n- Bebas iklan dan antrean prioritas\n- Dukungan OCR & translasi dokumen multi-bahasa\n\nAktifkan diskon bulanan Anda: https://www.pdftoolbox.app/#pricing\n\nSalam hangat,\nTim PDF Toolbox Pro`
      );
    } else if (type === 'annual') {
      setSubject('👑 Penawaran Terbesar Tahunan: Hemat hingga 60% VIP Pass');
      setBody(
        `Halo Rekan Profesional,\n\nSelesaikan urusan dokumen kantor dan bisnis Anda selama setahun penuh tanpa pusing dengan Annual VIP Pass.\n\nKeuntungan Annual VIP:\n- Akses tanpa batas selama 365 hari\n- Hemat biaya terbesar dibandingkan bulanan\n- Semua fitur pro dan pembaruan alat baru\n\nDapatkan diskon tahunan terbaik: https://www.pdftoolbox.app/#pricing\n\nSalam hangat,\nTim PDF Toolbox Pro`
      );
    }
  };

  const bccList = recipients.join(',');

  // Buka di Gmail Web (Langsung di browser tanpa butuh aplikasi desktop)
  const handleOpenGmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(
      bccList
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  // Buka di Aplikasi Mail Default (Menggunakan window.location agar TIDAK memicu about:blank)
  const handleOpenDefaultMail = () => {
    const mailtoUrl = `mailto:?bcc=${encodeURIComponent(bccList)}&subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  // Salin Draf Email ke Clipboard
  const handleCopyDraft = () => {
    const fullText = `Penerima (BCC):\n${bccList}\n\nSubjek:\n${subject}\n\nIsi Pesan:\n${body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#151921] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Kirim Promo & Penawaran Email
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kirim pesan promosi langsung ke {recipients.length} pengguna yang mengaktifkan penawaran email
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten Form */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Penerima (BCC) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                Daftar Penerima BCC ({recipients.length} Pengguna Opt-in)
              </label>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                🔒 Aman (Privasi BCC Terjaga)
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 max-h-24 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {recipients.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] border border-slate-200 dark:border-slate-700"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => setRecipients((prev) => prev.filter((e) => e !== email))}
                      className="text-slate-400 hover:text-rose-500 font-bold"
                      title="Hapus dari daftar kirim ini"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Email dikirimkan via <strong>BCC</strong> sehingga para penerima tidak dapat melihat alamat email satu sama lain demi kepatuhan privasi data.
            </p>
          </div>

          {/* Template Pilihan Cepat */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-500 text-[11px] mb-1.5">
              Template Pesan Siap Pakai (1-Klik):
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleApplyTemplate('monthly')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold transition border border-blue-200 dark:border-blue-800"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Template Diskon Bulanan</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('flash')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-xs font-semibold transition border border-amber-200 dark:border-amber-800"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Template Flash Pass 24 Jam</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('annual')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 text-xs font-semibold transition border border-purple-200 dark:border-purple-800"
              >
                <Crown className="w-3.5 h-3.5 text-purple-500" />
                <span>Template VIP Tahunan</span>
              </button>
            </div>
          </div>

          {/* Subjek Email */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-500 text-[11px] mb-1">
              Subjek Email:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Masukkan judul subjek email..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Isi Pesan Email */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-500 text-[11px] mb-1">
              Isi Pesan Promosi:
            </label>
            <textarea
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tuliskan pesan penawaran promo..."
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Footer Aksi */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyDraft}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-semibold transition"
            title="Salin seluruh draf pesan dan daftar email ke clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Draf & Email Tersalin!' : 'Salin Draf & Email'}</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleOpenDefaultMail}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-semibold transition"
              title="Buka aplikasi email desktop default (Outlook/Thunderbird/Mail)"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Aplikasi Email Desktop</span>
            </button>

            <button
              type="button"
              onClick={handleOpenGmail}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-500/20"
              title="Buka langsung tab baru di Gmail Web dengan pesan otomatis terisi"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di Gmail Web</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
