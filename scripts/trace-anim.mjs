// Bir Mixamo FBX dosyasındaki hareketin vücut parçalarını zaman içinde yazdırır.
// Yeni bir hareketin ne yaptığını (bekleme mi, yakalama mı, temas anı ne zaman) anlamak için.
//
//   node scripts/trace-anim.mjs <dosya.fbx> [adım=0.1] [başlangıç=0] [bitiş=süre]
//
// Birim santimetre; x+ modelin solu, z+ modelin önü.
import { readFileSync } from "node:fs";

const [file, step = "0.1", from = "0", to] = process.argv.slice(2);
if (!file) {
  console.error("Kullanım: node scripts/trace-anim.mjs <dosya.fbx> [adım] [başlangıç] [bitiş]");
  process.exit(1);
}

// FBXLoader tarayıcı nesnelerine dokunur; dokular gerekmediği için boş taklitler yeterli.
const fakeElement = () => ({ addEventListener() {}, removeEventListener() {}, style: {}, set src(value) {} });
globalThis.document = { createElementNS: fakeElement, createElement: fakeElement };
globalThis.window = globalThis;
globalThis.self = globalThis;

const THREE = await import("three");
const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");

const buffer = readFileSync(file);
const object = new FBXLoader().parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), "");

console.log("hareketler:", object.animations.map((a) => `${a.name} ${a.duration.toFixed(2)} sn, ${a.tracks.length} iz`).join(" | "));
const clip = object.animations.find((a) => a.tracks.length > 0);
if (!clip) {
  console.log("Dosyada oynatılacak hareket yok.");
  process.exit(0);
}

const mixer = new THREE.AnimationMixer(object);
mixer.clipAction(clip).play();
const bones = {
  hips: "mixamorigHips",
  head: "mixamorigHead",
  handL: "mixamorigLeftHand",
  handR: "mixamorigRightHand",
  footL: "mixamorigLeftFoot",
  footR: "mixamorigRightFoot",
  toeL: "mixamorigLeftToeBase",
  toeR: "mixamorigRightToeBase",
};

const rows = [];
const end = to === undefined ? clip.duration : Number(to);
for (let t = Number(from); t <= end + 1e-6; t += Number(step)) {
  mixer.setTime(Math.min(t, clip.duration - 0.001));
  object.updateMatrixWorld(true);
  const row = { t: Math.round(t * 100) / 100 };
  for (const [key, name] of Object.entries(bones)) {
    const bone = object.getObjectByName(name);
    if (!bone) continue;
    const p = bone.getWorldPosition(new THREE.Vector3());
    row[key] = [p.x, p.y, p.z].map((n) => Math.round(n)).join(",");
  }
  rows.push(row);
}
console.table(rows);
