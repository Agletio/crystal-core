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
  GEAR_BASES,
  QUALITIES,
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
import {
  declaredCapacity,
  hasOpenSlot,
  modCapacity,
  qualityOf,
  slotAllocation,
  slotCapacity,
  slotTypes,
  slotUsed,
} from './mods';
import { FLOOR, TUNNEL, WALL, generateMap } from './sim/grid';
import { HERO_FRAMES, MONSTER_FRAMES, wellFormed } from './render/sprites';
import { characterStats } from './sim/stats';
import { makeCharacter, xpToNext } from './sim/character';
import { loadoutMods, starterLoadout } from './sim/loadout';
import { TUTORIAL_STEPS, recipeButtonId, slotButtonId } from './ui/tutorial';
import type { GuideCtx } from './ui/tutorial';
import {
  CARRY,
  addItem,
  buyStashSpace,
  carryRoom,
  craftItem,
  createGame,
  equipItem,
  grantFirstClear,
  replaceItem,
  selectForCraft,
  stashRoom,
  stashUpgradeCost,
  unequipItem,
} from './game/state';
import type { Item, Quality, Wallet } from './types';

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
// Quality first. A fresh item is Rough and has nowhere to put anything, so
// opening it is the first step of every craft — these sections used to skip
// it and print nothing but refusals.
crystal = apply(crystal, 'shard_of_seaming'); // Rough -> Seamed, one modifier
crystal = apply(crystal, 'essence_of_the_swarm'); // guaranteed density, second slot
crystal = apply(crystal, 'shard_of_making'); // refused — Seamed holds two
crystal = apply(crystal, 'sigil_of_ascent'); // Seamed -> Faceted, and a third
crystal = apply(crystal, 'shard_of_making'); // refused — three is all a crystal has
line();
line(describeItem(crystal));

// ===========================================================================
rule('THE ADD / REMOVE LOOP');

let gear = makeGear('body_armour', 55, 'Runeplate');
gear = apply(gear, 'shard_of_cleaving'); // straight to Faceted, three modifiers
gear = apply(gear, 'shard_of_awakening'); // and fill the fourth
line();
line(describeItem(gear));

line();
line('Slots are typed, and each type is its own ceiling:');
gear = apply(gear, 'shard_of_unmaking');
gear = apply(gear, 'whetstone_of_might'); // offence slot only
line();
line(describeItem(gear));

line();
line('Finish it, then buy a slot past the ceiling:');
gear = apply(gear, 'sigil_of_brilliance');
gear = apply(gear, 'shard_of_making');
gear = apply(gear, 'shard_of_making'); // six of six — Excess wants it finished
gear = apply(gear, 'sigil_of_refinement');
gear = apply(gear, 'sigil_of_excess');
gear = apply(gear, 'shard_of_making'); // the seventh, which no quality grants
line();
line(describeItem(gear));

// ===========================================================================
rule('CORRUPTION LOCKS THE ITEM');

let trinket = makeGear('ring', 40, 'Band of Ash');
trinket = apply(trinket, 'shard_of_cleaving');
trinket = apply(trinket, 'shard_of_awakening');
trinket = apply(trinket, 'sigil_of_finality');
line();
line(describeItem(trinket));
line();
trinket = apply(trinket, 'shard_of_making'); // should be refused

// ===========================================================================
rule('AN ACTUAL RUN — headless, no browser');

