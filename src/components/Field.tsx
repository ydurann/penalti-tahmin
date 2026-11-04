"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { BallStyle } from "@/game/ballStyles";
import type { PenaltyAnswer, Player, Target } from "@/game/types";
import styles from "./Game.module.css";
import { Pitch } from "./Pitch";
import type { Kits } from "./pitch3d/world";

// three.js büyük olduğu için yalnızca oyun başlayınca yüklenir.
const Pitch3D = dynamic(() => import("./pitch3d/Pitch3D").then((m) => m.Pitch3D), {
  ssr: false,
  loading: () => <div className={`${styles.pitch3d} ${styles.pitchLoading}`}>Stadyum hazırlanıyor…</div>,
});

function supportsWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const context = document.createElement("canvas").getContext("webgl2");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return context !== null;
  } catch {
    return false;
  }
}

interface FieldProps {
  selected: Target | null;
  shot: PenaltyAnswer | null;
  revealZone: boolean;
  disabled: boolean;
  /** Penaltıcı: ayak, ad ve forma numarası (3D sahnede forma sırtına yazılır). */
  player: Player;
  /** Turnuvaya özel top görünümü. */
  ball: BallStyle;
  /** Penaltıcının takım forması ve kaleci kiti (yalnızca 3D). */
  kits: Kits;
  onSelect: (target: Target) => void;
}

/** 3D saha; WebGL desteklemeyen cihazlarda 2D sahaya düşer. */
export function Field({ player, ball, kits, ...props }: FieldProps) {
  const [webgl] = useState(supportsWebGL);
  return webgl ? <Pitch3D player={player} ball={ball} kits={kits} {...props} /> : <Pitch ball={ball} {...props} />;
}
