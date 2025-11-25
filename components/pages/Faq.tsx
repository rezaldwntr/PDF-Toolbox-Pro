
import React, { useState } from 'react';
import ToolContainer from '../common/ToolContainer';

interface FaqProps {
  onBack: () => void;
}

const faqData = [
  {
    question: 'Apakah Zentridox benar-benar gratis?',
    answer: 'Ya, semua alat yang tersedia di Zentridox 100% gratis untuk digunakan. Layanan ini didukung oleh iklan untuk membantu kami membayar biaya pemeliharaan dan pengembangan agar tetap gratis untuk Anda.',
  },
  {
    question: 'Apakah file saya aman dan di mana file diproses?',
    answer: 'Keamanan Anda adalah prioritas utama kami. Semua pemrosesan file (menggabungkan, mengompres, dll.) dilakukan langsung di dalam browser web Anda di komputer Anda. File Anda TIDAK PERNAH diunggah ke server kami. Mereka tetap berada di perangkat Anda dari awal hingga akhir.',
  },
  {
    question: 'Apakah saya perlu menginstal perangkat lunak?',
    answer: 'Tidak. Zentridox adalah aplikasi berbasis web sepenuhnya. Anda tidak perlu mengunduh atau menginstal apa pun. Cukup buka situs kami di browser apa pun (seperti Chrome, Firefox, atau Safari) dan Anda siap menggunakannya.',
  },
  {
    question: 'Mengapa pemrosesan file saya gagal atau lambat?',
    answer: 'Karena semua pemrosesan terjadi di komputer Anda, kinerjanya bergantung pada sumber daya perangkat Anda (CPU, RAM) dan ukuran serta kompleksitas file PDF Anda. Proses mungkin gagal atau berjalan lambat jika file sangat besar atau komputer Anda memiliki sumber daya terbatas. Coba tutup tab browser lain dan coba lagi.',
  },
   {
    question: 'Bagaimana cara kerja kompresi PDF?',
    answer: 'Alat kami mengurangi ukuran file dengan mengoptimalkan gambar dan menghapus data yang berlebihan di dalam PDF. Pengaturan "Direkomendasikan" memberikan keseimbangan yang baik antara ukuran dan kualitas, sementara "Lanjutan" memberi Anda lebih banyak kontrol.',
  },
  {
    question: 'Bagaimana cara menghubungi Anda jika saya menemukan bug atau punya saran?',
    answer: 'Kami sangat menghargai masukan Anda! Silakan kunjungi halaman "Kontak" kami untuk mengirimkan pesan kepada kami. Sertakan deskripsi masalah yang Anda temui agar kami dapat memperbaikinya.',
  },
];

const FaqItem: React.FC<{ q: string; a: string; }> = ({ q, a }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full py-5 text-left font-semibold text-gray-800"
      >
        <span>{q}</span>
        <svg
          className={`w-5 h-5 transition-transform duration-300 text-gray-500 ${isOpen ? 'transform rotate-180' : ''}`}
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
            <p className="pb-5 pr-10 text-gray-600">
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
