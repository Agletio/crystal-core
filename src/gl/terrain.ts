/**
 * THE GROUND OF A DESCENT, off the grid the sim walks on and nothing else.
 *
 * MARCHING SQUARES over the tile corners: a corner is FLOOR if any of its four
 * cells walks, so no floor cell is ever covered and a corridor one tile wide
 * stays open, and a wall stands `WALL_AT` of the way from a floor corner to a
 * rock one — which turns every stair-step of the grid into a diagonal, since
 * the 2D game's rule holds here too: a square corner exists nowhere.
 *
 * A WALL IS TALL WHERE IT IS SEEN ACROSS ITS FLOOR AND LOW WHERE IT STANDS
 * BETWEEN THE FLOOR AND THE CAMERA, blended by its normal against the eye, so
 * the fixed camera never looks at a fight through a cliff. There is no cap: the
 * rock rises into the dark, and the dark is the void behind it.
 *
 * Water sinks the floor under it and lies over it as one surface; the ways in
 * and out are FUNNELS the floor itself runs down into, to a throat of dark:
 * a body that crosses one walks down and out of it, and never stands on air.
 */
import * as THREE from 'three';
import { WALL } from '../sim/grid';
import type { GameMap } from '../sim/grid';
import type { MapTheme } from '../types';
import type { Assets } from './assets';
import { patch } from './shaders';
import type { Shared } from './shaders';
import type { Edge, Round } from './clearance';

/** What a world's ground is made of: surface ids in the shard, tints over them, and how tall its rock stands. */
export interface GroundLook {
  floor: string;
  rock: string;
  floorTint: number;
  rockTint: number;
  tall: number;
  low: number;
  water: number;
  /** Its LIGHT: the dark's tint above and below, what falls from overhead, and the fog. */
  sky: [number, number, number];
  moon: [number, number];
  fog: [number, number];
}

export const LOOKS: Record<MapTheme, GroundLook> = {
  fissure: {
    floor: 'sand', rock: 'cave_rock', floorTint: 0xcfc4ae, rockTint: 0xe2d6c4, tall: 4.2, low: 0.9, water: 0x0c1a1c,
    sky: [0xa89c88, 0x3a2e22, 1.15], moon: [0xe6dac4, 1.5], fog: [0x0b0908, 0.014],
  },
  prismatic: {
    floor: 'sand', rock: 'cave_rock', floorTint: 0x8c93b0, rockTint: 0x9aa2d8, tall: 4.6, low: 0.9, water: 0x101838,
    sky: [0x6676b8, 0x1a2040, 1.0], moon: [0xaec0ff, 1.35], fog: [0x06070e, 0.016],
  },
  demonic: {
    floor: 'sand', rock: 'cave_rock', floorTint: 0x9a6a5c, rockTint: 0xa86a5e, tall: 4.2, low: 0.9, water: 0x2a0806,
    sky: [0x8a4a3a, 0x2a0e0a, 1.0], moon: [0xffb098, 1.3], fog: [0x0c0404, 0.016],
  },
  seam: {
    floor: 'sand', rock: 'cave_rock', floorTint: 0x8a7c9c, rockTint: 0x9a84a8, tall: 4.6, low: 0.9, water: 0x180a24,
    sky: [0x7a5a98, 0x1e1028, 1.0], moon: [0xc0a4ff, 1.25], fog: [0x08050c, 0.016],
  },
};

const WALL_AT = 0.35; // from a floor corner toward the rock corner, where the face stands
const UNDER = 0.18; // the floor runs this far on under the face, so a face pushed back by its noise leaves no crack
const ROWS = 6; // rows a wall is cut into, for its noise to have somewhere to go
const FACE_NOISE = 0.36; // metres a face moves along its own normal
const BOULDER = 14; // cells: a clump of rock this small with floor all round it is boulders
const CAP_REACH = 5; // cells of solid rock capped past the last floor; beyond it the fog is all there is
const CAP_SHADE = 0.34; // the rock's top, darker than any face, so it reads as mass rather than floor
const FUNNEL = { reach: 1.05, throat: 0.3, depth: 0.5, ring: 1.45 }; // metres: a way down, out from its middle
const LANTERN_Y = 1.9;
const WATER_Y = -0.05;

