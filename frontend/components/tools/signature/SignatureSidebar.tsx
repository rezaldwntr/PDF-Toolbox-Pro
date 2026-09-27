import React, { useState, useRef } from 'react';
import { PenTool, Type, Upload, Trash2, Plus, Eraser, Sparkles } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';

export interface SignatureItem {
  id: string;
  name: string;
  dataUrl: string; // Base64 PNG
  width: number;
  height: number;
  mode: 'draw' | 'type' | 'upload';
}

export type SignatureMode = 'draw' | 'type' | 'upload';
export type TypeFont = 'Caveat' | 'Dancing Script' | 'Great Vibes' | 'Pacifico';

const SIGNATURE_COLORS = [
  { label: 'Hitam', hex: '#000000' },
  { label: 'Biru Resmi', hex: '#1E40AF' },
  { label: 'Merah', hex: '#DC2626' },
];

const PEN_WIDTHS = [
  { label: 'Tipis', size: 2 },
  { label: 'Normal', size: 4 },
  { label: 'Tebal', size: 6 },
];

const TYPE_FONTS: { id: TypeFont; label: string; fontFamily: string }[] = [
  { id: 'Dancing Script', label: 'Dancing Script (Elegan)', fontFamily: '"Dancing Script", cursive' },
  { id: 'Great Vibes', label: 'Great Vibes (Formal Klasik)', fontFamily: '"Great Vibes", cursive' },
  { id: 'Caveat', label: 'Caveat (Tangan Modern)', fontFamily: '"Caveat", cursive' },
  { id: 'Pacifico', label: 'Pacifico (Tegas & Tebal)', fontFamily: '"Pacifico", cursive' },
];

interface SignatureSidebarProps {
  signatures: SignatureItem[];
  pageCount: number;
  targetPageSelection: 'all' | number;
  onTargetPageChange: (selection: 'all' | number) => void;
  onAddAndPlaceSignature: (sig: SignatureItem, target: 'all' | number) => void;
  onPlaceSignature: (sig: SignatureItem, target: 'all' | number) => void;
  onDeleteSignature: (sigId: string) => void;
}

