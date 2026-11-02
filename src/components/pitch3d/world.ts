import * as THREE from "three";
import type { PenaltyAnswer, Player, Zone } from "@/game/types";
import {
  backNetZ,
  BALL_RADIUS,
  ballPosition,
  clamp01,
  easeOut,
  flightTime,
  GOAL,
  KICK_AT,
  zoneCenter,
} from "./animation";
import { createHumanoid, poseKeeper, poseShooter } from "./humanoid";
import { createKeeperRig, type KeeperRig } from "./keeperClip";
import { CLOTH_STEP, createGoalNetCloth } from "./netCloth";
import { MODEL_SCALE } from "./riggedModel";
import { createShooterRig, type ShooterRig } from "./shooterClip";
import {
  createAdBoardTexture,
  createBallTextures,
  createCrowdTexture,
  createGrassDetail,
  createGroundTexture,
  GRASS_TILE,
  GROUND,
} from "./textures";

const HALF_WIDTH = GOAL.width / 2;
const POST_RADIUS = 0.06;
const COLORS = { selected: 0x3b82f6, real: 0xf59e0b, hit: 0x22c55e };
/** Gol sonrası filenin hareket ettiği süre; sonra hesap durur. */
const NET_ACTIVE_TIME = 3;
/** Sekme arka planda kalınca birikmiş hesabın tek karede yapılmasını önler. */
const NET_MAX_CATCH_UP = 0.25;

/**
 * Saha dokusu uzaktan şeritleri ve çizgileri verir; yakından iki ölçekte tekrar eden çim
 * dokusu rengi yaprak yaprak açıp koyulaştırır. İki ölçek, tekrarın göze batmasını önler.
 */
function createGround() {
  const depth = GROUND.maxZ - GROUND.minZ;
  const detail = createGrassDetail();
  const repeat = new THREE.Vector2(GROUND.width / GRASS_TILE, depth / GRASS_TILE);
  detail.normal.repeat.copy(repeat);

  const material = new THREE.MeshStandardMaterial({
    map: createGroundTexture(),
    normalMap: detail.normal,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 0.93,
  });
  // Gölgelendiriciye elle verilen doku; dispose sırasında bulunabilsin.
  material.userData.textures = [detail.color];
  material.onBeforeCompile = (shader) => {
    shader.uniforms.grassDetail = { value: detail.color };
    shader.uniforms.grassRepeat = { value: repeat };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D grassDetail;\nuniform vec2 grassRepeat;")
      .replace(
        "#include <map_fragment>",
        [
          "#include <map_fragment>",
          "float grassFine = texture2D(grassDetail, vMapUv * grassRepeat).g * 2.0;",
          "float grassCoarse = texture2D(grassDetail, vMapUv * grassRepeat * 0.21 + 0.37).g * 2.0;",
          "diffuseColor.rgb *= grassFine * mix(1.0, grassCoarse, 0.45);",
        ].join("\n"),
      );
  };

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(GROUND.width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.z = (GROUND.minZ + GROUND.maxZ) / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function createStands() {
  const group = new THREE.Group();

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(120, 1.05, 0.2),
    new THREE.MeshBasicMaterial({ map: createAdBoardTexture() }),
  );
  board.position.set(0, 0.52, -6);
  group.add(board);

  const crowdFrom = new THREE.Vector3(0, 1.6, -9);
  const crowdTo = new THREE.Vector3(0, 19, -30);
  const slope = crowdFrom.distanceTo(crowdTo);
  const crowd = new THREE.Mesh(
    new THREE.PlaneGeometry(150, slope),
    new THREE.MeshBasicMaterial({ map: createCrowdTexture(), color: 0x70747c }),
  );
  crowd.position.copy(crowdFrom).add(crowdTo).multiplyScalar(0.5);
  crowd.rotation.x = -Math.atan2(crowdFrom.z - crowdTo.z, crowdTo.y - crowdFrom.y);
  group.add(crowd);

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(150, 1.6, 0.3),
    new THREE.MeshBasicMaterial({ color: 0x1b2028 }),
  );
  wall.position.set(0, 0.8, -8.9);
  group.add(wall);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(150, 0.6, 16),
    new THREE.MeshBasicMaterial({ color: 0x12161c }),
  );
  roof.position.set(0, 20.5, -26);
  group.add(roof);

  for (const x of [-48, -32, -16, 0, 16, 32, 48]) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.5, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xf4f7ff }),
    );
    lamp.position.set(x, 19.9, -18.05);
    group.add(lamp);
  }

  return group;
}

