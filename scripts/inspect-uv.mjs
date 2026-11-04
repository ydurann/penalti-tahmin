// Bir Mixamo karakterinin forma mesh'inde SIRT bölgesinin UV alanını bulur: forma numarası ve
// adın dokuya nereye çizileceğini belirlemek için. Üçgenlerin model uzayındaki normali geriye
// (−Z) bakan ve gövde yüksekliğindeki olanları toplar, UV sınır kutusunu ve UV ile (x, y)
// arasındaki doğrusal ilişkiyi yazar.
//
//   node scripts/inspect-uv.mjs public/models/penaltici.fbx [mesh adı parçası=shirt]
import { readFileSync } from "node:fs";

const [file, partName = "shirt"] = process.argv.slice(2);
if (!file) {
  console.error("Kullanım: node scripts/inspect-uv.mjs <dosya.fbx> [mesh adı parçası]");
  process.exit(1);
}

const fakeElement = () => ({ addEventListener() {}, removeEventListener() {}, style: {}, set src(value) {} });
globalThis.document = { createElementNS: fakeElement, createElement: fakeElement };
globalThis.window = globalThis;
globalThis.self = globalThis;

const THREE = await import("three");
const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");

const buffer = readFileSync(file);
const object = new FBXLoader().parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), "");

let mesh = null;
object.traverse((o) => {
  if (o.isMesh && o.name.toLowerCase().includes(partName.toLowerCase())) mesh ??= o;
});
if (!mesh) {
  console.error(`"${partName}" içeren mesh yok.`);
  process.exit(1);
}
mesh.updateWorldMatrix(true, false);
const geometry = mesh.geometry;
const position = geometry.attributes.position;
const normal = geometry.attributes.normal;
const uv = geometry.attributes.uv;
const index = geometry.index;
const triangles = index ? index.count / 3 : position.count / 3;
const box = new THREE.Box3().setFromBufferAttribute(position);
console.log(`mesh: ${mesh.name}, köşe ${position.count}, üçgen ${triangles}, doku: ${[mesh.material].flat()[0].map?.image?.width ?? "?"}px`);
console.log("model uzayı sınırları (cm):", box.min.toArray().map((n) => n.toFixed(0)).join(","), "→", box.max.toArray().map((n) => n.toFixed(0)).join(","));

const vertexAt = (i) => (index ? index.getX(i) : i);
const stats = { front: 0, back: 0 };
const back = [];
const p = new THREE.Vector3();
const n = new THREE.Vector3();
for (let t = 0; t < triangles; t++) {
  const ids = [vertexAt(t * 3), vertexAt(t * 3 + 1), vertexAt(t * 3 + 2)];
  n.set(0, 0, 0);
  p.set(0, 0, 0);
  for (const id of ids) {
    n.x += normal.getX(id);
    n.y += normal.getY(id);
    n.z += normal.getZ(id);
    p.x += position.getX(id);
    p.y += position.getY(id);
    p.z += position.getZ(id);
  }
  n.divideScalar(3);
  p.divideScalar(3);
  if (n.z > 0.5) stats.front++;
  if (n.z < -0.6) {
    stats.back++;
    for (const id of ids) back.push({ x: position.getX(id), y: position.getY(id), z: position.getZ(id), u: uv.getX(id), v: uv.getY(id) });
  }
}
console.log("öne bakan üçgen:", stats.front, "arkaya bakan:", stats.back);

// Gövde: y aralığının üst yarısı (kollar da arkaya bakabilir; |x| sınırlı tutulur).
const ys = back.map((b) => b.y);
const yMin = Math.min(...ys);
const yMax = Math.max(...ys);
const torso = back.filter((b) => b.y > yMin + (yMax - yMin) * 0.45 && Math.abs(b.x) < 16);
const bounds = (arr, key) => [Math.min(...arr.map((a) => a[key])), Math.max(...arr.map((a) => a[key]))];
console.log("sırt köşe sayısı:", torso.length, "x:", bounds(torso, "x").map((v) => v.toFixed(1)), "y:", bounds(torso, "y").map((v) => v.toFixed(1)));
console.log("sırt UV u:", bounds(torso, "u").map((v) => v.toFixed(3)), "v:", bounds(torso, "v").map((v) => v.toFixed(3)));

// UV ile (x, y) arasındaki doğrusal bağ: korelasyonlar yönü (aynalı mı, döndürülmüş mü) gösterir.
const corr = (a, b) => {
  const ma = a.reduce((s, v) => s + v, 0) / a.length;
  const mb = b.reduce((s, v) => s + v, 0) / b.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
};
console.log(
  "korelasyon  u~x:", corr(torso.map((t) => t.u), torso.map((t) => t.x)).toFixed(2),
  " u~y:", corr(torso.map((t) => t.u), torso.map((t) => t.y)).toFixed(2),
  " v~x:", corr(torso.map((t) => t.v), torso.map((t) => t.x)).toFixed(2),
  " v~y:", corr(torso.map((t) => t.v), torso.map((t) => t.y)).toFixed(2),
);
// Sırt ortası (omuz hizasının biraz altı) hangi UV'ye düşüyor?
const center = torso.reduce((best, b) => (Math.abs(b.x) + Math.abs(b.y - (yMax - (yMax - yMin) * 0.3)) < Math.abs(best.x) + Math.abs(best.y - (yMax - (yMax - yMin) * 0.3)) ? b : best), torso[0]);
console.log("sırt ortası örnek köşe:", center);

// Sırtın ortasındaki bir ızgara: her (x, y) noktasına en yakın arkaya bakan köşenin UV'si.
// Buradan dokuya yazı için afin dönüşüm okunur (u, v ↔ x, y).
console.log("ızgara (x, y) → (u, v):");
for (const y of [126, 132, 138, 144]) {
  const row = [];
  for (const x of [-10, -5, 0, 5, 10]) {
    const nearest = back.reduce((best, b) => ((b.x - x) ** 2 + (b.y - y) ** 2 < (best.x - x) ** 2 + (best.y - y) ** 2 ? b : best), back[0]);
    row.push(`(${x},${y})→(${nearest.u.toFixed(3)},${nearest.v.toFixed(3)}) z${nearest.z.toFixed(0)}`);
  }
  console.log("  " + row.join("  "));
}
