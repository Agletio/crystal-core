import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Rng } from './rng';
import { ModPool } from './mods';
import { craft, describeItem } from './crafting';
import {
  ALL_MODS,
  CURRENCY_BY_ID,
  CRYSTAL_TIERS,
  DAMAGE_GROUPS,
  DAMAGE_TYPES,
  EQUIP_SLOTS,
  RECIPES,
  SKILLS,
} from './data';
import {
  balance,
  crystalCost,
  grant,
  makeCrystal,
  makeGear,
  runRecipe,
} from './economy';
import { RunSim, runToCompletion } from './sim/run';
import { characterStats } from './sim/stats';
import { makeCharacter, xpToNext } from './sim/character';
import { starterLoadout } from './sim/loadout';
import { TUTORIAL_STEPS, recipeButtonId, slotButtonId } from './ui/tutorial';
import type { GuideCtx } from './ui/tutorial';
import {
  craftItem,
  createGame,
  equipItem,
  grantFirstClear,
  replaceItem,
  selectForCraft,
} from './game/state';
import type { Item, Wallet } from './types';

const pool = new ModPool(ALL_MODS);
const rng = new Rng(20260804);

const line = (s = '') => console.log(s);
const rule = (t: string) => {
  line();
  line(`── ${t} ${'─'.repeat(Math.max(0, 60 - t.length))}`);
};

/**
 * An assertion that reports rather than throws, and sets the exit code.
 *
 * Distinct from the ✗ marks the crafting walkthrough prints: those are the
 * rules working — a refused craft is the demonstration. These are the checks
 * that must hold, and CI is only worth having if a broken one turns the run
 * red instead of printing a cross into a log nobody reads.
 */
let failed = 0;
function check(ok: boolean, good: string, bad: string): void {
  if (ok) {
    line(`  ✓ ${good}`);
    return;
  }
  failed++;
  line(`  ✗ FAILED — ${bad}`);
}

function apply(item: Item, currencyId: string): Item {
  const currency = CURRENCY_BY_ID[currencyId];
  const res = craft(item, currency, pool, rng);
  if (!res.ok) {
    line(`  ✗ ${currency.name}: ${res.error}`);
    return item;
  }
  line(`  ✓ ${currency.name}`);
  for (const l of res.log) line(`      ${l}`);
  return res.item;
}

// ===========================================================================
rule('CRAFTING A CRYSTAL');

let crystal = makeCrystal(3);
line(describeItem(crystal));

line();
crystal = apply(crystal, 'essence_of_the_swarm'); // guaranteed density
crystal = apply(crystal, 'shard_of_making');
crystal = apply(crystal, 'shard_of_making');
crystal = apply(crystal, 'shard_of_making'); // 4th — should be refused
line();
line(describeItem(crystal));

// ===========================================================================
rule('THE ADD / REMOVE LOOP');

let gear = makeGear('body_armour', 55, 'Runeplate');
gear = apply(gear, 'shard_of_awakening'); // fill all four slots at once
line();
line(describeItem(gear));

line();
line('Main and secondary never compete — target one directly:');
gear = apply(gear, 'shard_of_unmaking');
gear = apply(gear, 'whetstone_of_might'); // main slot only
line();
line(describeItem(gear));

line();
line('Refine a tier, then buy a 5th slot:');
gear = apply(gear, 'sigil_of_refinement');
gear = apply(gear, 'sigil_of_excess');
gear = apply(gear, 'shard_of_making');
line();
line(describeItem(gear));

// ===========================================================================
rule('CORRUPTION LOCKS THE ITEM');

let trinket = makeGear('ring', 40, 'Band of Ash');
trinket = apply(trinket, 'shard_of_awakening');
trinket = apply(trinket, 'sigil_of_finality');
line();
line(describeItem(trinket));
line();
trinket = apply(trinket, 'shard_of_making'); // should be refused

// ===========================================================================
rule('AN ACTUAL RUN — headless, no browser');

