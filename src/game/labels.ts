import type { Index, ShotType, Zone } from "./types";

export const SHOT_LABELS: Record<ShotType, string> = {
  placed: "Plase",
  power: "Sert",
  panenka: "Panenka",
};

const COL_LABELS: Record<Index, string> = { 0: "sol", 1: "orta", 2: "sağ" };
const ROW_LABELS: Record<Index, string> = { 0: "üst", 1: "orta", 2: "alt" };

export function zoneLabel({ col, row }: Zone): string {
  if (col === 1 && row === 1) return "Tam orta";
  const text = `${COL_LABELS[col]} ${ROW_LABELS[row]}`;
  return text.charAt(0).toLocaleUpperCase("tr") + text.slice(1);
}
