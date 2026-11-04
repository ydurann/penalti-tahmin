/**
 * FotMob maç verisinden bir lig sezonunun penaltılarını indirir ve oyunun şemasına çevirir.
 *
 *   npm run import:fotmob                                   # Bundesliga 2025/2026
 *   npm run import:fotmob -- --league 54 --season 2024/2025
 *   npm run import:fotmob -- --league 54 --season 2025/2026 --name Bundesliga --label 2025/26
 *
 * Ham yanıtlar `data-src/fotmob/` altında önbelleğe alınır (git dışı); ikinci çalıştırma
 * indirme yapmaz. Çıktı `src/data/penalties.fotmob.json`: aynı turnuva ve sezonun eski kayıtları
 * silinir, diğer turnuvalar korunur.
 *
 * Kaynak resmî bir API değildir; FotMob'un kullanım şartları otomatik erişimi kısıtlar. Ham veri
 * bu yüzden git dışıdır; herkese açık yayından önce lisans durumu netleştirilmelidir.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { extractPenalties, seasonLabel, type FotMobMatch } from "../src/data/fotmob/mapping.ts";
import { buildPenalties, type ExtractStats, type PenaltyRecord } from "../src/data/statsbomb/mapping.ts";
import type { Penalty } from "../src/game/types.ts";

const BASE_URL = "https://www.fotmob.com/api/data";
const CACHE_DIR = path.resolve("data-src/fotmob");
const OUTPUT = path.resolve("src/data/penalties.fotmob.json");
const CONCURRENCY = 2;
const HEADERS = { "user-agent": "penalti-tahmin veri aktarimi (hobi projesi)" };

interface LeagueResponse {
  details: { name: string; selectedSeason: string };
  fixtures: {
    allMatches: { id: string; status: { finished: boolean; cancelled: boolean } }[];
  };
}

/** Önbellekten okur, yoksa indirip önbelleğe yazar. */
async function fetchJson<T>(fileName: string, url: string): Promise<T> {
  const file = path.join(CACHE_DIR, fileName);
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    // önbellekte yok
  }
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const text = await response.text();
  const parsed = JSON.parse(text) as T & { error?: boolean; message?: string };
  if (parsed.error) throw new Error(`${url}: ${parsed.message ?? "hata"}`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text, "utf8");
  return parsed;
}

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
      league: { type: "string", default: "54" },
      season: { type: "string", default: "2025/2026" },
      name: { type: "string" },
      label: { type: "string" },
    },
  });

  const seasonKey = values.season.replace("/", "-");
  const league = await fetchJson<LeagueResponse>(
    `league-${values.league}-${seasonKey}.json`,
    `${BASE_URL}/leagues?id=${values.league}&season=${encodeURIComponent(values.season)}`,
  );
  const info = { competition: values.name ?? league.details.name, season: values.label ?? seasonLabel(values.season) };
  const matches = league.fixtures.allMatches.filter((m) => m.status.finished && !m.status.cancelled);
  console.log(`${info.competition} ${info.season}: ${matches.length} biten maç`);

  const records: PenaltyRecord[] = [];
  const stats: ExtractStats = { penalties: 0, kept: 0, skippedByOutcome: {}, estimatedKeeperDive: 0 };
  const perMatch = await mapLimited(matches, CONCURRENCY, async (m) => {
    const match = await fetchJson<FotMobMatch>(`match-${m.id}.json`, `${BASE_URL}/matchDetails?matchId=${m.id}`);
    return extractPenalties(match, info);
  });
  for (const result of perMatch) {
    records.push(...result.records);
    mergeStats(stats, result.stats);
  }

  const penalties = buildPenalties(records);
  let existing: Penalty[] = [];
  try {
    existing = JSON.parse(await readFile(OUTPUT, "utf8")) as Penalty[];
  } catch {
    // ilk çalıştırma
  }
  const kept = existing.filter(
    (p) => !(p.match?.competition === info.competition && p.match?.season === info.season),
  );
  await writeFile(OUTPUT, JSON.stringify([...kept, ...penalties], null, 2) + "\n", "utf8");

  const players = new Set(records.map((r) => r.playerId)).size;
  const count = (outcome: string) => penalties.filter((p) => p.answer.outcome === outcome).length;
  console.log(
    `\nPenaltı: ${stats.penalties}, alınan: ${stats.kept} (gol ${count("goal")}, kurtarılan ${count("saved")}, kaçan ${count("missed")}), oyuncu: ${players}`,
  );
  console.log(`Atlanan (sonuç/vücut): ${JSON.stringify(stats.skippedByOutcome)}`);
  console.log(`Kaleci yönü tahmini olan: ${stats.estimatedKeeperDive}`);
  console.log(`Yazıldı: ${path.relative(process.cwd(), OUTPUT)} (toplam ${kept.length + penalties.length} kayıt)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
