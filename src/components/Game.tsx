"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SHOT_LABELS, zoneLabel } from "@/game/labels";
import {
  SHOT_TYPES,
  type NewGameResponse,
  type PublicRound,
  type RoundResult,
  type ShotType,
  type Zone,
} from "@/game/types";
import { Field } from "./Field";
import styles from "./Game.module.css";
import { shotDurationMs } from "./pitch3d/animation";

type Status = "idle" | "loading" | "guessing" | "shooting" | "revealed" | "finished";

async function post<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Sunucuya ulaşılamadı.");
  }
  return response.json() as Promise<T>;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function situationText(round: PublicRound): string {
  const moment = round.situation === "shootout" ? "Seri penaltılar" : `${round.minute}. dakika`;
  return `${moment}, skor ${round.score}`;
}

export function Game() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [round, setRound] = useState<PublicRound | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [shot, setShot] = useState<ShotType | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [remainingMs, setRemainingMs] = useState(0);

  // Süre dolduğunda en güncel seçimi okuyabilmek için.
  const selection = useRef<{ zone: Zone | null; shot: ShotType | null }>({ zone: null, shot: null });
  const locking = useRef(false);

  const beginRound = useCallback((next: PublicRound) => {
    selection.current = { zone: null, shot: null };
    locking.current = false;
    setRound(next);
    setZone(null);
    setShot(null);
    setHint(null);
    setResult(null);
    setRemainingMs(next.timeLimitMs);
    setStatus("guessing");
  }, []);

  const startGame = useCallback(async () => {
    setStatus("loading");
    setError(null);
    setHistory([]);
    try {
      const game = await post<NewGameResponse>("/api/games");
      setGameId(game.gameId);
      beginRound(game.round);
    } catch (e) {
      setStatus("idle");
      setError((e as Error).message);
    }
  }, [beginRound]);

  const lock = useCallback(
    async (timedOut: boolean) => {
      if (locking.current) return;
      const { zone: z, shot: s } = selection.current;
      const guess = z && s ? { zone: z, shot: s } : null;
      if (!guess && !timedOut) {
        setHint(!z ? "Önce kalede bir bölge seç." : "Önce vuruş tipini seç.");
        return;
      }
      locking.current = true;
      setHint(null);
      setError(null);
      try {
        const res = await post<RoundResult>(`/api/games/${gameId}/guess`, { guess });
        setResult(res);
        setHistory((items) => [...items, res]);
        setStatus("shooting");
        await wait(shotDurationMs(res.answer));
        setStatus("revealed");
      } catch (e) {
        locking.current = false;
        setError((e as Error).message);
      }
    },
    [gameId],
  );

  const advance = useCallback(async () => {
    if (result?.finished) {
      setStatus("finished");
      return;
    }
    setError(null);
    try {
      beginRound(await post<PublicRound>(`/api/games/${gameId}/next`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [beginRound, gameId, result]);

  useEffect(() => {
    if (status !== "guessing" || !round) return;
    const deadline = Date.now() + round.timeLimitMs;
    const timer = setInterval(() => {
      const left = deadline - Date.now();
      setRemainingMs(Math.max(left, 0));
      if (left <= 0) {
        clearInterval(timer);
        void lock(true);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [status, round, lock]);

  if (status === "idle" || status === "loading") {
    return (
      <main className={styles.intro}>
        <h1>Penaltı Tahmin</h1>
        <p>
          Oyuncunun geçmişine ve maçın anına bak, penaltının kalenin neresine ve nasıl
          atılacağını tahmin et. Her oyunda 10 penaltı, her penaltı için 15 saniye var.
        </p>
        <ul className={styles.rules}>
          <li><strong>100</strong> tam bölge</li>
          <li><strong>40</strong> doğru yön</li>
          <li><strong>50</strong> doğru vuruş tipi</li>
          <li><strong>+25</strong> ve artan seri bonusu</li>
        </ul>
        <button className={styles.primary} onClick={startGame} disabled={status === "loading"}>
          {status === "loading" ? "Hazırlanıyor…" : "Oyuna başla"}
        </button>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.note}>Örnek veri: oyuncular ve penaltılar kurgusaldır.</p>
      </main>
    );
  }

  if (status === "finished") {
    const exact = history.filter((r) => r.points.zone === 100).length;
    const shots = history.filter((r) => r.points.shot > 0).length;
    const best = Math.max(0, ...history.map((r) => r.streak));
    return (
      <main className={styles.intro}>
        <h1>Oyun bitti</h1>
        <p className={styles.finalScore}>{result?.totalScore ?? 0}<span> puan</span></p>
        <ul className={styles.rules}>
          <li><strong>{exact}/{history.length}</strong> tam bölge</li>
          <li><strong>{shots}/{history.length}</strong> doğru vuruş tipi</li>
          <li><strong>{best}</strong> en uzun seri</li>
        </ul>
        <button className={styles.primary} onClick={startGame}>Yeniden oyna</button>
      </main>
    );
  }

  if (!round) return null;

  const guessing = status === "guessing";
  const { left, center, right } = round.history;
  const answer = status === "shooting" || status === "revealed" ? result?.answer ?? null : null;

  return (
    <main className={styles.game}>
      <header className={styles.hud}>
        <div><span>Tur</span><strong>{round.number}/{round.totalRounds}</strong></div>
        <div><span>Puan</span><strong>{status === "revealed" ? result?.totalScore : history.at(status === "shooting" ? -2 : -1)?.totalScore ?? 0}</strong></div>
        <div><span>Seri</span><strong>{status === "revealed" ? result?.streak : history.at(status === "shooting" ? -2 : -1)?.streak ?? 0}</strong></div>
        <div>
          <span>Süre</span>
          <strong className={guessing && remainingMs < 5000 ? styles.urgent : undefined}>
            {guessing ? Math.ceil(remainingMs / 1000) : "–"}
          </strong>
        </div>
      </header>
      <div className={styles.timeTrack}>
        <div
          className={styles.timeFill}
          style={{ transform: `scaleX(${guessing ? remainingMs / round.timeLimitMs : 0})` }}
        />
      </div>

      <section className={styles.player}>
        <div>
          <h2>{round.player.name}</h2>
          <p>{round.player.team}, {round.player.foot === "left" ? "sol" : "sağ"} ayak</p>
          <p>{situationText(round)}</p>
        </div>
        <div className={styles.historyBox}>
          <span>Son 10 penaltı</span>
          <div className={styles.historyBars}>
            {[["Sol", left], ["Orta", center], ["Sağ", right]].map(([label, value]) => (
              <div key={label}><strong>{value}</strong><span>{label}</span></div>
            ))}
          </div>
        </div>
      </section>

      <Field
        foot={round.player.foot}
        selected={zone}
        shot={answer}
        revealZone={status === "revealed"}
        disabled={!guessing}
        onSelect={(z) => {
          selection.current.zone = z;
          setZone(z);
          setHint(null);
        }}
      />

      {status === "revealed" && result ? (
        <section className={styles.result} aria-live="polite">
          <div>
            <h3>
              {result.answer.outcome === "goal" ? "Gol" : "Kaleci kurtardı"}
              <em>+{result.points.total}</em>
            </h3>
            <p>
              Gerçek vuruş: {zoneLabel(result.answer.zone)}, {SHOT_LABELS[result.answer.shot].toLocaleLowerCase("tr")}.
              {result.timedOut && " Süre doldu, tahmin sayılmadı."}
            </p>
            {!result.timedOut && (
              <p className={styles.breakdown}>
                Bölge +{result.points.zone} · Vuruş +{result.points.shot}
                {result.points.streak > 0 && ` · Seri +${result.points.streak}`}
              </p>
            )}
          </div>
          <button className={styles.primary} onClick={advance}>
            {result.finished ? "Sonuçları gör" : "Sıradaki penaltı"}
          </button>
        </section>
      ) : (
        <section className={styles.controls}>
          <div className={styles.shots} role="group" aria-label="Vuruş tipi">
            {SHOT_TYPES.map((type) => (
              <button
                key={type}
                className={shot === type ? styles.shotOn : styles.shotBtn}
                aria-pressed={shot === type}
                disabled={!guessing}
                onClick={() => {
                  selection.current.shot = type;
                  setShot(type);
                  setHint(null);
                }}
              >
                {SHOT_LABELS[type]}
              </button>
            ))}
          </div>
          <button className={styles.primary} disabled={!guessing} onClick={() => void lock(false)}>
            Tahmini kilitle
          </button>
        </section>
      )}

      {hint && <p className={styles.error} role="alert">{hint}</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error} <button className={styles.linkBtn} onClick={startGame}>Yeni oyun başlat</button>
        </p>
      )}
    </main>
  );
}
