import * as THREE from "three";
import type { Player } from "@/game/types";
import { clamp01, KICK_AT, SPOT_Z } from "./animation";
import { findMotion } from "./keeperClip";

// Mixamo'dan indirilen vuruş: sağ ayaklı oyuncu topun solundan çapraz koşar, ~0,75 sn'de
// sol ayağını topun yanına basar ve sağ ayak ucu yerden ~10 cm yukarıda topa değer.
// Koşu 1,5 sn'de, topun ~1 m ilerisinde biter.
export const SHOOTER_CONTACT_TIME = 0.75;
const TOE_BONE = "mixamorigRightToeBase";
const HIPS_POSITION_TRACK = "mixamorigHips.position";
/** Ayak ucu topun arkasına değer; topun merkezi biraz daha öndedir. */
const BALL_AHEAD = 0.12;
/**
 * Hareketteki koşu neredeyse düz; gerçek penaltıcılar gibi çapraz gelsin ve beklerken
 * kalenin önünü kapatmasın diye koşu yolu temas noktası etrafında döndürülür.
 */
const RUN_ANGLE = THREE.MathUtils.degToRad(20);
/** Bekleme hareketinden koşuya geçiş süresi. */
const IDLE_BLEND_TIME = 0.3;

/** Vuruşun `t` anında hareketin hangi karesinde olunacağı; ayak topa `KICK_AT` anında değer. */
export function shooterClipTime(t: number | null, duration: number): number {
  if (t === null) return 0;
  return Math.min(Math.max(t - KICK_AT + SHOOTER_CONTACT_TIME, 0), duration - 0.001);
}

/**
 * Bekleme hareketinin kalçasını koşunun başladığı noktaya taşır: bekleme kendi yerinde
 * sallanır (y korunur), koşu başlayınca gövde zıplamadan yola çıkar.
 */
export function alignIdleToRun(idle: THREE.AnimationClip, run: THREE.AnimationClip): THREE.AnimationClip {
  const aligned = idle.clone();
  const runHips = run.tracks.find((t) => t.name === HIPS_POSITION_TRACK);
  const idleHips = aligned.tracks.find((t) => t.name === HIPS_POSITION_TRACK);
  if (!runHips || !idleHips) return aligned;
  const [startX, , startZ] = runHips.values;
  const values = Float32Array.from(idleHips.values);
  for (let i = 0; i < values.length; i += 3) {
    values[i] = startX;
    values[i + 2] = startZ;
  }
  idleHips.values = values;
  return aligned;
}

export interface ShooterRig {
  update: (clock: number, t: number | null, foot: Player["foot"]) => void;
}

/**
 * Modelin içindeki koşu ve vuruşu oynatır; hareket veya ayak kemiği yoksa null döner.
 * Model, vuruş anında ayak ucu topun arkasına gelecek şekilde konur; sol ayaklı
 * oyuncularda aynalanır. Bekleme hareketi verilirse tahmin sırasında döngüde oynar ve
 * vuruş başlayınca koşuya karışır; verilmezse oyuncu koşunun ilk karesinde durur.
 */
export function createShooterRig(
  model: THREE.Object3D & { animations: THREE.AnimationClip[] },
  scale: number,
  idleClip: THREE.AnimationClip | null = null,
): ShooterRig | null {
  const clip = findMotion(model.animations);
  const toe = model.getObjectByName(TOE_BONE);
  if (!clip || !toe) return null;

  const mixer = new THREE.AnimationMixer(model);
  const run = mixer.clipAction(clip).play();
  const idle = idleClip ? mixer.clipAction(alignIdleToRun(idleClip, clip)).play() : null;
  idle?.setEffectiveWeight(0);

  // Vuruş anındaki ayak ucunun modelin kendi birimindeki yeri.
  run.time = SHOOTER_CONTACT_TIME;
  mixer.update(0);
  model.updateMatrixWorld(true);
  const contact = model.worldToLocal(toe.getWorldPosition(new THREE.Vector3()));
  contact.z += BALL_AHEAD / scale;

  const placed = new THREE.Vector3();
  const update: ShooterRig["update"] = (clock, t, foot) => {
    run.time = shooterClipTime(t, clip.duration);
    const blend = idle && t !== null ? clamp01(t / IDLE_BLEND_TIME) : idle ? 0 : 1;
    if (idle) {
      idle.time = clock % idle.getClip().duration;
      idle.setEffectiveWeight(1 - blend);
    }
    run.setEffectiveWeight(blend);
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