export interface Terrain {
  group: THREE.Group;
  /** The ground under a point, in metres: water sinks it. */
  heightAt(x: number, z: number): number;
  /** Tall walls, for lamps to hang on: a point on the face, its normal into the floor, and how far the
   *  rock stands out of that point at a lantern's height. */
  faces: { at: THREE.Vector3; normal: THREE.Vector3; out: number }[];
  /** How far the face stands out along its normal at a height: what hangs on it is hung that far out. */
  pushAt(x: number, y: number, z: number): number;
  /** Every face where a body's shoulders would meet it, and every boulder: what a drawn body keeps clear of. */
  edges: Edge[];
  stones: Round[];
  /** The dark at the bottom of each way down, which nothing but the hero goes into. */
  throats: Round[];
  dispose(): void;
}

function hash(x: number, y: number, z = 0): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}
/** Value noise in three dimensions, 0..1 — the same field wherever it is asked, so shared vertices agree. */
function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const fz = smooth(z - iz);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash(ix + dx, iy + dy, iz + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), fx), lerp(c(0, 1, 0), c(1, 1, 0), fx), fy),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), fx), lerp(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz
  );
}
const fbm3 = (x: number, y: number, z: number): number => noise3(x, y, z) * 0.6 + noise3(x * 2.3, y * 2.3, z * 2.3) * 0.4;

export function material(assets: Assets, id: string, tint: number, s: Shared, o: Parameters<typeof patch>[2], shaded = true): THREE.MeshStandardMaterial {
  const set = assets.surfaces[id];
  const mat = new THREE.MeshStandardMaterial({
    map: set?.albedo ?? null,
    normalMap: set?.normal ?? null,
    roughnessMap: set?.rough ?? null,
    roughness: 1,
    metalness: 0,
    color: tint,
    vertexColors: shaded, // the floor's dark at a wall's foot, the wall's at its own
  });
  patch(mat, s, o);
  return mat;
}

