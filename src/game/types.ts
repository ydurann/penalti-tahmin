// Kale, vuruşu yapan oyuncunun gözünden 3x3 bölgeye ayrılır.
// col: 0 sol, 1 orta, 2 sağ. row: 0 üst, 1 orta, 2 alt.
export type Index = 0 | 1 | 2;

export interface Zone {
  col: Index;
  row: Index;
}

export const SHOT_TYPES = ["placed", "power", "panenka"] as const;
export type ShotType = (typeof SHOT_TYPES)[number];

export type Outcome = "goal" | "saved";
export type Situation = "regular" | "shootout";

export interface Player {
  name: string;
  team: string;
  foot: "left" | "right";
}

export interface PenaltyContext {
  player: Player;
  situation: Situation;
  /** Normal süredeki dakika; seri penaltılarda null. */
  minute: number | null;
  /** Atışı kullanan takımın gözünden skor, örn. "1-1". */
  score: string;
  /** Oyuncunun son 10 penaltısının yön dağılımı. */
  history: { left: number; center: number; right: number };
}

/** Tahmin kilitlenene kadar yalnızca sunucuda duran gerçek vuruş bilgisi. */
export interface PenaltyAnswer {
  zone: Zone;
  shot: ShotType;
  outcome: Outcome;
  keeperDive: Index;
}

export interface Penalty extends PenaltyContext {
  id: string;
  answer: PenaltyAnswer;
}

export interface Guess {
  zone: Zone;
  shot: ShotType;
}

export interface ScoreBreakdown {
  zone: number;
  shot: number;
  streak: number;
  total: number;
}

/** İstemciye gönderilen tur bilgisi; cevap alanlarını içermez. */
export interface PublicRound extends PenaltyContext {
  number: number;
  totalRounds: number;
  timeLimitMs: number;
}

export interface RoundResult {
  guess: Guess | null;
  timedOut: boolean;
  answer: PenaltyAnswer;
  points: ScoreBreakdown;
  totalScore: number;
  streak: number;
  finished: boolean;
}

export interface NewGameResponse {
  gameId: string;
  round: PublicRound;
}
