
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
          Zentridox adalah solusi lengkap untuk semua kebutuhan PDF Anda. Kami percaya bahwa manajemen dokumen yang kuat harus dapat diakses oleh semua orang, tanpa iklan yang mengganggu atau keharusan untuk mengunggah file sensitif Anda ke server.
        </p>
        <ul className="list-disc list-inside">
            <li><strong>Gratis:</strong> Semua alat kami 100% gratis untuk digunakan.</li>
            <li><strong>Aman:</strong> Aplikasi kami berjalan sepenuhnya di browser Anda. File Anda tidak pernah meninggalkan komputer Anda, memastikan privasi Anda selalu terlindungi.</li>
            <li><strong>Berbasis Web:</strong> Tidak perlu mengunduh atau menginstal perangkat lunak apa pun. Cukup buka di browser Anda dan mulai bekerja.</li>
        </ul>

        <p>
          Proyek ini dihidupkan oleh{' '}
          <a
            href="https://instagram.com/rezaldwntr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            @rezaldwntr
          </a>
          , seorang pengembang yang bersemangat dalam membangun aplikasi web yang berguna dan ramah pengguna. Kami terus berupaya meningkatkan dan menambahkan fitur baru ke platform kami. Terima kasih telah menggunakan Zentridox!
        </p>
      </div>
    </ToolContainer>
  );
};

export default AboutUs;
