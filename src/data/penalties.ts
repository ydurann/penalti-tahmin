import type { Index, Outcome, Penalty, Player, ShotType, Situation } from "@/game/types";

// Faz 1 için KURGUSAL örnek veri: oyuncular, takımlar ve vuruşlar gerçek değildir.
// Faz 2'de gerçek penaltı verisiyle değiştirilecek.

const emre: Player = { name: "Emre Kaya", team: "Liman SK", foot: "right" };
const mert: Player = { name: "Mert Aydın", team: "Kuzey FK", foot: "right" };
const kerem: Player = { name: "Kerem Solak", team: "Ada Spor", foot: "left" };
const luca: Player = { name: "Luca Ferrano", team: "Vadi United", foot: "right" };
const tomas: Player = { name: "Tomas Reyna", team: "Liman SK", foot: "left" };
const baris: Player = { name: "Barış Ertem", team: "Bozkır FK", foot: "right" };
const noah: Player = { name: "Noah Lindqvist", team: "Kuzey FK", foot: "right" };
const yusuf: Player = { name: "Yusuf Demirel", team: "Ada Spor", foot: "right" };

type Row = [
  player: Player,
  situation: Situation,
  minute: number | null,
  score: string,
  history: [left: number, center: number, right: number],
  col: Index,
  row: Index,
  shot: ShotType,
  outcome: Outcome,
  keeperDive: Index,
];

const rows: Row[] = [
  [emre, "regular", 87, "1-1", [6, 1, 3], 0, 2, "placed", "goal", 2],
  [emre, "regular", 12, "0-0", [6, 1, 3], 0, 1, "placed", "goal", 1],
  [emre, "shootout", null, "3-3", [6, 1, 3], 2, 2, "placed", "saved", 2],
  [mert, "regular", 34, "0-0", [2, 4, 4], 1, 0, "panenka", "goal", 0],
  [mert, "regular", 90, "2-1", [2, 4, 4], 2, 0, "power", "goal", 0],
  [mert, "shootout", null, "1-2", [2, 4, 4], 1, 1, "panenka", "saved", 1],
  [kerem, "shootout", null, "4-4", [3, 0, 7], 2, 1, "power", "saved", 2],
  [kerem, "regular", 58, "1-0", [3, 0, 7], 2, 2, "placed", "goal", 0],
  [kerem, "regular", 76, "0-1", [3, 0, 7], 2, 0, "power", "goal", 2],
  [luca, "regular", 23, "0-0", [5, 0, 5], 0, 0, "power", "goal", 2],
  [luca, "regular", 71, "1-2", [5, 0, 5], 2, 2, "placed", "goal", 0],
  [luca, "shootout", null, "2-2", [5, 0, 5], 0, 2, "placed", "saved", 0],
  [tomas, "regular", 45, "1-1", [8, 1, 1], 0, 2, "placed", "goal", 2],
  [tomas, "regular", 89, "0-0", [8, 1, 1], 0, 1, "power", "saved", 0],
  [tomas, "shootout", null, "5-5", [8, 1, 1], 1, 0, "panenka", "goal", 0],
  [baris, "regular", 15, "0-1", [4, 2, 4], 1, 0, "power", "goal", 2],
  [baris, "regular", 66, "2-2", [4, 2, 4], 2, 1, "placed", "goal", 0],
  [baris, "shootout", null, "0-0", [4, 2, 4], 0, 0, "power", "goal", 0],
  [noah, "regular", 39, "1-0", [1, 1, 8], 2, 2, "placed", "goal", 0],
  [noah, "regular", 90, "1-1", [1, 1, 8], 2, 1, "placed", "saved", 2],
  [noah, "shootout", null, "3-4", [1, 1, 8], 0, 2, "power", "goal", 2],
  [yusuf, "regular", 52, "0-0", [3, 3, 4], 1, 1, "power", "goal", 2],
  [yusuf, "regular", 81, "3-3", [3, 3, 4], 2, 0, "placed", "goal", 2],
  [yusuf, "shootout", null, "2-3", [3, 3, 4], 0, 1, "placed", "saved", 0],
];

export const SAMPLE_PENALTIES: Penalty[] = rows.map(
  ([player, situation, minute, score, [left, center, right], col, row, shot, outcome, keeperDive], i) => ({
    id: `sample-${i + 1}`,
    player,
    situation,
    minute,
    score,
    history: { left, center, right },
    answer: { zone: { col, row }, shot, outcome, keeperDive },
  }),
);
