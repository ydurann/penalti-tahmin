"use client";

import { groupCompetitions, type CompetitionGroup } from "@/game/competitions";
import { competitionLabel } from "@/game/labels";
import type { CompetitionOption } from "@/game/types";
import { useT } from "@/i18n/LocaleProvider";
import { CompetitionLogo } from "./CompetitionLogo";
import styles from "./Game.module.css";
import { CheckIcon, GridIcon, TrophyIcon } from "./Icons";

interface CompetitionPickerProps {
  competitions: CompetitionOption[];
  /** Dışarıda bırakılan turnuva kimlikleri; boş küme hepsi demektir. */
  excluded: ReadonlySet<string>;
  /** Bir turnuvanın bütün sezonları ya da tek sezon tıklandı. */
  onToggle: (ids: string[]) => void;
  onAll: () => void;
}

/**
 * Girişteki turnuva seçici: türe göre bölümler (ligler, milli takımlar, kupalar), her turnuva
 * bir kart; aynı turnuvanın sezonları kartın içinde küçük sekmelerdir. Kartın üst kısmına
 * tıklamak bütün sezonlarını, sekmeye tıklamak tek sezonu seçer (`toggleGroup` kuralı).
 */
export function CompetitionPicker({ competitions, excluded, onToggle, onAll }: CompetitionPickerProps) {
  const t = useT();
  const sections = groupCompetitions(competitions);
  const allChosen = excluded.size === 0;
  const chosen = competitions.filter((c) => !excluded.has(c.id));
  const chosenCount = chosen.reduce((sum, c) => sum + c.count, 0);

  return (
    <section className={styles.picker} aria-labelledby="modes-title">
      <div className={styles.pickerHead}>
        <h2 id="modes-title">{t("intro.competitions")}</h2>
        <div className={styles.pickerMeta}>
          <span>{t("intro.selectedSummary", { c: chosen.length, n: chosenCount })}</span>
          <button
            type="button"
            className={allChosen ? styles.allOn : styles.allBtn}
            aria-pressed={allChosen}
            onClick={onAll}
          >
            <GridIcon />
            {t("intro.all")}
          </button>
        </div>
      </div>

      {sections.map(({ kind, groups }) => (
        <div key={kind} className={styles.pickerGroup}>
          <h3>{t(`intro.kind.${kind}`)}</h3>
          <div className={styles.pickerGrid}>
            {groups.map((group) => (
              <CompetitionCard key={group.competition} group={group} excluded={excluded} onToggle={onToggle} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function CompetitionCard({
  group,
  excluded,
  onToggle,
}: {
  group: CompetitionGroup;
  excluded: ReadonlySet<string>;
  onToggle: (ids: string[]) => void;
}) {
  const t = useT();
  const onSeasons = group.seasons.filter((s) => !excluded.has(s.id));
  const on = onSeasons.length > 0;
  const partial = on && onSeasons.length < group.seasons.length;
  const single = group.seasons.length === 1;
  const subtitle = single
    ? `${group.seasons[0].season} · ${t("intro.penaltyCount", { n: group.count })}`
    : t("intro.seasonsCount", { s: group.seasons.length, n: group.count });

  return (
    <div className={on ? styles.compCardOn : styles.compCard}>
      <button
        type="button"
        className={styles.compMain}
        aria-pressed={on}
        aria-label={`${competitionLabel(t, group.competition)}, ${subtitle}`}
        onClick={() => onToggle(group.seasons.map((s) => s.id))}
      >
        <span className={styles.compEmblem}>
          {/* Turnuvanın genel logosu yoksa en yeni sezonunki. */}
          <CompetitionLogo competition={group.competition} season={group.seasons[0].season} height={32} fallback={<TrophyIcon />} />
        </span>
        <span className={styles.compText}>
          <strong>{competitionLabel(t, group.competition)}</strong>
          <small>{subtitle}</small>
        </span>
        <span className={partial ? `${styles.compCheck} ${styles.compCheckPartial}` : styles.compCheck} aria-hidden="true">
          <CheckIcon />
        </span>
      </button>
      {!single && (
        <div className={styles.seasonRow} role="group" aria-label={competitionLabel(t, group.competition)}>
          {group.seasons.map((season) => {
            const seasonOn = !excluded.has(season.id);
            return (
              <button
                key={season.id}
                type="button"
                className={seasonOn ? styles.seasonOn : styles.seasonBtn}
                aria-pressed={seasonOn}
                onClick={() => onToggle([season.id])}
              >
                {season.season} <span>{season.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