{
  const socketed = craft(
    makeCrystal(3),
    CURRENCY_BY_ID.shard_of_awakening,
    pool,
    rng
  ).item;
  const hero = makeCharacter(starterLoadout(new Rng(7)), 'strike');
  const stats = characterStats(hero);

  line(`Crystal: ${socketed.mods.map((m) => m.name).join(', ')}`);
  line(
    `Hero:    level ${hero.level} · ${Math.round(stats.maxLife)} life · ` +
      `${Math.round(stats.damage)} dmg · ${stats.attacksPerSecond.toFixed(2)}/s · ` +
      `${Math.round(stats.critChance)}% crit`
  );

  const sim = new RunSim(socketed, hero, new Rng(4242));
  const { grid } = sim.state.map;
  line(
    `Map:     ${grid.width}x${grid.height}, ${sim.state.map.rooms.length} rooms, ` +
      `${sim.state.totalMonsters} monsters`
  );

  const final = runToCompletion(sim);
  line();
  line(
    `Result:  ${final.status} in ${final.elapsed.toFixed(1)}s — ` +
      `${final.killed}/${final.totalMonsters} killed, ` +
      `${Math.max(0, Math.round(final.hero.life))} life left, ` +
      `${final.xpGained} xp (level 2 needs ${xpToNext(1)})`
  );
}

// ===========================================================================
rule('GUIDED OPENING — does every step actually complete?');