function pushSegment(target: number[], a: number[], b: number[]) {
  target.push(a[0], a[1], a[2], b[0], b[1], b[2]);
}

function netMaterial() {
  return new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
}

/** Kalenin yan fileleri; hareket etmez. */
function createSideNets() {
  const points: number[] = [];
  const topZ = backNetZ(GOAL.height);

  for (const x of [-HALF_WIDTH, HALF_WIDTH]) {
    for (let i = 1; i <= 12; i++) {
      const z = (i / 12) * -2;
      const top = z > topZ ? GOAL.height : GOAL.height * ((z + 2) / 1.1);
      pushSegment(points, [x, 0, z], [x, top, z]);
    }
    for (let i = 1; i <= 14; i++) {
      const y = (i / 15) * GOAL.height;
      pushSegment(points, [x, y, 0], [x, y, backNetZ(y)]);
    }
    pushSegment(points, [x, 0, 0], [x, 0, -2]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return new THREE.LineSegments(geometry, netMaterial());
}

/** Kumaş filenin çizimi ve vuruş boyunca topla birlikte ilerletilmesi. */
function createNetCloth() {
  const cloth = createGoalNetCloth();

  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(cloth.positions, 3);
  position.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", position);
  geometry.setIndex(cloth.edges);
  const mesh = new THREE.LineSegments(geometry, netMaterial());
  mesh.frustumCulled = false;

  let simulated = 0;
  let dirty = false;
  /** Sabit adımlarla ilerler; kare hızı düşse de top ve file aynı davranır. */
  const update = (t: number | null, shot: PenaltyAnswer | null) => {
    if (t === null || !shot || shot.outcome !== "goal") {
      if (dirty) {
        cloth.reset();
        position.needsUpdate = true;
      }
      dirty = false;
      simulated = 0;
      return;
    }

    const start = KICK_AT + flightTime(shot.shot);
    const end = start + NET_ACTIVE_TIME;
    simulated = Math.max(simulated, start, t - NET_MAX_CATCH_UP);
    if (simulated >= Math.min(t, end)) return;

    while (simulated < Math.min(t, end)) {
      simulated += CLOTH_STEP;
      const [x, y, z] = ballPosition(simulated, shot);
      cloth.step({ x, y, z, radius: BALL_RADIUS + 0.03 });
    }
    position.needsUpdate = true;
    dirty = true;
  };

  return { mesh, update };
}

function createFrame() {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.1 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.5, metalness: 0.4 });
  const bar = (length: number) =>
    new THREE.Mesh(new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, length, 18), white);

  /** İki nokta arasında fileyi taşıyan ince boru. */
  const strut = (from: THREE.Vector3, to: THREE.Vector3) => {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, from.distanceTo(to), 10),
      steel,
    );
    pipe.position.copy(from).add(to).multiplyScalar(0.5);
    pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    pipe.castShadow = true;
    group.add(pipe);
  };

  const topZ = backNetZ(GOAL.height);
  const backZ = backNetZ(0);
  const ground = 0.025;
  strut(new THREE.Vector3(-HALF_WIDTH, ground, backZ), new THREE.Vector3(HALF_WIDTH, ground, backZ));
  strut(new THREE.Vector3(-HALF_WIDTH, GOAL.height, topZ), new THREE.Vector3(HALF_WIDTH, GOAL.height, topZ));
  for (const x of [-HALF_WIDTH, HALF_WIDTH]) {
    strut(new THREE.Vector3(x, ground, 0), new THREE.Vector3(x, ground, backZ));
    strut(new THREE.Vector3(x, ground, backZ), new THREE.Vector3(x, GOAL.height, topZ));
    strut(new THREE.Vector3(x, GOAL.height, 0), new THREE.Vector3(x, GOAL.height, topZ));
  }

  for (const x of [-HALF_WIDTH, HALF_WIDTH]) {
    const post = bar(GOAL.height + POST_RADIUS);
    post.position.set(x, (GOAL.height + POST_RADIUS) / 2, 0);
    post.castShadow = true;
    group.add(post);
  }
  const crossbar = bar(GOAL.width + POST_RADIUS * 2);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, GOAL.height, 0);
  crossbar.castShadow = true;
  group.add(crossbar);
  return group;
}

