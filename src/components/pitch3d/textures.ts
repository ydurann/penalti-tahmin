import * as THREE from "three";
import { CLASSIC_BALL, type BallStyle } from "@/game/ballStyles";

// Dokular dış dosya gerektirmez, tuval üzerinde üretilir. Sabit tohumlu rastgelelik
// sayesinde saha her açılışta aynı görünür.
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d")! };
}

function finish(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export const GROUND = { width: 80, minZ: -24, maxZ: 36 };

/**
 * Biçilmiş çim şeritleri ve ceza sahası çizgileri, gerçek ölçülerle. Şeritler aynı
 * yeşilin açık ve koyu tonudur; üstüne geniş renk dalgalanmaları, penaltı noktasında
 * ve kale ağzında aşınma eklenir. Yakından görünen çim dokusu `createGrassDetail`'dadır.
 */
export function createGroundTexture(): THREE.CanvasTexture {
  const scale = 25.6;
  const { canvas, ctx } = canvasOf(2048, 1536);
  const random = seededRandom(7);
  const px = (x: number) => (x + GROUND.width / 2) * scale;
  const pz = (z: number) => (z - GROUND.minZ) * scale;

  for (let z = GROUND.minZ, i = 0; z < GROUND.maxZ; z += 5.5, i++) {
    ctx.fillStyle = i % 2 === 0 ? "#335f2b" : "#457337";
    ctx.fillRect(0, pz(z), canvas.width, 5.5 * scale + 1);
  }

  /** Yumuşak kenarlı renk lekesi; metre cinsinden. */
  const patch = (x: number, z: number, radius: number, color: string, alpha: number) => {
    const gradient = ctx.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), radius * scale);
    gradient.addColorStop(0, `rgba(${color},${alpha})`);
    gradient.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(px(x - radius), pz(z - radius), radius * 2 * scale, radius * 2 * scale);
  };

  for (let i = 0; i < 420; i++) {
    const x = (random() - 0.5) * GROUND.width;
    const z = GROUND.minZ + random() * (GROUND.maxZ - GROUND.minZ);
    const tone = random();
    const color = tone < 0.4 ? "24,62,22" : tone < 0.75 ? "112,150,62" : "92,128,44";
    patch(x, z, 1 + random() * 5, color, 0.05 + random() * 0.07);
  }

  // Kalecinin ve penaltıcının sürekli bastığı yerlerde çim seyrelir, toprak görünür.
  for (let i = 0; i < 90; i++) {
    patch((random() - 0.5) * 4.4, random() * 2.6, 0.2 + random() * 0.5, "122,104,64", 0.1 + random() * 0.16);
  }
  for (let i = 0; i < 26; i++) {
    const angle = random() * Math.PI * 2;
    const distance = random() * 0.9;
    patch(Math.cos(angle) * distance, 11 + Math.sin(angle) * distance, 0.15 + random() * 0.3, "128,112,70", 0.14 + random() * 0.14);
  }
  patch(0, 11, 1.4, "120,128,66", 0.18);

  for (let i = 0; i < 90000; i++) {
    ctx.fillStyle = random() > 0.5 ? "rgba(120,170,90,0.14)" : "rgba(14,48,18,0.16)";
    ctx.fillRect(random() * canvas.width, random() * canvas.height, 1, 2);
  }

  // Boya çimin üstünde durur: kenarları biraz dağınık, rengi tam beyaz değil.
  const lines = (color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width * scale;
    ctx.beginPath();
    ctx.moveTo(0, pz(0));
    ctx.lineTo(canvas.width, pz(0));
    ctx.stroke();
    ctx.strokeRect(px(-20.16), pz(0), 40.32 * scale, 16.5 * scale);
    ctx.strokeRect(px(-9.16), pz(0), 18.32 * scale, 5.5 * scale);

    const spread = Math.acos(5.5 / 9.15);
    ctx.beginPath();
    ctx.arc(px(0), pz(11), 9.15 * scale, Math.PI / 2 - spread, Math.PI / 2 + spread);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px(0), pz(11), (0.11 + width / 2) * scale, 0, Math.PI * 2);
    ctx.fill();
  };
  lines("rgba(226,234,218,0.35)", 0.17);
  lines("rgba(232,238,226,0.88)", 0.11);

  return finish(canvas);
}

/** Yakın çim dokusunun bir karesinin sahadaki boyu, metre. */
export const GRASS_TILE = 0.5;

