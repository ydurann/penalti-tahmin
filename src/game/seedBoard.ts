import { REGIONS, type RegionId } from "./regions";

/**
 * Tohum oyuncular: oyuncu çekmek için sıralamalar başta dolu görünür. Dosyaya yazılmazlar;
 * durum hesaplanırken gerçek kayıtlarla sanal olarak birleşirler, gerçek oyuncular puan
 * topladıkça aralarına girer ve geçer. Anahtarları "seed-" ile başlar, böylece ayrıştırılıp
 * kapatılabilir (`SEED_LEADERBOARD=0`). Üretim kararlıdır: aynı bölge (ve hafta) aynı listeyi verir.
 */
const NAMES: Record<RegionId, string[]> = {
  tr: ["Emre K.", "Ayşe D.", "Burak T.", "Zeynep A.", "Mert S.", "Elif Y.", "Kaan Ö.", "Selin B.", "Arda Ç.", "Deniz U.", "Yusuf E.", "Ece G."],
  eu: ["Luca M.", "Sophie R.", "Jonas W.", "Marta G.", "Tomáš K.", "Eva L.", "Mateo P.", "Nina H.", "Oliver B.", "Ana F."],
  me: ["Omar H.", "Layla S.", "Karim A.", "Sara N.", "Youssef M.", "Rania K.", "Ali R.", "Dana T."],
  as: ["Hiro T.", "Mei L.", "Arjun S.", "Yuna K.", "Wei Z.", "Priya R.", "Ken N.", "Aisha B."],
  af: ["Kwame A.", "Amina O.", "Tunde B.", "Zanele M.", "Samuel K.", "Fatou D.", "Yusuf M.", "Nia W."],
  na: ["Jake M.", "Emily R.", "Carlos G.", "Ava T.", "Liam P.", "Sofia H.", "Noah C.", "Mia L."],
  sa: ["Mateus S.", "Valentina R.", "Diego F.", "Camila M.", "Thiago A.", "Lucía P.", "Bruno C.", "Julia N."],
  oc: ["Jack W.", "Olivia B.", "Cooper H.", "Aroha T.", "Noah K.", "Ella M."],
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const isSeedToken = (token: string) => token.startsWith("seed-");

export interface SeedSoloPlayer {
  token: string;
  name: string;
  region: RegionId;
  total: number;
  games: number;
  best: number;
  updatedAt: number;
}

/** Toplam puan tablosu tohumları: bölge başına 6–12 oyuncu, 2–14 oyunda 250–650 puan ortalaması. */
export function seedSoloPlayers(baseTime: number): SeedSoloPlayer[] {
  const players: SeedSoloPlayer[] = [];
  for (const region of REGIONS) {
    const random = seeded(hash(`solo:${region.id}`));
    NAMES[region.id].forEach((name, i) => {
      const games = 2 + Math.floor(random() * 13);
      const average = 250 + Math.floor(random() * 400);
      const best = Math.min(1000, average + 150 + Math.floor(random() * 250));
      players.push({
        token: `seed-${region.id}-${i}`,
        name,
        region: region.id,
        total: games * average,
        games,
        best,
        updatedAt: baseTime - Math.floor(random() * 30) * 86_400_000,
      });
    });
  }
  return players;
}

export interface SeedAttempt {
  token: string;
  name: string;
  region: RegionId;
  score: number;
  updatedAt: number;
}

/** Haftalık challenge tohumları: bölge başına 4–8 bitmiş deneme, 250–900 puan; haftaya göre değişir. */
export function seedChallengeAttempts(weekKey: string, weekStart: number): SeedAttempt[] {
  const attempts: SeedAttempt[] = [];
  for (const region of REGIONS) {
    const random = seeded(hash(`challenge:${weekKey}:${region.id}`));
    const names = [...NAMES[region.id]].sort(() => random() - 0.5);
    const count = 4 + Math.floor(random() * 5);
    names.slice(0, count).forEach((name, i) => {
      attempts.push({
        token: `seed-${weekKey}-${region.id}-${i}`,
        name,
        region: region.id,
        score: 250 + Math.floor(random() * 650),
        updatedAt: weekStart + Math.floor(random() * 5 * 86_400_000),
      });
    });
  }
  return attempts;
}
