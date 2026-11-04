import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Kit } from "@/game/kits";
import { findMotion } from "./keeperClip";

// Mixamo FBX dosyaları santimetre ölçeklidir.
export const MODEL_SCALE = 0.01;

/** Forma renkleri; `joints` yalnızca manken modellerdeki eklem parçaları içindir. */
export interface KitColors extends Kit {
  joints: string;
}

type KitPart = keyof Kit;

/** Formanın sırtına yazılacak ad ve numara; `mirrored` sol ayaklı oyuncuda model aynalandığı için. */
export interface ShirtPrint {
  name?: string;
  number?: number;
  mirrored?: boolean;
}

/**
 * Mixamo karakterlerinde kemik adı öneki değişebilir ("mixamorig5Hips" gibi); hareketler
 * "mixamorig…" adlarını aradığı için tek biçime çekilir.
 */
export const normalizeBoneName = (name: string) => name.replace(/^mixamorig\d+/, "mixamorig");

function normalizeNames(root: THREE.Object3D & { animations?: THREE.AnimationClip[] }) {
  root.traverse((object) => {
    object.name = normalizeBoneName(object.name);
  });
  for (const clip of root.animations ?? []) {
    for (const track of clip.tracks) track.name = normalizeBoneName(track.name);
  }
}

/**
 * FBX dosyaları bir kez indirilip çözümlenir ve adrese göre önbellekte durur (52 MB'lık
 * karakter her turda yeniden inmesin). Sahneye her seferinde kopya verilir; başarısız
 * yükleme önbellekten düşer ki sonraki deneme yeniden indirsin.
 */
const fbxCache = new Map<string, Promise<THREE.Group>>();

function loadFbx(url: string): Promise<THREE.Group> {
  let pending = fbxCache.get(url);
  if (!pending) {
    pending = new FBXLoader().loadAsync(url).then((file) => {
      normalizeNames(file);
      return file;
    });
    fbxCache.set(url, pending);
    pending.catch(() => fbxCache.delete(url));
  }
  return pending;
}

/** Giriş ekranında, oyun başlamadan dosyaları indirir; hata sessizce yutulur (sahne kapsülle devam eder). */
export function preloadModels(urls: readonly string[]): void {
  for (const url of urls) loadFbx(url).catch(() => undefined);
}

/** Bir FBX dosyasından yalnızca hareketi alır; içindeki model sahneye eklenmez. */
export async function loadMotion(url: string): Promise<THREE.AnimationClip | null> {
  const file = await loadFbx(url);
  return findMotion(file.animations) ?? null;
}

/** Mesh adından forma parçası: Mixamo karakterlerinde "Ch38_Shirt" gibi adlar vardır. */
function kitPartFor(meshName: string): KitPart | null {
  const name = meshName.toLowerCase();
  if (name.includes("shirt") || name.includes("top") || name.includes("jersey")) return "shirt";
  if (name.includes("shorts") || name.includes("pants")) return "shorts";
  if (name.includes("socks")) return "socks";
  return null;
}

/**
 * Formanın sırt bölgesinin dokudaki yeri (Mixamo "Ch38" karakteri, `scripts/inspect-uv.mjs` ile
 * ölçüldü): sırt ortası (x=0, y=132 cm) u=0,556 v=0,245'e düşer; u, x ile TERS yönde
 * (0,0055/cm), v, y ile aynı yönde (0,0051/cm) değişir. Yazı bu yüzden aynalanarak çizilir.
 */
const BACK = { u: 0.556, v: 0.245, uPerCm: 0.0055, vPerCm: 0.0051 };
/** Numara ve adın sırt üzerindeki yeri ve boyu (cm). */
const NUMBER_CM = { y: 130, height: 15 };
const NAME_CM = { y: 146, height: 3.6, maxWidth: 24 };

interface ShirtCanvas {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  base: THREE.Texture;
}

/** Dokunun görüntüsü yüklendi mi (FBXLoader dokuyu modelden sonra, ayrı indirir). */
function imageReady(image: unknown): image is CanvasImageSource & { width: number; height: number } {
  if (!image || typeof image !== "object") return false;
  const img = image as HTMLImageElement;
  if ("complete" in img) return img.complete && img.naturalWidth > 0;
  return "width" in img && (img as { width: number }).width > 0;
}

/** Hex rengin algılanan parlaklığı (0–1); yazı rengi buna göre beyaz ya da koyu olur. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Sırt dokusunu yeniden çizer: temel doku × forma rengi, üstüne ad ve numara. Renk dokuya
 * basıldığı için malzeme rengi beyaz kalır (yoksa yazı da forma rengine boyanırdı).
 */
