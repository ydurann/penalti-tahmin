import { NextResponse } from "next/server";
import { joinRoom, roomState } from "@/game/room";
import type { RoomJoinResponse } from "@/game/types";
import { errorResponse, parseName, readBody, roomErrorResponse } from "@/server/roomRequests";
import { getRoom, mutateRoom, newPlayerId } from "@/server/roomStore";

/** Odaya katılır. Gövde: `{ name }`. */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const room = getRoom((await params).code);
  if (!room) return errorResponse("Oda bulunamadı. Kodu kontrol et.", 404, "room.notFound");
  const body = await readBody(request);
  if (!body) return errorResponse("Geçersiz istek.", 400);
  const name = parseName(body.name);
  if (!name) return errorResponse("Bir takma ad gir (en çok 20 karakter).", 400, "room.badName");

  const now = Date.now();
  const playerId = newPlayerId();
  try {
    mutateRoom(room, (r) => joinRoom(r, { id: playerId, name }, now));
  } catch (error) {
    return roomErrorResponse(error);
  }
  return NextResponse.json<RoomJoinResponse>({
    code: room.code,
    playerId,
    state: roomState(room, playerId, now),
  });
}
