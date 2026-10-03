import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View } from '../../types';
import { 
  Search, 
  X, 
  ArrowRight, 
  FileText, 
  Layers, 
  Minimize2, 
  PenTool, 
  FileSpreadsheet, 
  Presentation, 
  Image, 
  FileCheck, 
  FolderTree, 
  Scissors, 
  Type, 
  Edit3, 
  Crop, 
  Stamp, 
  Eye, 
  Lock, 
  Unlock, 
  Languages, 
  ShieldCheck, 
  Landmark,
  Sparkles,
  Command
} from 'lucide-react';
import { EngineType } from '../ToolCard';

interface CommandBarItem {
  id: string;
  title: string;
  description: string;
  view: View;
  category: string;
  engineType: EngineType;
  badge?: string;
  keywords: string[];
}

interface CommandBarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: View) => void;
}

const ALL_COMMANDS: CommandBarItem[] = [
  // 1. Esensial
  { id: 'pdf-to-word', title: 'PDF ke Word', description: 'Konversi PDF ke dokumen DOCX yang dapat diedit', view: View.PDF_TO_WORD, category: 'Esensial', engineType: 'cloud', keywords: ['word', 'docx', 'doc'] },
  { id: 'merge-pdf', title: 'Gabungkan PDF', description: 'Satukan beberapa berkas PDF menjadi satu di RAM lokal', view: View.MERGE, category: 'Esensial', engineType: 'client', keywords: ['merge', 'gabung', 'satukan'] },
  { id: 'compress-pdf', title: 'Kompres PDF', description: 'Kecilkan ukuran PDF dengan preset CPNS/BKN 200KB', view: View.COMPRESS, category: 'Esensial', engineType: 'fast', keywords: ['kompres', 'kecilkan', 'compress'] },
  { id: 'sign-pdf', title: 'Tanda Tangan & e-Meterai', description: 'Bubuhkan tanda tangan & panduan e-Meterai resmi', view: View.ADD_SIGNATURE, category: 'Esensial', engineType: 'client', keywords: ['sign', 'ttd', 'meterai'] },

  // 2. Konversi
  { id: 'bank-statement', title: 'Rekening Koran ke Excel', description: 'Parser mutasi BCA, Mandiri, BRI, BNI, BSI & BPD ke XLSX', view: View.BANK_STATEMENT, category: 'Konversi', engineType: 'fast', badge: 'BARU', keywords: ['bank', 'mutasi', 'rekening'] },
  { id: 'pdf-to-excel', title: 'PDF ke Excel', description: 'Ekstrak tabel dan data tabular ke spreadsheet XLSX', view: View.PDF_TO_EXCEL, category: 'Konversi', engineType: 'cloud', keywords: ['excel', 'xlsx', 'spreadsheet'] },
  { id: 'pdf-to-ppt', title: 'PDF ke PPT', description: 'Konversi slide presentasi menjadi PowerPoint PPTX', view: View.PDF_TO_PPT, category: 'Konversi', engineType: 'cloud', keywords: ['ppt', 'powerpoint', 'slide'] },
  { id: 'pdf-to-image', title: 'PDF ke Gambar (JPG/PNG)', description: 'Simpan halaman PDF sebagai gambar berkualitas tinggi', view: View.PDF_TO_IMAGE, category: 'Konversi', engineType: 'cloud', keywords: ['jpg', 'png', 'gambar'] },
  { id: 'pdf-a', title: 'PDF/A Converter', description: 'Standarisasi arsip jangka panjang standar ISO 19005', view: View.PDF_A, category: 'Konversi', engineType: 'cloud', keywords: ['pdf/a', 'iso', 'arsip'] },

  // 3. Edit & Organisasi
  { id: 'organize-pdf', title: 'Atur & Susun Halaman', description: 'Hapus, putar, atau ubah urutan halaman di browser', view: View.ORGANIZE, category: 'Organisasi', engineType: 'client', keywords: ['atur', 'susun', 'halaman'] },
  { id: 'split-pdf', title: 'Pisahkan PDF', description: 'Ekstrak rentang halaman atau pisah per berkas', view: View.SPLIT, category: 'Organisasi', engineType: 'client', keywords: ['split', 'pisah', 'ekstrak'] },
  { id: 'add-text', title: 'Tambah Teks & Anotasi', description: 'Ketik dan sisipkan teks tambahan di dokumen PDF', view: View.ADD_TEXT, category: 'Organisasi', engineType: 'client', keywords: ['text', 'teks', 'anotasi'] },
  { id: 'edit-text', title: 'Edit Teks PDF', description: 'Sunting dan ganti teks asli di dalam dokumen PDF', view: View.EDIT_PDF, category: 'Organisasi', engineType: 'cloud', keywords: ['edit', 'sunting', 'ubah teks'] },
  { id: 'crop-pdf', title: 'Crop PDF', description: 'Pangkas margin atau area kosong yang tidak diinginkan', view: View.CROP_PDF, category: 'Organisasi', engineType: 'client', keywords: ['crop', 'potong', 'margin'] },
  { id: 'watermark', title: 'Cap Air (Watermark)', description: 'Bubuhkan cap air teks atau logo perlindungan hak cipta', view: View.WATERMARK, category: 'Organisasi', engineType: 'fast', keywords: ['watermark', 'cap air'] },

  // 4. Keamanan & AI
  { id: 'redact-pdf', title: 'Sensor PII (UU PDP)', description: 'True binary redaction: sensor NIK, NPWP, Rekening permanen', view: View.REDACT_PDF, category: 'Keamanan', engineType: 'fast', badge: 'UU PDP', keywords: ['redact', 'sensor', 'nik', 'ktp'] },
  { id: 'protect-pdf', title: 'Proteksi Sandi PDF', description: 'Enkripsi dokumen dengan sandi kuat AES-256 bit', view: View.PROTECT_PDF, category: 'Keamanan', engineType: 'fast', keywords: ['protect', 'kunci', 'password'] },
  { id: 'unlock-pdf', title: 'Buka Kunci PDF', description: 'Buka dan hapus proteksi sandi pada dokumen PDF', view: View.UNLOCK_PDF, category: 'Keamanan', engineType: 'fast', keywords: ['unlock', 'buka kunci'] },
  { id: 'ocr-pdf', title: 'OCR Dokumen Pindaian', description: 'Kenali teks dari gambar scan menjadi Searchable PDF', view: View.OCR_PDF, category: 'Keamanan', engineType: 'cloud', keywords: ['ocr', 'scan', 'pindai'] },
  { id: 'translate-pdf', title: 'Terjemahkan Dokumen', description: 'Terjemahkan dokumen ke 30+ bahasa dengan Gemini AI', view: View.TRANSLATE_PDF, category: 'Keamanan', engineType: 'cloud', keywords: ['translate', 'terjemah', 'bahasa'] },
];

