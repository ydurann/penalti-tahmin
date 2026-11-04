import { readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { EMPTY_STORE, type ManualStore } from "@/data/manual";
import { SAMPLE_PENALTIES } from "@/data/penalties";
import { REAL_PENALTIES } from "@/data/realPenalties";
import { ROUNDS_PER_GAME } from "@/game/session";
import type { Penalty } from "@/game/types";

/**
 * Elle girilen penaltılar `src/data/penalties.manual.json` dosyasında durur; yönetim ekranı
 * bu dosyaya yazar. Dosya her istekte değişiklik zamanına göre yeniden okunur, böylece yeni
 * kayıt yeniden derleme olmadan oyuna girer. Yazma tek sunucu örneği ve yazılabilir disk
 * varsayar (geliştirme ortamı ya da kalıcı diskli sunucu); sunucusuz ortamda yazma başarısız olur.
 */
// Yol sabittir ki Next'in dosya izleyicisi yalnızca bu dosyayı kopyalasın (değişken yol bütün
// projeyi izlerdi). Docker'da `src/data` klasörü kalıcı diske sembolik bağla gider (Dockerfile).
const FILE = path.join(process.cwd(), "src", "data", "penalties.manual.json");

let cache: { mtimeMs: number; store: ManualStore } | null = null;

export async function readManualStore(): Promise<ManualStore> {
  let mtimeMs: number;
  try {
    mtimeMs = (await stat(FILE)).mtimeMs;
  } catch {
    return EMPTY_STORE;
  }
  if (cache && cache.mtimeMs === mtimeMs) return cache.store;
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8")) as Partial<ManualStore>;
    const store: ManualStore = {
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      penalties: Array.isArray(parsed.penalties) ? parsed.penalties : [],
    };
    cache = { mtimeMs, store };
    return store;
  } catch {
    return EMPTY_STORE;
  }
}

/** Önce geçici dosyaya yazıp yerine koyar; yarım yazılmış dosya kalmaz. */
export async function writeManualStore(store: ManualStore): Promise<void> {
  const tmp = `${FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(store, null, 2) + "\n", "utf8");
  await rename(tmp, FILE);
  cache = null;
}

/** Oyunun kullandığı havuz: StatsBomb'dan üretilenler + elle girilenler; yetersizse örnek veri. */
export async function loadPool(): Promise<Penalty[]> {
  const manual = await readManualStore();
  const pool = [...REAL_PENALTIES, ...manual.penalties];
  return pool.length >= ROUNDS_PER_GAME ? pool : [...SAMPLE_PENALTIES];
}
