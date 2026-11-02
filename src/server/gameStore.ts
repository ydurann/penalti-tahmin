import type { GameSession } from "@/game/session";

// Faz 1 için bellek içi depo: sunucu yeniden başlayınca oyunlar silinir ve
// birden fazla sunucu örneğinde çalışmaz. Faz 3'te kalıcı depoya taşınacak.
const TTL_MS = 60 * 60 * 1000;

// Next.js geliştirme modunda modüller yeniden yüklense de oyunlar korunsun.
const holder = globalThis as typeof globalThis & { __games?: Map<string, GameSession> };
const games = (holder.__games ??= new Map<string, GameSession>());

export function saveGame(game: GameSession): void {
  for (const [id, existing] of games) {
    if (game.updatedAt - existing.updatedAt > TTL_MS) games.delete(id);
  }
  games.set(game.id, game);
}

export function getGame(id: string): GameSession | undefined {
  return games.get(id);
}
