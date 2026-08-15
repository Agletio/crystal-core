/**
 * Is an edit LOCAL enough to be a per-slot layer?   `layer.mts <base> <dressed>`
 *
 * Route D1 rests on this: if what `edit_image` changed IS the piece asked for,
 * the piece falls out of the subtraction already registered to its frame. On a
 * whole OUTFIT it is not — a mail-and-helm edit put 12% of its change in the
 * boots band, having never mentioned boots. A single piece is the unknown.
 * Costs no generations; bands are fractions of the BODY's extent, not the
 * canvas, so a sprite sitting high in its frame is not scored against air.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mts';

const CACHE = new URL('./cache/designs/', import.meta.url).pathname;

/** Disjoint, so two layers can never claim one pixel. */
export const BANDS: [string, number, number][] = [
  ['helm', 0, 0.28],
  ['body', 0.28, 0.62],
  ['legs', 0.62, 0.78],
  ['boots', 0.78, 1],
];

const at = (name: string) => decodePng(readFileSync(`${CACHE}${name}.png`));
const base = at(process.argv[2]);
const worn = at(process.argv[3]);
const W = base.width;
const H = base.height;
if (worn.width !== W || worn.height !== H) throw new Error('the two are different sizes');

let top = H;
let bottom = 0;
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (base.rgba[(y * W + x) * 4 + 3] > 128) {
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
const span = bottom - top + 1;

// Visibly different AND drawn in the dressed frame: a pixel the edit merely
// cleared is the body being repainted, not a piece being added.
const changed = new Uint8Array(W * H);
const layer = new Uint8Array(W * H * 4);
let count = 0;
for (let i = 0; i < W * H; i++) {
  const a = base.rgba.subarray(i * 4, i * 4 + 4);
  const b = worn.rgba.subarray(i * 4, i * 4 + 4);
  const same =
    Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 24 &&
    Math.abs(a[3] - b[3]) < 40;
  if (same || b[3] < 128) continue;
  changed[i] = 1;
  count++;
  layer.set([b[0], b[1], b[2], 255], i * 4);
}

for (const [name, from, to] of BANDS) {
  let n = 0;
  for (let y = top + Math.floor(from * span); y < top + Math.ceil(to * span); y++)
    for (let x = 0; x < W; x++) if (changed[y * W + x]) n++;
  console.log(`  ${name.padEnd(6)} ${((100 * n) / count).toFixed(1).padStart(5)}% of the edit  (${n} px)`);
}
console.log(`  ${count} pixels changed, body spans rows ${top}-${bottom} of ${H}`);
writeFileSync(process.argv[4] ?? `${CACHE}${process.argv[3]}-layer.png`, encodePng(W, H, layer));