const CommandBarModal: React.FC<CommandBarModalProps> = ({ isOpen, onClose, onSelectView }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!query.trim()) return ALL_COMMANDS;
    const q = query.toLowerCase().trim();
    return ALL_COMMANDS.filter(cmd => 
      cmd.title.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.keywords.some(k => k.includes(q))
    );
  }, [query]);

  // Handle keyboard navigation: ArrowUp, ArrowDown, Enter, Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[selectedIndex];
      if (target) {
        onSelectView(target.view);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-xl bg-surface rounded-2xl border border-border-strong shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="p-3.5 border-b border-border-subtle flex items-center gap-3 bg-elevated/40">
          <Search size={18} className="text-text-secondary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Cari perkakas atau ketik perintah (misal: word, kompres, ttd)..."
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-secondary text-sm focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface border border-border-subtle text-text-secondary">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-text-secondary">
              Tidak ada perkakas yang cocok dengan "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectView(item.view);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-accent-primary text-white shadow-2xs'
                      : 'hover:bg-elevated text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-elevated border border-border-subtle text-text-secondary'
                    }`}>
                      {item.title[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs truncate">{item.title}</span>
                        {item.badge && (
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate ${isSelected ? 'text-white/80' : 'text-text-secondary'}`}>
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      isSelected
                        ? 'bg-white/10 text-white border-white/20'
                        : item.engineType === 'client'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : item.engineType === 'fast'
                        ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/30'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {item.engineType === 'client' ? 'RAM' : item.engineType === 'fast' ? 'Fast' : 'Cloud'}
                    </span>
                    <ArrowRight size={13} className={isSelected ? 'text-white' : 'text-text-secondary'} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="p-2.5 bg-elevated/40 border-t border-border-subtle flex items-center justify-between text-[11px] text-text-secondary">
          <div className="flex items-center gap-2">
            <span>↑↓ Navigasi</span>
            <span>•</span>
            <span>↵ Pilih</span>
          </div>
          <span>{filtered.length} Perkakas Terdaftar</span>
        </div>
      </div>
    </div>
  );
};

export default CommandBarModal;
