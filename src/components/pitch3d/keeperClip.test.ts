import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { Index, Outcome, PenaltyAnswer, ShotType } from "@/game/types";
import { ballPosition, flightTime, KICK_AT } from "./animation";
import { catchClipTime, createKeeperRig, diveClipTime, diveLift, fitDiveClip } from "./keeperClip";

const DURATION = 3.4;

const answerOf = (
  keeperDive: Index,
  row: Index,
  shot: ShotType = "placed",
  outcome: Outcome = "saved",
): PenaltyAnswer => ({ zone: { col: keeperDive, row }, shot, outcome, keeperDive });

function hipsClip() {
  return new THREE.AnimationClip("dalis", DURATION, [
    new THREE.VectorKeyframeTrack("mixamorigHips.position", [0, 3.4], [10, 96, 3, 110, 90, 203]),
    new THREE.QuaternionKeyframeTrack("mixamorigHips.quaternion", [0, 3.4], [0, 0, 0, 1, 0, 0, 0, 1]),
  ]);
}

describe("fitDiveClip", () => {
  it("öne gidişi kısar, yana gidişi uzatır, yüksekliğe dokunmaz", () => {
    const source = hipsClip();
    const values = fitDiveClip(source).tracks[0].values;
    expect(values[0]).toBeCloseTo(10, 3);
    expect(values[2]).toBeCloseTo(3, 3);
    expect(values[3]).toBeCloseTo(10 + 100 * 1.18, 3);
    expect(values[4]).toBeCloseTo(90, 3);
    expect(values[5]).toBeCloseTo(3 + 200 * 0.15, 3);
  });

  it("kaynak hareketi değiştirmez", () => {
    const source = hipsClip();
    fitDiveClip(source);
    expect(source.tracks[0].values[5]).toBeCloseTo(203, 3);
  });
});

describe("diveClipTime", () => {
  it("vuruştan önce ve tahmin sırasında hazır duruşta kalır", () => {
    expect(diveClipTime(null, null, DURATION)).toBe(0);
    expect(diveClipTime(0.1, answerOf(2, 1), DURATION)).toBe(0);
  });

  it("orta dalışta kaleci yerinde bekler", () => {
    expect(diveClipTime(2, answerOf(1, 1), DURATION)).toBe(0);
  });

  it.each(["power", "placed", "panenka"] as ShotType[])(
    "%s vuruşunda el top varınca temas karesine gelir",
    (shot) => {
      const arrival = KICK_AT + flightTime(shot);
      expect(diveClipTime(arrival, answerOf(2, 1, shot), DURATION)).toBeCloseTo(1.0, 5);
      expect(diveClipTime(arrival, answerOf(0, 2, shot), DURATION)).toBeCloseTo(1.2, 5);
    },
  );

  it("zaman içinde hep ilerler ve hareket süresini aşmaz", () => {
    let previous = 0;
    for (let t = 0; t < 8; t += 0.05) {
      const time = diveClipTime(t, answerOf(2, 1, "power"), DURATION);
      expect(time).toBeGreaterThanOrEqual(previous);
      expect(time).toBeLessThanOrEqual(DURATION);
      previous = time;
    }
    expect(previous).toBe(DURATION);
  });

  it("golde topun bölgesinden bağımsız orta yüksekliğe dalar", () => {
    const answer = answerOf(2, 2, "placed", "goal");
    expect(diveClipTime(KICK_AT + flightTime("placed"), answer, DURATION)).toBeCloseTo(1.0, 5);
  });
});

