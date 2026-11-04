import type { RegionFilter, RegionId } from "./regions";
import type { SoloEntry, SoloStatus } from "./types";

/**
 * Tek kişilik oyunların toplam puan sıralaması: biten her oyunun puanı oyuncunun toplamına
 * eklenir. Kimlik cihaz anahtarı + takma addır (hesap gelene kadar); sıralama bölgeye göre
 * süzülebilir. Saf mantık; dosya işleri `src/server/soloStore.ts` içindedir.
 */
export const SOLO_LEADERBOARD_SIZE = 100;

export interface SoloPlayer {
  name: string;
  region: RegionId;
  total: number;
  games: number;
  best: number;
  updatedAt: number;
}

export interface SoloBoard {
  players: Record<string, SoloPlayer>;
}

export const EMPTY_SOLO_BOARD: SoloBoard = { players: {} };

/** Biten oyunu işler; ad ve bölge son oynananlardır. */
export function recordGame(
  board: SoloBoard,
  token: string,
  player: { name: string; region: RegionId },
  score: number,
  now: number,
): SoloBoard {
  const current = board.players[token] ?? { total: 0, games: 0, best: 0 };
  return {
    players: {
      ...board.players,
      [token]: {
        name: player.name,
        region: player.region,
        total: current.total + score,
        games: current.games + 1,
        best: Math.max(current.best, score),
        updatedAt: now,
      },
    },
  };
}

/** Toplam puan önde; eşitlikte az oyunda toplayan, sonra daha erken ulaşan önde. */
function order(a: SoloPlayer, b: SoloPlayer): number {
  return b.total - a.total || a.games - b.games || a.updatedAt - b.updatedAt;
}

export function rankedPlayers(
  board: SoloBoard,
  region: RegionFilter = "world",
): { token: string; player: SoloPlayer; rank: number }[] {
  return Object.entries(board.players)
    .map(([token, player]) => ({ token, player }))
    .filter((item) => region === "world" || item.player.region === region)
    .sort((x, y) => order(x.player, y.player))
    .map((item, i) => ({ ...item, rank: i + 1 }));
}

export function soloStatus(board: SoloBoard, token: string | null, region: RegionFilter = "world"): SoloStatus {
  const ranked = rankedPlayers(board, region);
  const toEntry = (item: (typeof ranked)[number]): SoloEntry => ({
    rank: item.rank,
    name: item.player.name,
    region: item.player.region,
    total: item.player.total,
    games: item.player.games,
    best: item.player.best,
    you: item.token === token,
  });
  const yours = ranked.find((item) => item.token === token);
  return {
    region,
    players: ranked.length,
    leaderboard: ranked.slice(0, SOLO_LEADERBOARD_SIZE).map(toEntry),
    you: yours ? toEntry(yours) : null,
  };
}
