import { describe, expect, it } from "vitest";
import { REGIONS } from "./regions";
import { isSeedToken, seedChallengeAttempts, seedSoloPlayers } from "./seedBoard";

describe("tohum oyuncular", () => {
  it("her bölgeye kararlı, makul puanlı oyuncular üretir", () => {
    const a = seedSoloPlayers(1_000_000);
    const b = seedSoloPlayers(1_000_000);
    expect(a).toEqual(b);
    for (const region of REGIONS) {
      const players = a.filter((p) => p.region === region.id);
      expect(players.length).toBeGreaterThanOrEqual(6);
      for (const p of players) {
        expect(isSeedToken(p.token)).toBe(true);
        expect(p.games).toBeGreaterThanOrEqual(2);
        expect(p.total).toBe(p.games * Math.round(p.total / p.games));
        expect(p.best).toBeLessThanOrEqual(1000);
        expect(p.updatedAt).toBeLessThanOrEqual(1_000_000);
      }
    }
    expect(new Set(a.map((p) => p.token)).size).toBe(a.length);
  });

  it("haftalık tohumlar haftaya göre değişir, puanlar tek oyunda ulaşılabilir aralıktadır", () => {
    const w45 = seedChallengeAttempts("2026-W45", 0);
    const w46 = seedChallengeAttempts("2026-W46", 0);
    expect(w45).toEqual(seedChallengeAttempts("2026-W45", 0));
    expect(w45.map((a) => a.score)).not.toEqual(w46.map((a) => a.score));
    for (const attempt of w45) {
      expect(attempt.score).toBeGreaterThanOrEqual(250);
      expect(attempt.score).toBeLessThan(900);
      expect(attempt.updatedAt).toBeLessThan(5 * 86_400_000);
    }
    expect(new Set(w45.map((a) => a.token)).size).toBe(w45.length);
  });
});
