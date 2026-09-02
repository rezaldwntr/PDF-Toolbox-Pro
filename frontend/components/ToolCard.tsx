import React from 'react';

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

// Komponen kartu yang digunakan untuk menampilkan daftar alat PDF di halaman ToolsPage
const ToolCard: React.FC<ToolCardProps> = ({ icon, title, description, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-apple-canvas p-[24px] rounded-lg border border-apple-hairline hover:border-apple-primary cursor-pointer transition-colors duration-300 flex flex-col items-start h-full dark:bg-[#272729] dark:border-[#333333] dark:hover:border-apple-primary"
    >
      <div className="bg-[#f5f5f7] dark:bg-[#333333] p-3 rounded-md text-apple-ink dark:text-white mb-4">
        {icon}
      </div>
      <h3 className="text-[17px] font-semibold text-apple-ink dark:text-white mb-2 tracking-tight-md">{title}</h3>
      <p className="text-[14px] text-apple-inkMuted80 dark:text-[#a1a1a6] flex-grow leading-snug tracking-caption">{description}</p>
    </div>
  );
};

export default ToolCard;