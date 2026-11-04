"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { PublicAd } from "@/game/ads";
import type { BallStyle } from "@/game/ballStyles";
import { targetLabel, zoneLabel } from "@/game/labels";
import type { Index, PenaltyAnswer, Player, Target, Zone } from "@/game/types";
import { useT } from "@/i18n/LocaleProvider";
import styles from "../Game.module.css";
import { findMotion } from "./keeperClip";
import {
  KEEPER_CATCH_URL,
  KEEPER_DIVE_URL,
  KEEPER_IDLE_URL,
  KEEPER_MODEL_URL,
  SHOOTER_IDLE_URL,
  SHOOTER_MODEL_URL,
  SHOOTER_MOTION_URL,
} from "./modelUrls";
import { loadMotion, loadRiggedModel, MODEL_SCALE, type KitColors } from "./riggedModel";
import { createWorld, placeCamera, projectGoal, type Kits } from "./world";

const INDEXES: Index[] = [0, 1, 2];
const VERTICAL_FOV = 26;
/** Dik ekranlarda görüş açısını genişletir; kale yanlardan kesilmesin. */
function verticalFov(aspect: number): number {
  const halfTangent = Math.tan(THREE.MathUtils.degToRad(VERTICAL_FOV / 2));
  return Math.max(VERTICAL_FOV, THREE.MathUtils.radToDeg(2 * Math.atan(halfTangent / aspect)));
}

/** "Dışarı" şeridinin kale yüksekliğine oranı; üst direğin hemen üstünde durur. */
const OUT_STRIP = 0.28;
/** Yan şeritlerin genişliği üst şeridin yüksekliğine oranla (ekran yüzdeleri farklı eksende). */
const OUT_SIDE_RATIO = 0.75;

/** Model adresleri `modelUrls.ts`'te; model dosyasında hareket varsa o kullanılır. */
const KEEPER_COLORS: KitColors = { shirt: "#e0a526", shorts: "#23272e", socks: "#e0a526", joints: "#2a2d33" };
/** Kaleci penaltıcıdan biraz daha iri görünsün. */
const KEEPER_SCALE = MODEL_SCALE * 1.1;
const SHOOTER_COLORS: KitColors = { shirt: "#b3262e", shorts: "#f2f2f2", socks: "#b3262e", joints: "#f2f2f2" };

/** Sırta yazılan ad: soyadı (adın son sözcüğü) büyük harfle, gerçek formalardaki gibi. */
function shirtName(name: string): string {
  const words = name.trim().split(/\s+/);
  return (words[words.length - 1] ?? name).toLocaleUpperCase("en");
}

type GoalRect = ReturnType<typeof projectGoal>;

interface SceneProps {
  selected: Target | null;
  shot: PenaltyAnswer | null;
  revealZone: boolean;
  player: Player;
  ball: BallStyle;
  kits: Kits;
  onGoalRect: (rect: GoalRect) => void;
}

