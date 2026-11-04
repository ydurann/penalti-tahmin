import { ALL_MODEL_URLS } from "./modelUrls";
import { preloadModels } from "./riggedModel";

/**
 * Giriş ekranından çağrılır: oyuncu ad girerken modeller (toplam ~200 MB FBX) arka planda iner
 * ve çözümlenir; ilk tur açıldığında sahne kapsül figür göstermeden gerçek karakterlerle başlar.
 * `three` bu modülle birlikte yüklendiği için `Game.tsx` bunu dinamik içe aktarır.
 */
export function preloadScene(): void {
  if (typeof window === "undefined") return;
  preloadModels(ALL_MODEL_URLS);
}
