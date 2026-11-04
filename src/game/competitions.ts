import type { CompetitionOption, Penalty } from "./types";

/** Turnuva kimliği: ad ve sezon birlikte ("FIFA World Cup|2022"). */
export const competitionId = (match: NonNullable<Penalty["match"]>) =>
  `${match.competition}|${match.season}`;

/** Havuzdaki turnuvalar, yeni sezondan eskiye; aynı sezonda ada göre. Maç bilgisi olmayanlar sayılmaz. */
export function listCompetitions(pool: readonly Penalty[]): CompetitionOption[] {
  const options = new Map<string, CompetitionOption>();
  for (const penalty of pool) {
    if (!penalty.match) continue;
    const id = competitionId(penalty.match);
    const option = options.get(id) ?? {
      id,
      competition: penalty.match.competition,
      season: penalty.match.season,
      count: 0,
    };
    option.count++;
    options.set(id, option);
  }
  return [...options.values()].sort(
    (a, b) => b.season.localeCompare(a.season) || a.competition.localeCompare(b.competition),
  );
}

/** Seçilen turnuvaların penaltıları; seçim yoksa havuzun tamamı. */
export function filterPool(pool: readonly Penalty[], ids: readonly string[] | undefined): Penalty[] {
  if (!ids || ids.length === 0) return [...pool];
  const wanted = new Set(ids);
  return pool.filter((p) => p.match && wanted.has(competitionId(p.match)));
}

/**
 * Girişteki turnuva seçiminin tıklama kuralı; durum "dışarıda bırakılanlar" kümesidir (boş küme =
 * hepsi). `ids` bir turnuvanın bütün sezonları ya da tek bir sezon olabilir:
 * - Hepsi açıkken tıklamak yalnızca `ids`'i seçer.
 * - Sonrasında: `ids`'ten en az biri açıksa hepsi kapanır, hiçbiri açık değilse hepsi açılır.
 * - Hiç açık turnuva kalmazsa seçim yeniden "hepsi" olur.
 */
export function toggleGroup(all: readonly string[], excluded: ReadonlySet<string>, ids: readonly string[]): Set<string> {
  const wanted = new Set(ids);
  if (excluded.size === 0) return new Set(all.filter((other) => !wanted.has(other)));
  const next = new Set(excluded);
  const anyOn = ids.some((id) => !excluded.has(id));
  for (const id of ids) {
    if (anyOn) next.add(id);
    else next.delete(id);
  }
  return all.every((other) => next.has(other)) ? new Set() : next;
}

/** Tek turnuva için `toggleGroup`. */
export const toggleExcluded = (all: readonly string[], excluded: ReadonlySet<string>, id: string) =>
  toggleGroup(all, excluded, [id]);

/** Girişteki gruplama: ligler, milli takım turnuvaları, kulüp kupaları. */
export type CompetitionKind = "league" | "national" | "cup";
export const COMPETITION_KINDS: readonly CompetitionKind[] = ["league", "national", "cup"];

const NATIONAL = [/world cup/i, /\beuro\b/i, /copa am[eé]rica/i, /cup of nations/i, /asian cup/i, /gold cup/i, /nations league/i, /olympic/i];
const CUP = [/champions league/i, /europa/i, /conference/i, /pokal/i, /\bcup\b/i, /kupa/i, /copa/i, /coppa/i, /coupe/i, /libertadores/i];

/** Turnuva adından tür; bilinmeyen ad lig sayılır. */
export function competitionKind(competition: string): CompetitionKind {
  if (NATIONAL.some((re) => re.test(competition))) return "national";
  if (CUP.some((re) => re.test(competition))) return "cup";
  return "league";
}

/** Aynı turnuvanın sezonları tek kartta toplanır; sıra `listCompetitions` sırasıdır (yeni sezon önce). */
export interface CompetitionGroup {
  competition: string;
  kind: CompetitionKind;
  seasons: CompetitionOption[];
  count: number;
}

export function groupCompetitions(options: readonly CompetitionOption[]): { kind: CompetitionKind; groups: CompetitionGroup[] }[] {
  const byName = new Map<string, CompetitionGroup>();
  for (const option of options) {
    const group = byName.get(option.competition) ?? {
      competition: option.competition,
      kind: competitionKind(option.competition),
      seasons: [],
      count: 0,
    };
    group.seasons.push(option);
    group.count += option.count;
    byName.set(option.competition, group);
  }
  return COMPETITION_KINDS.map((kind) => ({
    kind,
    groups: [...byName.values()].filter((g) => g.kind === kind),
  })).filter((section) => section.groups.length > 0);
}

const MAX_SELECTION = 50;

/** İstek gövdesindeki turnuva seçimi; gövde boş olabilir, bozuksa undefined döner. */
export function parseCompetitions(body: unknown): string[] | null | undefined {
  if (body === undefined || body === null) return null;
  if (typeof body !== "object") return undefined;
  const { competitions } = body as { competitions?: unknown };
  if (competitions === undefined || competitions === null) return null;
  if (!Array.isArray(competitions) || competitions.length > MAX_SELECTION) return undefined;
  if (!competitions.every((id) => typeof id === "string" && id.length > 0 && id.length <= 120)) return undefined;
  return competitions;
}
