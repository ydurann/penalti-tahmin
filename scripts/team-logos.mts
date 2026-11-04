/**
 * Havuzdaki kulüplerin küçük logolarını FotMob'un logo CDN'inden indirir.
 *
 *   npm run logos:fetch          # indirir, ardından manifesti üretir (npm run logos)
 *
 * Takım kimlikleri `data-src/fotmob/league-*.json` önbelleğindeki fikstürlerden okunur (içe
 * aktarma betiği çalıştırılmış olmalı). Dosya adı takım adının slug'ıdır
 * (`public/logos/bayern-munchen.png`); var olan dosya yeniden indirilmez. `_small` varyantı
 * 150×150 piksel PNG'dir (5–15 KB). Milli takımlar bayrak kullandığı için burada yoktur.
 *
 * Logolar kulüplerin marka hakkıyla korunur; klasör git dışıdır.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { teamSlug } from "../src/game/teams.ts";

const CACHE_DIR = path.resolve("data-src/fotmob");
const LOGO_DIR = path.resolve("public/logos");
const CDN = "https://images.fotmob.com/image_resources/logo/teamlogo";
const EXTENSIONS = [".svg", ".png", ".webp", ".jpg"];
const CONCURRENCY = 3;

interface LeagueFile {
  fixtures?: { allMatches?: { home: { id: string; name: string }; away: { id: string; name: string } }[] };
}

interface MatchFile {
  general?: { homeTeam?: { id: number; name: string }; awayTeam?: { id: number; name: string } };
}

/**
 * Takım kimlikleri fikstürlerden; oyun verisindeki ad maç detayındaki addır ve fikstürdekinden
 * farklı olabilir ("PAOK Thessaloniki FC" / "PAOK Thessaloniki"), bu yüzden penaltısı olan
 * maçların detay dosyaları da okunur ve her iki ad aynı kimliğe bağlanır.
 */
async function collectTeams(): Promise<Map<string, { id: string; name: string }>> {
  const teams = new Map<string, { id: string; name: string }>();
  const add = (id: string | number, name: string) => {
    const slug = teamSlug(name);
    if (!teams.has(slug)) teams.set(slug, { id: String(id), name });
  };
  let files: string[] = [];
  try {
    files = (await readdir(CACHE_DIR)).filter((f) => f.startsWith("league-") && f.endsWith(".json"));
  } catch {
    throw new Error(`${CACHE_DIR} yok; önce npm run import:fotmob çalıştır.`);
  }
  for (const file of files) {
    const league = JSON.parse(await readFile(path.join(CACHE_DIR, file), "utf8")) as LeagueFile;
    for (const match of league.fixtures?.allMatches ?? []) {
      add(match.home.id, match.home.name);
      add(match.away.id, match.away.name);
    }
  }

  let penalties: { id: string }[] = [];
  try {
    penalties = JSON.parse(await readFile(path.resolve("src/data/penalties.fotmob.json"), "utf8")) as { id: string }[];
  } catch {
    // dosya yoksa yalnızca fikstür adları
  }
  const matchIds = new Set(penalties.map((p) => p.id.split("-")[1]).filter(Boolean));
  for (const matchId of matchIds) {
    try {
      const match = JSON.parse(await readFile(path.join(CACHE_DIR, `match-${matchId}.json`), "utf8")) as MatchFile;
      for (const team of [match.general?.homeTeam, match.general?.awayTeam]) {
        if (team) add(team.id, team.name);
      }
    } catch {
      // önbellekte yoksa geç
    }
  }
  return teams;
}

async function existingSlugs(): Promise<Set<string>> {
  try {
    const files = await readdir(LOGO_DIR);
    return new Set(
      files.filter((f) => EXTENSIONS.includes(path.extname(f).toLowerCase())).map((f) => teamSlug(path.basename(f, path.extname(f)))),
    );
  } catch {
    return new Set();
  }
}

/** PNG imzasıyla doğrulanmış dosyayı yazar; CDN'de logo yoksa (HTML/boş yanıt) atlar. */
async function download(id: string, slug: string): Promise<boolean> {
  const response = await fetch(`${CDN}/${id}_small.png`);
  if (!response.ok) return false;
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return false;
  await writeFile(path.join(LOGO_DIR, `${slug}.png`), bytes);
  return true;
}

async function main() {
  const teams = await collectTeams();
  const existing = await existingSlugs();
  const todo = [...teams.entries()].filter(([slug]) => !existing.has(slug));
  console.log(`Önbellekte ${teams.size} takım, ${existing.size} logo zaten var, ${todo.length} indirilecek.`);

  let done = 0;
  const missing: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const [slug, team] = todo[next++];
      try {
        if (await download(team.id, slug)) done++;
        else missing.push(team.name);
      } catch {
        missing.push(team.name);
      }
      process.stdout.write(`  ${done + missing.length}/${todo.length}\r`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
  if (todo.length > 0) process.stdout.write("\n");

  console.log(`İndirilen: ${done}, bulunamayan: ${missing.length}`);
  for (const name of missing) console.log(`  ${name}`);
  console.log("Manifest için: npm run logos");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
