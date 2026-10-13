// frontend/components/modals/TargetUserSelectorModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Check,
  Users,
  Zap,
  Mail,
  Globe,
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

  const getEffectiveTier = (u: any): string => {
    const rawTier = (u?.tier || 'free').toLowerCase();
    const isProRaw = ['flash', 'monthly', 'annual'].includes(rawTier);
    const isExpired =
      Boolean(u?.is_expired) ||
      (isProRaw && Boolean(u?.subscription_expiry) && new Date(u.subscription_expiry) < new Date());
    return isExpired ? 'free' : rawTier;
  };

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

  // Filter daftar pengguna
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return userList.filter((u) => {
      const email = (u.email || '').toLowerCase();
      const name = (u.full_name || '').toLowerCase();
      const tier = getEffectiveTier(u);
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

  if (!isOpen) return null;

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
      .filter((u) => getEffectiveTier(u) === 'free' && u.email)
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
      .filter((u) => getEffectiveTier(u) === 'flash' && u.email)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-paper-float border border-border-subtle overflow-hidden">
        {/* Header Modal */}
        <div className="p-5 sm:px-6 border-b border-border-subtle flex items-center justify-between gap-3 bg-elevated/60">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#9B4819]/12 text-[#9B4819] dark:text-[#E06D3B] border border-[#9B4819]/25 flex items-center justify-center shrink-0 shadow-2xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-base sm:text-lg font-bold text-text-primary truncate">
                Pilih Target Pengguna:{' '}
                <span className="text-[#9B4819] dark:text-[#E06D3B] capitalize">
                  {planTitle || planId}
                </span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Pilih pengguna yang berhak melihat dan mendapatkan harga promo diskon ini
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border-subtle flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Konten Utama */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Preset Bar (1-Click Shortcuts) */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Pintasan Segmentasi Cepat (1-Klik):
              </span>
              {selectedSet.size > 0 ? (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 text-[11px] font-semibold transition border border-rose-500/25 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Reset / Jadikan Global ({selectedSet.size} Dihapus)</span>
                </button>
              ) : (
                <span className="text-[10px] text-text-secondary uppercase tracking-wider">
                  Klik untuk memilih massal
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleSelectAllFree}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-elevated hover:bg-surface text-text-primary hover:text-[#9B4819] dark:hover:text-[#E06D3B] text-xs font-semibold transition-all border border-border-subtle hover:border-[#9B4819]/40 cursor-pointer active:scale-[0.98] shadow-2xs"
              >
                <Users className="w-3.5 h-3.5 text-[#9B4819] dark:text-[#E06D3B] shrink-0" />
                <span className="truncate">+ Semua User Free</span>
              </button>

              <button
                type="button"
                onClick={handleSelectAllMarketingOptIn}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-elevated hover:bg-surface text-text-primary hover:text-[#314028] dark:hover:text-[#34D399] text-xs font-semibold transition-all border border-border-subtle hover:border-[#314028]/40 cursor-pointer active:scale-[0.98] shadow-2xs"
              >
                <Mail className="w-3.5 h-3.5 text-[#314028] dark:text-[#34D399] shrink-0" />
                <span className="truncate">+ Semua Opt-in Promo</span>
              </button>

              <button
                type="button"
                onClick={handleSelectAllFlash}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-elevated hover:bg-surface text-text-primary hover:text-amber-600 dark:hover:text-amber-400 text-xs font-semibold transition-all border border-border-subtle hover:border-amber-500/40 cursor-pointer active:scale-[0.98] shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">+ Semua User Flash</span>
              </button>
            </div>
          </div>

          {/* Bar Filter & Pencarian */}
          <div className="p-3.5 rounded-2xl bg-elevated border border-border-subtle space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              {/* Kolom Pencarian */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama atau email pengguna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface border border-border-subtle text-xs text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:border-[#9B4819]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Tier */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-[11px] font-medium text-text-secondary whitespace-nowrap">Tier:</span>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl bg-surface border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-[#9B4819] cursor-pointer"
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
                <span className="text-[11px] font-medium text-text-secondary whitespace-nowrap">Promo:</span>
                <select
                  value={marketingFilter}
                  onChange={(e: any) => setMarketingFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl bg-surface border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-[#9B4819] cursor-pointer"
                >
                  <option value="all">Semua</option>
                  <option value="opted_in">✉️ Opt-in</option>
                  <option value="opted_out">🚫 Opt-out</option>
                </select>
              </div>
            </div>

            {/* Aksi Massal Baris Tampil */}
            <div className="flex items-center justify-between pt-2.5 border-t border-border-subtle/70 text-[11px] text-text-secondary">
              <div>
                Menampilkan <strong className="text-text-primary">{filteredUsers.length}</strong> dari{' '}
                <strong className="text-text-primary">{userList.length}</strong> pengguna
              </div>
              <button
                type="button"
                onClick={isAllFilteredSelected ? handleDeselectAllFiltered : handleSelectAllFiltered}
                disabled={filteredUsers.length === 0}
                className="font-semibold text-[#9B4819] dark:text-[#E06D3B] hover:bg-[#9B4819]/10 py-1 px-3 rounded-full border border-[#9B4819]/25 transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-xs cursor-pointer"
              >
                {isAllFilteredSelected
                  ? `Batal Pilih ${filteredUsers.length} Akun Ini`
                  : `Pilih Semua ${filteredUsers.length} Akun Ini`}
              </button>
            </div>
          </div>

          {/* Daftar Pengguna */}
          <div className="border border-border-subtle rounded-2xl overflow-hidden divide-y divide-border-subtle/60 max-h-[340px] overflow-y-auto bg-surface">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const email = (u.email || '').trim().toLowerCase();
                const isSelected = email ? selectedSet.has(email) : false;
                const tier = getEffectiveTier(u);
                const initial = (u.full_name?.[0] || u.email?.[0] || 'U').toUpperCase();
                const isOptIn = u.accepts_marketing_emails !== false;

                const tierBadgeColor =
                  tier === 'annual'
                    ? 'bg-[#9B4819]/15 text-[#7E3812] dark:text-[#F29F67] border-[#9B4819]/30'
                    : tier === 'monthly'
                    ? 'bg-[#9B4819]/10 text-[#9B4819] dark:text-[#E06D3B] border-[#9B4819]/25'
                    : tier === 'flash'
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                    : 'bg-elevated text-text-secondary border-border-subtle';

                return (
                  <div
                    key={u.id || email}
                    onClick={() => toggleUserEmail(email)}
                    className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors select-none ${
                      isSelected
                        ? 'bg-[#9B4819]/10 dark:bg-[#9B4819]/15'
                        : 'hover:bg-elevated/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Custom Warm Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all border ${
                          isSelected
                            ? 'bg-[#9B4819] border-[#9B4819] text-white shadow-2xs'
                            : 'bg-surface border-border-strong text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                      </div>

                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-[#9B4819]/12 text-[#9B4819] dark:text-[#E06D3B] border border-[#9B4819]/20 flex items-center justify-center font-serif font-bold text-xs shrink-0">
                        {initial}
                      </div>

                      {/* Info Akun */}
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-text-primary truncate">
                          {u.full_name || 'Tanpa Nama'}
                        </div>
                        <div className="font-mono text-[11px] text-text-secondary truncate">
                          {u.email}
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${tierBadgeColor} capitalize`}
                      >
                        {tier}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          isOptIn
                            ? 'bg-[#314028]/10 text-[#314028] dark:text-[#34D399] border-[#314028]/25'
                            : 'bg-elevated text-text-secondary border-border-subtle'
                        }`}
                      >
                        {isOptIn ? '✉️ Opt-in' : '🚫 No Promo'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-text-secondary text-xs">
                Tidak ada pengguna yang cocok dengan kriteria pencarian atau filter di atas.
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-4 sm:px-6 border-t border-border-subtle bg-elevated/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            {selectedSet.size > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#9B4819]/12 text-[#9B4819] dark:text-[#E06D3B] font-bold border border-[#9B4819]/25">
                🎯 {selectedSet.size} Pengguna Terpilih
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#314028]/10 text-[#314028] dark:text-[#34D399] font-bold border border-[#314028]/25">
                <Globe className="w-3.5 h-3.5" />
                Mode Global (Semua Pengunjung & User)
              </span>
            )}
            <span className="text-text-secondary hidden sm:inline text-[11px]">
              {selectedSet.size > 0
                ? 'Promo HANYA akan aktif untuk akun di atas.'
                : 'Promo akan terlihat dan berlaku untuk seluruh pengguna.'}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-surface hover:bg-elevated text-text-primary border border-border-subtle text-xs font-semibold transition-all cursor-pointer active:scale-95"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-full bg-[#9B4819] hover:bg-[#7E3812] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
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

