/**
 * A VARIANT's words, composed rather than written.
 *
 *   npx tsx tools/art/variant.mts check                  every variant, against its row
 *   npx tsx tools/art/variant.mts write <sprite> [...]   rewrite those rows in bodies.json
 *   npx tsx tools/art/variant.mts seed <hero>            the thirteen rows a hero carries
 *   npx tsx tools/art/variant.mts manifest <hero>        rows to IMPORT into, off his own
 *
 * A variant is one hero holding one weapon, and there are 26 over two heroes.
 * Its five states are the BASE body's states with the weapon named in them, so
 * what a hero does is written once in `bodies.json` and what a weapon looks
 * like once in `weapons.json`. `check` is the proof: it composes all 26 and
 * prints what differs, so a change here is measured against rows that were
 * judged and shipped. `write` touches only the sprites it is named — the words
 * in a row are the words its shipped art was ASKED with.
 */
import { readFileSync, writeFileSync } from 'node:fs';

type State = { frames: number; say: string };
type Body = {
  sprite: string;
  name?: string;
  size?: number;
  look?: string;
  weapon?: string;
  off?: string;
  states: Record<string, State>;
};
type Weapon = { say: string; attack: string; carry?: string; noun: string; pair?: boolean };

const here = (f: string) => new URL(`./${f}`, import.meta.url).pathname;
const words = JSON.parse(readFileSync(here('weapons.json'), 'utf8')) as {
  hold: string;
  quiet: string;
  quietPair: string;
  weapons: Record<string, Weapon>;
};
const book = JSON.parse(readFileSync(here('bodies.json'), 'utf8')) as { bodies: Body[] };

/** How a state OPENS. Two of them repeat the base's own first words, which is
 *  why they are stripped off it rather than left to say themselves twice. */
const LEAD: Record<string, string> = {
  idle: 'Standing still',
  walk: 'Walking forward',
  attack: 'Attacking',
  cast: 'Casting',
  death: 'Dying',
};

/** Said of an ATTACK, and of nothing else: the renderer holds a one-shot
 *  state's LAST frame, so a beat that settles back is the pose it ends in. */
const ONCE =
  'seen at a three-quarter angle. He faces the same way in EVERY frame and never turns away '
  + 'from the viewer, and the animation ENDS at full extension with no recovery and no '
  + 'settling back.';

const base = (sprite: string): Body | undefined => {
  const parent = sprite.split('_')[0];
  return book.bodies.find((b) => b.sprite === parent);
};

/** What a variant calls what it is holding: one weapon, or a weapon and what
 *  is strapped to the other arm. */
function noun(body: Body): string {
  const main = body.weapon ? words.weapons[body.weapon]?.noun : undefined;
  const off = body.off === body.weapon ? undefined : body.off && words.weapons[body.off]?.noun;
  if (main && off) return `${main} and his ${off}`;
  return main ?? off ?? '';
}

export function compose(body: Body, name: string, from: State): string {
  const held = noun(body);
  const lead = LEAD[name] ?? 'Standing still';
  const weapon = body.weapon ? words.weapons[body.weapon] : undefined;
  const off = body.off && body.off !== body.weapon ? words.weapons[body.off] : undefined;

  // An ATTACK is the WEAPON's swing, never the body's: a maul does not jab and
  // a bow does not smash, which is the whole reason a body holds its own.
  const middle =
    name === 'attack'
      ? `${weapon?.attack ?? off?.attack ?? from.say}, ${ONCE}`
      : `${strip(from.say, lead)}${name === 'cast' || name === 'death' ? ', seen at a three-quarter angle.' : '.'}`;

  const carries = name === 'attack' ? [] : [weapon?.carry, off?.carry].filter(Boolean);
  return [
    `${lead} with his ${held}, ${middle}`,
    words.hold,
    ...carries,
    // The shared one forbids a SECOND weapon, which is the one thing a pair
    // must have — so a body holding two takes the other.
    name === 'idle' ? (off?.pair ? words.quietPair : words.quiet) : '',
  ]
    .filter(Boolean)
    .join(' ');
}

const strip = (say: string, lead: string): string =>
  say.toLowerCase().startsWith(`${lead.toLowerCase()} `) ? say.slice(lead.length + 1) : say;

const [command, ...only] = process.argv.slice(2);

/** WHAT ONE HERO CARRIES: nine weapons, and the four one-handers with a shield
 *  strapped to the other arm. `dressbody.sh` walks this same list. */
const CARRIES: Array<{ weapon: string; off?: string }> = [
  ...['sword', 'sword2h', 'dagger', 'mace', 'mace2h', 'staff', 'wand', 'bow'].map((weapon) => ({ weapon })),
  { weapon: 'shield', off: 'shield' },
  ...['sword', 'dagger', 'mace', 'wand'].map((weapon) => ({ weapon, off: 'shield' })),
];

