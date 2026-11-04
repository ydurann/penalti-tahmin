import { describe, expect, it } from "vitest";
import { SAMPLE_PENALTIES } from "@/data/penalties";
import {
  competitionSlug,
  findCompetitionPage,
  findPlayerPage,
  indexedPlayers,
  parsePlayParam,
  percent,
  playUrl,
  playerSlug,
  summarizeCompetitions,
  summarizePlayers,
  tallyText,
} from "./seoPages";
import type { Outcome, Penalty, Situation } from "./types";

interface Spec {
  name: string;
  team: string;
  competition: string;
  season: string;
  outcome: Outcome;
  date?: string;
  situation?: Situation;
  foot?: "left" | "right";
}

let seq = 0;
const make = (s: Spec): Penalty => ({
  ...SAMPLE_PENALTIES[0],
  id: `p-${++seq}`,
  player: { name: s.name, team: s.team, foot: s.foot ?? "right" },
  situation: s.situation ?? "regular",
  match: { competition: s.competition, season: s.season, opponent: "Rakip", date: s.date ?? "2025-09-01" },
  answer: { ...SAMPLE_PENALTIES[0].answer, outcome: s.outcome },
});

const pool: Penalty[] = [
  make({ name: "Paul Onuachu", team: "Trabzonspor", competition: "Süper Lig", season: "2025/26", outcome: "goal", date: "2025-08-10" }),
  make({ name: "Paul Onuachu", team: "Trabzonspor", competition: "Süper Lig", season: "2025/26", outcome: "goal" }),
  make({ name: "Paul Onuachu", team: "Trabzonspor", competition: "Süper Lig", season: "2025/26", outcome: "saved", date: "2026-03-01" }),
  make({ name: "Mauro Icardi", team: "Galatasaray", competition: "Süper Lig", season: "2025/26", outcome: "goal" }),
  make({ name: "Mauro Icardi", team: "Galatasaray", competition: "Süper Lig", season: "2025/26", outcome: "missed" }),
  make({ name: "Mauro Icardi", team: "Galatasaray", competition: "Süper Lig", season: "2024/25", outcome: "goal" }),
  make({ name: "Harry Kane", team: "England", competition: "FIFA World Cup", season: "2022", outcome: "missed", situation: "shootout", date: "2022-12-10" }),
  make({ name: "Harry Kane", team: "Bayern München", competition: "Bundesliga", season: "2025/26", outcome: "goal" }),
  make({ name: "Harry Kane", team: "Bayern München", competition: "Bundesliga", season: "2025/26", outcome: "goal" }),
  // Maç bilgisi olmayan kurgusal penaltı turnuva sayfalarına girmez.
  { ...SAMPLE_PENALTIES[1], id: "kurgusal" },
];

describe("slug üretimi", () => {
  it("turnuva ve sezonu tek slug yapar, oyuncu adını sadeleştirir", () => {
    expect(competitionSlug("Süper Lig", "2025/26")).toBe("super-lig-2025-26");
    expect(competitionSlug("FIFA World Cup", "2022")).toBe("fifa-world-cup-2022");
    expect(competitionSlug("Champions League", "2024/25")).toBe("champions-league-2024-25");
    expect(playerSlug("Harry Kane")).toBe("harry-kane");
    expect(playerSlug("Kylian Mbappé")).toBe("kylian-mbappe");
    expect(playerSlug("İrfan Can Kahveci")).toBe("irfan-can-kahveci");
  });
});

