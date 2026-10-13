import React, { useMemo } from 'react';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { PaymentTransaction } from '../../../types';

interface TransactionsTabProps {
  transactions: PaymentTransaction[];
  formatIDR: (val: number) => string;
  formatDateTime: (iso?: string) => string;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  formatIDR,
  formatDateTime,
}) => {
  const successfulTransactions = useMemo(
    () =>
      (transactions || []).filter((tx) =>
        ['settlement', 'capture', 'paid', 'success'].includes(
          (tx.status || '').toLowerCase().trim()
        )
      ),
    [transactions]
  );

  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-paper overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <h3 className="font-serif text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#9B4819]" />
          Daftar Pembayaran Berhasil (Midtrans Snap)
        </h3>
        <span className="text-xs text-[#314028] dark:text-[#34D399] bg-[#314028]/10 border border-[#314028]/25 px-2.5 py-0.5 rounded-full font-semibold">
          {successfulTransactions.length} Transaksi Berhasil
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
              <th className="px-5 py-3.5">Waktu Lunas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/50">
            {successfulTransactions.length > 0 ? (
              successfulTransactions.map((tx) => (
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
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-[10px] uppercase tracking-wider bg-[#314028]/10 text-[#314028] dark:text-[#34D399] border border-[#314028]/25">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>BERHASIL ({tx.status})</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-text-secondary font-mono text-[11px]">
                    {formatDateTime(tx.settlement_time || tx.transaction_time || tx.created_at)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-text-secondary">
                  Belum ada riwayat transaksi pembayaran yang berhasil (settlement).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

