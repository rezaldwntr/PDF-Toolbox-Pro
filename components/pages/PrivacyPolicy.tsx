import React from 'react';
import ToolContainer from '../common/ToolContainer';

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <ToolContainer title="Kebijakan Privasi" onBack={onBack} maxWidth="max-w-4xl">
      <div className="prose prose-invert prose-lg max-w-none text-slate-300">
        <p>Privasi Anda sangat penting bagi kami. Kebijakan ini menjelaskan bagaimana kami menangani data Anda.</p>
        
        <h4>1. Pemrosesan Sisi Klien</h4>
        <p>
          Semua pemrosesan PDF (menggabungkan, memisahkan, mengompres, dll.) terjadi langsung di browser web Anda. File Anda <strong>tidak pernah</strong> diunggah ke server kami atau server pihak ketiga mana pun. File-file tersebut tetap berada di perangkat Anda setiap saat.
        </p>

        <h4>2. Tidak Ada Pengumpulan Data</h4>
        <p>
          Kami tidak mengumpulkan, menyimpan, atau membagikan informasi pribadi apa pun atau konten file Anda.
        </p>
        
        <h4>3. Iklan Pihak Ketiga (Google AdSense)</h4>
        <p>
          Untuk mendukung layanan gratis ini, kami dapat menampilkan iklan dari Google AdSense.
        </p>
        <ul>
          <li>Google dan mitranya menggunakan cookie untuk menayangkan iklan berdasarkan kunjungan pengguna sebelumnya ke situs web ini atau situs web lain.</li>
          <li>Penggunaan cookie iklan oleh Google memungkinkan Google dan mitranya untuk menayangkan iklan kepada pengguna Anda berdasarkan kunjungan mereka ke situs Anda dan/atau situs lain di Internet.</li>
          <li>Pengguna dapat memilih keluar dari iklan yang dipersonalisasi dengan mengunjungi <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Setelan Iklan</a>.</li>
          <li>Silakan tinjau <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Privasi & Persyaratan Google</a> untuk informasi lebih lanjut tentang cara mereka menangani data.</li>
        </ul>
        
        <h4>4. Perubahan pada Kebijakan Ini</h4>
        <p>
          Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu. Kami mendorong Anda untuk meninjau halaman ini secara berkala untuk setiap perubahan.
        </p>
      </div>
    </ToolContainer>
  );
};

export default PrivacyPolicy;
