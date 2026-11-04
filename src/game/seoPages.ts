import { competitionId } from "./competitions";
import { teamSlug } from "./teams";
import type { Outcome, Penalty } from "./types";

/**
 * Arama motoru için uzun kuyruk sayfaların (`/ligler/<slug>`, `/oyuncular/<slug>`) saf özeti.
 * Yalnızca toplam sayılar üretilir: gol / kurtarış / kaçan dağılımı, oyuncu ve takım listeleri.
 * Bölge, vuruş tipi ve kaleci yönü oyunda tahmin kilitlenmeden istemciye gitmediğinden burada
 * da hesaplanmaz; oyuncunun yön dağılımı oyun içinde ipucu olduğu için sayfada gösterilmez.
 */

/** Turnuva sayfası adresi: ad + sezon tek slug ("Süper Lig" 2025/26 → "super-lig-2025-26"). */
export const competitionSlug = (competition: string, season: string) => teamSlug(`${competition} ${season}`);

/** Oyuncu sayfası adresi: "Harry Kane" → "harry-kane". Aynı adlı oyuncular tek sayfada birleşir. */
export const playerSlug = (name: string) => teamSlug(name);

/** Sitemap'e giren oyuncu sayfaları için alt sınır; daha az penaltısı olan sayfa açılır ama dizine girmez. */
export const PLAYER_PAGE_MIN = 3;

export interface OutcomeTally {
  total: number;
  goal: number;
  saved: number;
  missed: number;
}

export interface PlayerSummary {
  name: string;
  slug: string;
  /** Havuzda adına yazılan takımlar, çoktan aza. */
  teams: string[];
  foot: "left" | "right";
  tally: OutcomeTally;
  /** Seri penaltısı (period 5) sayısı. */
  shootouts: number;
  /** Penaltı kullandığı turnuvalar, yeni sezondan eskiye. */
  competitions: { id: string; competition: string; season: string; slug: string; count: number; goal: number }[];
}

export interface SeasonLink {
  id: string;
  season: string;
  slug: string;
  count: number;
}

export interface CompetitionPage {
  id: string;
  competition: string;
  season: string;
  slug: string;
  tally: OutcomeTally;
  shootouts: number;
  teams: number;
  playerCount: number;
  /** En çok penaltı kullanan oyuncular (en çok 10). */
  topPlayers: PlayerSummary[];
  /** Aynı turnuvanın havuzdaki diğer sezonları, yeni sezondan eskiye. */
  otherSeasons: SeasonLink[];
  /** Havuzdaki en erken ve en geç maç tarihi (ISO). */
  dates: { from: string; to: string } | null;
}

export const TOP_PLAYERS = 10;

const emptyTally = (): OutcomeTally => ({ total: 0, goal: 0, saved: 0, missed: 0 });

function addOutcome(tally: OutcomeTally, outcome: Outcome) {
  tally.total++;
  tally[outcome]++;
}

/** Sezon metni yeniden eskiye ("2025/26" > "2024/25" > "2022"); aynı sezonda ada göre. */
const bySeasonDesc = <T extends { season: string; competition?: string }>(a: T, b: T) =>
  b.season.localeCompare(a.season) || (a.competition ?? "").localeCompare(b.competition ?? "");

/** Havuzdaki her oyuncunun özeti; en çok penaltı kullanan önce, eşitlikte çok gol, sonra ad. */
export function summarizePlayers(pool: readonly Penalty[]): PlayerSummary[] {
  interface Draft {
    summary: PlayerSummary;
    teams: Map<string, number>;
    competitions: Map<string, PlayerSummary["competitions"][number]>;
  }
  const drafts = new Map<string, Draft>();
  for (const penalty of pool) {
    const slug = playerSlug(penalty.player.name);
    if (!slug) continue;
    const draft = drafts.get(slug) ?? {
      summary: {
        name: penalty.player.name,
        slug,
        teams: [],
        foot: penalty.player.foot,
        tally: emptyTally(),
        shootouts: 0,
        competitions: [],
      },
      teams: new Map(),
      competitions: new Map(),
    };
    addOutcome(draft.summary.tally, penalty.answer.outcome);
    if (penalty.situation === "shootout") draft.summary.shootouts++;
    draft.teams.set(penalty.player.team, (draft.teams.get(penalty.player.team) ?? 0) + 1);
    if (penalty.match) {
      const id = competitionId(penalty.match);
      const row = draft.competitions.get(id) ?? {
        id,
        competition: penalty.match.competition,
        season: penalty.match.season,
        slug: competitionSlug(penalty.match.competition, penalty.match.season),
        count: 0,
        goal: 0,
      };
      row.count++;
      if (penalty.answer.outcome === "goal") row.goal++;
      draft.competitions.set(id, row);
    }
    drafts.set(slug, draft);
  }
  return [...drafts.values()]
    .map(({ summary, teams, competitions }) => ({
      ...summary,
      teams: [...teams.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([team]) => team),
      competitions: [...competitions.values()].sort(bySeasonDesc),
    }))
    .sort(
      (a, b) => b.tally.total - a.tally.total || b.tally.goal - a.tally.goal || a.name.localeCompare(b.name),
    );
}

