import { isExactZone, scoreGuess } from "./scoring";
import type { Guess, Penalty, PublicRound, RoundResult } from "./types";

export const ROUNDS_PER_GAME = 10;
export const ROUND_TIME_MS = 15_000;
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
}

/** Oyun akışına aykırı istekler, örn. aynı tura ikinci tahmin. */
export class GameFlowError extends Error {}

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
  options: { id: string; now: number; count?: number; random?: () => number },
): GameSession {
  const { id, now, count = ROUNDS_PER_GAME, random = Math.random } = options;
  return {
    id,
    penalties: shuffled(pool, random).slice(0, count),
    index: 0,
    phase: "guessing",
    score: 0,
    streak: 0,
    roundStartedAt: now,
    updatedAt: now,
  };
}

/** Cevap alanları burada bilerek kopyalanmaz. */
export function currentRound(session: GameSession): PublicRound {
  const { player, situation, minute, score, history } = session.penalties[session.index];
  return {
    player,
    situation,
    minute,
    score,
    history,
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
    throw new GameFlowError("Bu tur için tahmin zaten alındı.");
  }

  const { answer } = session.penalties[session.index];
  const late = now - session.roundStartedAt > ROUND_TIME_MS + LATE_GRACE_MS;
  const accepted = late ? null : guess;

  session.streak = accepted && isExactZone(accepted, answer) ? session.streak + 1 : 0;
  const points = scoreGuess(accepted, answer, session.streak);
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
    throw new GameFlowError("Sıradaki penaltıya şu anda geçilemez.");
  }
  session.index += 1;
  session.phase = "guessing";
  session.roundStartedAt = now;
  session.updatedAt = now;
  return currentRound(session);
}
