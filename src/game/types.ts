import type { RegionFilter, RegionId } from "./regions";

// Kale, vuruşu yapan oyuncunun gözünden 3x3 bölgeye ayrılır.
// col: 0 sol, 1 orta, 2 sağ. row: 0 üst, 1 orta, 2 alt.
export type Index = 0 | 1 | 2;

export interface Zone {
  col: Index;
  row: Index;
}

export const SHOT_TYPES = ["placed", "power", "panenka"] as const;
export type ShotType = (typeof SHOT_TYPES)[number];

/** missed: top kaleyi bulmadı (dışarı, üstten auta veya direkten döndü). */
export type Outcome = "goal" | "saved" | "missed";
export type Situation = "regular" | "shootout";

/** Tahmin hedefi: kalede bir bölge ya da kale dışı. */
export type Target = Zone | "out";

export interface Player {
  name: string;
  team: string;
  foot: "left" | "right";
  /** Forma numarası (kadro verisinden); yoksa formaya yazılmaz. */
  number?: number;
}

export interface PenaltyContext {
  player: Player;
  situation: Situation;
  /** Normal süredeki dakika; seri penaltılarda null. */
  minute: number | null;
  /** Atışı kullanan takımın gözünden skor, örn. "1-1". */
  score: string;
  /** Oyuncunun veri setindeki önceki (en çok 10) penaltısının yön dağılımı. */
  history: { left: number; center: number; right: number };
  /** Gerçek veride maç bilgisi; kurgusal örneklerde yok. */
  match?: { competition: string; season: string; opponent: string; date: string };
}

/** Tahmin kilitlenene kadar yalnızca sunucuda duran gerçek vuruş bilgisi. */
export interface PenaltyAnswer {
  /** Topun gittiği bölge; kaçan vuruşta kale dışındaki noktaya en yakın bölge (yön için). */
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
  target: Target;
  shot: ShotType;
}

export interface ScoreBreakdown {
  zone: number;
  shot: number;
  streak: number;
  /** Erken kilitleme bonusu: tur puanı × %2 × kalan tam saniye. */
  speed: number;
  secondsEarly: number;
  total: number;
  /** İpucu alındıysa puanlar `HINT_FACTOR` ile çarpılmıştır. */
  hintUsed: boolean;
}

/** Sunucunun verdiği yapısal ipucu; türü penaltıya göre sabittir, metni istemci dile göre üretir. */
export type Hint =
  | { kind: "direction"; value: Index }
  | { kind: "height"; value: Index }
  | { kind: "shot"; value: ShotType };

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

/** Girişte seçilebilen turnuva; `id` = "turnuva|sezon". */
export interface CompetitionOption {
  id: string;
  competition: string;
  season: string;
  count: number;
}

/**
 * Yeni oyun isteği; `competitions` boşsa veya yoksa tüm havuz kullanılır. `token` ve `name`
 * verilirse biten oyunun puanı toplam puan sıralamasına yazılır.
 */
export interface NewGameRequest {
  competitions?: string[];
  token?: string;
  name?: string;
  region?: RegionId;
}

export interface NewGameResponse {
  gameId: string;
  round: PublicRound;
}

// ---- Tek kişilik toplam puan sıralaması ----

export interface SoloEntry {
  rank: number;
  name: string;
  region: RegionId;
  /** Biten oyunların toplam puanı. */
  total: number;
  games: number;
  best: number;
  you: boolean;
}

export interface SoloStatus {
  /** Hangi süzgeçle hesaplandı: bir bölge ya da "world". */
  region: RegionFilter;
  players: number;
  leaderboard: SoloEntry[];
  you: SoloEntry | null;
}

// ---- Haftalık challenge ----

export interface ChallengeWeek {
  /** ISO hafta anahtarı, örn. "2026-W45". */
  key: string;
  /** Pazartesi 00:00 Türkiye saati, sunucu zamanı (ms). */
  startsAt: number;
  endsAt: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  region: RegionId;
  score: number;
  finished: boolean;
  /** Bu satır isteği yapan oyuncuya mı ait. */
  you: boolean;
}

export interface ChallengeStatus {
  week: ChallengeWeek;
  serverNow: number;
  region: RegionFilter;
  participants: number;
  leaderboard: LeaderboardEntry[];
  /** Bu hafta oynadıysan sıran; oynamadıysan null. */
  you: LeaderboardEntry | null;
  /** Bu hafta oynadın mı (süzgeçten bağımsız). */
  played: boolean;
}

export interface ChallengeStartRequest {
  token: string;
  name: string;
  region: RegionId;
}

// ---- Çok oyunculu oda ----

export type RoomPhase = "lobby" | "guessing" | "reveal" | "finished";

/** Odadaki oyuncunun herkese görünen hali. */
export interface RoomPlayerPublic {
  id: string;
  name: string;
  score: number;
  streak: number;
  isHost: boolean;
  /** Bu turda tahminini kilitledi mi. */
  submitted: boolean;
  /** Bu turda ipucu aldı mı. */
  hintUsed: boolean;
  /** Açıklama evresinde bu turdan aldığı puan; diğer evrelerde null. */
  lastPoints: number | null;
}

/** Odanın bir oyuncuya gönderilen anlık durumu. Cevap yalnızca açıklama evresinde gelir. */
export interface RoomState {
  code: string;
  phase: RoomPhase;
  you: string;
  hostId: string;
  players: RoomPlayerPublic[];
  totalRounds: number;
  /** Tahmin ve açıklama evrelerinde tur bilgisi. */
  round: PublicRound | null;
  /** Sunucu saati; istemci kalan süreyi bununla hizalar. */
  serverNow: number;
  /** Tahmin evresinde sürenin dolacağı sunucu zamanı. */
  deadline: number | null;
  /** Açıklama evresinde sıradaki turun başlayacağı sunucu zamanı. */
  nextRoundAt: number | null;
  /** Açıklama evresinde gerçek vuruş ve senin sonucun. */
  reveal: { answer: PenaltyAnswer; yours: RoundResult } | null;
  /** Bu turda istediğin ipucu; istemediysen null. */
  hint: Hint | null;
  version: number;
}

export interface CreateRoomRequest {
  name: string;
  competitions?: string[];
}

export interface JoinRoomRequest {
  name: string;
}

export interface RoomJoinResponse {
  code: string;
  playerId: string;
  state: RoomState;
}
