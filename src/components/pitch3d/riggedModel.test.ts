import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { findMotion } from "./keeperClip";
import { normalizeBoneName } from "./riggedModel";

describe("hareket seçimi", () => {
  it("boş kaydı ve kısacık T-poz kaydını atlar, gerçek hareketi seçer", () => {
    const track = new THREE.VectorKeyframeTrack("mixamorigHips.position", [0, 1], [0, 0, 0, 0, 1, 0]);
    const tPose = new THREE.AnimationClip("mixamo.com", 0.03, [track]);
    const empty = new THREE.AnimationClip("Take 001", 0, []);
    const dive = new THREE.AnimationClip("mixamo.com", 3.4, [track]);
    expect(findMotion([tPose, empty])).toBeUndefined();
    expect(findMotion([tPose, empty, dive])).toBe(dive);
  });
});

describe("kemik adı", () => {
  it("Mixamo karakterlerindeki sayılı öneki standart öneke çevirir", () => {
    expect(normalizeBoneName("mixamorig5Hips")).toBe("mixamorigHips");
    expect(normalizeBoneName("mixamorig12LeftHand.quaternion")).toBe("mixamorigLeftHand.quaternion");
  });

  it("standart adları ve diğer nesneleri değiştirmez", () => {
    expect(normalizeBoneName("mixamorigHips")).toBe("mixamorigHips");
    expect(normalizeBoneName("Ch38_Shirt")).toBe("Ch38_Shirt");
  });
});
