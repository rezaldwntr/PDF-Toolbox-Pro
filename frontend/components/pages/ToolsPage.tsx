import React, { useState, useMemo } from 'react';
import { View } from '../../types';
import ToolCard from '../ToolCard';
import { TOOL_CATEGORIES, ToolCategory } from '../../data/toolsCatalog';
import { Search, Sparkles } from 'lucide-react';

interface ToolsPageProps {
  onSelectTool: (view: View) => void;
}

const ToolsPage: React.FC<ToolsPageProps> = ({ onSelectTool }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  const totalToolsCount = useMemo(() => {
    return TOOL_CATEGORIES.reduce((acc, cat) => acc + cat.tools.length, 0);
  }, []);

  // Filter kategori berdasarkan tab dan query pencarian
  const displayedCategories = useMemo(() => {
    let base = TOOL_CATEGORIES;
    if (selectedCategoryId !== 'all') {
      base = base.filter(c => c.id === selectedCategoryId);
    }

    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();

    return base.map(cat => ({
      ...cat,
      tools: cat.tools.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.keywords.some(k => k.includes(q))
      )
    })).filter(cat => cat.tools.length > 0);
  }, [selectedCategoryId, searchQuery]);

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full animate-fade-in">
      {/* Editorial Header Radley */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#9B4819]/10 text-[#9B4819] border border-[#9B4819]/20 text-xs mb-3.5 font-medium select-none shadow-2xs">
          <Sparkles size={13} className="stroke-[2.2]" />
          <span>Direktori Lengkap {totalToolsCount} Perkakas PDF</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary tracking-tight mb-3">
          Katalog Lengkap Perkakas
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
          Seluruh utilitas terstruktur rapi berdasarkan alur kebutuhan: dokumen esensial harian, konversi format, organisasi lembar, dan kepatuhan privasi hukum.
        </p>

        {/* Quick Search Bar */}
        <div className="relative max-w-lg mx-auto mt-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
            <Search size={15} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari alat (misal: word, kompres, tanda tangan, rekening, sensor)..."
            className="w-full pl-11 pr-20 py-2.5 rounded-full bg-surface border border-border-subtle text-text-primary placeholder:text-text-secondary text-xs sm:text-sm focus:outline-none focus:border-[#9B4819] focus:ring-2 focus:ring-[#9B4819]/20 shadow-2xs hover:shadow-paper transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-semibold text-[#9B4819] hover:underline cursor-pointer"
            >
              Hapus
            </button>
          )}
        </div>

        {/* Interactive Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`px-4 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
              selectedCategoryId === 'all'
                ? 'bg-[#9B4819] text-white font-medium shadow-xs'
                : 'bg-surface hover:bg-elevated text-text-secondary border border-border-subtle hover:border-border-strong'
            }`}
          >
            Semua ({totalToolsCount})
          </button>
          {TOOL_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                selectedCategoryId === cat.id
                  ? 'bg-[#9B4819] text-white font-medium shadow-xs'
                  : 'bg-surface hover:bg-elevated text-text-secondary border border-border-subtle hover:border-border-strong'
              }`}
            >
              {cat.title.replace(/^[0-9]+\.\s*/, '')} ({cat.tools.length})
            </button>
          ))}
        </div>
      </div>

      {/* Grid Seksi Perkakas */}
      <div className="space-y-12">
        {displayedCategories.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-3xl border border-border-subtle p-8 shadow-paper max-w-xl mx-auto">
            <p className="text-text-secondary font-serif text-base mb-3">
              Tidak ada perkakas yang cocok dengan kata kunci "{searchQuery}".
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategoryId('all'); }}
              className="text-xs font-bold text-[#9B4819] hover:underline cursor-pointer"
            >
              Tampilkan semua perkakas
            </button>
          </div>
        ) : (
          displayedCategories.map((category) => {
            // Tentukan jumlah kolom yang proporsional:
            // Jika kategori memiliki 4 kartu: gunakan 4 kolom (1 baris penuh presisi!)
            // Jika kategori memiliki 6 kartu: gunakan 3 kolom (2 baris penuh presisi!)
            // Jika dalam mode filter tunggal atau pencarian: gunakan 4 kolom adaptif
            const isFourColCategory = category.tools.length === 4;
            const gridColsClass = isFourColCategory
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

            return (
              <div key={category.id} className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 border-b border-border-subtle pb-3">
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                    {category.title}
                  </h2>
                  <span className="text-xs text-text-secondary font-normal">
                    {category.description}
                  </span>
                </div>

                {/* Grid Rapi Presisi dengan gap-6 yang lega */}
                <div className={`grid ${gridColsClass} gap-6`}>
                  {category.tools.map((tool) => (
                    <ToolCard
                      key={tool.id}
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
            );
          })
        )}
      </div>
    </div>
  );
};

export default ToolsPage;