{
  // Cleave, then fill: Awakening needs Faceted, so a fresh crystal handed
  // straight to it came back blank and the run below was measured against a
  // crystal with no modifiers on it at all.
  const opened = craft(makeCrystal(3), CURRENCY_BY_ID.shard_of_cleaving, pool, rng).item;
  const socketed = craft(opened, CURRENCY_BY_ID.shard_of_awakening, pool, rng).item;
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
rule('QUALITY — does the ladder actually restrict anything?');

// The whole point of quality is that an item has a ceiling you cannot craft
// past. Every check here is a way that could quietly stop being true: an
// effect that fills without asking, a currency that skips a rung, a drop table
// that hands out the top of the ladder on a tier-1 map.
{
  const wand = () => makeGear('ash_wand', 60);

  check(
    modCapacity(wand()) === 0,
    'a fresh item is Rough and holds nothing',
    `capacity ${modCapacity(wand())}`
  );

  // Every step-up currency, in order, on its own fresh item.
  const step = (from: Item, currency: string) =>
    craft(from, CURRENCY_BY_ID[currency], pool, rng);

  const seamed = step(wand(), 'shard_of_seaming');
  check(
    seamed.ok && qualityOf(seamed.item) === 'seamed' && seamed.item.mods.length === 1,
    'Seaming opens a Rough item to one modifier',
    `${qualityOf(seamed.item)} with ${seamed.item.mods.length}`
  );

  // Fill it, then prove the cap holds against the thing designed to fill.
  let full = seamed.item;
  for (let i = 0; i < 6; i++) {
    const r = craft(full, CURRENCY_BY_ID.shard_of_making, pool, rng);
    if (r.ok) full = r.item;
  }
  check(
    full.mods.length === 2,
    'and Making cannot push a Seamed item past two',
    `${full.mods.length} modifiers`
  );
  check(
    !craft(full, CURRENCY_BY_ID.shard_of_awakening, pool, rng).ok,
    'nor can Awakening, which is gated to Faceted',
    'Awakening reached a Seamed item'
  );

  const ascended = step(full, 'sigil_of_ascent');
  check(
    ascended.ok &&
      qualityOf(ascended.item) === 'faceted' &&
      ascended.item.mods.length === 3 &&
      full.mods.every((m) => ascended.item.mods.some((k) => k.entryId === m.entryId)),
    'Ascent raises Seamed to Faceted, keeping what was there and adding one',
    `${qualityOf(ascended.item)} with ${ascended.item.mods.length}`
  );

  const cleaved = step(wand(), 'shard_of_cleaving');
  check(
    cleaved.ok && qualityOf(cleaved.item) === 'faceted' && cleaved.item.mods.length === 3,
    'Cleaving skips a rung to Faceted, and stops one short of full',
    `${qualityOf(cleaved.item)} with ${cleaved.item.mods.length}`
  );

  const wiped = step(cleaved.item, 'shard_of_ruin');
  check(
    wiped.ok && qualityOf(wiped.item) === 'rough' && wiped.item.mods.length === 0,
    'Ruin takes it all the way back to Rough — not just empty',
    `${qualityOf(wiped.item)} with ${wiped.item.mods.length}`
  );

  // A ceiling nothing can reach is the same as no ceiling. Prove the top rung
  // is reachable and that it is genuinely the top.
  let top = step(cleaved.item, 'shard_of_awakening').item;
  top = step(top, 'sigil_of_brilliance').item;
  while (hasOpenSlot(top)) {
    const r = craft(top, CURRENCY_BY_ID.shard_of_making, pool, rng);
    if (!r.ok) break;
    top = r.item;
  }
  check(
    qualityOf(top) === 'brilliant' && top.mods.length === 6,
    'and a Brilliant item reaches six',
    `${qualityOf(top)} with ${top.mods.length}`
  );
  check(
    !craft(top, CURRENCY_BY_ID.shard_of_seaming, pool, rng).ok &&
      !craft(top, CURRENCY_BY_ID.sigil_of_brilliance, pool, rng).ok,
    'with nothing left to raise it',
    'a step-up currency applied to a finished item'
  );
}

// ===========================================================================
rule('OPENINGS — does the bench draw exactly what the item can hold?');

// The bench draws one facet per opening, so an opening that is not real is a
// socket you can never fill sitting on screen forever. That is what shipped:
// every base drew its full declared table, so a Seamed item showed six sockets
// under a header that said 0/2.
//
// The invariant is one line — the openings across all slot types add up to the
// item's modifier budget — and it has to hold for every base at every quality,
// because it is the base that decides how the budget gets dealt out.
{
  let mismatched = 0;
  let overDeclared = 0;
  let starved = 0;
  const table: string[] = [];

  for (const base of GEAR_BASES) {
    const row: string[] = [];
    for (const q of QUALITIES) {
      const item = makeGear(base.id, 60);
      item.meta.quality = q.id;

      const alloc = slotAllocation(item);
      const drawn = slotTypes(item).reduce((n, t) => n + alloc[t], 0);
      if (drawn !== modCapacity(item)) mismatched++;

      for (const t of slotTypes(item)) {
        // A base that declares no offence must never be dealt an offence
        // opening — that restriction is the only thing making bases differ.
        if (alloc[t] > declaredCapacity(item, t)) overDeclared++;
      }

      // Balance: with room for two or more, they must not all land on one
      // type while another type the base has sits empty.
      const spread = slotTypes(item).filter((t) => alloc[t] > 0).length;
      const could = slotTypes(item).filter((t) => declaredCapacity(item, t) > 0).length;
      if (drawn >= 2 && spread < Math.min(2, could)) starved++;

      row.push(
        slotTypes(item)
          .filter((t) => alloc[t] > 0)
          .map((t) => `${alloc[t]}${t[0]}`)
          .join('')
          .padEnd(7) || '—'.padEnd(7)
      );
    }
    if (base.kind === 'weapon' && base.id !== 'ash_wand') continue;
    table.push(`  ${base.id.padEnd(13)}${row.join(' ')}`);
  }

  line(`  ${'base'.padEnd(13)}${QUALITIES.map((q) => q.name.padEnd(7)).join(' ')}`);
  for (const r of table) line(r);
  line();

  check(mismatched === 0, 'every base deals out exactly its budget, at every quality',
    `${mismatched} base/quality pairs draw the wrong number of openings`);
  check(overDeclared === 0, 'and never past what the base declares',
    `${overDeclared} slot types were dealt more than the base has`);
  check(starved === 0, 'two openings never both land on the same type',
    `${starved} items put their whole budget on one slot type`);

  // The bench reads capacity, not allocation, and capacity must never hide a
  // modifier the item is already wearing.
  const worn = craft(
    craft(makeGear('boots', 60), CURRENCY_BY_ID.shard_of_cleaving, pool, rng).item,
    CURRENCY_BY_ID.shard_of_awakening,
    pool,
    rng
  ).item;
  check(
    slotTypes(worn).every((t) => slotCapacity(worn, t) >= slotUsed(worn, t)),
    'and a drawn slot always has room for the mod already in it',
    'an item wears a modifier in a slot the bench would not draw'
  );
}

// ===========================================================================
rule('DROPS — does the crystal decide what the map can give you?');

// Tier gates the CEILING, rarity only gates how often you reach it. Without
// the cap a rarity-stacked Tier 1 would out-drop an honest Tier 4, which is
// the ladder skipped in one lucky kill.
{
  const hero = makeCharacter(starterLoadout(new Rng(7), 30, 'faceted'), 'strike');
  const seen = new Map<number, Set<string>>();
  const counts = new Map<number, number>();

  for (const tier of [0, 1, 3, 5]) {
    const qualities = new Set<string>();
    let items = 0;
    for (const seed of [11, 29, 47]) {
      const crystal = craft(
        makeCrystal(Math.max(1, tier)),
        CURRENCY_BY_ID.shard_of_cleaving,
        pool,
        rng
      ).item;
      const sim = new RunSim(crystal, hero, new Rng(seed * 31 + tier), { dropTier: tier });
      const f = runToCompletion(sim, 400);
      for (const item of f.loot.items) {
        qualities.add(qualityOf(item));
        items++;
      }
    }
    seen.set(tier, qualities);
    counts.set(tier, items);
    line(`  tier ${tier}: ${items} pieces — ${[...qualities].sort().join(', ') || 'none'}`);
  }

  check(
    [...counts.values()].every((n) => n > 0),
    'every tier drops gear at all',
    [...counts].map(([t, n]) => `T${t}=${n}`).join(' ')
  );
  const low = new Set([...(seen.get(0) ?? []), ...(seen.get(1) ?? [])]);
  check(
    !low.has('faceted') && !low.has('brilliant'),
    'the Fissure and Tier 1 cannot produce a Faceted piece',
    [...low].join(', ')
  );
  check(
    (seen.get(5)?.has('faceted') || seen.get(5)?.has('brilliant')) === true,
    'and Tier 5 can',
    [...(seen.get(5) ?? [])].join(', ')
  );
}

// ===========================================================================
rule('CARRY LIMIT — where does loot go when the bag is full?');

// The dock stopped scrolling, which turned capacity into a real rule. The
// path that matters is the one you only hit after a long session: a full bag
// on a cleared run. Silently dropping the item there would read as a bug, and
// nothing would teach you that the fix was to clear some space — so every
// caller reports what addItem did with it.
{
  const game = createGame('fresh');
  const fill = (kind: 'crystal' | 'gear', n: number) => {
    for (let i = 0; i < n; i++) {
      addItem(game, kind === 'crystal' ? makeCrystal(1) : makeGear('wand_ash', 1));
    }
  };

  fill('crystal', CARRY.crystal);
  check(
    carryRoom(game, 'crystal') === 0 && carryRoom(game, 'gear') === CARRY.gear,
    'filling one bag leaves the other alone',
    `crystal room ${carryRoom(game, 'crystal')}, gear room ${carryRoom(game, 'gear')}`
  );

  const overflow = makeCrystal(2);
  check(
    addItem(game, overflow) === 'stashed' && game.stash.includes(overflow),
    'a full bag sends the next one to the stash',
    'overflow did not reach the stash'
  );

  // Fill the stash too, and the next one has genuinely nowhere to go.
  while (stashRoom(game) > 0) addItem(game, makeCrystal(1));
  check(
    addItem(game, makeCrystal(3)) === 'lost',
    'a full stash on top of a full bag loses it — and says so',
    'the item went somewhere it should not have'
  );

  // Buying space is the way out, and it is priced to compete with a crystal.
  grant(game.wallet, 'fragment', 1000);
  const before = game.stashSlots;
  const first = stashUpgradeCost(before)!;
  buyStashSpace(game);
  const second = stashUpgradeCost(game.stashSlots)!;
  line(`  stash upgrades: ${first} then ${second} fragments (T5 crystal is ${crystalCost(5)})`);
  check(
    game.stashSlots > before && second > first,
    'buying space works and gets steeper',
    `${before} -> ${game.stashSlots}, ${first} then ${second}`
  );
  check(
    addItem(game, makeCrystal(4)) === 'stashed',
    'and the bought space is usable',
    'the new slots did not take an item'
  );

  // Taking gear off is a net addition to the bag, so it has to refuse rather
  // than let addItem fall through to the stash. A helmet that vanishes on
  // unequip is the worst possible reading of a carry limit.
  const worn = createGame('dev');
  worn.inventory = worn.inventory.filter((i) => i.kind !== 'gear');
  fillGear(worn);
  const slot = Object.keys(worn.character.equipment)[0];
  check(
    slot !== undefined && !unequipItem(worn, slot),
    'unequipping refuses rather than losing the item',
    'something came off with nowhere to go'
  );
}

function fillGear(game: ReturnType<typeof createGame>): void {
  while (carryRoom(game, 'gear') > 0) addItem(game, makeGear('wand_ash', 1));
}

// ===========================================================================
rule('SPRITES — is the pixel art well formed?');

// The sprites are hand-authored character grids. A row one character short
// does not fail loudly, it silently truncates the figure; one character long
// draws outside the cell. Both look like "the art is slightly off" rather than
// like the typo they are, which is the worst way for a bug to present. Checked
// here because building the sheet needs a canvas and this does not.
{
  const problems = [
    ...wellFormed(HERO_FRAMES).map((b) => `hero ${b}`),
    ...Object.entries(MONSTER_FRAMES).flatMap(([name, frames]) =>
      wellFormed(frames).map((b) => `${name} ${b}`)
    ),
  ];
  const sheets = 1 + Object.keys(MONSTER_FRAMES).length;
  check(
    problems.length === 0,
    `all ${sheets} sprites are 16x16 on every frame`,
    problems.join('; ')
  );

  // Two frames that are identical are not a walk cycle. Cheap to write, and
  // exactly the thing you would not notice from a still.
  const same = [
    ['hero', HERO_FRAMES] as const,
    ...Object.entries(MONSTER_FRAMES).map((e) => e as readonly [string, string[][]]),
  ].filter(([, frames]) => frames[0].join('') === frames[1].join(''));
  check(
    same.length === 0,
    'and every one actually animates',
    same.map(([n]) => n).join(', ')
  );
}

// ===========================================================================
rule('MAP SHAPE — do chambers, passages and veins survive generation?');

// The renderer colours a corridor differently from a room, which only works
// if the generator actually labels them. Two things can quietly break that:
// a corridor carved THROUGH a room relabelling its middle, and anything in
// the sim testing `=== FLOOR` instead of `!== WALL` — which would leave the
// hero unable to walk down a passage. Neither is visible from a screenshot.
{
  let rooms = 0;
  let tunnels = 0;
  let unwalkable = 0;
  let roomsCutByCorridors = 0;
  const veins: number[] = [];

  for (const tier of [1, 3, 6]) {
    const map = generateMap(makeCrystal(tier), new Rng(1000 + tier));
    veins.push(map.vein);
    const { grid } = map;

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.at(x, y);
        if (tile === WALL) continue;
        if (tile === TUNNEL) tunnels++;
        if (tile === FLOOR) rooms++;
        if (!grid.walkable(x, y)) unwalkable++;
      }
    }

    for (const room of map.rooms) {
      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
          if (grid.at(x, y) === TUNNEL) roomsCutByCorridors++;
        }
      }
    }
  }

  line(`  ${rooms} chamber tiles, ${tunnels} passage tiles across three maps`);
  check(rooms > 0 && tunnels > 0, 'maps have both chambers and passages', 'one kind is missing');
  check(unwalkable === 0, 'every carved tile is walkable', `${unwalkable} carved tiles block the hero`);
  check(
    roomsCutByCorridors === 0,
    'a corridor never relabels the room it joins',
    `${roomsCutByCorridors} room tiles marked as passage`
  );
  check(
    veins.join(',') === '1,3,6',
    'the vein tracks the crystal you socketed',
    `veins were ${veins.join(', ')}`
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
  const ctx: GuideCtx = { view: 'run', phase: 'menu', top: null, picking: null };
  let step = 0;
  const trace: string[] = [];
  const targetless: string[] = [];
  const MARKUP = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');

  /** Every surface a step could be pointing at when it fires. */
  const SITUATIONS: GuideCtx[] = [
    { view: 'run', phase: 'menu', top: null, picking: null },
    { view: 'run', phase: 'running', top: null, picking: null },
    { view: 'run', phase: 'results', top: null, picking: null },
    { view: 'craft', phase: 'results', top: 'craft', picking: null },
    { view: 'craft', phase: 'results', top: 'shop', picking: null },
    { view: 'run', phase: 'results', top: 'shop', picking: null },
    { view: 'run', phase: 'results', top: 'stash', picking: null },
    { view: 'run', phase: 'results', top: 'sheet', picking: null },
    // The sheet with a slot already chosen. A distinct situation, because it
    // is the one where the next click leaves this window for the dock.
    { view: 'run', phase: 'results', top: 'sheet', picking: 'weapon' },
    { view: 'run', phase: 'menu', top: 'skills', picking: null },
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
    () => { runRecipe(game.wallet, 'make_shard_of_seaming'); },
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
      const result = craft(wand, CURRENCY_BY_ID.shard_of_seaming, pool, rng);
      if (result.ok) replaceItem(game, result.item);
    },
    () => { ctx.top = 'shop'; runRecipe(game.wallet, 'make_shard_of_making'); },
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
rule('TIER LADDER — which tier does each grade of gear survive?');

// Several seeds per cell — one run is far too noisy to tune against, and a
// ladder you can't trust is worse than no ladder.
const LADDER_SEEDS = [3, 17, 41, 58, 90];

// A grid, not a line. The question was never "where does gear fall over" — it
// was always "where does THIS gear fall over", and until quality existed there
// was only one answer to give. Reading down a column tells you what a tier
// demands; reading across a row tells you what a grade of gear buys you.
const GRADES: Quality[] = ['rough', 'seamed', 'faceted', 'brilliant'];

line('  gear         T1     T2     T3     T4     T5     T6');
for (const grade of GRADES) {
  const kit = starterLoadout(new Rng(7), 30, grade);
  const cells: string[] = [];

  for (const t of CRYSTAL_TIERS) {
    let cleared = 0;
    for (const seed of LADDER_SEEDS) {
      const socketed = craft(
        makeCrystal(t.tier),
        CURRENCY_BY_ID.shard_of_cleaving,
        pool,
        rng
      ).item;
      const sim = new RunSim(
        socketed,
        makeCharacter(kit, 'strike'),
        new Rng(900 + seed * 7 + t.tier)
      );
      const f = runToCompletion(sim, 400);
      if (f.status === 'cleared') cleared++;
    }
    cells.push(`${cleared}/${LADDER_SEEDS.length}`.padStart(6));
  }

  const mods = loadoutMods(kit);
  line(`  ${grade.padEnd(10)}${cells.join(' ')}   (${mods} mods worn)`);
}
line();
// Deliberately describes what to look FOR rather than asserting a result — a
// hardcoded verdict goes stale the moment the numbers move and then the
// harness is confidently lying to you.
line('Read down a column to see what a tier demands, across a row to see what');
line('a grade of gear buys. The design wants roughly a diagonal: Rough gear');
line('surviving the Fissure and little else, Seamed clearing T1-T2, Faceted');
line('reaching T4, and T5-T6 needing more than gear alone can give.');
line('A full row of 5/5 means that grade has nothing left to chase; a full');
line('column of 0/5 means that tier is unreachable rather than hard.');

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
