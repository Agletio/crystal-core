// Draw a PNG at Nx with a labelled pixel grid, to read part boundaries off it.
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from '../art/png.mts';
const [file, out, scaleArg = '6', stepArg = '8'] = process.argv.slice(2);
const S = Number(scaleArg), STEP = Number(stepArg);
const img = decodePng(readFileSync(file));
let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
  if (img.rgba[(y * img.width + x) * 4 + 3] < 128) continue;
  x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
}
console.log(`ink bbox x ${x0}..${x1} (${x1 - x0 + 1}w)  y ${y0}..${y1} (${y1 - y0 + 1}h)`);
const W = img.width * S, H = img.height * S;
const px = new Uint8Array(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const sx = Math.floor(x / S), sy = Math.floor(y / S);
  const s = (sy * img.width + sx) * 4, d = (y * W + x) * 4;
  const a = img.rgba[s + 3];
  const onGrid = (sx % STEP === 0 && x % S === 0) || (sy % STEP === 0 && y % S === 0);
  if (a >= 128) { px[d] = img.rgba[s]; px[d + 1] = img.rgba[s + 1]; px[d + 2] = img.rgba[s + 2]; }
  else { px[d] = 70; px[d + 1] = 64; px[d + 2] = 58; }
  if (onGrid) { px[d] = 255; px[d + 1] = 60; px[d + 2] = 60; }
  px[d + 3] = 255;
}
writeFileSync(out, encodePng(W, H, px));
console.log(`${out} ${W}x${H}, red lines every ${STEP}px`);
