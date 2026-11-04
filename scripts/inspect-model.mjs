// Bir Mixamo FBX dosyasının içeriğini özetler: hareketler, iskelet, mesh'ler, malzemeler, dokular.
// Yeni bir karakter gelince forma/cilt malzemelerinin adlarını görmek için.
//
//   node scripts/inspect-model.mjs <dosya.fbx>
import { readFileSync } from "node:fs";

const [file] = process.argv.slice(2);
if (!file) {
  console.error("Kullanım: node scripts/inspect-model.mjs <dosya.fbx>");
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

console.log("hareketler:", object.animations.map((a) => `${a.name} ${a.duration.toFixed(2)} sn, ${a.tracks.length} iz`).join(" | ") || "yok");

const bones = [];
const meshes = [];
object.traverse((o) => {
  if (o.isBone) bones.push(o.name);
  if (o.isMesh) {
    const materials = [o.material].flat().map((m) => {
      const maps = ["map", "normalMap", "roughnessMap", "metalnessMap", "specularMap", "emissiveMap"]
        .filter((k) => m[k])
        .map((k) => `${k}:${m[k].image?.width ?? "?"}x${m[k].image?.height ?? "?"}`);
      const color = m.color ? `#${m.color.getHexString()}` : "-";
      return `${m.name || "(adsız)"} ${color} ${maps.join(",") || "doku yok"}`;
    });
    meshes.push({
      mesh: o.name,
      tip: o.isSkinnedMesh ? "skinned" : "mesh",
      köşe: o.geometry.attributes.position.count,
      malzeme: materials.join(" | "),
    });
  }
});
console.log(`kemik: ${bones.length}, mixamorig: ${bones.filter((b) => b.startsWith("mixamorig")).length}`);
console.log("ilk kemikler:", bones.slice(0, 6).join(", "));
console.table(meshes);
const box = new THREE.Box3().setFromObject(object);
console.log("boyut (cm):", box.getSize(new THREE.Vector3()).toArray().map((n) => Math.round(n)).join(" x "));
