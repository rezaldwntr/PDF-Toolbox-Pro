import React from 'react';
import { View } from '../../types';
import ToolCard, { EngineType } from '../ToolCard';
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
  Landmark,
  Languages,
  ShieldCheck 
} from 'lucide-react';

interface ToolItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  active: boolean;
  view: View;
  engineType: EngineType;
  badge?: string;
}

interface ToolsPageProps {
  onSelectTool: (view: View) => void;
}

const ToolsPage: React.FC<ToolsPageProps> = ({ onSelectTool }) => {
  const categories: { title: string; tools: ToolItem[] }[] = [
    {
      title: "1. Esensial & Populer",
      tools: [
        { title: "PDF ke Word", description: "Konversi berkas PDF menjadi dokumen Word DOCX yang dapat diedit.", icon: <FileText size={20} />, active: true, view: View.PDF_TO_WORD, engineType: 'cloud' },
        { title: "Gabungkan PDF", description: "Satukan beberapa PDF menjadi satu dokumen urut di RAM lokal.", icon: <Layers size={20} />, active: true, view: View.MERGE, engineType: 'client' },
        { title: "Kompres PDF", description: "Kecilkan ukuran dokumen PDF tanpa pecah (Preset CPNS 200KB).", icon: <Minimize2 size={20} />, active: true, view: View.COMPRESS, engineType: 'fast' },
        { title: "Tanda Tangan & e-Meterai", description: "Tambahkan tanda tangan digital dan panduan e-Meterai resmi.", icon: <PenTool size={20} />, active: true, view: View.ADD_SIGNATURE, engineType: 'client' },
      ]
    },
    {
      title: "2. Konversi & Finansial",
      tools: [
        { title: "Rekening Koran ke Excel", description: "Ekstrak mutasi PDF bank BCA, Mandiri, BRI, BNI, BSI, BPD ke XLSX.", icon: <Landmark size={20} />, active: true, view: View.BANK_STATEMENT, engineType: 'fast', badge: 'BARU' },
        { title: "PDF ke Excel", description: "Ekstrak tabel dan data tabular PDF ke spreadsheet Excel.", icon: <FileSpreadsheet size={20} />, active: true, view: View.PDF_TO_EXCEL, engineType: 'cloud' },
        { title: "PDF ke PPT", description: "Ubah slide presentasi PDF menjadi slide PowerPoint PPTX.", icon: <Presentation size={20} />, active: true, view: View.PDF_TO_PPT, engineType: 'cloud' },
        { title: "PDF ke Gambar (JPG)", description: "Simpan halaman PDF sebagai gambar tajam resolusi tinggi.", icon: <Image size={20} />, active: true, view: View.PDF_TO_IMAGE, engineType: 'cloud' },
        { title: "PDF/A Converter", description: "Format arsip jangka panjang berstandar ISO 19005.", icon: <FileCheck size={20} />, active: true, view: View.PDF_A, engineType: 'cloud' },
      ]
    },
    {
      title: "3. Edit & Organisasi Halaman",
      tools: [
        { title: "Atur & Susun PDF", description: "Hapus, putar, atau ubah urutan halaman dengan kanvas visual.", icon: <FolderTree size={20} />, active: true, view: View.ORGANIZE, engineType: 'client' },
        { title: "Pisahkan PDF", description: "Pisahkan berkas atau ekstrak halaman tertentu di memori browser.", icon: <Scissors size={20} />, active: true, view: View.SPLIT, engineType: 'client' },
        { title: "Tambah Teks", description: "Ketik dan letakkan teks tambahan di koordinat halaman dokumen.", icon: <Type size={20} />, active: true, view: View.ADD_TEXT, engineType: 'client' },
        { title: "Edit Teks PDF", description: "Sunting teks asli yang sudah ada di dokumen PDF.", icon: <Edit3 size={20} />, active: true, view: View.EDIT_PDF, engineType: 'cloud' },
        { title: "Crop PDF", description: "Pangkas bagian tepi berkas atau margin kosong yang tidak perlu.", icon: <Crop size={20} />, active: true, view: View.CROP_PDF, engineType: 'client' },
        { title: "Cap Air (Watermark)", description: "Bubuhkan cap air teks atau logo perlindungan hak cipta dokumen.", icon: <Stamp size={20} />, active: true, view: View.WATERMARK, engineType: 'fast' },
      ]
    },
    {
      title: "4. Keamanan, AI & Privasi",
      tools: [
        { title: "Sensor PII (UU PDP)", description: "Sensor permanen NIK, NPWP, No Rekening, HP, & Email UU PDP No. 27/2022.", icon: <ShieldCheck size={20} />, active: true, view: View.REDACT_PDF, engineType: 'fast', badge: 'UU PDP' },
        { title: "Proteksi Sandi PDF", description: "Kunci dokumen dengan kata sandi kuat dan enkripsi AES-256.", icon: <Lock size={20} />, active: true, view: View.PROTECT_PDF, engineType: 'fast' },
        { title: "Buka Kunci PDF", description: "Buka dan dekripsi perlindungan PDF milik Anda.", icon: <Unlock size={20} />, active: true, view: View.UNLOCK_PDF, engineType: 'fast' },
        { title: "OCR PDF", description: "Pindai dan kenali teks dari gambar scan menjadi Searchable PDF.", icon: <Eye size={20} />, active: true, view: View.OCR_PDF, engineType: 'cloud' },
        { title: "Terjemahkan PDF", description: "Terjemahkan dokumen ke 30+ bahasa dengan Gemini Multimodal AI.", icon: <Languages size={20} />, active: true, view: View.TRANSLATE_PDF, engineType: 'cloud' },
      ]
    }
  ];

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full animate-fade-in">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mb-2">
          Katalog Lengkap Perkakas PDF
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary">
          Seluruh perkakas terstruktur berdasarkan arsitektur mesin: RAM Lokal, Server Fast, dan Heavy Cloud.
        </p>
      </div>

      <div className="space-y-10">
        {categories.map((category) => (
          <div key={category.title} className="space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-text-primary border-b border-border-subtle pb-2.5 tracking-tight">
              {category.title}
            </h2>
            {/* Grid 3 Kolom Sesuai Spesifikasi Design Bible Section 3.3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {category.tools.map((tool) => (
                <ToolCard
                  key={tool.title}
                  title={tool.title}
                  description={tool.description}
                  icon={tool.icon}
                  active={tool.active}
                  engineType={tool.engineType}
                  badge={tool.badge}
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
