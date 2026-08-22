/**
 * DUAL WIELDING, as a queue.
 *
 *   npx tsx tools/art/pairs.mts plan            what is missing, and nothing else
 *   npx tsx tools/art/pairs.mts dress [sprite]  the states that have no character yet
 *   npx tsx tools/art/pairs.mts seed            rows in generated.json to animate into
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
type Book = { bodies: Body[] };
const read = (): Book => JSON.parse(readFileSync(here('bodies.json'), 'utf8')) as Book;
let book = read();

/** RE-READ before every write. A run takes an hour and `variant.mts write` is
 *  run inside it; a snapshot taken at startup reverts whatever was composed
 *  while it worked, which cost twenty rows of words once already. */
function keep(change: (now: Book) => void): void {
  const now = read();
  change(now);
  writeFileSync(here('bodies.json'), `${JSON.stringify(now, null, 1)}\n`);
  book = now;
}

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

/** A row in `generated.json` to animate INTO, carrying the parent variant's own
 *  sampling — the grid, the inks, the stride and each state's kept window are
 *  what a human judged of the same man in the same states, and a pair changes
 *  only what is in his hands. `group` is left empty: it is the server's to say. */
if (command === 'seed') {
  const madePath = here('generated.json');
  const made = JSON.parse(readFileSync(madePath, 'utf8')) as { bodies: any[] };
  for (const { hero, a, b } of pairs) {
    const sprite = `${hero}_${a}_${b}`;
    const row = find(sprite);
    if (!row?.character) continue;
    const parent = made.bodies.find((x) => x.sprite === `${hero}_${a}`);
    if (!parent) throw new Error(`${sprite}: ${hero}_${a} has never been imported`);
    const already = made.bodies.find((x) => x.sprite === sprite);
    const states: Record<string, unknown> = {};
    for (const [name, state] of Object.entries(parent.states as Record<string, any>)) {
      const { group, ...judged } = state;
      states[name] = { ...judged, ...(already?.states?.[name]?.group ? { group: already.states[name].group } : {}) };
    }
    const seeded = { ...parent, sprite, character: row.character, states };
    if (already) Object.assign(already, seeded);
    else made.bodies.push(seeded);
    console.log(`${sprite}: seeded off ${parent.sprite}`);
  }
  writeFileSync(madePath, `${JSON.stringify(made, null, 1)}\n`);
  process.exit(0);
}

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
    const made = row;
    keep((now) => {
      if (!now.bodies.some((b) => b.sprite === sprite)) now.bodies.push(made);
    });
    row = book.bodies.find((b) => b.sprite === sprite)!;
  }

  if (command === 'plan') {
    console.log(`${sprite}: ${row.character ? row.character : `dress ${b}_off onto ${parent.sprite}`}`);
    continue;
  }
  // NAMED, a row is asked AGAIN: a judged state that missed is re-rolled and
  // the ones that landed are not paid for twice.
  if (command !== 'dress' || (row.character && !only.length)) continue;

  // Its OWN label, or two heroes' sword-and-daggers land on one cache file.
  const out = execFileSync('npx', ['tsx', here('dress.mts'), `${b}_off`, '--state', parent.character, sprite],
    { encoding: 'utf8' });
  const id = /state ([0-9a-f-]{36})/.exec(out)?.[1];
  console.log(`${sprite}: ${id ?? out.slice(0, 200)}`);
  if (!id) continue;
  keep((now) => {
    const at = now.bodies.find((b) => b.sprite === sprite);
    if (at) at.character = id;
  });
}
if (command !== 'plan' && command !== 'dress') console.log('plan | dress [sprite ...]');
