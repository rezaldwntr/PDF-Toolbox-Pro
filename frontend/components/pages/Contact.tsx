
import React, { useState } from 'react';
import ToolContainer from '../common/ToolContainer';

interface ContactProps {
  onBack: () => void;
}

const Contact: React.FC<ContactProps> = ({ onBack }) => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
            _subject: "Pesan Baru dari Website PDF Toolbox Pro",
            _template: "table",
            _captcha: "false"
        }),
      });
      if (response.ok) { setFormStatus('success'); setFormData({ name: '', email: '', message: '' }); } 
      else { throw new Error('Gagal mengirim'); }
    } catch (error) { setFormStatus('error'); }
  };

  if (formStatus === 'success') {
    return (
      <ToolContainer title="Pesan Terkirim!" onBack={onBack} maxWidth="max-w-xl">
        <div className="text-center py-10">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Terima Kasih!</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
            Pesan Anda telah kami terima. Tim kami akan mencoba merespons dalam waktu 24 jam.
          </p>
          <button onClick={() => setFormStatus('idle')} className="text-blue-600 font-bold hover:underline hover:text-blue-700 transition-colors">
            Kirim pesan lain
          </button>
        </div>
      </ToolContainer>
    );
  }

  return (
    <ToolContainer title="Hubungi Kami" onBack={onBack} maxWidth="max-w-2xl">
      <div className="text-center mb-10">
        <p className="text-slate-500 dark:text-slate-400 text-lg">
            Ada kendala teknis? Atau punya saran fitur baru?<br/>
            Kami senang mendengar masukan dari Anda.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Nama Lengkap</label>
                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required
                    className="w-full px-5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white placeholder-slate-400" placeholder="Contoh: Budi Santoso" />
            </div>
            <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Alamat Email</label>
                <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required
                    className="w-full px-5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white placeholder-slate-400" placeholder="nama@email.com" />
            </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="message" className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Pesan Anda</label>
          <textarea name="message" id="message" rows={6} value={formData.message} onChange={handleChange} required
            className="w-full px-5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white resize-none placeholder-slate-400" placeholder="Ceritakan detail masalah atau saran Anda di sini..." />
        </div>

        {formStatus === 'error' && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-center text-sm font-medium border border-red-100 dark:border-red-900/30">
                Maaf, gagal mengirim pesan saat ini. Silakan coba lagi nanti.
            </div>
        )}

        <button type="submit" disabled={formStatus === 'submitting'}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4">
          {formStatus === 'submitting' ? 'Sedang Mengirim...' : 'Kirim Pesan Sekarang'}
        </button>
      </form>
    </ToolContainer>
  );
};

export default Contact;
