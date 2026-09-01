/**
 * THE REFERENCE for Phase 8's generator, standalone: rooms raised WHOLE with a
 * rim nobody walks, stairs where the corridors arrive, water as a deep core in
 * a walkable wreath, and resource spots found by rule. Prints ASCII and writes
 * a coloured schematic. Deleted the day `src/sim/grid.ts` carries all of it.
 *
 *   npx tsx tools/terrain-proto.mts <seed> [w h] [out.png]
 */
import { Rng } from '../src/rng';
import { patchNoise, tileNoise } from '../src/noise';
import { encodePng } from './art/png.mts';
import { writeFileSync } from 'node:fs';

const ROCK = 0, LOW = 1, HIGH = 2, RIM = 3, DEEP = 4, STAIR = 5, SHALLOW = 6;
type Room = { x: number; y: number; w: number; h: number };
type V = { x: number; y: number };

const seed = Number(process.argv[2] ?? 7);
const W = Number(process.argv[3] ?? 56);
const H = Number(process.argv[4] ?? 36);
const out = process.argv[5] ?? '';
const rng = new Rng(seed);
const salt = seed * 97;

const cells = new Uint8Array(W * H);
const roomOf = new Uint8Array(W * H); // 1-based room index a carved cell belongs to
const idx = (x: number, y: number) => y * W + x;
const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
const at = (x: number, y: number) => (inb(x, y) ? cells[idx(x, y)] : ROCK);
const set = (x: number, y: number, v: number) => { if (inb(x, y)) cells[idx(x, y)] = v; };
const walkable = (x: number, y: number) => { const c = at(x, y); return c === LOW || c === HIGH || c === STAIR || c === SHALLOW; };
const open = (x: number, y: number) => at(x, y) !== ROCK;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

// ---- 1. skeleton ------------------------------------------------------------
const rooms: Room[] = [];
const target = Math.round((W * H) / 150);
for (let tries = 0; tries < 90 * target && rooms.length < target; tries++) {
  const w = rng.int(6, 12), h = rng.int(5, 9);
  const r = { x: rng.int(2, W - w - 3), y: rng.int(2, H - h - 3), w, h };
  if (rooms.some((o) => r.x - 3 < o.x + o.w && r.x + r.w + 3 > o.x && r.y - 3 < o.y + o.h && r.y + r.h + 3 > o.y)) continue;
  rooms.push(r);
}
const centre = (r: Room): V => ({ x: r.x + Math.floor((r.w - 1) / 2), y: r.y + Math.floor((r.h - 1) / 2) });

// ---- 2. carve: blobs, then corridors that only ever open rock --------------
rooms.forEach((r, i) => {
  const cx = r.x + (r.w - 1) / 2, cy = r.y + (r.h - 1) / 2;
  const a = tileNoise(r.x, r.y, salt + 1) * 6.28, b = tileNoise(r.y, r.x, salt + 2) * 6.28;
  for (let y = r.y - 2; y < r.y + r.h + 2; y++) for (let x = r.x - 2; x < r.x + r.w + 2; x++) {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    const dx = (x - cx) / (r.w / 2), dy = (y - cy) / (r.h / 2);
    const turn = Math.atan2(dy, dx);
    const swell = 0.12 * (1 + Math.sin(turn * 3 + a)) + 0.08 * (1 + Math.sin(turn * 5 + b));
    if (dx * dx + dy * dy <= 0.8 + swell + patchNoise(x, y, 3, salt + 3) * 0.4) { set(x, y, LOW); roomOf[idx(x, y)] = i + 1; }
  }
});
function corridor(a: V, b: V) {
  let x = a.x, y = a.y, off = 0;
  const dig = (px: number, py: number) => { for (const d of [0, 1]) for (const e of [0, 1]) { const qx = px + d, qy = py + e; if (qx > 0 && qy > 0 && qx < W - 1 && qy < H - 1 && at(qx, qy) === ROCK) set(qx, qy, LOW); } };
  const legs: ['x' | 'y', number][] = rng.chance(0.5) ? [['x', b.x], ['y', b.y]] : [['y', b.y], ['x', b.x]];
  for (const [axis, to] of legs) {
    while ((axis === 'x' ? x : y) !== to) {
      if (axis === 'x') x += Math.sign(to - x); else y += Math.sign(to - y);
      const roll = tileNoise(x, y, salt + 4);
      off = Math.max(-2, Math.min(2, off + (roll < 0.3 ? -1 : roll > 0.7 ? 1 : 0)));
      if (axis === 'x') dig(x, y + off); else dig(x + off, y);
    }
  }
}
for (let i = 1; i < rooms.length; i++) corridor(centre(rooms[i - 1]), centre(rooms[i]));
for (let i = 0; i < Math.floor(rooms.length / 3); i++) corridor(centre(rooms[rng.int(0, rooms.length - 1)]), centre(rooms[rng.int(0, rooms.length - 1)]));