// Steps are predicates over game state, so the whole sequence can be walked
// here without a browser. This is the check that matters: a step whose `done`
// can never become true would strand a new player on it forever, and that is
// invisible from the UI until someone sits there clicking.
{
  const game = createGame('fresh');
  const ctx: GuideCtx = { view: 'run', phase: 'menu', top: null };
  let step = 0;
  const trace: string[] = [];
  const targetless: string[] = [];
  const MARKUP = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');

  /** Every surface a step could be pointing at when it fires. */
  const SITUATIONS: GuideCtx[] = [
    { view: 'run', phase: 'menu', top: null },
    { view: 'run', phase: 'running', top: null },
    { view: 'run', phase: 'results', top: null },
    { view: 'craft', phase: 'results', top: 'craft' },
    { view: 'craft', phase: 'results', top: 'shop' },
    { view: 'run', phase: 'results', top: 'shop' },
    { view: 'run', phase: 'results', top: 'sheet' },
    { view: 'run', phase: 'menu', top: 'skills' },
  ];

  const targetsOf = (s: (typeof TUTORIAL_STEPS)[number]): string[] =>
    typeof s.target === 'string'
      ? [s.target]
      : [...new Set(SITUATIONS.map((c) => (s.target as (c: GuideCtx) => string)(c)))];

  // Everything the UI assigns an id to at runtime — every ui module except
  // the one under test, since the guide quotes its own targets and would
  // happily vouch for a typo it made itself.
  const UI = join(fileURLToPath(new URL('./ui/', import.meta.url)));
  const UI_SRC = readdirSync(UI)
    .filter((f) => f.endsWith('.ts') && f !== 'tutorial.ts')
    .map((f) => readFileSync(join(UI, f), 'utf8'))
    .join('\n');

  // Four ways for an id to be real: written into the markup, assigned as a
  // literal somewhere in the UI, or built by the shop from a recipe or by the
  // sheet from an equipment slot.
  const exists = (id: string): boolean =>
    MARKUP.includes(`id="${id}"`) ||
    UI_SRC.includes(`'${id}'`) ||
    RECIPES.some((r) => recipeButtonId(r.id) === id) ||
    EQUIP_SLOTS.some((s) => slotButtonId(s.id) === id);

  // Everything the guide asks for, in order. Each entry is what a player
  // would do; the step should then satisfy itself.
  const actions: Array<() => void> = [
    () => { ctx.phase = 'running'; },
    () => {
      // Clearing it leaves the report on screen — and it STAYS there through
      // everything below, because nothing in the guided opening dismisses it.
      // That is why the last step has to point at "Back to the Fissure".
      ctx.phase = 'results';
      grantFirstClear(game);
      line(
        `  after the first clear: ${balance(game.wallet, 'fragment')} fragments, ` +
          `${game.inventory.length} items`
      );
    },
    () => { ctx.top = 'shop'; },
    () => { runRecipe(game.wallet, 'make_shard_of_awakening'); },
    () => {
      // Currency is spent from the dock onto the bench, so getting to the
      // next step means leaving the shop for crafting.
      ctx.view = 'craft';
      ctx.top = 'craft';
      const wand = game.inventory.find((i) => i.kind === 'gear');
      if (wand) selectForCraft(game, wand);
    },
    () => {
      const wand = craftItem(game)!;
      const result = craft(wand, CURRENCY_BY_ID.shard_of_awakening, pool, rng);
      if (result.ok) replaceItem(game, result.item);
    },
    () => { ctx.top = 'shop'; runRecipe(game.wallet, 'make_shard_of_chaos'); },
    () => {
      const wand = craftItem(game)!;
      equipItem(game, wand, 'weapon');
    },
    // Close the sheet, dismiss the report, enter again.
    () => { ctx.view = 'run'; ctx.top = null; ctx.phase = 'running'; },
  ];

  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    const current = TUTORIAL_STEPS[step];
    actions[i]?.();
    // Advance past everything now satisfied, as the real driver does.
    while (step < TUTORIAL_STEPS.length && TUTORIAL_STEPS[step].done(game, ctx)) step++;
    trace.push(`${current.id} -> ${step}`);

    // Every step must name an element that exists, or it highlights nothing
    // and the card floats in a corner pointing at empty space. Targets that
    // branch on what's open are checked in EVERY branch, not just the one
    // this walkthrough happens to be in — the whole point of a moving target
    // is that it fires in situations the happy path never visits.
    for (const id of targetsOf(current)) {
      if (!exists(id)) targetless.push(`${current.id} -> #${id}`);
    }
  }

  for (const entry of trace) line(`  ${entry}`);
  check(
    step >= TUTORIAL_STEPS.length,
    `all ${TUTORIAL_STEPS.length} steps completed, and affordable`,
    `STUCK on '${TUTORIAL_STEPS[step]?.id}' — a new player cannot finish`
  );
  check(
    targetless.length === 0,
    'every step points at an element that exists',
    `points at nothing: ${targetless.join(', ')}`
  );
  // The guide walks you into equipping the item that is sitting on the bench.
  // A stale craftId would leave the bench holding something you're wearing,
  // with every currency button live against it.
  check(
    craftItem(game) === null,
    'equipping the benched item cleared the bench',
    'the bench still holds an item you are now wearing'
  );
  // The last step claims you can afford a crystal. It should be true.
  const left = balance(game.wallet, 'fragment');
  const crystalCost = CRYSTAL_TIERS[0].fragments;
  check(
    left >= crystalCost,
    `${left} fragments left — a T1 crystal costs ${crystalCost}, as promised`,
    `only ${left} left but the last step promises a crystal at ${crystalCost}`
  );
}

// ===========================================================================
rule('SKILL TAG CHECK — no damage types hiding in skill tags');

// Skill tags join the context of EVERY damage-type pass. A damage type or
// group sitting in tags therefore satisfies all of them and silently scales
// every type the skill deals. It looks harmless until a mod tagged with that
// group exists, and then it is very hard to spot.
{
  const banned = new Set<string>([
    ...DAMAGE_TYPES.map((d) => d.id),
    ...DAMAGE_GROUPS,
  ]);
  const offenders: string[] = [];

  for (const skill of SKILLS) {
    for (const tag of skill.tags) {
      if (banned.has(tag)) offenders.push(`${skill.name} has '${tag}' in tags`);
    }
  }

  check(
    offenders.length === 0,
    'every skill keeps its damage types out of its tags',
    `tag leak: ${offenders.join(', ')}`
  );
}

// ===========================================================================
rule('THE FINALE — what is waiting at the exit?');

