
import React from 'react';
import { View } from '../../types';
import { 
  MergeIcon, SplitIcon, CompressIcon, 
  FileWordIcon, FileExcelIcon, FilePptIcon, FileJpgIcon,
  TextIcon, SignatureIcon, OrganizeIcon, OcrIcon, 
  CropIcon, LockIcon, UnlockIcon, 
  GlobeIcon, EditDocIcon, WatermarkIcon
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
        relative flex flex-col items-start p-6 rounded-3xl border transition-all duration-300 w-full group text-left min-h-[160px] justify-between
        ${tool.active 
            ? 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 cursor-pointer' 
            : 'bg-slate-50 dark:bg-slate-800/50 border-transparent opacity-50 cursor-not-allowed grayscale'}
    `}
  >
    <div className={`p-3 rounded-2xl transition-colors duration-300 ${tool.active ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white' : 'bg-slate-200 text-slate-400'}`}>
        {React.cloneElement(tool.icon as React.ReactElement<{ className?: string }>, { className: 'w-8 h-8' })}
    </div>
    
    <div>
        <span className={`text-base font-bold block mb-1 ${tool.active ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>
            {tool.label}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            {tool.active ? "Proses sekarang" : "Segera hadir"}
        </span>
    </div>
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
    <div className="pb-20 animate-fade-in pt-4 px-2">
      <div className="space-y-12">
        {categories.map((category, idx) => (
          <section key={idx}>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">
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
