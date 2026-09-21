// frontend/lib/promo.ts
import { supabase } from './supabase';
import { PromoSetting } from '../types';

export const DEFAULT_BASE_PRICES: Record<string, number> = {
  flash: 5000,
  monthly: 29000,
  annual: 149000,
};

/** Mengambil seluruh promo dari tabel promo_settings Supabase */
export const fetchPromoSettings = async (): Promise<PromoSetting[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('promo_settings')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      plan_id: item.plan_id,
      title: item.title,
      discount_price: Number(item.discount_price),
      original_price: Number(item.original_price),
      is_active: Boolean(item.is_active),
      target_emails: Array.isArray(item.target_emails) ? item.target_emails : [],
      banner_text: item.banner_text || '',
      valid_until: item.valid_until,
    }));
  } catch (err) {
    console.warn('Gagal memuat promo settings:', err);
    return [];
  }
};

export interface EffectivePriceInfo {
  price: number;
  originalPrice: number;
  isPromo: boolean;
  discountPercent: number;
  title?: string;
  bannerText?: string;
}

/**
 * Menghitung harga efektif berdasarkan promo aktif dan target user.
 * Promo berlaku jika:
 * 1. promo.is_active === true
 * 2. target_emails kosong (berlaku global), ATAU email user terdaftar di target_emails.
 */
export const calculateEffectivePrice = (
  planId: string,
  userEmail?: string | null,
  promos?: PromoSetting[]
): EffectivePriceInfo => {
  const basePrice = DEFAULT_BASE_PRICES[planId.toLowerCase()] || 29000;
  if (!promos || promos.length === 0) {
    return {
      price: basePrice,
      originalPrice: basePrice,
      isPromo: false,
      discountPercent: 0,
    };
  }

  const activePromo = promos.find((p) => {
    if (!p.is_active || p.plan_id.toLowerCase() !== planId.toLowerCase()) return false;
    
    // Cek masa berlaku jika diisi
    if (p.valid_until && new Date(p.valid_until) < new Date()) return false;

    // Jika target_emails kosong atau length === 0, berlaku untuk SEMUA pengguna
    if (!p.target_emails || p.target_emails.length === 0) return true;

    // Jika ada target_emails, cek apakah email user ada di dalamnya
    if (!userEmail) return false;
    const normalizedTarget = p.target_emails.map((e) => e.trim().toLowerCase());
    return normalizedTarget.includes(userEmail.trim().toLowerCase());
  });

  if (!activePromo) {
    return {
      price: basePrice,
      originalPrice: basePrice,
      isPromo: false,
      discountPercent: 0,
    };
  }

  const promoPrice = activePromo.discount_price;
  const original = activePromo.original_price || basePrice;
  const discountPercent = original > 0 ? Math.round(((original - promoPrice) / original) * 100) : 0;

  return {
    price: promoPrice,
    originalPrice: original,
    isPromo: true,
    discountPercent,
    title: activePromo.title,
    bannerText: activePromo.banner_text,
  };
};

/** Mengupdate promo setting di Supabase (Khusus Admin) */
export const updatePromoSetting = async (promo: PromoSetting): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('promo_settings')
      .upsert({
        id: promo.id,
        plan_id: promo.plan_id,
        title: promo.title,
        discount_price: promo.discount_price,
        original_price: promo.original_price,
        is_active: promo.is_active,
        target_emails: promo.target_emails,
        banner_text: promo.banner_text || null,
        valid_until: promo.valid_until || null,
        updated_at: new Date().toISOString(),
      });

    return !error;
  } catch (err) {
    console.error('Error saat update promo setting:', err);
    return false;
  }
};
