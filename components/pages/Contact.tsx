
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
      // Menggunakan email Anda: rezaldewantara@gmail.com
      const response = await fetch('https://formsubmit.co/ajax/rezaldewantara@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            message: formData.message,
            _subject: "Pesan Baru dari Website Zentridox", // Subjek email agar mudah dicari
            _template: "table", // Format email tabel agar lebih rapi
            _captcha: "false" // Mematikan captcha bawaan jika mengganggu (opsional)
        }),
      });

      if (response.ok) {
        setFormStatus('success');
        setFormData({ name: '', email: '', message: '' });
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Pengiriman formulir gagal');
      }
    } catch (error) {
      console.error(error);
      setFormStatus('error');
    }
  };

  if (formStatus === 'success') {
    return (
      <ToolContainer title="Pesan Terkirim!" onBack={onBack} maxWidth="max-w-2xl">
        <div className="text-center text-gray-700 dark:text-gray-300 space-y-4 animate-fade-in">
          <svg className="w-16 h-16 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg">Terima kasih atas masukan Anda. Kami akan segera merespons jika diperlukan.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">(Pastikan Anda sudah mengaktifkan form ini melalui email konfirmasi pertama kali)</p>
          <button
            onClick={() => setFormStatus('idle')}
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors pt-4"
          >
            Kirim pesan lain
          </button>
        </div>
      </ToolContainer>
    );
  }

  return (
    <ToolContainer title="Hubungi Kami" onBack={onBack} maxWidth="max-w-2xl">
      <div className="text-center text-gray-600 dark:text-gray-300 mb-8">
        <p>Punya pertanyaan, masukan, atau saran? Kami ingin sekali mendengar dari Anda. Silakan isi formulir di bawah ini.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Nama Anda</label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 transition-colors shadow-sm placeholder-gray-400 dark:placeholder-gray-400"
            placeholder="Nama Anda"
          />
        </div>

        <div>
          <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Email Anda</label>
          <input
            type="email"
            name="email"
            id="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 transition-colors shadow-sm placeholder-gray-400 dark:placeholder-gray-400"
            placeholder="anda@email.com"
          />
        </div>

        <div>
          <label htmlFor="message" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Pesan</label>
          <textarea
            name="message"
            id="message"
            rows={6}
            value={formData.message}
            onChange={handleChange}
            required
            className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 transition-colors shadow-sm placeholder-gray-400 dark:placeholder-gray-400"
            placeholder="Tinggalkan pesan Anda di sini..."
          />
        </div>

        {formStatus === 'error' && (
          <p className="text-sm text-red-500 text-center">
            Maaf, terjadi kesalahan saat mengirim pesan Anda. Silakan coba lagi nanti.
          </p>
        )}

        <button
          type="submit"
          disabled={formStatus === 'submitting'}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg flex items-center justify-center shadow-md"
        >
          {formStatus === 'submitting' ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Mengirim...
            </>
          ) : 'Kirim Pesan'}
        </button>
      </form>
    </ToolContainer>
  );
};

export default Contact;