export function buildTerrain(map: GameMap, assets: Assets, s: Shared, eye: THREE.Vector2): Terrain {
  const { grid } = map;
  const look = LOOKS[map.theme] ?? LOOKS.fissure;
  const W = grid.width;
  const H = grid.height;
  const rock = (x: number, y: number) => !grid.inBounds(x, y) || grid.at(x, y) === WALL;
  const wet = (x: number, y: number) => grid.inBounds(x, y) && grid.wet(x, y);
  const deep = (x: number, y: number) => grid.inBounds(x, y) && grid.deep(x, y);
  const mouths = [map.entrance, map.exit].filter((m, i, all) => all.findIndex((n) => n.x === m.x && n.y === m.y) === i);
  const mouthCell = (x: number, y: number) => mouths.some((m) => m.x === x && m.y === y);

  // ROCK THAT IS AN ISLAND is a clump of boulders on the floor, never a four-metre monolith: its cells are floor to the
  // ground mesh and carry stones instead. The grid still blocks them — nothing here changes where a body may stand.
  const clump = new Int32Array(W * H).fill(-1);
  const small: boolean[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!rock(x, y) || clump[y * W + x] >= 0) continue;
      const id = small.length;
      const todo = [y * W + x];
      clump[y * W + x] = id;
      let size = 0;
      let edge = false;
      while (todo.length) {
        const at = todo.pop()!;
        size++;
        const cx = at % W;
        const cy = (at - cx) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) {
            edge = true;
            continue;
          }
          const n = ny * W + nx;
          if (rock(nx, ny) && clump[n] < 0) (clump[n] = id), todo.push(n);
        }
      }
      small.push(!edge && size <= BOULDER);
    }
  }
  const loose = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < W && y < H && clump[y * W + x] >= 0 && small[clump[y * W + x]];

  // CORNERS, (W+1) by (H+1); corner (i, j) stands at world (i - 0.5, j - 0.5).
  const CW = W + 1;
  const corner = (i: number, j: number) => j * CW + i;
  const cells = (i: number, j: number): [number, number][] => [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]];
  const floorish = new Uint8Array(CW * (H + 1));
  const wetness = new Float32Array(CW * (H + 1));
  const depth = new Float32Array(CW * (H + 1));
  for (let j = 0; j <= H; j++) {
    for (let i = 0; i <= W; i++) {
      const around = cells(i, j);
      floorish[corner(i, j)] = around.some(([x, y]) => !rock(x, y) || loose(x, y)) ? 1 : 0;
      wetness[corner(i, j)] = around.filter(([x, y]) => wet(x, y)).length / 4;
      depth[corner(i, j)] = around.filter(([x, y]) => deep(x, y)).length / 4;
    }
  }
  // A WALL ONE CELL THICK has no corner that is rock, so no face could stand in it: it is stones like a clump.
  const thin = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!rock(x, y) || loose(x, y)) continue;
      if (floorish[corner(x, y)] && floorish[corner(x + 1, y)] && floorish[corner(x, y + 1)] && floorish[corner(x + 1, y + 1)]) thin[y * W + x] = 1;
    }
  }

  // HOW FAR EACH CELL IS FROM ROCK, for the dark a floor gathers at a wall's foot.
  const far = new Float32Array(W * H).fill(99);
  const queue: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const near = rock(x, y) || rock(x - 1, y) || rock(x + 1, y) || rock(x, y - 1) || rock(x, y + 1);
      if (near) {
        far[y * W + x] = rock(x, y) ? 0 : 1;
        queue.push(y * W + x);
      }
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const at = queue[q];
    const x = at % W;
    const y = (at - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (far[n] > far[at] + 1) {
        far[n] = far[at] + 1;
        queue.push(n);
      }
    }
  }
  const openness = (i: number, j: number): number => {
    let d = 99;
    for (const [x, y] of cells(i, j)) d = Math.min(d, x >= 0 && y >= 0 && x < W && y < H ? far[y * W + x] : 0);
    return d;
  };
  const sink = (c: number) => -0.62 * Math.pow(depth[c], 1.4) - 0.1 * wetness[c];
  const cornerShade = (i: number, j: number): number => (0.5 + 0.5 * Math.min(1, openness(i, j) / 3)) * (1 - 0.35 * wetness[corner(i, j)]);
  /** A corner field read between corners, as the floor's own triangles carry it. */
  const between = (x: number, z: number, at: (i: number, j: number) => number): number => {
    const fx = THREE.MathUtils.clamp(x + 0.5, 0, W);
    const fz = THREE.MathUtils.clamp(z + 0.5, 0, H);
    const i = Math.min(W - 1, Math.floor(fx));
    const j = Math.min(H - 1, Math.floor(fz));
    const tx = fx - i;
    const tz = fz - j;
    return (at(i, j) * (1 - tx) + at(i + 1, j) * tx) * (1 - tz) + (at(i, j + 1) * (1 - tx) + at(i + 1, j + 1) * tx) * tz;
  };
  // A WAY DOWN IS A FUNNEL where the floor round it is whole; an authored room's that is not keeps the old shaft.
  const funnels = mouths.filter((m) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (rock(m.x + dx, m.y + dy) || deep(m.x + dx, m.y + dy)) return false;
    return true;
  });
  const inFunnel = (x: number, y: number): boolean => funnels.some((m) => Math.abs(x - m.x) <= 1 && Math.abs(y - m.y) <= 1);
  const bowl = (x: number, z: number): number => {
    let h = 0;
    for (const m of funnels) {
      const r = Math.hypot(x - m.x, z - m.y);
      if (r < FUNNEL.reach) h = Math.min(h, -FUNNEL.depth * THREE.MathUtils.smoothstep(FUNNEL.reach - r, 0, FUNNEL.reach - FUNNEL.throat));
    }
    return h;
  };

  // ─── THE FLOOR ───
  const fPos: number[] = [];
  const fCol: number[] = [];
  const fUv: number[] = [];
  const fIdx: number[] = [];
  const fKeys = new Map<string, number>();
  const floorVertex = (key: string, x: number, z: number, y: number, shade: number): number => {
    const had = fKeys.get(key);
    if (had !== undefined) return had;
    const n = fPos.length / 3;
    fPos.push(x, y, z);
    fUv.push(x * 0.25, z * 0.25);
    fCol.push(shade, shade, shade * 0.98);
    fKeys.set(key, n);
    return n;
  };

  // ─── THE WALLS ───
  interface Crossing { key: string; x: number; z: number; nx: number; nz: number; n: number }
  const crossings = new Map<string, Crossing>();
  const segments: [string, string, number, number][] = []; // two crossing keys and the segment's floor normal
  const P = (i: number, j: number) => ({ x: i - 0.5, z: j - 0.5 });
  const edgeKey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);

  const masses: string[][] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cs = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]] as const;
      const ids = cs.map(([i, j]) => corner(i, j));
      const f = ids.map((c) => floorish[c] === 1);
      if (!f.some(Boolean)) continue;
      const poly: { key: string; x: number; z: number; y: number; shade: number; edge: boolean }[] = [];
      const mass: string[] = []; // the rock's own polygon round this cell: its corners and crossings, for the cap
      for (let k = 0; k < 4; k++) {
        const [i, j] = cs[k];
        const c = ids[k];
        if (!f[k]) mass.push(`c${i},${j}`);
        if (f[k]) {
          const p = P(i, j);
          poly.push({ key: `c${c}`, x: p.x, z: p.z, y: sink(c), shade: cornerShade(i, j), edge: false });
        }
        const k2 = (k + 1) % 4;
        if (f[k] !== f[k2]) {
          const [fi, fj] = f[k] ? cs[k] : cs[k2];
          const [ri, rj] = f[k] ? cs[k2] : cs[k];
          const a = P(fi, fj);
          const b = P(ri, rj);
          const key = edgeKey(ids[k], ids[k2]);
          const t = WALL_AT + UNDER;
          poly.push({ key: `e${key}`, x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, y: 0, shade: 0.42, edge: true });
          mass.push(`x${key}`);
          if (!crossings.has(key)) {
            crossings.set(key, { key, x: a.x + (b.x - a.x) * WALL_AT, z: a.z + (b.z - a.z) * WALL_AT, nx: 0, nz: 0, n: 0 });
          }
        }
      }
      if (mass.length >= 3) masses.push(mass);
      // Floor, unless this cell is a way down or the funnel round one.
      if (!mouthCell(x, y) && !inFunnel(x, y) && poly.length >= 3) {
        const v = poly.map((p) => floorVertex(p.key, p.x, p.z, p.y, p.shade));
        for (let k = 1; k < v.length - 1; k++) fIdx.push(v[0], v[k + 1], v[k]); // wound to face up
      }
      // The segments: two crossings next to each other round the polygon.
      const cx = poly.reduce((n, p) => n + p.x, 0) / poly.length;
      const cz = poly.reduce((n, p) => n + p.z, 0) / poly.length;
      for (let k = 0; k < poly.length; k++) {
        const a = poly[k];
        const b = poly[(k + 1) % poly.length];
        if (!a.edge || !b.edge) continue;
        const ka = a.key.slice(1);
        const kb = b.key.slice(1);
        const A = crossings.get(ka)!;
        const B = crossings.get(kb)!;
        let nx = -(B.z - A.z);
        let nz = B.x - A.x;
        const len = Math.hypot(nx, nz) || 1;
        nx /= len;
        nz /= len;
        if ((cx - (A.x + B.x) / 2) * nx + (cz - (A.z + B.z) / 2) * nz < 0) {
          nx = -nx;
          nz = -nz;
        }
        for (const C of [A, B]) {
          C.nx += nx;
          C.nz += nz;
          C.n++;
        }
        segments.push([ka, kb, nx, nz]);
      }
    }
  }

  /** A polygon, whichever way round it was listed, wound to face up. */
  const upward = (ids: number[]): void => {
    let area = 0;
    for (let k = 0; k < ids.length; k++) {
      const a = ids[k] * 3;
      const b = ids[(k + 1) % ids.length] * 3;
      area += fPos[a] * fPos[b + 2] - fPos[b] * fPos[a + 2];
    }
    const v = area >= 0 ? ids : [...ids].reverse();
    for (let k = 1; k < v.length - 1; k++) fIdx.push(v[0], v[k + 1], v[k]);
  };
  // ─── THE FUNNELS: rings down to the throat, zipped at the rim to the corners of the cells round them ───
  for (const m of funnels) {
    const NA = 40;
    const NR = 8;
    const rings: number[][] = [];
    for (let k = 0; k <= NR; k++) {
      const r = FUNNEL.throat + (FUNNEL.ring - FUNNEL.throat) * Math.pow(k / NR, 1.3);
      const row: number[] = [];
      for (let a = 0; a < NA; a++) {
        const x = m.x + Math.cos((a / NA) * Math.PI * 2) * r;
        const z = m.y + Math.sin((a / NA) * Math.PI * 2) * r;
        const down = -bowl(x, z) / FUNNEL.depth;
        row.push(floorVertex(`f${m.x},${m.y}:${k}:${a}`, x, z, between(x, z, (i, j) => sink(corner(i, j))) + bowl(x, z), between(x, z, cornerShade) * (1 - 0.75 * down * down)));
      }
      rings.push(row);
    }
    for (let k = 0; k < NR; k++) {
      for (let a = 0; a < NA; a++) upward([rings[k][a], rings[k][(a + 1) % NA], rings[k + 1][(a + 1) % NA], rings[k + 1][a]]);
    }
    const rim: { id: number; t: number }[] = [];
    for (let j = m.y - 1; j <= m.y + 2; j++) {
      for (let i = m.x - 1; i <= m.x + 2; i++) {
        if (i > m.x - 1 && i < m.x + 2 && j > m.y - 1 && j < m.y + 2) continue;
        const p = P(i, j);
        const t = Math.atan2(p.z - m.y, p.x - m.x);
        rim.push({ id: floorVertex(`c${corner(i, j)}`, p.x, p.z, sink(corner(i, j)), cornerShade(i, j)), t: t < 0 ? t + Math.PI * 2 : t });
      }
    }
    rim.sort((a, b) => a.t - b.t);
    const inner = rings[NR].map((id, a) => ({ id, t: (a / NA) * Math.PI * 2 }));
    let i = 0;
    let j = 0;
    const turn = (list: { t: number }[], n: number) => list[n % list.length].t + Math.floor(n / list.length) * Math.PI * 2;
    for (let n = 0; n < inner.length + rim.length; n++) {
      const a = inner[i % inner.length];
      const b = rim[j % rim.length];
      if (j >= rim.length || (i < inner.length && turn(inner, i + 1) <= turn(rim, j + 1))) upward([a.id, inner[(i + 1) % inner.length].id, b.id]), i++;
      else upward([a.id, rim[(j + 1) % rim.length].id, b.id]), j++;
    }
  }

  const floorGeo = new THREE.BufferGeometry();
  floorGeo.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
  floorGeo.setAttribute('color', new THREE.Float32BufferAttribute(fCol, 3));
  floorGeo.setAttribute('uv', new THREE.Float32BufferAttribute(fUv, 2));
  floorGeo.setIndex(fIdx);
  floorGeo.computeVertexNormals();
  const floor = new THREE.Mesh(floorGeo, material(assets, look.floor, look.floorTint, s, { variation: 0.7 }));
  floor.receiveShadow = true;

  // A column of the face at a crossing: its height off its normal against the eye, its rock off the noise field.
  const heightOf = (x: number, z: number, nx: number, nz: number): number => {
    const facing = THREE.MathUtils.smoothstep(nx * eye.x + nz * eye.y, -0.3, 0.5);
    const tall = look.tall * (0.8 + 0.4 * noise3(x * 0.21, 3.1, z * 0.21));
    return look.low + (tall - look.low) * facing;
  };
  const wPos: number[] = [];
  const wUv: number[] = [];
  const wCol: number[] = [];
  const wIdx: number[] = [];
  const wKeys = new Map<string, number>();
  const faces: Terrain['faces'] = [];
  const edges: Edge[] = [];
  const stones: Round[] = [];
  const tops = new Map<string, number>(); // a crossing's wall height, where the cap meets it
  const pushAt = (x: number, y: number, z: number): number => (fbm3(x * 0.85, y * 0.85, z * 0.85) - 0.3) * FACE_NOISE * THREE.MathUtils.smoothstep(y, -0.25, 0.6);
  const wallVertex = (key: string, x: number, z: number, nx: number, nz: number, h: number, row: number): number => {
    const had = wKeys.get(`${key}:${row}`);
    if (had !== undefined) return had;
    const y = -0.25 + (h + 0.25) * (row / ROWS);
    const push = pushAt(x, y, z);
    const n = wPos.length / 3;
    wPos.push(x + nx * push, y, z + nz * push);
    wUv.push((x + z) * 0.35, y * 0.35);
    const foot = 0.55 + 0.45 * THREE.MathUtils.smoothstep(y, 0, 1.4);
    wCol.push(foot, foot, foot);
    wKeys.set(`${key}:${row}`, n);
    return n;
  };
  for (const [ka, kb, snx, snz] of segments) {
    const A = crossings.get(ka)!;
    const B = crossings.get(kb)!;
    const an = Math.hypot(A.nx, A.nz) || 1;
    const bn = Math.hypot(B.nx, B.nz) || 1;
    const cols = [
      { key: ka, x: A.x, z: A.z, nx: A.nx / an, nz: A.nz / an },
      { key: `${ka}|${kb}`, x: (A.x + B.x) / 2, z: (A.z + B.z) / 2, nx: snx, nz: snz },
      { key: kb, x: B.x, z: B.z, nx: B.nx / bn, nz: B.nz / bn },
    ].map((c) => ({ ...c, h: heightOf(c.x, c.z, c.nx, c.nz) }));
    tops.set(ka, cols[0].h);
    tops.set(kb, cols[2].h);
    // WOUND TO FACE THE FLOOR: t × up is the face normal of (a, b, b-above).
    const tx = B.x - A.x;
    const tz = B.z - A.z;
    const flip = -tz * snx + tx * snz < 0;
    for (let c = 0; c < cols.length - 1; c++) {
      const L = flip ? cols[c + 1] : cols[c];
      const R = flip ? cols[c] : cols[c + 1];
      for (let r = 0; r < ROWS; r++) {
        const a = wallVertex(L.key, L.x, L.z, L.nx, L.nz, L.h, r);
        const b = wallVertex(R.key, R.x, R.z, R.nx, R.nz, R.h, r);
        const c2 = wallVertex(R.key, R.x, R.z, R.nx, R.nz, R.h, r + 1);
        const d = wallVertex(L.key, L.x, L.z, L.nx, L.nz, L.h, r + 1);
        wIdx.push(a, b, c2, a, c2, d);
      }
    }
    const [a, b] = [cols[0], cols[2]].map((c) => ({ x: c.x + c.nx * pushAt(c.x, 1.1, c.z), z: c.z + c.nz * pushAt(c.x, 1.1, c.z) }));
    edges.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z });
    const mid = cols[1];
    if (mid.h > look.tall * 0.7 && hash(mid.x, mid.z, 9) < 0.14) {
      faces.push({ at: new THREE.Vector3(mid.x, 0, mid.z), normal: new THREE.Vector3(mid.nx, 0, mid.nz), out: pushAt(mid.x, LANTERN_Y, mid.z) });
    }
  }
  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
  wallGeo.setAttribute('uv', new THREE.Float32BufferAttribute(wUv, 2));
  wallGeo.setAttribute('color', new THREE.Float32BufferAttribute(wCol, 3));
  wallGeo.setIndex(wIdx);
  wallGeo.computeVertexNormals();
  const wallMat = material(assets, look.rock, look.rockTint, s, { xray: true, rise: look.tall, triplanar: 0.34 });
  wallMat.side = THREE.DoubleSide;
  const walls = new THREE.Mesh(wallGeo, wallMat);
  walls.castShadow = true;
  walls.receiveShadow = true;

  const group = new THREE.Group();
  group.add(floor, walls);

  // ─── THE ROCK'S TOP: dark stone at the face's own height at its rim, the low wall's behind it ───
  {
    const pos: number[] = [];
    const col: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const seen = new Map<string, number>();
    const vertex = (key: string): number => {
      const had = seen.get(key);
      if (had !== undefined) return had;
      let x: number;
      let z: number;
      let y: number;
      if (key[0] === 'x') {
        const c = crossings.get(key.slice(1))!;
        (x = c.x), (z = c.z), (y = (tops.get(c.key) ?? look.low) - 0.02);
      } else {
        const [i, j] = key.slice(1).split(',').map(Number);
        (x = i - 0.5), (z = j - 0.5), (y = look.low);
      }
      const n = pos.length / 3;
      pos.push(x, y, z);
      uv.push(x * 0.3, z * 0.3);
      const shade = CAP_SHADE * (0.8 + 0.4 * noise3(x * 0.4, 1.7, z * 0.4));
      col.push(shade, shade, shade);
      seen.set(key, n);
      return n;
    };
    for (const mass of masses) {
      const v = mass.map(vertex);
      for (let k = 1; k < v.length - 1; k++) idx.push(v[0], v[k + 1], v[k]);
    }
    // Rock with no floor near it at all: a tile of the same stone, out to where the fog has it.
    const near = (x: number, y: number): boolean => {
      for (let dy = -CAP_REACH; dy <= CAP_REACH; dy++) for (let dx = -CAP_REACH; dx <= CAP_REACH; dx++) if (!rock(x + dx, y + dy)) return true;
      return false;
    };
    for (let y = -1; y <= H; y++) {
      for (let x = -1; x <= W; x++) {
        const cs = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
        if (cs.some(([i, j]) => i >= 0 && j >= 0 && i <= W && j <= H && floorish[corner(i, j)] === 1)) continue;
        if (!near(x, y)) continue;
        const v = cs.map(([i, j]) => vertex(`c${i},${j}`));
        idx.push(v[0], v[2], v[1], v[0], v[3], v[2]);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const cap = new THREE.Mesh(geo, material(assets, look.rock, look.rockTint, s, { triplanar: 0.45 }));
    cap.receiveShadow = true;
    group.add(cap);
  }

  // ─── BOULDERS: a rough stone a loose cell, overlapping into an outcrop — but one beside a
  // cell somebody walks keeps inside its own, or a body standing next to it stands in it ───
  {
    const seats: THREE.Matrix4[] = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!loose(x, y) && !thin[y * W + x]) continue;
        let edge = false;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (grid.walkable(x + dx, y + dy)) edge = true;
        const wide = edge ? 0.34 + hash(x, y, 32) * 0.06 : 0.62 + hash(x, y, 32) * 0.18; // the stone's noise reaches 1.22 of it
        const tall = edge ? wide * (1.1 + hash(x, y, 31) * 0.7) : 0.75 + hash(x, y, 31) * 0.7;
        const drift = edge ? 0 : 0.2;
        const at = { x: x + (hash(x, y, 33) - 0.5) * drift, z: y + (hash(x, y, 34) - 0.5) * drift };
        stones.push({ x: at.x, z: at.z, r: wide * 1.1 });
        seats.push(new THREE.Matrix4().compose(
          new THREE.Vector3(at.x, tall * 0.35, at.z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler((hash(x, y, 35) - 0.5) * 0.4, hash(x, y, 36) * 6.3, (hash(x, y, 37) - 0.5) * 0.4)),
          new THREE.Vector3(wide, tall, wide)
        ));
      }
    }
    if (seats.length) {
      // FACETED, never an egg: few faces, pushed hard, and a flattened crown.
      const geo = new THREE.IcosahedronGeometry(1, 1);
      const p = geo.getAttribute('position') as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const k = 0.72 + fbm3(v.x * 2.1 + 4, v.y * 2.1, v.z * 2.1) * 0.5;
        p.setXYZ(i, v.x * k, Math.min(v.y * k, 0.7) * 0.85, v.z * k);
      }
      geo.computeVertexNormals();
      const rocks = new THREE.InstancedMesh(geo, material(assets, look.rock, look.rockTint, s, { triplanar: 0.7 }, false), seats.length);
      seats.forEach((m, i) => rocks.setMatrixAt(i, m));
      rocks.castShadow = rocks.receiveShadow = true;
      group.add(rocks);
    }
  }

  // ─── WATER: one level surface over every wet cell and a cell past it, so the SHORE is wherever the
  // floor rises through it — a line the ground's own slope draws, never a cell's edge ───
  const wetCells: [number, number][] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) near = wet(x + dx, y + dy);
      if (near && !rock(x, y)) wetCells.push([x, y]);
    }
  }
  if (wetCells.length) {
    const pos: number[] = [];
    const alpha: number[] = [];
    const idx: number[] = [];
    const seen = new Map<number, number>();
    const at = (i: number, j: number): number => {
      const c = corner(i, j);
      const had = seen.get(c);
      if (had !== undefined) return had;
      const n = pos.length / 3;
      pos.push(i - 0.5, WATER_Y, j - 0.5);
      alpha.push(WATER_Y - sink(c)); // how deep the floor lies under it here; the floor's triangles are these ones
      seen.set(c, n);
      return n;
    };
    for (const [x, y] of wetCells) {
      const a = at(x, y);
      const b = at(x + 1, y);
      const c = at(x + 1, y + 1);
      const d = at(x, y + 1);
      idx.push(a, c, b, a, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aShore', new THREE.Float32BufferAttribute(alpha, 1));
    geo.setIndex(idx);
    const water = new THREE.Mesh(geo, waterMaterial(s, look.water));
    water.renderOrder = 2;
    group.add(water);
  }

  // ─── THE WAYS DOWN: a throat under each funnel; a shaft with steps where there is none ───
  const stone = material(assets, look.rock, look.rockTint, s, { triplanar: 0.8 }, false);
  for (const m of mouths) group.add(funnels.includes(m) ? throat(m.x, m.y, stone) : pit(m.x, m.y, stone));

  const heightAt = (x: number, z: number): number => between(x, z, (i, j) => sink(corner(i, j))) + bowl(x, z);

  return {
    group,
    heightAt,
    faces,
    pushAt,
    edges,
    stones,
    throats: funnels.map((m) => ({ x: m.x, z: m.y, r: FUNNEL.throat })),
    dispose: () =>
      group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }),
  };
}

