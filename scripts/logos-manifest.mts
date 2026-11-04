/**
 * `public/logos/` içindeki logo dosyalarını tarar ve `src/data/logos.manifest.json` üretir
 * (slug → dosya adı). Oyun logoyu bu manifestten bulur; dosya yoksa baş harfli rozet gösterir.
 *
 *   npm run logos              # manifesti üret
 *   npm run logos -- --missing # havuzdaki takımlardan logosu olmayanları listele
 *
 * Dosya adı takım adının slug'ıdır (bkz. src/game/teams.ts): galatasaray.png, argentina.svg.
 * Logolar marka hakkıyla korunur; klasör git dışıdır, dosyaları kullanıcı koyar.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { teamSlug } from "../src/game/teams.ts";

const LOGO_DIR = path.resolve("public/logos");
const MANIFEST = path.resolve("src/data/logos.manifest.json");
const EXTENSIONS = [".svg", ".png", ".webp", ".jpg"];

interface PenaltyLike {
  player: { team: string };
  match?: { opponent: string };
}

async function scan(): Promise<Record<string, string>> {
  let files: string[] = [];
  try {
    files = await readdir(LOGO_DIR);
  } catch {
    return {};
  }
  const manifest: Record<string, string> = {};
  for (const file of files.sort()) {
    const ext = path.extname(file).toLowerCase();
    if (!EXTENSIONS.includes(ext)) continue;
    const slug = teamSlug(path.basename(file, ext));
    // SVG varsa PNG'ye tercih edilir.
    if (!manifest[slug] || ext === ".svg") manifest[slug] = file;
  }
  return manifest;
}

async function teamsInPool(): Promise<string[]> {
  const names = new Set<string>();
  for (const file of ["src/data/penalties.generated.json", "src/data/penalties.fotmob.json", "src/data/penalties.manual.json"]) {
    try {
      const raw = JSON.parse(await readFile(path.resolve(file), "utf8")) as PenaltyLike[] | { penalties: PenaltyLike[] };
      const list = Array.isArray(raw) ? raw : raw.penalties;
      for (const p of list) {
        names.add(p.player.team);
        if (p.match) names.add(p.match.opponent);
      }
    } catch {
      // dosya yoksa geç
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, "tr"));
}

async function main() {
  const manifest = await scan();
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`${Object.keys(manifest).length} logo bulundu → ${path.relative(process.cwd(), MANIFEST)}`);

  if (process.argv.includes("--missing")) {
    const teams = await teamsInPool();
    const missing = teams.filter((t) => !manifest[teamSlug(t)]);
    console.log(`\nHavuzda ${teams.length} takım, ${missing.length} tanesinin logosu yok:`);
    for (const t of missing) console.log(`  ${t}  →  public/logos/${teamSlug(t)}.png`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