function drawShirt(shirt: ShirtCanvas, kit: Kit, print: ShirtPrint | null) {
  const image = shirt.base.image;
  if (!imageReady(image)) return;
  const { canvas } = shirt;
  if (canvas.width !== image.width || canvas.height !== image.height) {
    canvas.width = image.width;
    canvas.height = image.height;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(image, 0, 0, W, H);
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = kit.shirt;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";

  // Mixamo dokusunun sırtında hazır bir numara var; baskı alanı düz forma rengiyle kapatılır.
  const patch = {
    x: (BACK.u - BACK.uPerCm * 13) * W,
    y: (1 - (BACK.v + (151 - 132) * BACK.vPerCm)) * H,
    w: BACK.uPerCm * 26 * W,
    h: (151 - 118) * BACK.vPerCm * H,
  };
  ctx.fillStyle = kit.shirt;
  ctx.fillRect(patch.x, patch.y, patch.w, patch.h);

  if (print && (print.name || print.number !== undefined)) {
    const ink = luminance(kit.shirt) > 0.6 ? "#1a1a1a" : "#ffffff";
    // u, x ile ters yönde arttığından dokuda düz çizilen yazı arkadan bakınca doğru okunur;
    // model aynalanınca (sol ayak) yazı da aynalanır.
    const flip = print.mirrored ? -1 : 1;
    const px = (ycm: number) => [BACK.u * W, (1 - (BACK.v + (ycm - 132) * BACK.vPerCm)) * H] as const;
    const cmToPx = (cm: number) => cm * BACK.vPerCm * H;
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (print.number !== undefined) {
      const [x, y] = px(NUMBER_CM.y);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(flip, 1);
      ctx.font = `700 ${Math.round(cmToPx(NUMBER_CM.height))}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
      ctx.fillText(String(print.number), 0, 0);
      ctx.restore();
    }
    if (print.name) {
      const [x, y] = px(NAME_CM.y);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(flip, 1);
      ctx.font = `700 ${Math.round(cmToPx(NAME_CM.height))}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
      ctx.fillText(print.name, 0, 0, cmToPx(NAME_CM.maxWidth));
      ctx.restore();
    }
  }
  shirt.texture.needsUpdate = true;
}

/** Sırt baskısı için tuval dokusunu kurar; doku görüntüsü sonradan gelirse yeniden çizer. */
function createShirtCanvas(base: THREE.Texture, onReady: () => void): ShirtCanvas {
  const canvas = document.createElement("canvas");
  if (process.env.NODE_ENV !== "production") {
    // Geliştirmede sırt baskısını tarayıcı konsolundan incelemek için.
    (window as unknown as { __penaltiShirt?: HTMLCanvasElement }).__penaltiShirt = canvas;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = base.flipY;
  texture.colorSpace = base.colorSpace;
  texture.wrapS = base.wrapS;
  texture.wrapT = base.wrapT;
  const image = base.image as HTMLImageElement | undefined;
  const loaded = !!image && image.complete && image.naturalWidth > 0;
  if (image && !loaded && typeof image.addEventListener === "function") {
    image.addEventListener("load", onReady, { once: true });
  }
  return { canvas, texture, base };
}

/**
 * Yüklü modelin forma renklerini (ve penaltıcıda sırt baskısını) uygular; parçalar yüklenirken
 * `userData.kitPart` ile işaretlenir. Formada tuval dokusu varsa renk dokuya basılır.
 */
export function applyKit(model: THREE.Object3D, kit: Kit, print: ShirtPrint | null = null) {
  model.traverse((object) => {
    const part = object.userData.kitPart as KitPart | undefined;
    if (!part) return;
    const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const shirt = object.userData.shirtCanvas as ShirtCanvas | undefined;
    if (part === "shirt" && shirt) {
      material.color.set("#ffffff");
      drawShirt(shirt, kit, print);
      return;
    }
    material.color.set(kit[part]);
  });
}

/**
 * Mixamo modelini yükler ve forma renklerini uygular.
 * - Dokulu karakterlerde (cilt, yüz, saç) dokular korunur; yalnızca forma, şort ve çorap
 *   mesh'leri renkle çarpılır (dokuları beyaz olduğu için renk olduğu gibi çıkar).
 * - Dokusuz mankenlerde (X Bot / Y Bot) bütün yüzey forma rengine, eklemler `joints` rengine boyanır.
 * `scale` ile karakter büyütülebilir (kaleci biraz daha iri). `printable` ile formanın sırtına
 * ad ve numara yazılabilir hale gelir (`applyKit` ile).
 */
export async function loadRiggedModel(url: string, colors: KitColors, scale = MODEL_SCALE, printable = false) {
  const source = await loadFbx(url);
  const model = cloneSkeleton(source) as THREE.Group;
  model.animations = source.animations;
  model.scale.setScalar(scale);

  model.traverse((object) => {
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    // Kemikler modeli sınır kutusunun dışına taşıdığı için kırpılmasın.
    mesh.frustumCulled = false;

    const original = [mesh.material].flat()[0] as THREE.MeshPhongMaterial;
    if (original.map) {
      // Dokulu karakter: malzeme her mesh için ayrı kopyalanır ki renk yalnızca o parçayı boyasın.
      const part = kitPartFor(mesh.name);
      if (part) mesh.userData.kitPart = part;
      const material = new THREE.MeshStandardMaterial({
        map: original.map,
        normalMap: original.normalMap ?? null,
        color: part ? colors[part] : "#ffffff",
        roughness: part ? 0.75 : 0.6,
        metalness: 0,
        transparent: original.transparent,
        alphaTest: original.transparent ? 0.5 : 0,
        side: original.side,
      });
      if (part === "shirt" && printable) {
        // Doku görüntüsü sonradan gelirse renk ve baskı yeniden çizilir.
        const shirt = createShirtCanvas(original.map, () => applyKit(mesh, mesh.userData.lastKit ?? colors, mesh.userData.lastPrint ?? null));
        mesh.userData.shirtCanvas = shirt;
        material.map = shirt.texture;
        material.color.set("#ffffff");
        drawShirt(shirt, colors, null);
      }
      mesh.material = material;
      return;
    }
    const joints = mesh.name.toLowerCase().includes("joints");
    if (!joints) mesh.userData.kitPart = "shirt";
    mesh.material = new THREE.MeshStandardMaterial({ color: joints ? colors.joints : colors.shirt, roughness: 0.6 });
  });

  return model;
}
