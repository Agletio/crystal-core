/**
 * Proves the pipeline without spending a generation: encode a known image,
 * read it back, and reduce it to a grid. A converter that is first exercised
 * on paid-for art is a converter whose bugs cost generations.
 *
 *   npx tsx tools/art/selftest.mts
 */
import { decodePng, encodePng } from './png.mts';
import { toGrid } from './convert.mts';
import { inksFor } from './inks.mts';

let failures = 0;
const check = (ok: boolean, label: string): void => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures++;
};

const inks = inksFor('cinder_hound');
const order = Object.values(inks);

/** A 48px square: left half the mass ink, right half the lit one, top row clear. */
const SIZE = 48;
const rgba = new Uint8Array(SIZE * SIZE * 4);
const hex = (h: string): [number, number, number] => {
  const n = Number.parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mass = hex(inks.m);
const lit = hex(inks.M);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const at = (y * SIZE + x) * 4;
    const [r, g, b] = x < SIZE / 2 ? mass : lit;
    rgba[at] = r;
    rgba[at + 1] = g;
    rgba[at + 2] = b;
    rgba[at + 3] = y < 2 ? 0 : 255;
  }
}

const png = encodePng(SIZE, SIZE, rgba);
const back = decodePng(png);

check(back.width === SIZE && back.height === SIZE, `round trip is ${SIZE}x${SIZE}`);
let same = true;
for (let i = 0; i < rgba.length; i++) if (rgba[i] !== back.rgba[i]) same = false;
check(same, 'every pixel survives encode and decode');

const grid = toGrid(back, 24, inks);
check(grid.length === 24 && grid.every((r) => r.length === 24), 'reduces to a square 24 grid');
check(grid[0] === '.'.repeat(24), 'a transparent row becomes dots');
const middle = grid[12];
check(middle[1] === 'm' && middle[22] === 'M', 'each half snaps to its own ink');
check(
  middle.startsWith('#') && middle.endsWith('#') && grid[1] === '#'.repeat(24),
  'the silhouette carries a derived outline, inside its own edge',
);
check(
  !grid.join('').includes('x') && !grid.join('').includes('b') && !grid.join('').includes('o'),
  'nothing emits the rank accent or the halo',
);

let refused = '';
try {
  toGrid(back, 32, inks);
} catch (e) {
  refused = (e as Error).message;
}
check(refused.includes('does not divide'), 'a non-integer downscale is refused rather than blurred');
check(order.length === 5, 'a creature is five authored inks');

console.log(failures ? `\n  ${failures} failed` : '\n  every check passed');
process.exit(failures ? 1 : 0);
