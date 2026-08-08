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
  ARMOUR_BASES,
  ARMOUR_FAMILIES,
  BASE_TIER_ILVL,
  EQUIP_SLOTS,
  GEAR_BASES,
  GEAR_BASE_BY_ID,
  QUALITIES,
  armourBudget,
  implicitSpend,
  RECIPES,
  SKILLS,
  SKILL_BY_ID,
} from './data';
import {
  balance,
  crystalCost,
  grant,
  makeCrystal,
  makeGear,
  runRecipe,
} from './economy';
import { hasArmourArt } from './ui/icons';
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
import { characterStats, convertedType, treeGrants } from './sim/stats';
import { SKILL_BEHAVIOURS } from './sim/skills';
import { GRANT_BY_ID, STATS, behaviourReads, mergeGrants } from './sim/grants';
import { SPUR_COUNT, SPUR_STEPS, TRUNK_NODES } from './trees/layout';
import {
  BUILT_TREES,
  CENTRE,
  MAX_TREE_POINTS,
  canAllocate,
  canDeallocate,
  neighboursOf,
  nodeById,
  treeFor,
} from './skills-tree';
import { makeCharacter, skillProgress, xpToNext } from './sim/character';
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
import { heal, readSave } from './game/save';
import type { Item, Quality, RolledMod, Wallet } from './types';

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

let gear = makeGear('bulwark_body_t3', 55, 'Runeplate');
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
    craft(makeGear('bulwark_boots_t3', 60), CURRENCY_BY_ID.shard_of_cleaving, pool, rng).item,
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
rule('ARMOUR SETS — is a hybrid a redistribution or a discount?');

