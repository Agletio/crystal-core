/**
 * THE COLOURS THE GAME IS ACTUALLY MADE OF.  `palette.mts [table] [want]`
 *
 * Handing an art director "match the existing style" is handing them nothing.
 * This reads every shipped row of a grid table, counts pixels by colour, folds
 * near-duplicates together and prints the palette that results — plus a swatch
 * to look at. Measured, not chosen, so it cannot drift from what ships.
 *
 * `table` is icons (the default), vfx, portraits or cast.
 */
import { writeFileSync } from 'node:fs';
import { encodePng } from './png.mts';
import { GENERATED_ICONS } from '../../src/render/generated-icons';
import { VFX_ART } from '../../src/render/generated-vfx';
import { GENERATED_PORTRAITS } from '../../src/render/generated-portraits';

type Row = { grid: number; rows: string[]; key: Record<string, string> };
const TABLES: Record<string, Record<string, Row>> = {
  icons: GENERATED_ICONS as never,
  vfx: VFX_ART as never,
  portraits: GENERATED_PORTRAITS as never,
};

const which = process.argv[2] ?? 'icons';
const want = Number(process.argv[3] ?? 28);
const table = TABLES[which];
if (!table) throw new Error(`no table '${which}'`);

const rgbOf = (h: string) => [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16));
const count = new Map<string, number>();
let rows = 0;
for (const row of Object.values(table)) {
  rows++;
  const used = new Map<string, number>();
  for (const line of row.rows) for (const ch of line) {
    const hex = row.key[ch];
    if (hex) used.set(hex, (used.get(hex) ?? 0) + 1);
  }
  // Per ROW, normalised: a big picture must not decide the whole palette.
  const total = [...used.values()].reduce((a, b) => a + b, 0) || 1;
  for (const [hex, n] of used) count.set(hex, (count.get(hex) ?? 0) + n / total);
}

// Fold to `want` by nearest, commonest first — the same rule the importer uses,
// so this palette is what art actually survives as.
const order = [...count.entries()].sort((a, b) => b[1] - a[1]);
const kept: string[] = [];
for (const [hex] of order) {
  if (kept.length >= want) break;
  const [r, g, b] = rgbOf(hex);
  const near = kept.some((k) => {
    const [kr, kg, kb] = rgbOf(k);
    return Math.abs(r - kr) + Math.abs(g - kg) + Math.abs(b - kb) < 40;
  });
  if (!near) kept.push(hex);
}

const weight = new Map(order);
console.log(`${which}: ${rows} rows, ${count.size} distinct colours, folded to ${kept.length}\n`);
for (const hex of kept) {
  const [r, g, b] = rgbOf(hex);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b).toFixed(0);
  console.log(`  ${hex}  luma ${luma.padStart(3)}  used in ${(weight.get(hex) ?? 0).toFixed(1)} rows' worth`);
}

const SW = 64, PAD = 8, COLS = 7;
const lines = Math.ceil(kept.length / COLS);
const W = COLS * (SW + PAD) + PAD, H = lines * (SW + PAD) + PAD;
const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { out[i * 4] = 26; out[i * 4 + 1] = 23; out[i * 4 + 2] = 21; out[i * 4 + 3] = 255; }
kept.forEach((hex, k) => {
  const [r, g, b] = rgbOf(hex);
  const ox = PAD + (k % COLS) * (SW + PAD), oy = PAD + Math.floor(k / COLS) * (SW + PAD);
  for (let y = 0; y < SW; y++) for (let x = 0; x < SW; x++) {
    const d = ((oy + y) * W + ox + x) * 4;
    out[d] = r; out[d + 1] = g; out[d + 2] = b; out[d + 3] = 255;
  }
});
writeFileSync(`art/palette-${which}.png`, encodePng(W, H, out as never));
console.log(`\nart/palette-${which}.png  ${W}x${H}`);
