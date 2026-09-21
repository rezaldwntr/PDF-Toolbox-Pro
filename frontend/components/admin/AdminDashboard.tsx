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
  Gift,
  Lock,
  Unlock,
  AlertTriangle,
  Mail,
  Tag,
  Copy,
  Check,
  Send,
  Percent,
  Crown,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { View, PromoSetting } from '../../types';
import type { PresenceState } from '../../lib/presence';
import { fetchPromoSettings, updatePromoSetting, DEFAULT_BASE_PRICES } from '../../lib/promo';
import { TargetUserSelectorModal } from '../modals/TargetUserSelectorModal';
import { SendPromoModal } from '../modals/SendPromoModal';

interface AdminDashboardProps {
  onBack: () => void;
  presence: PresenceState;
}

const ADMIN_EMAIL = 'rezaldewantara@gmail.com';
const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'https://pdf-toolbox-pro-100471936008.asia-southeast2.run.app';

class TabErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error in tab:', error, errorInfo);
  }

  render() {
    if ((this as any).state?.hasError) {
      return (
        <div className="p-8 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h4 className="font-bold text-slate-900 dark:text-white text-base">
            Terjadi kendala saat menampilkan tab {(this as any).props?.tabName || ''}
          </h4>
          <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">
            {(this as any).state?.error?.message || 'Unknown render error'}
          </p>
          <button
            onClick={() => (this as any).setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Tampilkan Ulang</span>
          </button>
        </div>
      );
    }
    return (this as any).props?.children;
  }
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, presence }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions' | 'logs' | 'realtime' | 'promos'>('overview');
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
  const [userMarketingFilter, setUserMarketingFilter] = useState<'all' | 'opted_in' | 'opted_out'>('all');
  const [logToolFilter, setLogToolFilter] = useState<string>('all');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [copiedEmailsMsg, setCopiedEmailsMsg] = useState<boolean>(false);
  const [confirmDowngradeData, setConfirmDowngradeData] = useState<{
    user: any;
    targetTier: string;
    tx: any;
  } | null>(null);

  // Promo State
  const [promos, setPromos] = useState<PromoSetting[]>(() => [
    {
      id: 'promo_flash',
      plan_id: 'flash',
      title: 'Promo Flash Sale',
      discount_price: 3500,
      original_price: 5000,
      is_active: false,
      target_emails: [],
      banner_text: '⚡ Diskon Spesial Flash!',
      valid_until: null,
    },
    {
      id: 'promo_monthly',
      plan_id: 'monthly',
      title: 'Promo Monthly Pro',
      discount_price: 19000,
      original_price: 29000,
      is_active: false,
      target_emails: [],
      banner_text: '🚀 Diskon Spesial Bulanan!',
      valid_until: null,
    },
    {
      id: 'promo_annual',
      plan_id: 'annual',
      title: 'Promo Annual VIP',
      discount_price: 99000,
      original_price: 149000,
      is_active: false,
      target_emails: [],
      banner_text: '👑 Diskon Terbesar Tahunan!',
      valid_until: null,
    },
  ]);
  const [isLoadingPromos, setIsLoadingPromos] = useState<boolean>(false);
  const [savingPromoPlan, setSavingPromoPlan] = useState<string | null>(null);
  const [targetModalPromo, setTargetModalPromo] = useState<PromoSetting | null>(null);
  const [isSendPromoModalOpen, setIsSendPromoModalOpen] = useState<boolean>(false);

  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();

  const getUserPaymentInfo = useCallback((userEmail?: string, userId?: string) => {
    return transactions.find(
      (t) =>
        (t.user_id === userId || (t.user_email && userEmail && t.user_email.toLowerCase() === userEmail.toLowerCase())) &&
        ['settlement', 'capture'].includes((t.status || '').toLowerCase())
    );
  }, [transactions]);

  const onAttemptChangeTier = (u: any, newTier: string) => {
    const isDowngradeToFree = newTier === 'free';
    const paidTx = getUserPaymentInfo(u.email, u.id);
    const isPro = ['flash', 'monthly', 'annual'].includes((u.tier || '').toLowerCase());
    const isStillActive = u.subscription_expiry && new Date(u.subscription_expiry) > new Date();

    // Jika pengguna membayar resmi via Midtrans dan langganannya masih aktif, cegah downgrade instan & minta konfirmasi keras!
    if (isPro && isStillActive && paidTx && isDowngradeToFree) {
      setConfirmDowngradeData({ user: u, targetTier: newTier, tx: paidTx });
      return;
    }

    handleUpdateUserTier(u.id, newTier);
  };

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

  const loadPromos = useCallback(async () => {
    setIsLoadingPromos(true);
    try {
      const data = await fetchPromoSettings();
      const defaultPlans = ['flash', 'monthly', 'annual'];
      const merged = defaultPlans.map((plan) => {
        const existing = (data || []).find((p) => (p?.plan_id || '').toLowerCase() === plan);
        if (existing) {
          return {
            ...existing,
            target_emails: Array.isArray(existing.target_emails)
              ? existing.target_emails
              : typeof existing.target_emails === 'string'
                ? (existing.target_emails as string).replace(/[{}"']/g, '').split(',').map((s) => s.trim()).filter(Boolean)
                : [],
          };
        }
        return {
          id: `promo_${plan}`,
          plan_id: plan,
          title: `Promo ${plan.toUpperCase()}`,
          discount_price: DEFAULT_BASE_PRICES[plan] ? Math.round(DEFAULT_BASE_PRICES[plan] * 0.7) : 10000,
          original_price: DEFAULT_BASE_PRICES[plan] || 29000,
          is_active: false,
          target_emails: [],
          banner_text: `Diskon Spesial ${plan.toUpperCase()}!`,
          valid_until: null,
        };
      });
      setPromos(merged);
    } catch (err) {
      console.warn('Gagal memuat daftar promo:', err);
    } finally {
      setIsLoadingPromos(false);
    }
  }, []);

  const handleSavePromo = async (promoToSave: PromoSetting) => {
    setSavingPromoPlan(promoToSave.plan_id);
    try {
      const ok = await updatePromoSetting(promoToSave);
      if (ok) {
        setActionMessage(`Pengaturan Promo ${promoToSave.plan_id.toUpperCase()} berhasil disimpan!`);
        setTimeout(() => setActionMessage(null), 4000);
        await loadPromos();
      } else {
        alert('Gagal menyimpan promo ke Supabase. Pastikan tabel promo_settings sudah dibuat di SQL Editor.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menyimpan promo.');
    } finally {
      setSavingPromoPlan(null);
    }
  };

  const handleTogglePromoActive = async (promo: PromoSetting) => {
    const updated = { ...promo, is_active: !promo.is_active };
    setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? updated : p)));
    await handleSavePromo(updated);
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

      let finalUsers = usersRes?.users;
      let finalTxs = txRes?.transactions;
      let finalLogs = logsRes?.logs;

      // Fallback Supabase langsung jika backend Cloud Run belum update
      if (!finalUsers && supabase) {
        const { data: sbUsers } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (sbUsers) finalUsers = sbUsers;
      }

      if (!finalTxs && supabase) {
        const { data: sbTxs } = await supabase
          .from('payment_transactions')
          .select('*')
          .order('transaction_time', { ascending: false })
          .limit(100);
        if (sbTxs) finalTxs = sbTxs;
      }

      if (!finalLogs && supabase) {
        const { data: sbLogs } = await supabase
          .from('tool_usages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (sbLogs) finalLogs = sbLogs;
      }

      if (statsRes) setStats(statsRes);
      if (finalUsers) setUserList(finalUsers);
      if (finalTxs) setTransactions(finalTxs);
      if (finalLogs) setToolLogs(finalLogs);

      await loadPromos();
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      if (supabase) {
        const { data: sbUsers } = await supabase.from('user_profiles').select('*').limit(100);
        if (sbUsers) setUserList(sbUsers);
      }
      await loadPromos();
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAdmin, loadPromos]);

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

  // Opt-in Marketing Users
  const optInUsers = userList.filter((u) => u.email && (u.accepts_marketing_emails !== false));

  // Filtered Users
  const filteredUsers = userList.filter((u) => {
    const matchesSearch =
      !userSearch ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase()));
    const matchesTier = userTierFilter === 'all' || (u.tier || 'free').toLowerCase() === userTierFilter.toLowerCase();
    const matchesMarketing =
      userMarketingFilter === 'all' ||
      (userMarketingFilter === 'opted_in' && u.accepts_marketing_emails !== false) ||
      (userMarketingFilter === 'opted_out' && u.accepts_marketing_emails === false);
    return matchesSearch && matchesTier && matchesMarketing;
  });

  const handleCopyMarketingEmails = () => {
    const emails = optInUsers.map((u) => u.email).filter(Boolean);
    if (emails.length === 0) {
      alert('Belum ada pengguna yang menerima email promo.');
      return;
    }
    navigator.clipboard.writeText(emails.join(', '));
    setCopiedEmailsMsg(true);
    setTimeout(() => setCopiedEmailsMsg(false), 3000);
  };

  const handleOpenEmailComposer = () => {
    const emails = optInUsers.map((u) => u.email).filter(Boolean);
    if (emails.length === 0) {
      alert('Belum ada pengguna yang menerima email promo.');
      return;
    }
    setIsSendPromoModalOpen(true);
  };

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

        <button
          onClick={() => setActiveTab('promos')}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'promos'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          Kelola Promo & Diskon ({promos.filter((p) => p.is_active).length} Aktif)
        </button>
      </div>

      {/* Konten Tab */}
      <div className="mt-6">
        <TabErrorBoundary key={activeTab} tabName={activeTab}>
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

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <div className="flex items-center gap-1.5">
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

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Promo:</span>
                  <select
                    value={userMarketingFilter}
                    onChange={(e: any) => setUserMarketingFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="all">Semua ({userList.length})</option>
                    <option value="opted_in">✉️ Menerima Promo ({optInUsers.length})</option>
                    <option value="opted_out">🚫 Menolak Promo ({userList.length - optInUsers.length})</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                  <button
                    onClick={handleCopyMarketingEmails}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 transition shadow-xs"
                    title="Salin email semua pengguna yang bersedia menerima penawaran via clipboard"
                  >
                    {copiedEmailsMsg ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEmailsMsg ? 'Tersalin!' : `Salin Email (${optInUsers.length})`}</span>
                  </button>
                  <button
                    onClick={handleOpenEmailComposer}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-xs shadow-indigo-500/20"
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
                      const tier = (u.tier || 'free').toLowerCase();
                      const isPro = ['flash', 'monthly', 'annual'].includes(tier);
                      const isExpired = isPro && u.subscription_expiry && new Date(u.subscription_expiry) < new Date();
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
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                                      title="User menolak menerima penawaran email"
                                    >
                                      🚫 No Promo
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
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
                              {isPro && (
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
                              {hasActivePaidPlan && (
                                <span
                                  className="text-emerald-600 dark:text-emerald-400 p-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/60"
                                  title="Akun Berbayar Resmi Midtrans (Terproteksi dari pencabutan tidak sengaja)"
                                >
                                  <Lock size={13} />
                                </span>
                              )}
                              <select
                                value={tier}
                                disabled={updatingUserId === u.id}
                                onChange={(e) => onAttemptChangeTier(u, e.target.value)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer disabled:opacity-50"
                              >
                                <option value="free">Free</option>
                                <option value="flash">⚡ Flash (24 Jam)</option>
                                <option value="monthly">🚀 Monthly (30 Hari)</option>
                                <option value="annual">👑 Annual (1 Thn)</option>
                              </select>
                              {tier !== 'free' && (
                                <button
                                  onClick={() => onAttemptChangeTier(u, 'free')}
                                  disabled={updatingUserId === u.id}
                                  title={hasActivePaidPlan ? "Akun ini membayar resmi via Midtrans. Memerlukan konfirmasi keamanan untuk mencabut haknya." : "Cabut akses Pro dan kembalikan ke Free"}
                                  className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-[11px] font-semibold border border-rose-200 dark:border-rose-800/60 transition disabled:opacity-50 flex items-center gap-1"
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

        {/* ==================================================================== */}
        {/* TAB 6: KELOLA PROMO & HARGA                                          */}
        {/* ==================================================================== */}
        {activeTab === 'promos' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Tab Promo */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-600" />
                  Manajemen Harga Promo & Penawaran Khusus
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Atur potongan harga diskon untuk semua pengguna (Global) atau berikan harga promo khusus ke email pelanggan tertentu.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={loadPromos}
                  disabled={isLoadingPromos}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-semibold transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPromos ? 'animate-spin' : ''}`} />
                  <span>Muat Ulang Promo</span>
                </button>
              </div>
            </div>

            {/* Grid 3 Kartu Promo: Flash, Monthly, Annual */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {(promos || []).map((promo) => {
                const planId = (promo?.plan_id || 'monthly').toLowerCase();
                const basePrice = DEFAULT_BASE_PRICES[planId] || 29000;
                const isFlash = planId === 'flash';
                const isMonthly = planId === 'monthly';
                const isAnnual = planId === 'annual';

                const icon = isFlash ? (
                  <Zap className="w-5 h-5 text-amber-500" />
                ) : isMonthly ? (
                  <Sparkles className="w-5 h-5 text-blue-500" />
                ) : (
                  <Crown className="w-5 h-5 text-purple-500" />
                );

                const originalPrice = Number(promo?.original_price) || basePrice;
                const discountPrice = Number(promo?.discount_price) || 0;
                const discountPercent = originalPrice > 0 && discountPrice < originalPrice
                  ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
                  : 0;

                const targetEmails = Array.isArray(promo?.target_emails)
                  ? promo.target_emails
                  : typeof promo?.target_emails === 'string'
                    ? (promo.target_emails as string).replace(/[{}"']/g, '').split(',').map((s: string) => s.trim()).filter(Boolean)
                    : [];

                const isTargeted = targetEmails.length > 0;

                return (
                  <div
                    key={promo.plan_id || promo.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border ${
                      promo.is_active ? 'border-indigo-500/40 shadow-md ring-1 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800 shadow-sm opacity-90'
                    } p-6 flex flex-col justify-between transition-all`}
                  >
                    <div>
                      {/* Top Plan Info & Active Toggle */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">{icon}</div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                              Paket {promo.plan_id || 'Promo'}
                            </h4>
                            <span className="text-[11px] text-slate-400">Harga Normal: {formatIDR(basePrice)}</span>
                          </div>
                        </div>

                        {/* Switch Active */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold ${promo.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {promo.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={promo.is_active}
                            onClick={() => handleTogglePromoActive(promo)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                              promo.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                promo.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Promo Form Fields */}
                      <div className="space-y-4 py-4">
                        {/* Judul Promo */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Judul / Label Promo
                          </label>
                          <input
                            type="text"
                            value={promo.title || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, title: val } : p)));
                            }}
                            placeholder="Contoh: Promo Kilat Spesial"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        {/* Harga Promo */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Harga Diskon (Rp)
                            </label>
                            {discountPercent > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                Hemat {discountPercent}%
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              min={0}
                              step={500}
                              value={promo.discount_price ?? 0}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, discount_price: val } : p)));
                              }}
                              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                            />
                          </div>
                        </div>

                        {/* Banner Promo Text */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Teks Banner (Ditampilkan di Checkout & Modal)
                          </label>
                          <input
                            type="text"
                            value={promo.banner_text || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, banner_text: val } : p)));
                            }}
                            placeholder="Contoh: ⚡ Diskon Spesial 40% Terbatas!"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        {/* Target Pengguna (Emails) */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Target Akun Penerima
                            </label>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isTargeted
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            }`}>
                              {isTargeted ? `🎯 ${targetEmails.length} Email Khusus` : '🌐 Global (Semua User)'}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
                            {/* Tombol Utama Buka Modal & Reset */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setTargetModalPromo(promo)}
                                className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span>{isTargeted ? `Ubah / Filter Target (${targetEmails.length})` : 'Pilih Target Pengguna...'}</span>
                              </button>

                              {isTargeted && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, target_emails: [] } : p)));
                                  }}
                                  title="Reset ke mode Global (Semua Pengunjung & User)"
                                  className="p-2 rounded-xl bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 text-xs transition"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Preview Chips Tag Email */}
                            {isTargeted ? (
                              <div>
                                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-0.5">
                                  {targetEmails.slice(0, 5).map((email: string) => (
                                    <span
                                      key={email}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[10px] font-mono border border-slate-200 dark:border-slate-700 shadow-2xs"
                                    >
                                      <span className="truncate max-w-[120px]">{email}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = targetEmails.filter((e: string) => e.toLowerCase() !== email.toLowerCase());
                                          setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, target_emails: updated } : p)));
                                        }}
                                        className="text-slate-400 hover:text-rose-500 transition font-bold text-xs"
                                        title="Hapus email ini dari target"
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  ))}
                                  {targetEmails.length > 5 && (
                                    <button
                                      type="button"
                                      onClick={() => setTargetModalPromo(promo)}
                                      className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold hover:underline"
                                    >
                                      +{targetEmails.length - 5} lainnya...
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                                  <span>🎯</span>
                                  <span>Promo HANYA terlihat & berlaku untuk {targetEmails.length} akun terpilih di atas.</span>
                                </p>
                              </div>
                            ) : (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <span>🌐</span>
                                <span>Promo berlaku untuk <strong>SEMUA</strong> pengunjung dan pengguna.</span>
                              </p>
                            )}

                            {/* Opsi Accordion Manual */}
                            <details className="text-[10px] text-slate-400 group pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                              <summary className="cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                                ✏️ Edit Manual / Salin Daftar Teks
                              </summary>
                              <div className="mt-2 space-y-1">
                                <textarea
                                  rows={2}
                                  value={targetEmails.join(', ')}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const parsed = raw.split(',').map((x: string) => x.trim()).filter(Boolean);
                                    setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, target_emails: parsed } : p)));
                                  }}
                                  placeholder="Pisahkan dengan koma (misal: user1@gmail.com, user2@gmail.com)"
                                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                                />
                                <span className="text-[9px] text-slate-400">
                                  Anda dapat menempelkan banyak email sekaligus dipisahkan koma di sini.
                                </span>
                              </div>
                            </details>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tombol Simpan Promo */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleSavePromo(promo)}
                        disabled={savingPromoPlan === promo.plan_id}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {savingPromoPlan === promo.plan_id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Simpan Pengaturan {(promo.plan_id || 'PROMO').toUpperCase()}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Panduan & Info Cara Kerja Promo */}
            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-800/40 dark:to-indigo-950/20 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Cara Kerja Promo & Penawaran Diskon:
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-600 dark:text-slate-300 pt-1">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="font-bold text-indigo-600 mb-1">1. Promo Global vs Tertarget</div>
                  <p className="text-[11px] leading-relaxed">
                    Jika kolom <em>Target Akun</em> dikosongkan, promo langsung aktif untuk semua pengunjung. Jika diisi email tertentu, harga diskon hanya muncul untuk pemilik email tersebut.
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="font-bold text-indigo-600 mb-1">2. Sinkronisasi Midtrans Otomatis</div>
                  <p className="text-[11px] leading-relaxed">
                    Harga promo otomatis diterapkan pada pembuatan tagihan Midtrans Snap saat checkout, sehingga pengguna membayar sesuai nominal diskon yang Anda tetapkan.
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="font-bold text-indigo-600 mb-1">3. Integrasi Penawaran Email</div>
                  <p className="text-[11px] leading-relaxed">
                    Gunakan tombol <em>"Salin Email Promo"</em> atau <em>"Kirim Promo"</em> di tab Daftar Pengguna untuk mengabarkan kode atau diskon kepada pengguna yang bersedia menerima email penawaran.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        </TabErrorBoundary>

        {/* Modal Peringatan Keamanan Pencabutan Hak Pelanggan Berbayar */}
        {confirmDowngradeData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#1E222B] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50 relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Perlindungan Hak Pelanggan Berbayar
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                    Peringatan: Pengguna ini terverifikasi membayar resmi via Midtrans!
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs mb-5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pengguna:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{confirmDowngradeData.user.full_name || 'Tanpa Nama'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email Akun:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{confirmDowngradeData.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Order ID Midtrans:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{confirmDowngradeData.tx.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nominal Pembayaran Riil:</span>
                  <span className="font-bold text-emerald-600">{formatIDR(confirmDowngradeData.tx.gross_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode Pembayaran:</span>
                  <span className="uppercase font-semibold text-slate-700 dark:text-slate-300">{confirmDowngradeData.tx.payment_type || 'MIDTRANS GATEWAY'}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Hak Layanan Aktif Hingga:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatDateTime(confirmDowngradeData.user.subscription_expiry)}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs mb-5 leading-relaxed">
                <strong>Penting:</strong> Pengguna ini telah mengeluarkan uang nyata untuk membeli paket ini. Jika Anda mencabutnya sekarang, pengguna akan kehilangan kuota dan hak akses Pro yang telah ia bayar sebelum masa berlakunya habis.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setConfirmDowngradeData(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold transition"
                >
                  Batalkan (Pertahankan Hak Pengguna)
                </button>
                <button
                  onClick={() => {
                    const target = confirmDowngradeData;
                    setConfirmDowngradeData(null);
                    handleUpdateUserTier(target.user.id, target.targetTier);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition shadow-sm"
                >
                  Tetap Cabut / Reset ke Free
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Pemilih Pengguna Target Promo */}
        {targetModalPromo && (
          <TargetUserSelectorModal
            isOpen={Boolean(targetModalPromo)}
            onClose={() => setTargetModalPromo(null)}
            planId={targetModalPromo.plan_id}
            planTitle={targetModalPromo.title || `Paket ${targetModalPromo.plan_id.toUpperCase()}`}
            userList={userList}
            selectedEmails={
              Array.isArray(targetModalPromo.target_emails)
                ? targetModalPromo.target_emails
                : typeof targetModalPromo.target_emails === 'string'
                ? (targetModalPromo.target_emails as string).replace(/[{}"']/g, '').split(',').map((s) => s.trim()).filter(Boolean)
                : []
            }
            onApply={(emails) => {
              setPromos((prev) =>
                prev.map((p) =>
                  p.plan_id === targetModalPromo.plan_id
                    ? { ...p, target_emails: emails }
                    : p
                )
              );
              setTargetModalPromo(null);
            }}
          />
        )}

        {/* Modal Kirim Promo Email */}
        <SendPromoModal
          isOpen={isSendPromoModalOpen}
          onClose={() => setIsSendPromoModalOpen(false)}
          defaultRecipients={optInUsers.map((u) => u.email).filter(Boolean)}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
