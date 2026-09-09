/**
 * ONE IMAGE OF SEVERAL FRAMES INTO AN ANIMATED BODY ROW.
 *   `stripcut.mts <id> <sheet.png> <frames> <cols> <state> [grid]`
 *
 * A generative model returns a DIFFERENT character every call, so frames asked
 * one at a time do not belong to one creature. Asking for every frame inside a
 * SINGLE picture makes consistency a property of that one generation — the
 * same reason a Wang tileset arrives as one sheet.
 *
 * Two things are shared across the whole strip and both matter: the frames are
 * quantised TOGETHER, since a body row holds one `key` and a per-frame palette
 * would flicker; and `fittedTogether` gives them one bounding box, since
 * fitting each alone makes the creature jump about inside its own cell.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { decodePng, encodePng } from './png.mts';
import { debackground, apart } from './convert.mts';

const [id, file, framesArg, colsArg, state, gridArg] = process.argv.slice(2);
if (!id || !file || !framesArg) throw new Error('stripcut.mts <id> <sheet.png> <frames> <cols> <states> [grid]');
const COUNT = Number(framesArg);
const COLS = Number(colsArg || COUNT);
const ROWS = Math.ceil(COUNT / COLS);
const GRID = Number(gridArg ?? 96);
/** `walk` for one run, or `walk:0-5,cast:6-11` for a sheet holding several.
 *  One sheet is one generation, so several states drawn on it are the only
 *  ones guaranteed to be the same creature. */
const STATES: Record<string, number[]> = (state ?? 'idle').includes(':')
  ? Object.fromEntries((state as string).split(',').map((part) => {
      const [name, span] = part.split(':');
      const [from, to] = span.split('-').map(Number);
      return [name, Array.from({ length: to - from + 1 }, (_, i) => from + i)];
    }))
  : { [state ?? 'idle']: Array.from({ length: Number(framesArg) }, (_, i) => i) };
/** What every shipped body settles to: measured, 124 of the 126 rows hold
 *  exactly 24. A bigger palette is what makes a rendered picture read as
 *  rendered — its value steps halve and the shading turns smooth. */
const INKS = 24;

type Png = { width: number; height: number; rgba: Uint8Array };
const sheet = debackground(decodePng(readFileSync(file))) as Png;
const cw = Math.floor(sheet.width / COLS), chh = Math.floor(sheet.height / ROWS);
console.log(`${file} ${sheet.width}x${sheet.height} → ${COUNT} cells of ${cw}x${chh}`);

/** THE SHARED INK BOX, in cell-local pixels, over every cell at once. A cell
 *  is rarely square — six figures across one wide sheet gives tall thin cells
 *  — and squashing one into the grid would WIDEN the creature. One box, one
 *  uniform scale, one offset: aspect kept, and no frame silently recentred,
 *  which would hide a hitch rather than show it. */
