/**
 * A WALKED ROUTE THROUGH A DRAWN CAVE. One rule, used by `act-floors.mts` for
 * a zone's main course and by `zone-net.mts` for every link on it.
 *
 * FOUR-CONNECTED, AND A TURN COSTS — *"have the lines go through as if you
 * were someone walking the cave, have to take a ladder, have to walk through
 * openings"*. A diagonal is not a move, so a route runs along a level and
 * climbs a ladder rather than cutting the corner; the turn penalty is what
 * keeps it to long straight runs instead of a staircase of little steps.
 * Cells are the MEAN luma of a block: the max reads a bright vein in the rock
 * as floor and the route then goes straight through the stone.
 */
import { existsSync, readFileSync } from 'node:fs';
import { decodePng } from './art/png.mts';

const SCENES = new URL('../src/render/generated-scene.ts', import.meta.url).pathname;

/** A SCENE ID reads the shipped picture out of the emitted table. */
export function shippedScene(id: string): Buffer | null {
  if (!existsSync(SCENES)) return null;
  const row = new RegExp(`^  ${id}: \\{ w: \\d+, h: \\d+, png: '([^']+)' \\},$`, 'm')
    .exec(readFileSync(SCENES, 'utf8'));
  return row ? Buffer.from(row[1].split(',', 2)[1], 'base64') : null;
}

export interface Cave {
  width: number;
  height: number;
  luma: (i: number) => number;
  cw: number;
  ch: number;
  cell: number[];
}

const C = 4; // picture pixels a routing cell

export function readCave(png: Buffer): Cave {
  const { width, height, rgba } = decodePng(png);
  const luma = (i: number) => 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
  const cw = Math.floor(width / C), ch = Math.floor(height / C);
  const cell: number[] = [];
  for (let r = 0; r < ch; r++) for (let c = 0; c < cw; c++) {
    let sum = 0;
    for (let y = r * C; y < (r + 1) * C; y++)
      for (let x = c * C; x < (c + 1) * C; x++) sum += luma((y * width + x) * 4);
    cell.push(sum / (C * C));
  }
  return { width, height, luma, cw, ch, cell };
}

const WAYS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const TURN = 26;

/** A binary heap of (cost, state). A linear scan over the open set turned one
 *  route into a second of work and 741 of them into an afternoon. */
class Heap {
  private cost: number[] = [];
  private what: number[] = [];
  get size(): number { return this.what.length; }
  push(c: number, v: number): void {
    this.cost.push(c); this.what.push(v);
    let i = this.what.length - 1;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (this.cost[up] <= this.cost[i]) break;
      this.swap(i, up); i = up;
    }
  }
  pop(): { cost: number; what: number } {
    const out = { cost: this.cost[0], what: this.what[0] };
    const c = this.cost.pop()!, w = this.what.pop()!;
    if (this.what.length) {
      this.cost[0] = c; this.what[0] = w;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let best = i;
        if (l < this.what.length && this.cost[l] < this.cost[best]) best = l;
        if (r < this.what.length && this.cost[r] < this.cost[best]) best = r;
        if (best === i) break;
        this.swap(i, best); i = best;
      }
    }
    return out;
  }
  private swap(a: number, b: number): void {
    [this.cost[a], this.cost[b]] = [this.cost[b], this.cost[a]];
    [this.what[a], this.what[b]] = [this.what[b], this.what[a]];
  }
}

/** EVERY ROUTE OUT OF ONE POINT, in one sweep. State is the cell AND the way
 *  you came into it, or a turn cannot be priced. */
export function walkFrom(cave: Cave, from: [number, number]) {
  const { cw, ch, cell } = cave;
  const price = (i: number) => (cell[i] > 80 ? 1 : cell[i] > 55 ? 6 : cell[i] > 40 ? 90 : 4000);
  const spot = ([px, py]: [number, number]) =>
    Math.round(py / 100 * (ch - 1)) * cw + Math.round(px / 100 * (cw - 1));
  const start = spot(from);
  const dist = new Float64Array(cw * ch * 4).fill(Infinity);
  const back = new Int32Array(cw * ch * 4).fill(-1);
  const heap = new Heap();
  for (let w = 0; w < 4; w++) { dist[start * 4 + w] = 0; heap.push(0, start * 4 + w); }
  while (heap.size) {
    const { cost, what: cur } = heap.pop();
    if (cost > dist[cur]) continue;
    const at = cur >> 2, came = cur & 3;
    const cx = at % cw, cy = (at / cw) | 0;
    for (let w = 0; w < 4; w++) {
      const nx = cx + WAYS[w][0], ny = cy + WAYS[w][1];
      if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
      const ni = ny * cw + nx;
      const step = cost + price(ni) + (w === came ? 0 : TURN);
      if (step < dist[ni * 4 + w]) {
        dist[ni * 4 + w] = step;
        back[ni * 4 + w] = cur;
        heap.push(step, ni * 4 + w);
      }
    }
  }
  const routeTo = (to: [number, number]): { route: [number, number][]; cost: number } => {
    const goal = spot(to);
    let end = -1;
    for (let w = 0; w < 4; w++) if (end < 0 || dist[goal * 4 + w] < dist[end]) end = goal * 4 + w;
    if (end < 0 || !Number.isFinite(dist[end])) return { route: [], cost: Infinity };
    const route: [number, number][] = [];
    for (let i = end; i !== -1; i = back[i]) {
      const at = i >> 2;
      route.unshift([(at % cw) / (cw - 1) * 100, ((at / cw) | 0) / (ch - 1) * 100]);
    }
    return { route, cost: dist[end] };
  };
  return { routeTo };
}

export const walk = (cave: Cave, from: [number, number], to: [number, number]) =>
  walkFrom(cave, from).routeTo(to);

/** Douglas-Peucker, in percent: `tol` is how far the kept line may sit off it. */
export function thin(p: [number, number][], tol: number): [number, number][] {
  if (p.length < 3) return p;
  const [a, b] = [p[0], p[p.length - 1]];
  const span = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let worst = 0, wi = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const off = Math.abs((b[0] - a[0]) * (a[1] - p[i][1]) - (a[0] - p[i][0]) * (b[1] - a[1])) / span;
    if (off > worst) { worst = off; wi = i; }
  }
  return worst <= tol
    ? [a, b]
    : [...thin(p.slice(0, wi + 1), tol).slice(0, -1), ...thin(p.slice(wi), tol)];
}

/** How far a route actually walks, in percent of the picture. */
export const walked = (p: [number, number][]): number =>
  p.slice(1).reduce((n, to, i) => n + Math.hypot(to[0] - p[i][0], to[1] - p[i][1]), 0);
