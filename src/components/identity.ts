/**
 * Hesap sistemi gelene kadar oyuncu kimliği: tarayıcıda tutulan cihaz anahtarı ve takma ad.
 * Tek kişilik sıralama, haftalık challenge ve odalar aynı anahtar ve adı paylaşır.
 */
import { isRegion, type RegionId } from "@/game/regions";

const NAME_KEY = "penalti-tahmin:ad";
const TOKEN_KEY = "penalti-tahmin:oyuncu";
const REGION_KEY = "penalti-tahmin:bolge";

export function savedRegion(): RegionId | "" {
  if (typeof window === "undefined") return "";
  try {
    const value = window.localStorage.getItem(REGION_KEY);
    return isRegion(value) ? value : "";
  } catch {
    return "";
  }
}

export function saveRegion(region: RegionId | ""): void {
  try {
    if (region) window.localStorage.setItem(REGION_KEY, region);
    else window.localStorage.removeItem(REGION_KEY);
  } catch {
    // depolama kapalıysa sessizce geç
  }
}

export function playerToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(TOKEN_KEY);
    if (existing) return existing;
    const token = crypto.randomUUID();
    window.localStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch {
    return crypto.randomUUID();
  }
}

export function savedName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveName(name: string): void {
  try {
    window.localStorage.setItem(NAME_KEY, name.trim());
  } catch {
    // depolama kapalıysa sessizce geç
  }
}
