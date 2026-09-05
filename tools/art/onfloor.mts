/**
 * CANDIDATES ON THE FLOOR THEY WILL STAND ON, at 3x and side by side.
 * `onfloor.mts <dir> <name…>` reads `<dir>/<name>.png` and writes `sheet.png`.
 * A design judged on white is a design judged against nothing, and the USER is
 * who approves one — so a picture put in front of him is part of the ask.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { ZONES } from '../../src/render/generated-tiles';
import { decodePng, encodePng } from './png.mts';

const set = ZONES.test_round;
const tiles = decodePng(Buffer.from(set.png.split(',')[1], 'base64'));
const box = set.tiles.find((t) => t.key === 0)!.box;

const dir = process.argv[2];
const NAMES = process.argv.slice(3);
const BIG = 4;
const span = 2 * set.grid * BIG;
const pad = 20;
const cell = span + pad * 2;
const W = cell * NAMES.length;
const H = cell;
const out = new Uint8Array(W * H * 4);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const s = ((box[1] + (y % box[3])) * tiles.width + box[0] + (x % box[2])) * 4;
    const d = (y * W + x) * 4;
    for (let c = 0; c < 4; c++) out[d + c] = tiles.rgba[s + c];
  }
}

NAMES.forEach((name, i) => {
  const art = decodePng(readFileSync(`${dir}/${name}.png`));
  const x0 = i * cell + pad;
  for (let y = 0; y < span; y++) {
    for (let x = 0; x < span; x++) {
      const s = (Math.floor((y / span) * art.height) * art.width + Math.floor((x / span) * art.width)) * 4;
      const a = art.rgba[s + 3] / 255;
      if (a === 0) continue;
      const d = ((pad + y) * W + x0 + x) * 4;
      for (let c = 0; c < 3; c++) out[d + c] = Math.round(art.rgba[s + c] * a + out[d + c] * (1 - a));
    }
  }
});
writeFileSync(`${dir}/sheet.png`, encodePng(W, H, out));
console.log(`${dir}/sheet.png  ${W}x${H} — ${NAMES.join(', ')}, left to right`);