/**
 * Tekrar eden çim yaprağı dokusu: `color` gri bir çarpandır (ortalama 0,5), sahanın
 * rengini yaprak yaprak açıp koyulaştırır; `normal` aynı yaprakların kabartmasıdır.
 * Kenarlar sarar, kareler arasında dikiş görünmez.
 */
export function createGrassDetail(): { color: THREE.CanvasTexture; normal: THREE.CanvasTexture } {
  const size = 512;
  const color = canvasOf(size, size);
  const height = canvasOf(size, size);
  const random = seededRandom(13);

  color.ctx.fillStyle = "rgb(104,104,100)";
  color.ctx.fillRect(0, 0, size, size);
  height.ctx.fillStyle = "rgb(30,30,30)";
  height.ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 14000; i++) {
    const x = random() * size;
    const y = random() * size;
    // Biçilmiş çim yapraklarının çoğu aynı yöne yatar.
    const angle = Math.PI / 2 + (random() - 0.5) * 1.3;
    const length = 5 + random() * 13;
    const dx = Math.cos(angle) * length;
    const dy = Math.sin(angle) * length;
    const gray = 92 + random() * 90;
    const warm = (random() - 0.5) * 16;
    const lift = 120 + random() * 135;
    const width = 1 + random() * 1.4;

    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const x0 = x + ox;
        const y0 = y + oy;
        if (x0 + 20 < 0 || x0 - 20 > size || y0 + 20 < 0 || y0 - 20 > size) continue;
        for (const [ctx, style] of [
          [color.ctx, `rgb(${gray + warm},${gray},${gray - warm})`],
          [height.ctx, `rgb(${lift},${lift},${lift})`],
        ] as const) {
          ctx.strokeStyle = style;
          ctx.lineWidth = width;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0 + dx, y0 + dy);
          ctx.stroke();
        }
      }
    }
  }

  // Kabartmadan, sarmalı komşu farklarıyla normal haritası.
  const heights = height.ctx.getImageData(0, 0, size, size).data;
  const normal = canvasOf(size, size);
  const image = normal.ctx.createImageData(size, size);
  const at = (x: number, y: number) => heights[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  const strength = 2.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const ny = (at(x, y + 1) - at(x, y - 1)) * strength;
      const length = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      image.data[i] = ((nx / length) * 0.5 + 0.5) * 255;
      image.data[i + 1] = ((ny / length) * 0.5 + 0.5) * 255;
      image.data[i + 2] = ((1 / length) * 0.5 + 0.5) * 255;
      image.data[i + 3] = 255;
    }
  }
  normal.ctx.putImageData(image, 0, 0);

  const textures = { color: new THREE.CanvasTexture(color.canvas), normal: new THREE.CanvasTexture(normal.canvas) };
  for (const texture of Object.values(textures)) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
  }
  return textures;
}

/** Tribün dokusunun sahnede kaç kez tekrar ettiği; kişi ve sıra ölçüleri buna göre seçildi. */
export const CROWD_REPEAT = { x: 6, y: 3 };

/**
 * Basamaklı tribün: koltuk blokları, aralarında merdivenler ve oturan seyirciler. Her kişi
 * gövde, baş, saç ve omuzlardan çizilir; forma renkleri ev sahibi ağırlıklıdır, bazı koltuklar
 * boştur, birkaç kişi ayakta ya da kol kaldırmıştır. Öndeki sıra arkadakini örter, üst sıralar
 * karartılır; böylece doku kalabalık noktalar değil derinliği olan bir tribün gibi okunur.
 */
