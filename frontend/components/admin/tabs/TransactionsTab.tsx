import React from 'react';
import { CreditCard, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface TransactionsTabProps {
  transactions: any[];
  formatIDR: (val: number) => string;
  formatDateTime: (iso?: string) => string;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  formatIDR,
  formatDateTime,
}) => {
  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-paper overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <h3 className="font-serif text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#9B4819]" />
          Daftar Pembayaran Midtrans Snap
        </h3>
        <span className="text-xs text-text-secondary font-medium">
          {transactions.length} Total Riwayat Transaksi
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-text-primary">
          <thead className="bg-elevated text-text-secondary font-semibold border-b border-border-subtle">
            <tr>
              <th className="px-5 py-3.5">Order ID</th>
              <th className="px-5 py-3.5">Email Pembeli</th>
              <th className="px-5 py-3.5">Paket</th>
              <th className="px-5 py-3.5">Nominal</th>
              <th className="px-5 py-3.5">Metode</th>
              <th className="px-5 py-3.5">Status Pembayaran</th>
              <th className="px-5 py-3.5">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/50">
            {transactions.length > 0 ? (
              transactions.map((tx) => {
                const isSettled = ['settlement', 'capture'].includes((tx.status || '').toLowerCase());
                const isPending = (tx.status || '').toLowerCase() === 'pending';

                return (
                  <tr key={tx.id} className="hover:bg-elevated/40 transition">
                    <td className="px-5 py-3.5 font-mono font-semibold text-text-primary">
                      {tx.id}
                    </td>
                    <td className="px-5 py-3.5 text-text-primary font-mono text-[11px]">
                      {tx.user_email || tx.user_id || 'Pengguna Midtrans'}
                    </td>
                    <td className="px-5 py-3.5 uppercase font-semibold text-[11px] text-[#9B4819] dark:text-[#E06D3B]">
                      {tx.plan_id}
                    </td>
                    <td className="px-5 py-3.5 font-serif font-bold text-text-primary">
                      {formatIDR(tx.gross_amount)}
                    </td>
                    <td className="px-5 py-3.5 uppercase text-text-secondary font-medium">
                      {tx.payment_type || 'snap'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-[10px] uppercase tracking-wider ${
                          isSettled
                            ? 'bg-[#314028]/10 text-[#314028] dark:text-[#34D399] border border-[#314028]/25'
                            : isPending
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25'
                        }`}
                      >
                        {isSettled && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {isPending && <Clock className="w-3 h-3" />}
                        {!isSettled && !isPending && <XCircle className="w-3 h-3" />}
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {formatDateTime(tx.created_at)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-text-secondary">
                  Belum ada transaksi pembayaran di tabel database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
