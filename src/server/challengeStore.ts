import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pickWeekPenalties, type ChallengeBoard } from "@/game/challenge";
import { ROUNDS_PER_GAME } from "@/game/session";
import type { Penalty } from "@/game/types";

/**
 * Haftalık challenge tabloları `data/challenge/<hafta>.json` dosyalarında durur (git dışı),
 * böylece sunucu yeniden başlasa da sıralama kalır. Tek sunucu örneği ve yazılabilir disk
 * varsayar; Faz 3'te veritabanına taşınır. Yazmalar sırayla kuyruklanır.
 */
const DIR = path.join(process.cwd(), "data", "challenge");
const fileOf = (key: string) => path.join(DIR, `${key}.json`);

const cache = new Map<string, { mtimeMs: number; board: ChallengeBoard }>();
let queue: Promise<unknown> = Promise.resolve();

/** Haftanın tablosunu okur; yoksa havuzdan penaltıları seçip oluşturur. */
export async function readBoard(key: string, pool: readonly Penalty[]): Promise<ChallengeBoard> {
  const file = fileOf(key);
  try {
    const { mtimeMs } = await stat(file);
    const cached = cache.get(key);
    if (cached && cached.mtimeMs === mtimeMs) return cached.board;
    const board = JSON.parse(await readFile(file, "utf8")) as ChallengeBoard;
    cache.set(key, { mtimeMs, board });
    return board;
  } catch {
    const board: ChallengeBoard = {
      key,
      penaltyIds: pickWeekPenalties(pool, key, ROUNDS_PER_GAME).map((p) => p.id),
      attempts: {},
    };
    await writeBoard(board);
    return board;
  }
}

export async function writeBoard(board: ChallengeBoard): Promise<void> {
  await mkdir(DIR, { recursive: true });
  const file = fileOf(board.key);
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(board, null, 2) + "\n", "utf8");
  await rename(tmp, file);
  cache.delete(board.key);
}

/** Oku-değiştir-yaz adımlarını sıraya koyar; eşzamanlı istekler birbirini ezmez. */
export function updateBoard<T>(
  key: string,
  pool: readonly Penalty[],
  change: (board: ChallengeBoard) => { board: ChallengeBoard; result: T },
): Promise<T> {
  const run = queue.then(async () => {
    const { board, result } = change(await readBoard(key, pool));
    await writeBoard(board);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Haftanın penaltıları, dondurulmuş sırayla; havuzdan silinenler atlanır. */
export function weekPenalties(board: ChallengeBoard, pool: readonly Penalty[]): Penalty[] {
  const byId = new Map(pool.map((p) => [p.id, p]));
  return board.penaltyIds.map((id) => byId.get(id)).filter((p): p is Penalty => !!p);
}