const shared = (() => {
  let x0 = cw, y0 = chh, x1 = -1, y1 = -1;
  for (let k = 0; k < COUNT; k++) {
    const cx = (k % COLS) * cw, cy = Math.floor(k / COLS) * chh;
    for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) {
      if (sheet.rgba[((cy + y) * sheet.width + cx + x) * 4 + 3] < 128) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const scale = (GRID - 4) / Math.max(w, h);
  return { x0, y0, w, h, scale,
    offX: Math.round((GRID - w * scale) / 2), offY: Math.round((GRID - h * scale) / 2) };
})();
console.log(`  shared ink box ${shared.w}x${shared.h} at ${shared.scale.toFixed(3)}x, offset ${shared.offX},${shared.offY}`);

/** One cell, area-averaged, premultiplied so edges keep their hue. */
function cell(k: number): Uint8Array {
  const cx = (k % COLS) * cw, cy = Math.floor(k / COLS) * chh;
  const out = new Uint8Array(GRID * GRID * 4);
  const dw = Math.round(shared.w * shared.scale), dh = Math.round(shared.h * shared.scale);
  const dark: Array<[number, number, number] | undefined> = new Array(dw * dh);
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    const sx0 = cx + shared.x0 + Math.floor((x / dw) * shared.w);
    const sx1 = cx + shared.x0 + Math.max(Math.floor(((x + 1) / dw) * shared.w), Math.floor((x / dw) * shared.w) + 1);
    const sy0 = cy + shared.y0 + Math.floor((y / dh) * shared.h);
    const sy1 = cy + shared.y0 + Math.max(Math.floor(((y + 1) / dh) * shared.h), Math.floor((y / dh) * shared.h) + 1);
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    let darkest: [number, number, number] | null = null, darkL = Infinity;
    for (let sy = sy0; sy < sy1 && sy < sheet.height; sy++) for (let sx = sx0; sx < sx1 && sx < sheet.width; sx++) {
      const i = (sy * sheet.width + sx) * 4, al = sheet.rgba[i + 3] / 255;
      r += sheet.rgba[i] * al; g += sheet.rgba[i + 1] * al; b += sheet.rgba[i + 2] * al;
      a += sheet.rgba[i + 3]; n++;
      if (al < 0.5) continue;
      const l = 0.299 * sheet.rgba[i] + 0.587 * sheet.rgba[i+1] + 0.114 * sheet.rgba[i+2];
      if (l < darkL) { darkL = l; darkest = [sheet.rgba[i], sheet.rgba[i+1], sheet.rgba[i+2]]; }
    }
    if (darkest) dark[y * dw + x] = darkest;
    const px = x + shared.offX, py = y + shared.offY;
    if (px < 0 || px >= GRID || py < 0 || py >= GRID) continue;
    const d = (py * GRID + px) * 4;
    if (!n || a / n < 128) { out[d + 3] = 0; continue; }
    const cover = Math.max(1e-6, (a / n / 255) * n);
    out[d] = Math.min(255, Math.round(r / cover));
    out[d + 1] = Math.min(255, Math.round(g / cover));
    out[d + 2] = Math.min(255, Math.round(b / cover));
    out[d + 3] = 255;
  }
  // A CONTOUR IS SUB-PIXEL AT THIS REDUCTION. A 4px outline on a 337px figure
  // is 0.8px at 96, so averaging blends it into the body and the silhouette
  // greys out — measured, ink under luma 10 fell from 7.8% to 1.3% here. A
  // pixel on the EDGE takes its cell's darkest source pixel instead of the
  // mean, which is what the source says that edge is.
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    const px = x + shared.offX, py = y + shared.offY;
    if (px < 0 || px >= GRID || py < 0 || py >= GRID) continue;
    const d = (py * GRID + px) * 4;
    if (!out[d + 3]) continue;
    const rim = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => {
      const nx = px + dx, ny = py + dy;
      return nx < 0 || ny < 0 || nx >= GRID || ny >= GRID || !out[(ny * GRID + nx) * 4 + 3];
    });
    const src = dark[y * dw + x];
    if (rim && src) { out[d] = src[0]; out[d + 1] = src[1]; out[d + 2] = src[2]; }
  }
  return out;
}

const cells = Array.from({ length: COUNT }, (_, k) => cell(k));

// `PROBE=<file>` writes the frames as they are BEFORE quantising, so what the
// resample costs and what the palette costs can be told apart.
if (process.env.PROBE) {
  const wide = new Uint8Array(GRID * COUNT * GRID * 4);
  cells.forEach((c, k) => {
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
      const s = (y * GRID + x) * 4, d = (y * GRID * COUNT + k * GRID + x) * 4;
      for (let q = 0; q < 4; q++) wide[d + q] = c[s + q];
    }
  });
  writeFileSync(process.env.PROBE, encodePng(GRID * COUNT, GRID, wide));
  console.log(`  probe: pre-quantise frames -> ${process.env.PROBE}`);
}

