import type { Hint, PenaltyAnswer } from "./types";

/**
 * Her penaltının tek bir ipucu türü vardır (yön, yükseklik ya da vuruş tipi); tür penaltı
 * kimliğinden kararlı biçimde seçilir, böylece aynı penaltı herkese aynı ipucunu verir ve
 * yeniden istemek yeni bilgi vermez. İpucu yapısaldır; metni istemci kendi dilinde üretir
 * (`hintText` in labels.ts).
 */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function hintKind(penaltyId: string): Hint["kind"] {
  return (["direction", "height", "shot"] as const)[hash(penaltyId) % 3];
}

export function hintFor(penaltyId: string, answer: PenaltyAnswer): Hint {
  const kind = hintKind(penaltyId);
  if (kind === "direction") return { kind, value: answer.zone.col };
  if (kind === "height") return { kind, value: answer.zone.row };
  return { kind, value: answer.shot };
}
