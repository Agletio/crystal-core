/**
 * A contact sheet of candidate PNGs, numbered and magnified, over the floor
 * they will stand on. A design is judged where it is USED — on near-black wet
 * rock — because anything reads on white.
 *
 *   npx tsx tools/art/sheet.mts out.png 4 tools/art/cache/lock_*.png
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mts';

const [out, cols, ...files] = process.argv.slice(2);
const ACROSS = Number(cols) || 4;
const ZOOM = 3;
const PAD = 8;
const FLOOR = [26, 22, 20];

const shots = files.map((f) => ({ f, img: decodePng(readFileSync(f)) }));
const cell = Math.max(...shots.map((s) => Math.max(s.img.width, s.img.height))) * ZOOM + PAD * 2;
const rows = Math.ceil(shots.length / ACROSS);
const W = cell * ACROSS;
const H = cell * rows;
const rgba = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  rgba[i * 4] = FLOOR[0];
  rgba[i * 4 + 1] = FLOOR[1];
  rgba[i * 4 + 2] = FLOOR[2];
  rgba[i * 4 + 3] = 255;
}

/** A hairline between cells, so sixteen chests do not read as one picture. */
const line = (x: number, y: number) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const at = (y * W + x) * 4;
  rgba[at] = 70;
  rgba[at + 1] = 60;
  rgba[at + 2] = 48;
};

shots.forEach(({ img }, i) => {
  const cx = (i % ACROSS) * cell;
  const cy = Math.floor(i / ACROSS) * cell;
  for (let x = 0; x < cell; x++) { line(cx + x, cy); line(cx + x, cy + cell - 1); }
  for (let y = 0; y < cell; y++) { line(cx, cy + y); line(cx + cell - 1, cy + y); }
  const ox = cx + Math.floor((cell - img.width * ZOOM) / 2);
  const oy = cy + Math.floor((cell - img.height * ZOOM) / 2);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const from = (y * img.width + x) * 4;
      const a = img.rgba[from + 3] / 255;
      if (a <= 0.02) continue;
      for (let dy = 0; dy < ZOOM; dy++) {
        for (let dx = 0; dx < ZOOM; dx++) {
          const px = ox + x * ZOOM + dx;
          const py = oy + y * ZOOM + dy;
          if (px < 0 || py < 0 || px >= W || py >= H) continue;
          const to = (py * W + px) * 4;
          for (let c = 0; c < 3; c++) {
            rgba[to + c] = Math.round(img.rgba[from + c] * a + rgba[to + c] * (1 - a));
          }
        }
      }
    }
  }
});

writeFileSync(out, encodePng(W, H, rgba));
console.log(`${out}: ${shots.length} at ${W}x${H}, ${ACROSS} across, in file order`);
shots.forEach((s, i) => console.log(`  ${i}  ${s.f}`));
