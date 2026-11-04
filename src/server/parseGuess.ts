import { SHOT_TYPES, type Guess, type Index, type ShotType, type Target } from "@/game/types";

const isIndex = (value: unknown): value is Index =>
  value === 0 || value === 1 || value === 2;

const isShot = (value: unknown): value is ShotType =>
  SHOT_TYPES.includes(value as ShotType);

function parseTarget(value: unknown): Target | undefined {
  if (value === "out") return "out";
  if (typeof value !== "object" || value === null) return undefined;
  const { col, row } = value as { col?: unknown; row?: unknown };
  return isIndex(col) && isIndex(row) ? { col, row } : undefined;
}

/**
 * İstek gövdesini doğrular. `{ guess: null }` süresi dolan turu temsil eder;
 * geçersiz gövdede undefined döner. Hedef `{ col, row }` ya da `"out"` olabilir.
 */
export function parseGuess(body: unknown): Guess | null | undefined {
  if (typeof body !== "object" || body === null || !("guess" in body)) return undefined;
  const { guess } = body as { guess: unknown };
  if (guess === null) return null;
  if (typeof guess !== "object") return undefined;

  const { target, shot } = guess as { target?: unknown; shot?: unknown };
  const parsed = parseTarget(target);
  if (parsed === undefined || !isShot(shot)) return undefined;
  return { target: parsed, shot };
}
