/**
 * Design candidates side by side on a real zone floor, magnified — what the
 * user is shown BEFORE anything is rotated. Off `cache/designs`, never off a
 * shipped table, because a design has not been imported yet.
 *
 *   sheet-designs.mts out.png <scale> <tile> <png…>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mts';
import { ZONES } from '../../src/render/generated-tiles';

const [out, scaleArg = '3', tileName = 'lit_round', ...pngs] = process.argv.slice(2);
const scale = Number(scaleArg);

const set = ZONES[tileName];
if (!set) throw new Error(`no tileset ${tileName} — have ${Object.keys(ZONES).join(', ')}`);
const sheet = decodePng(Buffer.from(set.png.split(',')[1], 'base64'));
// The pure FLOOR tile is the one whose four corners are all floor; `box` is
// where it sits in the sheet, as x, y, width, height.
const found = (set.tiles as { key: number; box: number[] }[]).find((t) => t.key === 0);
if (!found) throw new Error('no all-floor tile in the set');
const [bx, by, span] = found.box;
const cell = { x: bx, y: by };

const shots = pngs.map((p) => decodePng(readFileSync(p)));
const pad = 8;
const wide = shots.reduce((n, s) => n + s.width * scale + pad, pad);
const tall = Math.max(...shots.map((s) => s.height * scale)) + pad * 2;
const rgba = new Uint8Array(wide * tall * 4);

// The floor under them, tiled at the same magnification.
for (let y = 0; y < tall; y++) {
  for (let x = 0; x < wide; x++) {
    const sx = cell.x + Math.floor(x / scale) % span;
    const sy = cell.y + Math.floor(y / scale) % span;
    const from = (sy * sheet.width + sx) * 4;
    const to = (y * wide + x) * 4;
    for (let c = 0; c < 4; c++) rgba[to + c] = sheet.rgba[from + c];
  }
}

let left = pad;
for (const s of shots) {
  for (let y = 0; y < s.height * scale; y++) {
    for (let x = 0; x < s.width * scale; x++) {
      const from = (Math.floor(y / scale) * s.width + Math.floor(x / scale)) * 4;
      const a = s.rgba[from + 3];
      if (a === 0) continue;
      const to = ((y + pad) * wide + x + left) * 4;
      for (let c = 0; c < 3; c++) {
        rgba[to + c] = Math.round((s.rgba[from + c] * a + rgba[to + c] * (255 - a)) / 255);
      }
      rgba[to + 3] = 255;
    }
  }
  left += s.width * scale + pad;
}

writeFileSync(out, encodePng(wide, tall, rgba));
console.log(`${out}: ${shots.length} on ${tileName}, x${scale}`);
