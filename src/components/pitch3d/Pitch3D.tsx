"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { zoneLabel } from "@/game/labels";
import type { Index, PenaltyAnswer, Player, Zone } from "@/game/types";
import styles from "../Game.module.css";
import { loadMotion, loadRiggedModel } from "./riggedModel";
import { createWorld, placeCamera, projectGoal } from "./world";

const INDEXES: Index[] = [0, 1, 2];
const VERTICAL_FOV = 22;
/** Dik ekranlarda görüş açısını genişletir; kale yanlardan kesilmesin. */
function verticalFov(aspect: number): number {
  const halfTangent = Math.tan(THREE.MathUtils.degToRad(VERTICAL_FOV / 2));
  return Math.max(VERTICAL_FOV, THREE.MathUtils.radToDeg(2 * Math.atan(halfTangent / aspect)));
}

const KEEPER_MODEL_URL = "/models/kaleci.fbx";
const KEEPER_IDLE_URL = "/models/kaleci-orta.fbx";
const KEEPER_CATCH_URL = "/models/kaleci-orta-yakalama.fbx";
const KEEPER_COLORS = { surface: "#e0a526", joints: "#2a2d33" };
const SHOOTER_MODEL_URL = "/models/penaltici.fbx";
const SHOOTER_COLORS = { surface: "#b3262e", joints: "#f2f2f2" };

type GoalRect = ReturnType<typeof projectGoal>;

interface SceneProps {
  selected: Zone | null;
  shot: PenaltyAnswer | null;
  revealZone: boolean;
  foot: Player["foot"];
  onGoalRect: (rect: GoalRect) => void;
}

function Scene({ selected, shot, revealZone, foot, onGoalRect }: SceneProps) {
  const [world] = useState(createWorld);
  const startedAt = useRef<number | null>(null);
  const measuredAspect = useRef(0);

  useEffect(() => () => world.dispose(), [world]);

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
      loadRiggedModel(KEEPER_MODEL_URL, KEEPER_COLORS),
      motion(KEEPER_IDLE_URL, "bekleme"),
      motion(KEEPER_CATCH_URL, "yakalama"),
    ])
      .then(([model, idleClip, catchClip]) => {
        if (active && !world.attachKeeperModel(model, idleClip, catchClip)) {
          console.warn("Kaleci modelinde oynatılacak bir hareket bulunamadı.");
        }
      })
      .catch((error) => console.warn("Kaleci modeli yüklenemedi.", error));
    loadRiggedModel(SHOOTER_MODEL_URL, SHOOTER_COLORS)
      .then((model) => {
        if (active && !world.attachShooterModel(model)) {
          console.warn("Penaltıcı modelinde oynatılacak bir hareket bulunamadı.");
        }
      })
      .catch((error) => console.warn("Penaltıcı modeli yüklenemedi.", error));
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
  selected: Zone | null;
  shot: PenaltyAnswer | null;
  revealZone: boolean;
  disabled: boolean;
  foot: Player["foot"];
  onSelect: (zone: Zone) => void;
}

export function Pitch3D({ selected, shot, revealZone, disabled, foot, onSelect }: Pitch3DProps) {
  const [goalRect, setGoalRect] = useState<GoalRect | null>(null);

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
          foot={foot}
          onGoalRect={setGoalRect}
        />
      </Canvas>

      {/* Kamera vuruşta hareket ettiği için bölge butonları yalnızca tahmin sırasında durur. */}
      {goalRect && !shot && (
        <div className={styles.zones} style={goalRect}>
          {INDEXES.flatMap((row) =>
            INDEXES.map((col) => {
              const zone: Zone = { col, row };
              const isSelected = selected?.col === col && selected?.row === row;
              return (
                <button
                  key={`${col}-${row}`}
                  type="button"
                  className={styles.zone}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  aria-label={zoneLabel(zone)}
                  onClick={() => onSelect(zone)}
                />
              );
            }),
          )}
        </div>
      )}
    </div>
  );
}
