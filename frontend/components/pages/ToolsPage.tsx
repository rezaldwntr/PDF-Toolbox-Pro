import React from 'react';
import { View } from '../../types';
import ToolCard from '../ToolCard';
import { 
  FileText, 
  Layers, 
  Minimize2, 
  PenTool, 
  FileSpreadsheet, 
  Presentation, 
  Image, 
  FileCheck, 
  FolderTree, 
  Scissors, 
  Type, 
  Edit3, 
  Crop, 
  Stamp, 
  Eye, 
  Lock, 
  Unlock, 
  Languages 
} from 'lucide-react';

interface ToolsPageProps {
  onSelectTool: (view: View) => void;
}

const ToolsPage: React.FC<ToolsPageProps> = ({ onSelectTool }) => {
  const categories = [
    {
      title: "1. Esensial & Populer",
      tools: [
        { title: "PDF ke Word", description: "Konversi berkas PDF menjadi dokumen Word DOCX.", icon: <FileText size={22} />, active: true, view: View.PDF_TO_WORD },
        { title: "Gabungkan PDF", description: "Satukan beberapa PDF menjadi satu dokumen urut.", icon: <Layers size={22} />, active: true, view: View.MERGE },
        { title: "Kompres PDF", description: "Perkecil ukuran dokumen PDF tanpa pecah.", icon: <Minimize2 size={22} />, active: true, view: View.COMPRESS },
        { title: "Tanda Tangan", description: "Tambahkan tanda tangan digital langsung.", icon: <PenTool size={22} />, active: true, view: View.ADD_SIGNATURE },
      ]
    },
    {
      title: "2. Konversi PDF",
      tools: [
        { title: "PDF ke Excel", description: "Ekstrak tabel PDF ke spreadsheet Excel.", icon: <FileSpreadsheet size={22} />, active: true, view: View.PDF_TO_EXCEL },
        { title: "PDF ke PPT", description: "Ubah slide PDF menjadi presentasi PowerPoint.", icon: <Presentation size={22} />, active: true, view: View.PDF_TO_PPT },
        { title: "PDF ke Gambar (JPG)", description: "Simpan halaman PDF sebagai gambar tajam.", icon: <Image size={22} />, active: true, view: View.PDF_TO_IMAGE },
        { title: "PDF/A", description: "Format arsip jangka panjang berstandar ISO.", icon: <FileCheck size={22} />, active: false },
      ]
    },
    {
      title: "3. Edit & Organisasi",
      tools: [
        { title: "Atur PDF", description: "Hapus, putar, atau ubah urutan halaman.", icon: <FolderTree size={22} />, active: true, view: View.ORGANIZE },
        { title: "Pisahkan PDF", description: "Pisahkan file atau ambil halaman tertentu.", icon: <Scissors size={22} />, active: true, view: View.SPLIT },
        { title: "Tambah Teks", description: "Ketik teks tambahan di halaman dokumen.", icon: <Type size={22} />, active: true, view: View.ADD_TEXT },
        { title: "Edit Teks", description: "Sunting teks yang sudah ada di dokumen.", icon: <Edit3 size={22} />, active: false },
        { title: "Crop PDF", description: "Pangkas bagian tepi berkas yang tidak perlu.", icon: <Crop size={22} />, active: false },
        { title: "Watermark", description: "Bubuhkan cap air perlindungan hak cipta.", icon: <Stamp size={22} />, active: false },
      ]
    },
    {
      title: "4. Keamanan & Lanjutan",
      tools: [
        { title: "OCR PDF", description: "Pindai dan kenali teks dari gambar scan.", icon: <Eye size={22} />, active: false },
        { title: "Proteksi PDF", description: "Kunci dokumen dengan kata sandi kuat.", icon: <Lock size={22} />, active: false },
        { title: "Buka Kunci", description: "Buka sandi perlindungan PDF milik Anda.", icon: <Unlock size={22} />, active: false },
        { title: "Terjemahkan", description: "Terjemahkan teks dokumen secara otomatis.", icon: <Languages size={22} />, active: false },
      ]
    }
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full animate-fade-in">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
          Katalog Lengkap Alat PDF
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Semua alat yang Anda butuhkan untuk mengelola dokumen PDF secara mudah, cepat, dan aman dalam satu tempat.
        </p>
      </div>

      <div className="space-y-12">
        {categories.map((category) => (
          <div key={category.title} className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 tracking-tight">
              {category.title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {category.tools.map((tool) => (
                <ToolCard
                  key={tool.title}
                  title={tool.title}
                  description={tool.description}
                  icon={tool.icon}
                  active={tool.active}
                  onClick={() => tool.view && onSelectTool(tool.view)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolsPage;
