import React from 'react';
import { View } from '../../types';
import { 
  MergeIcon, SplitIcon, CompressIcon, ConvertIcon, 
  TextIcon, SignatureIcon, OrganizeIcon, OcrIcon, 
  CropIcon, LockIcon, UnlockIcon, ShieldIcon, 
  EyeOffIcon, WrenchIcon, GlobeIcon, EditDocIcon,
  PageNumberIcon, WatermarkIcon
} from '../icons';
import { useToast } from '../../contexts/ToastContext';

interface ToolsPageProps {
  onSelectTool: (view: View) => void;
}

interface ToolItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  view?: View;
  onClick: () => void;
}

// Komponen item individual untuk grid alat
const ToolItem: React.FC<ToolItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 h-28 w-full ${
      active 
        ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md cursor-pointer' 
        : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 cursor-default opacity-60'
    }`}
  >
    <div className={`mb-3 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
      {icon}
    </div>
    <span className={`text-xs font-medium text-center ${active ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
      {label}
    </span>
    {!active && (
      <span className="mt-2 text-[9px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
        Segera
      </span>
    )}
  </button>
);

// Halaman yang menampilkan semua alat yang tersedia dalam kategori
const ToolsPage: React.FC<ToolsPageProps> = ({ onSelectTool }) => {
  const { addToast } = useToast();

  const handleInactiveClick = (label: string) => {
    addToast(`Fitur "${label}" sedang kami siapkan untuk update berikutnya! Nantikan ya.`, 'info');
  };

  // Konfigurasi Kategori dan Alat
  const categories = [
    {
      title: "Esensial & Populer",
      tools: [
        { label: "Kompres PDF", icon: <CompressIcon />, active: true, view: View.COMPRESS },
        { label: "Gabungkan PDF", icon: <MergeIcon />, active: true, view: View.MERGE },
        { label: "Konversi PDF", icon: <ConvertIcon />, active: true, view: View.CONVERT },
        { label: "Tanda Tangan", icon: <SignatureIcon />, active: true, view: View.ADD_SIGNATURE },
      ]
    },
    {
      title: "Edit & Organisasi",
      tools: [
        { label: "Atur PDF", icon: <OrganizeIcon />, active: true, view: View.ORGANIZE },
        { label: "Pisahkan PDF", icon: <SplitIcon />, active: true, view: View.SPLIT },
        { label: "Tambah Teks", icon: <TextIcon />, active: true, view: View.ADD_TEXT },
        { label: "Edit Teks", icon: <EditDocIcon />, active: false }, // Coming soon
        { label: "Crop PDF", icon: <CropIcon />, active: false }, // Coming soon
        { label: "Nomor Hal", icon: <PageNumberIcon />, active: false }, // Coming soon
        { label: "Watermark", icon: <WatermarkIcon />, active: false }, // Coming soon
      ]
    },
    {
      title: "Lanjutan & OCR",
      tools: [
        { label: "OCR PDF", icon: <OcrIcon />, active: false }, // Coming soon - Killer Feature
        { label: "Ke PDF/A", icon: <ConvertIcon />, active: false }, // Coming soon
      ]
    },
    {
      title: "Keamanan & Utilitas",
      tools: [
        { label: "Proteksi PDF", icon: <LockIcon />, active: false }, // Coming soon
        { label: "Buka Kunci", icon: <UnlockIcon />, active: false }, // Coming soon
        { label: "Redaksi PDF", icon: <EyeOffIcon />, active: false }, // Coming soon
        { label: "Perbaiki PDF", icon: <WrenchIcon />, active: false }, // Coming soon
        { label: "Terjemahkan", icon: <GlobeIcon />, active: false }, // Coming soon
      ]
    }
  ];

  return (
    <div className="pb-20 animate-fade-in">
      <div className="mb-8 px-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Semua Alat</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Temukan alat yang tepat untuk kebutuhan dokumen Anda.</p>
      </div>

      <div className="space-y-8">
        {categories.map((category, idx) => (
          <section key={idx}>
            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-2 border-l-4 border-blue-600 pl-3">
              {category.title}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {category.tools.map((tool, tIdx) => (
                <ToolItem 
                  key={tIdx}
                  icon={tool.icon}
                  label={tool.label}
                  active={tool.active}
                  onClick={() => tool.active && tool.view ? onSelectTool(tool.view) : handleInactiveClick(tool.label)}
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