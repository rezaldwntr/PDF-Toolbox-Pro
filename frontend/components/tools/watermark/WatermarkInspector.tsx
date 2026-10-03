import React from 'react';
import {
  Type,
  Image as ImageIcon,
  Grid,
  Layers,
  UploadCloud,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  WatermarkConfig,
  WatermarkTab,
  PositionAnchor,
  PageSelectionMode,
  PRESET_COLORS,
  PRESET_TEXTS,
} from './WatermarkTypes';

interface WatermarkInspectorProps {
  config: WatermarkConfig;
  setConfig: React.Dispatch<React.SetStateAction<WatermarkConfig>>;
  totalPages: number;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  imageInputRef: React.RefObject<HTMLInputElement>;
}

const WatermarkInspector: React.FC<WatermarkInspectorProps> = ({
  config,
  setConfig,
  totalPages,
  onImageSelect,
  imageInputRef,
}) => {
  const positions: { id: PositionAnchor; label: string }[] = [
    { id: 'top-left', label: 'Kiri Atas' },
    { id: 'top-center', label: 'Tengah Atas' },
    { id: 'top-right', label: 'Kanan Atas' },
    { id: 'middle-left', label: 'Kiri Tengah' },
    { id: 'center', label: 'Tengah' },
    { id: 'middle-right', label: 'Kanan Tengah' },
    { id: 'bottom-left', label: 'Kiri Bawah' },
    { id: 'bottom-center', label: 'Tengah Bawah' },
    { id: 'bottom-right', label: 'Kanan Bawah' },
  ];

  return (
    <div className="p-5 space-y-6">
      {/* Tipe Watermark Tabs */}
      <div>
        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">
          Format Watermark
        </label>
        <div className="grid grid-cols-2 p-1 bg-canvas rounded-xl border border-border-subtle">
          <button
            type="button"
            onClick={() => setConfig((prev) => ({ ...prev, type: 'text' }))}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              config.type === 'text'
                ? 'bg-surface text-accent-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Type className="w-3.5 h-3.5" /> Teks
          </button>
          <button
            type="button"
            onClick={() => setConfig((prev) => ({ ...prev, type: 'image' }))}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              config.type === 'image'
                ? 'bg-surface text-accent-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Gambar / Logo
          </button>
        </div>
      </div>

      {/* Mode Teks */}
      {config.type === 'text' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              Teks Watermark
            </label>
            <input
              type="text"
              value={config.text}
              onChange={(e) => setConfig((prev) => ({ ...prev, text: e.target.value }))}
              placeholder="Contoh: RAHASIA, DRAFT, CONFIDENTIAL"
              className="w-full px-3.5 py-2.5 bg-canvas border border-border-subtle rounded-xl text-sm text-text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
            />
            {/* Quick preset pills */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESET_TEXTS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, text: t }))}
                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-canvas border border-border-subtle hover:border-accent-primary text-text-secondary hover:text-accent-primary transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                Jenis Font
              </label>
              <select
                value={config.fontFamily}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, fontFamily: e.target.value as any }))
                }
                className="w-full px-3 py-2 bg-canvas border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-accent-primary"
              >
                <option value="helv">Helvetica (Standard)</option>
                <option value="times">Times New Roman</option>
                <option value="courier">Courier (Monospace)</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-text-secondary">Ukuran</label>
                <span className="text-[11px] font-mono text-text-muted">{config.fontSize}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="96"
                step="2"
                value={config.fontSize}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, fontSize: parseInt(e.target.value) }))
                }
                className="w-full accent-accent-primary cursor-pointer"
              />
            </div>
          </div>

          {/* Color & Typography Style */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, color: c }))}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    config.color.toLowerCase() === c.toLowerCase()
                      ? 'scale-110 border-text-primary ring-2 ring-accent-primary/30'
                      : 'border-white dark:border-slate-800 hover:scale-105'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 bg-canvas p-1 rounded-lg border border-border-subtle">
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, isBold: !prev.isBold }))}
                className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                  config.isBold ? 'bg-surface text-accent-primary shadow-xs' : 'text-text-muted'
                }`}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, isItalic: !prev.isItalic }))}
                className={`w-7 h-7 rounded text-xs italic font-serif transition-colors ${
                  config.isItalic ? 'bg-surface text-accent-primary shadow-xs' : 'text-text-muted'
                }`}
              >
                I
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode Gambar */}
      {config.type === 'image' && (
        <div className="space-y-4">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={onImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="w-full p-4 border-2 border-dashed border-border-subtle hover:border-accent-primary rounded-xl bg-canvas flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer group"
          >
            {config.imagePreviewUrl ? (
              <img
                src={config.imagePreviewUrl}
                alt="Watermark preview"
                className="max-h-20 object-contain rounded"
              />
            ) : (
              <UploadCloud className="w-6 h-6 text-text-muted group-hover:text-accent-primary" />
            )}
            <span className="text-xs font-semibold text-text-secondary group-hover:text-text-primary">
              {config.imageFile ? config.imageFile.name : 'Pilih Logo atau Gambar'}
            </span>
            <span className="text-[10px] text-text-muted">PNG (Transparan didukung), JPG, SVG</span>
          </button>

          {config.imageFile && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-text-secondary">Skala Ukuran</label>
                <span className="text-[11px] font-mono text-text-muted">
                  {Math.round(config.imageScale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config.imageScale}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, imageScale: parseFloat(e.target.value) }))
                }
                className="w-full accent-accent-primary cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* Penempatan 9-Grid & Rotasi */}
      <div className="pt-2 border-t border-border-subtle space-y-4">
        <div>
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">
            Posisi Penempatan
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-2 bg-canvas rounded-xl border border-border-subtle max-w-[200px]">
            {positions.map((pos) => (
              <button
                key={pos.id}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, position: pos.id }))}
                title={pos.label}
                className={`h-8 rounded-lg border text-[11px] font-medium transition-all flex items-center justify-center ${
                  config.position === pos.id
                    ? 'bg-accent-primary text-accent-contrast border-accent-primary shadow-xs'
                    : 'bg-surface border-border-subtle text-text-muted hover:border-accent-primary'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    config.position === pos.id ? 'bg-accent-contrast' : 'bg-text-muted'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Opasitas & Rotasi */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-text-secondary">Transparansi / Opasitas</label>
              <span className="text-[11px] font-mono text-text-muted">
                {Math.round(config.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={config.opacity}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))
              }
              className="w-full accent-accent-primary cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-text-secondary">Sudut Rotasi</label>
              <span className="text-[11px] font-mono text-text-muted">{config.rotation}°</span>
            </div>
            <input
              type="range"
              min="-90"
              max="90"
              step="5"
              value={config.rotation}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, rotation: parseInt(e.target.value) }))
              }
              className="w-full accent-accent-primary cursor-pointer"
            />
            <div className="flex gap-2 mt-1.5">
              {[-45, 0, 45].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, rotation: deg }))}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    config.rotation === deg
                      ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                      : 'border-border-subtle text-text-muted hover:border-text-secondary'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mosaic / Tiling & Lapisan Layer */}
        <div className="space-y-2 pt-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-border-subtle cursor-pointer select-none">
            <span className="text-xs text-text-secondary font-medium">Ulangi Seluruh Halaman (Mosaic)</span>
            <input
              type="checkbox"
              checked={config.isMosaic}
              onChange={(e) => setConfig((prev) => ({ ...prev, isMosaic: e.target.checked }))}
              className="w-4 h-4 rounded border-border-subtle text-accent-primary focus:ring-accent-primary"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, layer: 'over' }))}
              className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                config.layer === 'over'
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-semibold'
                  : 'border-border-subtle bg-canvas text-text-secondary'
              }`}
            >
              Di Atas Teks (Over)
            </button>
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, layer: 'under' }))}
              className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                config.layer === 'under'
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary font-semibold'
                  : 'border-border-subtle bg-canvas text-text-secondary'
              }`}
            >
              Di Bawah Teks (Under)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatermarkInspector;