/** Havuzdaki turnuva+sezon sayfaları; yeni sezondan eskiye, aynı sezonda ada göre. */
export function summarizeCompetitions(pool: readonly Penalty[]): CompetitionPage[] {
  const groups = new Map<string, Penalty[]>();
  for (const penalty of pool) {
    if (!penalty.match) continue;
    const id = competitionId(penalty.match);
    const list = groups.get(id) ?? [];
    list.push(penalty);
    groups.set(id, list);
  }
  const seasons: SeasonLink[] = [...groups.entries()].map(([id, list]) => ({
    id,
    season: list[0].match!.season,
    slug: competitionSlug(list[0].match!.competition, list[0].match!.season),
    count: list.length,
  }));
  const pages: CompetitionPage[] = [];
  for (const [id, list] of groups) {
    const { competition, season } = list[0].match!;
    const tally = emptyTally();
    const teams = new Set<string>();
    let shootouts = 0;
    let from = "";
    let to = "";
    for (const penalty of list) {
      addOutcome(tally, penalty.answer.outcome);
      teams.add(penalty.player.team);
      if (penalty.situation === "shootout") shootouts++;
      const date = penalty.match!.date;
      if (date && (!from || date < from)) from = date;
      if (date && (!to || date > to)) to = date;
    }
    const players = summarizePlayers(list);
    pages.push({
      id,
      competition,
      season,
      slug: competitionSlug(competition, season),
      tally,
      shootouts,
      teams: teams.size,
      playerCount: players.length,
      topPlayers: players.slice(0, TOP_PLAYERS),
      otherSeasons: seasons
        .filter((s) => s.id !== id && s.id.startsWith(`${competition}|`))
        .sort((a, b) => b.season.localeCompare(a.season)),
      dates: from ? { from, to } : null,
    });
  }
  return pages.sort(bySeasonDesc);
}

export const findCompetitionPage = (pool: readonly Penalty[], slug: string) =>
  summarizeCompetitions(pool).find((page) => page.slug === slug) ?? null;

export const findPlayerPage = (pool: readonly Penalty[], slug: string) =>
  summarizePlayers(pool).find((player) => player.slug === slug) ?? null;

/** Dizine girecek oyuncular: en az `PLAYER_PAGE_MIN` penaltı. */
export const indexedPlayers = (pool: readonly Penalty[]) =>
  summarizePlayers(pool).filter((player) => player.tally.total >= PLAYER_PAGE_MIN);

/** Ana sayfayı verilen turnuvalar seçili açan adres (`?turnuva=` tekrarlanır). */
export function playUrl(ids: readonly string[]): string {
  if (ids.length === 0) return "/";
  return `/?${ids.map((id) => `turnuva=${encodeURIComponent(id)}`).join("&")}`;
}

/** `?turnuva=` parametresi: tekrarlı ya da virgülle ayrılmış kimlikler; havuzda olmayanlar atılır. */
export function parsePlayParam(value: string | string[] | undefined, known: readonly string[]): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  const wanted = new Set(values.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean));
  return known.filter((id) => wanted.has(id));
}

/** "90 penaltı: 70 gol, 12 kurtarış, 8 kaçan" biçiminde Türkçe özet. */
export function tallyText(tally: OutcomeTally): string {
  return `${tally.total} penaltı: ${tally.goal} gol, ${tally.saved} kurtarış, ${tally.missed} kaçan`;
}

/** Yüzde (tam sayı); sıfır bölme yok. */
export const percent = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 100));
