import type { RegionFilter, RegionId } from "./regions";
import type { ChallengeStatus, ChallengeWeek, LeaderboardEntry, Penalty } from "./types";

/**
 * Haftalık challenge: hafta Pazartesi 00:00 Türkiye saatinde (UTC+3, yaz saati yok) başlar.
 * Herkes o haftanın sabit 10 penaltısını oynar; kişi başına haftada bir deneme. Saf mantık;
 * dosya işleri `src/server/challengeStore.ts` içindedir.
 */
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const LEADERBOARD_SIZE = 100;

export function weekOf(now: number): ChallengeWeek {
  const local = new Date(now + TZ_OFFSET_MS);
  const monday = (local.getUTCDay() + 6) % 7;
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - monday);
  const thursday = startLocal + 3 * DAY_MS;
  const isoYear = new Date(thursday).getUTCFullYear();
  const week = Math.ceil(((thursday - Date.UTC(isoYear, 0, 1)) / DAY_MS + 1) / 7);
  return {
    key: `${isoYear}-W${String(week).padStart(2, "0")}`,
    startsAt: startLocal - TZ_OFFSET_MS,
    endsAt: startLocal - TZ_OFFSET_MS + 7 * DAY_MS,
  };
}

/** "2026-W45" → "45. hafta" gibi gösterim için hafta numarası. */
export const weekNumber = (key: string) => Number(key.split("-W")[1]);

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Tohumlu, kararlı rastgele sayı üreteci (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Haftanın penaltıları: havuz kimliğe göre sıralanıp hafta anahtarıyla karıştırılır. */
export function pickWeekPenalties(pool: readonly Penalty[], weekKey: string, count: number): Penalty[] {
  const random = seeded(hash(weekKey));
  const items = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, count);
}

export interface ChallengeAttempt {
  name: string;
  region: RegionId;
  score: number;
  finished: boolean;
  startedAt: number;
  updatedAt: number;
}

export interface ChallengeBoard {
  key: string;
  /** İlk oluşturulduğunda dondurulan penaltı kimlikleri; havuz değişse de hafta değişmez. */
  penaltyIds: string[];
  /** Oyuncu anahtarı → deneme. */
  attempts: Record<string, ChallengeAttempt>;
}

/** Yüksek puan önde; eşitlikte bitirmiş olan, sonra daha erken bitiren önde. */
function order(a: ChallengeAttempt, b: ChallengeAttempt): number {
  return b.score - a.score || Number(b.finished) - Number(a.finished) || a.updatedAt - b.updatedAt;
}

export function rankedAttempts(
  board: ChallengeBoard,
  region: RegionFilter = "world",
): { token: string; attempt: ChallengeAttempt; rank: number }[] {
  return Object.entries(board.attempts)
    .map(([token, attempt]) => ({ token, attempt }))
    .filter((item) => region === "world" || item.attempt.region === region)
    .sort((x, y) => order(x.attempt, y.attempt))
    .map((item, i) => ({ ...item, rank: i + 1 }));
}

export function challengeStatus(
  board: ChallengeBoard,
  week: ChallengeWeek,
  token: string | null,
  now: number,
  region: RegionFilter = "world",
): ChallengeStatus {
  const ranked = rankedAttempts(board, region);
  const toEntry = (item: (typeof ranked)[number]): LeaderboardEntry => ({
    rank: item.rank,
    name: item.attempt.name,
    region: item.attempt.region,
    score: item.attempt.score,
    finished: item.attempt.finished,
    you: item.token === token,
  });
  const yours = ranked.find((item) => item.token === token);
  return {
    week,
    serverNow: now,
    region,
    participants: ranked.length,
    leaderboard: ranked.slice(0, LEADERBOARD_SIZE).map(toEntry),
    you: yours ? toEntry(yours) : null,
    played: token !== null && token in board.attempts,
  };
}

/** Challenge akışına aykırı istekler; `code` istemcide çevrilir. */
export class ChallengeError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

/** Denemeyi başlatır; aynı oyuncu bu hafta oynadıysa reddeder. */
export function startAttempt(
  board: ChallengeBoard,
  token: string,
  player: { name: string; region: RegionId },
  now: number,
): ChallengeBoard {
  if (board.attempts[token]) {
    throw new ChallengeError("Bu hafta zaten oynadın; sıradaki hafta yeniden dene.", "challenge.played");
  }
  return {
    ...board,
    attempts: {
      ...board.attempts,
      [token]: { name: player.name, region: player.region, score: 0, finished: false, startedAt: now, updatedAt: now },
    },
  };
}

/** Her turdan sonra puanı günceller; bitince dondurur. */
export function recordProgress(board: ChallengeBoard, token: string, score: number, finished: boolean, now: number): ChallengeBoard {
  const attempt = board.attempts[token];
  if (!attempt || attempt.finished) return board;
  return { ...board, attempts: { ...board.attempts, [token]: { ...attempt, score, finished, updatedAt: now } } };
}
