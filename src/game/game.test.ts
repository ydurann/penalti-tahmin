import { describe, expect, it } from "vitest";
import { SAMPLE_PENALTIES } from "@/data/penalties";
import { scoreGuess } from "./scoring";
import {
  createGame,
  currentRound,
  GameFlowError,
  LATE_GRACE_MS,
  nextRound,
  ROUND_TIME_MS,
  ROUNDS_PER_GAME,
  submitGuess,
} from "./session";
import type { Guess, Index, Penalty, PenaltyAnswer } from "./types";

const answer: PenaltyAnswer = {
  zone: { col: 0, row: 2 },
  shot: "placed",
  outcome: "goal",
  keeperDive: 2,
};

const guessOf = (col: Index, row: Index, shot: Guess["shot"] = "power"): Guess => ({
  zone: { col, row },
  shot,
});

describe("scoreGuess", () => {
  it("tam bölgeye 100 puan verir", () => {
    expect(scoreGuess(guessOf(0, 2), answer, 1).total).toBe(100);
  });

  it("yalnızca doğru yöne 40 puan verir", () => {
    expect(scoreGuess(guessOf(0, 0), answer, 0).total).toBe(40);
  });

  it("yanlış yöne puan vermez ama vuruş tipini ayrıca sayar", () => {
    expect(scoreGuess(guessOf(2, 2), answer, 0).total).toBe(0);
    expect(scoreGuess(guessOf(2, 2, "placed"), answer, 0).total).toBe(50);
  });

  it("seri bonusu ikinci tam bölgede 25 ile başlar ve artar", () => {
    expect(scoreGuess(guessOf(0, 2), answer, 1).streak).toBe(0);
    expect(scoreGuess(guessOf(0, 2), answer, 2).streak).toBe(25);
    expect(scoreGuess(guessOf(0, 2), answer, 3).streak).toBe(50);
  });

  it("tahmin yoksa sıfır verir", () => {
    expect(scoreGuess(null, answer, 0).total).toBe(0);
  });
});

describe("oyun akışı", () => {
  const pool: Penalty[] = [1, 2, 3].map((n) => ({
    ...SAMPLE_PENALTIES[0],
    id: `p${n}`,
    answer,
  }));
  const start = () => createGame(pool, { id: "g", now: 0, count: 3 });

  it("tur bilgisine cevap sızdırmaz", () => {
    const json = JSON.stringify(currentRound(start()));
    for (const key of ["answer", "zone", "shot", "outcome", "keeperDive", "id"]) {
      expect(json).not.toContain(`"${key}"`);
    }
  });

  it("puanı ve seriyi turlar boyunca biriktirir, ıskada seriyi sıfırlar", () => {
    const game = start();
    expect(submitGuess(game, guessOf(0, 2), 1000).totalScore).toBe(100);
    nextRound(game, 2000);
    const second = submitGuess(game, guessOf(0, 2), 3000);
    expect(second.streak).toBe(2);
    expect(second.totalScore).toBe(225);
    nextRound(game, 4000);
    const third = submitGuess(game, guessOf(2, 0), 5000);
    expect(third.streak).toBe(0);
    expect(third.finished).toBe(true);
  });

  it("aynı tura ikinci tahmini ve tahminsiz ilerlemeyi reddeder", () => {
    const game = start();
    expect(() => nextRound(game, 1)).toThrow(GameFlowError);
    submitGuess(game, guessOf(0, 2), 1);
    expect(() => submitGuess(game, guessOf(0, 2), 2)).toThrow(GameFlowError);
  });

  it("süresi geçmiş tahmini sıfır puanla kaydeder", () => {
    const game = start();
    const result = submitGuess(game, guessOf(0, 2), ROUND_TIME_MS + LATE_GRACE_MS + 1);
    expect(result.timedOut).toBe(true);
    expect(result.totalScore).toBe(0);
  });

  it("süre sınırına yakın tahmini toleransla kabul eder", () => {
    const game = start();
    expect(submitGuess(game, guessOf(0, 2), ROUND_TIME_MS + 100).timedOut).toBe(false);
  });

  it("son turdan sonra ilerlemeyi reddeder", () => {
    const game = createGame(pool, { id: "g", now: 0, count: 1 });
    submitGuess(game, null, 1);
    expect(() => nextRound(game, 2)).toThrow(GameFlowError);
  });
});

describe("örnek veri", () => {
  it("bir oyunu dolduracak kadar penaltı içerir", () => {
    expect(SAMPLE_PENALTIES.length).toBeGreaterThanOrEqual(ROUNDS_PER_GAME);
  });

  it.each(SAMPLE_PENALTIES.map((p) => [p.id, p] as const))("%s tutarlıdır", (_id, p) => {
    expect(p.history.left + p.history.center + p.history.right).toBe(10);
    expect(p.minute === null).toBe(p.situation === "shootout");
    if (p.answer.outcome === "saved") expect(p.answer.keeperDive).toBe(p.answer.zone.col);
    if (p.answer.shot === "panenka") expect(p.answer.zone.col).toBe(1);
  });
});
