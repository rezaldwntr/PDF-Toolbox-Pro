import React, { useState, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Clock, MapPin, Send, CheckCircle2, AlertCircle, MessageSquare, User, EyeOff } from 'lucide-react';

interface ContactProps {
  onBack: () => void;
}

const Contact: React.FC<ContactProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    category: 'Kendala Konversi Dokumen',
    message: '' 
  });
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Auto-fill nama dan email jika user sudah login
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.fullName || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  const handleToggleAnonymous = (checked: boolean) => {
    setIsAnonymous(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, name: 'Anonim' }));
    } else {
      setFormData(prev => ({ ...prev, name: user?.fullName || '' }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus('submitting');
    const senderName = isAnonymous ? 'Anonim' : (formData.name.trim() || 'Pengguna PDF Toolbox');
    try {
      const response = await fetch('https://formsubmit.co/ajax/rezaldewantara@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name: senderName,
          email: formData.email,
          category: formData.category,
          message: formData.message,
          _replyto: formData.email,
          _subject: `[PDF Toolbox Pro] Tiket Dukungan: ${formData.category} (${senderName})`,
          _template: "table",
          _captcha: "false"
        }),
      });
      if (response.ok) { 
        setFormStatus('success'); 
        setFormData(prev => ({ ...prev, message: '' })); 
      } else { 
        throw new Error('Gagal mengirim'); 
      }
    } catch { 
      setFormStatus('error'); 
    }
  };

  if (formStatus === 'success') {
    return (
      <ToolContainer title="Pesan Berhasil Terkirim!" onBack={onBack} maxWidth="max-w-xl">
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-[#314028] text-white rounded-2xl flex items-center justify-center mx-auto shadow-paper">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="font-serif text-2xl font-bold text-text-primary">Terima Kasih!</h3>
          <p className="text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
            Pesan Anda telah berhasil kami terima. Tim dukungan kami akan meninjau dan merespons melalui email Anda dalam waktu maksimal 24 jam kerja.
          </p>
          <div className="pt-4">
            <button 
              onClick={() => setFormStatus('idle')} 
              className="px-6 py-2.5 rounded-full bg-[#9B4819] hover:bg-[#7E3812] text-white font-bold text-xs shadow-paper hover:shadow-paper-float transition-all cursor-pointer"
            >
              Kirim Pesan Lain
            </button>
          </div>
        </div>
      </ToolContainer>
    );
  }

  return (
    <ToolContainer title="Hubungi Tim Dukungan" onBack={onBack} maxWidth="max-w-4xl">
      <div className="space-y-8">
        
        {/* Intro */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <p className="text-text-secondary text-sm leading-relaxed">
            Mengalami masalah teknis saat konversi, pertanyaan seputar kuota pembayaran, atau memiliki ide fitur baru? Kami siap mendengar dan membantu Anda.
          </p>
        </div>

        {/* 3 Contact Info Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 not-prose">
          <div className="p-4 rounded-2xl bg-surface border border-border-subtle shadow-paper flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#9B4819]/10 text-[#9B4819] dark:text-[#E06D3B] flex items-center justify-center shrink-0">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Pusat Bantuan</p>
              <p className="text-xs font-semibold text-text-primary">Tiket Dukungan Online</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border-subtle shadow-paper flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#314028]/10 text-[#314028] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Waktu Respons</p>
              <p className="text-xs font-semibold text-text-primary">Maksimal 24 Jam Kerja</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border-subtle shadow-paper flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#9B4819]/10 text-[#9B4819] dark:text-[#E06D3B] flex items-center justify-center shrink-0">
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Operasional</p>
              <p className="text-xs font-semibold text-text-primary">Indonesia (WIB / WRT)</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-surface p-6 sm:p-8 rounded-3xl border border-border-subtle shadow-paper">
          <h3 className="font-serif text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
            <MessageSquare size={18} className="text-[#9B4819] dark:text-[#E06D3B]" />
            <span>Kirim Pesan Langsung</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input Nama & Email Pengirim */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Pengirim */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="name" className="block text-xs font-bold text-text-primary">
                    Nama Pengirim {!isAnonymous && <span className="text-rose-500">*</span>}
                  </label>
                  {/* Pilihan Kirim sebagai Anonim */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-medium text-text-secondary hover:text-[#9B4819] dark:hover:text-[#E06D3B] transition-colors">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => handleToggleAnonymous(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#9B4819] focus:ring-[#9B4819] border-border-subtle cursor-pointer"
                    />
                    <span>Kirim sebagai Anon</span>
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    {isAnonymous ? <EyeOff size={15} /> : <User size={15} />}
                  </div>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={isAnonymous ? 'Anonim' : formData.name}
                    onChange={handleChange}
                    disabled={isAnonymous}
                    required={!isAnonymous}
                    placeholder={isAnonymous ? 'Anonim' : 'Nama lengkap Anda'}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all ${
                      isAnonymous
                        ? 'bg-elevated border-border-subtle text-text-muted italic cursor-not-allowed'
                        : 'bg-elevated border-border-subtle focus:border-[#9B4819] focus:ring-2 focus:ring-[#9B4819]/20 text-text-primary'
                    }`}
                  />
                </div>
                {isAnonymous && (
                  <p className="text-[11px] text-text-muted">
                    Identitas nama Anda akan dikirimkan sebagai "Anonim".
                  </p>
                )}
              </div>

              {/* Email Pengirim */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-bold text-text-primary">
                  Email Anda <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    <Mail size={15} />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="nama@email.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-elevated border border-border-subtle focus:border-[#9B4819] focus:ring-2 focus:ring-[#9B4819]/20 outline-none transition-all text-xs sm:text-sm text-text-primary"
                  />
                </div>
                <p className="text-[11px] text-text-muted">
                  Admin kami akan membalas langsung ke alamat email ini.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="category" className="block text-xs font-bold text-text-primary">
                Topik / Kategori Pesan
              </label>
              <select
                name="category"
                id="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-elevated border border-border-subtle focus:border-[#9B4819] focus:ring-2 focus:ring-[#9B4819]/20 outline-none transition-all text-xs sm:text-sm text-text-primary"
              >
                <option value="Kendala Konversi Dokumen">Kendala Konversi Dokumen (Word/Excel/PPT/Gambar)</option>
                <option value="Pertanyaan Pembayaran & Kuota">Pertanyaan Pembayaran (QRIS) & Kuota Akun</option>
                <option value="Saran Fitur & Peningkatan">Saran Fitur Baru / Perbaikan Antarmuka</option>
                <option value="Laporan Bug Sistem">Laporan Bug / Kerusakan Sistem</option>
                <option value="Kerjasama Bisnis & Lainnya">Kerjasama Bisnis & Lainnya</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="message" className="block text-xs font-bold text-text-primary">
                Pesan / Detail Masalah
              </label>
              <textarea 
                name="message" 
                id="message" 
                rows={5} 
                value={formData.message} 
                onChange={handleChange} 
                required
                placeholder="Tuliskan detail pertanyaan atau kendala yang Anda alami..."
                className="w-full px-4 py-2.5 rounded-xl bg-elevated border border-border-subtle focus:border-[#9B4819] focus:ring-2 focus:ring-[#9B4819]/20 outline-none transition-all text-xs sm:text-sm text-text-primary placeholder:text-text-muted resize-none" 
              />
            </div>

            {formStatus === 'error' && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-medium border border-rose-200 dark:border-rose-900/40 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>Gagal mengirim pesan saat ini. Silakan periksa koneksi internet Anda dan coba beberapa saat lagi.</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={formStatus === 'submitting'}
              className="w-full bg-[#9B4819] hover:bg-[#7E3812] text-white font-bold py-3.5 px-6 rounded-full shadow-paper hover:shadow-paper-float transition-all active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
            >
              {formStatus === 'submitting' ? (
                <span>Sedang Mengirim Pesan...</span>
              ) : (
                <>
                  <Send size={15} />
                  <span>Kirim Pesan Sekarang</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </ToolContainer>
  );
};

export default Contact;
