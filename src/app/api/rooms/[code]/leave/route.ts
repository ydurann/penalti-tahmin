import { NextResponse } from "next/server";
import { leaveRoom } from "@/game/room";
import { errorResponse, findRoomForPlayer, readBody } from "@/server/roomRequests";
import { mutateRoom } from "@/server/roomStore";

/** Lobiden ayrılır. Gövde: `{ playerId }`. Oyun başladıysa etkisi yoktur. */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const body = await readBody(request);
  if (!body) return errorResponse("Geçersiz istek.", 400);
  const found = findRoomForPlayer((await params).code, body.playerId);
  if (found instanceof NextResponse) return found;

  mutateRoom(found.room, (room) => leaveRoom(room, found.playerId, Date.now()));
  return NextResponse.json({ ok: true });
}