// ---- 3. erode the whole grid once, so nothing is a rectangle ----------------
{ const next = new Uint8Array(cells);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && open(x + dx, y + dy)) n++;
    if (open(x, y) && n <= 2) { next[idx(x, y)] = ROCK; roomOf[idx(x, y)] = 0; }
    else if (!open(x, y) && n >= 6) next[idx(x, y)] = LOW;
  }
  cells.set(next); }

function flood(from: V, pass: (x: number, y: number) => boolean): Set<number> {
  const seen = new Set<number>(); const q = [idx(from.x, from.y)]; seen.add(q[0]);
  while (q.length) { const k = q.pop()!; const x = k % W, y = (k - x) / W;
    for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy; if (!inb(nx, ny) || !pass(nx, ny)) continue; const nk = idx(nx, ny); if (!seen.has(nk)) { seen.add(nk); q.push(nk); } } }
  return seen;
}
function components(pass: (x: number, y: number) => boolean): Set<number>[] {
  const done = new Set<number>(); const outC: Set<number>[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!pass(x, y) || done.has(idx(x, y))) continue; const c = flood({ x, y }, pass); c.forEach((k) => done.add(k)); outC.push(c); }
  return outC;
}
const entrance = centre(rooms[0]); set(entrance.x, entrance.y, LOW);
{ const seen = flood(entrance, open); for (const r of rooms) { const c = centre(r); if (!seen.has(idx(c.x, c.y))) { set(c.x, c.y, LOW); corridor(entrance, c); } } }
let exit = centre(rooms[rooms.length - 1]);
{ let best = -1; for (const r of rooms.slice(1)) { const c = centre(r); const d = Math.hypot(c.x - entrance.x, c.y - entrance.y); if (d > best) { best = d; exit = c; } } }

// ---- 4. levels: a ROOM is raised whole. Never the first (the hole), never the
// last (the way out); the rest by a coin weighted to the bigger chambers. ------
const raised = new Set<number>();
rooms.forEach((r, i) => {
  if (i === 0) return;
  const c = centre(r); if (c.x === exit.x && c.y === exit.y) return;
  const big = r.w * r.h >= 48;
  if (rng.chance(big ? 0.55 : 0.3)) raised.add(i + 1);
});
for (let i = 0; i < cells.length; i++) if (cells[i] === LOW && raised.has(roomOf[i])) cells[i] = HIGH;
// the rim is every shelf cell with a non-shelf 8-neighbour; a shelf needs an interior
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (at(x, y) !== HIGH) continue; let edge = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) !== HIGH && at(x + dx, y + dy) !== RIM) edge = true; if (edge) cells[idx(x, y)] = RIM; }
// (the pass above reads RIM it just wrote; re-derive cleanly)
for (let i = 0; i < cells.length; i++) if (cells[i] === RIM) cells[i] = HIGH;
{ const rim: number[] = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (at(x, y) !== HIGH) continue; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) !== HIGH) { rim.push(idx(x, y)); dy = 2; break; } } for (const k of rim) cells[k] = RIM; }
let demoted = 0;
for (const c of components((x, y) => at(x, y) === RIM || at(x, y) === HIGH)) { let interior = 0; c.forEach((k) => { if (cells[k] === HIGH) interior++; }); if (interior < 6) { c.forEach((k) => (cells[k] = LOW)); demoted++; } }

