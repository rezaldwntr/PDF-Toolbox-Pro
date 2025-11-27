
import React from 'react';
import ToolContainer from '../common/ToolContainer';

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today);

  return (
    <ToolContainer title="Kebijakan Privasi" onBack={onBack} maxWidth="max-w-4xl">
      <div className="prose prose-gray dark:prose-invert prose-lg max-w-none text-gray-700 dark:text-gray-300">
        <p><strong>Terakhir diperbarui:</strong> {formattedDate}</p>
        <p>
          Privasi Anda sangat penting bagi kami. Kebijakan Privasi ini menjelaskan bagaimana kami menangani data Anda saat Anda menggunakan Zentridox. Dengan menggunakan situs web kami, Anda menyetujui praktik yang dijelaskan dalam kebijakan ini.
        </p>

        <h4>1. Privasi File & Pemrosesan</h4>
        <p>
          Kami memprioritaskan privasi dokumen Anda dengan pendekatan berikut:
        </p>
        <ul>
          <li><strong>Pemrosesan Lokal (Client-Side):</strong> Untuk alat seperti Menggabungkan, Memisahkan, Mengompres, dan Mengedit Teks, pemrosesan dilakukan sepenuhnya di dalam browser Anda menggunakan teknologi web modern. File-file ini tidak pernah diunggah ke server kami.</li>
          <li><strong>Pemrosesan Server (Server-Side):</strong> Untuk alat Konversi Lanjutan (misalnya PDF ke Word, Excel, PowerPoint), file perlu dikirim ke server kami untuk diproses. Kami menjamin bahwa file ini hanya digunakan untuk tujuan konversi sementara dan segera dihapus dari sistem kami setelah proses selesai.</li>
        </ul>

        <h4>2. Informasi yang Kami Kumpulkan (Data Log)</h4>
        <p>
          Seperti kebanyakan situs web, penyedia hosting kami dapat mengumpulkan informasi yang dikirimkan browser Anda ("Data Log"). Data ini mungkin mencakup alamat Protokol Internet (IP) Anda, jenis browser, halaman yang Anda kunjungi, dan statistik lainnya. Data ini digunakan untuk tujuan analitik dan keamanan.
        </p>

        <h4>3. Cookies dan Iklan Pihak Ketiga (Google AdSense)</h4>
        <p>
          Situs ini menggunakan "cookies" dan menampilkan iklan untuk menjaga agar layanan tetap gratis.
        </p>
        <ul>
          <li>Kami menggunakan vendor pihak ketiga, termasuk Google, untuk menayangkan iklan di situs kami.</li>
          <li>Google, sebagai vendor pihak ketiga, menggunakan cookies (seperti cookie DART) untuk menayangkan iklan berdasarkan kunjungan pengguna sebelumnya ke situs kami atau situs lain di internet.</li>
          <li>Anda dapat memilih keluar dari iklan yang dipersonalisasi dengan mengunjungi <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">Setelan Iklan Google</a>.</li>
          <li>Untuk pengguna di Wilayah Ekonomi Eropa (EEA), iklan ditampilkan sesuai dengan persetujuan yang Anda berikan.</li>
          <li>Silakan tinjau <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">Privasi & Persyaratan Google</a> untuk informasi lebih lanjut tentang cara mereka menangani data.</li>
        </ul>

        <h4>4. Keamanan</h4>
        <p>
          Kami menggunakan koneksi terenkripsi (HTTPS) untuk melindungi data yang ditransmisikan antara browser Anda dan server kami. Kami menerapkan langkah-langkah keamanan standar industri untuk melindungi informasi Anda.
        </p>

        <h4>5. Perubahan pada Kebijakan Privasi Ini</h4>
        <p>
          Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu. Kami mendorong Anda untuk meninjau halaman ini secara berkala untuk setiap perubahan.
        </p>

        <h4>6. Hubungi Kami</h4>
        <p>
          Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini, silakan hubungi kami melalui halaman Kontak kami.
        </p>
      </div>
    </ToolContainer>
  );
};

export default PrivacyPolicy;
