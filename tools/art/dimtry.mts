/**
 * ONE PROP AT SEVERAL IMPORT SETTINGS, on the floor it stands in.
 * `dimtry.mts <propId> <dir> <dim,tiles> …` — no generation is spent: `dim`
 * and `tiles` are what the IMPORT does to a picture already paid for, so a
 * size and a brightness are chosen by looking rather than by re-asking.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { ZONES } from '../../src/render/generated-tiles';
import { callTool, download, urlsIn } from './mcp.mts';
import { decodePng, encodePng } from './png.mts';
import manifest from './generated.json' with { type: 'json' };

const [id, dir, ...pairs] = process.argv.slice(2);
const spec = (manifest as { props: { id: string; object?: string }[] }).props.find((p) => p.id === id);
if (!spec?.object) throw new Error(`${id}: no object id`);
mkdirSync(dir, { recursive: true });

const text = await callTool('get_map_object', { object_id: spec.object });
const url = urlsIn(text).find((u) => /\.png/.test(u)) ?? urlsIn(text)[0];
const art = decodePng(await download(url));

const set = ZONES.test_round;
const tiles = decodePng(Buffer.from(set.png.split(',')[1], 'base64'));
const box = set.tiles.find((t) => t.key === 0)!.box;

const CELL = 96;           // one map tile, at the zoom a peek is judged at
const PAD = 24;
const cell = CELL * 2 + PAD * 2;
const W = cell * pairs.length;
const out = new Uint8Array(W * cell * 4);
for (let y = 0; y < cell; y++) {
  for (let x = 0; x < W; x++) {
    const s = ((box[1] + (y % box[3])) * tiles.width + box[0] + (x % box[2])) * 4;
    const d = (y * W + x) * 4;
    for (let c = 0; c < 4; c++) out[d + c] = tiles.rgba[s + c];
  }
}

pairs.forEach((pair, i) => {
  const [dim, across] = pair.split(',').map(Number);
  const span = Math.round(CELL * across);
  const x0 = i * cell + (cell - span) / 2;
  const y0 = (cell - span) / 2;
  for (let y = 0; y < span; y++) {
    for (let x = 0; x < span; x++) {
      const s = (Math.floor((y / span) * art.height) * art.width + Math.floor((x / span) * art.width)) * 4;
      const a = art.rgba[s + 3] / 255;
      if (a === 0) continue;
      const d = (Math.round(y0 + y) * W + Math.round(x0 + x)) * 4;
      // The import's own maths: a plain multiply, so black stays black.
      for (let c = 0; c < 3; c++) {
        out[d + c] = Math.round(art.rgba[s + c] * dim * a + out[d + c] * (1 - a));
      }
    }
  }
});
writeFileSync(`${dir}/dims.png`, encodePng(W, cell, out));
console.log(`${dir}/dims.png — ${pairs.join('  ')}`);
