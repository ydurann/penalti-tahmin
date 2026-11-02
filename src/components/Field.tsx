"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { PenaltyAnswer, Player, Zone } from "@/game/types";
import styles from "./Game.module.css";
import { Pitch } from "./Pitch";

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
  selected: Zone | null;
  shot: PenaltyAnswer | null;
  revealZone: boolean;
  disabled: boolean;
  foot: Player["foot"];
  onSelect: (zone: Zone) => void;
}

/** 3D saha; WebGL desteklemeyen cihazlarda 2D sahaya düşer. */
export function Field({ foot, ...props }: FieldProps) {
  const [webgl] = useState(supportsWebGL);
  return webgl ? <Pitch3D foot={foot} {...props} /> : <Pitch {...props} />;
}