function createHighlight() {
  const width = GOAL.width / 3;
  const height = GOAL.height / 3;
  const fill = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.48, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), fill);
  const edge = new THREE.LineBasicMaterial();
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(width - 0.03, height - 0.03)),
    edge,
  );
  mesh.add(outline);
  mesh.visible = false;

  const show = (zone: Zone | null, color: number) => {
    mesh.visible = zone !== null;
    if (!zone) return;
    const [x, y] = zoneCenter(zone);
    mesh.position.set(x, y, 0.03);
    fill.color.setHex(color);
    edge.color.setHex(color);
  };
  return { mesh, show };
}

export interface FrameInput {
  clock: number;
  /** Vuruş başladıktan sonra geçen süre; başlamadıysa null. */
  t: number | null;
  shot: PenaltyAnswer | null;
  selected: Zone | null;
  revealZone: boolean;
  foot: Player["foot"];
  delta: number;
}

export function createWorld() {
  const group = new THREE.Group();

  const hemi = new THREE.HemisphereLight(0xcfdcf0, 0x28402c, 1.5);
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(7, 22, 16);
  sun.target.position.set(0, 0, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 16, bottom: -14, near: 1, far: 60 });
  sun.shadow.bias = -0.0005;
  const fillLight = new THREE.DirectionalLight(0xdfe8ff, 0.8);
  fillLight.position.set(-10, 14, 8);
  group.add(hemi, sun, sun.target, fillLight);

  group.add(createGround(), createStands(), createFrame(), createSideNets());
  const netCloth = createNetCloth();
  group.add(netCloth.mesh);

  const ballTextures = createBallTextures();
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 48, 32),
    new THREE.MeshStandardMaterial({
      map: ballTextures.map,
      bumpMap: ballTextures.bump,
      bumpScale: 1.5,
      roughness: 0.38,
    }),
  );
  ball.castShadow = true;
  group.add(ball);

  const keeper = createHumanoid({
    shirt: "#e0a526",
    shorts: "#23272e",
    socks: "#e0a526",
    skin: "#d9a982",
    hair: "#2a1d14",
    hands: "#f4f4f0",
  });
  const shooter = createHumanoid({
    shirt: "#b3262e",
    shorts: "#f2f2f2",
    socks: "#b3262e",
    skin: "#c98f68",
    hair: "#16110d",
    hands: "#c98f68",
  });
  group.add(keeper.root, shooter.root);

  let keeperRig: KeeperRig | null = null;

  /** Yüklenen modeli, içindeki dalışı, bekleme ve yakalama hareketini kapsül kalecinin yerine koyar. */
  const attachKeeperModel = (
    model: THREE.Group,
    idleClip: THREE.AnimationClip | null,
    catchClip: THREE.AnimationClip | null,
  ): boolean => {
    keeperRig = createKeeperRig(model, MODEL_SCALE, idleClip, catchClip);
    if (!keeperRig) return false;
    group.add(model);
    keeper.root.visible = false;
    return true;
  };

  let shooterRig: ShooterRig | null = null;

  /** Yüklenen modeli ve içindeki koşu ile vuruşu kapsül penaltıcının yerine koyar. */
  const attachShooterModel = (model: THREE.Group): boolean => {
    shooterRig = createShooterRig(model, MODEL_SCALE);
    if (!shooterRig) return false;
    group.add(model);
    shooter.root.visible = false;
    return true;
  };

  const selectedMark = createHighlight();
  const realMark = createHighlight();
  group.add(selectedMark.mesh, realMark.mesh);

  const update = ({ clock, t, shot, selected, revealZone, foot, delta }: FrameInput) => {
    const animating = t !== null && shot !== null;

    if (keeperRig) keeperRig.update(clock, t, shot);
    else poseKeeper(keeper, clock, t, shot);
    if (shooterRig) shooterRig.update(t, foot);
    else poseShooter(shooter, clock, t, foot);

    if (animating) {
      // Ortada yakalanan top sekmez, kalecinin ellerinde kalır.
      const held = keeperRig?.heldBall(t, shot);
      if (held) ball.position.copy(held);
      else ball.position.set(...ballPosition(t, shot));
      const spinUntil = KICK_AT + flightTime(shot.shot) + (held ? 0 : 0.3);
      if (t > KICK_AT && t < spinUntil) ball.rotation.x -= delta * 16;
    } else {
      ball.position.set(0, BALL_RADIUS, 11);
      ball.rotation.set(0, 0, 0);
    }
    netCloth.update(t, shot);

    const real = revealZone && shot ? shot.zone : null;
    const hit = !!real && !!selected && real.col === selected.col && real.row === selected.row;
    selectedMark.show(hit ? null : selected, COLORS.selected);
    realMark.show(real, hit ? COLORS.hit : COLORS.real);
  };

  const dispose = () => {
    group.traverse((object) => {
      const { geometry, material } = object as THREE.Mesh;
      geometry?.dispose();
      for (const item of [material].flat() as (THREE.MeshStandardMaterial | undefined)[]) {
        if (!item) continue;
        for (const texture of [item.map, item.normalMap, item.bumpMap, ...(item.userData.textures ?? [])]) {
          texture?.dispose();
        }
        item.dispose();
      }
    });
  };

  return { group, update, dispose, attachKeeperModel, attachShooterModel };
}

