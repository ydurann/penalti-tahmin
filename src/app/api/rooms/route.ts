import { NextResponse } from "next/server";
import { filterPool, parseCompetitions } from "@/game/competitions";
import { createRoom, roomState } from "@/game/room";
import { ROUNDS_PER_GAME } from "@/game/session";
import type { RoomJoinResponse } from "@/game/types";
import { loadPool } from "@/server/manualStore";
import { errorResponse, parseName, readBody, roomErrorResponse } from "@/server/roomRequests";
import { newPlayerId, newRoomCode, saveRoom } from "@/server/roomStore";

/** Oda kurar; kuran kişi ev sahibi olur. Gövde: `{ name, competitions? }`. */
export async function POST(request: Request) {
  const body = await readBody(request);
  if (!body) return errorResponse("Geçersiz istek.", 400);
  const name = parseName(body.name);
  if (!name) return errorResponse("Bir takma ad gir (en çok 20 karakter).", 400, "room.badName");
  const competitions = parseCompetitions(body);
  if (competitions === undefined) return errorResponse("Geçersiz turnuva seçimi.", 400);

  const pool = filterPool(await loadPool(), competitions ?? undefined);
  if (pool.length < ROUNDS_PER_GAME) {
    return errorResponse(
      `Seçilen turnuvalarda bir oyun için yeterli penaltı yok (en az ${ROUNDS_PER_GAME}).`,
      400,
      "pool.tooSmall",
    );
  }

  const now = Date.now();
  const playerId = newPlayerId();
  try {
    const room = createRoom(pool, { code: newRoomCode(), host: { id: playerId, name }, now });
    saveRoom(room);
    return NextResponse.json<RoomJoinResponse>({
      code: room.code,
      playerId,
      state: roomState(room, playerId, now),
    });
  } catch (error) {
    return roomErrorResponse(error);
  }
}
