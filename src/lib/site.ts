/**
 * Sitenin arama motorları ve paylaşımlar için ortak kimliği. Yayın adresi
 * `NEXT_PUBLIC_SITE_URL` ortam değişkeninden gelir (sonunda eğik çizgi olmadan); yoksa
 * geliştirme adresi kullanılır. Metadata, robots, sitemap ve JSON-LD hepsi buradan okur.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3457").replace(/\/+$/, "");

export const SITE_NAME = "Penaltı Tahmin";

/** Arama sonucunda görünen başlık; anahtar kelimeler başta. */
export const SITE_TITLE = "Penaltı Tahmin Oyunu – Gerçek penaltıları tahmin et, 3D izle";

export const SITE_DESCRIPTION =
  "Ücretsiz online penaltı tahmin oyunu: Süper Lig, Premier League, Bundesliga, Şampiyonlar Ligi ve Dünya Kupası'ndan gerçek penaltılar. Topun kalenin neresine ve nasıl atılacağını tahmin et, vuruşu 3D sahnede izle, arkadaşlarınla yarış.";

export const SITE_KEYWORDS = [
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
