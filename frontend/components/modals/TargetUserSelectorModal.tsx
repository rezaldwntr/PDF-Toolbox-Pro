// frontend/components/modals/TargetUserSelectorModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Check,
  Filter,
  Users,
  Sparkles,
  Zap,
  Crown,
  Mail,
  Globe,
  CheckSquare,
  Square,
  Trash2,
  UserCheck,
} from 'lucide-react';

interface TargetUserSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planTitle?: string;
  userList: any[];
  selectedEmails: string[];
  onApply: (emails: string[]) => void;
}

export const TargetUserSelectorModal: React.FC<TargetUserSelectorModalProps> = ({
  isOpen,
  onClose,
  planId,
  planTitle,
  userList,
  selectedEmails,
  onApply,
}) => {
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [marketingFilter, setMarketingFilter] = useState<'all' | 'opted_in' | 'opted_out'>('all');

  // Sinkronisasi saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      const normalized = new Set<string>();
      (selectedEmails || []).forEach((e) => {
        if (e && typeof e === 'string' && e.trim()) {
          normalized.add(e.trim().toLowerCase());
        }
      });
      setSelectedSet(normalized);
      setSearchQuery('');
      setTierFilter('all');
      setMarketingFilter('all');
    }
  }, [isOpen, selectedEmails]);

  if (!isOpen) return null;

  // Filter daftar pengguna
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return userList.filter((u) => {
      const email = (u.email || '').toLowerCase();
      const name = (u.full_name || '').toLowerCase();
      const tier = (u.tier || 'free').toLowerCase();
      const acceptsMarketing = u.accepts_marketing_emails !== false;

      const matchesSearch = !q || email.includes(q) || name.includes(q);
      const matchesTier = tierFilter === 'all' || tier === tierFilter.toLowerCase();
      const matchesMarketing =
        marketingFilter === 'all' ||
        (marketingFilter === 'opted_in' && acceptsMarketing) ||
        (marketingFilter === 'opted_out' && !acceptsMarketing);

      return matchesSearch && matchesTier && matchesMarketing;
    });
  }, [userList, searchQuery, tierFilter, marketingFilter]);

  // Toggle satu email
  const toggleUserEmail = (email: string) => {
    if (!email) return;
    const normalized = email.trim().toLowerCase();
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(normalized)) {
        next.delete(normalized);
      } else {
        next.add(normalized);
      }
      return next;
    });
  };

  // Preset: Pilih Semua User Free
  const handleSelectAllFree = () => {
    const freeEmails = userList
      .filter((u) => (u.tier || 'free').toLowerCase() === 'free' && u.email)
      .map((u) => u.email.trim().toLowerCase());

    setSelectedSet((prev) => {
      const next = new Set(prev);
      freeEmails.forEach((e) => next.add(e));
      return next;
    });
  };

  // Preset: Pilih Semua User Opt-in Email Promo
  const handleSelectAllMarketingOptIn = () => {
    const optInEmails = userList
      .filter((u) => u.accepts_marketing_emails !== false && u.email)
      .map((u) => u.email.trim().toLowerCase());

    setSelectedSet((prev) => {
      const next = new Set(prev);
      optInEmails.forEach((e) => next.add(e));
      return next;
    });
  };

  // Preset: Pilih Semua User Flash
  const handleSelectAllFlash = () => {
    const flashEmails = userList
      .filter((u) => (u.tier || '').toLowerCase() === 'flash' && u.email)
      .map((u) => u.email.trim().toLowerCase());

    setSelectedSet((prev) => {
      const next = new Set(prev);
      flashEmails.forEach((e) => next.add(e));
      return next;
    });
  };

  // Pilih semua yang tampil di hasil filter saat ini
  const handleSelectAllFiltered = () => {
    const visibleEmails = filteredUsers.map((u) => (u.email || '').trim().toLowerCase()).filter(Boolean);
    setSelectedSet((prev) => {
      const next = new Set(prev);
      visibleEmails.forEach((e) => next.add(e));
      return next;
    });
  };

  // Batal pilih semua yang tampil di hasil filter saat ini
  const handleDeselectAllFiltered = () => {
    const visibleEmails = new Set(filteredUsers.map((u) => (u.email || '').trim().toLowerCase()).filter(Boolean));
    setSelectedSet((prev) => {
      const next = new Set(prev);
      visibleEmails.forEach((e) => next.delete(e));
      return next;
    });
  };

  // Bersihkan semua pilihan (menjadikan Global)
  const handleClearAll = () => {
    setSelectedSet(new Set());
  };

  // Simpan dan terapkan
  const handleConfirm = () => {
    const emailArray = Array.from(selectedSet).filter(Boolean);
    onApply(emailArray);
    onClose();
  };

  const isAllFilteredSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => u.email && selectedSet.has(u.email.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#151921] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Pilih Target Pengguna: <span className="text-indigo-600 dark:text-indigo-400 capitalize">{planTitle || planId}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pilih pengguna yang berhak melihat dan mendapatkan harga promo diskon ini
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten Utama */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Preset Bar (1-Click Shortcuts) */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
              <span>Pintasan Segmentasi Cepat (1-Klik):</span>
              <span className="text-[10px] text-slate-400 font-normal">Klik untuk memilih massal</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSelectAllFree}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 text-xs font-semibold transition border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
              >
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span>+ Semua User Free (Target Konversi)</span>
              </button>

              <button
                type="button"
                onClick={handleSelectAllMarketingOptIn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 text-xs font-semibold transition border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-500" />
                <span>+ Semua User Opt-in Email Promo</span>
              </button>

              <button
                type="button"
                onClick={handleSelectAllFlash}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 dark:hover:text-amber-400 text-xs font-semibold transition border border-transparent hover:border-amber-200 dark:hover:border-amber-800"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>+ Semua User Flash</span>
              </button>

              {selectedSet.size > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-semibold transition border border-rose-200 dark:border-rose-800/60 ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset / Jadikan Global ({selectedSet.size} Dihapus)</span>
                </button>
              )}
            </div>
          </div>

          {/* Bar Filter & Pencarian */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Kolom Pencarian */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama atau email pengguna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Tier */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-[11px] text-slate-500 whitespace-nowrap">Tier:</span>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="w-full sm:w-auto px-2.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">Semua Tier</option>
                  <option value="free">Free</option>
                  <option value="flash">Flash Pass</option>
                  <option value="monthly">Monthly Pro</option>
                  <option value="annual">Annual VIP</option>
                </select>
              </div>

              {/* Filter Email Promo */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-[11px] text-slate-500 whitespace-nowrap">Promo:</span>
                <select
                  value={marketingFilter}
                  onChange={(e: any) => setMarketingFilter(e.target.value)}
                  className="w-full sm:w-auto px-2.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">Semua</option>
                  <option value="opted_in">✉️ Opt-in</option>
                  <option value="opted_out">🚫 Opt-out</option>
                </select>
              </div>
            </div>

            {/* Aksi Massal Baris Tampil */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500">
              <div>
                Menampilkan <strong>{filteredUsers.length}</strong> dari {userList.length} pengguna
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={isAllFilteredSelected ? handleDeselectAllFiltered : handleSelectAllFiltered}
                  disabled={filteredUsers.length === 0}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-40"
                >
                  {isAllFilteredSelected
                    ? `Batal Pilih ${filteredUsers.length} Akun Ini`
                    : `Pilih Semua ${filteredUsers.length} Akun Ini`}
                </button>
              </div>
            </div>
          </div>

          {/* Daftar Pengguna */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[360px] overflow-y-auto">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const email = (u.email || '').trim().toLowerCase();
                const isSelected = email ? selectedSet.has(email) : false;
                const tier = (u.tier || 'free').toLowerCase();
                const initial = (u.full_name?.[0] || u.email?.[0] || 'U').toUpperCase();
                const isOptIn = u.accepts_marketing_emails !== false;

                const tierBadgeColor =
                  tier === 'annual'
                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                    : tier === 'monthly'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                    : tier === 'flash'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400';

                return (
                  <div
                    key={u.id || email}
                    onClick={() => toggleUserEmail(email)}
                    className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox */}
                      <div className="text-indigo-600 flex-shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {initial}
                      </div>

                      {/* Info Akun */}
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {u.full_name || 'Tanpa Nama'}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {u.email}
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tierBadgeColor} capitalize`}>
                        {tier}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isOptIn
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {isOptIn ? '✉️ Opt-in' : '🚫 No Promo'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tidak ada pengguna yang cocok dengan kriteria pencarian atau filter di atas.
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            {selectedSet.size > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                🎯 {selectedSet.size} Pengguna Terpilih
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                <Globe className="w-3.5 h-3.5" />
                Mode Global (Semua Pengunjung & User)
              </span>
            )}
            <span className="text-slate-400 hidden sm:inline">
              {selectedSet.size > 0
                ? 'Promo HANYA akan aktif untuk akun di atas.'
                : 'Promo akan terlihat dan berlaku untuk seluruh orang.'}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {selectedSet.size > 0
                  ? `Terapkan (${selectedSet.size} Pengguna)`
                  : 'Terapkan (Mode Global)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
