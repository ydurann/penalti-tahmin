import type { Index, Outcome, Penalty, PenaltyAnswer, ShotType, Situation, Zone } from "@/game/types";

/**
 * StatsBomb açık verisindeki penaltıları oyunun şemasına çevirir. Saf mantıktır; dosya
 * indirme işi `scripts/import-statsbomb.mts` içindedir.
 *
 * Koordinatlar (StatsBomb Open Data Events v4, Ek 2): saha 120×80 yard, hücum yönü +x.
 * Kale x=120'de, direkler y=36 ve y=44'te; y küçüldükçe vuran oyuncunun SOLUNA gider.
 * Şut bitiş noktasındaki z yükseklik, yard cinsindendir; üst direk 2,67 yard (8 ft).
 */

const GOAL_LEFT_Y = 36;
const GOAL_RIGHT_Y = 44;
const CROSSBAR_Z = 8 / 3;

/** Bir StatsBomb olayının bu dönüşümde kullanılan alanları. */
export interface StatsBombEvent {
  id: string;
  index?: number;
  period: number;
  minute: number;
  second: number;
  type?: { name: string };
  team?: { id: number; name: string };
  player?: { id: number; name: string };
  related_events?: string[];
  shot?: {
    type?: { name: string };
    outcome?: { name: string };
    technique?: { name: string };
    body_part?: { name: string };
    end_location?: number[];
  };
  goalkeeper?: {
    type?: { name: string };
    outcome?: { name: string };
    technique?: { name: string };
    body_part?: { name: string };
  };
}

export interface StatsBombMatch {
  match_id: number;
  match_date: string;
  competition: { competition_name: string };
  season: { season_name: string };
  home_team: { home_team_id: number; home_team_name: string };
  away_team: { away_team_id: number; away_team_name: string };
}

/** Kadro dosyasından oyuncu takma adları (ör. "Lionel Messi"). */
export type Nicknames = ReadonlyMap<number, string>;
/** Kadro dosyasından forma numaraları. */
export type JerseyNumbers = ReadonlyMap<number, number>;

/** Bir maçtan çıkarılan tek penaltı; `history` sonradan hesaplanır. */
export interface PenaltyRecord {
  id: string;
  playerId: number;
  playerName: string;
  /** Forma numarası; kadroda yoksa undefined. */
  number?: number;
  team: string;
  foot: "left" | "right";
  situation: Situation;
  minute: number | null;
  score: string;
  match: { competition: string; season: string; opponent: string; date: string };
  answer: PenaltyAnswer;
  /** Kaleci yönü veriden mi okundu (true) yoksa tahmin mi edildi (false)? */
  keeperDiveKnown: boolean;
  /** Kronolojik sıralama için. */
  order: [date: string, matchId: number, period: number, minute: number, second: number];
}

export interface ExtractStats {
  penalties: number;
  kept: number;
  skippedByOutcome: Record<string, number>;
  estimatedKeeperDive: number;
}

const clampIndex = (value: number): Index => (value < 0 ? 0 : value > 2 ? 2 : value) as Index;

/**
 * StatsBomb şut sonucu → oyun sonucu. Kalecinin dokunduğu her top "saved" (dışarı gidecek
 * olsa ya da direğe çarpsa da); dışarı, üstten aut ve direk "missed". "Blocked" penaltıda olmaz.
 */
const OUTCOMES: Record<string, Outcome> = {
  Goal: "goal",
  Saved: "saved",
  "Saved Off T": "saved",
  "Saved To Post": "saved",
  "Saved to Post": "saved",
  "Off T": "missed",
  Post: "missed",
  Wayward: "missed",
};

/**
 * Kaledeki (y, z) noktasını 3×3 bölgeye çevirir; kale dışına düşen değerler kenara yapışır.
 * Kaçan vuruşta bu, topun geçtiği yöne en yakın bölgedir (yön puanı ve animasyon için).
 */
