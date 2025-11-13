import React from 'react';
import ToolContainer from '../common/ToolContainer';

interface AboutUsProps {
  onBack: () => void;
}

const AboutUs: React.FC<AboutUsProps> = ({ onBack }) => {
  return (
    <ToolContainer title="Tentang Kami" onBack={onBack} maxWidth="max-w-3xl">
      <div className="prose prose-invert prose-lg max-w-none text-slate-300">
        <p>
          PDF Toolbox Pro dibuat dengan tujuan sederhana: menyediakan seperangkat alat yang cepat, gratis, dan aman untuk semua kebutuhan PDF Anda. Kami percaya bahwa manajemen dokumen yang kuat harus dapat diakses oleh semua orang, tanpa iklan yang mengganggu atau keharusan untuk mengunggah file sensitif Anda ke server.
        </p>
        <p>
          Aplikasi kami berjalan sepenuhnya di browser Anda, yang berarti file Anda tidak pernah meninggalkan komputer Anda. Ini memastikan privasi Anda selalu terlindungi.
        </p>
        <p>
          Proyek ini dihidupkan oleh{' '}
          <a
            href="https://instagram.com/rezaldwntr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            @rezaldwntr
          </a>
          , seorang pengembang yang bersemangat dalam membangun aplikasi web yang berguna dan ramah pengguna.
        </p>
      </div>
    </ToolContainer>
  );
};

export default AboutUs;
