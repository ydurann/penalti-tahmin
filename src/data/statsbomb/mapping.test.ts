import { describe, expect, it } from "vitest";
import {
  buildPenalties,
  extractPenalties,
  keeperDiveFor,
  shotTypeFor,
  zoneFromEndLocation,
  type StatsBombEvent,
  type StatsBombMatch,
} from "./mapping";

const match: StatsBombMatch = {
  match_id: 1,
  match_date: "2022-12-18",
  competition: { competition_name: "FIFA World Cup" },
  season: { season_name: "2022" },
  home_team: { home_team_id: 10, home_team_name: "Arjantin" },
  away_team: { away_team_id: 20, away_team_name: "Fransa" },
};

let counter = 0;
function shot(
  overrides: Partial<StatsBombEvent> & { shot?: Partial<StatsBombEvent["shot"]> },
  gk?: StatsBombEvent["goalkeeper"],
): StatsBombEvent[] {
  const id = `shot-${++counter}`;
  const gkId = `gk-${counter}`;
  const event: StatsBombEvent = {
    id,
    index: counter * 2,
    period: 1,
    minute: 22,
    second: 24,
    type: { name: "Shot" },
    team: { id: 10, name: "Arjantin" },
    player: { id: 100, name: "Lionel Andrés Messi Cuccittini" },
    related_events: gk ? [gkId] : [],
    ...overrides,
    shot: {
      type: { name: "Penalty" },
      outcome: { name: "Goal" },
      technique: { name: "Normal" },
      body_part: { name: "Left Foot" },
      end_location: [120, 41.8, 0.2],
      ...overrides.shot,
    },
  };
  const keeper: StatsBombEvent[] = gk
    ? [{ id: gkId, index: counter * 2 + 1, period: 1, minute: 22, second: 24, type: { name: "Goal Keeper" }, team: { id: 20, name: "Fransa" }, goalkeeper: gk }]
    : [];
  return [event, ...keeper];
}

describe("zoneFromEndLocation", () => {
  it("y küçükken sol, büyükken sağ sütunu verir", () => {
    expect(zoneFromEndLocation([120, 36.5, 0.2]).col).toBe(0);
    expect(zoneFromEndLocation([120, 40, 0.2]).col).toBe(1);
    expect(zoneFromEndLocation([120, 43.5, 0.2]).col).toBe(2);
  });

  it("z yükseldikçe satır üste çıkar", () => {
    expect(zoneFromEndLocation([120, 40, 0.2]).row).toBe(2);
    expect(zoneFromEndLocation([120, 40, 1.3]).row).toBe(1);
    expect(zoneFromEndLocation([120, 40, 2.4]).row).toBe(0);
  });

  it("kale dışındaki ve eksik değerleri kenara yapıştırır", () => {
    expect(zoneFromEndLocation([118.8, 35.2, 3.1])).toEqual({ col: 0, row: 0 });
    expect(zoneFromEndLocation([120, 44, 0.2]).col).toBe(2);
    expect(zoneFromEndLocation([120, 40])).toEqual({ col: 1, row: 2 });
  });
});

describe("shotTypeFor", () => {
  it("ortaya lob panenkadır, köşeye lob değildir", () => {
    expect(shotTypeFor("Lob", { col: 1, row: 1 })).toBe("panenka");
    expect(shotTypeFor("Lob", { col: 0, row: 2 })).toBe("placed");
  });

  it("üst bölge ve orta sütun sert, alçak köşe plasedir", () => {
    expect(shotTypeFor("Normal", { col: 0, row: 0 })).toBe("power");
    expect(shotTypeFor("Normal", { col: 1, row: 2 })).toBe("power");
    expect(shotTypeFor("Normal", { col: 2, row: 2 })).toBe("placed");
    expect(shotTypeFor("Normal", { col: 0, row: 1 })).toBe("placed");
  });
});

describe("keeperDiveFor", () => {
  it("kurtarışta ve dokunarak yenen golde topun sütunudur", () => {
    expect(keeperDiveFor(undefined, { col: 0, row: 2 }, "saved", "x")).toEqual({ dive: 0, known: true });
    expect(keeperDiveFor({ outcome: { name: "Touched In" } }, { col: 2, row: 1 }, "goal", "x")).toEqual({ dive: 2, known: true });
  });

  it("ayakta kalan kaleci ortadadır", () => {
    expect(keeperDiveFor({ technique: { name: "Standing" }, outcome: { name: "No Touch" } }, { col: 0, row: 2 }, "goal", "x")).toEqual({ dive: 1, known: true });
  });

  it("dokunmadan yenen köşe golünde ters köşe tahmin edilir", () => {
    const gk = { technique: { name: "Diving" }, outcome: { name: "No Touch" } };
    expect(keeperDiveFor(gk, { col: 0, row: 2 }, "goal", "x")).toEqual({ dive: 2, known: false });
    expect(keeperDiveFor(gk, { col: 2, row: 0 }, "goal", "x")).toEqual({ dive: 0, known: false });
  });

  it("orta vuruşta tahmin kararlıdır ve bir yana gider", () => {
    const gk = { technique: { name: "Diving" }, outcome: { name: "No Touch" } };
    const first = keeperDiveFor(gk, { col: 1, row: 2 }, "goal", "abc");
    expect(first).toEqual(keeperDiveFor(gk, { col: 1, row: 2 }, "goal", "abc"));
    expect([0, 2]).toContain(first.dive);
    expect(first.known).toBe(false);
  });
});

