"use client";

import { useEffect, useState } from "react";
import { POINTS, SPEED_BONUS_PER_SECOND, HINT_FACTOR } from "@/game/scoring";
import { ROUND_TIME_MS, ROUNDS_PER_GAME } from "@/game/session";
import { useT } from "@/i18n/LocaleProvider";
import styles from "./Game.module.css";
import { CompetitionLogo } from "./CompetitionLogo";
import { BoltIcon, BulbIcon, CheckIcon, CurveIcon, FeatherIcon, FlameIcon, LockIcon, PlayIcon, TargetIcon, TrophyIcon } from "./Icons";

const SEEN_KEY = "penalti-tahmin:ogretici";
const STEP_KEYS = [
  ["tutorial.1.title", "tutorial.1.text"],
  ["tutorial.2.title", "tutorial.2.text"],
  ["tutorial.3.title", "tutorial.3.text"],
  ["tutorial.4.title", "tutorial.4.text"],
  ["tutorial.5.title", "tutorial.5.text"],
] as const;
const STEPS = STEP_KEYS.length;

/** Öğretici daha önce kapatıldı mı; depolama kapalıysa görülmüş sayılır (her açılışta çıkmasın). */
export function tutorialSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTutorialSeen(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // depolama kapalıysa sessizce geç
  }
}

interface TutorialProps {
  onClose: () => void;
}

/**
 * İlk açılışta kendiliğinden çıkan, "Nasıl oynanır?" ile yeniden açılan beş adımlı öğretici:
 * turnuva seçimi, penaltıyı okuma, bölge ve vuruş seçimi, kilitleme ve süre, puanlama. Çizimler oyundaki
 * gerçek arayüz parçalarının küçük kopyalarıdır; sayılar puanlama sabitlerinden gelir.
 */