// One palette over EVERY frame: a body row holds a single key.
const count = new Map<string, number>();
for (const c of cells) for (let i = 0; i < c.length; i += 4) {
  if (!c[i + 3]) continue;
  const hex = `#${[0, 1, 2].map((k) => c[i + k].toString(16).padStart(2, '0')).join('')}`;
  count.set(hex, (count.get(hex) ?? 0) + 1);
}
const order = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
const lumaOf = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b;
};
const kept = order.slice(0, INKS);
/** FREQUENCY ALONE LOSES THE EXTREMES. A body's dark contour is about 1% of
 *  its pixels, so it never reaches the top 24 and folds to something bright:
 *  measured, a source holding 28,863 pixels under luma 10 came out with its
 *  darkest ink at 52. So the ends of the range are bought back — the least-used
 *  kept ink is traded for the commonest ink beyond each end. */
const ends = [...count.entries()].sort((a, b) => b[1] - a[1]);
const safe = new Set<string>();
for (const [pick, beyond] of [
  ['dark', (l: number, edge: number) => l < edge - 12],
  ['light', (l: number, edge: number) => l > edge + 12],
] as const) {
  const ls = kept.map(lumaOf);
  const edge = pick === 'dark' ? Math.min(...ls) : Math.max(...ls);
  const want = ends.find(([h]) => beyond(lumaOf(h), edge) && !kept.includes(h));
  if (!want) continue;
  let worst = -1;
  kept.forEach((h, i) => {
    if (safe.has(h)) return; // never trade away the end just bought
    if (worst < 0 || (count.get(h) ?? 0) < (count.get(kept[worst]) ?? 0)) worst = i;
  });
  if (worst < 0) continue;
  console.log(`  ${pick}: kept ${want[0]} (luma ${lumaOf(want[0]).toFixed(0)}, ${want[1]}px) over ${kept[worst]}`);
  kept[worst] = want[0];
  safe.add(want[0]);
}
const rgbOf = (h: string) => [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16));
// REDMEAN, the same distance every other body import uses — plain RGB drifts
// hue where this does not.
const fold = new Map(order.map((h) => {
  if (kept.includes(h)) return [h, h];
  const mine = rgbOf(h) as [number, number, number];
  let best = kept[0], far = Infinity;
  for (const k of kept) {
    const d = apart(mine, rgbOf(k) as [number, number, number]);
    if (d < far) { far = d; best = k; }
  }
  return [h, best];
}));

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+*$%&@?!<>[]{}~';
const char = new Map<string, string>();
const key: Record<string, string> = {};
let frames = cells.map((c) => {
  const rows: string[] = [];
  for (let y = 0; y < GRID; y++) {
    let row = '';
    for (let x = 0; x < GRID; x++) {
      const i = (y * GRID + x) * 4;
      if (!c[i + 3]) { row += '.'; continue; }
      const hex = fold.get(`#${[0, 1, 2].map((k) => c[i + k].toString(16).padStart(2, '0')).join('')}`)!;
      if (!char.has(hex)) { const ch = LETTERS[char.size]; char.set(hex, ch); key[ch] = hex; }
      row += char.get(hex);
    }
    rows.push(row);
  }
  return rows;
});

const states = STATES;
const row = `  ${id}: {
    grid: ${GRID},
    dirs: ["south-east"],
    frames: [${frames.map((f) => `[\n      '${f.join("',\n      '")}',\n    ]`).join(', ')}],
    states: ${JSON.stringify(states)},
    key: ${JSON.stringify(key)},
  },`;

const OUT = new URL('../../src/render/generated-art.ts', import.meta.url).pathname;
let src = readFileSync(OUT, 'utf8');
const already = new RegExp(`\\n  ${id}: \\{[\\s\\S]*?\\n  \\},`);
src = already.test(src) ? src.replace(already, `\n${row}`) : src.replace(/\n\};\s*$/, `\n${row}\n};\n`);
writeFileSync(OUT, src);
const said = Object.entries(STATES).map(([n, ix]) => `${n} ${ix.length}`).join(', ');
console.log(`  ${id}: ${COUNT} frames of ${GRID}, ${said}, ${char.size} inks -> generated-art.ts`);