// ---- 5. stairs: where a corridor meets a rim, and a few more on south faces --
// A stair is TWO cells: the rim cell and the low cell beside it. Its side says
// which picture: a south rim carries the tall face, the other three a flat run.
type Stair = { x: number; y: number; side: 'n' | 's' | 'e' | 'w' };
const stairs: Stair[] = [];
const rimIsStraight = (x: number, y: number, side: Stair['side']) => (side === 'n' || side === 's') ? at(x - 1, y) === RIM && at(x + 1, y) === RIM : at(x, y - 1) === RIM && at(x, y + 1) === RIM;
function stairAt(x: number, y: number, side: Stair['side']): boolean {
  const [dx, dy] = side === 'n' ? [0, -1] : side === 's' ? [0, 1] : side === 'e' ? [1, 0] : [-1, 0];
  if (at(x, y) !== RIM || at(x - dx, y - dy) !== HIGH || at(x + dx, y + dy) !== LOW || at(x + 2 * dx, y + 2 * dy) !== LOW) return false;
  if (!rimIsStraight(x, y, side)) return false;
  set(x, y, STAIR); set(x + dx, y + dy, STAIR); stairs.push({ x, y, side });
  return true;
}
function connect() {
  // regions before any stair: union-find over walkable components
  const region = new Map<number, number>(); components(walkable).forEach((c, n) => c.forEach((k) => region.set(k, n)));
  const parent = new Map<number, number>();
  const root = (r: number): number => { let p = parent.get(r) ?? r; while (p !== r) { r = p; p = parent.get(r) ?? r; } return r; };
  const spots: { x: number; y: number; side: Stair['side']; a: number; b: number; mouth: boolean }[] = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (at(x, y) !== RIM) continue;
    for (const side of ['s', 'n', 'e', 'w'] as const) {
      const [dx, dy] = side === 'n' ? [0, -1] : side === 's' ? [0, 1] : side === 'e' ? [1, 0] : [-1, 0];
      if (at(x - dx, y - dy) !== HIGH || at(x + dx, y + dy) !== LOW || at(x + 2 * dx, y + 2 * dy) !== LOW || !rimIsStraight(x, y, side)) continue;
      // a MOUTH is where a corridor (no room of its own) arrives
      const mouth = roomOf[idx(x + dx, y + dy)] === 0;
      spots.push({ x, y, side, a: region.get(idx(x - dx, y - dy))!, b: region.get(idx(x + dx, y + dy))!, mouth });
    }
  }
  // mouths first, then south faces, then the rest; join what is not yet joined
  const order = [...spots.filter((s) => s.mouth), ...spots.filter((s) => !s.mouth && s.side === 's'), ...spots.filter((s) => !s.mouth && s.side !== 's')];
  const near = (s: { x: number; y: number }) => stairs.some((t) => Math.abs(t.x - s.x) + Math.abs(t.y - s.y) <= 2);
  for (const s of rng.shuffle(order.slice(0, 0)).concat(order)) {
    const joins = root(s.a) !== root(s.b);
    if (!joins && !(s.mouth && rng.chance(0.5)) && !rng.chance(0.03)) continue;
    if (near(s) || !stairAt(s.x, s.y, s.side)) continue;
    // widen to two along the rim when the neighbour qualifies too
    const [px, py] = s.side === 'n' || s.side === 's' ? [1, 0] : [0, 1];
    stairAt(s.x + px, s.y + py, s.side);
    parent.set(root(s.a), root(s.b));
  }
  // anything still cut off: dig to it through rock, else lower the shelf
  let dug = 0;
  for (let round = 0; round < 10; round++) {
    const seen = flood(entrance, walkable);
    const lost = components((x, y) => walkable(x, y) && !seen.has(idx(x, y))).sort((a, b) => b.size - a.size);
    if (lost.length === 0) break;
    const c = lost[0];
    let best: { a: V; b: V; d: number } | null = null;
    const reached = [...seen].filter((k) => cells[k] === LOW).map((k) => ({ x: k % W, y: (k - (k % W)) / W }));
    for (const k of c) { const a = { x: k % W, y: (k - (k % W)) / W }; if (cells[k] !== LOW) continue; for (const b of reached) { const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y); if (d < 16 && (!best || d < best.d)) best = { a, b, d }; } }
    if (best) { const keep = new Uint8Array(cells); corridor(best.a, best.b); if (flood(entrance, walkable).has(idx(best.a.x, best.a.y))) { dug++; continue; } cells.set(keep); }
    let lowered = false;
    for (const k of c) { const x = k % W, y = (k - x) / W; for (const [dx, dy] of N4) if (at(x + dx, y + dy) === RIM || at(x + dx, y + dy) === STAIR) { flood({ x: x + dx, y: y + dy }, (px, py) => [RIM, HIGH, STAIR].includes(at(px, py))).forEach((sk) => (cells[sk] = LOW)); demoted++; lowered = true; break; } if (lowered) break; }
    if (!lowered) c.forEach((k) => (cells[k] = ROCK));
  }
  return dug;
}
const dug = connect();
for (let i = stairs.length - 1; i >= 0; i--) if (at(stairs[i].x, stairs[i].y) !== STAIR) stairs.splice(i, 1);

