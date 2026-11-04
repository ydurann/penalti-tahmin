import type { Penalty } from "@/game/types";
import { ROUNDS_PER_GAME } from "@/game/session";
import generated from "./penalties.generated.json";
import fotmob from "./penalties.fotmob.json";
import { SAMPLE_PENALTIES } from "./penalties";

/**
 * Gerçek penaltılar: `scripts/import-statsbomb.mts` (turnuvalar) ve `scripts/import-fotmob.mts`
 * (lig sezonları, ör. Bundesliga 2025/26) ile üretilir. Dosyalar boşsa (veri henüz
 * indirilmemişse) oyun kurgusal örneklerle devam eder.
 */
export const REAL_PENALTIES = [...(generated as unknown as Penalty[]), ...(fotmob as unknown as Penalty[])];

export const PENALTY_POOL: readonly Penalty[] =
  REAL_PENALTIES.length >= ROUNDS_PER_GAME ? REAL_PENALTIES : SAMPLE_PENALTIES;
