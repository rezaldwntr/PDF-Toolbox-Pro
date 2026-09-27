// frontend/components/admin/AdminDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  DollarSign,
  Activity,
  Shield,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Zap,
  BarChart3,
  CreditCard,
  Layers,
  HelpCircle,
  AlertTriangle,
  Tag,
  Send,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { View, PromoSetting } from '../../types';
import type { PresenceState } from '../../lib/presence';
import { fetchPromoSettings, updatePromoSetting, DEFAULT_BASE_PRICES } from '../../lib/promo';
import { TargetUserSelectorModal } from '../modals/TargetUserSelectorModal';
import { SendPromoModal } from '../modals/SendPromoModal';
import { formatRupiah, formatFileSize, formatDateTimeIndonesia } from '../../lib/formatters';
import { OverviewTab } from './tabs/OverviewTab';
import { UsersTab } from './tabs/UsersTab';
import { TransactionsTab } from './tabs/TransactionsTab';
import { LogsTab } from './tabs/LogsTab';
import { RealtimeTab } from './tabs/RealtimeTab';
import { PromosTab } from './tabs/PromosTab';

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
        const sessionRes = supabase ? await supabase.auth.getSession() : null;
        const accessToken = sessionRes?.data?.session?.access_token;
        const resp = await fetch(`${BACKEND_URL}/admin/users/update-tier`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Email': ADMIN_EMAIL,
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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

    const sessionRes = supabase ? await supabase.auth.getSession() : null;
    const accessToken = sessionRes?.data?.session?.access_token;
    const headers: Record<string, string> = {
      'X-Admin-Email': ADMIN_EMAIL,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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

      if (finalUsers) {
        const now = new Date();
        const expiredUserIds: string[] = [];
        finalUsers = finalUsers.map((u: any) => {
          const t = (u.tier || 'free').toLowerCase();
          const isProRaw = ['flash', 'monthly', 'annual'].includes(t);
          const isExpired = isProRaw && u.subscription_expiry && new Date(u.subscription_expiry) < now;
          if (isExpired) {
            expiredUserIds.push(u.id);
            return { ...u, tier: 'free', is_expired: true, previous_tier: t };
          }
          return u;
        });

        // Background sync ke Supabase untuk membersihkan record kedaluwarsa di database
        if (supabase && expiredUserIds.length > 0) {
          supabase
            .from('user_profiles')
            .update({ tier: 'free', updated_at: new Date().toISOString() })
            .in('id', expiredUserIds)
            .then(({ error }: any) => {
              if (error) console.warn('Auto downgrade background error:', error);
            });
        }
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
        if (sbUsers) {
          const now = new Date();
          const normalized = sbUsers.map((u: any) => {
            const t = (u.tier || 'free').toLowerCase();
            const isProRaw = ['flash', 'monthly', 'annual'].includes(t);
            const isExpired = isProRaw && u.subscription_expiry && new Date(u.subscription_expiry) < now;
            return isExpired ? { ...u, tier: 'free', is_expired: true, previous_tier: t } : u;
          });
          setUserList(normalized);
        }
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

  // Format Helper terpusat dari lib/formatters
  const formatIDR = (val: number) => formatRupiah(val);
  const formatBytes = (bytes: number) => formatFileSize(bytes);
  const formatDateTime = (isoString?: string) => formatDateTimeIndonesia(isoString);

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

  const getUserEffectiveTier = (u: any) => {
    const rawTier = (u.tier || 'free').toLowerCase();
    const isProRaw = ['flash', 'monthly', 'annual'].includes(rawTier);
    const isExpired = Boolean(u.is_expired) || (isProRaw && Boolean(u.subscription_expiry) && new Date(u.subscription_expiry) < new Date());
    return isExpired ? 'free' : rawTier;
  };

  // Opt-in Marketing Users
  const optInUsers = userList.filter((u) => u.email && (u.accepts_marketing_emails !== false));

  // Filtered Users
  const filteredUsers = userList.filter((u) => {
    const matchesSearch =
      !userSearch ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase()));
    const effectiveTier = getUserEffectiveTier(u);
    const matchesTier = userTierFilter === 'all' || effectiveTier === userTierFilter.toLowerCase();
    const matchesMarketing =
      userMarketingFilter === 'all' ||
      (userMarketingFilter === 'opted_in' && u.accepts_marketing_emails !== false) ||
      (userMarketingFilter === 'opted_out' && u.accepts_marketing_emails === false);
    return matchesSearch && matchesTier && matchesMarketing;
  });

  // Fallback statistik tier berdasarkan status aktif riil
  const computedProTotal = userList.filter((u) => {
    const et = getUserEffectiveTier(u);
    return ['flash', 'monthly', 'annual'].includes(et);
  }).length;

  const computedTiers = userList.reduce((acc: Record<string, number>, u) => {
    const et = getUserEffectiveTier(u);
    acc[et] = (acc[et] || 0) + 1;
    return acc;
  }, {});

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
              ({stats?.users?.pro_total ?? computedProTotal} Pro)
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
              Free: {stats?.users?.tiers?.free ?? computedTiers['free'] ?? 0}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
              Flash: {stats?.users?.tiers?.flash ?? computedTiers['flash'] ?? 0}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium">
              Monthly: {stats?.users?.tiers?.monthly ?? computedTiers['monthly'] ?? 0}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 font-medium">
              Annual: {stats?.users?.tiers?.annual ?? computedTiers['annual'] ?? 0}
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
        {activeTab === 'overview' && (
          <OverviewTab stats={stats} formatIDR={formatIDR} />
        )}

        {activeTab === 'users' && (
          <UsersTab
            userList={userList}
            transactions={transactions}
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            userTierFilter={userTierFilter}
            setUserTierFilter={setUserTierFilter}
            userMarketingFilter={userMarketingFilter}
            setUserMarketingFilter={setUserMarketingFilter}
            handleCopyMarketingEmails={handleCopyMarketingEmails}
            copiedEmailsMsg={copiedEmailsMsg}
            handleOpenEmailComposer={handleOpenEmailComposer}
            actionMessage={actionMessage}
            updatingUserId={updatingUserId}
            onAttemptChangeTier={onAttemptChangeTier}
            formatIDR={formatIDR}
            formatDateTime={formatDateTime}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTab
            transactions={transactions}
            formatIDR={formatIDR}
            formatDateTime={formatDateTime}
          />
        )}

        {activeTab === 'logs' && (
          <LogsTab
            toolLogs={toolLogs}
            logToolFilter={logToolFilter}
            setLogToolFilter={setLogToolFilter}
          />
        )}

        {activeTab === 'realtime' && (
          <RealtimeTab presence={presence} />
        )}

        {activeTab === 'promos' && (
          <PromosTab
            promos={promos}
            setPromos={setPromos}
            isLoadingPromos={isLoadingPromos}
            savingPromoPlan={savingPromoPlan}
            loadPromos={loadPromos}
            handleSavePromo={handleSavePromo}
            handleTogglePromoActive={handleTogglePromoActive}
            setTargetModalPromo={setTargetModalPromo}
            formatIDR={formatIDR}
            defaultBasePrices={DEFAULT_BASE_PRICES}
          />
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