describe("catchClipTime", () => {
  const arrival = KICK_AT + flightTime("panenka");

  it("yalnızca ortadaki kurtarışta oynar", () => {
    expect(catchClipTime(arrival, answerOf(1, 1, "panenka", "goal"), 2.1)).toBe(0);
    expect(catchClipTime(arrival, answerOf(2, 1, "panenka"), 2.1)).toBe(0);
    expect(catchClipTime(null, answerOf(1, 1, "panenka"), 2.1)).toBe(0);
  });

  it("top geldiğinde eller orta topta bel hizasında, alçak topta yerdedir", () => {
    expect(catchClipTime(arrival, answerOf(1, 1, "panenka"), 2.1)).toBeCloseTo(0.45, 5);
    expect(catchClipTime(arrival, answerOf(1, 2, "panenka"), 2.1)).toBeCloseTo(0.78, 5);
  });

  it("gerçek hızda ilerler, öncesinde başlamaz, süreyi aşmaz", () => {
    const answer = answerOf(1, 1, "panenka");
    expect(catchClipTime(arrival - 0.6, answer, 2.1)).toBe(0);
    expect(catchClipTime(arrival + 0.5, answer, 2.1)).toBeCloseTo(0.95, 5);
    expect(catchClipTime(arrival + 9, answer, 2.1)).toBe(2.1);
  });
});

describe("diveLift", () => {
  it("üst köşe kurtarışında vücudu belirgin yükseltir ve yere indirir", () => {
    expect(diveLift(0.7, answerOf(2, 1))).toBeLessThan(0.1);
    expect(diveLift(0.7, answerOf(2, 2))).toBe(0);
    expect(diveLift(0.7, answerOf(2, 0))).toBeGreaterThan(0.5);
    expect(diveLift(0, answerOf(2, 0))).toBeCloseTo(0, 5);
    expect(diveLift(1.4, answerOf(2, 0))).toBeCloseTo(0, 5);
  });
});

