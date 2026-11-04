/**
 * Sitenin arama motorları ve paylaşımlar için ortak kimliği. Yayın adresi
 * `NEXT_PUBLIC_SITE_URL` ortam değişkeninden gelir (sonunda eğik çizgi olmadan); yoksa
 * geliştirme adresi kullanılır. Metadata, robots, sitemap ve JSON-LD hepsi buradan okur.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3457").replace(/\/+$/, "");

/** Marka adı (`src/lib/brand.tsx`); arama ifadesi "penaltı tahmin oyunu" başlık ve açıklamada kalır. */
export const SITE_NAME = "GoalSpot";

/** Arama sonucunda görünen başlık; marka önde, anahtar kelimeler hemen ardından. */
export const SITE_TITLE = "GoalSpot – Penaltı Tahmin Oyunu: gerçek penaltıları tahmin et, 3D izle";

export const SITE_DESCRIPTION =
  "GoalSpot, ücretsiz online penaltı tahmin oyunu: Süper Lig, Premier League, Bundesliga, Şampiyonlar Ligi ve Dünya Kupası'ndan gerçek penaltılar. Topun kalenin neresine ve nasıl atılacağını tahmin et, vuruşu 3D sahnede izle, arkadaşlarınla yarış.";

/** Yayın alan adı (görsellerde); yerel adreste boş kalır. */
export const SITE_HOST = (() => {
  try {
    const host = new URL(SITE_URL).host;
    return host.includes("localhost") ? "" : host;
  } catch {
    return "";
  }
})();

export const SITE_KEYWORDS = [
  "GoalSpot",
  "penaltı tahmin",
  "penaltı oyunu",
  "penaltı tahmin oyunu",
  "online penaltı oyunu",
  "futbol oyunu",
  "futbol tahmin oyunu",
  "penaltı atışı oyunu",
  "Süper Lig penaltıları",
  "penalty prediction game",
  "Elfmeter Spiel",
];

/** Arayüz dilleri; dil adresi değil, istemci tarafı seçimdir (bkz. LocaleProvider). */
export const SITE_LOCALES = ["tr", "en", "de"] as const;
