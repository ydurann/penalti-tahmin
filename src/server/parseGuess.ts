import { SHOT_TYPES, type Guess, type Index, type ShotType } from "@/game/types";

const isIndex = (value: unknown): value is Index =>
  value === 0 || value === 1 || value === 2;

const isShot = (value: unknown): value is ShotType =>
  SHOT_TYPES.includes(value as ShotType);

/**
 * İstek gövdesini doğrular. `{ guess: null }` süresi dolan turu temsil eder;
 * geçersiz gövdede undefined döner.
 */
export function parseGuess(body: unknown): Guess | null | undefined {
  if (typeof body !== "object" || body === null || !("guess" in body)) return undefined;
  const { guess } = body as { guess: unknown };
  if (guess === null) return null;
  if (typeof guess !== "object") return undefined;

  const { zone, shot } = guess as { zone?: { col?: unknown; row?: unknown } | null; shot?: unknown };
  const col = zone?.col;
  const row = zone?.row;
  if (!isIndex(col) || !isIndex(row) || !isShot(shot)) return undefined;
  return { zone: { col, row }, shot };
}
