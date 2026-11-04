import { describe, expect, it } from "vitest";
import { SAMPLE_PENALTIES } from "@/data/penalties";
import { PENALTY_POOL, REAL_PENALTIES } from "@/data/realPenalties";
import { earlySeconds, scoreGuess } from "./scoring";
import {
  createGame,
  currentRound,
  GameFlowError,
  LATE_GRACE_MS,
  nextRound,
  pauseGame,
  requestHint,
  resumeGame,
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
  target: { col, row },
  shot,
});
const outGuess = (shot: Guess["shot"] = "power"): Guess => ({ target: "out", shot });
const missed: PenaltyAnswer = { ...answer, zone: { col: 2, row: 0 }, outcome: "missed" };

describe("scoreGuess", () => {
  it("kaçan vuruşta Dışarı tam isabettir, aynı sütun yön puanı alır", () => {
    expect(scoreGuess(outGuess(), missed, 1).total).toBe(100);
    expect(scoreGuess(guessOf(2, 2), missed, 0).total).toBe(40);
    expect(scoreGuess(guessOf(2, 0), missed, 0).total).toBe(40);
    expect(scoreGuess(guessOf(0, 0), missed, 0).total).toBe(0);
  });

  it("kaleyi bulan vuruşta Dışarı tahmini bölge puanı almaz, vuruş tipini alır", () => {
    expect(scoreGuess(outGuess(), answer, 0).total).toBe(0);
    expect(scoreGuess(outGuess("placed"), answer, 0).total).toBe(50);
  });

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

  it("ipucu alınan turda her bileşen yarıya iner", () => {
    const halved = scoreGuess(guessOf(0, 2, "placed"), answer, 2, true);
    expect(halved).toEqual({ zone: 50, shot: 25, streak: 12, speed: 0, secondsEarly: 0, total: 87, hintUsed: true });
    expect(scoreGuess(guessOf(0, 2), answer, 1).hintUsed).toBe(false);
  });

  it("erken kilitlenen her saniye tur puanının %2'sini ekler, sıfır puana bonus yoktur", () => {
    expect(scoreGuess(guessOf(0, 2), answer, 1, false, 12)).toMatchObject({ zone: 100, speed: 24, secondsEarly: 12, total: 124 });
    expect(scoreGuess(guessOf(0, 2, "placed"), answer, 1, true, 10)).toMatchObject({ zone: 50, shot: 25, speed: 15, total: 90 });
    expect(scoreGuess(guessOf(2, 0), answer, 0, false, 29).total).toBe(0);
    expect(scoreGuess(guessOf(0, 2), answer, 1, false, 0).speed).toBe(0);
  });

  it("kalan tam saniyeyi sayar, süre dolduysa sıfır", () => {
    expect(earlySeconds(500, 30_000)).toBe(29);
    expect(earlySeconds(29_999, 30_000)).toBe(0);
    expect(earlySeconds(31_000, 30_000)).toBe(0);
  });
});

