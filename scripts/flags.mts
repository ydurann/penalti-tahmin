/**
 * `flag-icons` (MIT) paketindeki 4:3 SVG bayrakları, `src/game/countries.ts` haritasındaki
 * kodlar için `public/flags/` klasörüne kopyalar. Bayraklar marka değildir; klasör git'tedir.
 *
 *   npm run flags
 */
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { ALL_COUNTRY_CODES } from "../src/game/countries.ts";

const SOURCE = path.resolve("node_modules/flag-icons/flags/4x3");
const TARGET = path.resolve("public/flags");

async function main() {
  await mkdir(TARGET, { recursive: true });
  let copied = 0;
  const missing: string[] = [];
  for (const code of ALL_COUNTRY_CODES) {
    try {
      await copyFile(path.join(SOURCE, `${code}.svg`), path.join(TARGET, `${code}.svg`));
      copied++;
    } catch {
      missing.push(code);
    }
  }
  console.log(`${copied} bayrak kopyalandı → ${path.relative(process.cwd(), TARGET)}`);
  if (missing.length) console.log(`Pakette bulunamayan kodlar: ${missing.join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
