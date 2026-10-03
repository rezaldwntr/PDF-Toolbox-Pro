import React from 'react';
import {
  Search,
  Replace,
  Type,
  Trash2,
  Check,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  EditMode,
  PageSelection,
  TextBlockItem,
  PendingEdit,
} from './EditTypes';

interface EditInspectorProps {
  editMode: EditMode;
  setEditMode: (m: EditMode) => void;
  searchText: string;
  setSearchText: (s: string) => void;
  replaceText: string;
  setReplaceText: (s: string) => void;
  caseSensitive: boolean;
  setCaseSensitive: (b: boolean) => void;
  pageSelection: PageSelection;
  setPageSelection: (p: PageSelection) => void;
  customPages: string;
  setCustomPages: (s: string) => void;
  foundMatchesCount: number;
  selectedBlock: TextBlockItem | null;
  activeNewText: string;
  setActiveNewText: (s: string) => void;
  pendingEdits: PendingEdit[];
  onApplyBlockEdit: () => void;
  onRemovePendingEdit: (id: string) => void;
  currentPage: number;
  totalPages: number;
}

const EditInspector: React.FC<EditInspectorProps> = ({
  editMode,
  setEditMode,
  searchText,
  setSearchText,
  replaceText,
  setReplaceText,
  caseSensitive,
  setCaseSensitive,
  pageSelection,
  setPageSelection,
  customPages,
  setCustomPages,
  foundMatchesCount,
  selectedBlock,
  activeNewText,
  setActiveNewText,
  pendingEdits,
  onApplyBlockEdit,
  onRemovePendingEdit,
  currentPage,
  totalPages,
}) => {
  return (
    <div className="p-5 space-y-6">
      {/* Mode Tabs */}
      <div>
        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">
          Metode Penyuntingan
        </label>
        <div className="grid grid-cols-2 p-1 bg-canvas rounded-xl border border-border-subtle">
          <button
            type="button"
            onClick={() => setEditMode('find_replace')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              editMode === 'find_replace'
                ? 'bg-surface text-accent-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Replace className="w-3.5 h-3.5" /> Cari & Ganti
          </button>
          <button
            type="button"
            onClick={() => setEditMode('block_edits')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              editMode === 'block_edits'
                ? 'bg-surface text-accent-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Type className="w-3.5 h-3.5" /> Sunting Blok
          </button>
        </div>
      </div>

      {/* Mode 1: Cari & Ganti */}
      {editMode === 'find_replace' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">
              Teks yang Ingin Dicari
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Kata atau frasa yang ingin diganti..."
                className="w-full pl-8 pr-3 py-2 bg-canvas border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-accent-primary"
              />
            </div>
            {searchText.trim() && (
              <span className="text-[10px] text-accent-primary mt-1 block font-medium">
                {foundMatchesCount > 0
                  ? `Ditemukan ${foundMatchesCount} kecocokan di dokumen`
                  : 'Mencari kecocokan teks...'}
              </span>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">
              Teks Pengganti Baru
            </label>
            <div className="relative">
              <Replace className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Teks baru yang disematkan..."
                className="w-full pl-8 pr-3 py-2 bg-canvas border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-accent-primary"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="w-4 h-4 rounded border-border-subtle text-accent-primary focus:ring-accent-primary"
            />
            <span>Peka Huruf Besar/Kecil (Case Sensitive)</span>
          </label>

          {/* Target Halaman */}
          <div className="pt-2 border-t border-border-subtle space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
              Target Halaman
            </label>
            <div className="space-y-1.5">
              {[
                { id: 'all', title: 'Semua Halaman' },
                { id: 'current', title: `Hanya Halaman Ini (${currentPage})` },
                { id: 'custom', title: 'Halaman Kustom' },
              ].map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                    pageSelection === m.id
                      ? 'border-accent-primary bg-accent-primary/5 text-text-primary font-bold'
                      : 'border-border-subtle bg-canvas text-text-secondary'
                  }`}
                >
                  <input
                    type="radio"
                    name="pageSelection"
                    checked={pageSelection === m.id}
                    onChange={() => setPageSelection(m.id as PageSelection)}
                    className="text-accent-primary focus:ring-accent-primary"
                  />
                  <span>{m.title}</span>
                </label>
              ))}
            </div>

            {pageSelection === 'custom' && (
              <input
                type="text"
                value={customPages}
                onChange={(e) => setCustomPages(e.target.value)}
                placeholder="Contoh: 1-3, 5"
                className="w-full px-3 py-1.5 bg-canvas border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-accent-primary"
              />
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Sunting Blok Visual */}
      {editMode === 'block_edits' && (
        <div className="space-y-4">
          {selectedBlock ? (
            <div className="p-3.5 rounded-xl bg-canvas border border-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">Blok Teks Terpilih</span>
                <span className="text-[10px] font-mono text-text-muted">
                  Hal. {selectedBlock.pageIndex + 1}
                </span>
              </div>
              <div className="p-2 bg-surface rounded text-xs font-mono text-text-secondary border border-border-subtle break-words">
                "{selectedBlock.str}"
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                  Ubah Menjadi:
                </label>
                <input
                  type="text"
                  value={activeNewText}
                  onChange={(e) => setActiveNewText(e.target.value)}
                  placeholder="Ketik teks pengganti..."
                  className="w-full px-3 py-1.5 bg-surface border border-border-subtle rounded-lg text-xs text-text-primary outline-none focus:border-accent-primary"
                />
              </div>

              <button
                type="button"
                onClick={onApplyBlockEdit}
                disabled={!activeNewText.trim()}
                className="w-full py-2 bg-accent-primary hover:bg-accent-hover disabled:bg-canvas disabled:text-text-muted text-accent-contrast font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Terapkan ke Daftar Sunting
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-canvas border border-dashed border-border-subtle text-center text-xs text-text-muted">
              Klik pada salah satu kotak teks di pratinjau halaman untuk menyunting isinya.
            </div>
          )}

          {/* List of Pending Edits */}
          {pendingEdits.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border-subtle">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                Daftar Suntingan ({pendingEdits.length})
              </span>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {pendingEdits.map((edit) => (
                  <div
                    key={edit.id}
                    className="p-2 rounded-lg bg-canvas border border-border-subtle flex items-center justify-between text-xs"
                  >
                    <div className="truncate mr-2">
                      <span className="line-through text-text-muted text-[11px] mr-1 truncate">
                        {edit.old_text}
                      </span>
                      <span className="text-accent-primary font-bold text-[11px] truncate">
                        → {edit.new_text}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemovePendingEdit(edit.id)}
                      className="text-text-muted hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EditInspector;
