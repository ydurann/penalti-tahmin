import { NextResponse } from "next/server";
import { filterPool, parseCompetitions } from "@/game/competitions";
import { isRegion } from "@/game/regions";
import { createGame, currentRound, ROUNDS_PER_GAME } from "@/game/session";
import type { NewGameResponse } from "@/game/types";
import { parseToken } from "@/server/challengeRequests";
import { saveGame } from "@/server/gameStore";
import { loadPool } from "@/server/manualStore";
import { parseName } from "@/server/roomRequests";

export async function POST(request: Request) {
  // Gövde isteğe bağlıdır; eski istemciler gövdesiz gönderir.
  const body = await request.text();
  let parsed: unknown;
  try {
    parsed = body ? JSON.parse(body) : undefined;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const competitions = parseCompetitions(parsed);
  if (competitions === undefined) {
    return NextResponse.json({ error: "Geçersiz turnuva seçimi." }, { status: 400 });
  }

  const pool = filterPool(await loadPool(), competitions ?? undefined);
  if (pool.length < ROUNDS_PER_GAME) {
    return NextResponse.json(
      { error: `Seçilen turnuvalarda bir oyun için yeterli penaltı yok (en az ${ROUNDS_PER_GAME}).`, code: "pool.tooSmall" },
      { status: 400 },
    );
  }

  const game = createGame(pool, {
    id: crypto.randomUUID(),
    now: Date.now(),
  });
  // Anahtar, ad ve bölge birlikte geldiyse oyun toplam puan sıralamasına sayılır.
  const fields = (parsed ?? {}) as { token?: unknown; name?: unknown; region?: unknown };
  const token = parseToken(fields.token);
  const name = parseName(fields.name);
  if (token && name && isRegion(fields.region)) game.solo = { token, name, region: fields.region };

  saveGame(game);
  return NextResponse.json<NewGameResponse>({
    gameId: game.id,
    round: currentRound(game),
  });
}