describe("extractPenalties", () => {
  it("penaltıyı oyuncu, takım, ayak, dakika ve bölgeyle çıkarır", () => {
    const events = shot({}, { type: { name: "Penalty Conceded" }, technique: { name: "Diving" }, outcome: { name: "No Touch" } });
    const nicknames = new Map([[100, "Lionel Messi"]]);
    const { records, stats } = extractPenalties(events, match, nicknames);
    expect(stats).toEqual({ penalties: 1, kept: 1, skippedByOutcome: {}, estimatedKeeperDive: 1 });
    expect(records[0]).toMatchObject({
      playerName: "Lionel Messi",
      team: "Arjantin",
      foot: "left",
      situation: "regular",
      minute: 23,
      score: "0-0",
      match: { competition: "FIFA World Cup", season: "2022", opponent: "Fransa", date: "2022-12-18" },
      answer: { zone: { col: 2, row: 2 }, shot: "placed", outcome: "goal", keeperDive: 0 },
      keeperDiveKnown: false,
    });
  });

  it("skoru atışı kullanan takımın gözünden, vuruştan önceki haliyle verir", () => {
    const events = [
      ...shot({ shot: { type: { name: "Open Play" } }, team: { id: 20, name: "Fransa" }, minute: 5 }),
      ...shot({ minute: 40, type: { name: "Own Goal For" }, team: { id: 20, name: "Fransa" } }),
      ...shot({ minute: 60 }),
    ];
    // Üçüncü olay penaltı; öncesinde Fransa'nın bir golü ve bir kendi kalesine gol lehine var.
    const { records } = extractPenalties(events, match);
    expect(records).toHaveLength(1);
    expect(records[0].score).toBe("0-2");
  });

  it("seri penaltılarda dakika yoktur ve skor yalnızca seriyi sayar", () => {
    const events = [
      ...shot({ minute: 30 }),
      ...shot({ period: 5, minute: 120, team: { id: 20, name: "Fransa" }, player: { id: 200, name: "Kylian Mbappé" } }),
      ...shot({ period: 5, minute: 121 }),
    ];
    const { records } = extractPenalties(events, match);
    const shootout = records.filter((r) => r.situation === "shootout");
    expect(shootout.map((r) => r.minute)).toEqual([null, null]);
    expect(shootout.map((r) => r.score)).toEqual(["0-0", "0-1"]);
  });

  it("kaçan penaltıları yönüyle alır, kafayla vuruşları ve bilinmeyen sonuçları atlar", () => {
    const events = [
      ...shot({ shot: { outcome: { name: "Off T" }, end_location: [120, 35.6, 0.2] } }, { type: { name: "Shot Faced" } }),
      ...shot({ shot: { outcome: { name: "Post" }, end_location: [120, 44.2, 2.5] } }),
      ...shot({ shot: { outcome: { name: "Wayward" }, end_location: [120, 40] } }),
      ...shot({ shot: { body_part: { name: "Head" } } }),
      ...shot({ shot: { outcome: { name: "Blocked" } } }),
      ...shot({ shot: { outcome: { name: "Saved" }, end_location: [118.8, 38.2, 0.9] } }, { type: { name: "Penalty Saved" } }),
      ...shot({ shot: { outcome: { name: "Saved Off T" }, end_location: [119, 35.5, 1.1] } }, { type: { name: "Shot Saved Off T" } }),
    ];
    const { records, stats } = extractPenalties(events, match);
    expect(records.map((r) => r.answer.outcome)).toEqual(["missed", "missed", "missed", "saved", "saved"]);
    expect(records[0].answer).toMatchObject({ zone: { col: 0, row: 2 }, keeperDive: 2 });
    expect(records[0].keeperDiveKnown).toBe(false);
    expect(records[1].answer.zone).toEqual({ col: 2, row: 0 });
    expect(records[3].answer).toMatchObject({ zone: { col: 0, row: 1 }, keeperDive: 0 });
    expect(records[4].answer).toMatchObject({ zone: { col: 0, row: 1 }, keeperDive: 0 });
    expect(stats.skippedByOutcome).toEqual({ "body:Head": 1, Blocked: 1 });
  });
});

describe("buildPenalties", () => {
  it("geçmişi yalnızca önceki penaltılardan, en çok 10 tane sayarak kurar", () => {
    const events = Array.from({ length: 12 }, (_, i) =>
      shot({ minute: i + 1, shot: { end_location: [120, i % 2 === 0 ? 37 : 43, 0.2] } }),
    ).flat();
    const { records } = extractPenalties(events, match);
    const penalties = buildPenalties(records);
    expect(penalties[0].history).toEqual({ left: 0, center: 0, right: 0 });
    expect(penalties[1].history).toEqual({ left: 1, center: 0, right: 0 });
    expect(penalties[11].history).toEqual({ left: 5, center: 0, right: 5 });
    expect(penalties[11].match?.opponent).toBe("Fransa");
  });

  it("kayıtları tarih ve maç sırasına dizer", () => {
    const later = { ...match, match_id: 2, match_date: "2023-01-01" };
    const a = extractPenalties(shot({ minute: 50 }), later).records;
    const b = extractPenalties(shot({ minute: 10 }), match).records;
    const penalties = buildPenalties([...a, ...b]);
    expect(penalties.map((p) => p.minute)).toEqual([11, 51]);
  });
});