export function zoneFromEndLocation(end: readonly number[]): Zone {
  const y = end[1] ?? (GOAL_LEFT_Y + GOAL_RIGHT_Y) / 2;
  const z = end[2] ?? 0;
  const col = clampIndex(Math.floor(((y - GOAL_LEFT_Y) / (GOAL_RIGHT_Y - GOAL_LEFT_Y)) * 3));
  // row 0 üst: z büyüdükçe satır küçülür.
  const row = clampIndex(2 - Math.floor((z / CROSSBAR_Z) * 3));
  return { col, row };
}

/**
 * Veride top hızı yok; vuruş tipi yaklaşık olarak belirlenir. "Lob" tekniğiyle ortaya atılan
 * top panenka sayılır. Üst bölgeye veya orta sütuna giden vuruşlar "sert", köşelere alçak ve
 * orta yükseklikte gidenler "plase" kabul edilir.
 */
export function shotTypeFor(technique: string | undefined, zone: Zone): ShotType {
  if (technique === "Lob" && zone.col === 1) return "panenka";
  if (zone.row === 0 || zone.col === 1) return "power";
  return "placed";
}

/** Metinden kararlı bir 0–1 sayısı; tahmini dalış yönünü yeniden üretilebilir kılar. */
function hashUnit(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/**
 * Kalecinin dalış yönü. Veride yön alanı yoktur; şunlardan türetilir:
 * - Kurtarış: kaleci topun olduğu sütundadır.
 * - Gol, kaleci dokunmuş ("Touched In"): yine topun sütunu.
 * - Gol, kaleci ayakta kalmış ("Standing"): orta.
 * - Gol veya kaçan top, kaleci dokunmamış: yön bilinmez; köşe vuruşlarında ters köşe, orta
 *   vuruşlarda olay kimliğinden türetilen kararlı bir yan seçilir. `known` false döner.
 */
export function keeperDiveFor(
  gk: StatsBombEvent["goalkeeper"] | undefined,
  zone: Zone,
  outcome: Outcome,
  eventId: string,
): { dive: Index; known: boolean } {
  if (outcome === "saved") return { dive: zone.col, known: true };
  if (gk?.outcome?.name === "Touched In") return { dive: zone.col, known: true };
  if (gk?.technique?.name === "Standing") return { dive: 1, known: true };
  if (zone.col !== 1) return { dive: (2 - zone.col) as Index, known: false };
  return { dive: hashUnit(eventId) < 0.5 ? 0 : 2, known: false };
}

function footOf(bodyPart: string | undefined): "left" | "right" | null {
  if (bodyPart === "Left Foot") return "left";
  if (bodyPart === "Right Foot") return "right";
  return null;
}

/** Bir maçın olaylarından penaltıları çıkarır; yalnızca ayakla atılmayanlar atlanır. */
export function extractPenalties(
  events: readonly StatsBombEvent[],
  match: StatsBombMatch,
  nicknames: Nicknames = new Map(),
  numbers: JerseyNumbers = new Map(),
): { records: PenaltyRecord[]; stats: ExtractStats } {
  const byId = new Map(events.map((e) => [e.id, e]));
  const teams = {
    [match.home_team.home_team_id]: match.home_team.home_team_name,
    [match.away_team.away_team_id]: match.away_team.away_team_name,
  };
  const stats: ExtractStats = { penalties: 0, kept: 0, skippedByOutcome: {}, estimatedKeeperDive: 0 };
  const goals = new Map<number, number>();
  const shootoutGoals = new Map<number, number>();
  const records: PenaltyRecord[] = [];
  const sorted = [...events].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  const scoreFor = (tally: Map<number, number>, teamId: number) => {
    const own = tally.get(teamId) ?? 0;
    const opponentId = Object.keys(teams).map(Number).find((id) => id !== teamId);
    const opponent = opponentId === undefined ? 0 : tally.get(opponentId) ?? 0;
    return `${own}-${opponent}`;
  };

  for (const event of sorted) {
    const teamId = event.team?.id;
    if (teamId === undefined) continue;
    const isShootout = event.period === 5;
    const isGoal = event.type?.name === "Shot" && event.shot?.outcome?.name === "Goal";
    const isOwnGoal = event.type?.name === "Own Goal For";

    if (event.type?.name === "Shot" && event.shot?.type?.name === "Penalty" && event.player) {
      stats.penalties++;
      const outcomeName = event.shot.outcome?.name ?? "?";
      const outcome: Outcome | null = OUTCOMES[outcomeName] ?? null;
      const foot = footOf(event.shot.body_part?.name);
      if (outcome === null || foot === null) {
        const key = outcome === null ? outcomeName : `body:${event.shot.body_part?.name}`;
        stats.skippedByOutcome[key] = (stats.skippedByOutcome[key] ?? 0) + 1;
      } else {
        const zone = zoneFromEndLocation(event.shot.end_location ?? []);
        const gk = (event.related_events ?? [])
          .map((id) => byId.get(id))
          .find((e) => e?.type?.name === "Goal Keeper")?.goalkeeper;
        const { dive, known } = keeperDiveFor(gk, zone, outcome, event.id);
        if (!known) stats.estimatedKeeperDive++;
        const opponentName = Object.entries(teams).find(([id]) => Number(id) !== teamId)?.[1] ?? "?";
        records.push({
          id: `sb-${match.match_id}-${event.id.slice(0, 8)}`,
          playerId: event.player.id,
          playerName: nicknames.get(event.player.id) ?? event.player.name,
          number: numbers.get(event.player.id),
          team: teams[teamId] ?? event.team?.name ?? "?",
          foot,
          situation: isShootout ? "shootout" : "regular",
          minute: isShootout ? null : event.minute + 1,
          score: scoreFor(isShootout ? shootoutGoals : goals, teamId),
          match: {
            competition: match.competition.competition_name,
            season: match.season.season_name,
            opponent: opponentName,
            date: match.match_date,
          },
          answer: { zone, shot: shotTypeFor(event.shot.technique?.name, zone), outcome, keeperDive: dive },
          keeperDiveKnown: known,
          order: [match.match_date, match.match_id, event.period, event.minute, event.second],
        });
        stats.kept++;
      }
    }

    if (isGoal || isOwnGoal) {
      const tally = isShootout ? shootoutGoals : goals;
      tally.set(teamId, (tally.get(teamId) ?? 0) + 1);
    }
  }

  return { records, stats };
}

function compareOrder(a: PenaltyRecord, b: PenaltyRecord): number {
  for (let i = 0; i < a.order.length; i++) {
    const x = a.order[i];
    const y = b.order[i];
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * Kayıtları kronolojik sıralar ve her penaltı için oyuncunun veri setindeki ÖNCEKİ (en çok 10)
 * penaltısının yön dağılımını hesaplar. Mevcut penaltı dahil edilmez; cevap sızmasın.
 */
export function buildPenalties(records: readonly PenaltyRecord[]): Penalty[] {
  const sorted = [...records].sort(compareOrder);
  const previous = new Map<number, Index[]>();
  return sorted.map((record) => {
    const cols = previous.get(record.playerId) ?? [];
    const recent = cols.slice(-10);
    const history = {
      left: recent.filter((c) => c === 0).length,
      center: recent.filter((c) => c === 1).length,
      right: recent.filter((c) => c === 2).length,
    };
    previous.set(record.playerId, [...cols, record.answer.zone.col]);
    return {
      id: record.id,
      player: {
        name: record.playerName,
        team: record.team,
        foot: record.foot,
        ...(record.number !== undefined ? { number: record.number } : {}),
      },
      situation: record.situation,
      minute: record.minute,
      score: record.score,
      history,
      match: record.match,
      answer: record.answer,
    };
  });
}
