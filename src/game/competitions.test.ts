import { describe, expect, it } from "vitest";
import { SAMPLE_PENALTIES } from "@/data/penalties";
import {
  competitionKind,
  filterPool,
  groupCompetitions,
  listCompetitions,
  parseCompetitions,
  toggleExcluded,
  toggleGroup,
} from "./competitions";
import type { Penalty } from "./types";

const withMatch = (competition: string, season: string, i: number): Penalty => ({
  ...SAMPLE_PENALTIES[0],
  id: `${competition}-${season}-${i}`,
  match: { competition, season, opponent: "Rakip", date: "2024-01-01" },
});

const pool: Penalty[] = [
  withMatch("UEFA Euro", "2024", 1),
  withMatch("FIFA World Cup", "2022", 1),
  withMatch("UEFA Euro", "2024", 2),
  withMatch("Copa America", "2024", 1),
  { ...SAMPLE_PENALTIES[1] },
];

describe("listCompetitions", () => {
  it("turnuvaları sayarak yeni sezondan eskiye, sonra ada göre sıralar", () => {
    expect(listCompetitions(pool)).toEqual([
      { id: "Copa America|2024", competition: "Copa America", season: "2024", count: 1 },
      { id: "UEFA Euro|2024", competition: "UEFA Euro", season: "2024", count: 2 },
      { id: "FIFA World Cup|2022", competition: "FIFA World Cup", season: "2022", count: 1 },
    ]);
  });

  it("kurgusal veride boş liste döner", () => {
    expect(listCompetitions(SAMPLE_PENALTIES)).toEqual([]);
  });
});

describe("filterPool", () => {
  it("seçim yoksa havuzun tamamını, varsa yalnızca seçilenleri verir", () => {
    expect(filterPool(pool, undefined)).toHaveLength(5);
    expect(filterPool(pool, [])).toHaveLength(5);
    expect(filterPool(pool, ["UEFA Euro|2024"]).map((p) => p.id)).toEqual(["UEFA Euro-2024-1", "UEFA Euro-2024-2"]);
    expect(filterPool(pool, ["Yok|2000"])).toEqual([]);
  });
});

describe("toggleExcluded", () => {
  const all = ["Süper Lig|2025/26", "Bundesliga|2025/26", "UEFA Euro|2024"];

  it("hepsi açıkken tıklanan turnuva tek başına seçilir", () => {
    const next = toggleExcluded(all, new Set(), "Süper Lig|2025/26");
    expect([...next]).toEqual(["Bundesliga|2025/26", "UEFA Euro|2024"]);
  });

  it("seçim varken tıklama ekler ya da çıkarır", () => {
    const only = toggleExcluded(all, new Set(), "Süper Lig|2025/26");
    const two = toggleExcluded(all, only, "Bundesliga|2025/26");
    expect([...two]).toEqual(["UEFA Euro|2024"]);
    const back = toggleExcluded(all, two, "Bundesliga|2025/26");
    expect([...back].sort()).toEqual(["Bundesliga|2025/26", "UEFA Euro|2024"]);
  });

  it("son açık turnuva da kapatılırsa seçim yeniden hepsi olur", () => {
    const only = toggleExcluded(all, new Set(), "Süper Lig|2025/26");
    expect(toggleExcluded(all, only, "Süper Lig|2025/26").size).toBe(0);
  });
});

describe("toggleGroup", () => {
  const all = ["Bundesliga|2025/26", "Bundesliga|2024/25", "UEFA Euro|2024"];
  const bundesliga = ["Bundesliga|2025/26", "Bundesliga|2024/25"];

  it("hepsi açıkken bir turnuvanın bütün sezonları tek başına seçilir", () => {
    expect([...toggleGroup(all, new Set(), bundesliga)]).toEqual(["UEFA Euro|2024"]);
  });

  it("sezonlardan biri açıksa grup kapanır, hiçbiri açık değilse açılır", () => {
    const only = toggleGroup(all, new Set(), ["UEFA Euro|2024"]);
    const partly = toggleGroup(all, only, ["Bundesliga|2025/26"]);
    expect([...partly]).toEqual(["Bundesliga|2024/25"]);
    const off = toggleGroup(all, partly, bundesliga);
    expect([...off].sort()).toEqual(bundesliga.slice().sort());
    const on = toggleGroup(all, off, bundesliga);
    expect(on.size).toBe(0);
  });

  it("grup kapatılınca açık turnuva kalmazsa seçim yeniden hepsi olur", () => {
    const only = toggleGroup(all, new Set(), bundesliga);
    expect(toggleGroup(all, only, bundesliga).size).toBe(0);
  });
});

describe("competitionKind ve groupCompetitions", () => {
  it("adları lig, milli takım ve kupa olarak ayırır", () => {
    expect(competitionKind("Bundesliga")).toBe("league");
    expect(competitionKind("Süper Lig")).toBe("league");
    expect(competitionKind("FIFA World Cup")).toBe("national");
    expect(competitionKind("UEFA Euro")).toBe("national");
    expect(competitionKind("UEFA Women's Euro")).toBe("national");
    expect(competitionKind("Copa America")).toBe("national");
    expect(competitionKind("African Cup of Nations")).toBe("national");
    expect(competitionKind("Champions League")).toBe("cup");
    expect(competitionKind("Europa League")).toBe("cup");
    expect(competitionKind("DFB Pokal")).toBe("cup");
    expect(competitionKind("Türkiye Kupası")).toBe("cup");
  });

  it("sezonları turnuva altında toplar ve boş türleri atlar", () => {
    const options = listCompetitions([
      ...pool,
      withMatch("Bundesliga", "2025/26", 1),
      withMatch("Bundesliga", "2024/25", 1),
      withMatch("Bundesliga", "2024/25", 2),
    ]);
    const sections = groupCompetitions(options);
    expect(sections.map((s) => s.kind)).toEqual(["league", "national"]);
    const [league, national] = sections;
    expect(league.groups).toHaveLength(1);
    expect(league.groups[0]).toMatchObject({ competition: "Bundesliga", count: 3 });
    expect(league.groups[0].seasons.map((s) => s.season)).toEqual(["2025/26", "2024/25"]);
    expect(national.groups.map((g) => g.competition)).toEqual(["Copa America", "UEFA Euro", "FIFA World Cup"]);
  });
});

describe("parseCompetitions", () => {
  it("gövdesiz veya seçimsiz istekte null döner", () => {
    expect(parseCompetitions(undefined)).toBeNull();
    expect(parseCompetitions({})).toBeNull();
    expect(parseCompetitions({ competitions: null })).toBeNull();
  });

  it("dizi halindeki kimlikleri geçirir", () => {
    expect(parseCompetitions({ competitions: ["UEFA Euro|2024"] })).toEqual(["UEFA Euro|2024"]);
  });

  it("bozuk gövdede undefined döner", () => {
    expect(parseCompetitions("x")).toBeUndefined();
    expect(parseCompetitions({ competitions: "UEFA Euro|2024" })).toBeUndefined();
    expect(parseCompetitions({ competitions: [1] })).toBeUndefined();
    expect(parseCompetitions({ competitions: [""] })).toBeUndefined();
    expect(parseCompetitions({ competitions: Array(51).fill("a") })).toBeUndefined();
  });
});