if (command === 'seed') {
  const hero = only[0];
  const from = book.bodies.find((b) => b.sprite === hero && !b.sprite.includes('_'));
  if (!from) throw new Error(`no base body ${hero}`);
  for (const { weapon, off } of CARRIES) {
    const sprite = [hero, weapon, off === weapon ? undefined : off].filter(Boolean).join('_');
    if (book.bodies.some((b) => b.sprite === sprite)) {
      console.log(`${sprite}: already there`);
      continue;
    }
    const held = words.weapons[weapon]?.noun ?? weapon;
    const second = off && off !== weapon ? ` and a ${words.weapons[off]?.noun}` : '';
    const row: Body = {
      sprite,
      name: `${from.name ?? hero}, with a ${held}${second}`,
      size: from.size ?? 96,
      weapon,
      ...(off ? { off } : {}),
      look: from.look,
      states: JSON.parse(JSON.stringify(from.states)),
    };
    for (const [name, state] of Object.entries(row.states)) {
      state.say = compose(row, name, from.states[name] ?? state);
    }
    book.bodies.push(row);
    console.log(`${sprite}: ${Object.keys(row.states).length} states`);
  }
  writeFileSync(here('bodies.json'), `${JSON.stringify(book, null, 1)}\n`);
  process.exit(0);
}

/**
 * A row in `generated.json` to import INTO, carrying its parent's own sampling
 * — the grid, the inks, the stride, the luma and each state's kept window are
 * what a human judged of the same man in the same states, and a variant changes
 * only what is in his hands. A PAIR takes the variant holding its main weapon;
 * everything else takes the bare body. `group` is left to `record.mts`: an id
 * is the server's to say, and one already there is kept.
 */
if (command === 'manifest') {
  const hero = only[0];
  const madePath = here('generated.json');
  const made = JSON.parse(readFileSync(madePath, 'utf8')) as { bodies: any[] };
  const mine = book.bodies.filter((b) => b.sprite.split('_')[0] === hero && b.sprite.includes('_'));
  for (const row of mine) {
    if (!row.character) {
      console.log(`${row.sprite}: not dressed yet`);
      continue;
    }
    const parts = row.sprite.split('_');
    // `<hero>_<a>_<b>` where b is a WEAPON is a pair; `_shield` is not one.
    const pair = parts.length === 3 && parts[2] !== 'shield';
    const parent = made.bodies.find(
      (x) => x.sprite === (pair ? `${hero}_${parts[1]}` : hero)
    );
    if (!parent) throw new Error(`${row.sprite}: nothing to sample off`);
    const already = made.bodies.find((x) => x.sprite === row.sprite);
    const states: Record<string, unknown> = {};
    for (const [name, state] of Object.entries(parent.states as Record<string, any>)) {
      const { group, ...judged } = state;
      // What was judged of THIS row wins: a variant whose own window had to be
      // narrowed to drop a bad frame is a decision, not drift from the parent.
      const own = already?.states?.[name] ?? {};
      states[name] = { ...judged, ...own };
    }
    const seeded = { ...parent, sprite: row.sprite, character: row.character, states };
    if (already) Object.assign(already, seeded);
    else made.bodies.push(seeded);
    console.log(`${row.sprite}: sampled off ${parent.sprite}`);
  }
  writeFileSync(madePath, `${JSON.stringify(made, null, 1)}\n`);
  process.exit(0);
}

const variants = book.bodies.filter((b) => b.sprite.includes('_') && (b.weapon || b.off));

if (command === 'check') {
  let differ = 0;
  for (const body of variants) {
    const from = base(body.sprite);
    if (!from) continue;
    for (const [name, state] of Object.entries(body.states)) {
      const want = compose(body, name, from.states[name] ?? state);
      if (want === state.say) continue;
      differ++;
      console.log(`${body.sprite}/${name}\n  is:   ${state.say}\n  want: ${want}\n`);
    }
  }
  console.log(`${variants.length} variants, ${differ} state(s) differ`);
} else if (command === 'write') {
  if (only.length === 0) throw new Error('name the sprites to rewrite');
  for (const sprite of only) {
    const body = variants.find((b) => b.sprite === sprite);
    const from = body && base(sprite);
    if (!body || !from) throw new Error(`${sprite} is not a variant with a base body`);
    for (const [name, state] of Object.entries(body.states)) {
      state.say = compose(body, name, from.states[name] ?? state);
    }
    console.log(`${sprite}: ${Object.keys(body.states).length} states`);
  }
  writeFileSync(here('bodies.json'), `${JSON.stringify(book, null, 1)}\n`);
} else {
  console.log('check | write <sprite> [...] | seed <hero> | manifest <hero>');
}
