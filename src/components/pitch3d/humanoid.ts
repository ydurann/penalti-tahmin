import * as THREE from "three";
import type { PenaltyAnswer, Player } from "@/game/types";
import {
  clamp01,
  easeOut,
  flightTime,
  KEEPER_Z,
  KICK_AT,
  lerp,
  SPOT_Z,
  zoneCenter,
} from "./animation";

// Eklemli insan figürü. Kök kalçadadır, yerel +z oyuncunun önüdür; böylece
// bacak ve kolda negatif rotation.x hareketi ileri doğrudur.
interface Kit {
  shirt: string;
  shorts: string;
  socks: string;
  skin: string;
  hair: string;
  hands: string;
}

export interface Humanoid {
  root: THREE.Group;
  spine: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
}

const STAND_Y = 0.93;

function material(color: string) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
}

function shadowed(mesh: THREE.Mesh) {
  mesh.castShadow = true;
  return mesh;
}

/** Eklemden aşağı sarkan uzuv parçası. */
function limb(radius: number, length: number, mat: THREE.Material) {
  const mesh = shadowed(
    new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(length - radius * 2, 0.01), 6, 12), mat),
  );
  mesh.position.y = -length / 2;
  return mesh;
}

function jointAt(parent: THREE.Object3D, x: number, y: number) {
  const joint = new THREE.Group();
  joint.position.set(x, y, 0);
  parent.add(joint);
  return joint;
}

export function createHumanoid(kit: Kit): Humanoid {
  const shirt = material(kit.shirt);
  const shorts = material(kit.shorts);
  const socks = material(kit.socks);
  const skin = material(kit.skin);
  const hands = material(kit.hands);
  const boots = material("#16181c");

  const root = new THREE.Group();
  const spine = jointAt(root, 0, 0);

  const pelvis = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.08, 6, 12), shorts));
  pelvis.scale.z = 0.75;
  pelvis.position.y = -0.02;
  spine.add(pelvis);

  const torso = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.175, 0.3, 6, 14), shirt));
  torso.scale.z = 0.68;
  torso.position.y = 0.33;
  spine.add(torso);

  const neck = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10), skin));
  neck.position.y = 0.62;
  spine.add(neck);

  const head = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), skin));
  head.scale.y = 1.12;
  head.position.y = 0.74;
  spine.add(head);

  const hair = shadowed(
    new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), material(kit.hair)),
  );
  hair.scale.y = 1.12;
  hair.position.y = 0.75;
  hair.rotation.x = -0.25;
  spine.add(hair);

  const arm = (side: 1 | -1) => {
    const shoulder = jointAt(spine, side * 0.23, 0.53);
    shoulder.add(limb(0.052, 0.3, shirt));
    const elbow = jointAt(shoulder, 0, -0.29);
    elbow.add(limb(0.044, 0.27, skin));
    const hand = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), hands));
    hand.position.y = -0.29;
    elbow.add(hand);
    return { shoulder, elbow };
  };

  const leg = (side: 1 | -1) => {
    const hip = jointAt(root, side * 0.1, -0.02);
    const thigh = limb(0.078, 0.44, skin);
    hip.add(thigh);
    const short = limb(0.09, 0.24, shorts);
    hip.add(short);
    const knee = jointAt(hip, 0, -0.44);
    knee.add(limb(0.06, 0.44, socks));
    const boot = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.07, 0.25), boots));
    boot.position.set(0, -0.45, 0.05);
    knee.add(boot);
    return { hip, knee };
  };

  const left = arm(1);
  const right = arm(-1);
  const legLeft = leg(1);
  const legRight = leg(-1);

  return {
    root,
    spine,
    armL: left.shoulder,
    armR: right.shoulder,
    elbowL: left.elbow,
    elbowR: right.elbow,
    legL: legLeft.hip,
    legR: legRight.hip,
    kneeL: legLeft.knee,
    kneeR: legRight.knee,
  };
}

