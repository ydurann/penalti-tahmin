import type { Index, Outcome, Situation, Zone } from "@/game/types";
// Uzantı Node'un betikte doğrudan çalıştırabilmesi için (`allowImportingTsExtensions`).
import { keeperDiveFor, shotTypeFor, type ExtractStats, type PenaltyRecord } from "../statsbomb/mapping.ts";

/**
 * FotMob maç detayındaki şut haritasını oyunun şemasına çevirir. Saf mantıktır; indirme işi
 * `scripts/import-fotmob.mts` içindedir. Kayıtlar StatsBomb dönüşümüyle aynı `PenaltyRecord`
 * biçimindedir; `buildPenalties` ikisi için de çalışır.
 *
 * Koordinatlar: saha 105×68 m, kale x=105'te; `goalCrossedY` topun kale çizgisini geçtiği
 * noktanın saha genişliğindeki yeri (m), `goalCrossedZ` yüksekliği (m). Direkler 34 ± 3,66'da,
 * üst direk 2,44. 2022 Dünya Kupası finalindeki 11 penaltı StatsBomb verisiyle karşılaştırıldı:
 * BÜYÜK Y vuran oyuncunun SOLUDUR (StatsBomb'un tersi).
 */

const GOAL_CENTER_Y = 34;
const GOAL_HALF_WIDTH = 7.32 / 2;
const CROSSBAR_Z = 2.44;

export interface FotMobShot {
  id: number;
  /** Goal | AttemptSaved | Miss | Post */
  eventType: string;
  teamId: number;
  playerId: number;
  playerName: string;
  min: number;
  minAdded?: number | null;
  goalCrossedY?: number | null;
  goalCrossedZ?: number | null;
  /** RightFoot | LeftFoot | Header | OtherBodyPart */
  shotType?: string | null;
  /** Penalty | RegularPlay | FastBreak | SetPiece | ... */
  situation?: string | null;
  /** FirstHalf | SecondHalf | FirstHalfExtra | SecondHalfExtra | PenaltyShootout */
  period?: string | null;
  isOwnGoal?: boolean;
}

export interface FotMobEvent {
  /** Goal | MissedPenalty | Card | Substitution | ... */
  type: string;
  time?: number | null;
  /** Olaydan ÖNCEKİ skor. */
  homeScore?: number | null;
  awayScore?: number | null;
  isPenaltyShootoutEvent?: boolean | null;
  player?: { id?: number | null } | null;
  shotmapEvent?: { id?: number | null } | null;
}

/** Kadro: ilk 11 ve yedekler; forma numarası metin gelir ("10"). */
export interface FotMobLineupTeam {
  starters?: { id: number; shirtNumber?: string | number | null }[] | null;
  subs?: { id: number; shirtNumber?: string | number | null }[] | null;
}

export interface FotMobMatch {
  general: {
    matchId: string | number;
    matchTimeUTCDate: string;
    homeTeam: { name: string; id: number };
    awayTeam: { name: string; id: number };
  };
  content?: {
    shotmap?: { shots?: FotMobShot[] | null } | null;
    matchFacts?: { events?: { events?: FotMobEvent[] | null } | null } | null;
    lineup?: { homeTeam?: FotMobLineupTeam | null; awayTeam?: FotMobLineupTeam | null } | null;
  } | null;
}

/** Kadrodan oyuncu kimliği → forma numarası; sayıya çevrilemeyen değerler atlanır. */
export function jerseyNumbers(match: FotMobMatch): Map<number, number> {
  const numbers = new Map<number, number>();
  for (const team of [match.content?.lineup?.homeTeam, match.content?.lineup?.awayTeam]) {
    for (const player of [...(team?.starters ?? []), ...(team?.subs ?? [])]) {
      const n = Number(player.shirtNumber);
      if (Number.isInteger(n) && n > 0 && n < 100) numbers.set(player.id, n);
    }
  }
  return numbers;
}

export interface CompetitionInfo {
  competition: string;
  season: string;
}

const clampIndex = (value: number): Index => (value < 0 ? 0 : value > 2 ? 2 : value) as Index;

/** Kale çizgisindeki (y, z) noktasını 3×3 bölgeye çevirir; kale dışı değerler kenara yapışır. */
export function zoneFromGoalMouth(y: number, z: number): Zone {
  // Sol direk y = 37,66; y küçüldükçe vuranın sağına gider.
  const fromLeft = GOAL_CENTER_Y + GOAL_HALF_WIDTH - y;
  const col = clampIndex(Math.floor((fromLeft / (2 * GOAL_HALF_WIDTH)) * 3));
  const row = clampIndex(2 - Math.floor((Math.max(0, z) / CROSSBAR_Z) * 3));
  return { col, row };
}

const OUTCOMES: Record<string, Outcome> = {
  Goal: "goal",
  AttemptSaved: "saved",
  Miss: "missed",
  Post: "missed",
};

const PERIODS = ["FirstHalf", "SecondHalf", "FirstHalfExtra", "SecondHalfExtra", "PenaltyShootout"];

function footOf(shotType: string | null | undefined): "left" | "right" | null {
  if (shotType === "LeftFoot") return "left";
  if (shotType === "RightFoot") return "right";
  return null;
}

