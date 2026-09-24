/**
 * THE LEVEL IN THREE DIMENSIONS, off `level.ts`'s grounds and nothing else.
 *
 * A ROCK CELL BESIDE FLOOR IS A WALL, and its HEIGHT is where it stands from
 * the camera: floor to its south or east means its face looks at the camera
 * and it stands tall, the back of the diorama; anything else is a broken
 * parapet at the front, so no wall ever stands between the eye and a room.
 * What still gets in the way — a column, a statue, a thin wall — is dithered
 * open round the hero by `xray`.
 *
 * Every surface is UV'd in WORLD metres, so a texture runs on across cells.
 */
import * as THREE from 'three';
import type { Assets } from './assets';
import { groundAt, HEIGHT, MARKS, PROPS, walks, WIDTH, WINDOWS } from './level';
import type { Ground, PropKind, PropSpot } from './level';
import { lava, patch } from './shaders';
import type { Shared } from './shaders';

export const WALL_TALL = 5.6;
export const WALL_LOW = 0.95;
export const LAVA_Y = -2.4;

/** Largest side of each prop in metres; the models all arrive a unit box. */
const PROP_SIZE: Record<PropKind, number> = {
  column: 6.4, brazier: 1.3, candelabra: 2.05, candles: 0.95, skulls: 1.35, sarcophagus: 2.3, statue: 3.0,
  altar: 2.3, pew: 2.8, cage: 2.5, sconce: 0.95, rubble: 2.1, spikes: 2.7, chest: 1.1, arch: 4.9, throne: 3.4, banner: 3.5,
};
/** Props tall enough to hide the hero, which take the x-ray. */
const TALL: PropKind[] = ['column', 'statue', 'arch', 'cage', 'banner', 'throne', 'candelabra'];
/** How far above its own flame a prop's lamp hangs. */
const LIFT: Partial<Record<LightKind, number>> = { brazier: 1.3, candelabra: 0.7, candles: 1.5, sconce: 0.45 };

export type LightKind = 'brazier' | 'candelabra' | 'candles' | 'sconce' | 'lava' | 'circle' | 'window';
export interface LightSource {
  kind: LightKind;
  at: THREE.Vector3;
  color: THREE.Color;
  power: number;
  range: number;
  flicker: number;
  seed: number;
}
export interface Flame {
  at: THREE.Vector3;
  size: number;
  kind: 'candle' | 'torch' | 'brazier';
}

export interface World {
  group: THREE.Group;
  lights: LightSource[];
  flames: Flame[];
  embers: THREE.Vector3[]; // where lava throws sparks up from
  windows: { at: THREE.Vector3; width: number; height: number }[];
  circle: THREE.Mesh;
  marks: THREE.Group; // everything painted on the floor
}

const LIGHT: Record<LightKind, { color: number; power: number; range: number; flicker: number }> = {
  brazier: { color: 0xff7426, power: 42, range: 10, flicker: 0.28 },
  candelabra: { color: 0xffa25c, power: 16, range: 7, flicker: 0.16 },
  candles: { color: 0xff9448, power: 7, range: 5, flicker: 0.2 },
  sconce: { color: 0xff8a3a, power: 20, range: 8, flicker: 0.24 },
  lava: { color: 0xff4a12, power: 20, range: 8, flicker: 0.12 },
  circle: { color: 0xff2a10, power: 38, range: 10, flicker: 0.1 },
  window: { color: 0xff3526, power: 26, range: 11, flicker: 0.04 },
};

const isRock = (x: number, y: number): boolean => groundAt(x, y) === 'rock';
const isLava = (x: number, y: number): boolean => groundAt(x, y) === 'lava';
const isFloor = (x: number, y: number): boolean => walks(groundAt(x, y));

/** Distance in cells to the nearest rock or lava, for the floor's baked occlusion. */
function openness(): Float32Array {
  const d = new Float32Array(WIDTH * HEIGHT).fill(99);
  const queue: number[] = [];
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) if (!isFloor(x, y)) (d[y * WIDTH + x] = 0), queue.push(y * WIDTH + x);
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    const x = i % WIDTH;
    const y = (i / WIDTH) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= WIDTH || ny >= HEIGHT) continue;
      const j = ny * WIDTH + nx;
      if (d[j] > d[i] + 1) (d[j] = d[i] + 1), queue.push(j);
    }
  }
  return d;
}

