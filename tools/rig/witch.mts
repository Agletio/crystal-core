/**
 * ONE STILL, CUT INTO PARTS, ANIMATED BY A SKELETON, RENDERED TO THE GRID.
 *
 *   witch.mts sheet <png>   every frame of every state at 4x, to look at
 *   witch.mts gif <dir>     one looping GIF a state, to judge the motion
 *   witch.mts row           the `witch_rig` body into generated-art.ts
 *
 * The still is the only generated thing. Parts are polygons over it, each
 * source pixel belonging to the FIRST polygon that holds it; a skeleton poses
 * them at source resolution (3x the grid), and each frame is read down to the
 * grid by MODE over every 3x3 block, so an edge is a decision and never a
 * blend. Every frame holds the still's own twelve inks and nothing else.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from '../art/png.mts';
import { encodeGif } from './gif.mts';

const here = (f: string): string => new URL(`./${f}`, import.meta.url).pathname;
const STILL = here('../art/cache/designs/witch_apose-0.png');
const GRID = 48;
const SUPER = 3; // source px per grid px
const CANVAS = GRID * SUPER;
const OFF = { x: 12, y: 14 }; // where the still's own origin lands on the canvas
const COVER = 4; // of 9 source px a grid px needs to be ink

// --- the still --------------------------------------------------------------
const still = decodePng(readFileSync(STILL));
const inks: string[] = [];
const inkAt = new Int16Array(still.width * still.height).fill(-1);
for (let i = 0; i < still.width * still.height; i++) {
  if (still.rgba[i * 4 + 3] < 128) continue;
  const hex = `#${[0, 1, 2].map((k) => still.rgba[i * 4 + k].toString(16).padStart(2, '0')).join('')}`;
  let at = inks.indexOf(hex);
  if (at < 0) { at = inks.length; inks.push(hex); }
  inkAt[i] = at;
}
const luma = (hex: string): number => [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16)).reduce((a, b) => a + b);

// --- the parts ----------------------------------------------------------------
type Pt = [number, number];
interface PartDef { name: string; parent: string; pivot: Pt; poly: Pt[]; fillUnder?: boolean }
// In PRIORITY order: a pixel goes to the first polygon that holds it.
const PARTS: PartDef[] = [
  { name: 'head', parent: 'torso', pivot: [61, 28], poly: [[46, 1], [76, 1], [76, 25], [69, 30], [54, 30], [46, 25]] },
  { name: 'armLeft', parent: 'torso', pivot: [49, 37], poly: [[45, 32], [53, 32], [53, 50], [50, 54], [43, 66], [41, 74], [28, 74], [28, 60], [40, 46]] },
  { name: 'armRight', parent: 'torso', pivot: [75, 38], poly: [[71, 35], [80, 35], [80, 81], [71, 81]] },
  { name: 'legLeft', parent: 'root', pivot: [55, 96], poly: [[49, 96], [62, 96], [62, 122], [40, 122], [40, 112], [49, 106]] },
  { name: 'legRight', parent: 'root', pivot: [75, 96], poly: [[68, 96], [82, 96], [82, 127], [68, 127]] },
  { name: 'torso', parent: 'root', pivot: [62, 66], poly: [[47, 26], [77, 26], [77, 67], [47, 67]], fillUnder: true },
  { name: 'dressUpper', parent: 'root', pivot: [62, 66], poly: [[45, 65], [79, 65], [79, 86], [43, 86]], fillUnder: true },
  { name: 'dressHem', parent: 'dressUpper', pivot: [62, 85], poly: [[42, 84], [80, 84], [82, 104], [39, 104]], fillUnder: true },
  { name: 'cloakUpper', parent: 'torso', pivot: [78, 27], poly: [[70, 22], [93, 22], [93, 62], [74, 62]], fillUnder: true },
  { name: 'cloakLower', parent: 'cloakUpper', pivot: [82, 60], poly: [[76, 58], [94, 58], [94, 104], [80, 104]], fillUnder: true },
];
const DRAW_ORDER = ['cloakLower', 'cloakUpper', 'legLeft', 'legRight', 'dressHem', 'dressUpper', 'torso', 'head', 'armRight', 'armLeft'];

const inside = (p: Pt[], x: number, y: number): boolean => {
  let on = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) on = !on;
  }
  return on;
};

interface Part extends PartDef { mask: Int16Array; fill: Int16Array; mode: number }
const parts = new Map<string, Part>();
{
  const owner = new Int8Array(still.width * still.height).fill(-1);
  for (let y = 0; y < still.height; y++) for (let x = 0; x < still.width; x++) {
    const i = y * still.width + x;
    if (inkAt[i] < 0) continue;
    owner[i] = PARTS.findIndex((p) => inside(p.poly, x + 0.5, y + 0.5));
  }
  PARTS.forEach((def, n) => {
    const mask = new Int16Array(still.width * still.height).fill(-1);
    const count = new Map<number, number>();
    for (let i = 0; i < mask.length; i++) if (owner[i] === n) { mask[i] = inkAt[i]; count.set(inkAt[i], (count.get(inkAt[i]) ?? 0) + 1); }
    const mode = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
    // What lies UNDER a part that moves away: the silhouette inside this
    // part's polygon, in its commonest ink, so a raised arm leaves cloth
    // behind it rather than a hole.
    const fill = new Int16Array(still.width * still.height).fill(-1);
    if (def.fillUnder) {
      for (let y = 0; y < still.height; y++) for (let x = 0; x < still.width; x++) {
        const i = y * still.width + x;
        if (inkAt[i] >= 0 && inside(def.poly, x + 0.5, y + 0.5)) fill[i] = mode;
      }
    }
    parts.set(def.name, { ...def, mask, fill, mode });
  });
}

// --- the skeleton -----------------------------------------------------------
type Affine = [number, number, number, number, number, number]; // x' = a x + c y + e ; y' = b x + d y + f
const I: Affine = [1, 0, 0, 1, 0, 0];
const mul = (P: Affine, L: Affine): Affine => [
  P[0] * L[0] + P[2] * L[1], P[1] * L[0] + P[3] * L[1],
  P[0] * L[2] + P[2] * L[3], P[1] * L[2] + P[3] * L[3],
  P[0] * L[4] + P[2] * L[5] + P[4], P[1] * L[4] + P[3] * L[5] + P[5],
];
const inv = (M: Affine): Affine => {
  const det = M[0] * M[3] - M[1] * M[2];
  const a = M[3] / det, b = -M[1] / det, c = -M[2] / det, d = M[0] / det;
  return [a, b, c, d, -(a * M[4] + c * M[5]), -(b * M[4] + d * M[5])];
};
const about = (pivot: Pt, deg: number, dx: number, dy: number, sx = 1, sy = 1): Affine => {
  const r = (deg * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r);
  const [px, py] = pivot;
  // translate(pivot + d) · rotate · scale · translate(-pivot)
  return [cs * sx, sn * sx, -sn * sy, cs * sy, px + dx - (cs * sx * px - sn * sy * py), py + dy - (sn * sx * px + cs * sy * py)];
};

interface Pose { [part: string]: { rot?: number; dx?: number; dy?: number; sx?: number; sy?: number } }
interface RootPose { rot?: number; dx?: number; dy?: number; pivot?: Pt }

function worlds(pose: Pose, root: RootPose): Map<string, Affine> {
  const out = new Map<string, Affine>();
  out.set('root', about(root.pivot ?? [64, 66], root.rot ?? 0, root.dx ?? 0, root.dy ?? 0));
  const resolve = (name: string): Affine => {
    const had = out.get(name);
    if (had) return had;
    const p = parts.get(name)!;
    const q = pose[name] ?? {};
    const local = about(p.pivot, q.rot ?? 0, q.dx ?? 0, q.dy ?? 0, q.sx ?? 1, q.sy ?? 1);
    const w = mul(resolve(p.parent), local);
    out.set(name, w);
    return w;
  };
  for (const p of PARTS) resolve(p.name);
  return out;
}

// --- rendering ----------------------------------------------------------------
function renderSuper(pose: Pose, root: RootPose): Int16Array {
  const canvas = new Int16Array(CANVAS * CANVAS).fill(-1);
  const W = worlds(pose, root);
  const paint = (layer: Int16Array, world: Affine) => {
    const M = inv(world);
    for (let Y = 0; Y < CANVAS; Y++) for (let X = 0; X < CANVAS; X++) {
      const cx = X - OFF.x + 0.5, cy = Y - OFF.y + 0.5;
      const sx = Math.floor(M[0] * cx + M[2] * cy + M[4]);
      const sy = Math.floor(M[1] * cx + M[3] * cy + M[5]);
      if (sx < 0 || sy < 0 || sx >= still.width || sy >= still.height) continue;
      const ink = layer[sy * still.width + sx];
      if (ink >= 0) canvas[Y * CANVAS + X] = ink;
    }
  };
  for (const name of DRAW_ORDER) {
    const p = parts.get(name)!;
    if (p.fillUnder) paint(p.fill, W.get(name)!);
    paint(p.mask, W.get(name)!);
  }
  return canvas;
}

function toGrid(canvas: Int16Array): Int16Array {
  const out = new Int16Array(GRID * GRID).fill(-1);
  const dark = new Int16Array(GRID * GRID).fill(-1); // the darkest ink each block held
  for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++) {
    const count = new Map<number, number>();
    for (let dy = 0; dy < SUPER; dy++) for (let dx = 0; dx < SUPER; dx++) {
      const ink = canvas[(gy * SUPER + dy) * CANVAS + gx * SUPER + dx];
      if (ink >= 0) count.set(ink, (count.get(ink) ?? 0) + 1);
    }
    const total = [...count.values()].reduce((a, b) => a + b, 0);
    if (total < COVER) continue;
    const i = gy * GRID + gx;
    out[i] = [...count.entries()].sort((a, b) => b[1] - a[1] || luma(inks[a[0]]) - luma(inks[b[0]]))[0][0];
    dark[i] = [...count.keys()].sort((a, b) => luma(inks[a]) - luma(inks[b]))[0];
  }
  return inkEdges(out, dark);
}

// What makes a frame read as DRAWN rather than resampled: an orphan pixel is
// dropped, a one-pixel hole is filled, and a pixel on the silhouette takes the
// darkest ink its block held, which is the still's own outline coming back.
function inkEdges(g: Int16Array, dark: Int16Array): Int16Array {
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= GRID || y >= GRID ? -1 : g[y * GRID + x]);
  const out = Int16Array.from(g);
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
    const inked = n.filter((v) => v >= 0).length;
    const i = y * GRID + x;
    if (g[i] >= 0 && inked === 0) { out[i] = -1; continue; }
    if (g[i] < 0 && inked === 4) { out[i] = n.sort((a, b) => luma(inks[a]) - luma(inks[b]))[0]; continue; }
    if (g[i] >= 0 && inked < 4 && luma(inks[dark[i]]) < luma(inks[g[i]])) out[i] = dark[i];
  }
  return out;
}

// --- the states ---------------------------------------------------------------
const TAU = Math.PI * 2;
const smooth = (u: number): number => { const c = Math.max(0, Math.min(1, u)); return c * c * (3 - 2 * c); };
const seg = (t: number, a: number, b: number): number => smooth((t - a) / (b - a));

type State = { frames: number; loop: boolean; at: (t: number) => { pose: Pose; root: RootPose } };
const STATES: Record<string, State> = {
  idle: {
    frames: 8, loop: true,
    at: (t) => {
      const b = Math.sin(TAU * t);
      return {
        root: { dy: 1.0 * b },
        pose: {
          torso: { rot: 0.6 * b, sy: 1 + 0.008 * b }, head: { rot: -0.6 * b, dy: 0.5 * b },
          armLeft: { rot: 2.0 * b }, armRight: { rot: -2.0 * b },
          cloakUpper: { rot: -1.5 * Math.sin(TAU * t - 0.8) }, cloakLower: { rot: -2.5 * Math.sin(TAU * t - 1.6) },
          dressHem: { rot: 0.6 * Math.sin(TAU * t - 0.5) },
        },
      };
    },
  },
  walk: {
    frames: 12, loop: true,
    at: (t) => {
      const p = TAU * t;
      // A leg lifts under the hem, so the shin shortens as it rises.
      const lift = (ph: number) => -6 * Math.max(0, Math.sin(ph));
      return {
        root: { dy: -2.0 * (0.5 - 0.5 * Math.cos(2 * p)), dx: 1.5 * Math.sin(p) },
        pose: {
          torso: { rot: 2.5 * Math.sin(p) }, head: { rot: -1.5 * Math.sin(p), dy: 0.6 * Math.sin(2 * p) },
          armLeft: { rot: 6 * Math.sin(p - 0.5), sy: 1 - 0.14 * Math.max(0, Math.sin(p)) }, // an arm swung forward is seen shorter
          armRight: { rot: -6 * Math.sin(p - 0.5), sy: 1 - 0.14 * Math.max(0, -Math.sin(p)) },
          legLeft: { dx: 2 * Math.sin(p), dy: lift(p) },
          legRight: { dx: 2 * Math.sin(p + Math.PI), dy: lift(p + Math.PI) },
          dressUpper: { rot: 2 * Math.sin(p) }, dressHem: { rot: 6 * Math.sin(p - 0.6) },
          cloakUpper: { rot: -3 - 4 * Math.sin(p - 1.0) }, cloakLower: { rot: -2 - 6 * Math.sin(p - 2.0) },
        },
      };
    },
  },
  attack: {
    frames: 8, loop: false,
    at: (t) => {
      const w = seg(t, 0, 0.35), l = seg(t, 0.35, 0.6), s = seg(t, 0.6, 1);
      return {
        root: { dx: -3 * w + 12 * l },
        pose: {
          torso: { rot: -5 * w + 12 * l }, head: { rot: -3 * w + 6 * l },
          armRight: { rot: 30 * w - 115 * l }, armLeft: { rot: -8 * l },
          legRight: { dx: 8 * l }, legLeft: { dx: -3 * l },
          dressHem: { rot: -5 * l + 2 * s }, dressUpper: { rot: -2 * l },
          cloakUpper: { rot: 4 * w + 20 * l - 5 * s }, cloakLower: { rot: 3 * w + 16 * seg(t, 0.45, 0.75) - 7 * s },
        },
      };
    },
  },
  cast: {
    frames: 8, loop: false,
    at: (t) => {
      const r = seg(t, 0, 0.5), f = seg(t, 0.5, 0.8), s = seg(t, 0.8, 1);
      return {
        root: { dy: 3 * f, dx: 2 * f },
        pose: {
          torso: { rot: -6 * r + 18 * f }, head: { rot: -5 * r + 12 * f },
          armLeft: { rot: 150 * r - 90 * f }, armRight: { rot: -150 * r + 90 * f },
          dressHem: { rot: -3 * f + 2 * s },
          cloakUpper: { rot: 4 * r + 14 * f - 3 * s }, cloakLower: { rot: 3 * r + 12 * seg(t, 0.6, 0.9) - 5 * s },
        },
      };
    },
  },
  death: {
    frames: 8, loop: false,
    at: (t) => {
      const b = seg(t, 0, 0.3), f = seg(t, 0.3, 0.85);
      return {
        // The knees go first: the body sinks onto legs that stay on the floor, then the whole of her topples.
        root: { pivot: [64, 118], dy: 12 * b - 9 * f, dx: -52 * f, rot: 88 * f },
        pose: {
          legLeft: { dy: -12 * b, rot: 6 * b }, legRight: { dy: -12 * b, rot: -6 * b },
          torso: { rot: 10 * b + 5 * f }, head: { rot: 8 * b + 12 * f },
          armLeft: { rot: 15 * b + 25 * f }, armRight: { rot: -60 * b - 40 * f },
          dressHem: { rot: -4 * f }, cloakUpper: { rot: 12 * f }, cloakLower: { rot: 18 * seg(t, 0.4, 0.95) },
        },
      };
    },
  },
};
const ORDER = ['idle', 'walk', 'attack', 'cast', 'death'];

function frameOf(state: string, i: number): Int16Array {
  const s = STATES[state];
  const t = s.loop ? i / s.frames : i / (s.frames - 1);
  const { pose, root } = s.at(t);
  return toGrid(renderSuper(pose, root));
}

// --- outputs ------------------------------------------------------------------
const rgbOf = (hex: string): number[] => [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
const BG = [58, 52, 44];

function sheet(out: string): void {
  const S = 4, gap = 4;
  const across = Math.max(...ORDER.map((s) => STATES[s].frames));
  const W = across * (GRID * S + gap) + gap, H = ORDER.length * (GRID * S + gap) + gap;
  const px = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) px.set([...BG, 255], i * 4);
  ORDER.forEach((state, row) => {
    for (let i = 0; i < STATES[state].frames; i++) {
      const g = frameOf(state, i);
      const ox = gap + i * (GRID * S + gap), oy = gap + row * (GRID * S + gap);
      for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
        const ink = g[y * GRID + x];
        if (ink < 0) continue;
        const [r, gg, b] = rgbOf(inks[ink]);
        for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
          const d = ((oy + y * S + dy) * W + ox + x * S + dx) * 4;
          px[d] = r; px[d + 1] = gg; px[d + 2] = b; px[d + 3] = 255;
        }
      }
    }
  });
  writeFileSync(out, encodePng(W, H, px));
  console.log(`${out} ${W}x${H} — ${ORDER.map((s) => `${s} ${STATES[s].frames}f`).join(', ')}`);
}

function gifs(dir: string): void {
  mkdirSync(dir, { recursive: true });
  const S = 4, W = GRID * S;
  const palette = [BG, ...inks.map(rgbOf)];
  const delay: Record<string, number> = { idle: 10, walk: 6, attack: 8, cast: 8, death: 9 };
  for (const state of ORDER) {
    const frames = [];
    const n = STATES[state].frames;
    for (let i = 0; i < n; i++) {
      const g = frameOf(state, i);
      const idx = new Uint8Array(W * W);
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const ink = g[Math.floor(y / S) * GRID + Math.floor(x / S)];
        idx[y * W + x] = ink < 0 ? 0 : ink + 1;
      }
      frames.push({ indices: idx, delayCs: delay[state] });
    }
    // A one-shot holds its last frame a while before looping, as the game does.
    if (!STATES[state].loop) frames.push({ ...frames[n - 1], delayCs: 90 });
    writeFileSync(`${dir}/witch-${state}.gif`, encodeGif(W, W, palette, frames));
    console.log(`${dir}/witch-${state}.gif ${n}f`);
  }
}

function row(): void {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const key: Record<string, string> = {};
  inks.forEach((hex, i) => { key[CHARS[i]] = hex; });
  const frames: string[][] = [];
  const states: Record<string, number[]> = {};
  for (const state of ORDER) {
    states[state] = [];
    for (let i = 0; i < STATES[state].frames; i++) {
      const g = frameOf(state, i);
      const rows: string[] = [];
      for (let y = 0; y < GRID; y++) {
        let line = '';
        for (let x = 0; x < GRID; x++) { const ink = g[y * GRID + x]; line += ink < 0 ? '.' : CHARS[ink]; }
        rows.push(line);
      }
      states[state].push(frames.length);
      frames.push(rows);
    }
  }
  const body = {
    grid: GRID, stride: 1.15, robed: true, dirs: ['south-east'], frames, states, key,
  };
  const file = here('../../src/render/generated-art.ts');
  let src = readFileSync(file, 'utf8');
  src = src.replace(/\n  witch_rig: \{[\s\S]*?\n  \},\n(?=  [a-z0-9_]+: \{|\};)/, '\n');
  const text = `  witch_rig: ${JSON.stringify(body, null, 2).replace(/\n/g, '\n  ')},\n`;
  const end = src.lastIndexOf('\n};');
  src = `${src.slice(0, end)}\n${text}${src.slice(end + 1)}`;
  writeFileSync(file, src);
  console.log(`witch_rig: ${frames.length} frames, ${inks.length} inks -> generated-art.ts`);
}

function json(out: string): void {
  const frames: number[][][] = [];
  const states: Record<string, number[]> = {};
  for (const state of ORDER) {
    states[state] = [];
    for (let i = 0; i < STATES[state].frames; i++) {
      const g = frameOf(state, i);
      states[state].push(frames.length);
      frames.push(Array.from({ length: GRID }, (_, y) => Array.from(g.subarray(y * GRID, (y + 1) * GRID))));
    }
  }
  writeFileSync(out, JSON.stringify({ grid: GRID, inks, states, loop: Object.fromEntries(ORDER.map((s) => [s, STATES[s].loop])), frames }));
  console.log(`${out}: ${frames.length} frames`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'json') json(arg ?? 'witch-rig.json');
else if (cmd === 'sheet') sheet(arg ?? 'witch-rig-sheet.png');
else if (cmd === 'gif') gifs(arg ?? 'rig-gifs');
else if (cmd === 'row') row();
else console.log('sheet <png> | gif <dir> | row');
