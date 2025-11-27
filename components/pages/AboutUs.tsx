
import React from 'react';
import ToolContainer from '../common/ToolContainer';

interface AboutUsProps {
  onBack: () => void;
}

const AboutUs: React.FC<AboutUsProps> = ({ onBack }) => {
  return (
    <ToolContainer title="Tentang Kami" onBack={onBack} maxWidth="max-w-3xl">
      <div className="prose prose-gray dark:prose-invert prose-lg max-w-none text-gray-700 dark:text-gray-300 space-y-6">
        <p className="lead">
          Selamat datang di Zentridox! Misi kami sederhana: menyediakan seperangkat alat PDF yang cepat, gratis, aman, dan mudah digunakan untuk semua orang.
        </p>
        
        <h4>Apa yang Kami Tawarkan?</h4>
        <p>
          Zentridox adalah solusi lengkap untuk semua kebutuhan PDF Anda. Kami percaya bahwa manajemen dokumen yang kuat harus dapat diakses oleh semua orang, tanpa iklan yang mengganggu.
        </p>
        <ul className="list-disc list-inside">
            <li><strong>Gratis:</strong> Semua alat kami 100% gratis untuk digunakan.</li>
            <li><strong>Privasi & Keamanan:</strong> Untuk sebagian besar alat (seperti gabungkan, pisahkan, kompres), pemrosesan dilakukan langsung di browser Anda. Untuk konversi format lanjutan (seperti PDF ke Word), kami menggunakan server aman untuk memproses file Anda tanpa menyimpannya secara permanen.</li>
            <li><strong>Mudah Digunakan:</strong> Tidak perlu mengunduh atau menginstal perangkat lunak apa pun. Cukup buka di browser Anda dan mulai bekerja.</li>
        </ul>

        <p>
          Kami berdedikasi untuk terus meningkatkan platform ini dengan fitur-fitur baru yang bermanfaat bagi produktivitas Anda. Terima kasih telah memilih Zentridox sebagai alat manajemen dokumen Anda!
        </p>
      </div>
    </ToolContainer>
  );
};

export default AboutUs;
