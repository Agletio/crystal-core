/**
 * ONE STATE ACROSS MANY BODIES, as it SHIPS — the picture you judge a sweep on.
 *
 *   npx tsx tools/art/audit.mts drift [state]      rows asking for words their art was not generated with
 *   npx tsx tools/art/audit.mts cast out.png a b c one row per body, that state only
 *   npx tsx tools/art/audit.mts cast out.png --drift   the same, for every drifted row
 *
 * `shipped.mts` draws ONE body's five states, which answers "is this body
 * right". A sweep asks the other question — "which of these thirty is wrong" —
 * and answering it one body at a time is thirty pictures nobody compares.
 *
 * Reads `GENERATED`, so it costs no generation and needs no key, and it is the
 * only view that can be wrong the way the game is wrong: `body.mts sheet` draws
 * what the SERVER holds, which differs by the whole import.
 */
import { writeFileSync } from 'node:fs';
import { GENERATED } from '../../src/render/generated-art.ts';
import { encodePng } from './png.mts';
import { drifted } from './variant.mts';

const [command, ...rest] = process.argv.slice(2);

if (command === 'drift') {
  const only = rest[0];
  const rows = drifted().filter((d) => !only || d.state === only);
  const byState = new Map<string, string[]>();
  for (const d of rows) byState.set(d.state, [...(byState.get(d.state) ?? []), d.sprite]);
  for (const [state, sprites] of [...byState].sort()) {
    console.log(`${state} (${sprites.length}): ${sprites.sort().join(' ')}`);
  }
  // The SPRITES, so a sweep can be handed straight back in as arguments.
  const all = [...new Set(rows.map((d) => d.sprite))].sort();
  console.log(`\n${all.length} sprites: ${all.join(' ')}`);
  process.exit(0);
}

const state = command;
const [out = `${state}.png`, ...named] = rest;
const sprites = named[0] === '--drift'
  ? [...new Set(drifted().filter((d) => d.state === state).map((d) => d.sprite))].sort()
  : named;
if (!state || sprites.length === 0) {
  console.error('audit.mts drift [state] | audit.mts <state> out.png <sprite…|--drift>');
  process.exit(1);
}

const SCALE = 5;
const LABEL = 10; // a gutter the eye counts rows in, since nothing here writes text
const drawn = sprites.filter((s) => GENERATED[s]?.states[state]);
const missing = sprites.filter((s) => !GENERATED[s]?.states[state]);
if (drawn.length === 0) throw new Error(`no body has a ${state}: ${sprites.join(', ')}`);

const cell = Math.max(...drawn.map((s) => GENERATED[s]!.grid));
const wide = Math.max(...drawn.map((s) => GENERATED[s]!.states[state].length));
const across = (cell * wide + LABEL) * SCALE;
const down = cell * drawn.length * SCALE;
const pixels = new Uint8Array(across * down * 4);
for (let i = 0; i < across * down; i++) pixels.set([24, 22, 28, 255], i * 4);

const put = (x: number, y: number, hex: string): void => {
  for (let dy = 0; dy < SCALE; dy++) {
    for (let dx = 0; dx < SCALE; dx++) {
      const at = ((y * SCALE + dy) * across + x * SCALE + dx) * 4;
      pixels[at] = parseInt(hex.slice(1, 3), 16);
      pixels[at + 1] = parseInt(hex.slice(3, 5), 16);
      pixels[at + 2] = parseInt(hex.slice(5, 7), 16);
      pixels[at + 3] = 255;
    }
  }
};

drawn.forEach((sprite, r) => {
  const art = GENERATED[sprite]!;
  // A TICK per row in the gutter, so a body can be counted to without a font.
  for (let y = 0; y < 3; y++) put(2, r * cell + 2 + y, '#c8a24a');
  art.states[state].forEach((id, c) => {
    const grid = art.frames[id];
    if (!grid) return;
    grid.forEach((line, y) => {
      for (let x = 0; x < line.length; x++) {
        const hex = art.key[line[x]];
        if (hex) put(LABEL + c * cell + x, r * cell + y, hex);
      }
    });
  });
});

writeFileSync(out, encodePng(across, down, pixels));
drawn.forEach((s, i) => console.log(`row ${i}: ${s} (${GENERATED[s]!.states[state].length}f)`));
if (missing.length) console.log(`no ${state}: ${missing.join(', ')}`);
