import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { EMPTY_AD_STORE, type AdStore } from "@/game/ads";

/**
 * Reklamlar `data/ads/ads.json` dosyasında, görseller aynı klasörde durur (git dışı).
 * Tek sunucu örneği ve yazılabilir disk varsayar; sunucusuz ortamda yazma başarısız olur.
 */
const DIR = path.join(process.cwd(), "data", "ads");
const FILE = path.join(DIR, "ads.json");

let cache: { mtimeMs: number; store: AdStore } | null = null;
let queue: Promise<unknown> = Promise.resolve();

export async function readAdStore(): Promise<AdStore> {
  try {
    const { mtimeMs } = await stat(FILE);
    if (cache && cache.mtimeMs === mtimeMs) return cache.store;
    const parsed = JSON.parse(await readFile(FILE, "utf8")) as Partial<AdStore>;
    const store: AdStore = { ads: Array.isArray(parsed.ads) ? parsed.ads : [] };
    cache = { mtimeMs, store };
    return store;
  } catch {
    return EMPTY_AD_STORE;
  }
}

async function writeAdStore(store: AdStore): Promise<void> {
  await mkdir(DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(store, null, 2) + "\n", "utf8");
  await rename(tmp, FILE);
  cache = null;
}

/** Oku-değiştir-yaz; eşzamanlı istekler sıraya girer. Değişiklik sonucu döner. */
export function updateAdStore(change: (store: AdStore) => AdStore): Promise<AdStore> {
  const run = queue.then(async () => {
    const next = change(await readAdStore());
    await writeAdStore(next);
    return next;
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Dosya adı yalnızca kimlik + uzantıdan oluşur; dizin dışına çıkılamaz. */
const imagePath = (file: string) => path.join(DIR, path.basename(file));

export async function saveAdImage(file: string, bytes: Uint8Array): Promise<void> {
  await mkdir(DIR, { recursive: true });
  await writeFile(imagePath(file), bytes);
}

export async function readAdImage(file: string): Promise<Buffer | null> {
  try {
    return await readFile(imagePath(file));
  } catch {
    return null;
  }
}

export async function deleteAdImage(file: string): Promise<void> {
  await rm(imagePath(file), { force: true });
}
