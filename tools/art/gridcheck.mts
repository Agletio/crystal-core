/**
 * IS THIS HONEST PIXEL ART?  `gridcheck.mts <png…>`
 *
 * A general image model draws pictures that LOOK like pixel art without being
 * on a pixel grid: soft edges, anti-aliased alpha, hundreds of near-duplicate
 * colours. The importers quantise, so such a file still loads — it just lands
 * mushy, and mushy is only visible beside art that is not.
 *
 * So this measures rather than judges. Four numbers, each with a threshold
 * that says what the import will do with it.
 */
import { readFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mts';
import { GENERATED_ICONS } from '../../src/render/generated-icons';

/** The largest block size up to 16 the image is constant within. 1 means the
 *  art is at its own resolution, which is what an importer wants. */
function blockSize(rgba: Uint8Array, w: number, h: number): number {
  const at = (x: number, y: number) => (y * w + x) * 4;
  const same = (a: number, b: number) =>
    rgba[a] === rgba[b] && rgba[a + 1] === rgba[b + 1] &&
    rgba[a + 2] === rgba[b + 2] && rgba[a + 3] === rgba[b + 3];
  let best = 1;
  for (let n = 2; n <= 16; n++) {
    if (w % n || h % n) continue;
    let flat = true;
    for (let by = 0; by < h && flat; by += n) {
      for (let bx = 0; bx < w && flat; bx += n) {
        const first = at(bx, by);
        for (let y = by; y < by + n && flat; y++)
          for (let x = bx; x < bx + n; x++) if (!same(at(x, y), first)) { flat = false; break; }
      }
    }
    if (flat) best = n;
  }
  return best;
}

/** A shipped row rendered back to pixels, so a new file is measured against
 *  what the game already draws rather than against a number I chose. */
function shipped(id: string) {
  const row = GENERATED_ICONS[id];
  if (!row) throw new Error(`no shipped icon '${id}'`);
  const n = row.grid;
  const rgba = new Uint8Array(n * n * 4);
  row.rows.forEach((line, y) => {
    [...line].forEach((ch, x) => {
      const hex = row.key[ch];
      if (!hex) return;
      const i = (y * n + x) * 4;
      rgba[i] = parseInt(hex.slice(1, 3), 16);
      rgba[i + 1] = parseInt(hex.slice(3, 5), 16);
      rgba[i + 2] = parseInt(hex.slice(5, 7), 16);
      rgba[i + 3] = 255;
    });
  });
  return { width: n, height: n, rgba };
}

for (const arg of process.argv.slice(2)) {
  const isShipped = arg.startsWith('@');
  const file = isShipped ? `shipped icon ${arg.slice(1)}` : arg;
  const img = isShipped ? shipped(arg.slice(1)) : decodePng(readFileSync(arg));
  const { width: w, height: h, rgba } = img;

  const colours = new Set<string>();
  let opaque = 0, soft = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3];
    if (a > 0 && a < 255) soft++;
    if (a < 40) continue;
    opaque++;
    colours.add(`${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`);
  }

  // A HARD edge is a big jump between neighbours; a gradient is a small one.
  // Anti-aliasing shows up as a mass of small non-zero steps.
  let steps = 0, gentle = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x + 1 < w; x++) {
      const a = (y * w + x) * 4, b = a + 4;
      if (rgba[a + 3] < 40 || rgba[b + 3] < 40) continue;
      const d = Math.abs(rgba[a] - rgba[b]) + Math.abs(rgba[a + 1] - rgba[b + 1]) + Math.abs(rgba[a + 2] - rgba[b + 2]);
      if (d === 0) continue;
      steps++;
      if (d < 24) gentle++;
    }
  }

  const block = blockSize(rgba, w, h);
  const softShare = (soft / Math.max(1, w * h)) * 100;
  const gentleShare = (gentle / Math.max(1, steps)) * 100;

  const verdict: string[] = [];
  verdict.push(block > 1
    ? `drawn at ${w / block}x${h / block} and scaled up ${block}x — RESAMPLE to that before importing`
    : 'at its own resolution');
  verdict.push(colours.size <= 64
    ? `${colours.size} colours, fine`
    : `${colours.size} colours — the importer folds these down, so shading will shift`);
  verdict.push(softShare < 1
    ? 'alpha is hard'
    : `${softShare.toFixed(1)}% of pixels are part-transparent — soft edges, they quantise to a halo`);
  // REPORTED, never judged: shaded pixel art legitimately has many small
  // steps — the shipping tilesets read 69% here. It is only meaningful beside
  // a shipped row, which `@<iconId>` measures.
  verdict.push(`${gentleShare.toFixed(0)}% of colour steps are gentle (compare against a shipped row: \`@gear_ring\`)`);

  console.log(`\n${file}  ${w}x${h}`);
  for (const v of verdict) console.log(`  ${v}`);
}
