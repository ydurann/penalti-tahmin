import { describe, expect, it } from "vitest";
import { SAMPLE_PENALTIES } from "@/data/penalties";
import {
  challengeStatus,
  ChallengeError,
  pickWeekPenalties,
  rankedAttempts,
  recordProgress,
  startAttempt,
  weekNumber,
  weekOf,
  type ChallengeBoard,
} from "./challenge";

describe("weekOf", () => {
  it("hafta Pazartesi 00:00 Türkiye saatinde başlar ve ISO numarasını taşır", () => {
    // 2 Kasım 2026 Pazartesi 10:00 Türkiye = 07:00 UTC.
    const week = weekOf(Date.UTC(2026, 10, 2, 7));
    expect(week.key).toBe("2026-W45");
    expect(new Date(week.startsAt).toISOString()).toBe("2026-11-01T21:00:00.000Z");
    expect(week.endsAt - week.startsAt).toBe(7 * 24 * 60 * 60 * 1000);
    expect(weekNumber(week.key)).toBe(45);
  });

  it("Pazar gece yarısından hemen önce ve sonra farklı haftalardır", () => {
    const before = weekOf(Date.UTC(2026, 10, 8, 20, 59));
    const after = weekOf(Date.UTC(2026, 10, 8, 21, 0));
    expect(before.key).toBe("2026-W45");
    expect(after.key).toBe("2026-W46");
  });

  it("yılbaşında ISO kuralını uygular", () => {
    expect(weekOf(Date.UTC(2027, 0, 1, 12)).key).toBe("2026-W53");
    expect(weekOf(Date.UTC(2027, 0, 4, 12)).key).toBe("2027-W01");
  });
});

describe("pickWeekPenalties", () => {
  it("aynı hafta için aynı seçimi, farklı hafta için farklı seçimi verir", () => {
    const a = pickWeekPenalties(SAMPLE_PENALTIES, "2026-W45", 10).map((p) => p.id);
    const b = pickWeekPenalties([...SAMPLE_PENALTIES].reverse(), "2026-W45", 10).map((p) => p.id);
    const c = pickWeekPenalties(SAMPLE_PENALTIES, "2026-W46", 10).map((p) => p.id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(10);
    expect(new Set(a).size).toBe(10);
    expect(c).not.toEqual(a);
  });
});

describe("sıralama", () => {
  const empty: ChallengeBoard = { key: "2026-W45", penaltyIds: [], attempts: {} };
  const week = weekOf(Date.UTC(2026, 10, 2, 7));

  const ayse = { name: "Ayşe", region: "tr" as const };

  it("deneme başlatır, ikinci denemeyi reddeder, puanı günceller ve bitince dondurur", () => {
    let board = startAttempt(empty, "t1", ayse, 1);
    expect(() => startAttempt(board, "t1", ayse, 2)).toThrow(ChallengeError);
    board = recordProgress(board, "t1", 150, false, 3);
    board = recordProgress(board, "t1", 400, true, 4);
    board = recordProgress(board, "t1", 999, true, 5);
    expect(board.attempts.t1).toMatchObject({ score: 400, finished: true, updatedAt: 4 });
    expect(recordProgress(board, "yok", 10, false, 6)).toBe(board);
  });

  it("puana, sonra bitmişliğe, sonra erken bitirene göre sıralar ve sana sıranı verir", () => {
    let board = startAttempt(empty, "a", ayse, 1);
    board = startAttempt(board, "b", { name: "Can", region: "eu" }, 2);
    board = startAttempt(board, "c", { name: "Ece", region: "tr" }, 3);
    board = recordProgress(board, "a", 300, true, 10);
    board = recordProgress(board, "b", 300, true, 9);
    board = recordProgress(board, "c", 300, false, 8);
    expect(rankedAttempts(board).map((r) => [r.token, r.rank])).toEqual([["b", 1], ["a", 2], ["c", 3]]);
    const status = challengeStatus(board, week, "a", 20);
    expect(status.participants).toBe(3);
    expect(status.you).toEqual({ rank: 2, name: "Ayşe", region: "tr", score: 300, finished: true, you: true });
    expect(status.leaderboard.map((e) => e.you)).toEqual([false, true, false]);
    expect(status.played).toBe(true);
    expect(challengeStatus(board, week, null, 20).you).toBeNull();
  });

  it("bölge süzgeci sırayı bölge içinde hesaplar, oynadı bilgisi süzgeçten bağımsızdır", () => {
    let board = startAttempt(empty, "a", ayse, 1);
    board = startAttempt(board, "b", { name: "Can", region: "eu" }, 2);
    board = recordProgress(board, "a", 100, true, 3);
    board = recordProgress(board, "b", 500, true, 4);
    expect(challengeStatus(board, week, "a", 9, "world").you?.rank).toBe(2);
    expect(challengeStatus(board, week, "a", 9, "tr").you?.rank).toBe(1);
    const other = challengeStatus(board, week, "a", 9, "eu");
    expect(other.you).toBeNull();
    expect(other.played).toBe(true);
    expect(other.participants).toBe(1);
  });
});
