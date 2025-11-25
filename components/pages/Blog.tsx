
import React from 'react';
import ToolContainer from '../common/ToolContainer';

interface BlogProps {
  onBack: () => void;
}

const blogPosts = [
  {
    title: '5 Tips Mengompres PDF Tanpa Kehilangan Kualitas',
    summary: 'Pelajari rahasia untuk membuat file PDF Anda lebih kecil dan mudah dibagikan melalui email, tanpa mengubah gambar Anda menjadi buram.',
    link: '#',
  },
  {
    title: 'Mengapa Anda Harus Menggunakan Tanda Tangan Digital untuk Dokumen Anda',
    summary: 'Temukan manfaat menandatangani dokumen secara digital, mulai dari keamanan yang ditingkatkan hingga efisiensi alur kerja yang lebih baik.',
    link: '#',
  },
  {
    title: 'Mengatur PDF Anda: Panduan untuk Memisahkan, Menggabungkan, dan Mengurutkan Halaman',
    summary: 'Atasi dokumen-dokumen kacau Anda. Panduan ini menunjukkan cara menggunakan alat kami untuk membuat file PDF yang terorganisir sempurna untuk tujuan apa pun.',
    link: '#',
  },
];

const Blog: React.FC<BlogProps> = ({ onBack }) => {
  return (
    <ToolContainer title="Blog & Artikel" onBack={onBack} maxWidth="max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blogPosts.map((post, index) => (
          <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col items-start hover:border-blue-500 hover:shadow-md transition-all duration-300">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h3>
            <p className="text-gray-600 text-sm flex-grow">{post.summary}</p>
            <button
                onClick={() => alert('Detail artikel akan segera hadir!')}
                className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-500 transition-colors"
            >
              Baca Selengkapnya &rarr;
            </button>
          </div>
        ))}
      </div>
    </ToolContainer>
  );
};

export default Blog;