/** A quad from four corners, UV'd by the caller's projection, into flat arrays. */
class Builder {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  quad(a: number[], b: number[], c: number[], d: number[], n: number[], uv: (p: number[]) => number[], shade: number[] = [1, 1, 1, 1]): void {
    const verts = [a, b, c, a, c, d];
    const shades = [shade[0], shade[1], shade[2], shade[0], shade[2], shade[3]];
    verts.forEach((p, i) => {
      this.pos.push(...p);
      this.nor.push(...n);
      this.uv.push(...uv(p));
      this.col.push(shades[i], shades[i], shades[i]);
    });
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  }
}

/** A box whose texture is laid at `tile` metres a repeat on every face, rather than stretched once across each. */
function stoneBox(w: number, h: number, d: number, tile = 2): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  const faces: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  faces.forEach(([u, v], f) => {
    for (let i = f * 4; i < f * 4 + 4; i++) uv.setXY(i, (uv.getX(i) * u) / tile, (uv.getY(i) * v) / tile);
  });
  return geo;
}

function surface(assets: Assets, id: string, tint: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  const s = assets.surfaces[id];
  return new THREE.MeshStandardMaterial({
    map: s.albedo,
    normalMap: s.normal,
    roughnessMap: s.rough,
    roughness: 1,
    metalness: 0,
    color: tint,
    vertexColors: true,
    normalScale: new THREE.Vector2(1.25, 1.25),
    ...extra,
  });
}

const FLOOR_TINT: Record<Exclude<Ground, 'rock' | 'lava'>, number> = { flag: 0xc4b6a8, crypt: 0x9a9aa4, bridge: 0xb09a8a };

function floors(assets: Assets, shared: Shared): THREE.Object3D[] {
  const open = openness();
  const shadeAt = (cx: number, cy: number): number => {
    // A CORNER takes the mean of its four cells' openness, so the occlusion is
    // continuous across the floor rather than stepped a cell at a time.
    let sum = 0;
    for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) sum += Math.min(4, open[(cy + dy) * WIDTH + cx + dx] ?? 0);
    const t = sum / 4 / 3.2;
    return 0.34 + 0.66 * Math.min(1, t * t * (3 - 2 * t) + 0.12);
  };
  const out: THREE.Object3D[] = [];
  for (const g of ['flag', 'crypt', 'bridge'] as const) {
    const b = new Builder();
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        if (groundAt(x, y) !== g) continue;
        const s = [shadeAt(x, y), shadeAt(x + 1, y), shadeAt(x + 1, y + 1), shadeAt(x, y + 1)];
        b.quad([x - 0.5, 0, y - 0.5], [x - 0.5, 0, y + 0.5], [x + 0.5, 0, y + 0.5], [x + 0.5, 0, y - 0.5], [0, 1, 0],
          (p) => [p[0] / 3.4, -p[2] / 3.4], [s[0], s[3], s[2], s[1]]);
      }
    }
    const mat = surface(assets, 'floor', FLOOR_TINT[g]);
    patch(mat, shared, { variation: g === 'crypt' ? 0.6 : 1 });
    const mesh = new THREE.Mesh(b.geometry(), mat);
    mesh.receiveShadow = true;
    out.push(mesh);
  }
  return out;
}

/** How tall the wall in this rock cell stands: 0 is void, nobody sees it. */
function heightOf(x: number, y: number): number {
  if (!isRock(x, y)) return 0;
  if (isFloor(x, y + 1) || isFloor(x + 1, y) || isFloor(x + 1, y + 1)) return WALL_TALL;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (isFloor(x + dx, y + dy)) return WALL_LOW;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (isLava(x + dx, y + dy)) return isLava(x, y + 1) || isLava(x + 1, y) ? WALL_TALL * 0.8 : WALL_LOW;
  return 0;
}

/** A broken top: how far below its nominal height a low wall is snapped off. */
function broken(x: number, z: number): number {
  const n = Math.sin(x * 2.1 + z * 1.3) * 0.5 + Math.sin(x * 5.7 - z * 3.1) * 0.25 + Math.sin(x * 11.3 + z * 7.9) * 0.12;
  return Math.max(0, n) * 0.55;
}

