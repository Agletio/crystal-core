/**
 * WHERE THE FLOORS ARE in a drawn cross-section, as a chart you can read
 * coordinates off, and the COURSE between two of them:
 *
 *   npx tsx tools/act-floors.mts climb_act1 [share]
 *   npx tsx tools/act-floors.mts climb_act1 path 36 12 92 95 [tol]
 *
 * `share` is how much counts as floor — a PERCENTILE, since a few lamp pixels
 * set the top of the range. `path` walks it with the SURVEY's own routing:
 * four-connected, so it returns along levels and up ladders.
 */
import { existsSync, readFileSync } from 'node:fs';
import { decodePng } from './art/png.mts';
import { readCave, thin, walkFrom } from './cavepath.mts';

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

/** THE COURSE between two points, walked by the Survey's own routing. */
function trace(from: [number, number], to: [number, number], tol: number): void {
  const walk = walkFrom(readCave(png!), from).routeTo(to);
  const line = thin(walk.route, tol).map(([x, y]) => [Math.round(x), Math.round(y)]);
  console.log(`${walk.route.length} cells -> ${line.length} points`);
  console.log(JSON.stringify(line));
}
