import type { Guess, PenaltyAnswer, ScoreBreakdown, Target } from "./types";

export const POINTS = {
  exactZone: 100,
  correctSide: 40,
  shotType: 50,
  streakStep: 25,
} as const;

/** İpucu alınan turda her puan bileşeni bu oranla çarpılır (aşağı yuvarlanır). */
export const HINT_FACTOR = 0.5;

/** Erken kilitlenen her tam saniye için tur puanına eklenen oran (%2). */
export const SPEED_BONUS_PER_SECOND = 0.02;

/** Tahminin kilitlendiği anda kalan tam saniye; süre dolduysa 0. */
export function earlySeconds(elapsedMs: number, roundTimeMs: number): number {
  return Math.max(0, Math.floor((roundTimeMs - elapsedMs) / 1000));
}

/** "Dışarı" yalnızca kaçan vuruşu tam tutturur; bölge yalnızca kaleyi bulan vuruşu. */
export function isExactTarget(target: Target, answer: PenaltyAnswer): boolean {
  if (target === "out") return answer.outcome === "missed";
  return answer.outcome !== "missed" && target.col === answer.zone.col && target.row === answer.zone.row;
}

export function isExactZone(guess: Guess, answer: PenaltyAnswer): boolean {
  return isExactTarget(guess.target, answer);
}

const EMPTY: ScoreBreakdown = { zone: 0, shot: 0, streak: 0, speed: 0, secondsEarly: 0, total: 0, hintUsed: false };

/**
 * Tam bölge (ya da kaçan vuruşta "Dışarı") 100, yalnızca doğru yön 40, doğru vuruş tipi 50 puan.
 * Kaçan vuruşun da yönü vardır: aynı sütundaki bölge 40 alır. "Dışarı" tahmini kaleyi bulan
 * vuruşta yön puanı almaz. Seri bonusu üst üste ikinci tam isabette 25 ile başlar ve 25 artar.
 * İpucu alındıysa bileşenlerin hepsi `HINT_FACTOR` ile çarpılır. Erken kilitlenen her tam
 * saniye tur puanının %2'si kadar hız bonusu ekler; sıfır puanlı tur bonus almaz.
 *
 * @param streak Bu tur dahil üst üste tam isabet sayısı.
 * @param secondsEarly Kilitlerken kalan tam saniye.
 */
export function scoreGuess(
  guess: Guess | null,
  answer: PenaltyAnswer,
  streak: number,
  hintUsed = false,
  secondsEarly = 0,
): ScoreBreakdown {
  if (!guess) return { ...EMPTY, hintUsed };

  const factor = hintUsed ? HINT_FACTOR : 1;
  const scale = (points: number) => Math.floor(points * factor);
  const zone = scale(
    isExactZone(guess, answer)
      ? POINTS.exactZone
      : guess.target !== "out" && guess.target.col === answer.zone.col
        ? POINTS.correctSide
        : 0,
  );
  const shot = scale(guess.shot === answer.shot ? POINTS.shotType : 0);
  const bonus = scale(streak >= 2 ? POINTS.streakStep * (streak - 1) : 0);
  const base = zone + shot + bonus;
  const early = Math.max(0, Math.floor(secondsEarly));
  const speed = Math.floor(base * SPEED_BONUS_PER_SECOND * early);

  return { zone, shot, streak: bonus, speed, secondsEarly: early, total: base + speed, hintUsed };
}
