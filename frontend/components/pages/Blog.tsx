
import React from 'react';
import ToolContainer from '../common/ToolContainer';

const blogPosts = [
  { 
    title: 'Tips Menggabungkan Dokumen Lamaran Kerja', 
    summary: 'Jangan kirim banyak file terpisah. Pelajari cara menggabungkan CV, Surat Lamaran, dan Portofolio menjadi satu PDF profesional.', 
    color: 'bg-blue-100 text-blue-600',
    readTime: '3 min baca'
  },
  { 
    title: 'Kompres PDF: Hemat Ruang Tanpa Buram', 
    summary: 'Bagaimana cara kerja algoritma kompresi kami mengurangi ukuran file hingga 50% tanpa merusak keterbacaan teks dan gambar.', 
    color: 'bg-green-100 text-green-600',
    readTime: '4 min baca'
  },
  { 
    title: 'Ubah PDF ke Word untuk Edit Ulang', 
    summary: 'Salah ketik di dokumen PDF? Jangan khawatir. Konversi ke Word, perbaiki kesalahan, dan simpan kembali dengan mudah.', 
    color: 'bg-purple-100 text-purple-600',
    readTime: '2 min baca'
  },
  { 
    title: 'Tanda Tangan Digital vs Basah', 
    summary: 'Mengapa beralih ke tanda tangan digital lebih aman, legal, dan ramah lingkungan dibandingkan mencetak dokumen.', 
    color: 'bg-orange-100 text-orange-600',
    readTime: '5 min baca'
  },
];

const Blog: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <ToolContainer title="Blog & Wawasan" onBack={onBack} maxWidth="max-w-6xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {blogPosts.map((post, index) => (
          <div key={index} className="group bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-gray-100 dark:border-slate-700 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col items-start cursor-pointer h-full">
            <div className="flex justify-between w-full items-start mb-4">
                <div className={`w-14 h-14 ${post.color} dark:bg-opacity-20 rounded-2xl flex items-center justify-center font-bold text-xl`}>
                    {index + 1}
                </div>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">{post.readTime}</span>
            </div>
            
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 transition-colors leading-tight">{post.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 flex-grow leading-relaxed">{post.summary}</p>
            
            <button className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 group/btn">
                Baca Selengkapnya 
                <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        ))}
      </div>
    </ToolContainer>
  );
};

export default Blog;
