import React, { useState } from 'react';
import ToolContainer from '../common/ToolContainer';

interface FaqProps {
  onBack: () => void;
}

const faqData = [
  {
    question: 'Apakah file saya aman?',
    answer: 'Ya. Semua pemrosesan dilakukan di komputer Anda sendiri (sisi klien). File Anda tidak pernah dikirim melalui internet ke server kami.',
  },
  {
    question: 'Apakah layanan ini benar-benar gratis?',
    answer: 'Ya, PDF Toolbox Pro sepenuhnya gratis untuk digunakan. Layanan ini didukung oleh iklan untuk menjaga agar tetap gratis.',
  },
  {
    question: 'Apa saja batasannya?',
    answer: 'Karena alat ini berjalan di browser Anda, kinerja dapat bergantung pada sumber daya komputer Anda dan ukuran file PDF Anda. Untuk file yang sangat besar, prosesnya mungkin lebih lambat.',
  },
  {
    question: 'Bagaimana cara kerja kompresi PDF?',
    answer: 'Alat kami mengurangi ukuran file dengan mengoptimalkan gambar dan menghapus data yang berlebihan di dalam PDF. Pengaturan "Direkomendasikan" memberikan keseimbangan yang baik antara ukuran dan kualitas, sementara "Lanjutan" memberi Anda lebih banyak kontrol.',
  },
];

const FaqItem: React.FC<{ q: string; a: string; }> = ({ q, a }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full py-5 text-left font-semibold text-slate-200"
      >
        <span>{q}</span>
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
            <p className="pb-5 pr-10 text-slate-400">
                {a}
            </p>
        </div>
      </div>
    </div>
  );
};

const Faq: React.FC<FaqProps> = ({ onBack }) => {
  return (
    <ToolContainer title="Pertanyaan yang Sering Diajukan (FAQ)" onBack={onBack} maxWidth="max-w-3xl">
      <div className="space-y-4">
        {faqData.map((item, index) => (
          <FaqItem key={index} q={item.question} a={item.answer} />
        ))}
      </div>
    </ToolContainer>
  );
};

export default Faq;
