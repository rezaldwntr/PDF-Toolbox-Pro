// frontend/components/tools/signature/SavedSignaturesGallery.tsx
import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { SignatureItem } from './SignatureTypes';

interface SavedSignaturesGalleryProps {
  signatures: SignatureItem[];
  activePageIndex: number;
  onPlaceSignature: (sig: SignatureItem) => void;
  onDeleteSignature: (sigId: string) => void;
}

export const SavedSignaturesGallery: React.FC<SavedSignaturesGalleryProps> = ({
  signatures,
  activePageIndex,
  onPlaceSignature,
  onDeleteSignature,
}) => {
  if (signatures.length === 0) return null;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, sig: SignatureItem) => {
    e.dataTransfer.setData('application/x-pdf-signature-id', sig.id);
    e.dataTransfer.setData('text/plain', sig.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="bg-surface border border-border-subtle p-4 rounded-2xl shadow-xs transition-colors space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-text-primary">Galeri Tanda Tangan Anda</h4>
        <span className="text-[10px] bg-elevated text-text-secondary px-2 py-0.5 rounded-full font-bold">
          {signatures.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
        {signatures.map((sig) => (
          <div
            key={sig.id}
            draggable
            onDragStart={(e) => handleDragStart(e, sig)}
            title="Klik untuk menaruh atau seret (drag & drop) langsung ke lembar halaman"
            className="group flex items-center justify-between p-2 rounded-xl border border-border-subtle bg-surface hover:border-accent-primary transition-colors cursor-grab active:cursor-grabbing select-none"
          >
            <button
              type="button"
              onClick={() => onPlaceSignature(sig)}
              className="flex-1 flex items-center gap-2.5 text-left overflow-hidden cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-3.5 h-3.5 text-text-muted group-hover:text-accent-primary shrink-0 transition-colors" />
              <div className="w-16 h-10 bg-white rounded-lg border border-border-subtle p-1 flex items-center justify-center shrink-0 pointer-events-none">
                <img
                  src={sig.dataUrl}
                  alt={sig.name}
                  draggable={false}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-text-primary truncate">{sig.name}</p>
                <span className="text-[10px] text-accent-primary font-semibold flex items-center gap-1">
                  <Plus className="w-3 h-3 shrink-0" />
                  <span className="truncate">Taruh / Seret ke Halaman {activePageIndex + 1}</span>
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSignature(sig.id);
              }}
              title="Hapus dari Galeri"
              className="p-1.5 text-text-secondary hover:text-rose-500 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-text-secondary italic text-center leading-relaxed">
        Tip: Seret (drag &amp; drop) tanda tangan langsung ke posisi mana pun pada lembar halaman aktif, atau klik untuk menaruhnya di Halaman {activePageIndex + 1}.
      </p>
    </div>
  );
};