function walls(assets: Assets, shared: Shared): THREE.Object3D[] {
  const stone = new Builder();
  const rock = new Builder();
  const caps = new Builder();
  const near = (x: number, y: number) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (isLava(x + dx, y + dy)) return true;
    return false;
  };
  const faceUv = (axis: 0 | 2) => (p: number[]) => [p[axis] / 3.2, p[1] / 3.2];
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const h = heightOf(x, y);
      if (h === 0) continue;
      const into = near(x, y) ? rock : stone;
      const low = h < WALL_TALL * 0.5;
      const top = (px: number, pz: number) => (low ? h - broken(px, pz) : h);
      const x0 = x - 0.5;
      const x1 = x + 0.5;
      const z0 = y - 0.5;
      const z1 = y + 0.5;
      // Each side: down to the floor beside it, to the lava beside it, or to a shorter wall.
      const side = (nx: number, ny: number): number | null => {
        if (isFloor(nx, ny)) return 0;
        if (isLava(nx, ny)) return LAVA_Y - 0.3;
        const other = heightOf(nx, ny);
        return other < h ? other : null;
      };
      const s = side(x, y + 1);
      if (s !== null) into.quad([x0, s, z1], [x1, s, z1], [x1, top(x1, z1), z1], [x0, top(x0, z1), z1], [0, 0, 1], faceUv(0), [0.55, 0.55, 1, 1]);
      const e = side(x + 1, y);
      if (e !== null) into.quad([x1, e, z1], [x1, e, z0], [x1, top(x1, z0), z0], [x1, top(x1, z1), z1], [1, 0, 0], faceUv(2), [0.55, 0.55, 1, 1]);
      const n = side(x, y - 1);
      if (n !== null) into.quad([x1, n, z0], [x0, n, z0], [x0, top(x0, z0), z0], [x1, top(x1, z0), z0], [0, 0, -1], faceUv(0), [0.55, 0.55, 1, 1]);
      const w = side(x - 1, y);
      if (w !== null) into.quad([x0, w, z0], [x0, w, z1], [x0, top(x0, z1), z1], [x0, top(x0, z0), z0], [-1, 0, 0], faceUv(2), [0.55, 0.55, 1, 1]);
      caps.quad([x0, top(x0, z0), z0], [x0, top(x0, z1), z1], [x1, top(x1, z1), z1], [x1, top(x1, z0), z0], [0, 1, 0], (p) => [p[0] / 3, p[2] / 3]);
    }
  }
  const stoneMat = surface(assets, 'wall', 0xb4aaa2);
  patch(stoneMat, shared, { xray: true, rise: WALL_TALL, variation: 0.8 });
  const rockMat = surface(assets, 'rock', 0x9c8e88);
  patch(rockMat, shared, { xray: true, rise: WALL_TALL, lavaLit: true, variation: 0.7 });
  const capMat = surface(assets, 'rock', 0x0e0c0f);
  patch(capMat, shared, { xray: true });
  const out = [new THREE.Mesh(stone.geometry(), stoneMat), new THREE.Mesh(rock.geometry(), rockMat), new THREE.Mesh(caps.geometry(), capMat)];
  for (const m of out) (m.castShadow = true), (m.receiveShadow = true);
  return out;
}

