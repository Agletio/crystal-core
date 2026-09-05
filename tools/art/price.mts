/**
 * WHAT AN ART JOB WOULD COST, before a generation is spent.
 * `price.mts <job> [what]` — `body`, `rebody`, `state`, `variant`, `icon`.
 *
 * THE BLAST RADIUS IS DERIVED, never recalled: re-rotating one hero's base
 * invalidates every dressed variant hanging off it, and that fact lives in
 * `GENERATED`, so this walks it. A quote that has to be remembered goes stale
 * the week a variant is added. Per-unit figures are the `art` skill's MEASURED
 * ones, and a range because they were measured as one.
 */
import { GENERATED } from '../../src/render/generated-art';

/** Measured, from the art skill. A rotation is per body; a state is five
 *  facings and a v3 animation costs more than one apiece. */
const COST = {
  design: 1,
  rotate: 2,
  state: 13, // one animation state, five facings
  dress: [20, 40] as [number, number], // `create_character_state`, a whole look
};

/** OFF A MEASURED ANCHOR, not a parallelism model: the skill records a finished
 *  body at ~68 generations and "most of an hour". Modelling the ten job slots
 *  instead said 31 minutes for what is a day of work. */
const MINUTES_PER_GEN = 0.8;

const variantsOf = (sprite: string): string[] =>
  Object.keys(GENERATED).filter((id) => id.startsWith(`${sprite}_`));

const statesOf = (sprite: string): number =>
  Object.keys(GENERATED[sprite]?.states ?? {}).length || 5;

/** A body from nothing: one design, a rotation, and every state. */
function body(sprite: string): { gens: [number, number]; why: string[] } {
  const states = statesOf(sprite);
  const one = COST.design + COST.rotate + states * COST.state;
  return {
    gens: [one, one],
    why: [
      `${COST.design} design + ${COST.rotate} rotation + ${states} states x ${COST.state} = ${one}`,
    ],
  };
}

/** RE-ROTATING ONE THAT SHIPS — the expensive one nobody expects. Every variant
 *  must follow, or the hero reverts the moment he picks a weapon up. */
function rebody(sprite: string): { gens: [number, number]; why: string[] } {
  const base = body(sprite);
  const kids = variantsOf(sprite);
  const states = statesOf(sprite);
  const each: [number, number] = [
    COST.dress[0] + states * COST.state,
    COST.dress[1] + states * COST.state,
  ];
  const lo = base.gens[0] + kids.length * each[0];
  const hi = base.gens[1] + kids.length * each[1];
  return {
    gens: [lo, hi],
    why: [
      `the base body itself: ${base.gens[0]}`,
      `${kids.length} dressed variants hang off it, and every one must follow:`,
      `  each is ${COST.dress[0]}-${COST.dress[1]} to dress + ${states} states x ${COST.state} = ${each[0]}-${each[1]}`,
      `  ${kids.length} x ${each[0]}-${each[1]} = ${kids.length * each[0]}-${kids.length * each[1]}`,
      kids.length > 0 ? `  they are: ${kids.join(', ')}` : '',
    ].filter(Boolean),
  };
}

const JOBS_HELP = `price.mts body <sprite> | rebody <sprite> | state <sprite> | variant <sprite> | icon [n]`;

const [job, what = '', n = '1'] = process.argv.slice(2);
let out: { gens: [number, number]; why: string[] } | null = null;

if (job === 'body') out = body(what);
else if (job === 'rebody') out = rebody(what);
else if (job === 'state') {
  out = { gens: [COST.state, COST.state], why: [`one state, five facings`] };
} else if (job === 'variant') {
  const states = statesOf(what);
  out = {
    gens: [COST.dress[0] + states * COST.state, COST.dress[1] + states * COST.state],
    why: [`${COST.dress[0]}-${COST.dress[1]} to dress + ${states} states x ${COST.state}`],
  };
} else if (job === 'icon') {
  const many = Number(what) || Number(n) || 1;
  out = { gens: [many, many], why: [`${many} x ${COST.design} design`] };
}

if (!out) {
  console.log(JOBS_HELP);
  process.exit(1);
}

const [lo, hi] = out.gens;
const hours = (g: number): string => {
  const m = g * MINUTES_PER_GEN;
  return m < 90 ? `${Math.round(m)} minutes` : `${(m / 60).toFixed(1)} hours`;
};
console.log(`${job} ${what}`.trim());
for (const line of out.why) console.log(`  ${line}`);
console.log(
  `  => ${lo === hi ? lo : `${lo}-${hi}`} generations, roughly `
    + `${lo === hi ? hours(lo) : `${hours(lo)} to ${hours(hi)}`} of wall clock`
);
if (hi >= 500) console.log('  STOP. Quote this before spending anything: it is a day of the machine.');
