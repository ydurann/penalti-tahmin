import type { ChallengeBoard } from "@/game/challenge";
import { seedChallengeAttempts, seedSoloPlayers } from "@/game/seedBoard";
import type { SoloBoard } from "@/game/soloBoard";
import type { ChallengeWeek } from "@/game/types";

/**
 * Tohum oyuncular sıralamalara sanal olarak eklenir; dosyaya yazılmaz. `SEED_LEADERBOARD=0`
 * ile kapatılır. Gerçek kayıtlar her zaman öncelikli ve aynı sıralama kurallarına tabidir.
 */
export const seedsEnabled = () => process.env.SEED_LEADERBOARD !== "0";

export function withSoloSeeds(board: SoloBoard, now: number): SoloBoard {
  if (!seedsEnabled()) return board;
  const players = { ...board.players };
  for (const seed of seedSoloPlayers(now)) {
    if (!(seed.token in players)) {
      players[seed.token] = {
        name: seed.name,
        region: seed.region,
        total: seed.total,
        games: seed.games,
        best: seed.best,
        updatedAt: seed.updatedAt,
      };
    }
  }
  return { players };
}

export function withChallengeSeeds(board: ChallengeBoard, week: ChallengeWeek): ChallengeBoard {
  if (!seedsEnabled()) return board;
  const attempts = { ...board.attempts };
  for (const seed of seedChallengeAttempts(week.key, week.startsAt)) {
    if (!(seed.token in attempts)) {
      attempts[seed.token] = {
        name: seed.name,
        region: seed.region,
        score: seed.score,
        finished: true,
        startedAt: seed.updatedAt - 5 * 60_000,
        updatedAt: seed.updatedAt,
      };
    }
  }
  return { ...board, attempts };
}
