/**
 * A CONTACT SHEET of one hero's variants, one row each, off `GENERATED`.
 *
 *   npx tsx tools/art/roster.mts obreth out.png [scale] [state]
 *
 * `shipped.mts` answers "is this body right"; this answers "is the SWORD the
 * same sword in every hand", which is the question a roster of variants has to
 * survive. One state at a time, because the comparison is across bodies.
 */
import { writeFileSync } from 'node:fs';
import { GENERATED } from '../../src/render/generated-art.ts';
import { encodePng } from './png.mts';

const [hero, out = `${hero}-roster.png`, zoom = '3', state = 'idle'] = process.argv.slice(2);
const scale = Math.max(1, Math.floor(Number(zoom)));

const rows = Object.entries(GENERATED)
  .filter(([sprite]) => sprite.split('_')[0] === hero && sprite.includes('_'))
  .map(([sprite, art]) => ({ sprite, art, ids: art.states[state] ?? [] }))
  .filter((r) => r.ids.length > 0);
if (rows.length === 0) throw new Error(`nothing of ${hero} holds a ${state}`);

const cell = rows[0].art.grid;
const wide = Math.max(...rows.map((r) => r.ids.length));
const across = cell * wide * scale;
const down = cell * rows.length * scale;
const rgba = new Uint8Array(across * down * 4);
for (let i = 0; i < rgba.length; i += 4) {
  rgba[i] = 26;
  rgba[i + 1] = 24;
  rgba[i + 2] = 32;
  rgba[i + 3] = 255;
}

rows.forEach((row, r) => {
  row.ids.forEach((id, c) => {
    const frame = row.art.frames[id];
    if (!frame) return;
    frame.forEach((line: string, y: number) => {
      [...line].forEach((ch, x) => {
        const ink = row.art.key[ch];
        if (!ink) return;
        const [rr, gg, bb] = [1, 3, 5].map((at) => parseInt(ink.slice(at, at + 2), 16));
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = (c * cell + x) * scale + dx;
            const py = (r * cell + y) * scale + dy;
            const at = (py * across + px) * 4;
            rgba[at] = rr;
            rgba[at + 1] = gg;
            rgba[at + 2] = bb;
          }
        }
      });
    });
  });
});

writeFileSync(out, encodePng(across, down, rgba));
console.log(`${out}: ${rows.length} variants, ${state}\n  ${rows.map((r) => r.sprite).join('\n  ')}`);
