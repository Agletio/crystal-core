/**
 * A piece of armour cut OUT of a dressed frame.  `layer.mts <base> <slot>:<worn> ...`
 *
 * `edit_image` dresses the same man — 97% silhouette overlap — but it REPAINTS
 * every pixel doing it. Asked for a helm and forbidden to touch anything below
 * the neck, 24% of what changed landed on the head and 18% on the boots, and a
 * higher threshold does not concentrate it. So a DIFF is not a piece.
 *
 * What survives that is the CROP. A slot is a BAND of the body's own extent, the
 * dressed frame is kept inside its band and discarded everywhere else, and the
 * repaint goes with it. Registration is free by construction, and two edits
 * compose: a helm out of one and a hauberk out of another land on one man.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng, type Decoded } from './png.mts';

const CACHE = new URL('./cache/designs/', import.meta.url).pathname;

/** Disjoint and covering, as fractions of the BODY's extent rather than of the
 *  canvas: a sprite sitting high in its frame is not measured against air. The
 *  head cut is the base of the neck — judged over 0.18 to 0.28, and above it the
 *  helm loses its collar while below it the crop starts eating shoulder. */
export const SLOTS: Record<string, [number, number]> = {
  helm: [0, 0.24],
  body: [0.24, 0.62],
  legs: [0.62, 0.78],
  boots: [0.78, 1],
};

const at = (name: string) => decodePng(readFileSync(name.includes('/') ? name : `${CACHE}${name}.png`));

function extent(img: Decoded): [number, number] {
  let top = img.height;
  let bottom = -1;
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++)
      if (img.rgba[(y * img.width + x) * 4 + 3] > 128) {
        if (y < top) top = y;
        bottom = y;
      }
  return [top, bottom];
}

// Exporting SLOTS means this file is also IMPORTED, so the CLI is guarded.
if (import.meta.filename === process.argv[1]) main();

function main(): void {
const base = at(process.argv[2]);
const W = base.width;
const H = base.height;
const [top, bottom] = extent(base);
const span = bottom - top + 1;
const row = (f: number) => top + Math.round(f * span);

const worn = new Uint8Array(base.rgba);
for (const arg of process.argv.slice(3)) {
  const [slot, name] = arg.split(':');
  const band = SLOTS[slot];
  if (!band || !name) throw new Error(`${arg}: want <slot>:<image>, slot one of ${Object.keys(SLOTS)}`);
  const dressed = at(name);
  if (dressed.width !== W || dressed.height !== H) throw new Error(`${name} is a different size`);

  // What the edit ACTUALLY moved, banded — the measurement that killed the diff.
  const changed = new Uint8Array(W * H);
  let count = 0;
  for (let i = 0; i < W * H; i++) {
    const a = base.rgba.subarray(i * 4, i * 4 + 4);
    const b = dressed.rgba.subarray(i * 4, i * 4 + 4);
    const moved =
      Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) >= 24 ||
      Math.abs(a[3] - b[3]) >= 40;
    if (!moved || b[3] < 128) continue;
    changed[i] = 1;
    count++;
  }
  const split = Object.entries(SLOTS).map(([other, [from, to]]) => {
    let n = 0;
    for (let y = row(from); y < (to === 1 ? H : row(to)); y++)
      for (let x = 0; x < W; x++) if (changed[y * W + x]) n++;
    return `${other} ${((100 * n) / count).toFixed(0).padStart(2)}%`;
  });
  const [dtop, dbottom] = extent(dressed);
  console.log(`${slot.padEnd(5)} <- ${name}`);
  console.log(`  the edit moved: ${split.join('  ')}  (${count} px)`);
  console.log(`  extent ${dtop}-${dbottom} against the base's ${top}-${bottom}`);

  const layer = new Uint8Array(W * H * 4);
  for (let y = row(band[0]); y < (band[1] === 1 ? H : row(band[1])); y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      layer.set(dressed.rgba.subarray(i, i + 4), i);
      worn.set(dressed.rgba.subarray(i, i + 4), i);
    }
  writeFileSync(`${CACHE}${name}-${slot}.png`, encodePng(W, H, layer));
  console.log(`  ${CACHE}${name}-${slot}.png`);
}

writeFileSync(`${CACHE}${process.argv[2]}-worn.png`, encodePng(W, H, worn));
console.log(`${CACHE}${process.argv[2]}-worn.png`);
}