/** Bekleme, kaleci hareketleri ve dalış. `t`, vuruş başlamadıysa null. */
export function poseKeeper(k: Humanoid, clock: number, t: number | null, answer: PenaltyAnswer | null) {
  const sway = Math.sin(clock * 1.6) * 0.22;
  let x = sway;
  let y = 0.86 + Math.sin(clock * 3.2) * 0.012;
  let tilt = 0;
  let armRaise = 0.85;
  let armForward = 0;
  let legBend = 0.45;
  let kneeBend = 0.8;

  if (t !== null && answer) {
    const flight = flightTime(answer.shot);
    const begin = KICK_AT - 0.04;
    const reach = easeOut(clamp01((t - begin) / (flight + 0.04)));
    const landing = clamp01((t - begin - flight - 0.04) / 0.45);
    const side = answer.keeperDive - 1;
    const row = answer.outcome === "saved" ? answer.zone.row : 1;
    const [handX, handY] = zoneCenter({ col: answer.keeperDive, row });

    legBend = lerp(0.45, 0.12, reach);
    kneeBend = lerp(0.8, 0.25, reach);

    if (side !== 0) {
      // Eller hedefe ulaşsın diye kalça, uzanan vücut boyu kadar geride kalır.
      x = lerp(sway, handX - side * 1.1, reach);
      const peak = Math.max(0.42, handY - 0.43);
      y = lerp(lerp(0.86, peak, reach), 0.24, landing);
      tilt = -side * lerp(1.2 * reach, 1.5, landing);
      armRaise = lerp(0.85, Math.PI - 0.12, reach);
    } else if (row === 0) {
      x = lerp(sway, handX, reach);
      y = lerp(lerp(0.86, Math.max(0.93, handY - 1.08), reach), 0.93, landing);
      armRaise = lerp(0.85, Math.PI - 0.15, reach);
    } else {
      x = lerp(sway, handX, reach);
      y = lerp(0.86, row === 2 ? 0.62 : 0.8, reach);
      armRaise = lerp(0.85, 0.2, reach);
      armForward = lerp(0, row === 2 ? -0.9 : -1.5, reach);
      legBend = lerp(0.45, row === 2 ? 0.9 : 0.5, reach);
      kneeBend = lerp(0.8, row === 2 ? 1.5 : 0.9, reach);
    }
  }

  k.root.position.set(x, y, KEEPER_Z);
  k.root.rotation.set(0, 0, tilt);
  k.armL.rotation.set(armForward, 0, armRaise);
  k.armR.rotation.set(armForward, 0, -armRaise);
  k.elbowL.rotation.x = -0.25;
  k.elbowR.rotation.x = -0.25;
  k.legL.rotation.x = -legBend;
  k.legR.rotation.x = -legBend;
  k.kneeL.rotation.x = kneeBend;
  k.kneeR.rotation.x = kneeBend;
}

/** Topa kullanılan ayağın karşı tarafından koşu, vuruş ve vuruş sonrası. */
export function poseShooter(k: Humanoid, clock: number, t: number | null, foot: Player["foot"]) {
  const side = foot === "right" ? -1 : 1;
  const startX = side * 2.0;
  const startZ = SPOT_Z + 0.5;
  const plantX = side * 0.34;
  const plantZ = SPOT_Z + 0.2;
  const faceBall = Math.atan2(plantX - startX, plantZ - startZ);

  const [kickLeg, standLeg] = foot === "right" ? [k.legR, k.legL] : [k.legL, k.legR];
  const [kickKnee, standKnee] = foot === "right" ? [k.kneeR, k.kneeL] : [k.kneeL, k.kneeR];

  if (t === null) {
    k.root.position.set(startX, 0.93 + Math.sin(clock * 2) * 0.006, startZ);
    k.root.rotation.set(0, faceBall, 0);
    k.spine.rotation.x = 0.05;
    k.armL.rotation.set(0, 0, 0.12);
    k.armR.rotation.set(0, 0, -0.12);
    k.elbowL.rotation.x = -0.2;
    k.elbowR.rotation.x = -0.2;
    kickLeg.rotation.x = -0.05;
    standLeg.rotation.x = 0.05;
    kickKnee.rotation.x = 0.1;
    standKnee.rotation.x = 0.1;
    return;
  }

  const kickStart = KICK_AT - 0.18;
  const run = clamp01(t / kickStart);
  const stride = run * Math.PI * 5;
  const swing = Math.sin(stride);

  const x = lerp(startX, plantX, run);
  const z = lerp(startZ, plantZ, run);
  k.root.position.set(x, STAND_Y - 0.04 + Math.abs(swing) * 0.05 * (run < 1 ? 1 : 0), z);

  const turn = clamp01((t - kickStart) / 0.3);
  k.root.rotation.set(0, lerp(faceBall, Math.PI, turn), 0);
  k.spine.rotation.x = run < 1 ? 0.22 : 0.12;

  if (run < 1) {
    k.legL.rotation.x = swing * 0.85;
    k.legR.rotation.x = -swing * 0.85;
    k.kneeL.rotation.x = 0.35 + Math.max(swing, 0) * 1.1;
    k.kneeR.rotation.x = 0.35 + Math.max(-swing, 0) * 1.1;
    k.armL.rotation.set(-swing * 0.75, 0, 0.14);
    k.armR.rotation.set(swing * 0.75, 0, -0.14);
    k.elbowL.rotation.x = -1.2;
    k.elbowR.rotation.x = -1.2;
    return;
  }

  const strike = clamp01((t - kickStart) / 0.36);
  const recover = clamp01((t - kickStart - 0.36) / 0.5);
  kickLeg.rotation.x = lerp(lerp(0.95, -1.15, strike * strike * (3 - 2 * strike)), -0.1, recover);
  kickKnee.rotation.x = lerp(lerp(1.3, 0.1, strike), 0.2, recover);
  standLeg.rotation.x = 0.08;
  standKnee.rotation.x = 0.18;
  k.armL.rotation.set(0, 0, 0.55);
  k.armR.rotation.set(0, 0, -0.55);
  k.elbowL.rotation.x = -0.5;
  k.elbowR.rotation.x = -0.5;
}