function compareShots(a: FotMobShot, b: FotMobShot): number {
  const pa = PERIODS.indexOf(a.period ?? "");
  const pb = PERIODS.indexOf(b.period ?? "");
  return pa - pb || a.min - b.min || (a.minAdded ?? 0) - (b.minAdded ?? 0) || a.id - b.id;
}

/**
 * Bir maçın penaltılarını çıkarır. Skor, FotMob olay listesindeki (gol / kaçan penaltı) kaydın
 * "olaydan önceki skor" alanından okunur; olay eşleşmezse o dakikadan önceki gollerden sayılır.
 * Seri penaltılarda skor yalnızca seriyi sayar. Kafayla atılan ya da kale çizgisi bilgisi
 * olmayan vuruşlar atlanır.
 */
export function extractPenalties(match: FotMobMatch, info: CompetitionInfo): { records: PenaltyRecord[]; stats: ExtractStats } {
  const stats: ExtractStats = { penalties: 0, kept: 0, skippedByOutcome: {}, estimatedKeeperDive: 0 };
  const { homeTeam, awayTeam } = match.general;
  const matchId = Number(match.general.matchId);
  const date = match.general.matchTimeUTCDate.slice(0, 10);
  const shots = [...(match.content?.shotmap?.shots ?? [])].sort(compareShots);
  const events = match.content?.matchFacts?.events?.events ?? [];
  const teams: Record<number, string> = { [homeTeam.id]: homeTeam.name, [awayTeam.id]: awayTeam.name };
  const numbers = jerseyNumbers(match);

  const skip = (key: string) => {
    stats.skippedByOutcome[key] = (stats.skippedByOutcome[key] ?? 0) + 1;
  };

  /** Normal süredeki skor: olay listesi; bulunamazsa o dakikadan önceki goller. */
  const scoreBefore = (shot: FotMobShot): [home: number, away: number] => {
    const event =
      events.find((e) => e.shotmapEvent?.id != null && e.shotmapEvent.id === shot.id) ??
      events.find(
        (e) => (e.type === "Goal" || e.type === "MissedPenalty") && e.player?.id === shot.playerId && e.time === shot.min,
      );
    if (event && typeof event.homeScore === "number" && typeof event.awayScore === "number") {
      return [event.homeScore, event.awayScore];
    }
    let home = 0;
    let away = 0;
    for (const s of shots) {
      if (s.period === "PenaltyShootout" || s.eventType !== "Goal" || compareShots(s, shot) >= 0) continue;
      // Kendi kalesine golde FotMob vuruşu kendi kalesine atan takıma yazar.
      const scorer = s.isOwnGoal ? (s.teamId === homeTeam.id ? awayTeam.id : homeTeam.id) : s.teamId;
      if (scorer === homeTeam.id) home++;
      else away++;
    }
    return [home, away];
  };

  const shootoutGoals: Record<number, number> = { [homeTeam.id]: 0, [awayTeam.id]: 0 };
  const records: PenaltyRecord[] = [];

  for (const shot of shots) {
    const isShootout = shot.period === "PenaltyShootout";
    if (shot.situation !== "Penalty" && !isShootout) continue;
    stats.penalties++;
    const outcome = OUTCOMES[shot.eventType] ?? null;
    const foot = footOf(shot.shotType);
    const y = shot.goalCrossedY;
    const z = shot.goalCrossedZ ?? 0;
    if (outcome === null) skip(shot.eventType);
    else if (foot === null) skip(`body:${shot.shotType ?? "?"}`);
    else if (typeof y !== "number") skip("noGoalMouth");
    else {
      const zone = zoneFromGoalMouth(y, z);
      const { dive, known } = keeperDiveFor(undefined, zone, outcome, `${matchId}-${shot.id}`);
      if (!known) stats.estimatedKeeperDive++;
      const isHome = shot.teamId === homeTeam.id;
      let score: string;
      if (isShootout) {
        const own = shootoutGoals[shot.teamId] ?? 0;
        const other = shootoutGoals[isHome ? awayTeam.id : homeTeam.id] ?? 0;
        score = `${own}-${other}`;
      } else {
        const [home, away] = scoreBefore(shot);
        score = isHome ? `${home}-${away}` : `${away}-${home}`;
      }
      const situation: Situation = isShootout ? "shootout" : "regular";
      records.push({
        id: `fm-${matchId}-${shot.id}`,
        playerId: shot.playerId,
        playerName: shot.playerName,
        number: numbers.get(shot.playerId),
        team: teams[shot.teamId] ?? "?",
        foot,
        situation,
        minute: isShootout ? null : shot.min,
        score,
        match: { competition: info.competition, season: info.season, opponent: isHome ? awayTeam.name : homeTeam.name, date },
        answer: { zone, shot: shotTypeFor(undefined, zone), outcome, keeperDive: dive },
        keeperDiveKnown: known,
        order: [date, matchId, PERIODS.indexOf(shot.period ?? "") + 1, shot.min, shot.id],
      });
      stats.kept++;
    }
    if (isShootout && shot.eventType === "Goal") shootoutGoals[shot.teamId] = (shootoutGoals[shot.teamId] ?? 0) + 1;
  }

  return { records, stats };
}

/** FotMob sezon adı ("2025/2026") → oyundaki kısa biçim ("2025/26"); tek yıllı sezon olduğu gibi kalır. */
export function seasonLabel(season: string): string {
  const m = /^(\d{4})\/(\d{2})(\d{2})$/.exec(season);
  return m ? `${m[1]}/${m[3]}` : season;
}
