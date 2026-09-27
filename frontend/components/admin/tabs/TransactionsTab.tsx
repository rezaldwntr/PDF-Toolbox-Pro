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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-600" />
          Daftar Pembayaran Midtrans Snap
        </h3>
        <span className="text-xs text-slate-500">
          {transactions.length} Total Riwayat Transaksi
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
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
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {transactions.length > 0 ? (
              transactions.map((tx) => {
                const isSettled = ['settlement', 'capture'].includes((tx.status || '').toLowerCase());
                const isPending = (tx.status || '').toLowerCase() === 'pending';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-900 dark:text-white">
                      {tx.id}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-mono">
                      {tx.user_email || tx.user_id || 'Pengguna Midtrans'}
                    </td>
                    <td className="px-5 py-3.5 uppercase font-semibold text-[11px]">
                      {tx.plan_id}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {formatIDR(tx.gross_amount)}
                    </td>
                    <td className="px-5 py-3.5 uppercase text-slate-500 font-medium">
                      {tx.payment_type || 'snap'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-[10px] uppercase tracking-wider ${
                          isSettled
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : isPending
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-600 border border-red-500/20'
                        }`}
                      >
                        {isSettled && <CheckCircle2 className="w-3 h-3" />}
                        {isPending && <Clock className="w-3 h-3" />}
                        {!isSettled && !isPending && <XCircle className="w-3 h-3" />}
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {formatDateTime(tx.created_at)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
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
