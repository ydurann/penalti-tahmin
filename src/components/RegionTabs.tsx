"use client";

import { regionName } from "@/game/labels";
import { REGIONS, type RegionFilter } from "@/game/regions";
import { useT } from "@/i18n/LocaleProvider";
import styles from "./Game.module.css";

interface RegionTabsProps {
  value: RegionFilter;
  onChange: (region: RegionFilter) => void;
  label: string;
}

/** Sıralama süzgeci: Dünya ve bölgeler. */
export function RegionTabs({ value, onChange, label }: RegionTabsProps) {
  const t = useT();
  const options: RegionFilter[] = ["world", ...REGIONS.map((r) => r.id)];
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {options.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          className={value === id ? styles.tabOn : styles.tab}
          onClick={() => onChange(id)}
        >
          {regionName(t, id)}
        </button>
      ))}
    </div>
  );
}