// Rolled per run, so the same crystal doesn't always end the same way. All
// three should show up across a handful of seeds; if one dominates, the
// weights are wrong and one build would own every ending.
{
  line('  seed   finale          result     time   killed        xp');
  const tally: Record<string, number> = {};

  for (const seed of [11, 12, 13, 14, 15, 16]) {
    const c = craft(makeCrystal(3), CURRENCY_BY_ID.shard_of_awakening, pool, rng).item;
    const hero = makeCharacter(starterLoadout(new Rng(7)), 'strike');
    const sim = new RunSim(c, hero, new Rng(seed * 101));
    const f = runToCompletion(sim);
    const name = f.finale ?? '(never reached)';
    tally[name] = (tally[name] ?? 0) + 1;

    line(
      `  ${String(seed).padStart(4)}   ${name.padEnd(14)}  ${f.status.padEnd(8)} ` +
        `${f.elapsed.toFixed(0).padStart(5)}s   ${String(f.killed).padStart(3)}/${
          f.totalMonsters
        }   ${String(Math.round(f.xpGained)).padStart(7)}`
    );
  }
  line();
  line(`  spread: ${JSON.stringify(tally)}`);
}

// ===========================================================================
rule('TIER LADDER — where does starter gear fall over?');

// Several seeds per tier — one run per tier is far too noisy to tune against,
// and a ladder you can't trust is worse than no ladder.
const LADDER_SEEDS = [3, 17, 41, 58, 90];

line('  tier   cleared   avg time   avg killed   avg life left');
for (const t of CRYSTAL_TIERS) {
  let cleared = 0;
  let time = 0;
  let killed = 0;
  let life = 0;

  for (const seed of LADDER_SEEDS) {
    const socketed = craft(
      makeCrystal(t.tier),
      CURRENCY_BY_ID.shard_of_awakening,
      pool,
      rng
    ).item;
    const sim = new RunSim(
      socketed,
      makeCharacter(starterLoadout(new Rng(7)), 'strike'),
      new Rng(900 + seed * 7 + t.tier)
    );
    const f = runToCompletion(sim, 400);

    if (f.status === 'cleared') cleared++;
    time += f.elapsed;
    killed += f.killed;
    life += Math.max(0, f.hero.life);
  }

  const n = LADDER_SEEDS.length;
  line(
    `   T${t.tier}   ${`${cleared}/${n}`.padStart(7)}   ` +
      `${(time / n).toFixed(0).padStart(7)}s   ` +
      `${(killed / n).toFixed(0).padStart(10)}   ` +
      `${(life / n).toFixed(0).padStart(13)}`
  );
}
line();
// Deliberately describes what to look FOR rather than asserting a result —
// a hardcoded verdict goes stale the moment the numbers move and then the
// harness is confidently lying to you.
line('Read the cleared column, not the times. Somewhere on this ladder should');
line('be the tier that stops being safe; that gap is what gear is for. If the');
line('top row clears every time, there is nothing left to chase.');
line('Gear is what moves that line up. If it never loses, gear does not matter');
line('yet, and if it never wins the early game is unplayable — watch both ends.');

// ===========================================================================
rule('TERMINATION CHECK — does every run actually end?');

// Worth its own check because this failure mode has bitten three times now
// (a corridor that carved only one leg, a fractional exit the hero could
// never quite stand on, and a target on the aggro boundary it chased in
// circles). All three looked identical from outside: a hero standing still
// forever at full life. A run that does not end is the worst bug this thing
// can have, and it is invisible unless you assert on it.
{
  let checked = 0;
  const stuck: string[] = [];

  for (const t of CRYSTAL_TIERS) {
    for (const seed of [11, 29, 47, 63]) {
      const c = craft(
        makeCrystal(t.tier),
        CURRENCY_BY_ID.shard_of_awakening,
        pool,
        rng
      ).item;
      const sim = new RunSim(
        c,
        makeCharacter(starterLoadout(new Rng(7)), 'strike'),
        new Rng(seed * 31 + t.tier)
      );
      const f = runToCompletion(sim, 400);
      checked++;
      if (f.status === 'running') stuck.push(`T${t.tier} seed ${seed}`);
    }
  }

  line(`  ${checked} runs, ${stuck.length} that never ended`);
  check(
    stuck.length === 0,
    'all runs terminated',
    `termination regression: ${stuck.join(', ')}`
  );
}

