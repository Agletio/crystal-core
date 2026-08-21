/**
 * A VARIANT's words, composed rather than written.
 *
 *   npx tsx tools/art/variant.mts check                  every variant, against its row
 *   npx tsx tools/art/variant.mts write <sprite> [...]   rewrite those rows in bodies.json
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
  weapon?: string;
  off?: string;
  states: Record<string, State>;
};
type Weapon = { say: string; attack: string; carry?: string; noun: string };

const here = (f: string) => new URL(`./${f}`, import.meta.url).pathname;
const words = JSON.parse(readFileSync(here('weapons.json'), 'utf8')) as {
  hold: string;
  quiet: string;
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
    name === 'idle' ? words.quiet : '',
  ]
    .filter(Boolean)
    .join(' ');
}

const strip = (say: string, lead: string): string =>
  say.toLowerCase().startsWith(`${lead.toLowerCase()} `) ? say.slice(lead.length + 1) : say;

const [command, ...only] = process.argv.slice(2);
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
  console.log('check | write <sprite> [sprite ...]');
}
