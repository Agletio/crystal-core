/**
 * DUAL WIELDING, as a queue.
 *
 *   npx tsx tools/art/pairs.mts plan            what is missing, and nothing else
 *   npx tsx tools/art/pairs.mts dress [sprite]  the states that have no character yet
 *
 * Ten unordered pairs of the four one-handed families, twice over. A pair is
 * the `_off` row for one weapon layered onto the variant that already holds the
 * other, so the sword in a sword-and-dagger is the SAME sword by construction.
 * Idempotent on `bodies.json`: a row that has a `character` is never re-asked,
 * because a run WILL be interrupted.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const here = (f: string) => new URL(`./${f}`, import.meta.url).pathname;
type Body = { sprite: string; character?: string; name?: string; size?: number;
  weapon?: string; off?: string; look?: string; states?: Record<string, unknown> };
const book = JSON.parse(readFileSync(here('bodies.json'), 'utf8')) as { bodies: Body[] };

/** `HOLDING`'s own order, which is what `variants()` sorts a pair by. */
const ORDER = ['sword', 'dagger', 'mace', 'wand'];
const HEROES = ['alchemist', 'aethermancer'];

const pairs: Array<{ hero: string; a: string; b: string }> = [];
for (const hero of HEROES) {
  for (let i = 0; i < ORDER.length; i++) {
    for (let j = i; j < ORDER.length; j++) pairs.push({ hero, a: ORDER[i], b: ORDER[j] });
  }
}

const find = (sprite: string) => book.bodies.find((b) => b.sprite === sprite);
const NOUN: Record<string, string> = { sword: 'sword', dagger: 'dagger', mace: 'club', wand: 'wand' };

const [command, ...only] = process.argv.slice(2);

for (const { hero, a, b } of pairs) {
  const sprite = `${hero}_${a}_${b}`;
  if (only.length && !only.includes(sprite)) continue;
  const parent = find(`${hero}_${a}`);
  const base = find(hero);
  if (!parent?.character || !base) throw new Error(`${sprite}: no ${hero}_${a} to dress`);

  let row = find(sprite);
  if (!row) {
    row = {
      sprite,
      name: `${base.name ?? hero}, with a ${NOUN[a]} and a ${NOUN[b]}`,
      size: 96,
      weapon: a,
      off: `${b}_off`,
      look: base.look,
      states: JSON.parse(JSON.stringify(parent.states ?? base.states)),
    };
    book.bodies.push(row);
    writeFileSync(here('bodies.json'), `${JSON.stringify(book, null, 1)}\n`);
  }

  if (command === 'plan') {
    console.log(`${sprite}: ${row.character ? row.character : `dress ${b}_off onto ${parent.sprite}`}`);
    continue;
  }
  if (command !== 'dress' || row.character) continue;

  // Its OWN label, or two heroes' sword-and-daggers land on one cache file.
  const out = execFileSync('npx', ['tsx', here('dress.mts'), `${b}_off`, '--state', parent.character, sprite],
    { encoding: 'utf8' });
  const id = /state ([0-9a-f-]{36})/.exec(out)?.[1];
  console.log(`${sprite}: ${id ?? out.slice(0, 200)}`);
  if (!id) continue;
  row.character = id;
  writeFileSync(here('bodies.json'), `${JSON.stringify(book, null, 1)}\n`);
}
if (command !== 'plan' && command !== 'dress') console.log('plan | dress [sprite ...]');
