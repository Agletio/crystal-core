/** Where the FLOORS are in an act's cross-section: the pale, roughly flat runs
 *  a station can stand on, found by luma so a branch is placed on the picture
 *  rather than beside it. */
import { readFileSync } from 'node:fs';
import { decodePng } from './tools/art/png.mts';

const file = process.argv[2];
const { width, height, rgba } = decodePng(readFileSync(file));
const luma = (i: number) => 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
// A PERCENTILE, never a fraction of the range: a few lamp pixels set the top
// and every floor in the picture then reads as rock.
const all: number[] = [];
for (let i = 0; i < rgba.length; i += 4) all.push(luma(i));
all.sort((a, b) => a - b);
const mean = all.reduce((n, v) => n + v, 0) / all.length;
const bright = all[Math.floor(all.length * (1 - Number(process.argv[3] ?? 0.16)))];
// A CELL is 16x16 of the picture; a cell is "floor" when most of it is pale.
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
