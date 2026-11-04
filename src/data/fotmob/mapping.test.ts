import { describe, expect, it } from "vitest";
import { buildPenalties } from "../statsbomb/mapping";
import {
  extractPenalties,
  jerseyNumbers,
  seasonLabel,
  zoneFromGoalMouth,
  type FotMobEvent,
  type FotMobMatch,
  type FotMobShot,
} from "./mapping";

const INFO = { competition: "Bundesliga", season: "2025/26" };

let counter = 0;
function shot(overrides: Partial<FotMobShot> = {}): FotMobShot {
  return {
    id: 1000 + ++counter,
    eventType: "Goal",
    teamId: 10,
    playerId: 100,
    playerName: "Harry Kane",
    min: 30,
    minAdded: null,
    goalCrossedY: 31.5,
    goalCrossedZ: 0.4,
    shotType: "RightFoot",
    situation: "Penalty",
    period: "FirstHalf",
    isOwnGoal: false,
    ...overrides,
  };
}

function match(shots: FotMobShot[], events: FotMobEvent[] = []): FotMobMatch {
  return {
    general: {
      matchId: "4824901",
      matchTimeUTCDate: "2025-08-22T18:30:00.000Z",
      homeTeam: { name: "Bayern München", id: 10 },
      awayTeam: { name: "RB Leipzig", id: 20 },
    },
    content: { shotmap: { shots }, matchFacts: { events: { events } } },
  };
}

describe("zoneFromGoalMouth", () => {
  it("büyük y vuranın solu, küçük y sağıdır", () => {
    expect(zoneFromGoalMouth(37, 0.3).col).toBe(0);
    expect(zoneFromGoalMouth(34, 0.3).col).toBe(1);
    expect(zoneFromGoalMouth(31, 0.3).col).toBe(2);
  });

  it("z yükseldikçe satır üste çıkar", () => {
    expect(zoneFromGoalMouth(34, 0.3).row).toBe(2);
    expect(zoneFromGoalMouth(34, 1.2).row).toBe(1);
    expect(zoneFromGoalMouth(34, 2.2).row).toBe(0);
  });

  it("2022 finalindeki penaltılar StatsBomb bölgeleriyle örtüşür", () => {
    // Messi 23' sağ alt, Mbappé 80' sol alt, Mbappé 118' sol orta, Dybala orta alt, Tchouaméni sol direğin dışı.
    expect(zoneFromGoalMouth(31.94, 0.12)).toEqual({ col: 2, row: 2 });
    expect(zoneFromGoalMouth(36.52, 0.12)).toEqual({ col: 0, row: 2 });
    expect(zoneFromGoalMouth(37.13, 1.06)).toEqual({ col: 0, row: 1 });
    expect(zoneFromGoalMouth(33.85, 0.16)).toEqual({ col: 1, row: 2 });
    expect(zoneFromGoalMouth(38.2, 0.27)).toEqual({ col: 0, row: 2 });
  });

  it("kale dışı ve eksi değerleri kenara yapıştırır", () => {
    expect(zoneFromGoalMouth(28, 3.5)).toEqual({ col: 2, row: 0 });
    expect(zoneFromGoalMouth(40, -0.5)).toEqual({ col: 0, row: 2 });
  });
});

