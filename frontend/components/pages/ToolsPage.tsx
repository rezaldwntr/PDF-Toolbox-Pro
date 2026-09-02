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
        flex flex-col items-start p-[24px] rounded-lg border transition-colors duration-300 w-full text-left min-h-[180px] justify-between
        ${tool.active 
            ? 'bg-apple-canvas dark:bg-[#272729] border-apple-hairline dark:border-[#333333] hover:border-apple-primary dark:hover:border-apple-primary cursor-pointer' 
            : 'bg-apple-parchment dark:bg-[#2a2a2c] border-transparent opacity-50 cursor-not-allowed grayscale'}
    `}
  >
    <div className={`p-3 rounded-md transition-colors duration-300 ${tool.active ? 'bg-apple-parchment dark:bg-[#333333] text-apple-ink dark:text-white' : 'bg-transparent text-[#7a7a7a]'}`}>
        {React.cloneElement(tool.icon as React.ReactElement<{ className?: string }>, { className: 'w-8 h-8' })}
    </div>
    
    <div>
        <span className={`text-[17px] font-semibold tracking-tight-md block mb-1 ${tool.active ? 'text-apple-ink dark:text-white' : 'text-apple-inkMuted80 dark:text-[#7a7a7a]'}`}>
            {tool.label}
        </span>
        <span className="text-[14px] text-apple-inkMuted80 dark:text-[#a1a1a6] font-normal tracking-caption">
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
    <div className="pb-20 animate-fade-in px-4 sm:px-6 lg:px-8 mt-[48px] max-w-[1440px] mx-auto w-full">
      <div className="space-y-[80px]">
        {categories.map((category, idx) => (
          <section key={idx}>
            <div className="mb-8 border-b border-apple-hairline dark:border-[#333333] pb-2">
                <h3 className="text-[34px] font-semibold text-apple-ink dark:text-white tracking-tight-md font-display">
                {category.title}
                </h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