describe("ipucu akışı", () => {
  const pool: Penalty[] = [1, 2].map((n) => ({ ...SAMPLE_PENALTIES[0], id: `p${n}`, answer }));

  it("tahmin sırasında verilir, puanı yarılar ve sıradaki turda sıfırlanır", () => {
    const game = createGame(pool, { id: "g", now: 0, count: 2 });
    const hint = requestHint(game, 1);
    expect(["direction", "height", "shot"]).toContain(hint.kind);
    expect(requestHint(game, 2)).toEqual(hint);
    // Sürenin sonunda kilitlenir; hız bonusu olmasın.
    const first = submitGuess(game, guessOf(0, 2), ROUND_TIME_MS);
    expect(first.points).toMatchObject({ zone: 50, total: 50, hintUsed: true });
    expect(() => requestHint(game, ROUND_TIME_MS + 1)).toThrow(GameFlowError);
    nextRound(game, ROUND_TIME_MS + 5);
    expect(game.hintUsed).toBe(false);
    expect(submitGuess(game, guessOf(0, 2), ROUND_TIME_MS + 5 + ROUND_TIME_MS).points.total).toBe(125);
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
    for (const key of ["answer", "zone", "shot", "outcome", "keeperDive", "id", "target"]) {
      expect(json).not.toContain(`"${key}"`);
    }
  });

  it("gerçek veride maç bilgisini tura taşır, örnek veride alan yoktur", () => {
    const match = { competition: "FIFA World Cup", season: "2022", opponent: "Fransa", date: "2022-12-18" };
    const withMatch = createGame([{ ...pool[0], match }], { id: "g", now: 0, count: 1 });
    expect(currentRound(withMatch).match).toEqual(match);
    expect("match" in currentRound(start())).toBe(false);
  });

  it("puanı ve seriyi turlar boyunca biriktirir, ıskada seriyi sıfırlar", () => {
    const game = start();
    // Her tahmin sürenin sonunda kilitlenir; hız bonusu devreye girmez.
    expect(submitGuess(game, guessOf(0, 2), ROUND_TIME_MS).totalScore).toBe(100);
    const second_start = ROUND_TIME_MS + 1000;
    nextRound(game, second_start);
    const second = submitGuess(game, guessOf(0, 2), second_start + ROUND_TIME_MS);
    expect(second.streak).toBe(2);
    expect(second.totalScore).toBe(225);
    const third_start = second_start + ROUND_TIME_MS + 1000;
    nextRound(game, third_start);
    const third = submitGuess(game, guessOf(2, 0), third_start + ROUND_TIME_MS);
    expect(third.streak).toBe(0);
    expect(third.finished).toBe(true);
  });

  it("erken kilitlenen tahmine hız bonusu ekler", () => {
    const game = start();
    const result = submitGuess(game, guessOf(0, 2), 500);
    expect(result.points).toMatchObject({ zone: 100, secondsEarly: 29, speed: 58, total: 158 });
    expect(result.totalScore).toBe(158);
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

describe("duraklatma", () => {
  const pool: Penalty[] = [1, 2].map((n) => ({ ...SAMPLE_PENALTIES[0], id: `p${n}`, answer }));
  const start = () => createGame(pool, { id: "g", now: 0, count: 2 });

  it("duraklatılan süre tur başlangıcına eklenir, kalan süre korunur", () => {
    const game = start();
    pauseGame(game, 10_000);
    expect(resumeGame(game, 70_000)).toEqual({ remainingMs: ROUND_TIME_MS - 10_000 });
    // Duraklatmadan sonra 10 sn daha geçti; toplam 20 sn kullanıldı, süre dolmadı.
    const result = submitGuess(game, guessOf(0, 2), 80_000);
    expect(result.timedOut).toBe(false);
    expect(result.points.secondsEarly).toBe(10);
  });

  it("duraklatılmışken tahmin ve ipucu reddedilir, ikinci duraklatma zararsızdır", () => {
    const game = start();
    pauseGame(game, 1_000);
    pauseGame(game, 5_000);
    expect(() => submitGuess(game, guessOf(0, 2), 2_000)).toThrow(GameFlowError);
    expect(() => requestHint(game, 2_000)).toThrow(GameFlowError);
    expect(resumeGame(game, 3_000).remainingMs).toBe(ROUND_TIME_MS - 1_000);
  });

  it("yalnızca tahmin evresinde ve challenge dışında duraklatılabilir", () => {
    const game = start();
    expect(() => resumeGame(game, 1)).toThrow(GameFlowError);
    submitGuess(game, guessOf(0, 2), 1_000);
    expect(() => pauseGame(game, 2_000)).toThrow(GameFlowError);
    const challenge = { ...start(), challenge: { week: "2026-W45", token: "x" } };
    expect(() => pauseGame(challenge, 1_000)).toThrow(GameFlowError);
  });
});

describe("penaltı verisi", () => {
  it("örnek veri bir oyunu dolduracak kadar penaltı içerir", () => {
    expect(SAMPLE_PENALTIES.length).toBeGreaterThanOrEqual(ROUNDS_PER_GAME);
  });

  it("havuz gerçek veri yeterliyse onu, değilse örnek veriyi kullanır", () => {
    const expected = REAL_PENALTIES.length >= ROUNDS_PER_GAME ? REAL_PENALTIES : SAMPLE_PENALTIES;
    expect(PENALTY_POOL).toBe(expected);
  });

  it("gerçek veride kimlikler tekildir", () => {
    expect(new Set(REAL_PENALTIES.map((p) => p.id)).size).toBe(REAL_PENALTIES.length);
  });

  const all = [...SAMPLE_PENALTIES, ...REAL_PENALTIES];
  it.each(all.map((p) => [p.id, p] as const))("%s tutarlıdır", (_id, p) => {
    expect(p.history.left + p.history.center + p.history.right).toBeLessThanOrEqual(10);
    expect(p.minute === null).toBe(p.situation === "shootout");
    if (p.answer.outcome === "saved") expect(p.answer.keeperDive).toBe(p.answer.zone.col);
    if (p.answer.shot === "panenka") expect(p.answer.zone.col).toBe(1);
  });
});