export function createCrowdTexture(): THREE.CanvasTexture {
  const width = 2048;
  const rowPitch = 60;
  const rows = 17;
  const seatPitch = 32;
  const { canvas, ctx } = canvasOf(width, rowPitch * rows);
  const random = seededRandom(21);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];

  // Forma ve mont renkleri: ev sahibi kırmızı-beyaz ağırlıklı, aralarda günlük giysiler.
  const shirts = [
    "#c7302f", "#c7302f", "#d8403c", "#ededed", "#f3f3f3", "#e3e3e3", "#2a2d33", "#1f2937",
    "#3b6fb6", "#1d3f7a", "#e2b63a", "#5b6670", "#8a4b2f", "#c9c0ae", "#6b7a4a", "#b8305c",
  ];
  const skins = ["#f1c9a5", "#e5b58d", "#d9a079", "#c68a62", "#a86f4b", "#8a573a", "#6b4129"];
  const hairs = ["#1b1410", "#2d1e14", "#4a2f1d", "#8a6240", "#c9a46b", "#3a3a3a", "#101010"];
  // Koltuklar mat ve koyu; seyirci kalabalığı öne çıksın.
  const seatBlocks = ["#22365f", "#6e2222", "#22365f", "#6f737b", "#22365f", "#6e2222"];
  const aisleEvery = Math.floor(width / 6);

  // Koltuklar: bloklar halinde, her sırada basamak gölgesi.
  for (let r = 0; r < rows; r++) {
    const top = r * rowPitch;
    for (let b = 0; b < 6; b++) {
      ctx.fillStyle = seatBlocks[b];
      ctx.fillRect(b * aisleEvery, top, aisleEvery, rowPitch);
    }
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, top, width, 5);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, top + rowPitch - 10, width, 10);
    for (let x = 0; x < width; x += seatPitch) {
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(x, top + 8, 2, rowPitch - 18);
    }
  }
  // Merdivenler.
  for (let b = 1; b < 6; b++) {
    ctx.fillStyle = "#3a3f47";
    ctx.fillRect(b * aisleEvery - 14, 0, 28, canvas.height);
    for (let y = 0; y < canvas.height; y += 16) {
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(b * aisleEvery - 14, y, 28, 2);
    }
  }

  const person = (cx: number, baseY: number, standing: boolean) => {
    const shirt = pick(shirts);
    const skin = pick(skins);
    const hair = pick(hairs);
    const lean = (random() - 0.5) * 6;
    const bodyH = standing ? 48 : 36;
    const bodyW = 27 + random() * 4;
    const shoulderY = baseY - bodyH;
    // Gövde: yuvarlak omuzlu.
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.moveTo(cx - bodyW / 2, baseY);
    ctx.lineTo(cx - bodyW / 2, shoulderY + 8);
    ctx.quadraticCurveTo(cx - bodyW / 2, shoulderY, cx - bodyW / 2 + 8, shoulderY);
    ctx.lineTo(cx + bodyW / 2 - 8, shoulderY);
    ctx.quadraticCurveTo(cx + bodyW / 2, shoulderY, cx + bodyW / 2, shoulderY + 8);
    ctx.lineTo(cx + bodyW / 2, baseY);
    ctx.closePath();
    ctx.fill();
    // Gövde gölgesi: sağ taraf ve alt kısım (öndeki sıranın gölgesi).
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(cx + bodyW / 2 - 6, shoulderY + 4, 6, bodyH - 4);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(cx - bodyW / 2, baseY - 10, bodyW, 10);
    // Kaldırılmış kol.
    if (random() < 0.08) {
      ctx.strokeStyle = shirt;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      const side = random() < 0.5 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + side * (bodyW / 2 - 3), shoulderY + 6);
      ctx.lineTo(cx + side * (bodyW / 2 + 6), shoulderY - 22);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(cx + side * (bodyW / 2 + 6), shoulderY - 24, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Boyun ve baş.
    const headR = 8 + random() * 1.5;
    const headY = shoulderY - headR + 2;
    ctx.fillStyle = skin;
    ctx.fillRect(cx + lean - 4, shoulderY - 6, 8, 8);
    ctx.beginPath();
    ctx.arc(cx + lean, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    // Saç: üst yarım kapak.
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(cx + lean, headY - 1, headR, Math.PI * 1.05, Math.PI * 1.95);
    ctx.closePath();
    ctx.fill();
    // Yüz gölgesi.
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.beginPath();
    ctx.arc(cx + lean + 2, headY + 2, headR, Math.PI * -0.3, Math.PI * 0.6);
    ctx.closePath();
    ctx.fill();
  };

  // Seyirciler: üst sıradan alta; alttaki (öndeki) sıra üsttekini örter.
  for (let r = 0; r < rows; r++) {
    const baseY = r * rowPitch + rowPitch - 6;
    const shift = r % 2 === 0 ? 0 : seatPitch / 2;
    for (let x = shift + seatPitch / 2; x < width; x += seatPitch) {
      const inAisle = ((x + 14) % aisleEvery) < 28;
      if (inAisle || random() < 0.06) continue;
      person(x + (random() - 0.5) * 4, baseY, random() < 0.05);
    }
  }

  // Derinlik: üst (uzak) sıralar daha karanlık, hafif mavi sis.
  const depth = ctx.createLinearGradient(0, 0, 0, canvas.height);
  depth.addColorStop(0, "rgba(10,14,22,0.5)");
  depth.addColorStop(1, "rgba(10,14,22,0.12)");
  ctx.fillStyle = depth;
  ctx.fillRect(0, 0, width, canvas.height);

  const texture = finish(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(CROWD_REPEAT.x, CROWD_REPEAT.y);
  return texture;
}

export function createAdBoardTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = canvasOf(1024, 64);
  ctx.fillStyle = "#123a7a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 40px system-ui, Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("GOALSPOT", 256, 34);
  ctx.fillStyle = "#f2b632";
  ctx.fillText("GOALSPOT", 768, 34);
  const texture = finish(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(7, 1);
  return texture;
}

/** Reklam bandı: tribünün önündeki duvarda, mavi panonun üstünde kayan şerit (metre). */
export const AD_BAND = { width: 150, height: 1.1, bottom: 0.9, z: -8.7 };
const AD_BAND_PX = 256;
/** Doku çözünürlüğü: her tuval pikseli bandın yüksekliği üzerinden metreye çevrilir. */
const AD_METERS_PER_PX = AD_BAND.height / AD_BAND_PX;
/** WebGL doku sınırının altında güvenli genişlik. */
const AD_MAX_WIDTH = 8192;

export interface AdBandItem {
  text: string;
  image: HTMLImageElement | null;
}

/**
 * Reklamları tek bir uzun şeride çizer; şerit bant boyunca tekrar eder ve `offset.x` ile
 * kaydırılır. `repeat.x` bandın kaç şerit genişliğinde olduğunu verir (kaydırma hızı buna
 * bölünür). Hiç reklam yoksa oyunun adı yazılır.
 */
export function createAdBandTexture(items: AdBandItem[]): THREE.CanvasTexture {
  const list = items.length > 0 ? items : [{ text: "GOALSPOT", image: null }];
  const gap = 140;
  const pad = 40;
  const font = "700 120px system-ui, Arial, sans-serif";
  const imageHeight = AD_BAND_PX - 2 * pad;

  // Önce ölçüm: her reklamın genişliği.
  const measure = canvasOf(1, 1).ctx;
  measure.font = font;
  const widths = list.map(({ text, image }) => {
    const imageWidth = image ? (image.naturalWidth / image.naturalHeight) * imageHeight : 0;
    const textWidth = text ? measure.measureText(text).width : 0;
    return imageWidth + (image && text ? pad : 0) + textWidth;
  });
  const total = widths.reduce((sum, w) => sum + w + gap, 0);
  // Çok uzun içerik sığmazsa ölçek küçültülür; şerit yine tek parça kalır.
  const scale = Math.min(1, AD_MAX_WIDTH / total);
  const width = Math.max(512, Math.ceil(total * scale));

  const { canvas, ctx } = canvasOf(width, AD_BAND_PX);
  ctx.fillStyle = "#101826";
  ctx.fillRect(0, 0, width, AD_BAND_PX);
  // İnce üst ve alt ışık çizgisi: pano gibi görünsün.
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(0, 0, width, 4);
  ctx.fillRect(0, AD_BAND_PX - 4, width, 4);

  ctx.scale(scale, scale);
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  let x = gap / 2;
  list.forEach(({ text, image }, i) => {
    if (image) {
      const imageWidth = (image.naturalWidth / image.naturalHeight) * imageHeight;
      ctx.drawImage(image, x, pad, imageWidth, imageHeight);
      x += imageWidth + (text ? pad : 0);
    }
    if (text) {
      ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#f2b632";
      ctx.fillText(text, x, AD_BAND_PX / 2 + 6);
    }
    x += widths[i] - (image ? (image.naturalWidth / image.naturalHeight) * imageHeight + (text ? pad : 0) : 0);
    x += gap;
  });

  const texture = finish(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(AD_BAND.width / (width * AD_METERS_PER_PX), 1);
  return texture;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Top deseni (kesik ikosahedron): 12 beşgen ve 20 altıgen; renkler ve beşgen çevresindeki
 * halka `BallStyle`'dan gelir, böylece her turnuvanın topu farklı görünür. Dikişler renkte
 * ince koyu çizgi, yükseklik haritasında oluk olarak çizilir.
 */
export function createBallTextures(style: BallStyle = CLASSIC_BALL): {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  const width = 1024;
  const height = 512;
  const color = canvasOf(width, height);
  const relief = canvasOf(width, height);
  const colorImage = color.ctx.createImageData(width, height);
  const reliefImage = relief.ctx.createImageData(width, height);
  const hexRgb = hexToRgb(style.hex);
  const seamRgb = hexToRgb(style.seam);
  const pentagonRgb = style.pentagons.map(hexToRgb);
  const ringRgb = style.ring?.colors.map(hexToRgb) ?? [];
  const ringWidth = style.ring?.width ?? 0;

  const phi = (1 + Math.sqrt(5)) / 2;
  const unit = (v: number[]) => {
    const length = Math.hypot(v[0], v[1], v[2]);
    return v.map((n) => n / length);
  };
  const pentagons = [
    [0, 1, phi], [0, 1, -phi], [0, -1, phi], [0, -1, -phi],
    [1, phi, 0], [1, -phi, 0], [-1, phi, 0], [-1, -phi, 0],
    [phi, 0, 1], [phi, 0, -1], [-phi, 0, 1], [-phi, 0, -1],
  ].map(unit);
  const inverse = 1 / phi;
  const hexagons = [
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
    [0, inverse, phi], [0, inverse, -phi], [0, -inverse, phi], [0, -inverse, -phi],
    [inverse, phi, 0], [inverse, -phi, 0], [-inverse, phi, 0], [-inverse, -phi, 0],
    [phi, 0, inverse], [phi, 0, -inverse], [-phi, 0, inverse], [-phi, 0, -inverse],
  ].map(unit);

  // Beşgenin iç yarıçapı altıgeninkinden küçüktür; açılar buna göre ağırlıklandırılır.
  const PENTAGON_WEIGHT = 1 / 0.794;
  const SEAM_WIDTH = 0.022;

  for (let py = 0; py < height; py++) {
    const lat = ((py + 0.5) / height) * Math.PI;
    const sinLat = Math.sin(lat);
    const dy = Math.cos(lat);
    for (let px = 0; px < width; px++) {
      const lon = ((px + 0.5) / width) * Math.PI * 2;
      const dx = sinLat * Math.cos(lon);
      const dz = sinLat * Math.sin(lon);

      let nearest = Infinity;
      let second = Infinity;
      let nearestPentagon = -1;
      let secondPentagon = -1;
      const visit = (points: number[][], weight: number, isPentagon: boolean) => {
        points.forEach(([x, y, z], index) => {
          const angle = Math.acos(Math.min(dx * x + dy * y + dz * z, 1)) * weight;
          if (angle < nearest) {
            second = nearest;
            secondPentagon = nearestPentagon;
            nearest = angle;
            nearestPentagon = isPentagon ? index : -1;
          } else if (angle < second) {
            second = angle;
            secondPentagon = isPentagon ? index : -1;
          }
        });
      };
      visit(pentagons, PENTAGON_WEIGHT, true);
      visit(hexagons, 1, false);

      const edge = second - nearest;
      const seam = edge < SEAM_WIDTH;
      let rgb: [number, number, number];
      if (seam) {
        rgb = seamRgb;
      } else if (nearestPentagon >= 0) {
        rgb = pentagonRgb[nearestPentagon % pentagonRgb.length];
        if (style.mosaic) {
          // Beşgen içinde yöne bağlı kararlı piksel mozaiği: koyu-açık gri kareler.
          const cell = Math.floor((px / 14) * 7 + Math.floor(py / 14) * 13) % 5;
          const lift = [0, 18, 36, 10, 26][cell];
          rgb = [rgb[0] + lift, rgb[1] + lift, rgb[2] + lift];
        }
      } else if (secondPentagon >= 0 && ringWidth > 0 && edge < SEAM_WIDTH + ringWidth) {
        // Beşgene komşu altıgen kenarı: turnuva rengi halka.
        rgb = ringRgb[secondPentagon % ringRgb.length];
      } else {
        rgb = hexRgb;
      }
      const puff = seam ? 40 : 200 + Math.min(edge * 180, 55);

      const at = (py * width + px) * 4;
      colorImage.data[at] = rgb[0];
      colorImage.data[at + 1] = rgb[1];
      colorImage.data[at + 2] = rgb[2];
      colorImage.data[at + 3] = 255;
      reliefImage.data[at] = puff;
      reliefImage.data[at + 1] = puff;
      reliefImage.data[at + 2] = puff;
      reliefImage.data[at + 3] = 255;
    }
  }
  color.ctx.putImageData(colorImage, 0, 0);
  relief.ctx.putImageData(reliefImage, 0, 0);

  const bump = new THREE.CanvasTexture(relief.canvas);
  bump.anisotropy = 8;
  return { map: finish(color.canvas), bump };
}
