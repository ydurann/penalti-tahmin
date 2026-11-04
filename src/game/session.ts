import { hintFor } from "./hints";
import type { RegionId } from "./regions";
import { earlySeconds, isExactZone, scoreGuess } from "./scoring";
import type { Guess, Hint, Penalty, PublicRound, RoundResult } from "./types";

export const ROUNDS_PER_GAME = 10;
export const ROUND_TIME_MS = 30_000;
/** Ağ gecikmesi nedeniyle son anda gelen tahminler için tolerans. */
export const LATE_GRACE_MS = 1_500;

export type GamePhase = "guessing" | "reveal" | "finished";

export interface GameSession {
  id: string;
  penalties: Penalty[];
  index: number;
  phase: GamePhase;
  score: number;
  streak: number;
  roundStartedAt: number;
  updatedAt: number;
  /** Bu turda ipucu istendi mi; sıradaki turda sıfırlanır. */
  hintUsed: boolean;
  /** Duraklatıldıysa duraklatma anı (sunucu saati); sürdürülünce tur başlangıcı o kadar kaydırılır. */
  pausedAt?: number | null;
  /** Haftalık challenge denemesiyse haftası ve oyuncu anahtarı; puan tabloya yazılır. */
  challenge?: { week: string; token: string };
  /** Takma adla oynanan tek kişilik oyun; bitince toplam puan sıralamasına eklenir. */
  solo?: { token: string; name: string; region: RegionId };
}

/** Oyun akışına aykırı istekler, örn. aynı tura ikinci tahmin. `code` istemcide çevrilir. */
export class GameFlowError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createGame(
  pool: readonly Penalty[],
  options: {
    id: string;
    now: number;
    count?: number;
    random?: () => number;
    /** true ise havuz karıştırılmaz, verilen sırayla oynanır (challenge). */
    fixedOrder?: boolean;
  },
): GameSession {
  const { id, now, count = ROUNDS_PER_GAME, random = Math.random, fixedOrder = false } = options;
  return {
    id,
    penalties: (fixedOrder ? [...pool] : shuffled(pool, random)).slice(0, count),
    index: 0,
    phase: "guessing",
    score: 0,
    streak: 0,
    roundStartedAt: now,
    updatedAt: now,
    hintUsed: false,
  };
}

function assertNotPaused(session: GameSession) {
  if (session.pausedAt != null) {
    throw new GameFlowError("Oyun duraklatılmış; önce devam et.", "game.paused");
  }
}

/**
 * Tahmin süresini durdurur. Yalnızca tek kişilik oyunda ve tahmin evresinde; challenge
 * denemesi herkes için aynı koşullarda oynandığından duraklatılamaz.
 */
export function pauseGame(session: GameSession, now: number): void {
  if (session.challenge) {
    throw new GameFlowError("Challenge denemesi duraklatılamaz.", "game.pauseChallenge");
  }
  if (session.phase !== "guessing") {
    throw new GameFlowError("Yalnızca tahmin sırasında duraklatılabilir.", "game.pausePhase");
  }
  if (session.pausedAt != null) return;
  session.pausedAt = now;
  session.updatedAt = now;
}

/** Duraklatmayı kaldırır; kalan süre korunur. Kalan süreyi (ms) döner. */
export function resumeGame(session: GameSession, now: number): { remainingMs: number } {
  if (session.pausedAt == null) {
    throw new GameFlowError("Oyun duraklatılmamış.", "game.notPaused");
  }
  session.roundStartedAt += Math.max(0, now - session.pausedAt);
  session.pausedAt = null;
  session.updatedAt = now;
  return { remainingMs: Math.max(0, ROUND_TIME_MS - (now - session.roundStartedAt)) };
}

/** İpucu verir ve turu "ipuculu" işaretler; tekrar istemek aynı ipucunu döner. */
export function requestHint(session: GameSession, now: number): Hint {
  if (session.phase !== "guessing") {
    throw new GameFlowError("İpucu yalnızca tahmin sırasında alınabilir.", "game.hintPhase");
  }
  assertNotPaused(session);
  session.hintUsed = true;
  session.updatedAt = now;
  const penalty = session.penalties[session.index];
  return hintFor(penalty.id, penalty.answer);
}

/** Cevap alanları burada bilerek kopyalanmaz. */
export function currentRound(session: GameSession): PublicRound {
  const { player, situation, minute, score, history, match } = session.penalties[session.index];
  return {
    player,
    situation,
    minute,
    score,
    history,
    ...(match ? { match } : {}),
    number: session.index + 1,
    totalRounds: session.penalties.length,
    timeLimitMs: ROUND_TIME_MS,
  };
}

export function submitGuess(
  session: GameSession,
  guess: Guess | null,
  now: number,
): RoundResult {
  if (session.phase !== "guessing") {
    throw new GameFlowError("Bu tur için tahmin zaten alındı.", "game.alreadyGuessed");
  }
  assertNotPaused(session);

  const { answer } = session.penalties[session.index];
  const late = now - session.roundStartedAt > ROUND_TIME_MS + LATE_GRACE_MS;
  const accepted = late ? null : guess;

  session.streak = accepted && isExactZone(accepted, answer) ? session.streak + 1 : 0;
  const early = accepted ? earlySeconds(now - session.roundStartedAt, ROUND_TIME_MS) : 0;
  const points = scoreGuess(accepted, answer, session.streak, session.hintUsed, early);
  session.score += points.total;

  const finished = session.index === session.penalties.length - 1;
  session.phase = finished ? "finished" : "reveal";
  session.updatedAt = now;

  return {
    guess: accepted,
    timedOut: accepted === null,
    answer,
    points,
    totalScore: session.score,
    streak: session.streak,
    finished,
  };
}

export function nextRound(session: GameSession, now: number): PublicRound {
  if (session.phase !== "reveal") {
    throw new GameFlowError("Sıradaki penaltıya şu anda geçilemez.", "game.cannotAdvance");
  }
  session.index += 1;
  session.phase = "guessing";
  session.roundStartedAt = now;
  session.updatedAt = now;
  session.hintUsed = false;
  return currentRound(session);
}
