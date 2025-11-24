

import React from 'react';
import { View } from '../types';
import ToolCard from './ToolCard';
import { MergeIcon, SplitIcon, CompressIcon, TextIcon, SignatureIcon, OrganizeIcon, ConvertIcon } from './icons';

interface LandingPageProps {
  onSelectView: (view: View) => void;
}

const tools = [
  {
    tool: View.MERGE,
    icon: <MergeIcon />,
    title: 'Gabungkan PDF',
    description: 'Satukan beberapa file PDF menjadi satu dokumen.',
  },
  {
    tool: View.SPLIT,
    icon: <SplitIcon />,
    title: 'Pisahkan PDF',
    description: 'Ekstrak halaman atau ubah setiap halaman menjadi PDF terpisah.',
  },
  {
    tool: View.COMPRESS,
    icon: <CompressIcon />,
    title: 'Kompres PDF',
    description: 'Kurangi ukuran file PDF dengan tetap menjaga kualitas terbaik.',
  },
  {
    tool: View.CONVERT,
    icon: <ConvertIcon />,
    title: 'Konversi PDF',
    description: 'Ubah PDF ke Word, Excel, PowerPoint, atau JPG dengan mudah.',
  },
  {
    tool: View.ADD_TEXT,
    icon: <TextIcon />,
    title: 'Tambahkan Teks',
    description: 'Tulis teks atau tambahkan anotasi ke dokumen PDF Anda.',
  },
  {
    tool: View.ADD_SIGNATURE,
    icon: <SignatureIcon />,
    title: 'Tambahkan Tanda Tangan',
    description: 'Tanda tangani dokumen PDF secara digital dengan mudah.',
  },
  {
    tool: View.ORGANIZE,
    icon: <OrganizeIcon />,
    title: 'Atur PDF',
    description: 'Hapus, putar, dan urutkan ulang halaman PDF sesuai keinginan.',
  },
];

const LandingPage: React.FC<LandingPageProps> = ({ onSelectView }) => {
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4 text-slate-100">Solusi PDF Lengkap Anda</h2>
      <p className="text-lg text-slate-400 text-center mb-12 max-w-2xl">
        Akses semua alat yang Anda butuhkan untuk bekerja dengan PDF dalam satu tempat. Cepat, mudah, dan gratis.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {tools.map((toolInfo) => (
          <ToolCard
            key={toolInfo.tool}
            icon={toolInfo.icon}
            title={toolInfo.title}
            description={toolInfo.description}
            onClick={() => onSelectView(toolInfo.tool)}
          />
        ))}
      </div>
    </div>
  );
};

export default LandingPage;