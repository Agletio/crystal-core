/**
 * A LARGE SOURCE PICTURE DOWN TO A 48px ICON.
 *   `downsize.mts <in.png> <out.png> [grid] [pad] [cut]`
 *
 * An image model returns a picture that LOOKS like pixel art at 1254px: tens
 * of thousands of colours, soft alpha, and blocks that do not divide the
 * canvas. Prompting for a native grid has been tried and does not hold, so the
 * grid, the palette and the alpha are enforced HERE instead — which is the
 * only place they can be enforced at all.
 *
 * Four stages, in this order, and the order matters:
 *   1. crop to what is actually drawn, ignoring the near-transparent fringe
 *   2. area-average down, PREMULTIPLIED — averaging straight RGB across an
 *      edge pulls the background's colour into it and every silhouette gets a
 *      dark rim
 *   3. cut alpha to 0 or 255 at `cut`, because the tables hold no partial
 *      alpha and a soft edge quantises to a halo
 *   4. snap every colour to the shipped icon palette, nearest, NO dithering —
 *      dither at 48px is noise, not shading
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mts';
import { GENERATED_ICONS } from '../../src/render/generated-icons';

const [inPath, outPath, gridArg, padArg, cutArg] = process.argv.slice(2);
if (!inPath || !outPath) throw new Error('downsize.mts <in.png> <out.png> [grid] [pad] [cut]');
const GRID = Number(gridArg ?? 48);
const PAD = Number(padArg ?? 2);
const CUT = Number(cutArg ?? 128);

/** THE PALETTE THE GAME IS MADE OF, read off the shipped rows rather than
 *  typed here — so it cannot drift from what ships. */
const palette: number[][] = (() => {
  const seen = new Set<string>();
  for (const row of Object.values(GENERATED_ICONS))
    for (const hex of Object.values(row.key)) seen.add(hex.toLowerCase());
  return [...seen].map((h) => [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16)));
})();

const src = decodePng(readFileSync(inPath));
const { width: W, height: H, rgba } = src;
const A = (x: number, y: number) => rgba[(y * W + x) * 4 + 3];

// 1. CROP. The fringe is alpha 1-8 spray around the subject; including it
//    drags the fitted box outward and shrinks the art inside the frame.
const FRINGE = 24;
let x0 = W, y0 = H, x1 = -1, y1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (A(x, y) < FRINGE) continue;
  if (x < x0) x0 = x; if (x > x1) x1 = x;
  if (y < y0) y0 = y; if (y > y1) y1 = y;
}
if (x1 < 0) throw new Error('nothing drawn');
const cw = x1 - x0 + 1, ch = y1 - y0 + 1;

// 2. AREA-AVERAGE into the padded box, keeping the source's aspect.
const box = GRID - PAD * 2;
const scale = Math.min(box / cw, box / ch);
const dw = Math.max(1, Math.round(cw * scale)), dh = Math.max(1, Math.round(ch * scale));
const offX = Math.floor((GRID - dw) / 2), offY = Math.floor((GRID - dh) / 2);
const out = new Uint8Array(GRID * GRID * 4);

for (let dy = 0; dy < dh; dy++) {
  for (let dx = 0; dx < dw; dx++) {
    const sx0 = x0 + Math.floor((dx / dw) * cw), sx1 = x0 + Math.max(Math.floor(((dx + 1) / dw) * cw), Math.floor((dx / dw) * cw) + 1);
    const sy0 = y0 + Math.floor((dy / dh) * ch), sy1 = y0 + Math.max(Math.floor(((dy + 1) / dh) * ch), Math.floor((dy / dh) * ch) + 1);
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let sy = sy0; sy < sy1 && sy < H; sy++) {
      for (let sx = sx0; sx < sx1 && sx < W; sx++) {
        const i = (sy * W + sx) * 4, al = rgba[i + 3] / 255;
        r += rgba[i] * al; g += rgba[i + 1] * al; b += rgba[i + 2] * al;
        a += rgba[i + 3]; n++;
      }
    }
    if (!n) continue;
    const meanA = a / n;
    const d = ((dy + offY) * GRID + dx + offX) * 4;
    // 3. HARD ALPHA, and the colour un-premultiplied by the coverage it had.
    if (meanA < CUT) { out[d + 3] = 0; continue; }
    const cover = Math.max(1e-6, meanA / 255 * n);
    out[d] = Math.min(255, Math.round(r / cover));
    out[d + 1] = Math.min(255, Math.round(g / cover));
    out[d + 2] = Math.min(255, Math.round(b / cover));
    out[d + 3] = 255;
  }
}

// 4. SNAP to the palette.
/** Brightness distance PLUS the chroma vector's, weighted heavier. A plain
 *  luma metric lets a neutral grey land on a brown of the same brightness,
 *  because only chroma separates them: a steel blade round-tripped through it
 *  comes back with a tan blade and a brown guard. Pixel-exact recovery cannot
 *  tell the two apart — 19% against 20% — and looking at them can, which is
 *  why the choice was made on a picture. `SNAP=luma|rgb` overrides. */
const MODE = process.env.SNAP ?? 'chroma';
const near = (r: number, g: number, b: number) => {
  let best = palette[0], bd = Infinity;
  for (const p of palette) {
    let d: number;
    if (MODE === 'luma') d = (p[0] - r) ** 2 * 0.3 + (p[1] - g) ** 2 * 0.59 + (p[2] - b) ** 2 * 0.11;
    else if (MODE === 'rgb') d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2;
    else {
      const lp = (p[0] + p[1] + p[2]) / 3, ls = (r + g + b) / 3;
      d = (lp - ls) ** 2
        + 2.2 * ((p[0] - lp - (r - ls)) ** 2 + (p[1] - lp - (g - ls)) ** 2 + (p[2] - lp - (b - ls)) ** 2);
    }
    if (d < bd) { bd = d; best = p; }
  }
  return best;
};
const used = new Set<string>();
for (let i = 0; i < out.length; i += 4) {
  if (!out[i + 3]) continue;
  const [r, g, b] = near(out[i], out[i + 1], out[i + 2]);
  out[i] = r; out[i + 1] = g; out[i + 2] = b;
  used.add(`${r},${g},${b}`);
}

writeFileSync(outPath, encodePng(GRID, GRID, out));
let solid = 0;
for (let i = 3; i < out.length; i += 4) if (out[i]) solid++;
console.log(`${inPath} ${W}x${H} → ${outPath} ${GRID}x${GRID}`);
console.log(`  drawn area ${cw}x${ch} → ${dw}x${dh}, ${solid} solid px, ${used.size} palette colours used`);
