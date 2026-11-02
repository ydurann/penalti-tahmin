import * as THREE from "three";
import type { Player } from "@/game/types";
import { KICK_AT, SPOT_Z } from "./animation";
import { findMotion } from "./keeperClip";

// Mixamo'dan indirilen vuruş: sağ ayaklı oyuncu topun solundan çapraz koşar, ~0,75 sn'de
// sol ayağını topun yanına basar ve sağ ayak ucu yerden ~10 cm yukarıda topa değer.
// Koşu 1,5 sn'de, topun ~1 m ilerisinde biter.
export const SHOOTER_CONTACT_TIME = 0.75;
const TOE_BONE = "mixamorigRightToeBase";
/** Ayak ucu topun arkasına değer; topun merkezi biraz daha öndedir. */
const BALL_AHEAD = 0.12;
/**
 * Hareketteki koşu neredeyse düz; gerçek penaltıcılar gibi çapraz gelsin ve beklerken
 * kalenin önünü kapatmasın diye koşu yolu temas noktası etrafında döndürülür.
 */
const RUN_ANGLE = THREE.MathUtils.degToRad(20);

/** Vuruşun `t` anında hareketin hangi karesinde olunacağı; ayak topa `KICK_AT` anında değer. */
export function shooterClipTime(t: number | null, duration: number): number {
  if (t === null) return 0;
  return Math.min(Math.max(t - KICK_AT + SHOOTER_CONTACT_TIME, 0), duration - 0.001);
}

export interface ShooterRig {
  update: (t: number | null, foot: Player["foot"]) => void;
}

/**
 * Modelin içindeki koşu ve vuruşu oynatır; hareket veya ayak kemiği yoksa null döner.
 * Model, vuruş anında ayak ucu topun arkasına gelecek şekilde konur; sol ayaklı
 * oyuncularda aynalanır.
 */
export function createShooterRig(
  model: THREE.Object3D & { animations: THREE.AnimationClip[] },
  scale: number,
): ShooterRig | null {
  const clip = findMotion(model.animations);
  const toe = model.getObjectByName(TOE_BONE);
  if (!clip || !toe) return null;

  const mixer = new THREE.AnimationMixer(model);
  const action = mixer.clipAction(clip).play();

  // Vuruş anındaki ayak ucunun modelin kendi birimindeki yeri.
  action.time = SHOOTER_CONTACT_TIME;
  mixer.update(0);
  model.updateMatrixWorld(true);
  const contact = model.worldToLocal(toe.getWorldPosition(new THREE.Vector3()));
  contact.z += BALL_AHEAD / scale;

  const placed = new THREE.Vector3();
  const update: ShooterRig["update"] = (t, foot) => {
    action.time = shooterClipTime(t, clip.duration);
    mixer.update(0);

    // Model kaleye dönük durur; sol ayaklı oyuncuda koşu topun öbür yanından gelir.
    const mirror = foot === "left" ? -1 : 1;
    model.rotation.set(0, Math.PI - mirror * RUN_ANGLE, 0);
    model.scale.set(mirror * scale, scale, scale);
    model.position.set(0, 0, 0);
    model.updateMatrix();
    placed.copy(contact).applyMatrix4(model.matrix);
    model.position.set(-placed.x, 0, SPOT_Z - placed.z);
  };

  return { update };
}
