import React, { useState, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Clock, MapPin, Send, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';

interface ContactProps {
  onBack: () => void;
}

const Contact: React.FC<ContactProps> = ({ onBack }) => {
  const { user } = useAuth();
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
        name: user.fullName || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus('submitting');
    try {
      const response = await fetch('https://formsubmit.co/ajax/rezaldewantara@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          ...formData,
          _subject: `[PDF Toolbox Pro] Pesan Baru: ${formData.category} dari ${formData.name}`,
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
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Terima Kasih!</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Pesan Anda telah berhasil kami terima. Tim dukungan kami akan meninjau dan merespons melalui email Anda dalam waktu maksimal 24 jam kerja.
          </p>
          <div className="pt-4">
            <button 
              onClick={() => setFormStatus('idle')} 
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-sm"
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
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Mengalami masalah teknis saat konversi, pertanyaan seputar kuota pembayaran, atau memiliki ide fitur baru? Kami siap mendengar dan membantu Anda.
          </p>
        </div>

        {/* 3 Contact Info Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 not-prose">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pusat Bantuan</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Tiket Dukungan Online</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Waktu Respons</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Maksimal 24 Jam Kerja</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Operasional</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Indonesia (WIB / WRT)</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white dark:bg-[#161A22] p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-600" />
            <span>Kirim Pesan Langsung</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input Tersembunyi (Hidden) untuk Nama dan Email agar data tetap terkirim tanpa tampil di layar */}
            <input type="hidden" name="name" value={formData.name || 'Pengguna PDF Toolbox'} />
            <input type="hidden" name="email" value={formData.email || 'pengguna@pdftoolbox.pro'} />

            <div className="space-y-1.5">
              <label htmlFor="category" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Topik / Kategori Pesan
              </label>
              <select
                name="category"
                id="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1E222B] border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-xs sm:text-sm text-slate-800 dark:text-slate-200"
              >
                <option value="Kendala Konversi Dokumen">Kendala Konversi Dokumen (Word/Excel/PPT/Gambar)</option>
                <option value="Pertanyaan Pembayaran & Kuota">Pertanyaan Pembayaran (QRIS) & Kuota Akun</option>
                <option value="Saran Fitur & Peningkatan">Saran Fitur Baru / Perbaikan Antarmuka</option>
                <option value="Laporan Bug Sistem">Laporan Bug / Kerusakan Sistem</option>
                <option value="Kerjasama Bisnis & Lainnya">Kerjasama Bisnis & Lainnya</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="message" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
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
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1E222B] border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none" 
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm"
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
