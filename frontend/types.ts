
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
  
  BLOG,
  FAQ,
  PRIVACY,
  TERMS,
  ABOUT,
  CONTACT,
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

// Deklarasi konstanta yang diinjeksi Vite saat build di Vercel
declare global {
  const __VERCEL_ENV__: string | undefined;
  const __GIT_BRANCH__: string | undefined;
}