export function Tutorial({ onClose }: TutorialProps) {
  const t = useT();
  const [step, setStep] = useState(0);
  const last = step === STEPS - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && !last) setStep((s) => s + 1);
      if (e.key === "ArrowLeft" && step > 0) setStep((s) => s - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, step, onClose]);

  const illustrations = [
    <CompetitionsStep key="comp" />,
    <ReadStep key="read" />,
    <PickStep key="pick" />,
    <LockStep key="lock" />,
    <ScoreStep key="score" />,
  ];
  const params = {
    zone: POINTS.exactZone,
    side: POINTS.correctSide,
    shot: POINTS.shotType,
    streak: POINTS.streakStep,
    rounds: ROUNDS_PER_GAME,
    seconds: ROUND_TIME_MS / 1000,
    speed: Math.round(SPEED_BONUS_PER_SECOND * 100),
    hint: Math.round((1 - HINT_FACTOR) * 100),
  };

  return (
    <div className={styles.tutorialOverlay} role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className={styles.tutorialCard}>
        <div className={styles.tutorialTop}>
          <ol className={styles.tutorialDots} aria-label={t("tutorial.stepOf", { n: step + 1, total: STEPS })}>
            {Array.from({ length: STEPS }, (_, i) => (
              <li key={i} className={i === step ? styles.dotOn : i < step ? styles.dotDone : undefined} aria-current={i === step ? "step" : undefined} />
            ))}
          </ol>
          <button type="button" className={styles.linkBtn} onClick={onClose}>
            {t("tutorial.skip")}
          </button>
        </div>

        <div className={styles.tutorialArt}>{illustrations[step]}</div>

        <h2 id="tutorial-title">{t(STEP_KEYS[step][0])}</h2>
        <p>{t(STEP_KEYS[step][1], params)}</p>

        <div className={styles.tutorialNav}>
          <button type="button" className={styles.secondary} disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            {t("tutorial.back")}
          </button>
          {last ? (
            <button type="button" className={styles.start} onClick={onClose} autoFocus>
              <PlayIcon />
              {t("tutorial.start")}
            </button>
          ) : (
            <button type="button" className={`${styles.primary} ${styles.tutorialNext}`} onClick={() => setStep((s) => s + 1)} autoFocus>
              {t("tutorial.next")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** 1. adım: girişteki turnuva şeridi ve iki turnuva kartı (biri seçili, biri değil). */
function CompetitionsStep() {
  const t = useT();
  const cards: { name: string; season: string; count: number; on: boolean }[] = [
    { name: "Süper Lig", season: "2025/26", count: 90, on: true },
    { name: "Bundesliga", season: "2025/26", count: 109, on: false },
  ];
  return (
    <div className={styles.artComp}>
      <div className={styles.artCompBar}>
        <span className={styles.logoStack} aria-hidden="true">
          {["Süper Lig", "Bundesliga", "Premier League"].map((name) => (
            <span key={name}>
              <CompetitionLogo competition={name} height={16} fallback={<TrophyIcon />} />
            </span>
          ))}
          <span className={styles.logoMore}>+9</span>
        </span>
        <span className={styles.compBarText}>
          <strong>{t("intro.allCompetitions")}</strong>
          <small>{t("intro.penaltyCount", { n: 1273 })}</small>
        </span>
        <span className={styles.compBarAction}>{t("intro.changeCompetitions")}</span>
      </div>
      <div className={styles.artCompCards}>
        {cards.map((c) => (
          <span key={c.name} className={c.on ? styles.compCardOn : styles.compCard}>
            <span className={styles.compMain}>
              <span className={styles.compEmblem}>
                <CompetitionLogo competition={c.name} season={c.season} height={26} fallback={<TrophyIcon />} />
              </span>
              <span className={styles.compText}>
                <strong>{c.name}</strong>
                <small>{c.season} · {t("intro.penaltyCount", { n: c.count })}</small>
              </span>
              <span className={styles.compCheck} aria-hidden="true"><CheckIcon /></span>
            </span>
          </span>
        ))}
        <span className={styles.artHand} aria-hidden="true"><TargetIcon /></span>
      </div>
    </div>
  );
}

/** 2. adım: oyuncu kartı ve skorboardın küçük kopyası. */
function ReadStep() {
  const t = useT();
  return (
    <div className={styles.artRead}>
      <div className={styles.artPlayer}>
        <span className={styles.artAvatar}>HK</span>
        <div>
          <strong>Harry Kane</strong>
          <small>Bayern München · {t("round.rightFoot")}</small>
        </div>
        <div className={styles.artHistory}>
          <span>{t("round.history", { n: 6 })}</span>
          <div>
            <b>1</b>
            <b>1</b>
            <b className={styles.artHot}>4</b>
          </div>
          <div className={styles.artHistoryLabels}>
            <i>{t("round.left")}</i>
            <i>{t("round.center")}</i>
            <i>{t("round.right")}</i>
          </div>
        </div>
      </div>
      <div className={styles.artScoreboard}>
        <span>BAY</span>
        <b>1 : 1</b>
        <span>BVB</span>
        <em>88&apos;</em>
      </div>
    </div>
  );
}

/** 3. adım: kale ızgarası, Dışarı şeridi ve vuruş tipi çipleri. */
function PickStep() {
  const t = useT();
  return (
    <div className={styles.artPick}>
      <div className={styles.artGoalWrap}>
        <span className={styles.artOut}>{t("zone.out")}</span>
        <div className={styles.artGoal}>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className={i === 8 ? styles.artZoneOn : styles.artZone} />
          ))}
        </div>
        <span className={styles.artHand} aria-hidden="true">
          <TargetIcon />
        </span>
      </div>
      <div className={styles.artShots}>
        <span className={styles.artShotOn}><CurveIcon /> {t("shot.placed")}</span>
        <span><BoltIcon /> {t("shot.power")}</span>
        <span><FeatherIcon /> {t("shot.panenka")}</span>
      </div>
    </div>
  );
}

/** 4. adım: süre çubuğu, kilit ve ipucu düğmeleri. */
function LockStep() {
  const t = useT();
  return (
    <div className={styles.artLock}>
      <div className={styles.artTimer}>
        <span>{t("round.time")}</span>
        <div className={styles.artTimerTrack}><i /></div>
        <b>18</b>
      </div>
      <div className={styles.artButtons}>
        <span className={styles.artHint}><BulbIcon /> {t("round.hint")}</span>
        <span className={styles.artLockBtn}><LockIcon /> {t("round.lock")}</span>
      </div>
    </div>
  );
}

/** 5. adım: puan kutuları. */
function ScoreStep() {
  const t = useT();
  return (
    <ul className={styles.artScore}>
      <li><b>{POINTS.exactZone}</b><span>{t("intro.ruleZone")}</span></li>
      <li><b>{POINTS.correctSide}</b><span>{t("intro.ruleSide")}</span></li>
      <li><b>{POINTS.shotType}</b><span>{t("intro.ruleShot")}</span></li>
      <li><b><FlameIcon /> +{POINTS.streakStep}</b><span>{t("tutorial.streakLabel")}</span></li>
    </ul>
  );
}
