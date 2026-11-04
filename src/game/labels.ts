import { hasMessage, translator, type Translate } from "@/i18n";
import type { RegionFilter } from "./regions";
import type { Hint, Outcome, PenaltyAnswer, ShotType, Target, Zone } from "./types";

/**
 * Arayüz etiketleri; metinler sözlükten gelir, `t` çağıranın dilini taşır. Türkçe sabitler
 * (`SHOT_LABELS`, `OUTCOME_LABELS`, `trLabels`) yönetim ekranı gibi çevrilmeyen yerler içindir.
 */
const lower = (t: Translate, text: string) => text.toLocaleLowerCase(t.locale);
const capitalize = (t: Translate, text: string) => text.charAt(0).toLocaleUpperCase(t.locale) + text.slice(1);

export const shotLabel = (t: Translate, shot: ShotType) => t(`shot.${shot}`);
export const outcomeLabel = (t: Translate, outcome: Outcome) => t(`outcome.${outcome}`);
export const regionName = (t: Translate, region: RegionFilter) =>
  region === "world" ? t("common.world") : t(`region.${region}`);

/** Cümle içinde geçen bölge adı: "sol üst" / "top left" / "oben Mitte" (Almancada ad büyük kalır). */
function zoneWords(t: Translate, { col, row }: Zone): string {
  if (col === 1 && row === 1) return t.locale === "de" ? t("zone.center") : lower(t, t("zone.center"));
  return t("zone.name", { col: t(`zone.col${col}`), row: t(`zone.row${row}`) });
}

/** "Sol üst" / "Top left" / "Oben links": sözcük sırası dile göre `zone.name`den gelir. */
export function zoneLabel(t: Translate, zone: Zone): string {
  return capitalize(t, zoneWords(t, zone));
}

export function targetLabel(t: Translate, target: Target): string {
  return target === "out" ? t("zone.out") : zoneLabel(t, target);
}

/** Sonuç ekranındaki gerçek vuruş: kaçan topta yönüyle birlikte "Dışarı". */
export function answerLabel(t: Translate, answer: PenaltyAnswer): string {
  if (answer.outcome !== "missed") return zoneLabel(t, answer.zone);
  return t("zone.outTowards", { zone: zoneWords(t, answer.zone) });
}

/** StatsBomb turnuva adlarının çevirisi; listede olmayanlar olduğu gibi gösterilir. */
export function competitionLabel(t: Translate, competition: string, season?: string): string {
  const key = `competition.${competition}`;
  const name = hasMessage(key) ? t(key) : competition;
  return season ? `${name} ${season}` : name;
}

/** Sunucunun verdiği yapısal ipucunun metni. */
export function hintText(t: Translate, hint: Hint): string {
  if (hint.kind === "direction") {
    return hint.value === 1 ? t("hint.directionCenter") : t("hint.directionSide", { side: t(`zone.col${hint.value}`) });
  }
  if (hint.kind === "height") {
    return hint.value === 1 ? t("hint.heightMid") : t("hint.height", { level: t(`zone.row${hint.value}`) });
  }
  // "Panenka" özel ad; diğer tipler cümle içinde küçük harfle geçer.
  const shot = shotLabel(t, hint.value);
  return t("hint.shot", { shot: hint.value === "panenka" ? shot : lower(t, shot) });
}

// ---- Türkçe sabitler (yönetim ekranı, sunucu günlükleri) ----
const trT = translator("tr");

export const SHOT_LABELS: Record<ShotType, string> = {
  placed: trT("shot.placed"),
  power: trT("shot.power"),
  panenka: trT("shot.panenka"),
};

export const OUTCOME_LABELS: Record<Outcome, string> = {
  goal: trT("outcome.goal"),
  saved: trT("outcome.saved"),
  missed: trT("outcome.missed"),
};

export const trLabels = {
  zone: (zone: Zone) => zoneLabel(trT, zone),
  answer: (answer: PenaltyAnswer) => answerLabel(trT, answer),
  competition: (competition: string, season?: string) => competitionLabel(trT, competition, season),
};
