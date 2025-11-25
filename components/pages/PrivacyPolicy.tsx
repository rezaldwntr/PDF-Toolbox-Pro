
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
      <div className="prose prose-gray prose-lg max-w-none text-gray-700">
        <p><strong>Terakhir diperbarui:</strong> {formattedDate}</p>
        <p>
          Privasi Anda sangat penting bagi kami. Kebijakan Privasi ini menjelaskan bagaimana kami menangani data Anda saat Anda menggunakan Zentridox. Dengan menggunakan situs web kami, Anda menyetujui praktik yang dijelaskan dalam kebijakan ini.
        </p>

        <h4>1. Privasi File Anda: Pemrosesan di Sisi Klien</h4>
        <p>
          Kami memahami sensitivitas dokumen Anda. Oleh karena itu, semua pemrosesan PDF (menggabungkan, memisahkan, mengompres, dll.) terjadi langsung di browser web Anda menggunakan JavaScript. File Anda <strong>TIDAK PERNAH</strong> diunggah, disimpan, atau ditransmisikan ke server kami atau server pihak ketiga mana pun. File-file tersebut tetap berada secara eksklusif di perangkat Anda setiap saat.
        </p>

        <h4>2. Informasi yang Kami Kumpulkan (Data Log)</h4>
        <p>
          Seperti kebanyakan situs web, penyedia hosting kami dapat mengumpulkan informasi yang dikirimkan browser Anda ("Data Log"). Data ini mungkin mencakup alamat Protokol Internet (IP) Anda, jenis browser, halaman yang Anda kunjungi, dan statistik lainnya. Data ini digunakan untuk tujuan analitik dan keamanan, dan tidak ditautkan ke file yang Anda proses.
        </p>

        <h4>3. Cookies dan Iklan Pihak Ketiga (Google AdSense)</h4>
        <p>
          Situs ini menggunakan "cookies" dan menampilkan iklan untuk menjaga agar layanan tetap gratis.
        </p>
        <ul>
          <li>Kami menggunakan vendor pihak ketiga, termasuk Google, untuk menayangkan iklan di situs kami.</li>
          <li>Google, sebagai vendor pihak ketiga, menggunakan cookies (seperti cookie DART) untuk menayangkan iklan berdasarkan kunjungan pengguna sebelumnya ke situs kami atau situs lain di internet.</li>
          <li>Anda dapat memilih keluar dari iklan yang dipersonalisasi dengan mengunjungi <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">Setelan Iklan Google</a>.</li>
          <li>Untuk pengguna di Wilayah Ekonomi Eropa (EEA), iklan ditampilkan sesuai dengan persetujuan yang Anda berikan.</li>
          <li>Silakan tinjau <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">Privasi & Persyaratan Google</a> untuk informasi lebih lanjut tentang cara mereka menangani data.</li>
        </ul>

        <h4>4. Keamanan</h4>
        <p>
          Kami menggunakan koneksi terenkripsi (HTTPS) untuk melindungi data yang ditransmisikan antara browser Anda dan server hosting kami. Namun, perlu diingat bahwa tidak ada metode transmisi melalui Internet yang 100% aman.
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
