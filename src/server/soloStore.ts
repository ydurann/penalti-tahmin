import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { EMPTY_SOLO_BOARD, type SoloBoard } from "@/game/soloBoard";

/**
 * Tek kişilik toplam puan tablosu `data/leaderboard/solo.json` dosyasında durur (git dışı).
 * Tek sunucu örneği ve yazılabilir disk varsayar; Faz 3'te veritabanına taşınır.
 */
const FILE = path.join(process.cwd(), "data", "leaderboard", "solo.json");

let cache: { mtimeMs: number; board: SoloBoard } | null = null;
let queue: Promise<unknown> = Promise.resolve();

export async function readSoloBoard(): Promise<SoloBoard> {
  try {
    const { mtimeMs } = await stat(FILE);
    if (cache && cache.mtimeMs === mtimeMs) return cache.board;
    const parsed = JSON.parse(await readFile(FILE, "utf8")) as Partial<SoloBoard>;
    const board: SoloBoard = { players: parsed.players ?? {} };
    cache = { mtimeMs, board };
    return board;
  } catch {
    return EMPTY_SOLO_BOARD;
  }
}

async function writeSoloBoard(board: SoloBoard): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(board, null, 2) + "\n", "utf8");
  await rename(tmp, FILE);
  cache = null;
}

/** Oku-değiştir-yaz; eşzamanlı istekler sıraya girer. */
export function updateSoloBoard(change: (board: SoloBoard) => SoloBoard): Promise<void> {
  const run = queue.then(async () => writeSoloBoard(change(await readSoloBoard())));
  queue = run.catch(() => undefined);
  return run;
}
