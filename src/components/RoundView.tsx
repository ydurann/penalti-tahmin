"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { ballStyleFor } from "@/game/ballStyles";
import { keeperKitAgainst, kitFor } from "@/game/kits";
import { answerLabel, competitionLabel, hintText, outcomeLabel, shotLabel, targetLabel } from "@/game/labels";
import { HINT_FACTOR, POINTS } from "@/game/scoring";
import { teamInitials } from "@/game/teams";
import {
  SHOT_TYPES,
  type Hint,
  type Outcome,
  type PublicRound,
  type RoundResult,
  type ShotType,
  type Target,
} from "@/game/types";
import { useT } from "@/i18n/LocaleProvider";
import type { Translate } from "@/i18n";
import { CompetitionLogo } from "./CompetitionLogo";
import { Field } from "./Field";
import styles from "./Game.module.css";
import { BoltIcon, BulbIcon, CurveIcon, ExitIcon, FeatherIcon, LockIcon, PauseIcon, PlayIcon } from "./Icons";
import { TeamBadge } from "./TeamBadge";

const HINT_PERCENT = Math.round((1 - HINT_FACTOR) * 100);

const OUTCOME_CLASS: Record<Outcome, string> = {
  goal: styles.outcomeGoal,
  saved: styles.outcomeSaved,
  missed: styles.outcomeMissed,
};

/** "paused": tahmin süresi durdu (yalnızca tek kişilik oyun). */
export type RoundStatus = "guessing" | "paused" | "shooting" | "revealed";

const SHOT_ICONS: Record<ShotType, ComponentType> = {
  placed: CurveIcon,
  power: BoltIcon,
  panenka: FeatherIcon,
};

const momentText = (t: Translate, round: PublicRound) =>
  round.situation === "shootout" ? t("round.shootout") : t("round.minute", { n: round.minute ?? "?" });

function situationText(t: Translate, round: PublicRound): string {
  return `${momentText(t, round)}, ${t("round.scoreIs", { score: round.score })}`;
}

/**
 * Yayın tarzı skorboard: bayrak/logo, üç harfli takım kodu, skor ve dakika rozeti. Skor
 * atışı kullanan takımın gözündendir; seri penaltılarda dakika yerine "PEN" görünür.
 */
function Scoreboard({ t, round }: { t: Translate; round: PublicRound }) {
  if (!round.match) return null;
  const [home, away] = round.score.split("-");
  const shootout = round.situation === "shootout";
  return (
    <div
      className={styles.scoreboard}
      aria-label={`${round.player.team} ${home}, ${round.match.opponent} ${away}, ${momentText(t, round)}`}
    >
      <span className={styles.sbTeam}>
        <TeamBadge name={round.player.team} size={26} />
        <b>{teamInitials(round.player.team)}</b>
      </span>
      <span className={styles.sbScore}>
        <span>{home}</span>
        <span className={styles.sbDash}>:</span>
        <span>{away}</span>
      </span>
      <span className={`${styles.sbTeam} ${styles.sbAway}`}>
        <b>{teamInitials(round.match.opponent)}</b>
        <TeamBadge name={round.match.opponent} size={26} />
      </span>
      <span className={shootout ? `${styles.sbMinute} ${styles.sbPen}` : styles.sbMinute}>
        {shootout ? t("round.pen") : `${round.minute}'`}
      </span>
    </div>
  );
}

function matchText(t: Translate, round: PublicRound): string | null {
  if (!round.match) return null;
  return `${competitionLabel(t, round.match.competition, round.match.season)} · ${t("round.against", {
    opponent: round.match.opponent,
  })}`;
}

function historyTitle(t: Translate, history: PublicRound["history"]): string {
  const count = history.left + history.center + history.right;
  return count === 0 ? t("round.noHistory") : t("round.history", { n: count });
}

export interface RoundViewProps {
  round: PublicRound;
  status: RoundStatus;
  remainingMs: number;
  score: number;
  streak: number;
  target: Target | null;
  shot: ShotType | null;
  /** Tahmin kilitlendi, diğerleri bekleniyor (çok oyunculu). */
  locked?: boolean;
  result: RoundResult | null;
  onTarget: (target: Target) => void;
  onShot: (shot: ShotType) => void;
  onLock: () => void;
  /** Bu turda alınan ipucu; alınmadıysa null. */
  clue: Hint | null;
  onClue: () => void;
  /** Açıklama evresinde sonucun yanındaki düğme ya da metin. */
  revealAction: ReactNode;
  /** Oyuncu kartının altında ek içerik, örn. odadaki oyuncular. */
  aside?: ReactNode;
  hint: string | null;
  error?: ReactNode;
  /** Verilirse sağ üstte duraklat düğmesi çıkar (tahmin sırasında). */
  onPause?: () => void;
  /** Duraklatılmış oyunu sürdürür. */
  onResume?: () => void;
  /** Verilirse çıkış düğmesi çıkar; onaydan sonra çağrılır. */
  onQuit?: () => void;
  /** Çıkış onayındaki açıklama (sıralamaya sayılır mı vb.). */
  quitNote?: string;
}

