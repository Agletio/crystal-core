/**
 * A generated STILL — a portrait, a UI icon, an effect — into the table that
 * draws it.   `portrait.mts <id> <png> [grid] [table] [keep]`
 *
 * Separate from `tables.mts` because none of these has a character, a rotation
 * or states: each is one PNG. `table` is `portraits` (the default), `icons` or
 * `vfx`, and each writes its own generated file. `keep` is the top fraction of
 * the source worth having, and only `vfx` reads it — see `square`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { debackground } from './convert.mts';
import { decodePng } from './png.mts';

const TABLES = {
  portraits: { file: 'generated-portraits.ts', name: 'GENERATED_PORTRAITS', type: 'GeneratedPortrait', what: 'Generated faces, one frame each and carrying their own colours. The\n * hand-drawn table merges these OVER its own rows.' },
  icons: { file: 'generated-icons.ts', name: 'GENERATED_ICONS', type: 'GeneratedIcon', what: 'Generated UI icons, one frame each and carrying their own colours.\n * The hand-drawn table merges these OVER its own rows.' },
  cast: { file: 'generated-cast.ts', name: 'GENERATED_CAST', type: 'GeneratedCast', what: "A hero's WHOLE FIGURE for the cast hall, one frame and its own colours:\n * the one screen that shows a man at four times his ship size shows a drawing\n * made for it rather than his 48-grid body magnified." },
  vfx: {
    file: 'generated-vfx.ts', name: 'VFX_ART', type: 'GeneratedVfx',
    what:
      'Effect art, drawn in the WORLD rather than in a panel: cropped to its own\n' +
      ' * ink and squared up, so the picture\'s edges are the effect\'s edges and the\n' +
      ' * renderer can pin it by them. One frame each, carrying their own\n' +
      " * colours, and only Pixi draws one — canvas2d has no sprites.",
  },
};

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

type Png = { width: number; height: number; rgba: Uint8Array };

/**
 * The top `keep` of the frame, then the ink ALONE, centred in a square. An
 * effect is drawn in the world and pinned by the edges of its own picture — the
 * arrow's head IS the right edge — so anything the generator hung underneath it
 * has to come off before the picture means that.
 */
function square(src: Png, keep: number): Png {
  const height = Math.max(1, Math.round(src.height * keep));
  let x0 = src.width, x1 = -1, y0 = height, y1 = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < src.width; x++) {
      if (src.rgba[(y * src.width + x) * 4 + 3] < 40) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  if (x1 < 0) throw new Error('nothing left after the crop');
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const side = Math.max(w, h);
  const out = new Uint8Array(side * side * 4);
  const ox = Math.floor((side - w) / 2);
  const oy = Math.floor((side - h) / 2);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = ((y + y0) * src.width + x + x0) * 4;
      const d = ((y + oy) * side + x + ox) * 4;
      for (let k = 0; k < 4; k++) out[d + k] = src.rgba[s + k];
    }
  return { width: side, height: side, rgba: out };
}

/** Nearest-neighbour down to the grid it ships at, alpha carried through. */
function resample(src: Png, grid: number) {
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

const [id, file, gridArg, tableArg, keepArg] = process.argv.slice(2);
if (!id || !file) throw new Error('portrait.mts <id> <png> [grid] [table] [keep]');
const grid = Number(gridArg ?? 96);
const name = (tableArg ?? 'portraits') as keyof typeof TABLES;
const table = TABLES[name];
if (!table) throw new Error(`no table ${tableArg}`);
const OUT = new URL(`../../src/render/${table.file}`, import.meta.url).pathname;

const png = debackground(decodePng(readFileSync(file)));
const rgba = resample(name === 'vfx' ? square(png, Number(keepArg ?? 1)) : png, grid);
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
  const open = src.indexOf('{', src.indexOf(`export const ${table.name}`));
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
    ` * ${table.what}\n */\n` +
    `export type ${table.type} = {\n  grid: number;\n  rows: string[];\n` +
    `  key: Record<string, string>;\n};\n\n` +
    `export const ${table.name}: Record<string, ${table.type}> = {\n${body}\n};\n`
);
console.log(`${id}: ${grid} grid, ${Object.keys(key).length} inks -> ${table.file}`);
