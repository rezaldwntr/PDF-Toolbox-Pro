import React, { useState, useMemo } from 'react';
import {
  Languages,
  Search,
  ArrowRightLeft,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import {
  LANGUAGES,
  LanguageItem,
  PageScope,
  OutputMode,
} from './TranslateLanguages';

interface TranslateInspectorProps {
  sourceLang: string;
  setSourceLang: (lang: string) => void;
  targetLang: string;
  setTargetLang: (lang: string) => void;
  pageScope: PageScope;
  setPageScope: (scope: PageScope) => void;
  customRange: string;
  setCustomRange: (range: string) => void;
  outputMode: OutputMode;
  setOutputMode: (mode: OutputMode) => void;
  activePage: number;
  totalPages: number;
}

const TranslateInspector: React.FC<TranslateInspectorProps> = ({
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  pageScope,
  setPageScope,
  customRange,
  setCustomRange,
  outputMode,
  setOutputMode,
  activePage,
  totalPages,
}) => {
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);

  const filteredSourceLanguages = useMemo(() => {
    const q = sourceSearch.toLowerCase().trim();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [sourceSearch]);

  const filteredTargetLanguages = useMemo(() => {
    const q = targetSearch.toLowerCase().trim();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [targetSearch]);

  const getSourceLangLabel = () => {
    if (sourceLang === 'auto') return 'Otomatis Deteksi';
    const found = LANGUAGES.find((l) => l.code === sourceLang);
    return found ? `${found.native} (${found.name})` : sourceLang;
  };

  const getTargetLangLabel = () => {
    const found = LANGUAGES.find((l) => l.code === targetLang);
    return found ? `${found.native} (${found.name})` : targetLang;
  };

  const handleSwap = () => {
    if (sourceLang === 'auto') return;
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  return (
    <div className="p-5 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Languages className="w-4 h-4 text-accent-primary" />
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
            Pengaturan Terjemahan
          </h3>
        </div>
        <p className="text-xs text-text-secondary">
          Ditenagai Gemini AI dengan preservasi tata letak asli dokumen.
        </p>
      </div>

      {/* Language Selector Cards */}
      <div className="space-y-3">
        {/* Source Language */}
        <div className="relative">
          <label className="text-xs font-semibold text-text-secondary block mb-1">
            Bahasa Sumber
          </label>
          <button
            type="button"
            onClick={() => {
              setShowSourceDropdown(!showSourceDropdown);
              setShowTargetDropdown(false);
            }}
            className="w-full p-2.5 bg-canvas border border-border-subtle rounded-xl text-xs text-text-primary flex items-center justify-between hover:border-accent-primary transition-colors"
          >
            <span className="font-semibold truncate">{getSourceLangLabel()}</span>
            <ChevronDown className="w-4 h-4 text-text-muted" />
          </button>

          {showSourceDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-subtle rounded-xl shadow-lg z-30 p-2 space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                  placeholder="Cari bahasa sumber..."
                  className="w-full pl-7 pr-2.5 py-1.5 bg-canvas border border-border-subtle rounded-lg text-xs outline-none focus:border-accent-primary text-text-primary"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setSourceLang('auto');
                    setShowSourceDropdown(false);
                  }}
                  className={`w-full p-2 rounded-lg text-xs text-left transition-colors ${
                    sourceLang === 'auto'
                      ? 'bg-accent-primary/10 text-accent-primary font-bold'
                      : 'hover:bg-canvas text-text-primary'
                  }`}
                >
                  ✨ Otomatis Deteksi (Disarankan)
                </button>
                {filteredSourceLanguages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      setSourceLang(l.code);
                      setShowSourceDropdown(false);
                    }}
                    className={`w-full p-2 rounded-lg text-xs text-left transition-colors ${
                      sourceLang === l.code
                        ? 'bg-accent-primary/10 text-accent-primary font-bold'
                        : 'hover:bg-canvas text-text-primary'
                    }`}
                  >
                    {l.native} ({l.name})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-1">
          <button
            type="button"
            onClick={handleSwap}
            disabled={sourceLang === 'auto'}
            className="p-1.5 rounded-full border border-border-subtle bg-surface text-text-muted hover:text-accent-primary hover:border-accent-primary disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
            title="Tukar Bahasa"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Target Language */}
        <div className="relative">
          <label className="text-xs font-semibold text-text-secondary block mb-1">
            Bahasa Tujuan
          </label>
          <button
            type="button"
            onClick={() => {
              setShowTargetDropdown(!showTargetDropdown);
              setShowSourceDropdown(false);
            }}
            className="w-full p-2.5 bg-canvas border border-border-subtle rounded-xl text-xs text-text-primary flex items-center justify-between hover:border-accent-primary transition-colors"
          >
            <span className="font-semibold truncate">{getTargetLangLabel()}</span>
            <ChevronDown className="w-4 h-4 text-text-muted" />
          </button>

          {showTargetDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-subtle rounded-xl shadow-lg z-30 p-2 space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  placeholder="Cari bahasa tujuan..."
                  className="w-full pl-7 pr-2.5 py-1.5 bg-canvas border border-border-subtle rounded-lg text-xs outline-none focus:border-accent-primary text-text-primary"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredTargetLanguages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      setTargetLang(l.code);
                      setShowTargetDropdown(false);
                    }}
                    className={`w-full p-2 rounded-lg text-xs text-left transition-colors ${
                      targetLang === l.code
                        ? 'bg-accent-primary/10 text-accent-primary font-bold'
                        : 'hover:bg-canvas text-text-primary'
                    }`}
                  >
                    {l.native} ({l.name})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cakupan Halaman */}
      <div className="pt-2 border-t border-border-subtle space-y-3">
        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
          Target Halaman
        </label>
        <div className="space-y-2">
          {[
            { id: 'all', title: `Semua Halaman (${totalPages} Hal)`, desc: 'Terjemahkan seluruh isi dokumen' },
            { id: 'current', title: `Halaman Ini (${activePage})`, desc: 'Terjemahkan satu lembar aktif' },
            { id: 'custom', title: 'Rentang Halaman', desc: 'Contoh: 1-3, 5' },
          ].map((mode) => (
            <label
              key={mode.id}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                pageScope === mode.id
                  ? 'border-accent-primary bg-accent-primary/5 text-text-primary font-bold'
                  : 'border-border-subtle bg-canvas text-text-secondary'
              }`}
            >
              <input
                type="radio"
                name="pageScope"
                checked={pageScope === mode.id}
                onChange={() => setPageScope(mode.id as PageScope)}
                className="mt-0.5 text-accent-primary focus:ring-accent-primary"
              />
              <div>
                <span className="block">{mode.title}</span>
                <span className="text-[10px] text-text-muted font-normal">{mode.desc}</span>
              </div>
            </label>
          ))}
        </div>

        {pageScope === 'custom' && (
          <input
            type="text"
            value={customRange}
            onChange={(e) => setCustomRange(e.target.value)}
            placeholder="Contoh: 1-5, 8"
            className="w-full px-3 py-1.5 bg-canvas border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-accent-primary"
          />
        )}
      </div>

      {/* Format Output */}
      <div className="pt-2 border-t border-border-subtle space-y-3">
        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
          Format Luaran
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOutputMode('pdf')}
            className={`p-2.5 rounded-xl border text-xs text-center transition-all ${
              outputMode === 'pdf'
                ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                : 'border-border-subtle bg-canvas text-text-secondary'
            }`}
          >
            PDF (Format Asli)
          </button>
          <button
            type="button"
            onClick={() => setOutputMode('txt')}
            className={`p-2.5 rounded-xl border text-xs text-center transition-all ${
              outputMode === 'txt'
                ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-bold'
                : 'border-border-subtle bg-canvas text-text-secondary'
            }`}
          >
            Teks Bersih (.TXT)
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranslateInspector;