describe("summarizeCompetitions", () => {
  it("her turnuva+sezon için sonuç dağılımı, takım ve oyuncu sayısı verir; yeni sezon önce", () => {
    const pages = summarizeCompetitions(pool);
    expect(pages.map((p) => p.id)).toEqual([
      "Bundesliga|2025/26",
      "Süper Lig|2025/26",
      "Süper Lig|2024/25",
      "FIFA World Cup|2022",
    ]);
    const superLig = pages[1];
    expect(superLig).toMatchObject({
      slug: "super-lig-2025-26",
      tally: { total: 5, goal: 3, saved: 1, missed: 1 },
      teams: 2,
      playerCount: 2,
      shootouts: 0,
      dates: { from: "2025-08-10", to: "2026-03-01" },
    });
    expect(superLig.topPlayers.map((p) => p.name)).toEqual(["Paul Onuachu", "Mauro Icardi"]);
    expect(superLig.otherSeasons).toEqual([{ id: "Süper Lig|2024/25", season: "2024/25", slug: "super-lig-2024-25", count: 1 }]);
    expect(pages[3].shootouts).toBe(1);
    expect(pages[0].otherSeasons).toEqual([]);
  });

  it("slug ile bulunur, bilinmeyen slug null döner", () => {
    expect(findCompetitionPage(pool, "fifa-world-cup-2022")?.competition).toBe("FIFA World Cup");
    expect(findCompetitionPage(pool, "yok")).toBeNull();
  });

  it("kurgusal havuzda boş liste döner", () => {
    expect(summarizeCompetitions(SAMPLE_PENALTIES)).toEqual([]);
  });
});

describe("summarizePlayers", () => {
  it("penaltı sayısına, sonra gole göre sıralar; takım ve turnuvaları toplar", () => {
    const players = summarizePlayers(pool);
    expect(players.slice(0, 3).map((p) => p.name)).toEqual(["Harry Kane", "Mauro Icardi", "Paul Onuachu"]);
    const kane = players[0];
    expect(kane).toMatchObject({
      slug: "harry-kane",
      teams: ["Bayern München", "England"],
      tally: { total: 3, goal: 2, saved: 0, missed: 1 },
      shootouts: 1,
    });
    expect(kane.competitions.map((c) => `${c.slug}:${c.count}/${c.goal}`)).toEqual([
      "bundesliga-2025-26:2/2",
      "fifa-world-cup-2022:1/0",
    ]);
  });

  it("yön dağılımı, bölge ya da kaleci yönü özette yer almaz", () => {
    const kane = findPlayerPage(pool, "harry-kane")!;
    const text = JSON.stringify(kane);
    expect(text).not.toMatch(/"(zone|keeperDive|history|shot|answer)":/);
  });

  it("dizine girecek oyuncular en az üç penaltı kullanmış olanlardır", () => {
    expect(indexedPlayers(pool).map((p) => p.name)).toEqual(["Harry Kane", "Mauro Icardi", "Paul Onuachu"]);
    expect(findPlayerPage(pool, "yok")).toBeNull();
  });
});

describe("oyun bağlantısı", () => {
  it("turnuva kimliklerini ?turnuva= ile kodlar", () => {
    expect(playUrl([])).toBe("/");
    expect(playUrl(["Süper Lig|2025/26"])).toBe("/?turnuva=S%C3%BCper%20Lig%7C2025%2F26");
    expect(playUrl(["A|1", "B|2"])).toBe("/?turnuva=A%7C1&turnuva=B%7C2");
  });

  it("parametreyi havuzdaki kimliklerle eşler, bilinmeyeni atar", () => {
    const known = ["Süper Lig|2025/26", "Bundesliga|2025/26", "UEFA Euro|2024"];
    expect(parsePlayParam(undefined, known)).toEqual([]);
    expect(parsePlayParam("Süper Lig|2025/26", known)).toEqual(["Süper Lig|2025/26"]);
    expect(parsePlayParam(["UEFA Euro|2024", "Yok|1"], known)).toEqual(["UEFA Euro|2024"]);
    expect(parsePlayParam("Bundesliga|2025/26, UEFA Euro|2024", known)).toEqual(["Bundesliga|2025/26", "UEFA Euro|2024"]);
  });
});

describe("metin yardımcıları", () => {
  it("özet cümlesi ve yüzde", () => {
    expect(tallyText({ total: 90, goal: 70, saved: 12, missed: 8 })).toBe("90 penaltı: 70 gol, 12 kurtarış, 8 kaçan");
    expect(percent(70, 90)).toBe(78);
    expect(percent(1, 0)).toBe(0);
  });
});
