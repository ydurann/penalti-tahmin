/**
 * StatsBomb açık verisinden penaltıları indirir ve oyunun şemasına çevirir.
 *
 *   npm run import:statsbomb -- --list
 *   npm run import:statsbomb                              # varsayılan turnuvalar
 *   npm run import:statsbomb -- --competitions "FIFA World Cup:2022,UEFA Euro:2024"
 *
 * Ham dosyalar `data-src/statsbomb/` altında önbelleğe alınır (git dışı); ikinci çalıştırma
 * indirme yapmaz. Çıktı `src/data/penalties.generated.json` dosyasıdır.
 *
 * Lisans: StatsBomb Public Data User Agreement ticari kullanımı ve ham verinin dağıtımını
 * yasaklar, yayınlanan analizde StatsBomb logosuyla atıf ister. Kayıt: statsbomb.com/resource-centre
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  buildPenalties,
  extractPenalties,
  type ExtractStats,
  type PenaltyRecord,
  type StatsBombEvent,
  type StatsBombMatch,
} from "../src/data/statsbomb/mapping.ts";

const BASE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data";
const CACHE_DIR = path.resolve("data-src/statsbomb");
const OUTPUT = path.resolve("src/data/penalties.generated.json");
const DEFAULT_COMPETITIONS = [
  "FIFA World Cup:2022",
  "FIFA World Cup:2018",
  "UEFA Euro:2024",
  "UEFA Euro:2020",
  "Copa America:2024",
  "African Cup of Nations:2023",
].join(",");
const CONCURRENCY = 4;

interface Competition {
  competition_id: number;
  season_id: number;
  competition_name: string;
  season_name: string;
  competition_gender: string;
}

interface LineupTeam {
  lineup: { player_id: number; player_name: string; player_nickname: string | null; jersey_number?: number }[];
}

/** Önbellekten okur, yoksa indirip önbelleğe yazar. */
async function fetchJson<T>(relativePath: string): Promise<T> {
  const file = path.join(CACHE_DIR, relativePath);
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    // önbellekte yok
  }
  const response = await fetch(`${BASE_URL}/${relativePath}`);
  if (!response.ok) throw new Error(`${relativePath}: HTTP ${response.status}`);
  const text = await response.text();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text, "utf8");
  return JSON.parse(text) as T;
}

/** Sınırlı eşzamanlılıkla sırayla çalıştırır; ilerlemeyi yazar. */
async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
      done++;
      if (done % 10 === 0 || done === items.length) process.stdout.write(`  ${done}/${items.length}\r`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  process.stdout.write("\n");
  return results;
}

function mergeStats(total: ExtractStats, part: ExtractStats) {
  total.penalties += part.penalties;
  total.kept += part.kept;
  total.estimatedKeeperDive += part.estimatedKeeperDive;
  for (const [key, count] of Object.entries(part.skippedByOutcome)) {
    total.skippedByOutcome[key] = (total.skippedByOutcome[key] ?? 0) + count;
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      list: { type: "boolean", default: false },
      competitions: { type: "string", default: DEFAULT_COMPETITIONS },
    },
  });

  const competitions = await fetchJson<Competition[]>("competitions.json");
  if (values.list) {
    for (const c of competitions) {
      console.log(`${c.competition_name}:${c.season_name}  (${c.competition_gender})`);
    }
    return;
  }

  const wanted = values.competitions.split(",").map((pair) => {
    const [name, season] = pair.split(":").map((s) => s.trim());
    const found = competitions.find((c) => c.competition_name === name && c.season_name === season);
    if (!found) throw new Error(`Turnuva bulunamadı: "${pair}". --list ile adları gör.`);
    return found;
  });

  const records: PenaltyRecord[] = [];
  const stats: ExtractStats = { penalties: 0, kept: 0, skippedByOutcome: {}, estimatedKeeperDive: 0 };

  for (const competition of wanted) {
    const matches = await fetchJson<StatsBombMatch[]>(
      `matches/${competition.competition_id}/${competition.season_id}.json`,
    );
    console.log(`${competition.competition_name} ${competition.season_name}: ${matches.length} maç`);
    const perMatch = await mapLimited(matches, CONCURRENCY, async (match) => {
      const [events, lineups] = await Promise.all([
        fetchJson<StatsBombEvent[]>(`events/${match.match_id}.json`),
        fetchJson<LineupTeam[]>(`lineups/${match.match_id}.json`).catch(() => [] as LineupTeam[]),
      ]);
      const nicknames = new Map<number, string>();
      const numbers = new Map<number, number>();
      for (const team of lineups) {
        for (const p of team.lineup) {
          if (p.player_nickname) nicknames.set(p.player_id, p.player_nickname);
          if (typeof p.jersey_number === "number") numbers.set(p.player_id, p.jersey_number);
        }
      }
      return extractPenalties(events, match, nicknames, numbers);
    });
    for (const result of perMatch) {
      records.push(...result.records);
      mergeStats(stats, result.stats);
    }
  }

  const penalties = buildPenalties(records);
  await writeFile(OUTPUT, JSON.stringify(penalties, null, 2) + "\n", "utf8");

  const players = new Set(records.map((r) => r.playerId)).size;
  const count = (outcome: string) => penalties.filter((p) => p.answer.outcome === outcome).length;
  console.log(
    `\nPenaltı: ${stats.penalties}, alınan: ${stats.kept} (gol ${count("goal")}, kurtarılan ${count("saved")}, kaçan ${count("missed")}), oyuncu: ${players}`,
  );
  console.log(`Atlanan (sonuç/vücut): ${JSON.stringify(stats.skippedByOutcome)}`);
  console.log(`Kaleci yönü tahmini olan: ${stats.estimatedKeeperDive}`);
  console.log(`Yazıldı: ${path.relative(process.cwd(), OUTPUT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