export const SignatureSidebar: React.FC<SignatureSidebarProps> = ({
  signatures,
  pageCount,
  targetPageSelection,
  onTargetPageChange,
  onAddAndPlaceSignature,
  onPlaceSignature,
  onDeleteSignature,
}) => {
  const { addToast } = useToast();

  const [signatureMode, setSignatureMode] = useState<SignatureMode>('draw');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedPenWidth, setSelectedPenWidth] = useState(4);
  const [typedText, setTypedText] = useState('');
  const [selectedTypeFont, setSelectedTypeFont] = useState<TypeFont>('Dancing Script');
  const [removeBg, setRemoveBg] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadSignatureInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  // --- DRAWING CANVAS LOGIC ---
  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPos(e);
    setIsDrawing(true);
    pointsRef.current = [pos];

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, selectedPenWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = selectedColor;
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPos(e);
    const points = pointsRef.current;
    points.push(pos);

    if (points.length >= 3) {
      const p0 = points[points.length - 3];
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];

      const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      ctx.beginPath();
      ctx.moveTo(mid1.x, mid1.y);
      ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = selectedPenWidth * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDrawing(false);
    pointsRef.current = [];
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pointsRef.current = [];
  };

  const handleSaveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let isBlank = true;
    for (let i = 3; i < imgData.length; i += 4) {
      if (imgData[i] > 0) {
        isBlank = false;
        break;
      }
    }

    if (isBlank) {
      addToast('Silakan gambar tanda tangan Anda di kanvas terlebih dahulu.', 'warning');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const newSig: SignatureItem = {
      id: `sig-${Date.now()}`,
      name: `Goresan ${signatures.length + 1}`,
      dataUrl,
      width: 180,
      height: 72,
      mode: 'draw',
    };

    onAddAndPlaceSignature(newSig, targetPageSelection);
    clearCanvas();
    addToast('Tanda tangan berhasil dibuat dan ditempatkan!', 'success');
  };

  const handleSaveTypedSignature = () => {
    if (!typedText.trim()) {
      addToast('Ketikkan nama atau inisial Anda terlebih dahulu.', 'warning');
      return;
    }

    const fontDef = TYPE_FONTS.find(f => f.id === selectedTypeFont) || TYPE_FONTS[0];
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `italic 78px ${fontDef.fontFamily}`;
    ctx.fillStyle = selectedColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedText.trim(), canvas.width / 2, canvas.height / 2);

    const dataUrl = canvas.toDataURL('image/png');
    const newSig: SignatureItem = {
      id: `sig-${Date.now()}`,
      name: `Ketik: ${typedText.trim().substring(0, 12)}`,
      dataUrl,
      width: 190,
      height: 76,
      mode: 'type',
    };

    onAddAndPlaceSignature(newSig, targetPageSelection);
    setTypedText('');
    addToast('Tanda tangan teks berhasil dibuat dan ditempatkan!', 'success');
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        if (removeBg) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > 215 && g > 215 && b > 215) {
              data[i + 3] = 0;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        const transparentDataUrl = canvas.toDataURL('image/png');
        const aspectRatio = img.width / img.height;
        const initialWidth = 180;
        const initialHeight = Math.round(initialWidth / aspectRatio);

        const newSig: SignatureItem = {
          id: `sig-${Date.now()}`,
          name: file.name.substring(0, 16),
          dataUrl: transparentDataUrl,
          width: initialWidth,
          height: Math.max(50, Math.min(initialHeight, 140)),
          mode: 'upload',
        };

        onAddAndPlaceSignature(newSig, targetPageSelection);
        addToast('Tanda tangan gambar berhasil dimuat!', 'success');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="lg:col-span-1 space-y-4">
      {/* Signature Creator Card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-sm transition-colors space-y-4">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-blue-500" /> Buat Tanda Tangan
        </h3>

        {/* Mode Switcher (3 Modes) */}
        <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl gap-1">
          <button
            onClick={() => setSignatureMode('draw')}
            className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              signatureMode === 'draw'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" /> Gambar
          </button>
          <button
            onClick={() => setSignatureMode('type')}
            className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              signatureMode === 'type'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" /> Ketik
          </button>
          <button
            onClick={() => setSignatureMode('upload')}
            className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              signatureMode === 'upload'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Unggah
          </button>
        </div>

        {/* MODE 1: DRAW (GAMBAR) */}
        {signatureMode === 'draw' && (
          <div className="space-y-3">
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={600}
                height={240}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="w-full h-36 bg-white rounded-xl border border-slate-200 dark:border-slate-600 shadow-inner cursor-crosshair touch-none"
              />
              <button
                onClick={clearCanvas}
                title="Bersihkan Kanvas"
                className="absolute top-2 right-2 p-1.5 bg-slate-100/90 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-700/80 dark:hover:bg-rose-950/60 text-slate-500 rounded-lg transition-colors shadow-xs"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pen Options: Colors & Thickness */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                {SIGNATURE_COLORS.map(c => (
                  <button
                    key={c.hex}
                    onClick={() => setSelectedColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      selectedColor === c.hex ? 'scale-110 ring-2 ring-blue-500 ring-offset-1 border-white' : 'border-slate-300'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-lg">
                {PEN_WIDTHS.map(w => (
                  <button
                    key={w.size}
                    onClick={() => setSelectedPenWidth(w.size)}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                      selectedPenWidth === w.size
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveDrawnSignature}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" /> Pasang Tanda Tangan
            </button>
          </div>
        )}

        {/* MODE 2: TYPE (KETIK) */}
        {signatureMode === 'type' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nama / Inisial</label>
              <input
                type="text"
                value={typedText}
                onChange={e => setTypedText(e.target.value)}
                placeholder="Ketik nama Anda di sini..."
                className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Gaya Tulisan Tangan</label>
              <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {TYPE_FONTS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedTypeFont(f.id)}
                    style={{ fontFamily: f.fontFamily }}
                    className={`p-2 rounded-xl text-left border text-base transition-all ${
                      selectedTypeFont === f.id
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {typedText.trim() || 'Contoh Tanda Tangan'}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Tinta:</span>
              <div className="flex items-center gap-1.5">
                {SIGNATURE_COLORS.map(c => (
                  <button
                    key={c.hex}
                    onClick={() => setSelectedColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      selectedColor === c.hex ? 'scale-110 ring-2 ring-blue-500 ring-offset-1 border-white' : 'border-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveTypedSignature}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" /> Pasang Tanda Tangan Ketik
            </button>
          </div>
        )}

        {/* MODE 3: UPLOAD (UNGGAH) */}
        {signatureMode === 'upload' && (
          <div className="space-y-3">
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              ref={uploadSignatureInputRef}
              className="hidden"
              onChange={handleSignatureUpload}
            />

            <div
              onClick={() => uploadSignatureInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all flex flex-col items-center justify-center gap-2"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Pilih Berkas Scan Tanda Tangan</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Mendukung file PNG, JPG, JPEG, WEBP</p>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={removeBg}
                onChange={e => setRemoveBg(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              Hapus latar belakang putih secara otomatis
            </label>
          </div>
        )}
      </div>

      {/* Gallery of Saved Signatures */}
      {signatures.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-sm transition-colors space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Galeri Tanda Tangan Anda</h4>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
              {signatures.length}
            </span>
          </div>

          {/* Target Page Selector Dropdown */}
          <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Target Lembar:</span>
            <select
              value={targetPageSelection}
              onChange={e => {
                const val = e.target.value;
                onTargetPageChange(val === 'all' ? 'all' : Number(val));
              }}
              className="text-xs font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1 outline-none cursor-pointer shadow-xs"
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
                className="group flex items-center justify-between p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:border-blue-400 transition-colors"
              >
                <button
                  onClick={() => onPlaceSignature(sig, targetPageSelection)}
                  className="flex-1 flex items-center gap-3 text-left overflow-hidden"
                >
                  <div className="w-16 h-10 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0">
                    <img src={sig.dataUrl} alt={sig.name} className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{sig.name}</p>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
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
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center">
            Tip: Anda juga bisa mengklik langsung pada lembar halaman di kanvas untuk menempelkan tanda tangan.
          </p>
        </div>
      )}
    </div>
  );
};
