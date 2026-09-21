// frontend/components/admin/AdminDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  DollarSign,
  Activity,
  Wrench,
  Shield,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Zap,
  BarChart3,
  TrendingUp,
  Laptop,
  CreditCard,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { View } from '../../types';
import type { PresenceState } from '../../lib/presence';

interface AdminDashboardProps {
  onBack: () => void;
  presence: PresenceState;
}

const ADMIN_EMAIL = 'rezaldewantara@gmail.com';
const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'https://pdf-toolbox-pro-100471936008.asia-southeast2.run.app';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, presence }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions' | 'logs' | 'realtime'>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [stats, setStats] = useState<any>(null);
  const [userList, setUserList] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [toolLogs, setToolLogs] = useState<any[]>([]);

  // Filter state
  const [userSearch, setUserSearch] = useState<string>('');
  const [userTierFilter, setUserTierFilter] = useState<string>('all');
  const [logToolFilter, setLogToolFilter] = useState<string>('all');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();

  const handleUpdateUserTier = async (userId: string, newTier: string) => {
    if (!isAdmin) return;
    setUpdatingUserId(userId);
    setActionMessage(null);

    const durationDays = newTier === 'annual' ? 365 : newTier === 'monthly' ? 30 : newTier === 'flash' ? 1 : null;
    let expiry: string | null = null;
    if (durationDays) {
      const d = new Date();
      d.setDate(d.getDate() + durationDays);
      expiry = d.toISOString();
    }

    try {
      let success = false;

      // 1. Coba update via Cloud Run backend jika sudah ter-deploy
      try {
        const resp = await fetch(`${BACKEND_URL}/admin/users/update-tier`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Email': ADMIN_EMAIL,
          },
          body: JSON.stringify({
            user_id: userId,
            tier: newTier,
            duration_days: durationDays,
          }),
        });

        if (resp.ok) {
          success = true;
        }
      } catch (backendErr) {
        // Backend Cloud Run belum di-deploy, lanjut ke fallback Supabase
      }

      // 2. Fallback: Update langsung melalui client Supabase
      if (!success && supabase) {
        const { error: sbErr } = await supabase
          .from('user_profiles')
          .update({
            tier: newTier.toLowerCase(),
            subscription_expiry: expiry,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (!sbErr) {
          success = true;
        } else {
          console.warn('Gagal update langsung via Supabase:', sbErr);
          // Jika RLS menolak, lempar pesan ramah
          if (sbErr.code === '42501' || sbErr.message?.includes('policy')) {
            throw new Error('Supabase RLS memerlukan izin Admin. Silakan jalankan policy admin di Supabase SQL Editor.');
          }
          throw new Error(sbErr.message || 'Gagal mengubah status tier.');
        }
      }

      if (!success) {
        throw new Error('Gagal memperbarui status tier.');
      }

      // Update state userList lokal secara instan
      setUserList((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return { ...u, tier: newTier, subscription_expiry: expiry };
          }
          return u;
        })
      );
      setActionMessage(`Tier pengguna berhasil diperbarui ke ${newTier.toUpperCase()}!`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      console.error('Error update tier:', err);
      alert(err.message || 'Terjadi kesalahan saat mengubah tier.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    if (!isAdmin) return;
    setIsRefreshing(true);
    setError(null);

    const headers = {
      'X-Admin-Email': ADMIN_EMAIL,
    };

    try {
      const [statsRes, usersRes, txRes, logsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/admin/overview-stats`, { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${BACKEND_URL}/admin/users?limit=100`, { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${BACKEND_URL}/admin/transactions?limit=100`, { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${BACKEND_URL}/admin/tool-logs?limit=100`, { headers }).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (statsRes) setStats(statsRes);
      if (usersRes?.users) setUserList(usersRes.users);
      if (txRes?.transactions) setTransactions(txRes.transactions);
      if (logsRes?.logs) setToolLogs(logsRes.logs);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      setError('Gagal memuat data dari server backend Cloud Run.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin, fetchDashboardData]);

  // Format Helper
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Guard: Jika bukan admin, blokir akses
  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-red-200 dark:border-red-900/40 p-8 sm:p-12 text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Akses Ditolak
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6 text-sm leading-relaxed">
            Halaman ini merupakan Dasbor Administrasi khusus pemilik aplikasi (<strong>{ADMIN_EMAIL}</strong>). Silakan login dengan akun admin yang terdaftar.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-md shadow-blue-500/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // Filtered Users
  const filteredUsers = userList.filter((u) => {
    const matchesSearch =
      !userSearch ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase()));
    const matchesTier = userTierFilter === 'all' || (u.tier || 'free').toLowerCase() === userTierFilter.toLowerCase();
    return matchesSearch && matchesTier;
  });

  // Filtered Logs
  const filteredLogs = toolLogs.filter((l) => {
    return logToolFilter === 'all' || (l.tool_name || '').toLowerCase() === logToolFilter.toLowerCase();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Shield className="w-4 h-4" />
                </span>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Admin Dashboard & Analitik
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pantau pengguna, transaksi Midtrans, dan pemakaian alat realtime
              </p>
            </div>
          </div>
        </div>

        {/* Realtime Live Counter Badge & Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Pulsing Live Presence Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>{presence.onlineCount} Online Sekarang</span>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-xs font-medium transition shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-sm flex items-center gap-3">
          <HelpCircle className="w-5 h-5 flex-shrink-0 text-amber-500" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Kartu Metrik Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Kartu 1: Pengguna Terdaftar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pengguna Terdaftar
            </span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats?.users?.total ?? userList.length}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              ({stats?.users?.pro_total ?? 0} Pro)
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
              Free: {stats?.users?.tiers?.free ?? 0}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
              Flash: {stats?.users?.tiers?.flash ?? 0}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium">
              Monthly: {stats?.users?.tiers?.monthly ?? 0}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 font-medium">
              Annual: {stats?.users?.tiers?.annual ?? 0}
            </span>
          </div>
        </div>

        {/* Kartu 2: Pendapatan Midtrans */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Omset Penjualan
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatIDR(stats?.revenue?.total_idr ?? 0)}
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{stats?.revenue?.successful_orders ?? 0} Transaksi Berhasil</span>
            <span className="text-slate-400">Midtrans Gateway</span>
          </div>
        </div>

        {/* Kartu 3: Total Operasi PDF */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Operasi Alat
            </span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Zap className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats?.usages?.total_operations ?? toolLogs.length}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              Eksekusi
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Tamu: {stats?.usages?.guest_operations ?? 0} ({stats?.usages?.guest_percentage ?? 0}%)</span>
            <span>Member: {stats?.usages?.member_operations ?? 0}</span>
          </div>
        </div>

        {/* Kartu 4: Realtime Online Presences */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Aktif Detik Ini
            </span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Activity className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {presence.onlineCount}
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              Sesi Aktif
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Supabase Realtime Sync</span>
            <span className="text-emerald-500 font-semibold">Live</span>
          </div>
        </div>
      </div>

      {/* Navigasi Tab */}
      <div className="mt-8 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Ringkasan & Peringkat Alat
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Daftar Pengguna ({userList.length})
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'transactions'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Transaksi Midtrans ({transactions.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          Log Pemakaian Alat ({toolLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('realtime')}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'realtime'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          Sesi Realtime ({presence.onlineCount})
        </button>
      </div>

      {/* Konten Tab */}
      <div className="mt-6">
        {/* ==================================================================== */}
        {/* TAB 1: OVERVIEW & TOP TOOLS                                          */}
        {/* ==================================================================== */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visualisasi Peringkat Alat Paling Sering Dipakai (2 Kolom) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    Peringkat Alat PDF Terpopuler
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Frekuensi pemrosesan berkas oleh pengguna tamu maupun terdaftar
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                  Top 10 Alat
                </span>
              </div>

              {stats?.usages?.top_tools && stats.usages.top_tools.length > 0 ? (
                <div className="space-y-3.5">
                  {stats.usages.top_tools.map((item: any, idx: number) => {
                    const maxCount = stats.usages.top_tools[0]?.count || 1;
                    const barWidth = Math.max(8, (item.count / maxCount) * 100);

                    return (
                      <div key={item.tool_name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 capitalize">
                            <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            {item.tool_name.replace(/-/g, ' ')}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            {item.count} file ({item.percent}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Belum ada rekaman eksekusi alat di database. Log akan muncul otomatis saat ada pengunjung yang menggunakan alat PDF.
                </div>
              )}
            </div>

            {/* Rekomendasi Pengembangan Bisnis & Konversi (1 Kolom) */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-indigo-700/30">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  Wawasan Pengembangan Produk
                </div>
                <h4 className="text-lg font-bold mt-2">
                  Optimasi Monetisasi & Server
                </h4>
                <p className="text-xs text-indigo-100/80 mt-2 leading-relaxed">
                  Dari total <strong>{stats?.usages?.total_operations ?? 0}</strong> operasi berkas, sebanyak <strong>{stats?.usages?.guest_percentage ?? 0}%</strong> dilakukan oleh pengguna tamu.
                </p>
                <div className="mt-4 pt-4 border-t border-indigo-700/50 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-indigo-400">✓</span>
                    <span>Tampilkan penawaran Flash Pass Rp5.000 saat kuota tamu habis untuk konversi instan.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-indigo-400">✓</span>
                    <span>Alat teratas layak ditempatkan di bagian paling atas beranda (Hero/Featured).</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                  Distribusi Omset Berdasarkan Paket
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/5 border border-amber-500/15">
                    <span className="font-semibold text-amber-700 dark:text-amber-300">24-Hour Flash Pass (Rp5.000)</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {formatIDR(stats?.revenue?.by_plan?.flash ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-blue-500/5 border border-blue-500/15">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">Monthly Pro (Rp29.000)</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {formatIDR(stats?.revenue?.by_plan?.monthly ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-purple-500/5 border border-purple-500/15">
                    <span className="font-semibold text-purple-700 dark:text-purple-300">Annual Pass (Rp149.000)</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {formatIDR(stats?.revenue?.by_plan?.annual ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: DIREKTORI PENGGUNA                                            */}
        {/* ==================================================================== */}
        {activeTab === 'users' && (
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
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500">Tier:</span>
                <select
                  value={userTierFilter}
                  onChange={(e) => setUserTierFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">Semua Tier</option>
                  <option value="free">Gratis (Free)</option>
                  <option value="flash">Flash Pass</option>
                  <option value="monthly">Monthly Pro</option>
                  <option value="annual">Annual Pass</option>
                </select>
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
                      const tier = (u.tier || 'free').toLowerCase();
                      const isPro = ['flash', 'monthly', 'annual'].includes(tier);
                      const isExpired = isPro && u.subscription_expiry && new Date(u.subscription_expiry) < new Date();

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
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full font-semibold uppercase text-[10px] tracking-wide ${
                                tier === 'annual'
                                  ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                                  : tier === 'monthly'
                                  ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                  : tier === 'flash'
                                  ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {tier}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {isPro ? (
                              isExpired ? (
                                <span className="text-red-500 font-medium flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5" /> Kedaluwarsa ({formatDateTime(u.subscription_expiry)})
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Aktif hingga {formatDateTime(u.subscription_expiry)}
                                </span>
                              )
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
                              <select
                                value={tier}
                                disabled={updatingUserId === u.id}
                                onChange={(e) => handleUpdateUserTier(u.id, e.target.value)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer disabled:opacity-50"
                              >
                                <option value="free">Free</option>
                                <option value="flash">⚡ Flash (24 Jam)</option>
                                <option value="monthly">🚀 Monthly (30 Hari)</option>
                                <option value="annual">👑 Annual (1 Thn)</option>
                              </select>
                              {tier !== 'free' && (
                                <button
                                  onClick={() => handleUpdateUserTier(u.id, 'free')}
                                  disabled={updatingUserId === u.id}
                                  title="Cabut akses Pro dan kembalikan ke Free"
                                  className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-[11px] font-semibold border border-rose-200 dark:border-rose-800/60 transition disabled:opacity-50"
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
        )}

        {/* ==================================================================== */}
        {/* TAB 3: TRANSAKSI MIDTRANS                                            */}
        {/* ==================================================================== */}
        {activeTab === 'transactions' && (
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
        )}

        {/* ==================================================================== */}
        {/* TAB 4: LOG PEMAKAIAN ALAT (TAMU & MEMBER)                            */}
        {/* ==================================================================== */}
        {activeTab === 'logs' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Riwayat Eksekusi Alat PDF (Realtime Telemetry)
              </h3>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Filter Alat:</span>
                <select
                  value={logToolFilter}
                  onChange={(e) => setLogToolFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">Semua Alat</option>
                  <option value="merge">Gabungkan (Merge)</option>
                  <option value="split">Pisahkan (Split)</option>
                  <option value="compress">Kompres</option>
                  <option value="word">PDF ke Word</option>
                  <option value="ocr">OCR PDF</option>
                  <option value="watermark">Watermark</option>
                  <option value="translate">Terjemahkan</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Waktu</th>
                    <th className="px-5 py-3.5">Nama Alat</th>
                    <th className="px-5 py-3.5">Tipe Pengguna</th>
                    <th className="px-5 py-3.5">Ukuran Berkas</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="px-5 py-3.5 font-mono text-slate-500">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white capitalize">
                          {log.tool_name}
                        </td>
                        <td className="px-5 py-3.5">
                          {log.is_guest ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                              Tamu (Guest / Tanpa Login)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-mono text-[11px]">
                              {log.user_email || 'Member Login'}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                          {formatBytes(log.file_size_bytes)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
                              (log.status || '').toLowerCase() === 'success'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-red-500/10 text-red-600'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                        Belum ada rekaman eksekusi alat di tabel tool_usages.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 5: SESI REALTIME PRESENCE                                        */}
        {/* ==================================================================== */}
        {activeTab === 'realtime' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  Pengunjung Aktif Detik Ini (Realtime WebSocket)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Sinkronisasi langsung via saluran WebSocket Supabase Presence tanpa beban database
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold text-xs">
                {presence.onlineCount} Tab / Sesi Terhubung
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {presence.activeUsers.map((u, i) => (
                <div
                  key={`${u.id}-${i}`}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                      {u.isGuest ? 'Pengunjung Tamu' : u.email || 'Pengguna Login'}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="capitalize font-medium text-indigo-500">{u.tier}</span>
                      <span>•</span>
                      <span>Online sejak {new Date(u.onlineAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
