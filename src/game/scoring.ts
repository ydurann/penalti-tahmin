import type { Guess, PenaltyAnswer, ScoreBreakdown } from "./types";

export const POINTS = {
  exactZone: 100,
  correctSide: 40,
  shotType: 50,
  streakStep: 25,
} as const;

export function isExactZone(guess: Guess, answer: PenaltyAnswer): boolean {
  return guess.zone.col === answer.zone.col && guess.zone.row === answer.zone.row;
}

/**
 * Tam bölge 100, yalnızca doğru yön 40, doğru vuruş tipi 50 puan.
 * Seri bonusu üst üste ikinci tam bölgede 25 ile başlar ve her seferinde 25 artar.
 *
 * @param streak Bu tur dahil üst üste tam bölge sayısı.
 */
export function scoreGuess(
  guess: Guess | null,
  answer: PenaltyAnswer,
  streak: number,
): ScoreBreakdown {
  if (!guess) return { zone: 0, shot: 0, streak: 0, total: 0 };

  const zone = isExactZone(guess, answer)
    ? POINTS.exactZone
    : guess.zone.col === answer.zone.col
      ? POINTS.correctSide
      : 0;
  const shot = guess.shot === answer.shot ? POINTS.shotType : 0;
  const bonus = streak >= 2 ? POINTS.streakStep * (streak - 1) : 0;

  return { zone, shot, streak: bonus, total: zone + shot + bonus };
}
