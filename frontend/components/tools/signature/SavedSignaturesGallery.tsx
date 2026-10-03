// frontend/components/tools/signature/SavedSignaturesGallery.tsx
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SignatureItem } from './SignatureTypes';

interface SavedSignaturesGalleryProps {
  signatures: SignatureItem[];
  pageCount: number;
  targetPageSelection: 'all' | number;
  onTargetPageChange: (selection: 'all' | number) => void;
  onPlaceSignature: (sig: SignatureItem, target: 'all' | number) => void;
  onDeleteSignature: (sigId: string) => void;
}

export const SavedSignaturesGallery: React.FC<SavedSignaturesGalleryProps> = ({
  signatures,
  pageCount,
  targetPageSelection,
  onTargetPageChange,
  onPlaceSignature,
  onDeleteSignature,
}) => {
  if (signatures.length === 0) return null;

  return (
    <div className="bg-surface border border-border-subtle p-4 rounded-2xl shadow-xs transition-colors space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-text-primary">Galeri Tanda Tangan Anda</h4>
        <span className="text-[10px] bg-elevated text-text-secondary px-2 py-0.5 rounded-full font-bold">
          {signatures.length}
        </span>
      </div>

      {/* Target Page Selector Dropdown */}
      <div className="flex items-center justify-between gap-2 p-2 bg-elevated rounded-xl border border-border-subtle">
        <span className="text-xs font-semibold text-text-secondary">Target Lembar:</span>
        <select
          value={targetPageSelection}
          onChange={e => {
            const val = e.target.value;
            onTargetPageChange(val === 'all' ? 'all' : Number(val));
          }}
          className="text-xs font-bold bg-surface text-accent-primary border border-border-subtle rounded-lg px-2.5 py-1 outline-none cursor-pointer shadow-xs"
        >
          {Array.from({ length: pageCount }).map((_, i) => (
            <option key={i} value={i}>Halaman {i + 1}</option>
          ))}
          {pageCount > 1 && (
            <option value="all">Semua Halaman (Paraf / Stempel)</option>
          )}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
        {signatures.map(sig => (
          <div
            key={sig.id}
            className="group flex items-center justify-between p-2 rounded-xl border border-border-subtle bg-surface hover:border-accent-primary transition-colors"
          >
            <button
              onClick={() => onPlaceSignature(sig, targetPageSelection)}
              className="flex-1 flex items-center gap-3 text-left overflow-hidden cursor-pointer"
            >
              <div className="w-16 h-10 bg-white rounded-lg border border-border-subtle p-1 flex items-center justify-center shrink-0">
                <img src={sig.dataUrl} alt={sig.name} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-text-primary truncate">{sig.name}</p>
                <span className="text-[10px] text-accent-primary font-semibold flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  {targetPageSelection === 'all'
                    ? 'Taruh di Semua Halaman'
                    : `Taruh di Halaman ${Number(targetPageSelection) + 1}`}
                </span>
              </div>
            </button>
            <button
              onClick={() => onDeleteSignature(sig.id)}
              title="Hapus dari Galeri"
              className="p-1.5 text-text-secondary hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-text-secondary italic text-center">
        Tip: Anda juga bisa mengklik langsung pada lembar halaman di kanvas untuk menempelkan tanda tangan.
      </p>
    </div>
  );
};
