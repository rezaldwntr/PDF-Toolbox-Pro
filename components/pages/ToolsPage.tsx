
import React from 'react';
import { View } from '../../types';
import { 
  MergeIcon, SplitIcon, CompressIcon, 
  FileWordIcon, FileExcelIcon, FilePptIcon, FileJpgIcon,
  TextIcon, SignatureIcon, OrganizeIcon, OcrIcon, 
  CropIcon, LockIcon, UnlockIcon, ShieldIcon, 
  EyeOffIcon, WrenchIcon, GlobeIcon, EditDocIcon,
  PageNumberIcon, WatermarkIcon
} from '../icons';
import { useToast } from '../../contexts/ToastContext';

interface ToolsPageProps {
  onSelectTool: (view: View) => void;
}

const ToolItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 h-28 w-full ${
      active 
        ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-blue-500 hover:shadow-md cursor-pointer' 
        : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 cursor-default opacity-60'
    }`}
  >
    <div className={`mb-2 ${active ? 'text-blue-600' : 'text-gray-400'}`}>
      {/* Fix: Explicitly cast the icon element to accept className prop for cloning */}
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-8 h-8' })}
    </div>
    <span className={`text-[11px] font-bold text-center leading-tight ${active ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>
      {label}
    </span>
    {!active && (
      <span className="mt-1 text-[8px] uppercase font-black text-gray-500 bg-gray-200 dark:bg-slate-700 px-1 rounded">
        Segera
      </span>
    )}
  </button>
);

const ToolsPage: React.FC<ToolsPageProps> = ({ onSelectTool }) => {
  const { addToast } = useToast();

  const categories = [
    {
      title: "Esensial & Populer",
      tools: [
        { label: "PDF ke Word", icon: <FileWordIcon />, active: true, view: View.PDF_TO_WORD },
        { label: "Gabungkan PDF", icon: <MergeIcon />, active: true, view: View.MERGE },
        { label: "Kompres PDF", icon: <CompressIcon />, active: true, view: View.COMPRESS },
        { label: "Tanda Tangan", icon: <SignatureIcon />, active: true, view: View.ADD_SIGNATURE },
      ]
    },
    {
      title: "Konversi PDF",
      tools: [
        { label: "PDF ke Excel", icon: <FileExcelIcon />, active: true, view: View.PDF_TO_EXCEL },
        { label: "PDF ke PPT", icon: <FilePptIcon />, active: true, view: View.PDF_TO_PPT },
        { label: "PDF ke Gambar", icon: <FileJpgIcon />, active: true, view: View.PDF_TO_IMAGE },
        { label: "Ke PDF/A", icon: <LockIcon />, active: false },
      ]
    },
    {
      title: "Edit & Organisasi",
      tools: [
        { label: "Atur PDF", icon: <OrganizeIcon />, active: true, view: View.ORGANIZE },
        { label: "Pisahkan PDF", icon: <SplitIcon />, active: true, view: View.SPLIT },
        { label: "Tambah Teks", icon: <TextIcon />, active: true, view: View.ADD_TEXT },
        { label: "Edit Teks", icon: <EditDocIcon />, active: false },
        { label: "Crop PDF", icon: <CropIcon />, active: false },
        { label: "Watermark", icon: <WatermarkIcon />, active: false },
      ]
    },
    {
      title: "Keamanan & Lanjutan",
      tools: [
        { label: "OCR PDF", icon: <OcrIcon />, active: false },
        { label: "Proteksi PDF", icon: <LockIcon />, active: false },
        { label: "Buka Kunci", icon: <UnlockIcon />, active: false },
        { label: "Terjemahkan", icon: <GlobeIcon />, active: false },
      ]
    }
  ];

  return (
    <div className="pb-20 animate-fade-in">
      <div className="mb-8 px-2 text-center md:text-left">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Semua Alat PDF</h2>
        <p className="text-gray-500 dark:text-gray-400">Solusi lengkap untuk produktivitas dokumen Anda.</p>
      </div>

      <div className="space-y-10">
        {categories.map((category, idx) => (
          <section key={idx}>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-2 border-l-4 border-blue-600 pl-3">
              {category.title}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {category.tools.map((tool, tIdx) => (
                <ToolItem 
                  key={tIdx}
                  icon={tool.icon}
                  label={tool.label}
                  active={tool.active}
                  onClick={() => tool.active && tool.view ? onSelectTool(tool.view) : addToast("Segera hadir!", "info")}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default ToolsPage;
