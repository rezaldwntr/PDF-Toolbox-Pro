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

interface UsersTabProps {
  userList: any[];
  transactions: any[];
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
  onAttemptChangeTier: (user: any, newTier: string) => void;
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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Filter Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Tier:</span>
            <select
              value={userTierFilter}
              onChange={(e) => setUserTierFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Tier</option>
              <option value="free">Gratis (Free)</option>
              <option value="flash">Flash Pass</option>
              <option value="monthly">Monthly Pro</option>
              <option value="annual">Annual Pass</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Promo:</span>
            <select
              value={userMarketingFilter}
              onChange={(e: any) => setUserMarketingFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 transition-all duration-200 active:scale-[0.98] shadow-xs cursor-pointer min-h-[38px]"
              title="Salin email semua pengguna yang bersedia menerima penawaran via clipboard"
            >
              {copiedEmailsMsg ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEmailsMsg ? 'Tersalin!' : `Salin Email (${optInUsers.length})`}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenEmailComposer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold transition-all duration-200 shadow-xs shadow-indigo-500/20 cursor-pointer min-h-[38px]"
              title="Buka aplikasi email untuk mengirim penawaran promo kepada seluruh user opt-in"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Promo</span>
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Tabel Pengguna */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-5 py-3.5">Pengguna</th>
              <th className="px-5 py-3.5">Tier Langganan</th>
              <th className="px-5 py-3.5">Status Masa Aktif</th>
              <th className="px-5 py-3.5">Kuota Hari Ini</th>
              <th className="px-5 py-3.5">Terdaftar Sejak</th>
              <th className="px-5 py-3.5 text-right">Kelola Tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 font-bold flex items-center justify-center text-xs">
                            {(u.full_name || u.email || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {u.full_name || 'Tanpa Nama'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-slate-500 font-mono">
                              {u.email}
                            </span>
                            {u.accepts_marketing_emails === false ? (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                                title="User menolak menerima penawaran email"
                              >
                                🚫 No Promo
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
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
                              ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                              : effectiveTier === 'monthly'
                              ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                              : effectiveTier === 'flash'
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
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
                        <span className="text-red-500 font-medium flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Kedaluwarsa ({formatDateTime(u.subscription_expiry)})
                        </span>
                      ) : isPro ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aktif hingga {formatDateTime(u.subscription_expiry)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Paket Standar Gratis</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      {u.quota_used_today || 0} / {isPro ? '∞' : '10'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
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
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer disabled:opacity-50"
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
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-[11px] font-semibold border border-rose-200 dark:border-rose-800/60 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center gap-1 cursor-pointer"
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
                <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
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