// ---- 6. water: a DEEP core inside a SHALLOW wreath, on the LOW floor only ----
// Brogue's rule: a lake is refused if any dry cell stops being reachable.
const keep = new Set([entrance, exit, ...rooms.map(centre)].map((c) => idx(c.x, c.y)));
const wet = new Float32Array(W * H); for (let i = 0; i < wet.length; i++) wet[i] = patchNoise(i % W, (i - (i % W)) / W, 6, salt + 7);
let pools = 0;
function lake(most: number): boolean {
  const eligible = (x: number, y: number) => at(x, y) === LOW && !keep.has(idx(x, y)) && !N4.some(([dx, dy]) => at(x + dx, y + dy) === STAIR);
  let s = -1; for (let i = 0; i < cells.length; i++) if (eligible(i % W, (i - (i % W)) / W) && (s < 0 || wet[i] < wet[s])) s = i;
  if (s < 0) return false;
  const before = flood(entrance, walkable).size;
  // grow the wreath as a blob off the seed, wettest edge first
  const taken: number[] = []; const edge = [s]; const seen = new Set<number>();
  while (edge.length && taken.length < most) { edge.sort((a, b) => wet[a] - wet[b]); const k = edge.shift()!; if (seen.has(k)) continue; seen.add(k);
    const x = k % W, y = (k - x) / W; if (!eligible(x, y) || wet[k] > wet[s] + 0.25) continue;
    cells[k] = SHALLOW; taken.push(k); for (const [dx, dy] of N4) if (inb(x + dx, y + dy)) edge.push(idx(x + dx, y + dy)); }
  // the DEEP core is every wet cell whose four neighbours are wet too
  const deep = taken.filter((k) => { const x = k % W, y = (k - x) / W; return N4.every(([dx, dy]) => at(x + dx, y + dy) === SHALLOW || at(x + dx, y + dy) === DEEP); });
  for (const k of deep) cells[k] = DEEP;
  const after = flood(entrance, walkable).size;
  if (deep.length < 3 || after !== before - deep.length) { for (const k of taken) cells[k] = LOW; wet[s] = 2; return false; }
  return true;
}
for (let tries = 0; tries < 12 && pools < 3; tries++) if (lake(rng.int(18, 45))) pools++;

// ---- 7. resources: candidate spots by rule ---------------------------------
// ore: a VEIN walked along the rock, 3–5 cells; herb: damp low floor; fish: a
// wreath cell beside deep water with dry floor behind it
const spots: Record<string, V[]> = { ore: [], herb: [], fish: [] };
{ const wall = (x: number, y: number) => at(x, y) === LOW && at(x, y - 1) === ROCK && at(x, y - 2) === ROCK;
  const used = new Set<number>();
  for (let y = 2; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!wall(x, y) || used.has(idx(x, y)) || tileNoise(x, y, salt + 9) > 0.08) continue;
    let run = 0; for (let dx = 0; dx < 5 && wall(x + dx, y) && !used.has(idx(x + dx, y)); dx++) run++;
    if (run < 3) continue;
    for (let dx = 0; dx < run; dx++) { spots.ore.push({ x: x + dx, y: y - 1 }); used.add(idx(x + dx, y)); }
    for (let dx = -3; dx < run + 3; dx++) used.add(idx(x + dx, y));
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (at(x, y) === SHALLOW && N4.some(([dx, dy]) => at(x + dx, y + dy) === DEEP) && N4.some(([dx, dy]) => at(x + dx, y + dy) === LOW)) spots.fish.push({ x, y });
    if (at(x, y) === LOW && N4.some(([dx, dy]) => at(x + dx, y + dy) === SHALLOW) && tileNoise(x, y, salt + 10) < 0.35) spots.herb.push({ x, y });
  } }

