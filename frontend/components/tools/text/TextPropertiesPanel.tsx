import React from 'react';
import { Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Copy, Trash2 } from 'lucide-react';

export type TextAlignment = 'left' | 'center' | 'right';
export type FontFamily =
  | 'Helvetica'
  | 'Times Roman'
  | 'Calibri'
  | 'Roboto'
  | 'Garamond'
  | 'Courier'
  | 'Caveat';

export interface TextBox {
  id: string;
  text: string;
  x: number;
  y: number;
  pageIndex: number;
  fontSize: number;
  fontFamily: FontFamily;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  align: TextAlignment;
  opacity: number;
  backgroundColor?: string;
}

const PRESET_COLORS = ['#000000', '#1E40AF', '#DC2626', '#16A34A', '#D97706', '#9333EA', '#FFFFFF'];

interface TextPropertiesPanelProps {
  selectedBox: TextBox | null;
  updateTextBox: (id: string, updates: Partial<TextBox>) => void;
  duplicateTextBox: (id: string) => void;
  deleteTextBox: (id: string) => void;
}

export const TextPropertiesPanel: React.FC<TextPropertiesPanelProps> = ({
  selectedBox,
  updateTextBox,
  duplicateTextBox,
  deleteTextBox,
}) => {
  return (
    <div className="lg:col-span-1">
      {selectedBox ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm transition-colors sticky top-20 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
              <Type className="w-4 h-4 text-blue-500" /> Format Teks
            </h3>
            <span className="text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
              Hal {selectedBox.pageIndex + 1}
            </span>
          </div>

          {/* Text Content Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Konten Teks (Mendukung Enter)
            </label>
            <textarea
              rows={3}
              value={selectedBox.text}
              onChange={e => updateTextBox(selectedBox.id, { text: e.target.value })}
              className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-y"
              placeholder="Tuliskan teks di sini..."
            />
          </div>

          {/* Font Family & Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Jenis Font</label>
              <select
                value={selectedBox.fontFamily}
                onChange={e => updateTextBox(selectedBox.id, { fontFamily: e.target.value as FontFamily })}
                className="w-full p-2 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <optgroup label="Standar & Dokumen Bisnis">
                  <option value="Helvetica">Arial / Helvetica (Standar)</option>
                  <option value="Calibri">Calibri (Microsoft Word)</option>
                  <option value="Roboto">Roboto (Google / Modern)</option>
                </optgroup>
                <optgroup label="Resmi, Hukum & Akademik">
                  <option value="Times Roman">Times New Roman (Skripsi/Dinas)</option>
                  <option value="Garamond">Garamond (Elegan/Buku)</option>
                </optgroup>
                <optgroup label="Faktur & Tabel">
                  <option value="Courier">Courier New (Monospace)</option>
                </optgroup>
                <optgroup label="Tulisan Tangan & Catatan">
                  <option value="Caveat">Caveat (Gaya Tangan / Paraf)</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Ukuran Font</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateTextBox(selectedBox.id, { fontSize: Math.max(8, selectedBox.fontSize - 2) })}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 text-xs"
                >
                  -
                </button>
                <input
                  type="number"
                  min="8"
                  max="120"
                  value={selectedBox.fontSize}
                  onChange={e => updateTextBox(selectedBox.id, { fontSize: Math.max(8, Number(e.target.value)) })}
                  className="w-full p-1.5 text-center text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                />
                <button
                  onClick={() => updateTextBox(selectedBox.id, { fontSize: Math.min(120, selectedBox.fontSize + 2) })}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 text-xs"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Gaya & Perataan */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Gaya & Perataan</label>
            <div className="flex items-center justify-between gap-1 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateTextBox(selectedBox.id, { isBold: !selectedBox.isBold })}
                  className={`p-1.5 rounded-lg transition-colors ${
                    selectedBox.isBold
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Tebal (Bold)"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateTextBox(selectedBox.id, { isItalic: !selectedBox.isItalic })}
                  className={`p-1.5 rounded-lg transition-colors ${
                    selectedBox.isItalic
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Miring (Italic)"
                >
                  <Italic className="w-4 h-4" />
                </button>
              </div>

              <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />

              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateTextBox(selectedBox.id, { align: 'left' })}
                  className={`p-1.5 rounded-lg transition-colors ${
                    selectedBox.align === 'left'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Rata Kiri"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateTextBox(selectedBox.id, { align: 'center' })}
                  className={`p-1.5 rounded-lg transition-colors ${
                    selectedBox.align === 'center'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Rata Tengah"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateTextBox(selectedBox.id, { align: 'right' })}
                  className={`p-1.5 rounded-lg transition-colors ${
                    selectedBox.align === 'right'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Rata Kanan"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Warna Teks & Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Warna Teks</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedBox.color}
                onChange={e => updateTextBox(selectedBox.id, { color: e.target.value })}
                className="w-8 h-8 p-0.5 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer bg-white dark:bg-slate-700"
                title="Pilih Warna Kustom"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => updateTextBox(selectedBox.id, { color: c })}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      selectedBox.color.toLowerCase() === c.toLowerCase()
                        ? 'scale-110 ring-2 ring-blue-500 ring-offset-1 border-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Transparansi / Opacity Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Transparansi (Opacity)</label>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {Math.round((selectedBox.opacity ?? 1.0) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={selectedBox.opacity ?? 1.0}
              onChange={e => updateTextBox(selectedBox.id, { opacity: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Latar Belakang Kotak Teks */}
          <div className="pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selectedBox.backgroundColor}
                  onChange={e =>
                    updateTextBox(selectedBox.id, {
                      backgroundColor: e.target.checked ? '#FFFF00' : undefined,
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                Sorotan Latar (Highlight)
              </label>
              {selectedBox.backgroundColor && (
                <input
                  type="color"
                  value={selectedBox.backgroundColor}
                  onChange={e => updateTextBox(selectedBox.id, { backgroundColor: e.target.value })}
                  className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer"
                />
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex gap-2">
            <button
              onClick={() => duplicateTextBox(selectedBox.id)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold py-2 px-3 rounded-xl transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> Duplikat
            </button>
            <button
              onClick={() => deleteTextBox(selectedBox.id)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 text-xs font-semibold py-2 px-3 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 rounded-2xl text-center flex flex-col items-center justify-center h-64 sticky top-20">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 mb-3">
            <Type className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Belum Ada Teks Dipilih</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[180px]">
            Klik salah satu teks di kanvas untuk mengedit properti atau klik tombol <strong>Tambah Teks</strong>.
          </p>
        </div>
      )}
    </div>
  );
};
