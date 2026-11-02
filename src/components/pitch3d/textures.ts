import * as THREE from "three";

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

/** Basamaklar halinde oturan kalabalık. */
export function createCrowdTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = canvasOf(1024, 512);
  const random = seededRandom(21);
  const colors = ["#c94f4f", "#e8e4d8", "#3f6fb5", "#e0b23c", "#2b2f36", "#d98a5b", "#7a8794"];
  ctx.fillStyle = "#171c24";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 4; y < canvas.height; y += 13) {
    ctx.fillStyle = "#0f1319";
    ctx.fillRect(0, y + 8, canvas.width, 3);
    for (let x = 3; x < canvas.width; x += 9) {
      if (random() < 0.08) continue;
      ctx.fillStyle = colors[Math.floor(random() * colors.length)];
      ctx.fillRect(x, y + 3, 6, 6);
      ctx.fillStyle = "#d8ad8c";
      ctx.fillRect(x + 1.5, y, 3, 3);
    }
  }
  const texture = finish(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 5);
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
  ctx.fillText("PENALTI TAHMİN", 256, 34);
  ctx.fillStyle = "#f2b632";
  ctx.fillText("PENALTI TAHMİN", 768, 34);
  const texture = finish(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(7, 1);
  return texture;
}

/**
 * Gerçek top deseni (kesik ikosahedron): 12 siyah beşgen ve 20 beyaz altıgen.
 * Dikişler renkte ince koyu çizgi, yükseklik haritasında oluk olarak çizilir.
 */
export function createBallTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const width = 1024;
  const height = 512;
  const color = canvasOf(width, height);
  const relief = canvasOf(width, height);
  const colorImage = color.ctx.createImageData(width, height);
  const reliefImage = relief.ctx.createImageData(width, height);

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
      let black = false;
      const visit = (points: number[][], weight: number, isBlack: boolean) => {
        for (const [x, y, z] of points) {
          const angle = Math.acos(Math.min(dx * x + dy * y + dz * z, 1)) * weight;
          if (angle < nearest) {
            second = nearest;
            nearest = angle;
            black = isBlack;
          } else if (angle < second) {
            second = angle;
          }
        }
      };
      visit(pentagons, PENTAGON_WEIGHT, true);
      visit(hexagons, 1, false);

      const edge = second - nearest;
      const seam = edge < SEAM_WIDTH;
      const shade = seam ? 70 : black ? 26 : 240;
      const puff = seam ? 40 : 200 + Math.min(edge * 180, 55);

      const at = (py * width + px) * 4;
      colorImage.data[at] = shade;
      colorImage.data[at + 1] = shade;
      colorImage.data[at + 2] = shade;
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
