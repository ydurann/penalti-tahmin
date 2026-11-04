import { NextResponse } from "next/server";
import { requestRoomHint } from "@/game/room";
import type { Hint } from "@/game/types";
import { errorResponse, findRoomForPlayer, readBody, roomErrorResponse } from "@/server/roomRequests";
import { mutateRoom } from "@/server/roomStore";

/** Oyuncuya bu turun ipucunu verir. Gövde: `{ playerId }`. */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const body = await readBody(request);
  if (!body) return errorResponse("Geçersiz istek.", 400);
  const found = findRoomForPlayer((await params).code, body.playerId);
  if (found instanceof NextResponse) return found;

  try {
    const hint = mutateRoom(found.room, (room) => requestRoomHint(room, found.playerId, Date.now()));
    return NextResponse.json<Hint>(hint);
  } catch (error) {
    return roomErrorResponse(error);
  }
}
