
import React, { useState } from 'react';
import ToolContainer from '../common/ToolContainer';

interface FaqProps { onBack: () => void; }

const faqData = [
  { 
    q: 'Apakah layanan ini benar-benar gratis?', 
    a: 'Ya, PDF Toolbox Pro 100% gratis untuk digunakan. Kami membiayai operasional server dan pengembangan melalui iklan yang tidak mengganggu.' 
  },
  { 
    q: 'Apakah file saya aman?', 
    a: 'Keamanan adalah prioritas kami. Kami menggunakan teknologi Hybrid: Alat seperti "Atur PDF" dan "Tambah Teks" memproses file langsung di browser Anda (tidak diupload). Alat seperti "Konversi" dan "Kompres" memproses file di server aman kami yang secara otomatis menghapus file setelah selesai.' 
  },
  { 
    q: 'Berapa batas ukuran file yang bisa diupload?', 
    a: 'Untuk pemrosesan server (seperti Konversi), kami menyarankan file di bawah 50MB untuk kinerja optimal. Untuk pemrosesan lokal (seperti Organisir), batasnya bergantung pada RAM perangkat Anda.' 
  },
  { 
    q: 'Mengapa konversi PDF ke Word memakan waktu?', 
    a: 'Konversi dokumen kompleks membutuhkan analisis struktur layout, font, dan gambar yang mendalam di server kami untuk memastikan hasil Word yang bisa diedit dengan rapi.' 
  },
  { 
    q: 'Bisakah saya menggunakan ini di HP?', 
    a: 'Tentu saja! Desain kami responsif dan mendukung semua perangkat modern, baik desktop, tablet, maupun smartphone (Android & iOS).' 
  },
];

const FaqItem: React.FC<{ q: string; a: string; }> = ({ q, a }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mb-4">
      <button onClick={() => setIsOpen(!isOpen)}
        className={`flex justify-between items-center w-full p-6 text-left transition-all duration-300 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 ${isOpen ? 'rounded-t-[1.5rem] border-b-0' : 'rounded-[1.5rem] hover:shadow-md'}`}>
        <span className="font-bold text-slate-800 dark:text-white text-lg pr-4">{q}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
             <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden bg-slate-50 dark:bg-slate-700/30 rounded-b-[1.5rem] border border-t-0 border-gray-100 dark:border-slate-700">
            <p className="p-6 text-slate-600 dark:text-slate-300 leading-relaxed text-base">{a}</p>
        </div>
      </div>
    </div>
  );
};

const Faq: React.FC<FaqProps> = ({ onBack }) => {
  return (
    <ToolContainer title="Tanya Jawab (FAQ)" onBack={onBack} maxWidth="max-w-3xl">
      <div className="space-y-1">
        {faqData.map((item, index) => <FaqItem key={index} q={item.q} a={item.a} />)}
      </div>
      <div className="mt-10 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl text-center border border-blue-100 dark:border-blue-900/30">
        <p className="text-slate-600 dark:text-slate-300 mb-4">Masih memiliki pertanyaan teknis atau masalah?</p>
        <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20">Hubungi Tim Support</button>
      </div>
    </ToolContainer>
  );
};

export default Faq;