function Scene({ selected, shot, revealZone, player, ball, kits, onGoalRect }: SceneProps) {
  const [world] = useState(createWorld);
  const startedAt = useRef<number | null>(null);
  const measuredAspect = useRef(0);
  const foot = player.foot;

  useEffect(() => () => world.dispose(), [world]);

  // Turnuvaya özel top; doku stil kimliğiyle önbellekte durur, aynı turnuvada yeniden üretilmez.
  useEffect(() => world.setBall(ball), [world, ball]);
  // Takım formaları: penaltıcı takımının rengi, kaleci ondan ayrışan kit.
  useEffect(() => world.setKits(kits), [world, kits]);
  // Formanın sırtı: soyadı ve varsa forma numarası.
  useEffect(
    () => world.setShooterPrint({ name: shirtName(player.name), number: player.number }),
    [world, player.name, player.number],
  );

  // Modeller yoksa veya yüklenemezse oyun kapsül figürlerle devam eder.
  useEffect(() => {
    let active = true;
    // Bekleme hareketi yüklenemezse kaleci dalışın ilk karesinde durur;
    // yakalama yüklenemezse ortadaki top kaleciden seker.
    const motion = (url: string, name: string) =>
      loadMotion(url).catch((error) => {
        console.warn(`Kaleci ${name} hareketi yüklenemedi.`, error);
        return null;
      });
    Promise.all([
      loadRiggedModel(KEEPER_MODEL_URL, KEEPER_COLORS, KEEPER_SCALE),
      motion(KEEPER_DIVE_URL, "dalış"),
      motion(KEEPER_IDLE_URL, "bekleme"),
      motion(KEEPER_CATCH_URL, "yakalama"),
    ])
      .then(([model, diveClip, idleClip, catchClip]) => {
        // Model dosyasında dalış yoksa (yalnızca T-poz) ayrı dosyadaki dalış kullanılır.
        if (diveClip && !findMotion(model.animations)) model.animations = [diveClip];
        if (active && !world.attachKeeperModel(model, idleClip, catchClip)) {
          console.warn("Kaleci modelinde oynatılacak bir hareket bulunamadı.");
        }
      })
      .catch((error) => console.warn("Kaleci modeli yüklenemedi.", error));
    const shooterMotion = (url: string, name: string) =>
      loadMotion(url).catch((error) => {
        console.warn(`Penaltıcı ${name} hareketi yüklenemedi.`, error);
        return null;
      });
    Promise.all([
      loadRiggedModel(SHOOTER_MODEL_URL, SHOOTER_COLORS, MODEL_SCALE, true),
      shooterMotion(SHOOTER_MOTION_URL, "koşu-vuruş"),
      shooterMotion(SHOOTER_IDLE_URL, "bekleme"),
    ])
      .then(([model, kickClip, idleClip]) => {
        if (kickClip && !findMotion(model.animations)) model.animations = [kickClip];
        if (active && !world.attachShooterModel(model, idleClip)) {
          console.warn("Penaltıcı modelinde oynatılacak bir hareket bulunamadı.");
        }
      })
      .catch((error) => console.warn("Penaltıcı modeli yüklenemedi.", error));
    return () => {
      active = false;
    };
  }, [world]);

  // Reklam bandı: açık reklamlar sunucudan gelir; alınamazsa bantta oyunun adı kalır.
  useEffect(() => {
    let active = true;
    fetch("/api/ads")
      .then((r) => (r.ok ? (r.json() as Promise<PublicAd[]>) : []))
      .then((ads) => {
        if (active) world.setAds(ads);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [world]);

  useFrame((state, delta) => {
    const clock = state.clock.elapsedTime;
    if (!shot) startedAt.current = null;
    else startedAt.current ??= clock;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = startedAt.current === null ? null : reducedMotion ? 100 : clock - startedAt.current;

    world.update({ clock, t, shot, selected, revealZone, foot, delta });
    placeCamera(state.camera, t, foot);

    const aspect = state.size.width / state.size.height;
    if (!shot && aspect !== measuredAspect.current) {
      measuredAspect.current = aspect;
      const camera = state.camera as THREE.PerspectiveCamera;
      camera.fov = verticalFov(aspect);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      onGoalRect(projectGoal(camera));
    }
  });

  return <primitive object={world.group} />;
}

interface Pitch3DProps {
  selected: Target | null;
  shot: PenaltyAnswer | null;
  revealZone: boolean;
  disabled: boolean;
  /** Penaltıcı: ayak (koşu yönü ve aynalama), ad ve numara (forma sırtı). */
  player: Player;
  ball: BallStyle;
  kits: Kits;
  onSelect: (target: Target) => void;
}

export function Pitch3D({ selected, shot, revealZone, disabled, player, ball, kits, onSelect }: Pitch3DProps) {
  const [goalRect, setGoalRect] = useState<GoalRect | null>(null);
  const t = useT();

  // "Dışarı" üç şerittir (üst, sol, sağ) ve hepsi aynı hedefi seçer; kale ağzına göre yerleşir.
  const outStrips = goalRect
    ? [
        {
          key: "top",
          className: styles.outZone,
          style: {
            left: goalRect.left,
            width: goalRect.width,
            top: `calc(${goalRect.top} - ${goalRect.height} * ${OUT_STRIP})`,
            height: `calc(${goalRect.height} * ${OUT_STRIP})`,
          },
        },
        {
          key: "left",
          className: `${styles.outZone} ${styles.outSide} ${styles.outLeft}`,
          style: {
            left: `calc(${goalRect.left} - ${goalRect.height} * ${OUT_STRIP} * ${OUT_SIDE_RATIO})`,
            width: `calc(${goalRect.height} * ${OUT_STRIP} * ${OUT_SIDE_RATIO})`,
            top: `calc(${goalRect.top} - ${goalRect.height} * ${OUT_STRIP})`,
            height: `calc(${goalRect.height} * ${1 + OUT_STRIP})`,
          },
        },
        {
          key: "right",
          className: `${styles.outZone} ${styles.outSide}`,
          style: {
            left: `calc(${goalRect.left} + ${goalRect.width})`,
            width: `calc(${goalRect.height} * ${OUT_STRIP} * ${OUT_SIDE_RATIO})`,
            top: `calc(${goalRect.top} - ${goalRect.height} * ${OUT_STRIP})`,
            height: `calc(${goalRect.height} * ${1 + OUT_STRIP})`,
          },
        },
      ]
    : [];

  return (
    <div className={styles.pitch3d}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: VERTICAL_FOV, near: 0.1, far: 150 }}
        aria-hidden="true"
      >
        <color attach="background" args={["#0b1622"]} />
        <fog attach="fog" args={["#0b1622", 45, 110]} />
        <Scene
          selected={selected}
          shot={shot}
          revealZone={revealZone}
          player={player}
          ball={ball}
          kits={kits}
          onGoalRect={setGoalRect}
        />
      </Canvas>

      {/* Kamera vuruşta hareket ettiği için bölge butonları yalnızca tahmin sırasında durur. */}
      {goalRect && !shot && (
        <>
          {outStrips.map((strip) => (
            <button
              key={strip.key}
              type="button"
              className={selected === "out" ? `${strip.className} ${styles.zoneSelected}` : strip.className}
              style={strip.style}
              disabled={disabled}
              aria-pressed={selected === "out"}
              aria-label={targetLabel(t, "out")}
              onClick={() => onSelect("out")}
            >
              {t("zone.out")}
            </button>
          ))}
          <div className={styles.zones} style={goalRect}>
            {INDEXES.flatMap((row) =>
              INDEXES.map((col) => {
                const zone: Zone = { col, row };
                const isSelected = selected !== "out" && selected?.col === col && selected?.row === row;
                return (
                  <button
                    key={`${col}-${row}`}
                    type="button"
                    className={styles.zone}
                    disabled={disabled}
                    aria-pressed={isSelected}
                    aria-label={zoneLabel(t, zone)}
                    onClick={() => onSelect(zone)}
                  />
                );
              }),
            )}
          </div>
        </>
      )}
    </div>
  );
}
