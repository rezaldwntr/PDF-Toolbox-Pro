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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-paper-float border border-border-subtle overflow-hidden">
        {/* Header Modal */}
        <div className="p-5 sm:px-6 border-b border-border-subtle flex items-center justify-between gap-3 bg-elevated/60">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#9B4819]/12 text-[#9B4819] dark:text-[#E06D3B] border border-[#9B4819]/25 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-text-primary">
                Kirim Promo & Penawaran Email
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Kirim pesan promosi langsung ke {recipients.length} pengguna yang mengaktifkan penawaran email
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border-subtle flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Konten Form */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Penerima (BCC) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold uppercase tracking-wider text-text-secondary text-[11px]">
                Daftar Penerima BCC ({recipients.length} Pengguna Opt-in)
              </label>
              <span className="text-[10px] font-semibold text-[#314028] dark:text-[#34D399] bg-[#314028]/10 px-2.5 py-0.5 rounded-full border border-[#314028]/25">
                🔒 Aman (Privasi BCC Terjaga)
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-elevated border border-border-subtle max-h-24 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {recipients.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-surface text-text-primary font-mono text-[10px] border border-border-subtle"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => setRecipients((prev) => prev.filter((e) => e !== email))}
                      className="text-text-secondary hover:text-rose-500 font-bold cursor-pointer"
                      title="Hapus dari daftar kirim ini"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-text-secondary mt-1.5">
              Email dikirimkan via <strong>BCC</strong> sehingga para penerima tidak dapat melihat alamat email satu sama lain demi kepatuhan privasi data.
            </p>
          </div>

          {/* Template Pilihan Cepat */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-text-secondary text-[11px] mb-2">
              Template Pesan Siap Pakai (1-Klik):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyTemplate('monthly')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-surface text-text-primary hover:text-[#9B4819] dark:hover:text-[#E06D3B] text-xs font-semibold transition border border-border-subtle hover:border-[#9B4819]/40 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#9B4819] dark:text-[#E06D3B]" />
                <span>Diskon Bulanan</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('flash')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-surface text-text-primary hover:text-amber-600 dark:hover:text-amber-400 text-xs font-semibold transition border border-border-subtle hover:border-amber-500/40 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Flash Pass 24 Jam</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('annual')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-surface text-text-primary hover:text-[#9B4819] dark:hover:text-[#F29F67] text-xs font-semibold transition border border-border-subtle hover:border-[#9B4819]/40 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-[#7E3812] dark:text-[#F29F67]" />
                <span>VIP Tahunan</span>
              </button>
            </div>
          </div>

          {/* Subjek Email */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-text-secondary text-[11px] mb-1">
              Subjek Email:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Masukkan judul subjek email..."
              className="w-full px-3.5 py-2 rounded-xl bg-elevated border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:border-[#9B4819]"
            />
          </div>

          {/* Isi Pesan Email */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-text-secondary text-[11px] mb-1">
              Isi Pesan Promosi:
            </label>
            <textarea
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tuliskan pesan penawaran promo..."
              className="w-full p-3.5 rounded-xl bg-elevated border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-[#9B4819] leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Footer Aksi */}
        <div className="p-4 sm:px-6 border-t border-border-subtle bg-elevated/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyDraft}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-surface hover:bg-elevated text-text-primary border border-border-subtle text-xs font-semibold transition cursor-pointer"
            title="Salin seluruh draf pesan dan daftar email ke clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#314028] dark:text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Draf & Email Tersalin!' : 'Salin Draf & Email'}</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleOpenDefaultMail}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-surface hover:bg-elevated border border-border-subtle text-text-primary text-xs font-semibold transition cursor-pointer"
              title="Buka aplikasi email desktop default (Outlook/Thunderbird/Mail)"
            >
              <Mail className="w-3.5 h-3.5 text-text-secondary" />
              <span>Aplikasi Email Desktop</span>
            </button>

            <button
              type="button"
              onClick={handleOpenGmail}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full bg-[#9B4819] hover:bg-[#7E3812] text-white text-xs font-bold transition shadow-md cursor-pointer"
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