/** Under a funnel: the dark it runs down into, and broken stone lying round its lip. */
function throat(x: number, z: number, stone: THREE.MeshStandardMaterial): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(FUNNEL.throat, FUNNEL.throat * 0.8, 3, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0e0b09, roughness: 1, side: THREE.BackSide })
  );
  shaft.position.y = -FUNNEL.depth - 1.48;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(FUNNEL.throat, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  bottom.position.y = -FUNNEL.depth - 2.95;
  g.add(shaft, bottom);
  const rim = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), stone, 12);
  const m = new THREE.Matrix4();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + hash(x, z, k) * 0.4;
    const r = FUNNEL.reach + 0.05 + hash(k, x, z) * 0.3;
    const sz = 0.06 + hash(z, k, x) * 0.08;
    m.compose(
      new THREE.Vector3(Math.cos(a) * r, sz * 0.2, Math.sin(a) * r),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(hash(k, 1, x) * 3, a, hash(k, 2, z) * 3)),
      new THREE.Vector3(sz, sz * 0.6, sz)
    );
    rim.setMatrixAt(k, m);
  }
  rim.castShadow = rim.receiveShadow = true;
  g.add(rim);
  return g;
}

/** A way down where no funnel fits: a shaft into the dark with steps round its wall, and a rim of broken stone. */
function pit(x: number, z: number, stone: THREE.MeshStandardMaterial): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.66, 0.5, 3.2, 20, 4, true),
    new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1, side: THREE.BackSide })
  );
  shaft.position.y = -1.6;
  g.add(shaft);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.52, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  bottom.position.y = -3.15;
  g.add(bottom);
  for (let k = 0; k < 7; k++) {
    const a = k * 0.62;
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.26), stone);
    step.position.set(Math.cos(a) * 0.42, -0.2 - k * 0.3, Math.sin(a) * 0.42);
    step.rotation.y = -a;
    step.castShadow = step.receiveShadow = true;
    g.add(step);
  }
  const rim = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.2, 0), stone, 14);
  const m = new THREE.Matrix4();
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + hash(x, z, k) * 0.3;
    const r = 0.78 + hash(k, x, z) * 0.14;
    const sz = 0.75 + hash(z, k, x) * 0.6;
    m.compose(
      new THREE.Vector3(Math.cos(a) * r, 0.02, Math.sin(a) * r),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(hash(k, 1, x) * 3, a, hash(k, 2, z) * 3)),
      new THREE.Vector3(sz, sz * 0.55, sz)
    );
    rim.setMatrixAt(k, m);
  }
  rim.castShadow = rim.receiveShadow = true;
  g.add(rim);
  return g;
}

/** Still, dark water: no reflection of what is round it, only a slow sheen the lamps catch, and a shore that fades. */
function waterMaterial(s: Shared, colour: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: s.uTime, uColor: { value: new THREE.Color(colour) } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float aShore;
      varying float vShore;
      varying vec3 vWorld;
      void main() { vShore = aShore; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      varying float vShore;
      varying vec3 vWorld;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        vec2 p = vWorld.xz;
        float ripple = n(p * 3.1 + vec2(uTime * 0.12, uTime * 0.07)) * 0.6 + n(p * 7.3 - uTime * 0.18) * 0.4;
        float sheen = pow(ripple, 9.0) * 0.16; // still water: a glint where the lamps catch it, never a pattern
        vec3 col = uColor * (0.92 + 0.12 * ripple) + vec3(0.55, 0.62, 0.7) * sheen;
        gl_FragColor = vec4(col, smoothstep(0.0, 0.14, vShore) * 0.88); // clear where the floor comes up to it
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
