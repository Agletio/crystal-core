/**
 * A generated PORTRAIT into the table the speech panel reads.
 * `portrait.mts <id> <png> [grid]`
 *
 * A map body is a silhouette and a portrait is a face, so they are separate
 * assets and this is separate from `tables.mts`: a portrait has no character,
 * no rotation and no states, and comes out of `create_image_pro` as one PNG.
 * `PORTRAITS` in `src/render/portraits.ts` merges what lands here OVER the
 * hand-drawn rows, so a face that has been generated wins and the rest stand.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { debackground } from './convert.mts';
import { decodePng } from './png.mts';

const OUT = new URL('../../src/render/generated-portraits.ts', import.meta.url).pathname;

type Art = { grid: number; rows: string[]; key: Record<string, string> };

/** Every distinct colour, commonest first, folded to `want` by nearest. */
function quantise(rgba: Uint8Array, want: number): Map<string, string> {
  const count = new Map<string, number>();
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 40) continue;
    const hex = `#${[0, 1, 2].map((k) => rgba[i + k].toString(16).padStart(2, '0')).join('')}`;
    count.set(hex, (count.get(hex) ?? 0) + 1);
  }
  const order = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex);
  const kept = order.slice(0, want);
  const rgb = (h: string) => [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16));
  const near = (h: string): string => {
    const [r, g, b] = rgb(h);
    let best = kept[0], far = Infinity;
    for (const k of kept) {
      const [kr, kg, kb] = rgb(k);
      const d = (r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2;
      if (d < far) { far = d; best = k; }
    }
    return best;
  };
  return new Map(order.map((h) => [h, kept.includes(h) ? h : near(h)]));
}

/** Nearest-neighbour down to the grid it ships at, alpha carried through. */
function resample(src: { width: number; height: number; rgba: Uint8Array }, grid: number) {
  const out = new Uint8Array(grid * grid * 4);
  for (let y = 0; y < grid; y++)
    for (let x = 0; x < grid; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / grid));
      const sy = Math.min(src.height - 1, Math.floor((y * src.height) / grid));
      const s = (sy * src.width + sx) * 4;
      const d = (y * grid + x) * 4;
      for (let k = 0; k < 4; k++) out[d + k] = src.rgba[s + k];
    }
  return out;
}

const [id, file, gridArg] = process.argv.slice(2);
if (!id || !file) throw new Error('portrait.mts <id> <png> [grid]');
const grid = Number(gridArg ?? 96);

const png = debackground(decodePng(readFileSync(file)));
const rgba = resample(png, grid);
const fold = quantise(rgba, 40);

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+*$%&@?!<>[]{}~';
const char = new Map<string, string>();
const key: Record<string, string> = {};
const rows: string[] = [];
for (let y = 0; y < grid; y++) {
  let row = '';
  for (let x = 0; x < grid; x++) {
    const i = (y * grid + x) * 4;
    if (rgba[i + 3] < 40) { row += '.'; continue; }
    const hex = fold.get(`#${[0, 1, 2].map((k) => rgba[i + k].toString(16).padStart(2, '0')).join('')}`)!;
    let c = char.get(hex);
    if (!c) {
      c = LETTERS[char.size];
      if (!c) throw new Error('out of characters — lower the ink count');
      char.set(hex, c);
      key[c] = hex;
    }
    row += c;
  }
  rows.push(row);
}

let held: Record<string, Art> = {};
try {
  const src = readFileSync(OUT, 'utf8');
  const open = src.indexOf('{', src.indexOf('export const GENERATED_PORTRAITS'));
  held = new Function(`return ${src.slice(open, src.lastIndexOf('};') + 1)}`)() as Record<string, Art>;
} catch { held = {}; }
held[id] = { grid, rows, key };

const body = Object.entries(held)
  .map(([name, art]) =>
    `  ${name}: {\n    grid: ${art.grid},\n    rows: [\n` +
    art.rows.map((r) => `      '${r}',`).join('\n') +
    `\n    ],\n    key: ${JSON.stringify(art.key)},\n  },`
  )
  .join('\n');

writeFileSync(
  OUT,
  `/**\n * Written by \`tools/art/portrait.mts\`. Do not edit by hand.\n *\n` +
    ` * Generated faces, one frame each and carrying their own colours. ` +
    `\`PORTRAITS\`\n * merges these OVER the hand-drawn rows.\n */\n` +
    `export type GeneratedPortrait = {\n  grid: number;\n  rows: string[];\n` +
    `  key: Record<string, string>;\n};\n\n` +
    `export const GENERATED_PORTRAITS: Record<string, GeneratedPortrait> = {\n${body}\n};\n`
);
console.log(`${id}: ${grid} grid, ${Object.keys(key).length} inks -> generated-portraits.ts`);
