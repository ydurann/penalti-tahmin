"use client";

import { useEffect } from "react";
import { groupCompetitions } from "@/game/competitions";
import type { CompetitionOption } from "@/game/types";
import { useT } from "@/i18n/LocaleProvider";
import { CompetitionLogo } from "./CompetitionLogo";
import { CompetitionPicker } from "./CompetitionPicker";
import styles from "./Game.module.css";
import { CheckIcon, TrophyIcon } from "./Icons";

const MAX_STACK = 5;

interface BarProps {
  competitions: CompetitionOption[];
  excluded: ReadonlySet<string>;
  onOpen: () => void;
}

/**
 * Giriş kartındaki turnuva özeti: seçili turnuvaların logoları üst üste, sayı ve "Değiştir".
 * Tam liste sayfayı uzatmasın diye ayrı bir panelde (`CompetitionSheet`) açılır.
 */
export function CompetitionBar({ competitions, excluded, onOpen }: BarProps) {
  const t = useT();
  const chosen = competitions.filter((c) => !excluded.has(c.id));
  const count = chosen.reduce((sum, c) => sum + c.count, 0);
  const groups = groupCompetitions(chosen).flatMap((s) => s.groups);
  const shown = groups.slice(0, MAX_STACK);
  const extra = groups.length - shown.length;

  return (
    <button type="button" className={styles.compBar} onClick={onOpen}>
      <span className={styles.logoStack} aria-hidden="true">
        {shown.map((g) => (
          <span key={g.competition}>
            <CompetitionLogo competition={g.competition} season={g.seasons[0].season} height={18} fallback={<TrophyIcon />} />
          </span>
        ))}
        {extra > 0 && <span className={styles.logoMore}>+{extra}</span>}
      </span>
      <span className={styles.compBarText}>
        <strong>{excluded.size === 0 ? t("intro.allCompetitions") : t("intro.selectedCount", { c: chosen.length })}</strong>
        <small>{t("intro.penaltyCount", { n: count })}</small>
      </span>
      <span className={styles.compBarAction}>{t("intro.changeCompetitions")}</span>
    </button>
  );
}

interface SheetProps {
  competitions: CompetitionOption[];
  excluded: ReadonlySet<string>;
  onToggle: (ids: string[]) => void;
  onAll: () => void;
  onClose: () => void;
  /** Seçim bir oyun için yetersizse gösterilecek uyarı. */
  warning: string | null;
}

/** Turnuva seçicinin tam hali; ekranı kaplayan panelde açılır, Esc ya da "Tamam" ile kapanır. */
export function CompetitionSheet({ competitions, excluded, onToggle, onAll, onClose, warning }: SheetProps) {
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.sheetOverlay} role="dialog" aria-modal="true" aria-labelledby="modes-title">
      <div className={styles.sheetCard}>
        <CompetitionPicker competitions={competitions} excluded={excluded} onToggle={onToggle} onAll={onAll} />
        <div className={styles.sheetFoot}>
          {warning ? <p className={styles.error} role="alert">{warning}</p> : <span />}
          <button type="button" className={`${styles.primary} ${styles.tutorialNext}`} disabled={warning !== null} onClick={onClose} autoFocus>
            <CheckIcon />
            {t("intro.pickerDone")}
          </button>
        </div>
      </div>
    </div>
  );
}
