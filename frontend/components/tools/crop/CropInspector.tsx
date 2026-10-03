import React from 'react';
import {
  Crop,
  Sliders,
  RotateCcw,
  Square,
  RectangleHorizontal,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CropBox, AspectRatio, PageSelection } from './CropTypes';

interface CropInspectorProps {
  cropBox: CropBox;
  setCropBox: React.Dispatch<React.SetStateAction<CropBox>>;
  canvasDimensions: { width: number; height: number };
  aspectRatio: AspectRatio;
  applyAspectRatio: (ratio: AspectRatio) => void;
  applyQuickMargin: (pct: number) => void;
  handleResetCrop: () => void;
  pageSelection: PageSelection;
  setPageSelection: (sel: PageSelection) => void;
  customPages: string;
  setCustomPages: (pages: string) => void;
  currentPage: number;
  totalPages: number;
}

const CropInspector: React.FC<CropInspectorProps> = ({
  cropBox,
  setCropBox,
  canvasDimensions,
  aspectRatio,
  applyAspectRatio,
  applyQuickMargin,
  handleResetCrop,
  pageSelection,
  setPageSelection,
  customPages,
  setCustomPages,
  currentPage,
  totalPages,
}) => {
  return (
    <div className="p-5 space-y-6">
      {/* Rasio Aspek */}
      <div>
        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">
          Rasio Aspek
        </label>
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-canvas rounded-xl border border-border-subtle">
          <button
            type="button"
            onClick={() => applyAspectRatio('free')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              aspectRatio === 'free'
                ? 'bg-surface text-accent-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Bebas
          </button>
          <button
            type="button"
            onClick={() => applyAspectRatio('1:1')}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
              aspectRatio === '1:1'
                ? 'bg-surface text-accent-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Square className="w-3 h-3" /> 1:1
          </button>
          <button
            type="button"
            onClick={() => applyAspectRatio('a4')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              aspectRatio === 'a4'
                ? 'bg-surface text-accent-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            A4
          </button>
          <button
            type="button"
            onClick={() => applyAspectRatio('16:9')}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
              aspectRatio === '16:9'
                ? 'bg-surface text-accent-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <RectangleHorizontal className="w-3 h-3" /> 16:9
          </button>
        </div>
      </div>

      {/* Preset Margin Cepat */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            Preset Margin Otomatis
          </label>
          <button
            type="button"
            onClick={handleResetCrop}
            className="text-[11px] text-accent-primary hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'Penuh (0%)', pct: 0 },
            { label: 'Tipis (5%)', pct: 5 },
            { label: 'Standar (8%)', pct: 8 },
            { label: 'Lebar (12%)', pct: 12 },
          ].map((preset) => (
            <button
              key={preset.pct}
              type="button"
              onClick={() => applyQuickMargin(preset.pct)}
              className="py-1.5 px-2 bg-canvas hover:bg-surface border border-border-subtle hover:border-accent-primary rounded-lg text-[11px] font-medium text-text-secondary hover:text-accent-primary transition-all text-center"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dimensi Koordinat Pangkas Numerik */}
      <div className="space-y-3 pt-2 border-t border-border-subtle">
        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
          Dimensi & Koordinat (px)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] text-text-muted block mb-1">Posisi X (Kiri)</span>
            <input
              type="number"
              min={0}
              max={Math.max(0, canvasDimensions.width - cropBox.width)}
              value={cropBox.x}
              onChange={(e) =>
                setCropBox((prev) => ({
                  ...prev,
                  x: Math.min(
                    Math.max(0, parseInt(e.target.value) || 0),
                    canvasDimensions.width - prev.width
                  ),
                }))
              }
              className="w-full px-3 py-1.5 bg-canvas border border-border-subtle rounded-xl text-xs font-mono text-text-primary outline-none focus:border-accent-primary"
            />
          </div>
          <div>
            <span className="text-[11px] text-text-muted block mb-1">Posisi Y (Atas)</span>
            <input
              type="number"
              min={0}
              max={Math.max(0, canvasDimensions.height - cropBox.height)}
              value={cropBox.y}
              onChange={(e) =>
                setCropBox((prev) => ({
                  ...prev,
                  y: Math.min(
                    Math.max(0, parseInt(e.target.value) || 0),
                    canvasDimensions.height - prev.height
                  ),
                }))
              }
              className="w-full px-3 py-1.5 bg-canvas border border-border-subtle rounded-xl text-xs font-mono text-text-primary outline-none focus:border-accent-primary"
            />
          </div>
          <div>
            <span className="text-[11px] text-text-muted block mb-1">Lebar (Width)</span>
            <input
              type="number"
              min={30}
              max={Math.max(30, canvasDimensions.width - cropBox.x)}
              value={cropBox.width}
              onChange={(e) =>
                setCropBox((prev) => ({
                  ...prev,
                  width: Math.min(
                    Math.max(30, parseInt(e.target.value) || 30),
                    canvasDimensions.width - prev.x
                  ),
                }))
              }
              className="w-full px-3 py-1.5 bg-canvas border border-border-subtle rounded-xl text-xs font-mono text-text-primary outline-none focus:border-accent-primary"
            />
          </div>
          <div>
            <span className="text-[11px] text-text-muted block mb-1">Tinggi (Height)</span>
            <input
              type="number"
              min={30}
              max={Math.max(30, canvasDimensions.height - cropBox.y)}
              value={cropBox.height}
              onChange={(e) =>
                setCropBox((prev) => ({
                  ...prev,
                  height: Math.min(
                    Math.max(30, parseInt(e.target.value) || 30),
                    canvasDimensions.height - prev.y
                  ),
                }))
              }
              className="w-full px-3 py-1.5 bg-canvas border border-border-subtle rounded-xl text-xs font-mono text-text-primary outline-none focus:border-accent-primary"
            />
          </div>
        </div>
      </div>

      {/* Target Halaman Pemangkasan */}
      <div className="pt-2 border-t border-border-subtle space-y-3">
        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
          Target Halaman
        </label>
        <div className="space-y-2">
          {[
            { id: 'all', title: 'Semua Halaman', desc: 'Terapkan area pangkas yang sama ke semua lembar' },
            { id: 'current', title: `Hanya Halaman Ini (${currentPage})`, desc: 'Pangkas hanya lembar yang sedang aktif dilihat' },
            { id: 'custom', title: 'Halaman Kustom', desc: 'Tentukan rentang halaman (cth: 1-3, 5)' },
          ].map((mode) => (
            <label
              key={mode.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                pageSelection === mode.id
                  ? 'border-accent-primary bg-accent-primary/5 text-text-primary'
                  : 'border-border-subtle bg-canvas text-text-secondary hover:border-text-muted'
              }`}
            >
              <input
                type="radio"
                name="pageSelection"
                checked={pageSelection === mode.id}
                onChange={() => setPageSelection(mode.id as PageSelection)}
                className="mt-0.5 w-4 h-4 text-accent-primary focus:ring-accent-primary border-border-subtle"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold block text-text-primary">{mode.title}</span>
                <span className="text-[10px] text-text-secondary leading-snug">{mode.desc}</span>
              </div>
            </label>
          ))}
        </div>

        {pageSelection === 'custom' && (
          <input
            type="text"
            value={customPages}
            onChange={(e) => setCustomPages(e.target.value)}
            placeholder="Contoh: 1-3, 5, 7"
            className="w-full px-3 py-2 bg-canvas border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-accent-primary"
          />
        )}
      </div>
    </div>
  );
};

export default CropInspector;
