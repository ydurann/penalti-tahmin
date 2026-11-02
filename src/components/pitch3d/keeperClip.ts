import * as THREE from "three";
import type { PenaltyAnswer } from "@/game/types";
import { ballPosition, clamp01, flightTime, KEEPER_Z, KICK_AT, zoneCenter } from "./animation";

// Mixamo'dan indirilen dalış: 0 sn hazır duruş, ~0,5 sn sıçrayış, ~1,4 sn yere iniş,
// ~3,2 sn ayakta. Hareket kalecinin soluna, yani kameradan bakınca sağa doğrudur.
const HIPS_POSITION_TRACK = "mixamorigHips.position";
/** Kalecinin vuruştan ne kadar önce harekete geçtiği. */
const REACTION_LEAD = 0.25;
const CONTACT_MID = 1.0;
const CONTACT_LOW = 1.2;
/** Hareketin elleri orta ve alt bölgede bu yükseklikte; üst bölgede vücut yukarı taşınır. */
const CLIP_REACH_Y = 1.15;
const LANDING_TIME = 1.4;
const FORWARD_KEEP = 0.15;
const SIDEWAYS_STRETCH = 1.18;
const IDLE_BLEND_TIME = 0.3;

// Ortadaki yakalama: ~0,45 sn eller önde bel hizasında birleşir, ~0,78 sn çömelip topu
// yerden alır, sonra topla öne ve kalecinin sağına yürür.
const CATCH_CONTACT_MID = 0.45;
const CATCH_CONTACT_LOW = 0.78;
/**
 * Kaleci yakalarken öne eğildiği için eller topun normal varış noktasının önünde kalır;
 * top uçuşun son anında ellere doğru kıvrılır, yoksa kalecinin içinden geçer.
 */
const CATCH_REACH = 0.25;
/** El kemikleri bilekte durur; top avuçların arasında, biraz öndedir. */
const CATCH_HOLD_FORWARD = 0.1;

/** FBX dosyalarında hareketin yanında boş bir kayıt da bulunur. */
export const findMotion = (clips: THREE.AnimationClip[]) => clips.find((clip) => clip.tracks.length > 0);

/**
 * Kalçanın yol verisini kaleye uyarlar: hareket 1,8 m öne çıktığı için öne gidiş kısılır,
 * eller köşeye yetişsin diye yana gidiş biraz uzatılır.
 */
export function fitDiveClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const fitted = clip.clone();
  const track = fitted.tracks.find((t) => t.name === HIPS_POSITION_TRACK);
  if (!track) return fitted;

  const values = Float32Array.from(track.values);
  const startX = values[0];
  const startZ = values[2];
  for (let i = 0; i < values.length; i += 3) {
    values[i] = startX + (values[i] - startX) * SIDEWAYS_STRETCH;
    values[i + 2] = startZ + (values[i + 2] - startZ) * FORWARD_KEEP;
  }
  track.values = values;
  return fitted;
}

/** Elin topa değdiği yükseklik: kurtarışta topun bölgesi, golde orta. */
const diveRow = (answer: PenaltyAnswer) => (answer.outcome === "saved" ? answer.zone.row : 1);

/** Vuruşun `t` anında hareketin hangi karesinde olunacağı; el topla aynı anda hedefe varır. */
export function diveClipTime(t: number | null, answer: PenaltyAnswer | null, duration: number): number {
  if (t === null || !answer || answer.keeperDive === 1) return 0;

  const begin = KICK_AT - REACTION_LEAD;
  const toContact = REACTION_LEAD + flightTime(answer.shot);
  const contact = diveRow(answer) === 2 ? CONTACT_LOW : CONTACT_MID;
  const elapsed = Math.max(t - begin, 0);
  const time = elapsed <= toContact ? (elapsed / toContact) * contact : contact + (elapsed - toContact);
  return Math.min(time, duration);
}

/** Üst köşedeki kurtarışlarda havadayken eklenen yükseklik. */
export function diveLift(clipTime: number, answer: PenaltyAnswer | null): number {
  if (!answer || answer.keeperDive === 1) return 0;
  const [, y] = zoneCenter({ col: answer.keeperDive, row: diveRow(answer) });
  const peak = Math.max(y - CLIP_REACH_Y, 0);
  return peak * Math.sin(clamp01(clipTime / LANDING_TIME) * Math.PI);
}

/** Kaleci ortada kalıp topu kurtarıyorsa yakalama oynar. */
export const isCenterCatch = (answer: PenaltyAnswer | null): answer is PenaltyAnswer =>
  !!answer && answer.keeperDive === 1 && answer.outcome === "saved";