describe("extractPenalties", () => {
  it("penaltıyı oyuncu, takım, ayak, dakika, rakip ve bölgeyle çıkarır", () => {
    const { records, stats } = extractPenalties(match([shot()]), INFO);
    expect(stats).toEqual({ penalties: 1, kept: 1, skippedByOutcome: {}, estimatedKeeperDive: 1 });
    expect(records[0]).toMatchObject({
      id: "fm-4824901-1001",
      playerId: 100,
      playerName: "Harry Kane",
      team: "Bayern München",
      foot: "right",
      situation: "regular",
      minute: 30,
      score: "0-0",
      match: { competition: "Bundesliga", season: "2025/26", opponent: "RB Leipzig", date: "2025-08-22" },
      answer: { zone: { col: 2, row: 2 }, shot: "placed", outcome: "goal", keeperDive: 0 },
      keeperDiveKnown: false,
    });
  });

  it("penaltı olmayan şutları saymaz", () => {
    const { records, stats } = extractPenalties(match([shot({ situation: "RegularPlay" }), shot({ situation: "FastBreak", eventType: "Miss" })]), INFO);
    expect(records).toHaveLength(0);
    expect(stats.penalties).toBe(0);
  });

  it("skoru olay listesindeki 'olaydan önceki skor' alanından, atan takımın gözünden okur", () => {
    const pen = shot({ teamId: 20, playerId: 200, playerName: "Loïs Openda", min: 70, goalCrossedY: 36.8 });
    const events: FotMobEvent[] = [
      { type: "Goal", time: 27, homeScore: 0, awayScore: 0, shotmapEvent: { id: 5 } },
      { type: "Goal", time: 70, homeScore: 1, awayScore: 0, shotmapEvent: { id: pen.id } },
    ];
    const { records } = extractPenalties(match([shot({ situation: "RegularPlay", min: 27, id: 5 }), pen], events), INFO);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ team: "RB Leipzig", score: "0-1", match: { opponent: "Bayern München" } });
  });

  it("olay eşleşmezse skoru o andan önceki gollerden sayar (kendi kalesine gol dahil)", () => {
    const shots = [
      shot({ situation: "RegularPlay", min: 10, teamId: 20, playerId: 201 }),
      shot({ situation: "RegularPlay", min: 20, teamId: 20, playerId: 202, isOwnGoal: true }),
      shot({ situation: "RegularPlay", min: 40, eventType: "Miss" }),
      shot({ min: 60 }),
      shot({ situation: "RegularPlay", min: 80 }),
    ];
    const { records } = extractPenalties(match(shots), INFO);
    expect(records).toHaveLength(1);
    expect(records[0].score).toBe("1-1");
  });

  it("kurtarış, kaçan ve direk sonuçlarını eşler; kurtarışta kaleci topun sütunundadır", () => {
    const shots = [
      shot({ eventType: "AttemptSaved", goalCrossedY: 36.9, goalCrossedZ: 0.8 }),
      shot({ eventType: "Miss", goalCrossedY: 38.5, goalCrossedZ: 0.2 }),
      shot({ eventType: "Post", goalCrossedY: 30.5, goalCrossedZ: 2.3 }),
    ];
    const { records, stats } = extractPenalties(match(shots), INFO);
    expect(records.map((r) => r.answer.outcome)).toEqual(["saved", "missed", "missed"]);
    expect(records[0].answer).toMatchObject({ zone: { col: 0, row: 2 }, keeperDive: 0 });
    expect(records[0].keeperDiveKnown).toBe(true);
    expect(records[1].answer).toMatchObject({ zone: { col: 0, row: 2 }, keeperDive: 2 });
    expect(records[2].answer.zone).toEqual({ col: 2, row: 0 });
    expect(stats.estimatedKeeperDive).toBe(2);
  });

  it("kafayla vuruşu, bilinmeyen sonucu ve kale çizgisi bilgisi olmayanı atlar", () => {
    const shots = [
      shot({ shotType: "Header" }),
      shot({ eventType: "Blocked" }),
      shot({ goalCrossedY: null }),
    ];
    const { records, stats } = extractPenalties(match(shots), INFO);
    expect(records).toHaveLength(0);
    expect(stats.penalties).toBe(3);
    expect(stats.skippedByOutcome).toEqual({ "body:Header": 1, Blocked: 1, noGoalMouth: 1 });
  });

  it("seri penaltılarda dakika yoktur ve skor yalnızca seriyi sayar", () => {
    const shots = [
      shot({ min: 30 }),
      shot({ period: "PenaltyShootout", min: 121, teamId: 20, playerId: 200, situation: null }),
      shot({ period: "PenaltyShootout", min: 121, situation: null }),
      shot({ period: "PenaltyShootout", min: 122, teamId: 20, playerId: 201, eventType: "AttemptSaved", situation: null }),
      shot({ period: "PenaltyShootout", min: 123, situation: null }),
    ];
    const { records } = extractPenalties(match(shots), INFO);
    const shootout = records.filter((r) => r.situation === "shootout");
    expect(shootout).toHaveLength(4);
    expect(shootout.every((r) => r.minute === null)).toBe(true);
    expect(shootout.map((r) => r.score)).toEqual(["0-0", "0-1", "1-1", "1-1"]);
  });

  it("buildPenalties ile oyuncunun önceki penaltılarından geçmiş kurulur", () => {
    const first = extractPenalties(match([shot({ min: 10, goalCrossedY: 37 })]), INFO).records;
    const later: FotMobMatch = {
      ...match([shot({ min: 50, goalCrossedY: 31 })]),
      general: { ...match([]).general, matchId: "4824950", matchTimeUTCDate: "2025-09-13T13:30:00.000Z" },
    };
    const second = extractPenalties(later, INFO).records;
    const penalties = buildPenalties([...second, ...first]);
    expect(penalties.map((p) => p.match?.date)).toEqual(["2025-08-22", "2025-09-13"]);
    expect(penalties[1].history).toEqual({ left: 1, center: 0, right: 0 });
  });
});

describe("jerseyNumbers", () => {
  it("kadrodan forma numarasını okur ve kayda yazar; bozuk değer atlanır", () => {
    const m: FotMobMatch = {
      ...match([shot()]),
      content: {
        ...match([shot()]).content,
        lineup: {
          homeTeam: { starters: [{ id: 100, shirtNumber: "9" }], subs: [{ id: 101, shirtNumber: null }] },
          awayTeam: { starters: [{ id: 200, shirtNumber: 10 }, { id: 201, shirtNumber: "GK" }], subs: null },
        },
      },
    };
    expect([...jerseyNumbers(m).entries()]).toEqual([[100, 9], [200, 10]]);
    const { records } = extractPenalties(m, INFO);
    expect(records[0].number).toBe(9);
    expect(buildPenalties(records)[0].player.number).toBe(9);
  });

  it("kadro yoksa numara alanı yazılmaz", () => {
    const { records } = extractPenalties(match([shot()]), INFO);
    expect(records[0].number).toBeUndefined();
    expect("number" in buildPenalties(records)[0].player).toBe(false);
  });
});

describe("seasonLabel", () => {
  it("iki yıllı sezonu kısaltır, tek yıllıyı bırakır", () => {
    expect(seasonLabel("2025/2026")).toBe("2025/26");
    expect(seasonLabel("2024")).toBe("2024");
  });
});