describe("createKeeperRig", () => {
  function modelWith(animations: THREE.AnimationClip[]) {
    const model = Object.assign(new THREE.Group(), { animations });
    const hips = new THREE.Bone();
    hips.name = "mixamorigHips";
    model.add(hips);
    return { model, hips };
  }

  it("boş kayıtları yok sayar, hareket yoksa null döner", () => {
    const empty = new THREE.AnimationClip("Take 001", 0, []);
    expect(createKeeperRig(modelWith([empty]).model, 0.01)).toBeNull();
    expect(createKeeperRig(modelWith([empty, hipsClip()]).model, 0.01)).not.toBeNull();
  });

  it("sol köşede modeli aynalar, sağda aynalamaz, hareketi oynatır", () => {
    const { model, hips } = modelWith([hipsClip()]);
    const rig = createKeeperRig(model, 0.01)!;

    rig.update(0, 3, answerOf(0, 1));
    expect(model.scale.x).toBeCloseTo(-0.01, 6);
    const dived = hips.position.x;

    rig.update(0, 3, answerOf(2, 1));
    expect(model.scale.x).toBeCloseTo(0.01, 6);

    rig.update(0, null, null);
    expect(hips.position.x).toBeLessThan(dived);
    expect(hips.position.x).toBeCloseTo(10, 3);
  });

  describe("bekleme hareketiyle", () => {
    const idleClip = () =>
      new THREE.AnimationClip("bekleme", 2, [
        new THREE.VectorKeyframeTrack("mixamorigHips.position", [0, 1, 2], [0, 90, 0, 0, 94, 0, 0, 90, 0]),
      ]);

    it("tahmin sırasında beklemeyi döngüde oynatır", () => {
      const { model, hips } = modelWith([hipsClip()]);
      const rig = createKeeperRig(model, 0.01, idleClip())!;

      rig.update(1, null, null);
      expect(hips.position.y).toBeCloseTo(94, 3);
      rig.update(3, null, null);
      expect(hips.position.y).toBeCloseTo(94, 3);
      rig.update(2, null, null);
      expect(hips.position.y).toBeCloseTo(90, 3);
    });

    it("ortada kalan kaleci vuruş boyunca beklemeye devam eder", () => {
      const { model, hips } = modelWith([hipsClip()]);
      const rig = createKeeperRig(model, 0.01, idleClip())!;
      rig.update(1, 2, answerOf(1, 1));
      expect(hips.position.y).toBeCloseTo(94, 3);
      expect(hips.position.x).toBeCloseTo(0, 3);
      expect(model.scale.x).toBeCloseTo(0.01, 6);
    });

    it("dalışta beklemeden dalışa yumuşak geçer", () => {
      const { model, hips } = modelWith([hipsClip()]);
      const rig = createKeeperRig(model, 0.01, idleClip())!;
      const begin = KICK_AT - 0.25;

      rig.update(0, begin - 0.01, answerOf(2, 1));
      expect(hips.position.x).toBeCloseTo(0, 3);

      rig.update(0, begin + 0.1, answerOf(2, 1));
      const blending = hips.position.x;
      expect(blending).toBeGreaterThan(0.5);

      rig.update(0, 4, answerOf(2, 1));
      expect(hips.position.x).toBeGreaterThan(100);
    });

    it("sol dalışta aynalama yalnızca dalış başlayınca devreye girer", () => {
      const { model } = modelWith([hipsClip()]);
      const rig = createKeeperRig(model, 0.01, idleClip())!;
      rig.update(0, 0.1, answerOf(0, 1));
      expect(model.scale.x).toBeCloseTo(0.01, 6);
      rig.update(0, 1, answerOf(0, 1));
      expect(model.scale.x).toBeCloseTo(-0.01, 6);
    });
  });

  describe("yakalama hareketiyle", () => {
    const arrival = KICK_AT + flightTime("panenka");
    const center = answerOf(1, 1, "panenka");

    /** Kalça 1 sn'de 50 birim öne gider; eller kalçaya bağlı, 40 birim önde. */
    function catchModel() {
      const { model, hips } = modelWith([hipsClip()]);
      model.scale.setScalar(0.01);
      for (const [name, x] of [["mixamorigLeftHand", 10], ["mixamorigRightHand", -10]] as const) {
        const hand = new THREE.Bone();
        hand.name = name;
        hand.position.set(x, 0, 40);
        hips.add(hand);
      }
      const clip = new THREE.AnimationClip("yakalama", 2, [
        new THREE.VectorKeyframeTrack("mixamorigHips.position", [0, 1, 2], [0, 90, 0, 0, 90, 50, 0, 90, 50]),
      ]);
      return { model, hips, rig: createKeeperRig(model, 0.01, null, clip)! };
    }

    it("ortadaki kurtarışta yakalamayı oynatır, köşede dalışı", () => {
      const { hips, rig } = catchModel();
      rig.update(0, arrival + 0.55, center);
      expect(hips.position.x).toBeCloseTo(0, 3);
      expect(hips.position.z).toBeCloseTo(50, 3);

      rig.update(0, 8, answerOf(2, 1, "panenka"));
      expect(hips.position.x).toBeGreaterThan(100);
    });

    it("uçuşun başında ve golde ellere bağlanmaz", () => {
      const { rig } = catchModel();
      rig.update(0, arrival - 0.3, center);
      expect(rig.heldBall(arrival - 0.3, center)).toBeNull();
      expect(rig.heldBall(arrival + 1, answerOf(1, 1, "panenka", "goal"))).toBeNull();
    });

    it("uçuşun sonunda ellere kıvrılır, varınca ellerde olur ve orada kalır", () => {
      const { model, rig } = catchModel();
      const bending = arrival - 0.1;
      rig.update(0, bending, center);
      const [, , flightZ] = ballPosition(bending, center);
      const bent = rig.heldBall(bending, center)!;
      expect(bent.z).toBeLessThan(flightZ);

      rig.update(0, arrival, center);
      const caught = rig.heldBall(arrival, center)!;
      expect(caught.y).toBeCloseTo(0.9, 3);
      // Yakalamanın 0,45. sn'si: kalça 22,5 + eller 40 birim önde, top 0,1 m daha önde.
      expect(caught.z).toBeCloseTo(model.position.z + 0.625 + 0.1, 3);

      rig.update(0, arrival + 1, center);
      const held = rig.heldBall(arrival + 1, center)!;
      const hands = new THREE.Vector3(0, 90, 90).multiplyScalar(0.01).add(model.position);
      expect(held.x).toBeCloseTo(hands.x, 3);
      expect(held.y).toBeCloseTo(hands.y, 3);
      expect(held.z).toBeCloseTo(hands.z + 0.1, 3);
    });
  });
});