const arrivalTime = (answer: PenaltyAnswer) => KICK_AT + flightTime(answer.shot);
const easeIn = (t: number) => t * t;

/**
 * Yakalamanın `t` anındaki karesi. Kaleci beklemeye devam eder ve top gelmeden hemen önce
 * gerçek hızda harekete geçer; alçak topta eller yerdeyken, diğerlerinde bel hizasındayken
 * top ellere varır.
 */
export function catchClipTime(t: number | null, answer: PenaltyAnswer | null, duration: number): number {
  if (t === null || !isCenterCatch(answer)) return 0;
  const contact = answer.zone.row === 2 ? CATCH_CONTACT_LOW : CATCH_CONTACT_MID;
  return Math.min(Math.max(t - (arrivalTime(answer) - contact), 0), duration);
}

export interface KeeperRig {
  update: (clock: number, t: number | null, answer: PenaltyAnswer | null) => void;
  /** Yakalanan topun konumu; top henüz ellere yaklaşmadıysa veya yakalama yoksa null. */
  heldBall: (t: number | null, answer: PenaltyAnswer | null) => THREE.Vector3 | null;
}

/**
 * Modelin içindeki dalışı oynatır; hareket yoksa null döner. Bekleme hareketi verilirse
 * tahmin sırasında ve ortada kalınan vuruşlarda döngüde oynar, dalışa yumuşak geçer.
 * Verilmezse kaleci dalışın ilk karesinde bekler. Yakalama hareketi verilirse ortadaki
 * kurtarışlarda oynar ve top ellerde kalır.
 */
export function createKeeperRig(
  model: THREE.Object3D & { animations: THREE.AnimationClip[] },
  scale: number,
  idleClip: THREE.AnimationClip | null = null,
  catchClip: THREE.AnimationClip | null = null,
): KeeperRig | null {
  const source = findMotion(model.animations);
  if (!source) return null;

  const clip = fitDiveClip(source);
  const mixer = new THREE.AnimationMixer(model);
  const dive = mixer.clipAction(clip).play();
  const idle = idleClip ? mixer.clipAction(idleClip).play() : null;
  const save = catchClip ? mixer.clipAction(catchClip).play() : null;
  const hands = ["mixamorigLeftHand", "mixamorigRightHand"].map((name) => model.getObjectByName(name));
  // Süreye tam eşit olunca hareket başa sarar.
  const lastFrame = (action: THREE.AnimationAction) => action.getClip().duration - 0.001;

  const update: KeeperRig["update"] = (clock, t, answer) => {
    const catching = !!save && isCenterCatch(answer);
    const active = catching ? save : dive;
    const activeTime = catching
      ? Math.min(catchClipTime(t, answer, save.getClip().duration), lastFrame(save))
      : Math.min(diveClipTime(t, answer, clip.duration), lastFrame(dive));
    const diveTime = catching ? 0 : activeTime;

    dive.time = diveTime;
    if (save) save.time = catching ? activeTime : 0;
    const blend = idle ? clamp01(activeTime / IDLE_BLEND_TIME) : 1;
    if (idle) {
      idle.time = clock % idle.getClip().duration;
      idle.setEffectiveWeight(1 - blend);
    }
    dive.setEffectiveWeight(active === dive ? blend : 0);
    save?.setEffectiveWeight(active === save ? blend : 0);
    mixer.update(0);

    // Hareket kameradan bakınca sağa gider, sol köşe için model aynalanır.
    model.scale.x = answer?.keeperDive === 0 && diveTime > 0 ? -scale : scale;
    model.position.set(0, diveLift(diveTime, answer), KEEPER_Z - 0.05);
  };

  const held = new THREE.Vector3();
  const hand = new THREE.Vector3();
  const heldBall: KeeperRig["heldBall"] = (t, answer) => {
    if (!save || t === null || !isCenterCatch(answer)) return null;
    const reach = clamp01((t - (arrivalTime(answer) - CATCH_REACH)) / CATCH_REACH);
    if (reach === 0 || hands.some((bone) => !bone)) return null;

    model.updateMatrixWorld(true);
    held.set(0, 0, 0);
    for (const bone of hands) held.add(bone!.getWorldPosition(hand));
    held.multiplyScalar(0.5);
    held.z += CATCH_HOLD_FORWARD;

    const [x, y, z] = ballPosition(t, answer);
    return held.lerp(hand.set(x, y, z), 1 - easeIn(reach));
  };

  return { update, heldBall };
}
