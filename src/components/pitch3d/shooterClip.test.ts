import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { KICK_AT, SPOT_Z } from "./animation";
import { alignIdleToRun, createShooterRig, SHOOTER_CONTACT_TIME, shooterClipTime } from "./shooterClip";

describe("shooterClipTime", () => {
  it("tahmin sırasında ilk karede bekler", () => {
    expect(shooterClipTime(null, 1.5)).toBe(0);
  });

  it("ayak topa vuruş anında değer, hareket süresini aşmaz", () => {
    expect(shooterClipTime(KICK_AT, 1.5)).toBeCloseTo(SHOOTER_CONTACT_TIME, 5);
    expect(shooterClipTime(9, 1.5)).toBeLessThan(1.5);
    expect(shooterClipTime(0, 1.5)).toBeGreaterThanOrEqual(0);
  });
});

describe("createShooterRig", () => {
  /** Kalça 1,5 sn'de 300 birim öne koşar; ayak ucu kalçanın 100 birim sağında. */
  function shooterModel() {
    const clip = new THREE.AnimationClip("vurus", 1.5, [
      new THREE.VectorKeyframeTrack("mixamorigHips.position", [0, 1.5], [0, 90, 0, 0, 90, 300]),
    ]);
    const model = Object.assign(new THREE.Group(), { animations: [clip] });
    model.scale.setScalar(0.01);
    const hips = new THREE.Bone();
    hips.name = "mixamorigHips";
    const toe = new THREE.Bone();
    toe.name = "mixamorigRightToeBase";
    toe.position.set(-100, -80, 0);
    hips.add(toe);
    model.add(hips);
    return { model, toe };
  }

  const toeAt = (model: THREE.Object3D, toe: THREE.Object3D) => {
    model.updateMatrixWorld(true);
    return toe.getWorldPosition(new THREE.Vector3());
  };

  it("hareket veya ayak kemiği yoksa null döner", () => {
    const empty = Object.assign(new THREE.Group(), { animations: [new THREE.AnimationClip("Take 001", 0, [])] });
    expect(createShooterRig(empty, 0.01)).toBeNull();
    const { model, toe } = shooterModel();
    toe.name = "baska";
    expect(createShooterRig(model, 0.01)).toBeNull();
  });

  it.each(["right", "left"] as const)("%s ayakta vuruş anında ayak ucu topun hemen arkasındadır", (foot) => {
    const { model, toe } = shooterModel();
    const rig = createShooterRig(model, 0.01)!;
    rig.update(0, KICK_AT, foot);
    // Koşu çapraz olduğu için ayak ucu topun 12 cm arkasında, koşu doğrultusundadır.
    const at = toeAt(model, toe);
    expect(Math.hypot(at.x, at.z - SPOT_Z)).toBeCloseTo(0.12, 5);
    expect(at.z).toBeGreaterThan(SPOT_Z + 0.1);
    expect(Math.sign(at.x)).toBe(foot === "right" ? -1 : 1);
  });

  it("sağ ayaklı topun solundan, sol ayaklı sağından gelir ve kaleye doğru koşar", () => {
    const { model, toe } = shooterModel();
    const rig = createShooterRig(model, 0.01)!;

    // Kalça modelin merkezinde; vuruşta ayak ucu 1 m sağında olduğundan gövde topun yanındadır,
    // çapraz koşu onu biraz daha dışarı taşır.
    rig.update(0, null, "right");
    expect(model.position.x).toBeLessThan(-1);
    const start = toeAt(model, toe);
    rig.update(0, null, "left");
    expect(model.position.x).toBeGreaterThan(1);
    expect(toeAt(model, toe).x).toBeCloseTo(-start.x, 5);

    expect(start.z).toBeGreaterThan(SPOT_Z + 1);
    rig.update(0, KICK_AT, "right");
    expect(toeAt(model, toe).z).toBeLessThan(start.z);
  });

  describe("bekleme hareketi", () => {
    /** Kalça kendi yerinde 95–100 arasında salınır; x ve z koşunun başından uzakta. */
    const idleClip = () =>
      new THREE.AnimationClip("bekleme", 2, [
        new THREE.VectorKeyframeTrack("mixamorigHips.position", [0, 1, 2], [40, 95, -30, 40, 100, -30, 40, 95, -30]),
      ]);

    it("kalçayı koşunun başladığı noktaya taşır, yüksekliği korur", () => {
      const run = shooterModel().model.animations[0];
      const aligned = alignIdleToRun(idleClip(), run);
      expect(Array.from(aligned.tracks[0].values)).toEqual([0, 95, 0, 0, 100, 0, 0, 95, 0]);
    });

    it("tahmin sırasında döngüde oynar, vuruş başlayınca koşuya geçer", () => {
      const { model } = shooterModel();
      const hips = model.getObjectByName("mixamorigHips")!;
      const rig = createShooterRig(model, 0.01, idleClip())!;
      rig.update(1, null, "right");
      expect(hips.position.y).toBeCloseTo(100, 3);
      rig.update(0, null, "right");
      expect(hips.position.y).toBeCloseTo(95, 3);
      // Geçiş bittikten sonra yalnızca koşu: kalça öne gitmiş, yükseklik koşudaki 90.
      rig.update(0, 1, "right");
      expect(hips.position.y).toBeCloseTo(90, 3);
      expect(hips.position.z).toBeGreaterThan(100);
    });

    it("bekleme verilmezse koşunun ilk karesinde durur", () => {
      const { model } = shooterModel();
      const hips = model.getObjectByName("mixamorigHips")!;
      createShooterRig(model, 0.01)!.update(5, null, "right");
      expect(hips.position.z).toBeCloseTo(0, 3);
    });
  });
});