// Twelve families over one budget. A hybrid borrows from two archetypes, and
// the only thing stopping it borrowing the good half of each is that every
// family spends the SAME points at the same exchange rate. Read the implicits
// back into points and the spread across families must be rounding and nothing
// else — otherwise "hybrid" is just the correct answer.
{
  let overspent = 0;
  let worstSpread = 0;
  const rows: string[] = [];

  for (const kind of ['helmet', 'body', 'gloves', 'boots']) {
    for (let tier = 1; tier <= 3; tier++) {
      const budget = armourBudget(kind, tier);
      const spends = ARMOUR_FAMILIES.map((f) => {
        const base = GEAR_BASE_BY_ID[`${f.id}_${kind}_t${tier}`];
        return { id: f.id, points: base ? implicitSpend(base) : -1 };
      });
      for (const s of spends) {
        // One line rounds by under a point, and no family authors more than
        // four, so anything past this is a mix that does not sum to one.
        if (Math.abs(s.points - budget) > 1) overspent++;
      }
      const spread = Math.max(...spends.map((s) => s.points)) - Math.min(...spends.map((s) => s.points));
      worstSpread = Math.max(worstSpread, spread);
      if (tier === 3 && kind === 'body') {
        for (const f of ARMOUR_FAMILIES) {
          const b = GEAR_BASE_BY_ID[`${f.id}_${kind}_t${tier}`];
          rows.push(
            `  ${f.id.padEnd(11)}${f.archetypes.join('/').padEnd(13)}` +
              `armour ${String(b?.armour ?? 0).padStart(4)}   ` +
              (b?.implicit ?? []).map((s) => `${s.range[0]} ${s.stat}`).join(', ')
          );
        }
      }
    }
  }
  for (const r of rows) line(r);
  line();

  check(overspent === 0, 'every family spends its whole budget and no more',
    `${overspent} family/slot/rung combinations are off budget`);
  check(worstSpread <= 1, 'so no family out-earns another at the same slot and rung',
    `the widest spread between two families is ${worstSpread.toFixed(2)} points`);

  // The archetypes have to still MEAN something. A table that balances
  // perfectly but puts the mage in plate is balanced mush.
  const rating = (id: string) => GEAR_BASE_BY_ID[`${id}_body_t3`]?.armour ?? 0;
  const worst = (ids: string[]) => Math.min(...ids.map(rating));
  const best = (ids: string[]) => Math.max(...ids.map(rating));
  const melee = ['bulwark', 'vanguard'];
  const rogue = ['shadow', 'skirmisher'];
  const mage = ['arcanist', 'oracle'];
  check(
    worst(melee) > best(rogue) && worst(rogue) > best(mage),
    'melee wears the most armour, then rogue, then mage',
    `melee ${worst(melee)} · rogue ${best(rogue)}/${worst(rogue)} · mage ${best(mage)}`
  );
  check(
    ['templar', 'runeguard', 'raider', 'duelist'].every(
      (id) => rating(id) < best(melee) && rating(id) > best(mage)
    ) && ['nightweave', 'whisper'].every((id) => rating(id) < worst(rogue)),
    'and every hybrid sits between the archetypes it borrows from',
    ['templar', 'runeguard', 'nightweave', 'whisper', 'raider', 'duelist']
      .map((id) => `${id} ${rating(id)}`).join(' · ')
  );
  check(
    ARMOUR_BASES.every((b) => (b.armour ?? 0) > 0)
      && ARMOUR_BASES.every((b) => Number.isInteger(b.armour)),
    'every armour base carries a whole-number rating',
    'a base has no rating, or one with a fractional tail'
  );
  check(
    ARMOUR_BASES.every((b) =>
      (b.implicit ?? []).every((s) => Number((s.range[0] * 10).toFixed(0)) % 1 === 0)
    ),
    'and no implicit reaches the player with a floating-point tail',
    ARMOUR_BASES.flatMap((b) => (b.implicit ?? []).map((s) => s.range[0]))
      .filter((v) => String(v).length > 5).slice(0, 3).join(' ')
  );
  check(
    ARMOUR_FAMILIES.every((f) => Math.abs(Object.values(f.mix).reduce((a, b) => a + b, 0) - 1) < 1e-9),
    'every family splits exactly one budget, never more',
    'a family mix does not sum to 1'
  );

  // A family with no art of its own falls through to the plain body sprite, so
  // a whole set would wear plate silently. Nothing on screen would say so.
  const artless = ARMOUR_BASES.filter(
    (b) => !hasArmourArt(b.family ?? '', b.kind)
  ).map((b) => b.id);
  check(artless.length === 0, 'every armour family has its own art, in every slot',
    `${artless.length} bases fall through to the generic sprite: ${artless.slice(0, 3).join(', ')}`);
  check(
    new Set(ARMOUR_FAMILIES.map((f) => f.id)).size === ARMOUR_FAMILIES.length
      && new Set(ARMOUR_BASES.map((b) => b.art)).size === ARMOUR_FAMILIES.length * 4,
    'and no two family/slot pairs share an art key',
    'two bases would draw the same icon'
  );

  // A rung is only progression if the map has to be deep enough to hand it over.
  const rungs = [1, 2, 3].map((t) => GEAR_BASE_BY_ID[`bulwark_body_t${t}`]);
  check(
    rungs.every((b, i) => b && (b.ilvl ?? 1) === BASE_TIER_ILVL[i]) &&
      rungs.every((b, i) => i === 0 || implicitSpend(b) > implicitSpend(rungs[i - 1])),
    'and each rung is gated deeper than the one below it, and worth more',
    rungs.map((b) => `${b?.ilvl}:${implicitSpend(b).toFixed(0)}`).join(' ')
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
      addItem(game, kind === 'crystal' ? makeCrystal(1) : makeGear('ash_wand', 1));
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
  while (carryRoom(game, 'gear') > 0) addItem(game, makeGear('ash_wand', 1));
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
    // Screens the opening never sends you to. Reachable anyway now that only
    // spending is locked, so every step has to know the way back out of them.
    { view: 'run', phase: 'menu', top: 'history', picking: null },
    { view: 'run', phase: 'menu', top: 'save', picking: null },
    { view: 'run', phase: 'running', top: 'save', picking: null },
    { view: 'craft', phase: 'running', top: 'craft', picking: null },
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

  // Existing is not the same as reachable. The header and the Fissure panel sit
  // UNDER every popup, so a step still naming one of them while something is
  // open is pointing through a modal at a button nobody can click. That is the
  // shape of every hard lock this opening has had, and now only spending is
  // switched off, any screen can be the one in the way.
  const COVERED = new Set([
    'run-launch',
    'run-again',
    'run-loot',
    'dev-fresh',
    'dev-kit',
    ...['craft', 'shop', 'stash', 'character', 'skills', 'history', 'save'].map(
      (s) => `open-${s}`
    ),
  ]);
  const unreachable: string[] = [];
  for (const step of TUTORIAL_STEPS) {
    for (const ctx of SITUATIONS) {
      if (ctx.top === null && ctx.view !== 'craft') continue;
      const id = typeof step.target === 'function' ? step.target(ctx) : step.target;
      if (COVERED.has(id)) {
        unreachable.push(`${step.id} -> #${id} with ${ctx.top ?? ctx.view} open`);
      }
    }
  }
  check(
    unreachable.length === 0,
    'and never at one a popup is covering',
    `unreachable: ${unreachable.join(', ')}`
  );

  // The other half of a dead end: a step with nothing lit that nothing can
  // finish. Only 'watch' has no ring, and only while a run is actually going.
  const unlit: string[] = [];
  for (const step of TUTORIAL_STEPS) {
    for (const ctx of SITUATIONS) {
      const wants = typeof step.ring === 'function' ? step.ring(ctx) : step.ring !== false;
      if (!wants && ctx.phase !== 'running') unlit.push(`${step.id} with phase ${ctx.phase}`);
    }
  }
  check(
    unlit.length === 0,
    'and lights something whenever the sim is not doing the work',
    `nothing to click: ${unlit.join(', ')}`
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
rule('THE WEB — is every node reachable, and is anything a trap?');

// Two questions, and the second is the one that bites. A hundred-node web can
// look fine and still contain a node nobody can ever buy: too far out to
// afford, or gated behind more points than the cap allows. Neither is visible
// by looking at it.
for (const tree of BUILT_TREES) {
  const skillId = tree.spec.skillId;
  const nodes = tree.nodes;
  const notables = nodes.filter((n) => n.kind === 'notable');
  const branchOf = tree.branchOf;
  const needs = tree.spec.needs;

  line(`  ${skillId}: ${nodes.length} nodes, ${notables.length} notable, ${MAX_TREE_POINTS} points`);

  // Derived from the spec rather than written down, so a twig that quietly
  // lost its minors is a failure here instead of a shorter walk nobody sees.
  const expected =
    TRUNK_NODES +
    SPUR_COUNT * SPUR_STEPS +
    tree.spec.branches.reduce(
      (sum, b) => sum + 1 + b.twigs.reduce((t, twig) => t + twig.minors + 1, 0),
      0
    );
  check(nodes.length === expected, 'every node the spec asks for is built', `${nodes.length} of ${expected}`);
  check(new Set(nodes.map((n) => n.id)).size === nodes.length, 'and no id is used twice', 'duplicate ids');

  // Every switch a node hands the sim must be one the sim reads, AND one this
  // skill's own delivery reads. A tree asking a cloud to pierce is a point
  // spent on nothing; a typo is the same thing without a name.
  const behaviour = SKILL_BY_ID[skillId]?.behaviour ?? '';
  const unread: string[] = [];
  for (const n of nodes) {
    const keys = [
      ...Object.keys(n.grants ?? {}),
      ...(n.choices ?? []).flatMap((c) => Object.keys(c.grants ?? {})),
    ];
    for (const key of keys) {
      const def = GRANT_BY_ID[key];
      if (!def) unread.push(`${n.id}: ${key} is not a declared grant`);
      else if (!def.reads.includes(STATS) && !behaviourReads(behaviour, key)) {
        unread.push(`${n.id}: ${behaviour} never reads ${key}`);
      }
    }
  }
  check(unread.length === 0, 'every grant is one this skill actually reads', unread.join(', '));

  // Two nodes handing out the same switch must say how it stacks. Left to
  // `replace`, the second one silently overwrites the first and is a point
  // spent on nothing — invisible on the sheet and invisible in the tooltip.
  const handed = new Map<string, number>();
  for (const n of nodes) {
    for (const key of Object.keys(n.grants ?? {})) handed.set(key, (handed.get(key) ?? 0) + 1);
  }
  const lossy = [...handed]
    .filter(([key, count]) => count > 1 && !GRANT_BY_ID[key]?.merge)
    .map(([key, count]) => `${key} on ${count} nodes`);
  check(lossy.length === 0, 'and anything granted twice says how it stacks', lossy.join(', '));

  // Cost to reach each node: how many nodes you must buy, this one included.
  const distance = new Map<string, number>();
  let edge = nodes.filter((n) => neighboursOf(skillId, n.id).has(CENTRE));
  let step = 1;
  for (const n of edge) distance.set(n.id, step);
  while (edge.length) {
    const next: typeof edge = [];
    step++;
    for (const at of edge) {
      for (const id of neighboursOf(skillId, at.id)) {
        if (id === CENTRE || distance.has(id)) continue;
        const node = nodes.find((n) => n.id === id);
        if (!node) continue;
        distance.set(id, step);
        next.push(node);
      }
    }
    edge = next;
  }

  const orphans = nodes.filter((n) => !distance.has(n.id));
  check(orphans.length === 0, 'every node connects to the middle', orphans.map((n) => n.id).join(', '));

  // Distance is the whole price now: what a node costs is the walk to it.
  const cost = (n: (typeof nodes)[number]) => distance.get(n.id) ?? Infinity;
  const unaffordable = nodes.filter((n) => cost(n) > MAX_TREE_POINTS);
  check(
    unaffordable.length === 0,
    'and every node is affordable inside the cap',
    unaffordable.map((n) => `${n.id} costs ${cost(n)}`).join(', ')
  );

  // Distance is the only price, so this is what stops the web being a shopping
  // list: a build can walk to two of the far tips and never to three.
  const deepest = Math.max(...nodes.map((n) => cost(n)));
  const tips = Math.floor(MAX_TREE_POINTS / deepest);
  line(`  the deepest node costs ${deepest} of ${MAX_TREE_POINTS} — ${tips} such walks fit`);
  check(tips <= 2, 'the far side is a real commitment', `${tips} deep walks fit in the budget`);

  const first = nodes.filter((n) => canAllocate(skillId, n.id, []));
  check(first.length === 3, 'three ways in, not one per node', String(first.length));
  check(
    first.every((n) => n.kind === 'minor'),
    'and no notable is a first move',
    first.filter((n) => n.kind === 'notable').map((n) => n.id).join(', ')
  );

  // The point of the shape: a branch hangs off one node, and that node is what
  // makes the rest of it worth anything. If any of it can be reached another
  // way, you can spend a point on something that does nothing.
  const leaks: string[] = [];
  for (const [branch, enabler] of Object.entries(tree.enablers)) {
    const reached = new Set<string>();
    let edge = nodes
      .filter((n) => n.id !== enabler && neighboursOf(skillId, n.id).has(CENTRE))
      .map((n) => n.id);
    for (const id of edge) reached.add(id);
    while (edge.length) {
      const next: string[] = [];
      for (const id of edge) {
        for (const other of neighboursOf(skillId, id)) {
          if (other === CENTRE || other === enabler || reached.has(other)) continue;
          reached.add(other);
          next.push(other);
        }
      }
      edge = next;
    }
    for (const n of nodes) {
      if (branchOf[n.id] === branch && n.id !== enabler && reached.has(n.id)) {
        leaks.push(`${n.id} without ${enabler}`);
      }
    }
  }
  check(leaks.length === 0, 'a branch can only be entered through its own node', leaks.join(', '));

  // And the reason that matters: a line that needs a grant to do anything is
  // only ever inside the branch that grants it. This is the check that stops
  // Area of Effect appearing where nothing bursts.
  const dead: string[] = [];
  for (const n of nodes) {
    const keys = [
      ...(n.stats ?? []).map((line) => line.stat),
      ...Object.keys(n.grants ?? {}),
    ];
    for (const key of keys) {
      const enabler = needs[key];
      if (!enabler || n.id === enabler) continue;
      if (branchOf[n.id] !== branchOf[enabler]) {
        dead.push(`${n.id} has ${key}, which needs ${enabler}`);
      }
    }
  }
  check(dead.length === 0, 'and nothing conditional sits outside its branch', dead.join(', '));

  // Every notable past the entry one is a DEAD END. A notable with something
  // growing out of it is a node you walk THROUGH, which is how a branch turns
  // back into a corridor of things you did not want.
  const entries = new Set(Object.values(tree.enablers));
  const throughs = notables.filter(
    (n) =>
      branchOf[n.id] && !entries.has(n.id) && neighboursOf(skillId, n.id).size !== 1
  );
  check(throughs.length === 0, 'every notable past the entry is a dead end', throughs.map((n) => n.id).join(', '));

  // And a twig is a chain, so the only way to a notable is the run of minors in
  // front of it. Counting the links is the blunt version of that: a web with a
  // way round everything is a web you beeline across.
  const edges = new Set<string>();
  for (const n of nodes) {
    for (const other of neighboursOf(skillId, n.id)) {
      edges.add([n.id, other].sort().join('|'));
    }
  }
  line(`  ${edges.size} links between ${nodes.length} nodes`);
  check(edges.size <= nodes.length + 14, 'and there are barely more links than nodes', String(edges.size));

  // No line may cross another, and no line may run through a node it does not
  // join. Both read as the same defect on screen — a link that appears to
  // connect two nodes it has nothing to do with — and neither is visible from
  // the data, so the check has to be geometric.
  {
    const at = new Map<string, { x: number; y: number }>(
      nodes.map((n) => [n.id, { x: n.x, y: n.y }])
    );
    at.set(CENTRE, { x: 0, y: 0 });
    const pairs = [...edges].map((key) => key.split('|') as [string, string]);
    type P = { x: number; y: number };
    const side = (a: P, b: P, c: P) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

    const crossed: string[] = [];
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const [a1, b1] = pairs[i];
        const [a2, b2] = pairs[j];
        // Sharing an end is a corner, not a crossing.
        if (a1 === a2 || a1 === b2 || b1 === a2 || b1 === b2) continue;
        const [p1, q1, p2, q2] = [at.get(a1)!, at.get(b1)!, at.get(a2)!, at.get(b2)!];
        const d1 = side(p2, q2, p1);
        const d2 = side(p2, q2, q1);
        const d3 = side(p1, q1, p2);
        const d4 = side(p1, q1, q2);
        if (d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0) crossed.push(`${a1}~${b1} over ${a2}~${b2}`);
      }
    }
    check(crossed.length === 0, 'no link crosses another', crossed.join(', '));

    // Roughly a notable's radius: closer than this and the line is drawn under
    // the stud, which reads as a connection to it.
    const CLEAR = 0.45;
    const grazed: string[] = [];
    for (const [a, b] of pairs) {
      const p = at.get(a)!;
      const q = at.get(b)!;
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const span = dx * dx + dy * dy;
      for (const [id, n] of at) {
        if (id === a || id === b) continue;
        const t = span === 0 ? 0 : Math.max(0, Math.min(1, ((n.x - p.x) * dx + (n.y - p.y) * dy) / span));
        if (Math.hypot(n.x - (p.x + t * dx), n.y - (p.y + t * dy)) < CLEAR) {
          grazed.push(`${a}~${b} through ${id}`);
        }
      }
    }
    check(grazed.length === 0, 'and none runs through a node it does not join', grazed.join(', '));
  }

  // The trunk is the opposite promise: everything on it works for any build.
  const trunk = nodes.filter((n) => !branchOf[n.id]);
  line(`  ${trunk.length} nodes on the trunk, ${nodes.length - trunk.length} out on branches`);
  const conditional = trunk.filter((n) =>
    [...(n.stats ?? []).map((l) => l.stat), ...Object.keys(n.grants ?? {})].some((k) => needs[k])
  );
  check(conditional.length === 0, 'the trunk is useful whatever you build', conditional.map((n) => n.id).join(', '));

  // Getting anywhere means buying road. If the walk to the deepest notable were
  // mostly notables, the minors would be decoration again.
  const furthest = notables.reduce((a, b) =>
    (distance.get(a.id) ?? 0) >= (distance.get(b.id) ?? 0) ? a : b
  );
  const outward = distance.get(furthest.id) ?? 0;
  line(`  the furthest notable is ${furthest.name}, ${outward} nodes out`);
  check(outward >= 8, 'the far notables are a long walk', String(outward));

  // Refunding must never strand anything, and must always be possible for the
  // last thing you bought — a tree you can walk into and not out of is worse
  // than one with no refunds at all.
  const walk: string[] = [];
  const spendRng = new Rng(4242);
  while (walk.length < MAX_TREE_POINTS) {
    const open = nodes.filter((n) => canAllocate(skillId, n.id, walk));
    if (open.length === 0) break;
    walk.push(spendRng.pick(open)!.id);
  }
  check(walk.length === MAX_TREE_POINTS, 'thirty points can always be spent', String(walk.length));

  // And unwound again, all the way to nothing. A build you can walk into and
  // not out of is worse than one with no refunds at all — and the refund rule
  // is a reachability test, which is exactly the kind of rule that can be
  // correct for one node and wrong for a whole allocation.
  let held = [...walk];
  while (held.length > 0) {
    const loose = held.find((id) => canDeallocate(skillId, id, held));
    if (!loose) break;
    held = held.filter((id) => id !== loose);
  }
  check(held.length === 0, 'and every one of them refunded again', `${held.length} stuck`);
}

// ===========================================================================
rule('FIREBALL — do the notables actually change the cast?');

// The tree's whole claim is that it changes how the skill WORKS, which no
// stat sheet can show. So this fires the behaviour directly at a fixed set of
// dummies and counts who got hit.
//
// The dummies matter as much as the grants. There is one enemy straight ahead,
// one behind it in line, one off to the side, and one across the room — and
// the one across the room is the whole reason this section exists. The old
// fork node hit "the nearest other enemy" with no distance limit at all, which
// on an open map is a talent that reaches through walls.
{
  const dummy = (x: number, y: number, life = 1e6) =>
    ({
      x, y, life, dead: false, ailments: [] as unknown[],
      stats: { maxLife: 1e6, attacksPerSecond: 1 },
    }) as any;

  const cast = (grants: Record<string, unknown>, crit = false) => {
    const user = dummy(0, 0);
    const ahead = dummy(3, 0);
    const behind = dummy(5.5, 0);
    const beside = dummy(3, 2.4);
    const across = dummy(24, 0);
    const enemies = [ahead, behind, beside, across];

    const hits: Array<{ who: any; multiplier: number }> = [];
    const burns: Array<{ who: any; seconds: number }> = [];

    SKILL_BEHAVIOURS.projectile({
      skill: SKILL_BY_ID.fireball,
      user, primary: ahead, enemies,
      rng: new Rng(9), grants, crit, castIndex: 0,
      hit: (who: any, multiplier: number) => hits.push({ who, multiplier }),
      ailment: (who: any, _m: number, seconds: number) => burns.push({ who, seconds }),
      areaRadius: (base: number) => base,
      vfx: () => {},
    } as any);

    const name = (e: any) =>
      e === ahead ? 'ahead' : e === behind ? 'behind' : e === beside ? 'beside' : 'across';
    return { hits, burns, names: hits.map((h) => name(h.who)) };
  };

  const bare = cast({});
  line(`  bare               → ${bare.names.join(', ')}`);
  check(bare.names.join() === 'ahead', 'bare Fireball hits one thing', bare.names.join());

  const chained = cast({ chains: 3 });
  line(`  chains 3           → ${chained.names.join(', ')}`);
  check(
    !chained.names.includes('across'),
    'a leap cannot cross the room',
    chained.names.join()
  );
  check(chained.names.length > 1, 'but it does leap', chained.names.join());

  const spread = cast({ extraTargets: 3 });
  line(`  extraTargets 3     → ${spread.names.join(', ')}`);
  check(
    !spread.names.includes('across'),
    'nor can an extra target',
    spread.names.join()
  );

  const pierced = cast({ pierce: 2 });
  line(`  pierce 2           → ${pierced.names.join(', ')}`);
  check(
    pierced.names.includes('behind'),
    'pierce carries on through the one in front',
    pierced.names.join()
  );
  check(
    !pierced.names.includes('beside'),
    'and only through what is actually in the way',
    pierced.names.join()
  );

  const burst = cast({ explode: { radius: 2.6, multiplier: 0.55 } });
  line(`  explode            → ${burst.names.join(', ')}`);
  check(
    burst.names.includes('beside'),
    'a burst catches what the shot did not',
    burst.names.join()
  );

  // No target may be hit twice by one cast, whatever combination is on. This
  // is what stops pierce, chain and spread from all piling onto the same
  // three enemies and reading as raw damage instead of as coverage.
  const everything = cast({ chains: 3, extraTargets: 3, pierce: 2 });
  line(`  all three          → ${everything.names.join(', ')}`);
  const seen = new Set(everything.hits.map((h) => h.who));
  check(
    seen.size === everything.hits.length,
    'nothing is hit twice by one cast',
    `${everything.hits.length} hits on ${seen.size} enemies`
  );

  // Kindling: the crit becomes a burn. The suppression of the crit itself
  // lives in the sim, so what is checkable here is that the burn lands.
  const kindled = cast({ critAilment: { multiplier: 2.6, seconds: 4 } }, true);
  check(kindled.burns.length === 1, 'a Kindling crit sets the target alight', String(kindled.burns.length));
  const uncrit = cast({ critAilment: { multiplier: 2.6, seconds: 4 } }, false);
  check(uncrit.burns.length === 0, 'and a normal hit does not', String(uncrit.burns.length));
  const longer = cast({ critAilment: { multiplier: 2.6, seconds: 4 }, ailmentDuration: 1.6 }, true);
  check(
    longer.burns[0].seconds > kindled.burns[0].seconds,
    'Slow Burn lengthens it',
    `${longer.burns[0]?.seconds} vs ${kindled.burns[0]?.seconds}`
  );

  // Overload counts casts, so the fifth one is the one that pays.
  const overload = { everyNth: { n: 5, multiplier: 3 } };
  const early = cast(overload).hits[0].multiplier;
  line(`  overload cast 1    → x${early}`);
  check(early === 1, 'the first cast is ordinary', String(early));
}

// ===========================================================================
rule('EVERY TREE — does every notable actually change the cast?');

// The same promise `npm run mods` makes about modifiers, made about talents.
// A notable that grants a switch nothing reads is invisible: it prints a nice
// line, costs a point, and changes nothing about the fight. The only way to
// know is to fire the behaviour twice and compare what came out.
{
  const dummy = (x: number, y: number, life: number) =>
    ({
      x, y, life, dead: false, ailments: [] as unknown[],
      stats: { maxLife: 1e6, attacksPerSecond: 1 },
    }) as any;

  // A dense line of targets, so a radius that grew by any real amount crosses
  // one, plus a few off the axis for anything that is not a straight shot.
  // Every third is frail enough to die to one hit, which is the only way an
  // on-kill burst can be seen at all.
  const field = () => {
    const out: any[] = [];
    for (let i = 0; i < 20; i++) {
      const at = 0.6 + i * 0.35;
      const e = dummy(at, 0, i % 3 === 0 ? 1 : i % 3 === 1 ? 6e4 : 1e6);
      // Some arrive already suffering, which is the ordinary case once your
      // last cast landed — and the only way "more damage to ailing" can show.
      if (i % 4 === 0) e.ailments.push(1);
      out.push(e);
    }
    out.push(dummy(3, 1.1, 1e6), dummy(3, 2.2, 1), dummy(2, 2, 6e4));
    return out;
  };

  /**
   * What one set of grants does, as a string. Cast from several primaries, at
   * several cast counts, critting and not — so a talent that only shows on the
   * fifth cast, or only against something nearly dead, still shows.
   */
  const fingerprint = (skill: any, behave: any, grants: Record<string, unknown>): string => {
    const marks: string[] = [];
    for (const primaryAt of [0, 2, 13, 20]) {
      for (let castIndex = 0; castIndex < 5; castIndex++) {
        for (const crit of [false, true]) {
          const enemies = field();
          const user = dummy(0, 0, 1e6);
          const primary = enemies[primaryAt];
          behave({
            skill, user, primary, enemies,
            rng: new Rng(9), grants, crit, castIndex,
            hit: (who: any, multiplier: number) => {
              marks.push(`h${enemies.indexOf(who)}:${multiplier.toFixed(3)}`);
              who.life -= multiplier * 5e4;
              if (who.life <= 0) who.dead = true;
            },
            ailment: (who: any, m: number, seconds: number, spread: any) => {
              who.ailments.push(1);
              marks.push(`a${enemies.indexOf(who)}:${m.toFixed(3)}:${seconds.toFixed(2)}:${spread?.radius ?? 0}`);
            },
            areaRadius: (base: number) => base,
            vfx: (kind: string, points: any[]) =>
              marks.push(`v${kind}:${points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('|')}`),
          } as any);
        }
      }
    }
    return marks.join(' ');
  };

  for (const tree of BUILT_TREES) {
    const skill = SKILL_BY_ID[tree.spec.skillId];
    const behave = SKILL_BEHAVIOURS[skill.behaviour];
    const inert: string[] = [];

    for (const node of tree.nodes) {
      if (node.kind !== 'notable') continue;
      // A choice node is inert only if EVERY answer is.
      const answers: Array<Record<string, unknown>> = node.choices
        ? node.choices.map((c) => c.grants ?? {})
        : [node.grants ?? {}];

      for (const answer of answers) {
        // The stat layer is checked by the stat pipeline, not by casting.
        const switches = Object.keys(answer).filter(
          (k) => !GRANT_BY_ID[k]?.reads.includes(STATS)
        );
        if (switches.length === 0) continue;

        // Whatever this node needs to do anything, so a burst modifier is
        // measured against a build that already bursts.
        const base: Record<string, unknown> = {};
        for (const key of switches) {
          const enabler = tree.spec.needs[key];
          // Never the node itself: an enabler measured against itself is inert
          // by construction, whatever it does.
          if (!enabler || enabler === node.id) continue;
          const from = nodeById(tree.spec.skillId, enabler)?.grants;
          if (from) mergeGrants(base, from);
        }
        const withIt = mergeGrants({ ...base }, answer);
        if (fingerprint(skill, behave, withIt) === fingerprint(skill, behave, base)) {
          inert.push(`${node.id} (${switches.join(', ')})`);
        }
      }
    }
    check(
      inert.length === 0,
      `${tree.spec.skillId}: every notable that grants a switch changes the cast`,
      inert.join(', ')
    );
  }
}

// ===========================================================================
rule('CONVERSION — one node, two answers, and it moves the tree');

// Conversion is a single node you pick an answer on, not two nodes that fight.
// Two exclusive nodes would mean taking the wrong one first costs a point to
// undo, which taxes finding out what a thing does.
//
// The rule underneath: a converted skill scales off its NEW type only. Keeping
// the old one live as well would be a free second damage stat. What stops that
// being a punishment is that the tree's own fire nodes convert with it.
{
  const node = nodeById('fireball', 'fb_transmutation')!;
  check(!!node.choices && node.choices.length === 2, 'one node offers both elements',
    String(node.choices?.length));
  check(
    treeFor('fireball').filter((n) => n.grants?.convertTree).length === 0,
    'and no node converts on its own',
    'a standalone conversion node still exists'
  );

  const withChoice = (pick: string | null) => {
    const hero = makeCharacter({}, 'fireball');
    hero.skills.fireball = {
      level: 30,
      xp: 0,
      allocated: pick ? ['fb_transmutation'] : [],
      choices: pick ? { fb_transmutation: pick } : {},
    };
    return hero;
  };

  const probe = (type: string): RolledMod => ({
    entryId: 'probe', defId: 'probe', group: 'probe', slot: 'offence',
    name: 'probe', tier: 1, tags: [],
    stats: [{ stat: 'damage', form: 'inc', value: 300, tags: [type] }],
  });

  const wearing = (hero: ReturnType<typeof withChoice>, mod: RolledMod) =>
    characterStats({
      ...hero,
      equipment: { weapon: { ...makeGear('ash_wand', 20), mods: [mod] } },
    }).damage;

  const cold = withChoice('cold');
  const withFire = wearing(cold, probe('fire'));
  const withCold = wearing(cold, probe('cold'));
  line(`  Frostfire, +300% gear fire: ${Math.round(withFire)} · +300% gear cold: ${Math.round(withCold)}`);
  check(withCold > withFire * 1.5, 'picking Cold moves what your gear has to be',
    `${Math.round(withCold)} vs ${Math.round(withFire)}`);

  const storm = withChoice('lightning');
  check(
    wearing(storm, probe('lightning')) > wearing(storm, probe('cold')) * 1.5,
    'and picking Lightning moves it somewhere else',
    'the second answer did nothing'
  );

  const unpicked = makeCharacter({}, 'fireball');
  unpicked.skills.fireball = { level: 30, xp: 0, allocated: ['fb_transmutation'], choices: {} };
  check(
    convertedType(SKILL_BY_ID.fireball, treeGrants(unpicked)) === null,
    'until you answer it, Fireball is still Fire',
    String(convertedType(SKILL_BY_ID.fireball, treeGrants(unpicked)))
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
rule('THE SAVE — does a save survive the game changing under it?');
{
  const game = createGame('dev');
  game.character.skillId = 'fireball';
  const progress = skillProgress(game.character, 'fireball');
  progress.level = 30;

  // A real allocation, walked out from the middle the way a player would.
  const tree = treeFor('fireball');
  for (let i = 0; i < 12; i++) {
    const next = tree.find((n) => canAllocate('fireball', n.id, progress.allocated));
    if (!next) break;
    progress.allocated.push(next.id);
  }
  const walked = progress.allocated.length;
  line(`A build: ${walked} points, ${game.inventory.length} items, ` +
    `${Object.keys(game.wallet).length} kinds of currency`);

  // Now break it the way a month of development would: nodes renamed out from
  // under it, a base deleted, a currency retired, a skill gone.
  const kept = progress.allocated.slice(0, 4);
  progress.allocated = [...kept, 'fb_a_node_that_moved', ...progress.allocated.slice(4)];
  progress.choices = { fb_gone: 'cold', ...progress.choices };
  game.inventory.push({ ...game.inventory[0], id: 'ghost', base: 'base_that_was_renamed' });
  game.wallet.shard_of_something_removed = 9;
  game.character.skillId = 'a_skill_that_was_cut';

  const healed = heal(game);
  line(`Healed: ${healed.points} points refunded, ${healed.items} items dropped, ` +
    `${healed.currencies} currencies dropped, skill replaced: ${healed.skill}`);

  check(
    !game.inventory.some((i) => i.id === 'ghost'),
    'an item whose base no longer exists is dropped',
    'a dropped base is still in the bag'
  );
  check(
    healed.currencies === 1,
    'and so is a currency that no longer exists',
    `dropped ${healed.currencies} currencies`
  );
  check(
    SKILL_BY_ID[game.character.skillId] !== undefined,
    'a cut skill is replaced by a real one',
    game.character.skillId
  );
  check(
    progress.allocated.every((id) => nodeById('fireball', id) !== undefined),
    'every surviving allocation names a node that exists',
    progress.allocated.filter((id) => !nodeById('fireball', id)).join(', ')
  );
  check(
    progress.choices?.fb_gone === undefined,
    'a choice on a node that is gone is forgotten',
    'the choice survived its node'
  );

  // The point of the replay: what is left is not just present, it is BUYABLE
  // in order from the middle — so no node is stranded and no gate is skipped.
  const replay: string[] = [];
  for (let i = 0; i < progress.allocated.length; i++) {
    const next = progress.allocated.find(
      (id) => !replay.includes(id) && canAllocate('fireball', id, replay)
    );
    if (!next) break;
    replay.push(next);
  }
  check(
    replay.length === progress.allocated.length,
    'and what survives is a build you could have walked to',
    `${replay.length} of ${progress.allocated.length}`
  );
  check(
    progress.allocated.length <= walked,
    'healing never hands out points you did not have',
    `${progress.allocated.length} of ${walked}`
  );

  // The sharp case: a node vanishing from the MIDDLE of a path. Everything
  // beyond it has no way home any more and has to come back as points.
  {
    const deep = createGame('dev');
    deep.character.skillId = 'fireball';
    const walk = skillProgress(deep.character, 'fireball');
    walk.level = 30;

    // The route to the furthest notable, one node at a time.
    const far = treeFor('fireball')
      .filter((n) => n.kind === 'notable')
      .sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y))[0];
    const from = new Map<string, string>();
    const queue = [CENTRE];
    for (let i = 0; i < queue.length; i++) {
      for (const next of neighboursOf('fireball', queue[i])) {
        if (from.has(next) || next === CENTRE) continue;
        from.set(next, queue[i]);
        queue.push(next);
      }
    }
    const path: string[] = [];
    for (let at: string | undefined = far.id; at && at !== CENTRE; at = from.get(at)) {
      path.unshift(at);
    }
    walk.allocated = [...path];
    line(`A single path ${path.length} nodes long, out to ${far.name}`);

    // The second node on it is renamed out from under the save.
    walk.allocated[1] = 'fb_this_node_moved';
    const cut = heal(deep);
    check(
      walk.allocated.length === 1,
      'a node lost mid-path takes everything past it with it',
      `${walk.allocated.length} nodes survived, expected 1`
    );
    check(
      cut.points === path.length - 1,
      'and every one of those points comes back',
      `refunded ${cut.points} of ${path.length - 1}`
    );
  }

  // A save from a version that no longer exists is refused, not half-read.
  const stale = JSON.stringify({ ...game, version: 999 });
  check(
    readSave(stale) === null,
    'a save from another format is refused outright',
    'a stale save was read'
  );
  check(
    readSave('not json at all') === null,
    'and so is anything that is not a save',
    'garbage parsed as a save'
  );
  check(
    readSave(JSON.stringify(game)) !== null,
    'a current save reads back',
    'a fresh save was refused'
  );

  // Ids are minted from a counter that restarts with the page. Reading a save
  // has to claim the numbers in it, or the next item minted wears an id an
  // older one already has — and then one lookup answers for two items: the
  // bench opens the wrong one and two dock slots light up together.
  const held = { ...game, inventory: [makeGear('ash_wand', 1)], stash: [], craftId: null };
  held.inventory[0].id = 'gear_99000';
  const read = readSave(JSON.stringify(held));
  const minted = makeGear('ash_wand', 1);
  const mintedN = Number(/_(\d+)$/.exec(minted.id)?.[1] ?? 0);
  check(
    read !== null && mintedN > 99000,
    'reading a save claims the ids in it, so the next item cannot collide',
    `minted ${minted.id} after reading a save that already held gear_99000`
  );
  const after = [makeGear('ash_wand', 1), makeCrystal(1), makeGear('ash_wand', 1)];
  check(
    new Set(after.map((i) => i.id)).size === after.length,
    'and every id it hands out after that is still its own',
    after.map((i) => i.id).join(' ')
  );
}

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
