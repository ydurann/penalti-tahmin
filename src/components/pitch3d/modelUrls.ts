/**
 * Mixamo model ve hareket dosyaları (`public/models/`, git dışı). Modeller (T-poz) ve
 * hareketler ayrı dosyalardadır; eski manken dosyalarında ikisi birlikteydi. Liste giriş
 * ekranındaki ön yükleme için de kullanılır.
 */
export const KEEPER_MODEL_URL = "/models/kaleci.fbx";
export const KEEPER_DIVE_URL = "/models/kaleci-dalis.fbx";
export const KEEPER_IDLE_URL = "/models/kaleci-orta.fbx";
export const KEEPER_CATCH_URL = "/models/kaleci-orta-yakalama.fbx";
export const SHOOTER_MODEL_URL = "/models/penaltici.fbx";
export const SHOOTER_MOTION_URL = "/models/penaltici-vurus.fbx";
/** Tahmin sırasındaki bekleme; dosya yoksa oyuncu koşunun ilk karesinde durur. */
export const SHOOTER_IDLE_URL = "/models/penaltici-bekleme.fbx";

/** Ön yükleme sırası: önce sahnede ilk görünenler (modeller ve bekleme), sonra vuruş ve dalış. */
export const ALL_MODEL_URLS = [
  SHOOTER_MODEL_URL,
  KEEPER_MODEL_URL,
  SHOOTER_IDLE_URL,
  KEEPER_IDLE_URL,
  SHOOTER_MOTION_URL,
  KEEPER_DIVE_URL,
  KEEPER_CATCH_URL,
];
