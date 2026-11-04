/** Sıralamaların ayrıldığı bölgeler; ülke yerine bölge seçilir. */
export const REGIONS = [
  { id: "tr", name: "Türkiye" },
  { id: "eu", name: "Avrupa" },
  { id: "me", name: "Orta Doğu" },
  { id: "as", name: "Asya" },
  { id: "af", name: "Afrika" },
  { id: "na", name: "Kuzey Amerika" },
  { id: "sa", name: "Güney Amerika" },
  { id: "oc", name: "Okyanusya" },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];
/** Sıralama süzgeci: bir bölge ya da tüm dünya. */
export type RegionFilter = RegionId | "world";

export const isRegion = (value: unknown): value is RegionId =>
  REGIONS.some((r) => r.id === value);

export const parseRegionFilter = (value: unknown): RegionFilter =>
  value === "world" || !isRegion(value) ? "world" : value;

export function regionName(id: RegionFilter): string {
  return id === "world" ? "Dünya" : REGIONS.find((r) => r.id === id)?.name ?? id;
}