/** The lava, the ledges dropping into it, and the bridge's own sides and piers. */
function wound(assets: Assets, shared: Shared, lights: LightSource[], embers: THREE.Vector3[]): THREE.Object3D[] {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  const cliffs = new Builder();
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (!isLava(x, y)) continue;
      x0 = Math.min(x0, x - 0.5);
      x1 = Math.max(x1, x + 0.5);
      z0 = Math.min(z0, y - 0.5);
      z1 = Math.max(z1, y + 0.5);
      if ((x + y * 3) % 7 === 0) embers.push(new THREE.Vector3(x, LAVA_Y + 0.1, y));
      const drop = (nx: number, ny: number, a: number[], b: number[], n: number[]) => {
        if (!isFloor(nx, ny)) return;
        const bridge = groundAt(nx, ny) === 'bridge';
        const bottom = bridge ? -0.75 : LAVA_Y - 0.3;
        cliffs.quad([a[0], bottom, a[1]], [b[0], bottom, b[1]], [b[0], 0, b[1]], [a[0], 0, a[1]], n,
          (p) => [(p[0] + p[2]) / 3, p[1] / 3], [0.7, 0.7, 1, 1]);
      };
      drop(x, y - 1, [x + 0.5, y - 0.5], [x - 0.5, y - 0.5], [0, 0, 1]);
      drop(x, y + 1, [x - 0.5, y + 0.5], [x + 0.5, y + 0.5], [0, 0, -1]);
      drop(x - 1, y, [x - 0.5, y - 0.5], [x - 0.5, y + 0.5], [1, 0, 0]);
      drop(x + 1, y, [x + 0.5, y + 0.5], [x + 0.5, y - 0.5], [-1, 0, 0]);
    }
  }
  const out: THREE.Object3D[] = [];
  const pit = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 6, z1 - z0 + 6, 1, 1), lava(shared));
  pit.rotation.x = -Math.PI / 2;
  pit.position.set((x0 + x1) / 2, LAVA_Y, (z0 + z1) / 2);
  out.push(pit);
  const cliffMat = surface(assets, 'rock', 0xa89890);
  patch(cliffMat, shared, { lavaLit: true, variation: 0.6 });
  const cliffMesh = new THREE.Mesh(cliffs.geometry(), cliffMat);
  cliffMesh.receiveShadow = true;
  out.push(cliffMesh);

  // PIERS under the bridge, every few metres, standing in the lava.
  const pierMat = surface(assets, 'wall', 0x9a8c84, { vertexColors: false });
  patch(pierMat, shared, { lavaLit: true });
  for (let x = 56; x <= 64; x += 4) {
    const pier = new THREE.Mesh(stoneBox(1.1, 2.6, 4.4), pierMat);
    pier.position.set(x, -1.95, 27.5);
    pier.castShadow = true;
    out.push(pier);
  }
  const lipMat = surface(assets, 'wall', 0x8a7c74, { vertexColors: false });
  patch(lipMat, shared, {});
  for (const z of [25.5, 29.5]) {
    const lip = new THREE.Mesh(stoneBox(x1 - x0 - 0.2, 0.32, 0.34, 1.2), lipMat);
    lip.position.set((x0 + x1) / 2, 0.16, z);
    lip.castShadow = lip.receiveShadow = true;
    out.push(lip);
    for (let x = 54; x <= 66; x += 2) {
      const post = new THREE.Mesh(stoneBox(0.46, 0.78, 0.46, 1.2), lipMat);
      post.position.set(x - 0.5, 0.39, z);
      post.castShadow = post.receiveShadow = true;
      out.push(post);
    }
  }
  for (let x = 55; x <= 65; x += 2.5) {
    for (const z of [18.5, 22.5, 32.5, 36.5]) {
      lights.push(source('lava', new THREE.Vector3(x + (z % 3), LAVA_Y + 1.1, z)));
    }
  }
  return out;
}

function source(kind: LightKind, at: THREE.Vector3): LightSource {
  const l = LIGHT[kind];
  return { kind, at, color: new THREE.Color(l.color), power: l.power, range: l.range, flicker: l.flicker, seed: at.x * 13.7 + at.z * 7.3 };
}

function marks(assets: Assets, shared: Shared): { group: THREE.Group; circle: THREE.Mesh } {
  const group = new THREE.Group();
  let circle: THREE.Mesh | null = null;
  const plane = (w: number, h: number) => new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2);
  for (const m of MARKS) {
    let mesh: THREE.Mesh;
    if (m.kind === 'runner') {
      mesh = new THREE.Mesh(plane(m.length ?? 10, m.size), runner(shared));
      mesh.position.set(m.x + (m.length ?? 10) / 2 - 0.5, 0.012, m.y);
    } else {
      const tex = assets.decals[m.kind];
      const glow = m.kind !== 'blood';
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
        color: glow ? new THREE.Color(m.kind === 'circle' ? 3.2 : 1.1, m.kind === 'circle' ? 1.6 : 0.62, m.kind === 'circle' ? 1 : 0.5) : 0x8a8a8a,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        toneMapped: true,
        fog: false,
      });
      mesh = new THREE.Mesh(plane(m.size, m.size), mat);
      mesh.position.set(m.x, 0.02 + group.children.length * 0.001, m.y);
      mesh.rotation.y = m.rot ?? 0;
      if (m.kind === 'circle') circle = mesh;
    }
    mesh.renderOrder = 2;
    group.add(mesh);
  }
  return { group, circle: circle! };
}

