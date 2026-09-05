/**
 * What a body looks like AS IT SHIPS — every frame of every state, off
 * `GENERATED` rather than off the server.
 *
 *   npx tsx tools/art/shipped.mts alchemist_sword2h out.png [scale] [state,state]
 *
 * `body.mts sheet` asks the server, which is the right tool while a body is
 * being judged and the wrong one afterwards: it draws what was generated, not
 * what the import kept, and a group that has been deleted answers nothing at
 * all. This reads the committed grids, so it costs no generation, works with
 * no key, and is the only view that can be wrong the way the game is wrong.
 */
import { writeFileSync } from 'node:fs';
import { GENERATED } from '../../src/render/generated-art.ts';
import { encodePng } from './png.mts';

const [sprite, out = `${sprite}.png`, zoom = '3', only = ''] = process.argv.slice(2);
const art = GENERATED[sprite];
if (!art) {
  console.error(`no such body: ${sprite}\n${Object.keys(GENERATED).join(', ')}`);
  process.exit(1);
}

const scale = Math.max(1, Math.floor(Number(zoom)));
const wanted = new Set(only.split(',').filter(Boolean));
const rows = Object.entries(art.states).filter(([n]) => wanted.size === 0 || wanted.has(n));
const cell = art.grid;
const wide = Math.max(...rows.map(([, ids]) => ids.length));
const across = cell * wide * scale;
const down = cell * rows.length * scale;
const pixels = new Uint8Array(across * down * 4);
for (let i = 0; i < across * down; i++) pixels.set([24, 22, 28, 255], i * 4);

const put = (x: number, y: number, hex: string): void => {
  for (let dy = 0; dy < scale; dy++) {
    for (let dx = 0; dx < scale; dx++) {
      const at = ((y * scale + dy) * across + x * scale + dx) * 4;
      pixels[at] = parseInt(hex.slice(1, 3), 16);
      pixels[at + 1] = parseInt(hex.slice(3, 5), 16);
      pixels[at + 2] = parseInt(hex.slice(5, 7), 16);
      pixels[at + 3] = 255;
    }
  }
};

rows.forEach(([, ids], r) => {
  ids.forEach((id, c) => {
    const grid = art.frames[id];
    if (!grid) return;
    grid.forEach((line, y) => {
      for (let x = 0; x < line.length; x++) {
        const hex = art.key[line[x]];
        if (hex) put(c * cell + x, r * cell + y, hex);
      }
    });
  });
});

writeFileSync(out, encodePng(across, down, pixels));
console.log(rows.map(([name, ids], i) => `row ${i}: ${name} (${ids.length}f)`).join('\n'));
