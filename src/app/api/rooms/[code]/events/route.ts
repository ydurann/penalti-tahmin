import { NextResponse } from "next/server";
import { roomState } from "@/game/room";
import { findRoomForPlayer } from "@/server/roomRequests";
import { getRoom, subscribeRoom } from "@/server/roomStore";

export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;

/**
 * Odanın canlı durumu, sunucu gönderimli olaylar (SSE) olarak. Bağlanınca anlık durum,
 * sonra her değişiklikte yenisi gelir; oda silinirse `gone` olayı gönderilip yayın kapanır.
 * `?playerId=` zorunludur; durum o oyuncunun gözünden üretilir.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const found = findRoomForPlayer(code, new URL(request.url).searchParams.get("playerId"));
  if (found instanceof NextResponse) return found;
  const { playerId } = found;
  const roomCode = found.room.code;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      const write = (text: string) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          open = false;
        }
      };
      const send = () => {
        const room = getRoom(roomCode);
        if (!room) {
          write("event: gone\ndata: {}\n\n");
          close();
          return;
        }
        write(`data: ${JSON.stringify(roomState(room, playerId, Date.now()))}\n\n`);
      };
      const unsubscribe = subscribeRoom(roomCode, send);
      const heartbeat = setInterval(() => write(": ping\n\n"), HEARTBEAT_MS);
      const close = () => {
        if (!open) return;
        open = false;
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // zaten kapalı
        }
      };
      request.signal.addEventListener("abort", close);
      send();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
