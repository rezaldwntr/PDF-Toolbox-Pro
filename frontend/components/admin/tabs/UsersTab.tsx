import React from 'react';
import {
  Search,
  Copy,
  Check,
  Send,
  CheckCircle2,
  XCircle,
  CreditCard,
  Gift,
  Lock,
} from 'lucide-react';
import { AdminUser, PaymentTransaction } from '../../../types';

interface UsersTabProps {
  userList: AdminUser[];
  transactions: PaymentTransaction[];
  userSearch: string;
  setUserSearch: (val: string) => void;
  userTierFilter: string;
  setUserTierFilter: (val: string) => void;
  userMarketingFilter: 'all' | 'opted_in' | 'opted_out';
  setUserMarketingFilter: (val: 'all' | 'opted_in' | 'opted_out') => void;
  handleCopyMarketingEmails: () => void;
  copiedEmailsMsg: boolean;
  handleOpenEmailComposer: () => void;
  actionMessage: string | null;
  updatingUserId: string | null;
  onAttemptChangeTier: (user: AdminUser, newTier: string) => void;
  formatIDR: (val: number) => string;
  formatDateTime: (iso?: string) => string;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  userList,
  transactions,
  userSearch,
  setUserSearch,
  userTierFilter,
  setUserTierFilter,
  userMarketingFilter,
  setUserMarketingFilter,
  handleCopyMarketingEmails,
  copiedEmailsMsg,
  handleOpenEmailComposer,
  actionMessage,
  updatingUserId,
  onAttemptChangeTier,
  formatIDR,
  formatDateTime,
}) => {
  const optInUsers = userList.filter((u) => u.accepts_marketing_emails !== false);

  const filteredUsers = userList.filter((u) => {
    const q = userSearch.toLowerCase();
    const matchSearch =
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q));

    const rawTier = (u.tier || 'free').toLowerCase();
    const isProRaw = ['flash', 'monthly', 'annual'].includes(rawTier);
    const isExpired = Boolean(u.is_expired) || (isProRaw && Boolean(u.subscription_expiry) && new Date(u.subscription_expiry) < new Date());
    const effectiveTier = isExpired ? 'free' : rawTier;

    const matchTier = userTierFilter === 'all' || effectiveTier === userTierFilter;

    let matchMarketing = true;
    if (userMarketingFilter === 'opted_in') {
      matchMarketing = u.accepts_marketing_emails !== false;
    } else if (userMarketingFilter === 'opted_out') {
      matchMarketing = u.accepts_marketing_emails === false;
    }

    return matchSearch && matchTier && matchMarketing;
  });

  const getUserPaymentInfo = (userEmail?: string, userId?: string) => {
    return transactions.find(
      (t) =>
        (t.user_id === userId || (t.user_email && userEmail && t.user_email.toLowerCase() === userEmail.toLowerCase())) &&
        ['settlement', 'capture'].includes((t.status || '').toLowerCase())
    );
  };

  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-paper overflow-hidden animate-fade-in">
      {/* Filter Bar */}
      <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-elevated border border-border-subtle text-text-primary placeholder:text-text-secondary text-xs focus:outline-none focus:border-[#9B4819]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-secondary">Tier:</span>
            <select
              value={userTierFilter}
              onChange={(e) => setUserTierFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-elevated border border-border-subtle text-xs text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Tier</option>
              <option value="free">Gratis (Free)</option>
              <option value="flash">Flash Pass</option>
              <option value="monthly">Monthly Pro</option>
              <option value="annual">Annual Pass</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-secondary">Promo:</span>
            <select
              value={userMarketingFilter}
              onChange={(e) => setUserMarketingFilter(e.target.value as 'all' | 'opted_in' | 'opted_out')}
              className="px-3 py-1.5 rounded-xl bg-elevated border border-border-subtle text-xs text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="all">Semua ({userList.length})</option>
              <option value="opted_in">✉️ Menerima Promo ({optInUsers.length})</option>
              <option value="opted_out">🚫 Menolak Promo ({userList.length - optInUsers.length})</option>
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={handleCopyMarketingEmails}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-elevated hover:bg-surface border border-border-subtle text-text-primary text-xs font-semibold transition-all duration-200 active:scale-[0.98] shadow-2xs cursor-pointer min-h-[36px]"
              title="Salin email semua pengguna yang bersedia menerima penawaran via clipboard"
            >
              {copiedEmailsMsg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-text-secondary" />}
              <span>{copiedEmailsMsg ? 'Tersalin!' : `Salin Email (${optInUsers.length})`}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenEmailComposer}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#9B4819] hover:bg-[#7E3812] active:scale-[0.98] text-white text-xs font-semibold transition-all duration-200 shadow-2xs cursor-pointer min-h-[36px]"
              title="Buka aplikasi email untuk mengirim penawaran promo kepada seluruh user opt-in"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Promo</span>
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-[#314028]/10 border border-[#314028]/20 text-[#314028] dark:text-[#34D399] text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Tabel Pengguna */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-text-primary">
          <thead className="bg-elevated text-text-secondary font-semibold border-b border-border-subtle">
            <tr>
              <th className="px-5 py-3.5">Pengguna</th>
              <th className="px-5 py-3.5">Tier Langganan</th>
              <th className="px-5 py-3.5">Status Masa Aktif</th>
              <th className="px-5 py-3.5">Kuota Hari Ini</th>
              <th className="px-5 py-3.5">Terdaftar Sejak</th>
              <th className="px-5 py-3.5 text-right">Kelola Tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/50">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const rawTier = (u.tier || 'free').toLowerCase();
                const isProRaw = ['flash', 'monthly', 'annual'].includes(rawTier);
                const isExpired = Boolean(u.is_expired) || (isProRaw && Boolean(u.subscription_expiry) && new Date(u.subscription_expiry) < new Date());
                const effectiveTier = isExpired ? 'free' : rawTier;
                const isPro = ['flash', 'monthly', 'annual'].includes(effectiveTier);
                const paidTx = getUserPaymentInfo(u.email, u.id);
                const hasActivePaidPlan = isPro && !isExpired && Boolean(paidTx);

                return (
                  <tr key={u.id} className="hover:bg-elevated/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full border border-border-subtle object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#9B4819]/10 text-[#9B4819] font-serif font-bold flex items-center justify-center text-xs border border-[#9B4819]/20">
                            {(u.full_name || u.email || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-text-primary">
                            {u.full_name || 'Tanpa Nama'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-text-secondary font-mono">
                              {u.email}
                            </span>
                            {u.accepts_marketing_emails === false ? (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-elevated text-text-secondary border border-border-subtle"
                                title="User menolak menerima penawaran email"
                              >
                                🚫 No Promo
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#314028]/10 text-[#314028] dark:text-[#34D399] border border-[#314028]/25"
                                title="User bersedia menerima penawaran promo via email"
                              >
                                ✉️ Promo OK
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-semibold uppercase text-[10px] tracking-wide ${
                            effectiveTier === 'annual'
                              ? 'bg-[#9B4819]/15 text-[#7E3812] dark:text-[#F29F67] border border-[#9B4819]/30 font-bold'
                              : effectiveTier === 'monthly'
                              ? 'bg-[#9B4819]/10 text-[#9B4819] dark:text-[#E06D3B] border border-[#9B4819]/25 font-semibold'
                              : effectiveTier === 'flash'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 font-semibold'
                              : 'bg-elevated text-text-secondary border border-border-subtle'
                          }`}
                        >
                          {effectiveTier}
                        </span>
                        {isProRaw && !isExpired && (
                          paidTx ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 font-semibold"
                              title={`Terverifikasi Membayar Resmi! Order ID: ${paidTx.id} - ${paidTx.payment_type?.toUpperCase() || 'GATEWAY'}`}
                            >
                              <CreditCard size={11} className="text-emerald-600" />
                              <span>Midtrans: {formatIDR(paidTx.gross_amount)}</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 font-semibold"
                              title="Tier ini diberikan secara manual oleh admin atau alur formulir lama tanpa transaksi Midtrans"
                            >
                              <Gift size={11} className="text-amber-600" />
                              <span>Gift / Manual</span>
                            </span>
                          )
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {isExpired ? (
                        <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Kedaluwarsa ({formatDateTime(u.subscription_expiry)})
                        </span>
                      ) : isPro ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aktif hingga {formatDateTime(u.subscription_expiry)}
                        </span>
                      ) : (
                        <span className="text-text-secondary">Paket Standar Gratis</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      {u.quota_used_today || 0} / {isPro ? '∞' : '10'}
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {formatDateTime(u.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasActivePaidPlan && (
                          <span
                            className="text-emerald-600 dark:text-emerald-400 p-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/60"
                            title="Akun Berbayar Resmi Midtrans (Terproteksi dari pencabutan tidak sengaja)"
                          >
                            <Lock size={13} />
                          </span>
                        )}
                        <select
                          value={effectiveTier}
                          disabled={updatingUserId === u.id}
                          onChange={(e) => onAttemptChangeTier(u, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-elevated border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none cursor-pointer disabled:opacity-50"
                        >
                          <option value="free">Free</option>
                          <option value="flash">⚡ Flash (24 Jam)</option>
                          <option value="monthly">🚀 Monthly (30 Hari)</option>
                          <option value="annual">👑 Annual (1 Thn)</option>
                        </select>
                        {effectiveTier !== 'free' && (
                          <button
                            type="button"
                            onClick={() => onAttemptChangeTier(u, 'free')}
                            disabled={updatingUserId === u.id}
                            title={hasActivePaidPlan ? "Akun ini membayar resmi via Midtrans. Memerlukan konfirmasi keamanan untuk mencabut haknya." : "Cabut akses Pro dan kembalikan ke Free"}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 text-[11px] font-semibold border border-rose-500/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                          >
                            {updatingUserId === u.id ? '...' : 'Reset'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-text-secondary">
                  Tidak ada data pengguna yang cocok dengan kriteria pencarian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