/** The nave's carpet: a torn red runner, drawn rather than generated. */
function runner(shared: Shared): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: shared.uTime },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 p = vUv * vec2(26.0, 2.2);
        float edge = min(vUv.y, 1.0 - vUv.y);
        float torn = n(p * 2.3) * 0.5 + n(p * 7.1) * 0.3;
        float keep = smoothstep(0.02, 0.07, edge + (torn - 0.4) * 0.09) * smoothstep(0.18, 0.4, n(p * 0.6) + 0.25);
        float border = smoothstep(0.1, 0.13, edge) * (1.0 - smoothstep(0.16, 0.19, edge));
        vec3 cloth = mix(vec3(0.075, 0.008, 0.01), vec3(0.13, 0.016, 0.014), n(p * 9.0));
        cloth = mix(cloth, vec3(0.16, 0.1, 0.035), border * 0.7);
        cloth *= 0.65 + 0.35 * n(p * 3.0);
        gl_FragColor = vec4(cloth, keep * 0.92);
      }`,
  });
}

function props(assets: Assets, shared: Shared, lights: LightSource[], flames: Flame[]): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const patched = new Set<THREE.Material>();
  for (const spot of PROPS) {
    const model = assets.models[spot.kind];
    if (!model) continue;
    const obj = model.gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(model.gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    const k = (PROP_SIZE[spot.kind] * (spot.size ?? 1)) / Math.max(size.x, size.y, size.z);
    const squeeze = spot.kind === 'column' ? 0.72 : 1;
    obj.scale.set(k * squeeze, k, k * squeeze);
    obj.rotation.y = spot.rot ?? 0;
    obj.position.set(spot.x, -box.min.y * k, spot.y);
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!patched.has(mat)) {
        patched.add(mat);
        if (mat.emissiveMap) mat.emissiveIntensity = spot.kind === 'brazier' ? 2.2 : spot.kind === 'candles' ? 0.12 : 0.8;
        if (spot.kind === 'candles') mat.color.multiplyScalar(0.55); // pale wax under its own flame reads as a lamp, not a candle
        patch(mat, shared, { xray: TALL.includes(spot.kind), lavaLit: spot.kind === 'spikes', rise: spot.kind === 'column' ? 6.2 : undefined });
      }
    });
    out.push(obj);
    obj.updateMatrixWorld(true);
    const lit = litBy(spot);
    if (lit) {
      const tips = model.meta.flames ?? [];
      for (const [fx, fy, fz, r] of tips) {
        const at = new THREE.Vector3(fx, fy, fz).applyMatrix4(obj.matrixWorld);
        const kind = spot.kind === 'brazier' ? 'brazier' : spot.kind === 'sconce' ? 'torch' : 'candle';
        flames.push({ at, size: kind === 'brazier' ? Math.max(0.34, r * k * 0.7) : kind === 'torch' ? 0.3 : 0.14 * (spot.size ?? 1), kind });
      }
      const high = tips.length ? tips.reduce((a, t) => Math.max(a, t[1]), -Infinity) : box.max.y;
      const clear = LIFT[lit] ?? 0.5; // a lamp INSIDE its flame puts an inverse-square spike on the metal round it
      lights.push(source(lit, new THREE.Vector3(spot.x, (high - box.min.y) * k + clear, spot.y)));
    }
  }
  return out;
}

const litBy = (spot: PropSpot): LightKind | null =>
  spot.kind === 'brazier' ? 'brazier' : spot.kind === 'candelabra' ? 'candelabra' : spot.kind === 'candles' ? 'candles' : spot.kind === 'sconce' ? 'sconce' : null;

/** The stained glass, set into the wall face it names and lit from behind. */
function glass(assets: Assets, lights: LightSource[]): { objects: THREE.Object3D[]; windows: World['windows'] } {
  const objects: THREE.Object3D[] = [];
  const windows: World['windows'] = [];
  WINDOWS.forEach((w, i) => {
    const tex = assets.decals[i === 0 ? 'rose' : 'lancet'] ?? null;
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(2.4, 1.3, 1.1), toneMapped: true, fog: false });
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w.width, w.height), mat);
    pane.position.set(w.x, w.base + w.height / 2, w.y + 0.03);
    objects.push(pane);
    const at = new THREE.Vector3(w.x, w.base + w.height * 0.4, w.y + 1.6);
    windows.push({ at: new THREE.Vector3(w.x, w.base + w.height / 2, w.y + 0.05), width: w.width, height: w.height });
    lights.push(source('window', at));
  });
  return { objects, windows };
}

export function buildWorld(assets: Assets, shared: Shared, circleAt: THREE.Vector3): World {
  const group = new THREE.Group();
  const lights: LightSource[] = [];
  const flames: Flame[] = [];
  const embers: THREE.Vector3[] = [];
  group.add(...floors(assets, shared));
  group.add(...walls(assets, shared));
  group.add(...wound(assets, shared, lights, embers));
  const painted = marks(assets, shared);
  group.add(painted.group);
  group.add(...props(assets, shared, lights, flames));
  const panes = glass(assets, lights);
  group.add(...panes.objects);
  lights.push(source('circle', circleAt.clone().setY(0.8)));
  return { group, lights, flames, embers, windows: panes.windows, circle: painted.circle, marks: painted.group };
}

