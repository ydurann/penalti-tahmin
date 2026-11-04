/**
 * Sosyal medya tanıtım görsellerini çalışan geliştirme sunucusundan indirir (`marketing/`).
 *
 *   npm run dev -- -p 3457      # başka bir terminalde
 *   npm run promo               # marketing/promo-*.png
 *   npm run promo -- --base http://localhost:3000
 *
 * Tasarım `src/app/promo/[kind]/route.tsx` içindedir; üretimde o rota kapalıdır.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const KINDS = ["square", "story", "thumb", "banner"];

async function main() {
  const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:3457" } } });
  const dir = path.resolve("marketing");
  await mkdir(dir, { recursive: true });
  for (const kind of KINDS) {
    const response = await fetch(`${values.base}/promo/${kind}`);
    if (!response.ok) throw new Error(`${kind}: HTTP ${response.status} (geliştirme sunucusu açık mı?)`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const file = path.join(dir, `promo-${kind}.png`);
    await writeFile(file, bytes);
    console.log(`${path.relative(process.cwd(), file)}  ${Math.round(bytes.length / 1024)} KB`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
