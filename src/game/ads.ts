/**
 * Reklam panosu: kalenin arkasındaki bantta kayan yazı ve görseller. Kayıtlar yönetim
 * ekranından girilir, `data/ads/` altında durur (git dışı). Saf mantık; React/Next'e bağımlı değil.
 */
export interface Ad {
  id: string;
  /** Bantta kayan yazı; görsel varsa yanında durur. Boş olabilir (yalnızca görsel). */
  text: string;
  /** Görsel dosyasının adı (`data/ads/<ad>`); yoksa null. */
  image: string | null;
  enabled: boolean;
  createdAt: number;
}

export interface AdStore {
  ads: Ad[];
}

/** Oyunun gördüğü biçim: yalnızca açık reklamlar, görsel adresiyle. */
export interface PublicAd {
  id: string;
  text: string;
  imageUrl: string | null;
}

export const EMPTY_AD_STORE: AdStore = { ads: [] };
export const AD_TEXT_MAX = 80;
export const AD_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const AD_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export type AdValidation = { ok: true; text: string } | { ok: false; error: string };

/** Yazıyı kırpar; yazı ya da görselden en az biri gerekir. */
export function validateAdText(input: unknown, hasImage: boolean): AdValidation {
  const text = typeof input === "string" ? input.replace(/\s+/g, " ").trim() : "";
  if (text.length > AD_TEXT_MAX) return { ok: false, error: `Yazı en çok ${AD_TEXT_MAX} karakter olabilir.` };
  if (!text && !hasImage) return { ok: false, error: "Bir yazı gir ya da görsel seç." };
  return { ok: true, text };
}

export function addAd(store: AdStore, ad: Ad): AdStore {
  return { ads: [...store.ads, ad] };
}

export function updateAd(store: AdStore, id: string, change: Partial<Pick<Ad, "text" | "enabled">>): AdStore {
  return { ads: store.ads.map((ad) => (ad.id === id ? { ...ad, ...change } : ad)) };
}

export function removeAd(store: AdStore, id: string): AdStore {
  return { ads: store.ads.filter((ad) => ad.id !== id) };
}

/** Sırayı değiştirir: reklamı bir yukarı (-1) ya da bir aşağı (+1) taşır. */
export function moveAd(store: AdStore, id: string, direction: -1 | 1): AdStore {
  const index = store.ads.findIndex((ad) => ad.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= store.ads.length) return store;
  const ads = [...store.ads];
  [ads[index], ads[target]] = [ads[target], ads[index]];
  return { ads };
}

export function publicAds(store: AdStore): PublicAd[] {
  return store.ads
    .filter((ad) => ad.enabled)
    .map((ad) => ({ id: ad.id, text: ad.text, imageUrl: ad.image ? `/api/ads/${ad.id}/image` : null }));
}
