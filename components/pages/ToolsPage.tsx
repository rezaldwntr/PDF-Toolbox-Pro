
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

interface ToolConfig {
    label: string;
    icon: React.ReactNode;
    active: boolean;
    view?: View;
}

interface CategoryConfig {
    title: string;
    tools: ToolConfig[];
}

const ToolItem: React.FC<{ tool: ToolConfig; onClick: () => void }> = ({ tool, onClick }) => (
  <button
    onClick={onClick}
    disabled={!tool.active}
    className={`
        relative flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 w-full aspect-[4/3] group
        ${tool.active 
            ? 'bg-white dark:bg-[#1e293b] border-gray-100 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 cursor-pointer' 
            : 'bg-gray-50 dark:bg-slate-800/50 border-transparent dark:border-slate-800 cursor-not-allowed opacity-70'}
    `}
  >
    <div className={`mb-3 transition-transform duration-300 group-hover:scale-110 ${tool.active ? 'text-blue-600 dark:text-blue-500' : 'text-gray-400 dark:text-slate-600'}`}>
      {React.cloneElement(tool.icon as React.ReactElement<{ className?: string }>, { className: 'w-8 h-8 md:w-10 md:h-10' })}
    </div>
    <span className={`text-xs md:text-sm font-bold text-center leading-tight ${tool.active ? 'text-gray-800 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>
      {tool.label}
    </span>
    {!tool.active && (
      <span className="absolute top-3 right-3 text-[9px] font-bold text-gray-500 dark:text-slate-500 bg-gray-200 dark:bg-slate-700/50 px-1.5 py-0.5 rounded border border-gray-300 dark:border-slate-600">
        SEGERA
      </span>
    )}
  </button>
);

const ToolsPage: React.FC<ToolsPageProps> = ({ onSelectTool }) => {
  const { addToast } = useToast();

  const categories: CategoryConfig[] = [
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
    <div className="pb-20 animate-fade-in pt-4">
      <div className="space-y-12">
        {categories.map((category, idx) => (
          <section key={idx}>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                <h3 className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">
                {category.title}
                </h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {category.tools.map((tool, tIdx) => (
                <ToolItem 
                  key={tIdx}
                  tool={tool}
                  onClick={() => tool.active && tool.view ? onSelectTool(tool.view) : addToast("Fitur ini akan segera hadir!", "info")}
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