const seen = flood(entrance, walkable); let stranded = 0;
for (let i = 0; i < cells.length; i++) if (walkable(i % W, (i - (i % W)) / W) && !seen.has(i)) stranded++;
const counts = [0, 0, 0, 0, 0, 0, 0]; for (const c of cells) counts[c]++;
console.log(`seed ${seed}: rooms ${rooms.length}, raised ${raised.size} (demoted ${demoted}), stairs ${stairs.length} [${stairs.map((s) => s.side).join('')}], dug ${dug}, pools ${pools} (deep ${counts[DEEP]}, shallow ${counts[SHALLOW]}), shelf ${counts[HIGH]}+${counts[RIM]} rim, stranded ${stranded}; spots ore ${spots.ore.length} herb ${spots.herb.length} fish ${spots.fish.length}`);

const CH = ['#', '.', '^', '=', '~', 'S', ','];
const lines: string[] = [];
for (let y = 0; y < H; y++) { let s = ''; for (let x = 0; x < W; x++) { const k = idx(x, y); s += k === idx(entrance.x, entrance.y) ? 'E' : k === idx(exit.x, exit.y) ? 'X' : (walkable(x, y) && !seen.has(k)) ? '?' : CH[cells[k]]; } lines.push(s); }
if (!out) console.log(lines.join('\n'));
if (out) {
  const S = 10; const px = new Uint8Array(W * S * H * S * 4);
  const COL: Record<number, [number, number, number]> = { [ROCK]: [16, 14, 12], [LOW]: [150, 138, 112], [HIGH]: [196, 184, 156], [RIM]: [110, 98, 78], [DEEP]: [40, 66, 96], [STAIR]: [222, 196, 96], [SHALLOW]: [92, 120, 140] };
  const paint = (x: number, y: number, c: [number, number, number], inset = 0) => { for (let yy = inset; yy < S - inset; yy++) for (let xx = inset; xx < S - inset; xx++) { const o = ((y * S + yy) * W * S + x * S + xx) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255; } };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) paint(x, y, COL[at(x, y)]);
  // a south rim hangs a FACE into the cell below; a north/east/west rim is a line
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (at(x, y) === RIM) { if (at(x, y + 1) === LOW || at(x, y + 1) === SHALLOW) { for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) { const o = (((y + 1) * S + yy) * W * S + x * S + xx) * 4; const t = yy / S; px[o] = 70 - t * 20; px[o + 1] = 60 - t * 18; px[o + 2] = 46 - t * 14; } }
      paint(x, y, [196, 184, 156]); if (at(x, y - 1) !== RIM && at(x, y - 1) !== HIGH && at(x, y - 1) !== STAIR) for (let xx = 0; xx < S; xx++) { const o = ((y * S) * W * S + x * S + xx) * 4; px[o] = 236; px[o + 1] = 226; px[o + 2] = 200; } }
  }
  for (const s of stairs) { const [dx, dy] = s.side === 'n' ? [0, -1] : s.side === 's' ? [0, 1] : s.side === 'e' ? [1, 0] : [-1, 0]; for (const [cx, cy] of [[s.x, s.y], [s.x + dx, s.y + dy]]) { paint(cx, cy, COL[STAIR]); for (let i = 1; i < 4; i++) { for (let xx = 0; xx < S; xx++) { const o = ((cy * S + (s.side === 'e' || s.side === 'w' ? xx : i * 2 + 1)) * W * S + cx * S + (s.side === 'e' || s.side === 'w' ? i * 2 + 1 : xx)) * 4; px[o] = 150; px[o + 1] = 120; px[o + 2] = 40; } } } }
  for (const s of spots.ore) paint(s.x, s.y, [176, 96, 64], 3);
  for (const s of spots.herb) paint(s.x, s.y, [96, 150, 72], 3);
  for (const s of spots.fish) paint(s.x, s.y, [140, 210, 230], 3);
  paint(entrance.x, entrance.y, [230, 80, 200], 1); paint(exit.x, exit.y, [80, 230, 120], 1);
  writeFileSync(out, encodePng(W * S, H * S, px as any));
}
