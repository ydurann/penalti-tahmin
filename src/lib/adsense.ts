/**
 * Google AdSense yapılandırması. Yayıncı kimliği ve birim (slot) kimlikleri ortam
 * değişkenlerinden gelir; hiçbiri yoksa reklam betiği yüklenmez ve yayında alanlar boş kalır,
 * geliştirmede yerini gösteren kesikli kutu çizilir.
 *
 *   NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-1234567890123456
 *   NEXT_PUBLIC_ADSENSE_SLOT_INTRO=1111111111     # giriş kartının altı
 *   NEXT_PUBLIC_ADSENSE_SLOT_FINISH=2222222222    # oyun sonu ekranı
 *   NEXT_PUBLIC_ADSENSE_SLOT_CONTENT=3333333333   # lig ve oyuncu sayfaları
 *
 * `NEXT_PUBLIC_` öneki istemcide okunabilmesi için zorunludur; değer değişince dev sunucusu
 * yeniden başlatılır.
 */
export type AdPlacement = "intro" | "finish" | "content";

export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

export const ADSENSE_SLOTS: Record<AdPlacement, string> = {
  intro: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INTRO ?? "",
  finish: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FINISH ?? "",
  content: process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT ?? "",
};

/** Yayıncı kimliği "ca-pub-…" biçiminde mi (ads.txt için "pub-…" kısmı). */
export const ADSENSE_PUB_ID = ADSENSE_CLIENT.replace(/^ca-/, "");

export const adsenseEnabled = () => /^ca-pub-\d{10,}$/.test(ADSENSE_CLIENT);