// ===========================================================================
rule('SUSTAIN CHECK — is reinvestment under 1.0?');

// Measured by actually running descents, not by a formula. There used to be a
// separate analytical model here (simulateRun) which meant the harness and
// the game could disagree about what a run was worth; now there is one
// answer. Fewer samples than the old formula allowed, since each of these is
// a full simulation.
line('  tier   cost   avg yield   ratio   (want < 1.00)   cleared');
for (const t of CRYSTAL_TIERS) {
  const runs = 12;
  let banked = 0;
  let cleared = 0;

  for (let i = 0; i < runs; i++) {
    const c = craft(
      makeCrystal(t.tier),
      CURRENCY_BY_ID.shard_of_awakening,
      pool,
      rng
    ).item;
    const sim = new RunSim(
      c,
      makeCharacter(starterLoadout(new Rng(7)), 'strike'),
      new Rng(5000 + t.tier * 31 + i),
      {}
    );
    const final = runToCompletion(sim, 400);
    // Only a cleared run banks anything, which is the point of the mechanic.
    if (final.status === 'cleared') {
      cleared++;
      banked += final.loot.currency.fragment ?? 0;
    }
  }

  const avg = banked / runs;
  const cost = crystalCost(t.tier);
  const ratio = avg / cost;
  const flag = ratio >= 1 ? '  ← above 1.0' : '';
  line(
    `   T${t.tier}   ${String(cost).padStart(4)}   ${avg.toFixed(1).padStart(9)}   ` +
      `${ratio.toFixed(2).padStart(5)}${flag.padEnd(15)}   ${cleared}/${runs}`
  );
}
line();
line('Yield is what a run BANKS, so dying scores zero — the deeper tiers are');
line('self-limiting without needing the numbers tuned against them.');

// ===========================================================================
rule('WHERE THE FRAGMENTS GO');

const wallet: Wallet = {};
grant(wallet, 'fragment', 300);
line(`Start: ${balance(wallet, 'fragment')} fragments`);

const queue: Item[] = [];
while (true) {
  const res = runRecipe(wallet, 'crystal_t2');
  if (!res.ok || !res.item) break;
  let c = res.item;
  c = craft(c, CURRENCY_BY_ID.shard_of_awakening, pool, rng).item;
  queue.push(c);
}
line(`Prepped ${queue.length} crystals, ${balance(wallet, 'fragment')} fragments left`);

let elapsed = 0;
let survived = 0;
for (const c of queue) {
  const sim = new RunSim(c, makeCharacter(starterLoadout(new Rng(7)), 'strike'), rng);
  const final = runToCompletion(sim, 400);
  elapsed += final.elapsed;
  if (final.status !== 'cleared') continue;
  survived++;
  for (const [id, n] of Object.entries(final.loot.currency)) {
    grant(wallet, id, Math.round(n));
  }
}

line(
  `Ran ${queue.length} crystals (${survived} cleared) in ${Math.round(elapsed / 60)} min → ` +
    `${balance(wallet, 'fragment')} fragments`
);
line(
  `Queue is empty and you can't rebuild it fully — that's the resting state working.`
);

// ===========================================================================
// The harness is a report you read AND a check that can fail. Everything
// above prints numbers to judge by eye; the check() calls are the ones with
// an answer, and CI needs them to decide red or green.
rule('RESULT');
line(
  failed === 0
    ? '  ✓ every check passed'
    : `  ✗ ${failed} check${failed === 1 ? '' : 's'} failed — see above`
);
process.exitCode = failed === 0 ? 0 : 1;
