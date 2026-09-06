/**
 * WHERE THE FLOORS ARE in a drawn cross-section, as a chart you can read
 * coordinates off, and THE COURSE BETWEEN TWO OF THEM. A depth and a branch are
 * both placed in PERCENT of the picture, and placing one by eye puts it in
 * solid rock:
 *
 *   npx tsx tools/act-floors.mts climb_act1 [share]
 *   npx tsx tools/act-floors.mts some.png   [share]
 *   npx tsx tools/act-floors.mts climb_act1 path 36 12 92 95 [tol]
 *
 * `share` is how much of the picture counts as floor, 0.16 by default — a
 * PERCENTILE, since a few lamp pixels set the top of the range. `path` walks
 * the drawn floors from one point to another and prints the polyline to paste
 * into `LadderZoneDef.path`: rock is dear and floor is cheap, so the cheapest
 * route IS the mine's own main passage. `tol` is how far the simplified line
 * may sit off it, in percent — 1.2 keeps a zigzag and drops the stair treads.
 */
import { existsSync, readFileSync } from 'node:fs';
import { decodePng } from './art/png.mts';

const asked = process.argv[2] ?? '';
const scenes = new URL('../src/render/generated-scene.ts', import.meta.url).pathname;
/** A SCENE ID reads the shipped picture out of the emitted table. */
function shipped(id: string): Buffer | null {
  if (!existsSync(scenes)) return null;
  const row = new RegExp(`^  ${id}: \\{ w: \\d+, h: \\d+, png: '([^']+)' \\},$`, 'm')
    .exec(readFileSync(scenes, 'utf8'));
  return row ? Buffer.from(row[1].split(',', 2)[1], 'base64') : null;
}
const png = asked.endsWith('.png') ? readFileSync(asked) : shipped(asked);
if (!png) {
  console.error(`act-floors: no scene or file called ${asked || '<nothing>'}`);
  process.exit(1);
}
const file = asked;
const { width, height, rgba } = decodePng(png);
const luma = (i: number) => 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
if (process.argv[3] === 'path') {
  const [ax, ay, bx, by] = process.argv.slice(4, 8).map(Number);
  trace([ax, ay], [bx, by], Number(process.argv[8] ?? 1.2));
  process.exit(0);
}
const all: number[] = [];
for (let i = 0; i < rgba.length; i += 4) all.push(luma(i));
all.sort((a, b) => a - b);
const mean = all.reduce((n, v) => n + v, 0) / all.length;
const bright = all[Math.floor(all.length * (1 - Number(process.argv[3] ?? 0.16)))];
const CW = 16, CH = 12;
const cols = Math.floor(width / CW), rows = Math.floor(height / CH);
const grid: number[][] = [];
for (let r = 0; r < rows; r++) {
  const row: number[] = [];
  for (let c = 0; c < cols; c++) {
    let n = 0;
    for (let y = r * CH; y < (r + 1) * CH; y++)
      for (let x = c * CW; x < (c + 1) * CW; x++)
        if (luma((y * width + x) * 4) > bright) n++;
    row.push(n / (CW * CH));
  }
  grid.push(row);
}
console.log(`${file} ${width}x${height} mean ${mean.toFixed(0)} bright>${bright.toFixed(0)}`);
for (let r = 0; r < rows; r++) {
  console.log(String(Math.round((r + 0.5) / rows * 100)).padStart(3) + ' ' +
    grid[r].map((v) => (v > 0.5 ? '#' : v > 0.2 ? '+' : '.')).join(''));
}
console.log('    ' + Array.from({ length: cols }, (_, c) =>
  (Math.round((c + 0.5) / cols * 100) % 10 === 0 ? '|' : ' ')).join(''));
console.log('    ' + Array.from({ length: cols }, (_, c) => {
  const p = Math.round((c + 0.5) / cols * 100);
  return p % 10 === 0 ? String(p / 10) : ' ';
}).join(''));

/** THE COURSE between two points, in the picture's own floors. Cells are the
 *  MEAN luma of an 8px block: the max reads a bright vein in the rock as floor
 *  and the route then goes straight through the stone. */
function trace(from: [number, number], to: [number, number], tol: number): void {
  const C = 4;
  const cw = Math.floor(width / C), ch = Math.floor(height / C);
  const cell: number[] = [];
  for (let r = 0; r < ch; r++) for (let c = 0; c < cw; c++) {
    let sum = 0;
    for (let y = r * C; y < (r + 1) * C; y++)
      for (let x = c * C; x < (c + 1) * C; x++) sum += luma((y * width + x) * 4);
    cell.push(sum / (C * C));
  }
  const cost = (i: number) => (cell[i] > 80 ? 1 : cell[i] > 60 ? 20 : 4000);
  const spot = ([px, py]: [number, number]) =>
    Math.round(py / 100 * (ch - 1)) * cw + Math.round(px / 100 * (cw - 1));
  const start = spot(from), goal = spot(to);
  const dist = new Float64Array(cw * ch).fill(Infinity);
  const back = new Int32Array(cw * ch).fill(-1);
  dist[start] = 0;
  const open = new Set<number>([start]);
  while (open.size) {
    let cur = -1;
    for (const i of open) if (cur < 0 || dist[i] < dist[cur]) cur = i;
    open.delete(cur);
    if (cur === goal) break;
    const cx = cur % cw, cy = (cur / cw) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
      const ni = ny * cw + nx;
      const d = dist[cur] + cost(ni) * (dx && dy ? 1.414 : 1);
      if (d < dist[ni]) { dist[ni] = d; back[ni] = cur; open.add(ni); }
    }
  }
  const walk: [number, number][] = [];
  for (let i = goal; i !== -1; i = back[i]) {
    walk.unshift([(i % cw) / (cw - 1) * 100, ((i / cw) | 0) / (ch - 1) * 100]);
  }
  const thin = (p: [number, number][]): [number, number][] => {
    if (p.length < 3) return p;
    const [a, b] = [p[0], p[p.length - 1]];
    const span = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let worst = 0, wi = 0;
    for (let i = 1; i < p.length - 1; i++) {
      const off = Math.abs((b[0] - a[0]) * (a[1] - p[i][1]) - (a[0] - p[i][0]) * (b[1] - a[1])) / span;
      if (off > worst) { worst = off; wi = i; }
    }
    return worst <= tol ? [a, b] : [...thin(p.slice(0, wi + 1)).slice(0, -1), ...thin(p.slice(wi))];
  };
  const line = thin(walk).map(([x, y]) => [Math.round(x), Math.round(y)]);
  console.log(`${walk.length} cells -> ${line.length} points`);
  console.log(JSON.stringify(line));
}
