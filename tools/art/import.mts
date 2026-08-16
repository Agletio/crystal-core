/**
 * A character exported from PixelLab's own site, straight into the grids the
 * renderer draws. The site poses onto a rigged `mannequin` template that the
 * public API does not expose, so the art is better than anything `generate`
 * here can ask for — and it arrives in FULL colour rather than our five inks.
 *
 * Nothing is quantised: an export is a few dozen distinct colours, so each one
 * takes a character of its own and the creature carries its own key. The five
 * inks were `monsterArt`'s hand-drawn palette, never a limit of the engine.
 *
 *   npx tsx tools/art/import.mts <export-dir> <id> [direction]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { decodePng } from './png.mts';
import { debackground, fitted } from './convert.mts';

/** Every character a row may use. `.` is transparent and stays out of it. */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-*/=<>?@%&$!~^();:[]{}|,_';

const [dir, id, facing = 'east'] = process.argv.slice(2);
if (!dir || !id) throw new Error('want <export-dir> <id> [direction]');

const meta = JSON.parse(readFileSync(join(dir, 'metadata.json'), 'utf8'));
const state = meta.states[0];
const png = readFileSync(join(dir, state.frames.rotations[facing]));
const image = debackground(decodePng(png));
const grid = image.width;

const key: Record<string, string> = {};
const seen = new Map<string, string>();
const hex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

const rows: string[] = [];
for (let y = 0; y < grid; y++) {
  let row = '';
  for (let x = 0; x < grid; x++) {
    const at = (y * grid + x) * 4;
    if (image.rgba[at + 3] < 128) {
      row += '.';
      continue;
    }
    const colour = hex(image.rgba[at], image.rgba[at + 1], image.rgba[at + 2]);
    let char = seen.get(colour);
    if (!char) {
      char = CHARS[seen.size];
      if (!char) throw new Error(`${seen.size} colours is more than there are characters`);
      seen.set(colour, char);
      key[char] = colour;
    }
    row += char;
  }
  rows.push(row);
}

// The same treatment a generated body gets: scaled to its frame on a baseline
// with room for the rank's light to fall off into.
const rings = Math.max(1, Math.round(grid / 24));
const art = fitted(rows, rings * 4);
const source = (r: string[]): string => `[\n${r.map((s) => `      '${s}',`).join('\n')}\n    ]`;

writeFileSync(
  new URL('../../src/render/generated-art.ts', import.meta.url).pathname,
  `/**\n * Written by \`tools/art/import.mts\`. Do not edit by hand.\n *\n` +
    ` * Exported from PixelLab's character tool, which draws better than the API\n` +
    ` * can be asked to. Each carries its OWN key: the five inks belong to the\n` +
    ` * hand-drawn table, not to the renderer.\n */\n` +
    `export type GeneratedArt = { grid: number; frames: string[][]; key: Record<string, string> };\n\n` +
    `export const GENERATED: Record<string, GeneratedArt> = {\n  ${id}: {\n` +
    `    grid: ${grid},\n    frames: [${source(art)}, ${source(art)}, ${source(art)}],\n` +
    `    key: ${JSON.stringify(key)},\n  },\n};\n`
);
console.log(`${id}: ${grid} grid, ${seen.size} colours, from ${facing} — ${state.character.prompt}`);
