/**
 * PNGs side by side, magnified NEAREST.
 *
 *   npx tsx tools/art/side.mts out.png [scale] <png> [png ...]
 *
 * What a DESIGN or a rotation is judged on: whatever files you point it at,
 * which is how two candidate asks — or the same weapon on both heroes — are
 * compared at a size the fault is visible at. Usually `cache/designs/`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mts';

const [out, zoom = '5', ...files] = process.argv.slice(2);
if (!out || files.length === 0) throw new Error('side.mts out.png [scale] <png> [png ...]');

const scale = Math.max(1, Math.floor(Number(zoom)));
const shots = files.map((f) => decodePng(readFileSync(f)));
const w = Math.max(...shots.map((i) => i.width));
const h = Math.max(...shots.map((i) => i.height));
const across = w * shots.length * scale;
const down = h * scale;
const pixels = new Uint8Array(across * down * 4);
for (let i = 0; i < across * down; i++) pixels.set([24, 22, 28, 255], i * 4);

shots.forEach((img, n) => {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const from = (y * img.width + x) * 4;
      if (img.rgba[from + 3] < 128) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const to = ((y * scale + dy) * across + (n * w + x) * scale + dx) * 4;
          for (let k = 0; k < 4; k++) pixels[to + k] = img.rgba[from + k];
        }
      }
    }
  }
});

writeFileSync(out, encodePng(across, down, pixels));
console.log(`${out}: ${files.length} at ${w}x${h}, ${scale}x`);
