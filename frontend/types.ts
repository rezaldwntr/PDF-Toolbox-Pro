
export enum View {
  HOME_TAB,
  TOOLS_TAB,
  PROFILE_TAB,
  PRICING,

  MERGE,
  SPLIT,
  COMPRESS,
  PDF_TO_WORD,
  PDF_TO_EXCEL,
  PDF_TO_PPT,
  PDF_TO_IMAGE,
  ADD_TEXT,
  ADD_SIGNATURE,
  ORGANIZE,
  WATERMARK,
  PROTECT_PDF,
  UNLOCK_PDF,
  CROP_PDF,
  PDF_A,
  EDIT_PDF,
  OCR_PDF,
  TRANSLATE_PDF,
  BANK_STATEMENT,
  REDACT_PDF,
  DEVELOPER_API,
  
  BLOG,
  FAQ,
  PRIVACY,
  TERMS,
  ABOUT,
  CONTACT,

  ADMIN_DASHBOARD,
}

export type EnvironmentMode = 'preview' | 'production';

/** Tier langganan pengguna */
export type UserTier = 'guest' | 'free' | 'flash' | 'monthly' | 'annual';

/** Profil pengguna yang sudah login (dari Supabase) */
export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  tier: Exclude<UserTier, 'guest'>;  // login user tidak bisa guest
  quotaUsedToday: number;
  quotaResetDate: string; // ISO date string
  subscriptionExpiry: string | null; // ISO timestamp atau null
  acceptsMarketingEmails?: boolean;
  lastNotifiedTier?: string | null;
}

export interface PromoSetting {
  id: string;
  plan_id: 'flash' | 'monthly' | 'annual';
  title: string;
  discount_price: number;
  original_price: number;
  is_active: boolean;
  target_emails: string[];
  banner_text?: string;
  valid_until?: string | null;
}

/** Konfigurasi per tier */
export interface TierConfig {
  tier: UserTier;
  label: string;
  dailyQuota: number | null; // null = unlimited
  maxFileSizeMB: number;
  maxBatchFiles: number;
  hasAds: boolean;
  hasWatermark: boolean;
  price: string;
  priceNote: string;
}

/** Varian tampilan PaywallModal */
export type PaywallVariant = 'quota_exhausted' | 'file_too_large' | 'pro_feature';

/** Profil pengguna untuk Admin Dashboard */
export interface AdminUser {
  id: string;
  email: string;
  full_name?: string | null;
  tier?: string;
  is_expired?: boolean;
  subscription_expiry?: string | null;
  accepts_marketing_emails?: boolean;
  quota_used_today?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

/** Entitas transaksi pembayaran Midtrans */
export interface PaymentTransaction {
  id: string;
  user_id?: string;
  user_email?: string;
  plan_id: string;
  gross_amount: number;
  payment_type?: string;
  status: string;
  created_at?: string;
  [key: string]: any;
}

/** Log telemetri pemakaian alat PDF */
export interface ToolUsageLog {
  id: string;
  created_at: string;
  tool_name: string;
  is_guest?: boolean;
  user_email?: string;
  file_size_bytes: number;
  status: string;
  [key: string]: any;
}

/** Statistik ringkasan untuk Admin Overview Tab */
export interface AdminOverviewStats {
  usages?: {
    total_operations?: number;
    guest_percentage?: number;
    top_tools?: Array<{
      tool_name: string;
      count: number;
      percent: number;
    }>;
  };
  revenue?: {
    by_plan?: {
      flash?: number;
      monthly?: number;
      annual?: number;
    };
  };
}

// Deklarasi konstanta yang diinjeksi Vite saat build di Vercel
declare global {
  const __VERCEL_ENV__: string | undefined;
  const __GIT_BRANCH__: string | undefined;
}