// Kamera penaltıcının biraz gerisinde; dar açıyla kale büyük, yakındaki penaltıcı küçük görünür.
const CAMERA = { x: 0, y: 1.7, z: 20, lookY: 0.45 };

/** Tahmin sırasında sabit durur, vuruşta penaltıcının karşı tarafına süzülür. */
export function placeCamera(camera: THREE.Camera, t: number | null, foot: Player["foot"]) {
  const move = t === null ? 0 : easeOut(clamp01(t / 1.1));
  const away = foot === "right" ? 1.7 : -1.7;
  camera.position.set(CAMERA.x + away * move, CAMERA.y + 0.9 * move, CAMERA.z - 0.8 * move);
  camera.lookAt(0, CAMERA.lookY, 0);
  camera.updateMatrixWorld();
}

/** Kale ağzının ekrandaki yeri, yüzde olarak; bölge butonları buna göre yerleşir. */
export function projectGoal(camera: THREE.Camera) {
  const corners = [
    [-HALF_WIDTH, GOAL.height],
    [HALF_WIDTH, GOAL.height],
    [-HALF_WIDTH, 0],
    [HALF_WIDTH, 0],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0).project(camera));
  const xs = corners.map((c) => ((c.x + 1) / 2) * 100);
  const ys = corners.map((c) => ((1 - c.y) / 2) * 100);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${Math.max(...xs) - left}%`,
    height: `${Math.max(...ys) - top}%`,
  };
}
