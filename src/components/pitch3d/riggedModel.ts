import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

// Mixamo FBX dosyaları santimetre ölçeklidir.
export const MODEL_SCALE = 0.01;

/** Bir FBX dosyasından yalnızca hareketi alır; içindeki model sahneye eklenmez. */
export async function loadMotion(url: string): Promise<THREE.AnimationClip | null> {
  const file = await new FBXLoader().loadAsync(url);
  return file.animations.find((clip) => clip.tracks.length > 0) ?? null;
}

/** Mixamo modelini yükler; malzemeleri forma renkleriyle sahne ışığına uyarlar. */
export async function loadRiggedModel(url: string, colors: { surface: string; joints: string }) {
  const model = await new FBXLoader().loadAsync(url);
  model.scale.setScalar(MODEL_SCALE);

  model.traverse((object) => {
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    const color = mesh.name.toLowerCase().includes("joints") ? colors.joints : colors.surface;
    for (const old of [mesh.material].flat()) old.dispose();
    mesh.material = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    mesh.castShadow = true;
    // Kemikler modeli sınır kutusunun dışına taşıdığı için kırpılmasın.
    mesh.frustumCulled = false;
  });

  return model;
}
