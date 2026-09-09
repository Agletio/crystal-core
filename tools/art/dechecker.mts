/**
 * A PAINTED BACKGROUND OFF, AND THE FIGURES REPACKED.
 *   `dechecker.mts <in.png> <out.png> [figures]`
 *
 * An image tool asked for transparency sometimes PAINTS the checkerboard
 * instead — opaque pixels no alpha threshold can remove. It is neutral grey
 * where the subject is not, so it floods inward from the border. Flooding
 * rather than matching by colour keeps a pale claw INSIDE the body: the flood
 * never reaches it.
 *
 * Figures are then found by the GAPS, never by equal cuts, which clip a wide
 * contact pose's feet. The VERTICAL is untouched: a body's bob between frames
 * is a fault to show rather than hide.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mts';

const [inPath, outPath, figuresArg] = process.argv.slice(2);
if (!inPath || !outPath) throw new Error('dechecker.mts <in.png> <out.png> [figures]');
const WANT = Number(figuresArg ?? 6);

const img = decodePng(readFileSync(inPath));
const { width: W, height: H } = img;
const rgba = new Uint8Array(img.rgba);
const chroma = (i: number) => Math.max(rgba[i], rgba[i+1], rgba[i+2]) - Math.min(rgba[i], rgba[i+1], rgba[i+2]);
const luma = (i: number) => 0.299 * rgba[i] + 0.587 * rgba[i+1] + 0.114 * rgba[i+2];

// Read off the border rather than assumed.
const edge: number[] = [];
for (let x = 0; x < W; x++) { edge.push(luma((0 * W + x) * 4)); edge.push(luma(((H-1) * W + x) * 4)); }
const lo = Math.min(...edge), hi = Math.max(...edge);
console.log(`  border luma ${lo.toFixed(0)}..${hi.toFixed(0)}, chroma at corner ${chroma(0)}`);

const CHROMA = 14;              // how neutral a pixel must be to be background
// SHADOW is painted in too, neutral but darker, and it bridges two figures —
// so the window reaches near-black and the pass below restores the contour.
const PAD = 12;
const FLOOR = 30;
const seen = new Uint8Array(W * H);
const stack: number[] = [];
const push = (x: number, y: number) => {
  if (x < 0 || y < 0 || x >= W || y >= H || seen[y*W+x]) return;
  const i = (y*W+x)*4;
  if (chroma(i) > CHROMA) return;
  const l = luma(i);
  if (l < FLOOR || l > hi + PAD) return;
  seen[y*W+x] = 1; stack.push(x, y);
};
for (let x = 0; x < W; x++) { push(x, 0); push(x, H-1); }
for (let y = 0; y < H; y++) { push(0, y); push(W-1, y); }
while (stack.length) {
  const y = stack.pop()!, x = stack.pop()!;
  push(x-1, y); push(x+1, y); push(x, y-1); push(x, y+1);
}
// A flooded pixel touching COLOURED ink is the silhouette: put it back.
const keep = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!seen[y*W+x]) continue;
  for (let dy = -2; dy <= 2 && !keep[y*W+x]; dy++) for (let dx = -2; dx <= 2; dx++) {
    const nx = x+dx, ny = y+dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny*W+nx]) continue;
    if (chroma((ny*W+nx)*4) > CHROMA) { keep[y*W+x] = 1; break; }
  }
}
let cleared = 0, saved = 0;
for (let k = 0; k < W*H; k++) {
  if (!seen[k]) continue;
  if (keep[k]) { saved++; continue; }
  rgba[k*4+3] = 0; cleared++;
}
console.log(`  ${(cleared/(W*H)*100).toFixed(1)}% flooded away, ${saved} contour px kept`);

const inked: boolean[] = [];
for (let x = 0; x < W; x++) {
  let n = 0;
  for (let y = 0; y < H; y++) if (rgba[(y*W+x)*4+3] > 40) n++;
  // A FEW stray pixels are the checker's own anti-aliased edge, not a body:
  // counting them bridges the gap between two figures and merges them.
  inked.push(n > H * 0.02);
}
const spans: [number, number][] = [];
let start = -1;
for (let x = 0; x <= W; x++) {
  if (x < W && inked[x]) { if (start < 0) start = x; }
  else if (start >= 0) { if (x - start > 20) spans.push([start, x-1]); start = -1; }
}
// Two figures can stand too close for an empty column between them, so split
// the WIDEST at its own thinnest column — the waist between the pair.
const ink = (x: number) => {
  let n = 0;
  for (let y = 0; y < H; y++) if (rgba[(y*W+x)*4+3] > 40) n++;
  return n;
};
while (spans.length < WANT && spans.length > 0) {
  let widest = 0;
  spans.forEach((sp, i) => { if (sp[1]-sp[0] > spans[widest][1]-spans[widest][0]) widest = i; });
  const [a, b] = spans[widest];
  const from = a + Math.round((b-a) * 0.3), to = a + Math.round((b-a) * 0.7);
  let cut = from, low = Infinity;
  for (let x = from; x <= to; x++) { const v = ink(x); if (v < low) { low = v; cut = x; } }
  spans.splice(widest, 1, [a, cut-1], [cut+1, b]);
  console.log(`  split ${a}-${b} at x=${cut} (${low} inked rows there)`);
}
console.log(`  ${spans.length} figures: ${spans.map(([a,b]) => `${a}-${b} (${b-a+1}px)`).join(', ')}`);
if (spans.length !== WANT) console.log(`  WANTED ${WANT} — check the gaps before trusting this`);

const cell = Math.max(...spans.map(([a,b]) => b-a+1)) + 8;
const OW = cell * spans.length;
const out = new Uint8Array(OW * H * 4);
spans.forEach(([a, b], k) => {
  const w = b - a + 1;
  const ox = k * cell + Math.floor((cell - w) / 2); // centred across, vertical untouched
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
    const s = (y*W + a + x) * 4, d = (y*OW + ox + x) * 4;
    for (let c = 0; c < 4; c++) out[d+c] = rgba[s+c];
  }
});
writeFileSync(outPath, encodePng(OW, H, out));
console.log(`  -> ${outPath} ${OW}x${H}, ${spans.length} cells of ${cell}`);