/** Bir turun ekranı: skor çubuğu, oyuncu kartı, saha, kontroller ve sonuç. Durumu dışarıdan alır. */
export function RoundView({
  round,
  status,
  remainingMs,
  score,
  streak,
  target,
  shot,
  locked = false,
  result,
  onTarget,
  onShot,
  onLock,
  clue,
  onClue,
  revealAction,
  aside,
  hint,
  error,
  onPause,
  onResume,
  onQuit,
  quitNote,
}: RoundViewProps) {
  const t = useT();
  const [confirmQuit, setConfirmQuit] = useState(false);
  const guessing = status === "guessing" && !locked;
  // Sayaç tahmin sırasında işler, duraklatınca kaldığı değerde durur.
  const clockShown = status === "guessing" || status === "paused";
  const { left, center, right } = round.history;
  const answer = status === "shooting" || status === "revealed" ? result?.answer ?? null : null;
  const foot = t(round.player.foot === "left" ? "round.leftFoot" : "round.rightFoot");
  // Forma renkleri takıma göre; aynı tur içinde değişmesin diye bir kez hesaplanır.
  const kits = useMemo(() => {
    const shooter = kitFor(round.player.team);
    return { shooter, keeper: keeperKitAgainst(shooter) };
  }, [round.player.team]);

  return (
    <main className={styles.game}>
      <header className={styles.hud}>
        <div><span>{t("round.round")}</span><strong>{round.number}/{round.totalRounds}</strong></div>
        <div><span>{t("round.score")}</span><strong>{score}</strong></div>
        <div><span>{t("round.streak")}</span><strong>{streak}</strong></div>
        <div>
          <span>{t("round.time")}</span>
          <strong className={status === "guessing" && remainingMs < 5000 ? styles.urgent : undefined}>
            {clockShown ? Math.ceil(remainingMs / 1000) : "–"}
          </strong>
        </div>
      </header>
      <div className={styles.timeTrack}>
        <div
          className={styles.timeFill}
          style={{ transform: `scaleX(${clockShown ? remainingMs / round.timeLimitMs : 0})` }}
        />
      </div>

      <section className={styles.player}>
        <div className={styles.playerInfo}>
          <div className={styles.playerHead}>
            <TeamBadge name={round.player.team} size={44} />
            <div>
              <h2>{round.player.name}</h2>
              <p>{round.player.team}, {foot}</p>
            </div>
          </div>
          <p className={styles.matchLine}>
            {round.match && <CompetitionLogo competition={round.match.competition} season={round.match.season} height={24} />}
            <span>{matchText(t, round) ?? situationText(t, round)}</span>
          </p>
          {aside}
        </div>
        <div className={styles.historyBox}>
          <span>{historyTitle(t, round.history)}</span>
          <div className={styles.historyBars}>
            {[[t("round.left"), left], [t("round.center"), center], [t("round.right"), right]].map(([label, value]) => (
              <div key={label}><strong>{value}</strong><span>{label}</span></div>
            ))}
          </div>
        </div>
      </section>

      <div className={status === "paused" ? `${styles.fieldWrap} ${styles.fieldPaused}` : styles.fieldWrap}>
        <Field
          player={round.player}
          ball={ballStyleFor(round.match)}
          kits={kits}
          selected={target}
          shot={answer}
          revealZone={status === "revealed"}
          disabled={!guessing}
          onSelect={onTarget}
        />
        {/* Skorboard: sahanın sol üst köşesinde, yayın grafiği gibi. */}
        {round.match && (
          <div className={styles.scoreCard}>
            <Scoreboard t={t} round={round} />
          </div>
        )}
        {/* Duraklat ve çık: sahanın üst ortasında cam hap; açıklama evresinde de erişilebilir. */}
        {(onPause || onQuit) && status !== "paused" && (
          <div className={styles.fieldActions}>
            {onPause && (
              <button
                type="button"
                className={styles.fieldBtn}
                disabled={!guessing}
                onClick={onPause}
                aria-label={t("round.pause")}
                title={t("round.pause")}
              >
                <PauseIcon />
              </button>
            )}
            {onQuit && (
              <button
                type="button"
                className={styles.fieldBtn}
                onClick={() => setConfirmQuit(true)}
                aria-label={t("round.quit")}
                title={t("round.quit")}
              >
                <ExitIcon />
              </button>
            )}
          </div>
        )}
        {status === "guessing" && (
          <>
            {/* İpucu: sahanın sağ üst köşesinde; alınınca aynı yerde metne dönüşür. */}
            <div className={styles.hintCard}>
              {clue ? (
                <p className={styles.clue} role="status">
                  <BulbIcon /> {hintText(t, clue)} <span>{t("round.hintApplied", { p: HINT_PERCENT })}</span>
                </p>
              ) : (
                <button className={styles.clueBtn} disabled={!guessing} onClick={onClue}>
                  <BulbIcon />
                  {t("round.hint")} <span>{t("round.hintCost", { p: HINT_PERCENT })}</span>
                </button>
              )}
            </div>

            {/* Kontroller: sahanın altında cam şerit. */}
            <div className={styles.controlBar}>
              <div className={styles.shots} role="group" aria-label={t("round.shotType")}>
                {SHOT_TYPES.map((type) => {
                  const ShotIcon = SHOT_ICONS[type];
                  return (
                    <button
                      key={type}
                      className={shot === type ? styles.shotOn : styles.shotBtn}
                      aria-pressed={shot === type}
                      disabled={!guessing}
                      onClick={() => onShot(type)}
                    >
                      <ShotIcon />
                      {shotLabel(t, type)}
                    </button>
                  );
                })}
              </div>
              <button className={`${styles.primary} ${styles.lockBtn}`} disabled={!guessing} onClick={onLock}>
                <LockIcon />
                {locked ? t("round.locked") : t("round.lock")}
              </button>
            </div>
          </>
        )}

        {status === "revealed" && result && (
        <section className={styles.summaryOverlay} aria-live="polite">
          <div className={styles.summaryCard}>
            <div className={styles.summaryHead}>
              <span className={`${styles.outcome} ${OUTCOME_CLASS[result.answer.outcome]}`}>
                {outcomeLabel(t, result.answer.outcome)}
              </span>
              <em>+{result.points.total}</em>
            </div>

            <div className={styles.summaryPlayer}>
              <TeamBadge name={round.player.team} size={52} />
              <div>
                <h3>{round.player.name}</h3>
                <p>{round.player.team} · {foot}</p>
              </div>
            </div>

            <div className={styles.summaryTiles}>
              <div>
                <span>{t("summary.actual")}</span>
                <strong>{answerLabel(t, result.answer)}</strong>
                <small>{shotLabel(t, result.answer.shot)}</small>
              </div>
              <div className={result.points.zone >= POINTS.exactZone * HINT_FACTOR ? styles.tileHit : undefined}>
                <span>{t("summary.yours")}</span>
                <strong>{result.guess ? targetLabel(t, result.guess.target) : t("summary.timedOut")}</strong>
                <small>{result.guess ? shotLabel(t, result.guess.shot) : t("summary.notCounted")}</small>
              </div>
              <div className={styles.tileTotal}>
                <span>{t("summary.total")}</span>
                <strong>{result.totalScore}</strong>
                <small>{result.streak > 1 ? t("summary.streakCount", { n: result.streak }) : t("common.points")}</small>
              </div>
            </div>

            {!result.timedOut && (
              <ul className={styles.pointChips} aria-label={t("summary.breakdown")}>
                <li className={result.points.zone > 0 ? styles.chipPlus : undefined}>
                  {t("summary.zone", { n: result.points.zone })}
                </li>
                <li className={result.points.shot > 0 ? styles.chipPlus : undefined}>
                  {t("summary.shot", { n: result.points.shot })}
                </li>
                {result.points.streak > 0 && (
                  <li className={styles.chipPlus}>{t("summary.streak", { n: result.points.streak })}</li>
                )}
                {result.points.speed > 0 && (
                  <li className={styles.chipPlus}>
                    {t("summary.speed", { n: result.points.speed, s: result.points.secondsEarly })}
                  </li>
                )}
                {result.points.hintUsed && (
                  <li className={styles.chipMinus}>{t("summary.hint", { p: HINT_PERCENT })}</li>
                )}
              </ul>
            )}

            {revealAction}
          </div>
        </section>
        )}

        {status === "paused" && (
          <section className={styles.modalOverlay} role="dialog" aria-labelledby="paused-title">
            <div className={styles.modalCard}>
              <PauseIcon />
              <h3 id="paused-title">{t("round.paused")}</h3>
              <p>{t("round.pausedNote")}</p>
              <div className={styles.modalActions}>
                <button className={styles.primary} onClick={onResume} autoFocus>
                  <PlayIcon />
                  {t("round.resume")}
                </button>
                {onQuit && (
                  <button className={styles.secondary} onClick={() => setConfirmQuit(true)}>
                    <ExitIcon />
                    {t("round.quit")}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {confirmQuit && onQuit && (
          <section className={styles.modalOverlay} role="dialog" aria-labelledby="quit-title">
            <div className={styles.modalCard}>
              <ExitIcon />
              <h3 id="quit-title">{t("round.quitTitle")}</h3>
              {quitNote && <p>{quitNote}</p>}
              <div className={styles.modalActions}>
                <button className={styles.secondary} onClick={() => setConfirmQuit(false)} autoFocus>
                  {t("round.quitCancel")}
                </button>
                <button className={`${styles.primary} ${styles.dangerBtn}`} onClick={onQuit}>
                  <ExitIcon />
                  {t("round.quit")}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {hint && <p className={styles.error} role="alert">{hint}</p>}
      {error}
    </main>
  );
}
