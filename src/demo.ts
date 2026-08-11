import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Rng } from './rng';
import { ModPool } from './mods';
import { canApply, craft, describeItem, describeMod, itemMatches } from './crafting';
import {
  AILMENT,
  ALL_MODS,
  DEFENCE,
  FISSURE,
  HERO_BASE,
  MONSTER_BY_ID,
  DROP_BANDS,
  monsterResStat,
  LEVELLING,
  ENCOUNTERS,
  PLAYER_SKILLS,
  AURA,
  AURAS,
  AURA_BY_ID,
  CURRENCIES,
  CURRENCY_BY_ID,
  CRYSTAL_QUESTS,
  CRYSTAL_LEVELS,
  INTRO,
  LAMPWRIGHT,
  QUEST_BY_ID,
  DAMAGE_GROUPS,
  DAMAGE_TYPES,
  ARMOUR_BASES,
  ARMOUR_FAMILIES,
  MONSTERS,
  MONSTERS_BY_FAMILY,
  MONSTER_FAMILIES,
  MAP_THEMES,
  POWER,
  REWARD,
  findStat,
  opensHere,
  WEAPON_BASES,
  BASE_TIER_ILVL,
  EQUIP_SLOTS,
  GEAR_BASES,
  GEAR_BASE_BY_ID,
  BASE_TIER_MODS,
  RUN_SLOTS,
  armourBudget,
  implicitSpend,
  RECIPES,
  SKILLS,
  SKILL_BY_ID,
  SKILL_CATEGORIES,
  UNIQUES,
  UNIQUE_BY_ID,
} from './data';
import {
  balance,
  grant,
  makeCrystal,
  pickGearBase,
  priceOfItem,
  rollCrystal,
  makeGear,
  makeUnique,
  rollGear,
  runRecipe,
  sellPrice,
} from './economy';
import { hasArmourArt } from './ui/icons';
import { RunSim, TICK, runToCompletion, walkToMeeting } from './sim/run';
import type { RunState } from './sim/run';
import {
  declaredCapacity,
  hasOpenSlot,
  baseTier,
  modCapacity,
  slotAllocation,
  slotCapacity,
  slotTypes,
  slotUsed,
} from './mods';
import { ENTRANCE, EXIT, FLOOR, TUNNEL, WALL, dist, generateMap } from './sim/grid';
import { HERO_FRAMES, wellFormed } from './render/sprites';
import { PORTRAITS } from './render/portraits';
import { BEASTIARY, HALO, MONSTER_FRAMES, haloed } from './render/bestiary';
import { BODY } from './render/body';
import { DOLL_GRID, FAMILY_ART, TRIM, TRIM_LIT, WEAPON_ART } from './render/gear-art';
import { hasFamilyArt, hasWeaponArt, lookRows, roleChar } from './render/look';
import { POSE_IDS, WALK_POSES } from './render/pose';
import type { PoseId } from './render/pose';
import {
  characterStats,
  convertedType,
  damageBreakdown,
  damageDetail,
  monsterStats,
  effectiveSkill,
  statMods,
  treeGrants,
} from './sim/stats';
import { damageWorkings, readWorkings } from './damage-text';
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
  pathToNotable,
  treeFor,
} from './skills-tree';
import { addSkillXp, addXp, makeCharacter, skillProgress, xpToNext } from './sim/character';
import type { Character } from './sim/character';
import { deepestSet, ladderCharacter, ladderSet, loadoutMods, starterLoadout } from './sim/loadout';
import { composition, crystalFamily, familyPlan, mapTheme, runSet } from './sim/crystal';
import { armourReduction, dropBias } from './sim/stats';
import { auraLook, floorPalette, livingDecals, paletteFrom, tileDecals } from './render/renderer';
import {
  TUTORIAL_STEPS,
  dockSlotId,
  recipeButtonId,
  skillCatId,
  skillNodeId,
  skillRowId,
  slotButtonId,
} from './ui/tutorial';
import { crystalMoveId } from './ui/crystals';
import { crystalSlotId } from './ui/craft';
import type { GuideCtx } from './ui/tutorial';
import {
  CARRY,
  addItem,
  SOLD_CAP,
  bankToHaul,
  buyBack,
  buyStashSpace,
  carryRoom,
  craftItem,
  createGame,
  crystalsIn,
  equipItem,
  grantFirstClear,
  lampwrightWeapon,
  giftWeapon,
  HAUL_CAP,
  haulFull,
  plainGear,
  replaceItem,
  selectForCraft,
  sellAll,
  sellItem,
  socketFor,
  socketItem,
  socketed,
  sortGear,
  sortInventory,
  stashRoom,
  stashUpgradeCost,
  takeWhatFits,
  toStash,
  unequipItem,
} from './game/state';
import { buildReport } from './game/report';
import {
  addCrystalXp,
  crystalXp,
  giftWaiting,
  giftSchedule,
  questDanger,
  QUEST_CONDITIONS,
  ownedCrystals,
  takeHandover,
  questMet,
  xpForClear,
} from './game/crystals';
import type { QuestFacts } from './game/crystals';
import {
  clearSave,
  copySlot,
  heal,
  liveSlot,
  loadGame,
  peekSlot,
  readSave,
  saveGame,
  savedAt,
  setLiveSlot,
} from './game/save';
import type { GameState } from './game/state';
import type {
  Item,
  MapTheme,
  MonsterDef,
  MonsterFamily,
  RolledMod,
  Wallet,
} from './types';

const pool = new ModPool(ALL_MODS);
const rng = new Rng(20260804);

// The real palette, out of the stylesheet the page ships — checking what a
// player sees against invented colours would prove nothing.
const PALETTE = paletteFrom((cssVar) => {
  const css = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
  return new RegExp(`${cssVar}\\s*:\\s*([^;]+);`).exec(css)?.[1] ?? '';
});

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

function aim(item: Item, currencyId: string, chosen?: string): Item {
  const currency = CURRENCY_BY_ID[currencyId];
  const res = craft(item, currency, pool, rng, chosen);
  if (!res.ok) {
    line(`  ✗ ${currency.name}: ${res.error}`);
    return item;
  }
  line(`  ✓ ${currency.name}`);
  for (const l of res.log) line(`      ${l}`);
  return res.item;
}

const apply = (item: Item, currencyId: string): Item => aim(item, currencyId);

// ===========================================================================
rule('CRAFTING A CRYSTAL');

let crystal = makeCrystal(3);
line(describeItem(crystal));

line();
// A crystal's level is its capacity, so a level 3 one holds two and that is
// the end of it. These lines are also the only place a currency's failure
// MESSAGE is ever read, so a refusal here is a feature.
crystal = apply(crystal, 'essence_of_the_swarm'); // guaranteed density
crystal = apply(crystal, 'essence_of_greed'); // guaranteed reward, second slot
crystal = apply(crystal, 'shard_of_making'); // refused — two is all it has
crystal = apply(crystal, 'shard_of_change'); // re-roll the values it holds
line();
line(describeItem(crystal));

// ===========================================================================
rule('THE ADD / REMOVE LOOP');

// A tier 3 body armour: six modifiers, and nothing at the bench raises that.
let gear = makeGear('bulwark_body_t3', 55, 'Runeplate');
for (let i = 0; i < 4; i++) gear = apply(gear, 'shard_of_making');
line();
line(describeItem(gear));

line();
line('Slots are typed, and each type is its own ceiling:');
gear = apply(gear, 'shard_of_making');
gear = apply(gear, 'shard_of_making');
gear = apply(gear, 'shard_of_making'); // refused — six of six
line();
line(describeItem(gear));

line();
line('Removal is the one thing you aim. Naming nothing is refused:');
gear = apply(gear, 'shard_of_unmaking');
gear = aim(gear, 'shard_of_unmaking', gear.mods[1].entryId);
line();
line(describeItem(gear));

// ===========================================================================
rule('A SMALLER BASE HOLDS LESS, AND NOTHING CHANGES THAT');

let small = makeGear('ash_wand', 55, 'Twig');
small = apply(small, 'shard_of_making');
small = apply(small, 'shard_of_making');
small = apply(small, 'shard_of_making'); // refused — a tier 1 base holds two
line();
line(describeItem(small));

// ===========================================================================
rule('THE GAMBLES LOCK THE ITEM');

let trinket = makeGear('gold_band', 40, 'Band of Ash');
for (let i = 0; i < 6; i++) trinket = apply(trinket, 'shard_of_making');
trinket = apply(trinket, 'sigil_of_upheaval');
line();
line(describeItem(trinket));
line();
trinket = apply(trinket, 'shard_of_making'); // should be refused
trinket = apply(trinket, 'sigil_of_finality'); // and so should the other gamble

// ===========================================================================
rule('AN ACTUAL RUN — headless, no browser');

{
  // Filled, not blank: a run measured against a crystal with nothing on it is
  // a run measured against the bare Fissure.
  const socketed = rollCrystal(3, pool, rng);
  const hero = makeCharacter(starterLoadout(new Rng(7)), 'strike');
  const stats = characterStats(hero);

  line(`Crystal: ${socketed.mods.map((m) => m.name).join(', ')}`);
  line(
    `Hero:    level ${hero.level} · ${Math.round(stats.maxLife)} life · ` +
      `${Math.round(stats.damage)} dmg · ${stats.attacksPerSecond.toFixed(2)}/s · ` +
      `${Math.round(stats.critChance)}% crit`
  );

  const sim = new RunSim([socketed], hero, new Rng(4242));
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
rule('CAPACITY — does the base actually restrict anything?');

// A base's TIER is the whole of how many modifiers it holds, and nothing at
// the bench raises it: a bigger item means going and finding a better base.
// Every check here is a way that could quietly stop being true — an effect
// that fills past the cap, a drop table handing out a tier 3 base on a tier 1
// map, a gamble that turns out to be free.
{
  const at = (tier: number) => ['ash_wand', 'carved_wand', 'quartz_wand'][tier - 1];
  const wand = (tier: number) => makeGear(at(tier), 60);

  const fill = (item: Item): Item => {
    let out = item;
    for (let i = 0; i < 10; i++) {
      const r = craft(out, CURRENCY_BY_ID.shard_of_making, pool, rng);
      if (!r.ok) break;
      out = r.item;
    }
    return out;
  };

  const held = BASE_TIER_MODS.map((_, i) => fill(wand(i + 1)).mods.length);
  line(`  a wand holds ${held.join(' / ')} modifiers at tier 1 / 2 / 3`);
  check(
    held.join(',') === BASE_TIER_MODS.join(','),
    'each rung of a base holds exactly what its tier says, and Making stops there',
    `${held.join(',')} against ${BASE_TIER_MODS.join(',')}`
  );

  // Jewellery carries no implicit at all, so its rungs differ in exactly one
  // way. If that ladder ever breaks, two of the eight slots stop progressing.
  const rings = ['ring', 'silver_band', 'gold_band'].map((b) => modCapacity(makeGear(b, 60)));
  check(
    rings.join(',') === BASE_TIER_MODS.join(','),
    'and so does jewellery, which has nothing else to tell the rungs apart',
    rings.join(',')
  );

  // The cap is the base's, not the currency's: nothing in the table may reach
  // past it except the one exotic that says it will and locks the item.
  const small = fill(wand(1));
  const overrun = CURRENCIES.filter((c) => {
    if (c.effects.some((e) => e.kind === 'corrupt')) return false;
    const r = craft(small, c, pool, rng);
    return r.ok && r.item.mods.length > BASE_TIER_MODS[0];
  });
  check(
    overrun.length === 0,
    'and no ordinary currency in the table can put a modifier past it',
    overrun.map((c) => c.name).join(', ')
  );

  // A locked item is the end of the line. Every currency has to refuse one,
  // through the condition rather than through a special case in the engine.
  const locked = craft(fill(wand(3)), CURRENCY_BY_ID.sigil_of_finality, pool, rng).item;
  const reached = CURRENCIES.filter((c) => craft(locked, c, pool, rng).ok);
  check(
    locked.meta.corrupted === true && reached.length === 0,
    'a locked item refuses every currency in the game',
    reached.map((c) => c.name).join(', ') || 'it was never locked'
  );
}

// ===========================================================================
rule('THE GAMBLES — do the two exotics do what nothing else can?');

// Two one-way doors, and they are the only way past two rules the rest of the
// bench obeys. Both say so on the tin and both lock the item.
{
  const ceiling = (item: Item): number => {
    let over = 0;
    for (const mod of item.mods) {
      const entry = pool.entries.find((e) => e.id === mod.entryId);
      if (!entry) continue;
      mod.stats.forEach((st, i) => {
        if (st.value > (entry.stats[i]?.range[1] ?? Infinity)) over++;
      });
    }
    return over;
  };

  const finished = (): Item => {
    let out = makeGear('quartz_wand', 60);
    for (let i = 0; i < 10; i++) {
      const r = craft(out, CURRENCY_BY_ID.shard_of_making, pool, rng);
      if (!r.ok) break;
      out = r.item;
    }
    return out;
  };

  // Empowered or diminished, never clamped. Over many throws both sides have
  // to turn up, or it is not a gamble.
  let above = 0;
  let down = 0;
  for (let seed = 0; seed < 60; seed++) {
    const r = craft(finished(), CURRENCY_BY_ID.sigil_of_finality, pool, new Rng(4000 + seed));
    if (!r.ok) continue;
    if (ceiling(r.item) > 0) above++;
    else down++;
  }
  line(`  Finality went over the modifier's maximum on ${above} of 60 throws`);
  check(
    above > 10 && down > 10,
    'the value gamble can put a roll past its maximum, and can just as easily not',
    `${above} up, ${down} not`
  );

  // And it is the ONLY thing that can. Everything else re-rolls inside the
  // authored range, which is what makes an over-max roll mean something.
  const leaks = CURRENCIES.filter((c) => {
    if (c.id === 'sigil_of_finality') return false;
    for (let seed = 0; seed < 12; seed++) {
      const r = craft(finished(), c, pool, new Rng(5000 + seed));
      if (r.ok && ceiling(r.item) > 0) return true;
    }
    return false;
  });
  check(
    leaks.length === 0,
    'and nothing else in the game can',
    leaks.map((c) => c.name).join(', ')
  );

  // The modifier gamble: one past the cap, or one gone. Both sides, and the
  // cap it breaks is the base's own.
  let grew = 0;
  let shrank = 0;
  for (let seed = 0; seed < 60; seed++) {
    const before = finished();
    const r = craft(before, CURRENCY_BY_ID.sigil_of_upheaval, pool, new Rng(6000 + seed));
    if (!r.ok) continue;
    if (r.item.mods.length > before.mods.length) grew++;
    if (r.item.mods.length < before.mods.length) shrank++;
  }
  line(`  Upheaval added on ${grew} of 60 throws and took away on ${shrank}`);
  check(
    grew > 10 && shrank > 10 && grew + shrank === 60,
    'the modifier gamble always does one or the other, and never nothing',
    `${grew} added, ${shrank} removed`
  );

  const over = craft(finished(), CURRENCY_BY_ID.sigil_of_upheaval, pool, new Rng(6003)).item;
  check(
    over.meta.corrupted === true,
    'and locks the item either way',
    'a gamble left the item craftable'
  );
}

// ===========================================================================
rule('TARGETING — is choosing what leaves the only thing you can aim?');

// The chase collapses the moment you can name what ARRIVES. Removal is the one
// exception, because choosing what leaves still cannot conjure what you want.
{
  let item = makeGear('quartz_wand', 60);
  for (let i = 0; i < 10; i++) {
    const r = craft(item, CURRENCY_BY_ID.shard_of_making, pool, rng);
    if (!r.ok) break;
    item = r.item;
  }
  const victim = item.mods[2];
  const cut = craft(item, CURRENCY_BY_ID.shard_of_unmaking, pool, rng, victim.entryId);
  check(
    cut.ok && !cut.item.mods.some((m) => m.entryId === victim.entryId) &&
      cut.item.mods.length === item.mods.length - 1,
    'Unmaking removes the modifier you named and no other',
    `${cut.error ?? cut.item.mods.length} left`
  );
  // Naming nothing has to refuse rather than pick for you: a shard spent on a
  // random removal you did not ask for is the worst reading of a click.
  check(
    !craft(item, CURRENCY_BY_ID.shard_of_unmaking, pool, rng).ok,
    'and refuses rather than choosing for you',
    'an unaimed removal went ahead anyway'
  );

  // Everything else stays blind. A currency that lets you name what arrives
  // would end the gear chase, so the table is held to it rather than trusted.
  const aimed = CURRENCIES.filter((c) =>
    c.effects.some((e) => e.chosen === true && e.kind !== 'remove_mod')
  );
  check(aimed.length === 0, 'and nothing in the table can aim what arrives',
    aimed.map((c) => c.name).join(', '));

  // Crystals only. A crystal is a configuration you are meant to be able to
  // aim, and none of the gear chase runs through one.
  const guaranteed = CURRENCIES.filter((c) =>
    c.effects.some((e) => e.kind === 'add_mod' && (e.tag || e.slot))
  );
  check(
    guaranteed.every((c) => c.targets.kinds?.length === 1 && c.targets.kinds[0] === 'crystal'),
    'and every guaranteed-family currency is a crystal one',
    guaranteed.filter((c) => c.targets.kinds?.[0] !== 'crystal').map((c) => c.name).join(', ')
  );

  // A tag no modifier carries is a currency that has never worked and never
  // says so — it just refuses, in a sentence about having had no effect.
  const dead = guaranteed.filter((c) => {
    const blank = c.targets.kinds?.[0] === 'crystal' ? makeCrystal(4) : makeGear('quartz_wand', 70);
    return !craft(blank, c, pool, rng).ok;
  });
  check(
    dead.length === 0,
    'and every one of them can actually find a modifier to guarantee',
    dead.map((c) => c.name).join(', ')
  );
}

// ===========================================================================
rule('OPENINGS — does the bench draw exactly what the item can hold?');

// The bench draws one facet per opening, so an opening that is not real is a
// socket you can never fill sitting on screen forever. That is what shipped
// once: every base drew its full declared table, so a two-modifier item showed
// six sockets under a header that said 0/2.
//
// The invariant is one line — the openings across all slot types add up to the
// item's modifier budget — and it has to hold for every base at every fill,
// because it is the base that decides how the budget gets dealt out.
{
  let mismatched = 0;
  let overDeclared = 0;
  let starved = 0;
  const table: string[] = [];
  const FILLS = [0, 1, 2, 3];

  for (const base of GEAR_BASES) {
    const row: string[] = [];
    for (const q of FILLS) {
      const item = rollGear(base.id, 60, q, pool, rng);

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

  line(`  ${'base'.padEnd(13)}${FILLS.map((q) => `${q} mods`.padEnd(7)).join(' ')}`);
  for (const r of table) line(r);
  line();

  check(mismatched === 0, 'every base deals out exactly its budget, however full it is',
    `${mismatched} base/fill pairs draw the wrong number of openings`);
  check(overDeclared === 0, 'and never past what the base declares',
    `${overDeclared} slot types were dealt more than the base has`);
  check(starved === 0, 'two openings never both land on the same type',
    `${starved} items put their whole budget on one slot type`);

  // The bench reads capacity, not allocation, and capacity must never hide a
  // modifier the item is already wearing.
  const worn = rollGear('bulwark_boots_t3', 60, 9, pool, rng);
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
rule('DROPS — does the set decide what the map can give you?');

// Run power gates the CEILING, rarity only gates how often you reach it.
// Without the cap a rarity-stacked bare Fissure would out-drop an honest
// endgame set, which is the ladder skipped in one lucky kill.
{
  const hero = makeCharacter(starterLoadout(new Rng(7), 30), 'strike');
  const seen = new Map<number, Set<number>>();
  const counts = new Map<number, number>();
  // The best modifier tier a band can produce. Item level is what gates these,
  // and it is the one input here that would fail SILENTLY: gear would keep
  // dropping, on the right bases, rolling nothing but the bottom rung.
  const best = new Map<number, number>();

  for (const band of [0, 1, 3, 5]) {
    const tiers = new Set<number>();
    let items = 0;
    let top = 99;
    for (const seed of [11, 29, 47]) {
      const set = ladderSet(band, new Rng(400 + seed + band), pool);
      const sim = new RunSim(set, hero, new Rng(seed * 31 + band));
      const f = runToCompletion(sim, 400);
      for (const item of f.loot.items) {
        tiers.add(baseTier(item));
        for (const mod of item.mods) top = Math.min(top, mod.tier);
        items++;
      }
    }
    seen.set(band, tiers);
    counts.set(band, items);
    best.set(band, top);
    line(
      `  band ${band}: ${items} pieces — base tiers ${[...tiers].sort().join(', ') || 'none'}` +
        ` — best modifier T${top}`
    );
  }

  check(
    [...counts.values()].every((n) => n > 0),
    'every band drops gear at all',
    [...counts].map(([b, n]) => `B${b}=${n}`).join(' ')
  );
  const low = new Set([...(seen.get(0) ?? []), ...(seen.get(1) ?? [])]);
  check(
    !low.has(2) && !low.has(3),
    'the bare Fissure and the band above it cannot produce a tier 2 base',
    [...low].join(', ')
  );
  check(
    seen.get(5)?.has(3) === true,
    'and the top of the ladder produces the six-modifier ones',
    [...(seen.get(5) ?? [])].join(', ')
  );
  check(
    best.get(5)! < best.get(0)! && best.get(5)! === 1,
    'and only the top of the ladder rolls top-tier modifiers',
    `band 0 reached T${best.get(0)}, band 5 reached T${best.get(5)}`
  );
}

// ===========================================================================
rule('THE HAUL — where does the loop stop, and can it wedge shut?');

// The loop only ever ends in two places and both are this container. What has
// to hold: a run never loses a drop, capacity is read between runs so nothing
// is split, and there is always a way back under the limit — otherwise the
// game has a state you cannot play out of.
{
  const game = createGame('fresh');
  const drops = Array.from({ length: 20 }, (_, i) => makeGear('ash_wand', i + 1));
  bankToHaul(game, drops);
  check(
    game.haul.length === 20 && game.inventory.length === 0,
    'a cleared run banks into the haul and not into your bags',
    `${game.haul.length} hauled, ${game.inventory.length} carried`
  );

  // Deliberately past the limit: the alternative is splitting a descent's
  // drops, and the run that was cut in half is the one you remember. Half of
  // it rolled, so the bulk button and Sell all are answering different
  // questions rather than the same one twice.
  const flood = HAUL_CAP + CARRY.gear;
  bankToHaul(
    game,
    Array.from({ length: flood }, (_, i) =>
      i % 2 === 0 ? makeGear('ash_wand', 5) : rollGear('ash_wand', 40, 2, pool, new Rng(600 + i))
    )
  );
  check(
    game.haul.length === 20 + flood && haulFull(game),
    'and overflows rather than dropping anything on the floor',
    `${game.haul.length} of ${HAUL_CAP}`
  );

  const took = takeWhatFits(game);
  check(
    took === CARRY.gear && game.inventory.length === CARRY.gear,
    'taking what fits fills the bag exactly once',
    `${took} moved, ${game.inventory.length} carried`
  );

  // The wedge: haul over its limit, both bags full, stash full. Selling is the
  // one move that needs room nowhere, which is what makes it the way out.
  while (stashRoom(game) > 0) game.stash.push(makeGear('ash_wand', 1));
  check(
    takeWhatFits(game) === 0 && haulFull(game),
    'with everything full there is nowhere left to put one',
    `${game.haul.length} hauled, ${carryRoom(game, 'gear')} bag room`
  );
  // What a Find box matches. A haul is a night's work and the only other way
  // to read it is one hover at a time, so the answer has to cover everything
  // printed on a piece rather than just its name.
  {
    const piece = rollGear('bulwark_helmet_t1', 40, 2, pool, new Rng(5));
    const lines = [...piece.implicits, ...piece.mods].map(describeMod).join(' ');
    const word = /([A-Za-z]{4,})/.exec(lines)?.[1] ?? 'armour';
    line(`  a rolled helmet reads: ${lines.slice(0, 90)}`);
    check(
      itemMatches(piece, piece.name.split(' ')[0]) &&
        itemMatches(piece, 'helmet') &&
        itemMatches(piece, word) &&
        itemMatches(piece, word.toUpperCase()),
      'a search reaches the name, the base and every line printed on it',
      `name ${itemMatches(piece, piece.name.split(' ')[0])}, base ` +
        `${itemMatches(piece, 'helmet')}, line "${word}" ${itemMatches(piece, word)}`
    );
    check(
      itemMatches(piece, '') && itemMatches(piece, '   ') && !itemMatches(piece, 'zzzznothing'),
      'and an empty box matches everything while a word nothing has matches none',
      'the empty case is wrong'
    );
  }

  // The haul is ordered by the DOCK's comparator, so the two piles read the
  // same way — and ordering is not moving: the haul is inert, and a sort that
  // quietly took something out of it would be the one screen that spends your
  // loot for you.
  {
    const pile = createGame('dev');
    pile.haul = [
      makeGear('bulwark_helmet_t1', 8),
      makeGear('rusted_sword', 8),
      makeGear('shiv', 30),
      makeGear('bulwark_body_t2', 30),
    ];
    const was = [...pile.haul];
    sortGear(pile.haul);
    check(
      pile.haul.length === was.length && was.every((i) => pile.haul.includes(i)),
      'sorting the haul holds exactly what it held',
      `${was.length} in, ${pile.haul.length} out`
    );
    const order = pile.haul.map((i) => i.id).join(',');
    sortGear(pile.haul);
    check(
      pile.haul.map((i) => i.id).join(',') === order,
      'and sorting it twice changes nothing',
      order
    );
    const dock = createGame('dev');
    dock.inventory = [...was];
    sortInventory(dock);
    check(
      dock.inventory.map((i) => i.base).join(',') === pile.haul.map((i) => i.base).join(','),
      'and orders a pile the way the dock orders the same pile',
      `${dock.inventory.map((i) => i.base).join(',')} vs ${pile.haul.map((i) => i.base).join(',')}`
    );
  }

  const sold = sellAll(game, plainGear(game.haul));
  check(
    sold.count > 0 && !haulFull(game) && sold.gold > 0,
    `and selling ${sold.count} pieces for ${sold.gold} gold reopens the Fissure`,
    `${game.haul.length} still hauled after selling ${sold.count}`
  );
  // Sell everything, with every container still full. This is the state the
  // loop can actually reach and the one a room check would wedge.
  const rest = sellAll(game, [...game.haul]);
  check(
    game.haul.length === 0 && rest.count > 0,
    'and selling ALL of it empties the haul with every other container full',
    `${game.haul.length} left after selling ${rest.count}`
  );
}

// ===========================================================================
rule('THE COUNTER — can a sale be taken back, and can it be farmed?');

// Selling is the one move you cannot undo, so the counter keeps the last few
// and buys them back at what they paid. That number has to be exact in both
// directions, or the shelf becomes a gold press.
{
  const game = createGame('fresh');
  grant(game.wallet, 'gold', 500);
  const piece = rollGear('bulwark_body_t3', 60, 6, pool, new Rng(12));
  addItem(game, piece);

  const before = balance(game.wallet, 'gold');
  const paid = sellItem(game, piece);
  check(
    paid > 0 && game.sold.length === 1 && game.sold[0].price === paid,
    'a sale lands on the counter at what it paid',
    `${game.sold.length} on the counter`
  );

  const back = buyBack(game, game.sold[0]);
  check(
    back.ok &&
      balance(game.wallet, 'gold') === before &&
      game.inventory.some((i) => i.id === piece.id) &&
      game.sold.length === 0,
    'and buying it back is exactly neutral, in gold and in what you hold',
    `${balance(game.wallet, 'gold')} against ${before}`
  );

  // Not a queue you can grow forever. The oldest falls off, which is what
  // keeps a save from carrying a night's regret around.
  for (let i = 0; i < SOLD_CAP + 6; i++) {
    const junk = makeGear('ash_wand', 1);
    addItem(game, junk);
    sellItem(game, junk);
  }
  check(
    game.sold.length === SOLD_CAP,
    `the counter remembers ${SOLD_CAP} and no more`,
    `${game.sold.length} kept`
  );

  // A sale needs room nowhere; buying one back is a purchase and does. The
  // asymmetry is the whole reason the loop cannot wedge.
  const full = createGame('fresh');
  grant(full.wallet, 'gold', 500);
  while (carryRoom(full, 'gear') > 0) addItem(full, makeGear('ash_wand', 1));
  const last = full.inventory[0];
  sellItem(full, last);
  while (carryRoom(full, 'gear') > 0) addItem(full, makeGear('ash_wand', 1));
  while (stashRoom(full) > 0) full.stash.push(makeGear('ash_wand', 1));
  const refused = buyBack(full, full.sold[0]);
  check(
    !refused.ok && refused.error !== undefined && full.sold.length === 1,
    'buying back refuses when there is nowhere to put it, and says why',
    refused.error ?? 'it went ahead anyway'
  );
}

// A real loop, measured rather than asserted: run the same set repeatedly and
// see where it actually stops. Either terminus is fine; silently running
// forever is not, and neither is stopping on the first clear.
{
  const game = createGame('fresh');
  game.character = ladderCharacter(2, new Rng(31));
  const set = ladderSet(2, new Rng(4141), pool);
  let runs = 0;
  let stop = 'never';

  while (runs < 60) {
    const final = runToCompletion(new RunSim(set, game.character, new Rng(9000 + runs)), 400);
    runs++;
    const report = buildReport(game, final);
    if (!report.cleared) { stop = 'died'; break; }
    if (report.haulFull) { stop = 'full'; break; }
  }
  line(`  the loop ran ${runs} descents and stopped: ${stop} (${game.haul.length} in the haul)`);
  check(
    stop !== 'never' && runs > 1,
    'a loop stops on a death or a full haul, and never on the first clear',
    `${stop} after ${runs}`
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

  fillGear(game);
  check(
    carryRoom(game, 'gear') === 0 && carryRoom(game, 'crystal') === Infinity,
    'a full gear bag leaves the crystal collection uncapped',
    `gear room ${carryRoom(game, 'gear')}, crystal room ${carryRoom(game, 'crystal')}`
  );

  const overflow = makeGear('ash_wand', 1);
  check(
    addItem(game, overflow) === 'stashed' && game.stash.includes(overflow),
    'a full bag sends the next one to the stash',
    'overflow did not reach the stash'
  );

  // A crystal is never carried, sold or spent, so a container for it is triage
  // with nothing to triage. It goes to the collection whatever else is full.
  const stone = makeCrystal(2);
  check(
    addItem(game, stone) === 'carried' &&
      game.crystals.includes(stone) &&
      !game.inventory.includes(stone) &&
      !game.stash.includes(stone),
    'a crystal never enters the bags or the stash',
    'a crystal reached a container it should have left'
  );

  // Fill the stash too, and the next one has genuinely nowhere to go.
  while (stashRoom(game) > 0) addItem(game, makeGear('ash_wand', 1));
  check(
    addItem(game, makeGear('ash_wand', 1)) === 'lost',
    'a full stash on top of a full bag loses it — and says so',
    'the item went somewhere it should not have'
  );
  check(
    addItem(game, makeCrystal(3)) === 'carried',
    'and a crystal still lands, with every other container full',
    'the collection refused a crystal'
  );

  grant(game.wallet, 'gold', 1000);
  const before = game.stashSlots;
  const first = stashUpgradeCost(before)!;
  buyStashSpace(game);
  const second = stashUpgradeCost(game.stashSlots)!;
  line(`  stash upgrades: ${first} then ${second} gold`);
  check(
    game.stashSlots > before && second > first,
    'buying space works and gets steeper',
    `${before} -> ${game.stashSlots}, ${first} then ${second}`
  );
  check(
    addItem(game, makeGear('ash_wand', 1)) === 'stashed',
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
rule('EQUIPPING — can you take it back, and can you craft what you wear?');

// A click puts something on, so the whole safety net is that the same click is
// reversible. Undo has to restore the bag EXACTLY: put the item back where it
// was in the order, and put whatever it displaced back on.
{
  const game = createGame('fresh');
  game.inventory = [];
  const first = makeGear('bulwark_helmet_t1', 20);
  const spacer = makeGear('bulwark_body_t1', 20);
  const second = makeGear('bulwark_helmet_t2', 30);
  for (const item of [first, spacer, second]) addItem(game, item);

  const order = () => game.inventory.map((i) => i.id).join(',');
  const before = order();
  const undoFirst = equipItem(game, first, 'helmet');
  check(
    !!undoFirst && game.character.equipment.helmet?.id === first.id,
    'a helmet goes on',
    'equipping a fitting helmet failed'
  );
  check(
    undoFirst?.() === true && order() === before,
    'and undo puts it back in the slot it came from, not on the end',
    `undo left the bag as ${order()}, was ${before}`
  );

  // Swapping is two moves, and undo has to reverse both.
  equipItem(game, first, 'helmet');
  const swapped = order();
  const undoSwap = equipItem(game, second, 'helmet');
  check(
    game.character.equipment.helmet?.id === second.id && game.inventory.some((i) => i.id === first.id),
    'swapping wears the new one and hands back the old',
    'a swap lost one of the two helmets'
  );
  check(
    undoSwap?.() === true &&
      order() === swapped &&
      game.character.equipment.helmet?.id === first.id,
    'and undoing a swap puts both pieces back',
    `undo left ${order()} with ${game.character.equipment.helmet?.name} worn`
  );

  // Stale undo. Wearing something else afterwards means the "back" this button
  // points at no longer exists, and restoring would take off a later choice.
  const undoStale = equipItem(game, second, 'helmet');
  equipItem(game, first, 'helmet');
  check(
    undoStale?.() === false && game.character.equipment.helmet?.id === first.id,
    'an undo the slot has moved past refuses instead of undressing you',
    'a stale undo took off a piece chosen after it'
  );
}

// The bench takes worn gear, so the crafting window can show what you are
// wearing beside it. Two things have to hold: the bench must RESOLVE a worn
// item, and a craft must land back in the equip slot rather than in the bag.
{
  const game = createGame('fresh');
  game.inventory = [];
  const wand = makeGear('ash_wand', 20);
  addItem(game, wand);
  equipItem(game, wand, 'weapon');
  selectForCraft(game, wand);
  check(
    craftItem(game)?.id === wand.id,
    'the bench opens something you are wearing',
    'a worn item on the bench resolves to nothing'
  );

  const rolled = craft(wand, CURRENCY_BY_ID.shard_of_making, new ModPool(ALL_MODS), new Rng(7));
  if (rolled.ok) replaceItem(game, rolled.item);
  check(
    game.character.equipment.weapon?.id === wand.id && game.inventory.length === 0,
    'and crafting it swaps the worn copy rather than dropping one in the bag',
    `crafting a worn item left ${game.inventory.length} in the bag`
  );

  // The other half: leaving is what clears the bench, and it clears by failing
  // to resolve rather than by anything remembering to null the id.
  unequipItem(game, 'weapon');
  toStash(game, game.inventory[0]);
  check(
    craftItem(game) === null,
    'and stashing it closes the bench',
    'the bench still holds something that is not carried or worn'
  );
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
    ...wellFormed(HERO_FRAMES, DOLL_GRID).map((b) => `hero ${b}`),
    ...Object.entries(BEASTIARY).flatMap(([name, art]) =>
      wellFormed([...art.frames, ...(art.attack ? [art.attack] : [])], art.grid).map(
        (b) => `${name} ${b}`
      )
    ),
  ];
  const sheets = 1 + Object.keys(BEASTIARY).length;
  const grids = [...new Set(Object.values(BEASTIARY).map((a) => a.grid))].sort();
  check(
    problems.length === 0,
    `all ${sheets} sprites are square on every frame, at ${grids.join(' and ')}`,
    problems.join('; ')
  );

  // Portraits are their own grid and their own table, so they need their own
  // pass — a face is the one drawing anybody actually looks at.
  const faces = Object.entries(PORTRAITS).flatMap(([name, art]) =>
    wellFormed([art.rows], art.grid).map((b) => `${name} ${b}`)
  );
  const unlit: string[] = [];
  for (const [name, art] of Object.entries(PORTRAITS)) {
    const key = art.ink(PALETTE);
    const used = new Set(art.rows.join('').split('').filter((c) => c !== '.'));
    for (const ch of used) if (!key[ch]) unlit.push(`${name}: '${ch}' has no ink`);
  }
  check(
    faces.length === 0 && unlit.length === 0,
    `all ${Object.keys(PORTRAITS).length} portraits are square, and every character in one has an ink`,
    [...faces, ...unlit].join('; ')
  );
  // A portrait is drawn to be READ, so it has to be bigger than the map sprite
  // it stands in for — that is the whole reason the table exists.
  const small = Object.entries(PORTRAITS)
    .filter(([id, art]) => art.grid <= (BEASTIARY[id]?.grid ?? 0))
    .map(([id]) => id);
  check(
    small.length === 0,
    'and drawn at a bigger grid than the sprite that walks around',
    small.join(', ')
  );

  // Every monster the tables can spawn has to have a drawing, or a pack of
  // them arrives as whatever the fallback happens to be.
  const undrawn = MONSTERS.filter((m) => !MONSTER_FRAMES[m.sprite]).map((m) => m.id);
  check(
    undrawn.length === 0,
    `all ${MONSTERS.length} monsters are drawn`,
    undrawn.join(', ')
  );

  // A rank has to be visible before it reaches you: a halo that adds nothing,
  // or one that eats the body it rings, is a rank you find out about by dying.
  const rankProblems: string[] = [];
  for (const [id, art] of Object.entries(BEASTIARY)) {
    const bare = art.frames[0];
    const body = bare.join('').split('').filter((c) => c !== '.').length;
    for (const rank of ['magic', 'rare'] as const) {
      const ring = haloed(bare, HALO[rank]);
      if (wellFormed([ring], art.grid).length > 0) rankProblems.push(`${id} ${rank} is not square`);
      const kept = ring.join('').split('').filter((c, i) => bare.join('')[i] !== '.').length;
      if (kept !== body) rankProblems.push(`${id} ${rank} halo ate ${body - kept} of the body`);
      if (ring.join('') === bare.join('')) rankProblems.push(`${id} ${rank} looks the same`);
    }
  }
  check(
    rankProblems.length === 0,
    'and a magic or rare one is ringed without losing a pixel of itself',
    rankProblems.slice(0, 3).join('; ')
  );

  // One light, from above. A highlight sitting directly under a shadow is lit
  // from underneath, and a sprite lit from underneath reads as belonging to a
  // different game than the one beside it.
  const upsideDown = (grid: string[], lit: string, shade: string): number => {
    let bad = 0;
    for (let y = 1; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === lit && grid[y - 1][x] === shade) bad++;
      }
    }
    return bad;
  };
  const wrongWay =
    Object.values(BEASTIARY)
      .flatMap((a) => [...a.frames, ...(a.attack ? [a.attack] : [])])
      .reduce((n, g) => n + upsideDown(g, 'M', 's'), 0) +
    Object.values(FAMILY_ART)
      .flatMap((a) => [a.helmet, a.body, a.gloves, ...a.boots])
      .reduce((n, g) => n + upsideDown(g, 'P', 'd'), 0);
  check(wrongWay === 0, 'and every one of them is lit from above', `${wrongWay} pixels are not`);

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

  // A swing that looks like standing still is worse than no swing: the player
  // reads it as the monster not having attacked.
  const swings = Object.entries(BEASTIARY).filter(([, a]) => a.attack);
  const stiff = swings.filter(([, a]) => a.attack!.join('') === a.frames[0].join(''));
  line(`  ${swings.length} of ${Object.keys(BEASTIARY).length} creatures have a swing`);
  check(
    stiff.length === 0 && swings.length > 0,
    'and every creature that swings is visibly doing something else while it does',
    stiff.map(([n]) => n).join(', ')
  );
}

// ===========================================================================
rule('THE MODEL — does the figure hold together in every pose?');

// The figure is layers: a body, four pieces of armour and a weapon, each a
// grid authored against the neutral pose. Nothing here needs a canvas, so
// every combination can be checked rather than eyeballed.
{
  const problems: string[] = [];
  for (const pose of POSE_IDS) {
    problems.push(...wellFormed([BODY[pose]], DOLL_GRID).map((b) => `body ${pose} ${b}`));
  }
  for (const [family, art] of Object.entries(FAMILY_ART)) {
    problems.push(
      ...wellFormed([art.helmet, art.body, art.gloves, ...art.boots], DOLL_GRID).map(
        (b) => `${family} ${b}`
      )
    );
  }
  for (const [kind, art] of Object.entries(WEAPON_ART)) {
    problems.push(...wellFormed([art.rest, art.strike], DOLL_GRID).map((b) => `${kind} ${b}`));
  }
  check(
    problems.length === 0,
    `every grid is ${DOLL_GRID}x${DOLL_GRID}`,
    problems.slice(0, 4).join('; ')
  );

  // Composition must not push anything off the cell: a shift that runs a row
  // long silently draws outside the sprite, which reads as art bleeding into
  // the tile beside it.
  const full = {
    helmet: { family: 'bulwark', tier: 3 },
    body: { family: 'bulwark', tier: 3 },
    gloves: { family: 'bulwark', tier: 3 },
    boots: { family: 'bulwark', tier: 3 },
    weapon: { kind: 'mace' },
  };
  const composed = POSE_IDS.map((p) => lookRows(full, p));
  check(
    wellFormed(composed, DOLL_GRID).length === 0,
    `and a fully armed figure still composes to ${DOLL_GRID}x${DOLL_GRID} in every pose`,
    wellFormed(composed, DOLL_GRID).join('; ')
  );

  // Four poses that look the same are one pose drawn four times.
  const seen = new Map<string, string[]>();
  for (const pose of POSE_IDS) {
    const key = lookRows(full, pose).join('');
    seen.set(key, [...(seen.get(key) ?? []), pose]);
  }
  const twins = [...seen.values()].filter((p) => p.length > 1);
  check(
    twins.length === 0,
    `all ${POSE_IDS.length} poses draw something different`,
    twins.map((p) => p.join('=')).join(', ')
  );

  // A walk is contact, pass, contact, pass, and a pass is the frame where the
  // figure is on ONE foot. Two planted frames alternating is the splits.
  const soles = (pose: PoseId): number => {
    const rows = lookRows(full, pose).filter((r) => r.trim() !== '.'.repeat(DOLL_GRID));
    return (rows[rows.length - 1].match(/[^.]+/g) ?? []).length;
  };
  const standing = WALK_POSES.map(soles);
  check(
    standing.join() === '2,1,2,1',
    'and the walk puts the figure on one foot every other frame',
    WALK_POSES.map((p, i) => `${p} on ${standing[i]}`).join(', ')
  );

  // The rung is a rule, so it has to actually do something at each step, and
  // tier 1 must carry no trim at all.
  const ladder = ARMOUR_FAMILIES.filter((f) => hasFamilyArt(f.id)).flatMap((f) => {
    const at = (tier: number) =>
      lookRows({ body: { family: f.id, tier }, helmet: { family: f.id, tier } }, 'walk0').join('');
    const bad: string[] = [];
    if (at(1) === at(2)) bad.push(`${f.id}: tier 1 and 2 are identical`);
    if (at(2) === at(3)) bad.push(`${f.id}: tier 2 and 3 are identical`);
    // Against the family's OWN ink: composition rewrites the generic trim
    // character, so looking for a literal 'x' finds nothing whatever the art
    // does. That is a check that cannot fail.
    if (at(1).includes(roleChar(f.id, TRIM)) || at(1).includes(roleChar(f.id, TRIM_LIT))) {
      bad.push(`${f.id}: tier 1 has trim`);
    }
    // Trim is decoration ON a finished shape. Structural trim leaves tier 1
    // with holes in it, which reads as a broken sprite rather than a plain one.
    const holes = at(1).length - at(1).split('.').length;
    const solid = at(3).length - at(3).split('.').length;
    if (holes < solid - 40) bad.push(`${f.id}: tier 1 loses ${solid - holes} pixels of shape`);
    return bad;
  });
  check(ladder.length === 0, 'and every rung of a family differs from the one below', ladder.join('; '));

  // A weapon with no drawing is a hand holding nothing.
  const undrawn = WEAPON_BASES.filter((b) => !hasWeaponArt(b.id)).map((b) => b.id);
  check(
    undrawn.length === 0,
    `all ${WEAPON_BASES.length} weapons are drawn, one shape each`,
    undrawn.join(', ')
  );

  // Two weapons that draw the same are one weapon with two names.
  const byShape = new Map<string, string[]>();
  for (const base of WEAPON_BASES) {
    const key = lookRows({ weapon: { kind: base.id } }, 'walk0').join('');
    byShape.set(key, [...(byShape.get(key) ?? []), base.id]);
  }
  const shared = [...byShape.values()].filter((ids) => ids.length > 1);
  check(
    shared.length === 0,
    'and no two of them draw the same silhouette',
    shared.map((ids) => ids.join('=')).join(', ')
  );

  // Not a failure: the families still to draw, named rather than left silent.
  const pending = ARMOUR_FAMILIES.filter((f) => !hasFamilyArt(f.id)).map((f) => f.id);
  if (pending.length) {
    line(`  note ${pending.length} armour families still to draw: ${pending.join(', ')}`);
  }
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

  for (const band of [1, 3, 6]) {
    const map = generateMap([], new Rng(1000 + band), 1, band);
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

    // The INSIDE of the rectangle: no world carves the outer ring whole, and
    // the lip a passage breaks through to get in is a passage. What must never
    // be one is the middle of the chamber.
    for (const room of map.rooms) {
      for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
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
    'a corridor never relabels the inside of the room it joins',
    `${roomsCutByCorridors} chamber tiles marked as passage`
  );
  check(
    veins.join(',') === '1,3,6',
    'the vein tracks the power of the set you socketed',
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
  const AT: GuideCtx = {
    view: 'run',
    phase: 'menu',
    top: null,
    picking: null,
    category: null,
    viewing: null,
  };
  const ctx: GuideCtx = { ...AT };
  let step = 0;
  const trace: string[] = [];
  const targetless: string[] = [];
  const MARKUP = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');

  const mine = game.character.skillId;
  const myCategory = SKILL_BY_ID[mine]!.category!;
  const elsewhere = SKILL_CATEGORIES.find((c) => c.id !== myCategory)!.id;
  const another = PLAYER_SKILLS.find((s) => s.id !== mine)!.id;

  /** Every surface a step could be pointing at when it fires. */
  const SITUATIONS: GuideCtx[] = [
    { ...AT },
    { ...AT, phase: 'running' },
    { ...AT, phase: 'results' },
    { ...AT, view: 'craft', phase: 'results', top: 'craft' },
    { ...AT, view: 'craft', phase: 'results', top: 'shop' },
    { ...AT, phase: 'results', top: 'shop' },
    { ...AT, phase: 'results', top: 'stash' },
    { ...AT, phase: 'results', top: 'sheet' },
    // The sheet with a slot already chosen. A distinct situation, because it
    // is the one where the next click leaves this window for the dock.
    { ...AT, phase: 'results', top: 'sheet', picking: 'weapon' },
    // All three depths of the Skills screen, plus the two wrong turns: a step
    // walking you to a node has to know the way back out of both.
    { ...AT, top: 'skills' },
    { ...AT, top: 'skills', category: myCategory },
    { ...AT, top: 'skills', category: myCategory, viewing: mine },
    { ...AT, top: 'skills', category: elsewhere },
    { ...AT, top: 'skills', category: myCategory, viewing: another },
    // Screens the opening never sends you to. Reachable anyway now that only
    // spending is locked, so every step has to know the way back out of them.
    { ...AT, top: 'history' },
    { ...AT, top: 'save' },
    { ...AT, phase: 'running', top: 'save' },
    { ...AT, view: 'craft', phase: 'running', top: 'craft' },
  ];

  const targetsOf = (s: (typeof TUTORIAL_STEPS)[number]): string[] =>
    typeof s.target === 'string'
      ? [s.target]
      : [
          ...new Set(
            SITUATIONS.map((c) => (s.target as (c: GuideCtx, g: GameState) => string)(c, game))
          ),
        ];

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
    EQUIP_SLOTS.some((s) => slotButtonId(s.id) === id) ||
    // The three depths of the Skills screen, minted per category, per skill
    // and per node of whichever web is up.
    SKILL_CATEGORIES.some((c) => skillCatId(c.id) === id) ||
    PLAYER_SKILLS.some((s) => skillRowId(s.id) === id) ||
    PLAYER_SKILLS.some((s) => treeFor(s.id).some((n) => skillNodeId(n.id) === id)) ||
    // Minted per item by the dock, so it exists exactly while that item does.
    [...game.inventory, ...Object.values(game.character.equipment)].some(
      (i) => dockSlotId(i.id) === id
    ) ||
    // Minted per crystal by the bench column and by the collection. A socketed
    // one is in the bench's column too, which is where the craft step points.
    ownedCrystals(game).some((i) => crystalSlotId(i.id) === id || crystalMoveId(i.id) === id);

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
      // A cleared run banks into the haul, so the step after this one has
      // something to take. Without it the step satisfies itself and proves
      // nothing about the screen it is teaching.
      bankToHaul(game, [makeGear('ash_wand', 1), makeGear('bulwark_helmet_t1', 8)]);
      // The clear ends at the mouth with the Lampwright in it.
      ctx.top = 'met';
      line(
        `  after the first clear: ${balance(game.wallet, 'gold')} gold, ` +
          `${game.inventory.length} items`
      );
    },
    () => {
      // The panel's one button: the weapon is handed over and it closes.
      takeHandover(game, { weapon: true, crystal: false, quests: [] });
      ctx.top = null;
    },
    () => {
      // The drops went to the haul, not the bag. Taking them is the step.
      ctx.top = 'haul';
      takeWhatFits(game);
    },
    () => { ctx.top = 'shop'; },
    () => { runRecipe(game.wallet, 'make_shard_of_making'); },
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
      const result = craft(wand, CURRENCY_BY_ID.shard_of_making, pool, rng);
      if (result.ok) replaceItem(game, result.item);
    },
    () => {
      const wand = craftItem(game)!;
      equipItem(game, wand, 'weapon');
    },
    // Close the sheet, dismiss the report, enter again.
    () => { ctx.view = 'run'; ctx.top = null; ctx.phase = 'running'; },
    // The first point, which is what the first crystal is bought with.
    () => {
      ctx.top = 'skills';
      ctx.category = myCategory;
      ctx.viewing = mine;
      const progress = skillProgress(game.character, mine);
      progress.allocated.push(pathToNotable(mine, progress.allocated)[0]!.id);
    },
    // Then the levels the notable costs, which is what the dormant stretch is.
    () => {
      const progress = skillProgress(game.character, mine);
      while (progress.level < INTRO.crystalSkillLevel) {
        addSkillXp(game.character, mine, xpToNext(progress.level));
      }
      for (const node of pathToNotable(mine, progress.allocated)) {
        progress.allocated.push(node.id);
      }
      ctx.top = null;
      ctx.category = null;
      ctx.viewing = null;
    },
    // The clear that buys puts him at the mouth holding it.
    () => {
      ctx.top = 'met';
      takeHandover(game, giftWaiting(game)!);
      // A meeting ends a descent and every ending opens the haul, so the step
      // after it is reached with one on top. That is the step's first branch.
      ctx.top = 'haul';
      bankToHaul(game, [makeGear('shiv', 8)]);
    },
    // Socketed BLANK: a level 1 crystal holds nothing, so all it does is make
    // the descent longer, and being used is what buys it a slot.
    () => {
      takeWhatFits(game);
      ctx.top = 'crystals';
      const crystal = crystalsIn(game)[0];
      socketItem(game, crystal, socketFor(game, crystal)!);
    },
    // Several cleared descents later it has room, and the guide comes back for
    // it. The count is measured in the collection section below.
    () => {
      while (modCapacity(socketed(game)[0]) === 0) {
        addCrystalXp(socketed(game)[0], xpForClear(0));
      }
      ctx.view = 'craft';
      ctx.top = 'craft';
      selectForCraft(game, socketed(game)[0]);
    },
    () => {
      const crystal = craftItem(game)!;
      const result = craft(crystal, CURRENCY_BY_ID[INTRO.scriptedCurrency], pool, rng);
      if (result.ok) replaceItem(game, result.item);
    },
  ];

  /** Whether a step that waits was DORMANT at the moment the guide reached it. */
  const asleepOnArrival = new Map<string, boolean>();

  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    const current = TUTORIAL_STEPS[step];
    if (current.waits) asleepOnArrival.set(current.id, current.waits(game, ctx));
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

  // The other shape a step can be in. A step that cannot be reached yet is
  // DORMANT — card down, lockdown off, nothing advancing — and that must never
  // read as stuck. Each one is asleep when the guide arrives at it and is woken
  // by the game rather than by the step in front of it.
  {
    const asleep = TUTORIAL_STEPS.filter((s) => s.waits);
    const fresh = createGame('fresh');
    check(
      asleep.length > 0 && asleep.every((s) => s.waits!(fresh, AT)),
      `${asleep.length} steps wait, and every one is dormant on a fresh character`,
      asleep.filter((s) => !s.waits!(fresh, AT)).map((s) => s.id).join(', ')
    );
    const awake = asleep.filter((s) => asleepOnArrival.get(s.id) !== true);
    check(
      awake.length === 0,
      'and every one was still asleep when the opening reached it',
      `already awake: ${awake.map((s) => s.id).join(', ')}`
    );
  }

  // Existing is not the same as reachable. The header and the Fissure panel sit
  // UNDER every popup, so a step still naming one of them while something is
  // open is pointing through a modal at a button nobody can click. That is the
  // shape of every hard lock this opening has had, and now only spending is
  // switched off, any screen can be the one in the way.
  const COVERED = new Set([
    'run-launch',
    'run-again',
    'run-loot',
    'dev-kit',
    ...['craft', 'shop', 'stash', 'character', 'skills', 'history', 'save', 'crystals'].map(
      (s) => `open-${s}`
    ),
  ]);
  const unreachable: string[] = [];
  for (const step of TUTORIAL_STEPS) {
    for (const ctx of SITUATIONS) {
      if (ctx.top === null && ctx.view !== 'craft') continue;
      const id = typeof step.target === 'function' ? step.target(ctx, game) : step.target;
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

  // No step may name a weapon it cannot know you are holding. The opening
  // used to say "Ash Wand" three times, which is a lie to every character who
  // took Strike and was handed a sword — and would be a fresh lie for every
  // weapon added after.
  {
    const wrong: string[] = [];
    for (const skill of PLAYER_SKILLS) {
      const at = createGame('fresh');
      at.character = makeCharacter({}, skill.id);
      const mine = lampwrightWeapon(at)?.item;
      if (!mine) continue;
      // Every OTHER weapon in the game: none of their names may appear.
      const theirs = WEAPON_BASES.filter((b) => b.id !== mine.base).map((b) => b.name);
      for (const step of TUTORIAL_STEPS) {
        for (const situation of SITUATIONS) {
          const said =
            typeof step.text === 'function' ? step.text(situation, at) : step.text;
          for (const name of theirs) {
            if (said.includes(name)) wrong.push(`${skill.id}/${step.id}: "${name}"`);
          }
        }
      }
    }
    check(
      wrong.length === 0,
      'and no step names a weapon the character is not holding',
      [...new Set(wrong)].join(', ')
    );
  }

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
  // A first run drops things. Benching a dropped item that already has
  // modifiers used to satisfy "put your wand on the bench" AND the step after
  // it, which waits for a modifier to appear — so the shard the guide just
  // walked you to the shop for was never spent on anything.
  {
    const step = TUTORIAL_STEPS.find((s) => s.id === 'select_weapon')!;
    const at = createGame('fresh');
    const ctx: GuideCtx = {
      view: 'craft',
      top: 'craft',
      phase: 'menu',
      picking: null,
      category: null,
      viewing: null,
    };

    // Everything a first run can drop, in the shapes that fooled every earlier
    // reading of this step: a modded piece, a blank helmet, and — the one that
    // beat "any blank weapon" — a blank wand off the floor.
    const impostors = [
      rollGear('cudgel', 20, 2, pool, new Rng(5)),
      makeGear('bulwark_helmet_t1', 20),
      makeGear('ash_wand', 1),
    ];
    const fooled: string[] = [];
    for (const item of impostors) {
      at.inventory = [item];
      selectForCraft(at, item);
      if (step.done(at, ctx)) fooled.push(item.name);
    }
    check(fooled.length === 0, 'nothing a first run drops passes for your wand', fooled.join(', '));

    // The one the Lampwright hands you, marked by lampwrightWeapon.
    const given = createGame('fresh');
    given.firstClearDone = false;
    const gift = lampwrightWeapon(given)!.item;
    selectForCraft(given, gift);
    check(
      step.done(given, ctx) &&
        TUTORIAL_STEPS.find((s) => s.id === 'use_making')!.done(given, ctx) === false,
      'and the one it hands you does, with the modifier step still waiting',
      'the gifted wand did not satisfy the step it is meant to'
    );

    // The mark has to survive being worked on, or the step it teaches breaks
    // the moment you use the shard it just sent you to buy.
    const worked = craft(gift, CURRENCY_BY_ID.shard_of_making, pool, new Rng(3));
    check(
      worked.ok && worked.item.meta.firstClear === true,
      'and it keeps the mark through a craft',
      'crafting the wand lost what identifies it'
    );

    // A save from before the mark: heal() picks one, ONCE, so an opening in
    // progress is not left pointing at nothing.
    const old = createGame('fresh');
    old.firstClearDone = true;
    old.inventory = [makeGear('ash_wand', 1), makeGear('bulwark_helmet_t1', 20)];
    heal(old);
    check(
      giftWeapon(old)?.base === 'ash_wand',
      'and a save that predates it is marked on load',
      `heal marked ${giftWeapon(old)?.name ?? 'nothing'}`
    );
  }

  // The guide walks you into wearing one benched item and socketing another.
  // Neither move may lose the bench: worn gear and socketed crystals are both
  // worked on where they live, which is what the two columns beside it are for.
  const benched = craftItem(game);
  check(
    benched !== null && socketed(game).some((c) => c.id === benched.id),
    'the benched crystal stays on the bench once you socket it',
    'socketing the benched crystal lost it — the bench resolves to nothing'
  );
  const armed = game.character.equipment.weapon!;
  selectForCraft(game, armed);
  check(
    craftItem(game)?.id === armed.id,
    'and it reaches a weapon you are wearing',
    'wearing the benched item lost it — the bench resolves to nothing'
  );
  // The gold it hands out has to cover the two purchases it then asks for,
  // and the shelves are locked, so there is no recovering from a shortfall.
  const asked = ['make_shard_of_making'];
  const bill = asked.reduce(
    (n, id) => n + (RECIPES.find((r) => r.id === id)?.inputs.gold ?? 0),
    0
  );
  check(
    FISSURE.firstClear.gold >= bill,
    `the first clear pays ${FISSURE.firstClear.gold} gold and asks for ${bill} of it`,
    `it pays ${FISSURE.firstClear.gold} but asks for ${bill}`
  );
  // Where it leaves you: armed, and one socket filled with a crystal that has
  // a modifier on it — every screen the game asks you to use, used once.
  const set = socketed(game);
  check(
    !!game.character.equipment.weapon && set.length === 1 && set[0].mods.length === 1,
    'the opening ends armed, with one crystal socketed and rolled',
    `weapon ${game.character.equipment.weapon?.base ?? 'none'}, ` +
      `${set.length} socketed, ${set[0]?.mods.length ?? 0} modifiers`
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
  // radius 0: a POINT target, so what follows measures the mechanic rather
  // than how fat the thing standing in it happens to be.
  const dummy = (x: number, y: number, life = 1e6) =>
    ({
      x, y, life, radius: 0, dead: false, ailments: [] as unknown[],
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
      x, y, life, radius: 0, dead: false, ailments: [] as unknown[],
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

// A flat damage line with no damage type on it is counted ONCE PER TYPE —
// eight times over — because an untagged line satisfies every pass. "Increased"
// survives it, since seven of the eight passes have a zero base to scale, so
// this only bites flat. Nothing in the game does it today, and the sheet would
// now show the eight rows, but the mod itself would still read "+10 Damage".
{
  const types = new Set(DAMAGE_TYPES.map((d) => d.id));
  const untyped: string[] = [];
  const scan = (where: string, lines: Array<{ stat: string; form: string; tags?: string[] }>) => {
    for (const line of lines) {
      if (line.stat !== 'damage' || line.form !== 'flat') continue;
      if (!(line.tags ?? []).some((t) => types.has(t))) untyped.push(where);
    }
  };
  for (const mod of ALL_MODS) {
    for (const tier of mod.tiers) scan(`${mod.id} T${tier.ilvl}`, tier.stats);
  }
  // Implicits aggregate exactly like rolled mods, and every flat typed damage
  // line in the game is one — a scan that skips them tests almost nothing.
  for (const base of GEAR_BASES) scan(base.id, base.implicit ?? []);
  for (const skill of SKILLS) {
    for (const node of treeFor(skill.id)) scan(`${skill.id}/${node.id}`, node.stats ?? []);
  }
  check(
    untyped.length === 0,
    'no flat damage line is missing its damage type',
    `counted once per type, so worth eight times its text: ${untyped.join(', ')}`
  );
}

// The sheet takes the damage number apart. It has to be the SAME number: a
// breakdown that does not add up to the stat is worse than no breakdown, and
// the two are only one function apart.
{
  const game = createGame('dev');
  for (const skillId of ['strike', 'fireball', 'blight']) {
    game.character.skillId = skillId;
    const detail = damageDetail(game.character);
    const parts = detail.breakdown.parts.reduce((n, p) => n + p.total, 0);
    check(
      Math.abs(parts - characterStats(game.character).damage) < 1e-9,
      `${skillId}: the parts add up to the damage stat`,
      `${parts.toFixed(4)} in parts, sheet says ${characterStats(game.character).damage.toFixed(4)}`
    );
  }

  // The question the tags invite: flat damage of a type your skill does not
  // deal still counts, and it stays THAT type. Only the skill's own damage is
  // poison, which is what makes a cold ring different from a fire one.
  game.character.skillId = 'blight';
  const blight = damageDetail(game.character);
  check(
    blight.breakdown.baseType === 'poison',
    "Blight's own damage is Poison",
    `deals ${blight.breakdown.baseType}`
  );
  check(
    blight.breakdown.parts.some((p) => p.total > 0 && p.type !== 'poison'),
    'and off-type damage really does reach it, which is why the sheet says so',
    'nothing off-type in the dev loadout, so the rule is untested here'
  );
  check(
    Object.keys(blight.breakdown.byType).filter((t) => t !== 'poison').length > 0,
    'and it is delivered as its own type, not folded into the poison',
    `delivered as ${Object.keys(blight.breakdown.byType).join(', ')}`
  );

  // The whole point of a damage type. Two rings, same number, different word:
  // if the skill converted them they would be interchangeable, and picking one
  // over the other would never be a decision.
  const probe = (type: string, value: number): RolledMod => ({
    entryId: 'probe', defId: 'probe', group: 'probe', slot: 'offence',
    name: 'probe', tier: 1, tags: [],
    stats: [{ stat: 'damage', form: 'flat', value, tags: [type] }],
  });
  const fireball = SKILL_BY_ID.fireball;
  const asCold = damageBreakdown([probe('cold', 20)], 1, fireball);
  const asFire = damageBreakdown([probe('fire', 20)], 1, fireball);

  check(
    Math.abs(asCold.total - asFire.total) < 1e-9,
    'a ring of 20 Cold and a ring of 20 Fire are worth the same on paper',
    `${asCold.total.toFixed(2)} against ${asFire.total.toFixed(2)}`
  );
  // Against something that resists fire, though — which is the only place the
  // difference can show, and where it used to be invisible.
  const versusFireResist = (b: typeof asCold) =>
    Object.entries(b.byType).reduce((n, [t, v]) => n + v * (t === 'fire' ? 0.5 : 1), 0);
  check(
    versusFireResist(asCold) > versusFireResist(asFire) + 1e-9,
    'and against something that resists Fire, the Cold one is plainly better',
    `cold ${versusFireResist(asCold).toFixed(2)} vs fire ${versusFireResist(asFire).toFixed(2)} — ` +
      'the skill is converting them, so the type is decoration'
  );
  check(
    blight.seconds > 0 && blight.maxStacks === AILMENT.maxStacks,
    'a lasting skill reports the duration and the stack cap the sim enforces',
    `${blight.seconds}s, ${blight.maxStacks} stacks`
  );

  game.character.skillId = 'strike';
  check(
    damageDetail(game.character).seconds === 0,
    'and a skill that hits reports no duration at all',
    'a hit claims a duration'
  );
}

// ===========================================================================
rule('THE SHEET — does every number on it survive being checked?');

// The sheet is the only place the rules are stated, so a number that is subtly
// wrong there is worse than no sheet: it teaches a rule the fight does not
// follow, and nothing else in the game contradicts it.
//
// So none of this trusts the same function twice. The parts are re-multiplied
// from their own fields, the printed working is read back as algebra, and what
// a cast is worth is checked against the multiplier the SIM actually asks for.
{
  /** Characters worth checking: every skill, bare and deep into its own tree. */
  const subjects: Array<{ name: string; character: Character }> = [];
  for (const skill of PLAYER_SKILLS) {
    for (const [label, level, walkTo] of [
      ['bare, level 1', 1, 0],
      ['geared, level 20', 20, 0],
      ['half a tree', 20, 14],
      ['a deep tree', 40, 40],
    ] as Array<[string, number, number]>) {
      const character = createGame(walkTo === 0 && level === 1 ? 'fresh' : 'dev').character;
      character.skillId = skill.id;
      character.level = level;
      const progress = skillProgress(character, skill.id);
      // A real walk, not a random set: allocation rules are what decide which
      // notables can be reached together, and an impossible build proves nothing.
      const tree = treeFor(skill.id);
      const rng = new Rng(4);
      while (progress.allocated.length < walkTo) {
        const open = tree.filter((n) => canAllocate(skill.id, n.id, progress.allocated));
        if (open.length === 0) break;
        const node = rng.pick(open)!;
        progress.allocated.push(node.id);
        // A choice node grants nothing until it is answered, and the ailment
        // multipliers this section exists to catch live behind choices.
        if (node.choices?.length) (progress.choices ??= {})[node.id] = rng.pick(node.choices)!.id;
      }
      subjects.push({ name: `${skill.name}, ${label}`, character });
    }
  }

  /** The run of minors in front of a node, so a walk can be aimed rather than hoped for. */
  const pathTo = (skillId: string, targetId: string): string[] => {
    const from = new Map<string, string | null>([[CENTRE, null]]);
    const queue: string[] = [CENTRE];
    while (queue.length > 0) {
      const at = queue.shift()!;
      if (at === targetId) break;
      for (const next of neighboursOf(skillId, at)) {
        if (from.has(next)) continue;
        from.set(next, at);
        queue.push(next);
      }
    }
    if (!from.has(targetId)) return [];
    const out: string[] = [];
    for (let at: string | null = targetId; at && at !== CENTRE; at = from.get(at) ?? null) {
      out.unshift(at);
    }
    return out;
  };

  // A random walk found no node that scales an ailment DOWN, and one of those
  // is exactly what made the sheet disagree with itself. Every node that
  // touches a damage multiplier gets walked to on purpose, choices and all.
  for (const skill of PLAYER_SKILLS) {
    for (const node of treeFor(skill.id)) {
      const options = node.choices?.length ? node.choices.map((c) => c.id) : [null];
      for (const choice of options) {
        const grants = { ...(node.grants ?? {}), ...(node.choices?.find((c) => c.id === choice)?.grants ?? {}) };
        if (!('ailmentMultiplier' in grants) && !('convertTree' in grants)) continue;

        const path = pathTo(skill.id, node.id);
        if (path.length === 0) continue;
        const character = createGame('dev').character;
        character.skillId = skill.id;
        character.level = 30;
        const progress = skillProgress(character, skill.id);
        progress.allocated = path;
        if (choice) (progress.choices ??= {})[node.id] = choice;
        subjects.push({ name: `${skill.name} → ${node.id}${choice ? `/${choice}` : ''}`, character });
      }
    }
  }

  const wrong: string[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-9);

  for (const { name, character } of subjects) {
    const detail = damageDetail(character);
    const stats = characterStats(character);
    const { breakdown } = detail;

    // 1. The parts add up to the total printed under them — AND to the number
    //    in the row the breakdown opened. Only the second catches a factor
    //    applied where the workings cannot show it: a breakdown can be
    //    perfectly self-consistent and still not explain the row above it.
    const summed = breakdown.parts.reduce((n, p) => n + p.total, 0);
    if (!near(summed, breakdown.total)) {
      wrong.push(`${name}: parts sum to ${summed.toFixed(4)}, total says ${breakdown.total.toFixed(4)}`);
    }
    if (!near(summed, detail.perApplication)) {
      wrong.push(
        `${name}: breakdown shows ${summed.toFixed(4)}, the damage row shows ${detail.perApplication.toFixed(4)}`
      );
    }

    // 2. Each part is what its own fields say it is — re-multiplied here rather
    //    than taken from the function that produced it.
    const factor = breakdown.steps.reduce((n, s) => n * s.value, 1);
    for (const part of breakdown.parts) {
      const expect =
        (part.base + part.flat * part.added) *
        (1 + part.increased / 100) *
        part.more.reduce((n, m) => n * (1 + m / 100), 1) *
        factor;
      if (!near(part.total, expect)) {
        wrong.push(`${name}: ${part.type} shows ${part.total.toFixed(4)}, its own fields give ${expect.toFixed(4)}`);
      }
    }

    // 3. The working PRINTED beside a part must come to the number printed with
    //    it. This is the check that a hidden multiplier fails: the algebra on
    //    screen has to be the algebra that produced the answer.
    for (const part of breakdown.parts) {
      if (part.total === 0) continue;
      const said = readWorkings(damageWorkings(part, breakdown.steps));
      // Its inputs are printed rounded, so this can only be close — but a
      // factor left out of the text is never close.
      if (Math.abs(said - part.total) > Math.max(1.5, part.total * 0.02)) {
        wrong.push(
          `${name}: "${damageWorkings(part, breakdown.steps)}" reads as ${said.toFixed(1)}, printed as ${Math.round(part.total)}`
        );
      }
    }

    // 4. The stat the SIM reads is the breakdown without the per-cast steps.
    //    stats.damage is what a monster is hit with; the sheet's per-cast
    //    number is that with the tree's ailment scaling on top.
    const bare = damageBreakdown(
      statMods(character),
      character.level,
      effectiveSkill(SKILL_BY_ID[character.skillId], treeGrants(character)),
      treeGrants(character)
    );
    if (!near(bare.total, stats.damage)) {
      wrong.push(`${name}: sim reads ${stats.damage.toFixed(4)}, sheet computes ${bare.total.toFixed(4)}`);
    }

    // 4b. And what the sim DELIVERS is those parts, still typed. A total that
    //     matches while the split does not is exactly the old bug: every point
    //     arriving as one type, so no type was worth choosing over another.
    const delivered = Object.values(stats.damageByType).reduce((n, v) => n + v, 0);
    if (!near(delivered, stats.damage)) {
      wrong.push(`${name}: delivers ${delivered.toFixed(4)} across types, damage says ${stats.damage.toFixed(4)}`);
    }
    for (const part of bare.parts) {
      if (part.total === 0) continue;
      if (!near(stats.damageByType[part.type] ?? 0, part.total)) {
        wrong.push(
          `${name}: ${part.type} is worth ${part.total.toFixed(4)} on the sheet, ` +
            `${(stats.damageByType[part.type] ?? 0).toFixed(4)} to the sim`
        );
      }
    }

    // 5. damage/sec, recomputed from the rules rather than read back.
    const stacks = detail.seconds > 0 ? Math.min(AILMENT.maxStacks, stats.attacksPerSecond * detail.seconds) : 0;
    const dps =
      detail.seconds > 0
        ? (stacks * detail.perApplication) / detail.seconds
        : detail.perApplication * stats.attacksPerSecond;
    if (!near(dps, detail.perSecond)) {
      wrong.push(`${name}: damage/sec says ${detail.perSecond.toFixed(4)}, rules give ${dps.toFixed(4)}`);
    }
  }

  for (const entry of wrong.slice(0, 6)) line(`  ${entry}`);
  check(
    wrong.length === 0,
    `every number on the sheet holds up, across ${subjects.length} characters`,
    `${wrong.length} wrong — see above`
  );

  // A check that never meets the awkward case is not a check. These are the
  // shapes the arithmetic above exists to police, and each has to appear in
  // the matrix or the pass above is a pass over nothing.
  const seen = subjects.map(({ character }) => damageDetail(character).breakdown);
  const wants: Array<[string, boolean]> = [
    ['added damage worth other than 100%', seen.some((b) => b.parts.some((p) => p.flat !== 0 && p.added !== 1))],
    ['a tree scaling the ailment', seen.some((b) => b.steps.length > 0)],
    ['one that scales it DOWN', seen.some((b) => b.steps.some((s) => s.value < 1))],
    ['a "more" line', seen.some((b) => b.parts.some((p) => p.more.length > 0))],
    ['damage of a type the skill does not deal', seen.some((b) => b.parts.some((p) => p.total > 0 && p.type !== b.baseType))],
    ['more than one type delivered at once', seen.some((b) => Object.keys(b.byType).length > 1)],
    ['scaling with nothing to scale', seen.some((b) => b.parts.some((p) => p.total === 0))],
  ];
  const missing = wants.filter(([, met]) => !met).map(([what]) => what);
  check(
    missing.length === 0,
    'and the characters checked actually cover every shape it polices',
    `never exercised: ${missing.join(', ')}`
  );
}

// The last question, and the only one that cannot be answered by arithmetic:
// does the SIM ask for what the sheet promised? The sheet says a cast of Blight
// is worth N over T seconds. The behaviour is what decides the multiplier the
// sim then puts against stats.damage, so that is where the promise is kept or
// broken.
{
  const dummy = (x: number, y: number) =>
    ({ x, y, life: 1e6, radius: 0, dead: false, ailments: [] as unknown[], stats: { maxLife: 1e6, attacksPerSecond: 1 } }) as any;

  /** What one cast asks the sim for, against a single enemy standing on you. */
  const castOnce = (skillId: string, grants: Record<string, unknown>) => {
    const skill = SKILL_BY_ID[skillId];
    const user = dummy(0, 0);
    const target = dummy(0.2, 0);
    const asked: Array<{ multiplier: number; seconds: number }> = [];
    SKILL_BEHAVIOURS[skill.behaviour]({
      skill, user, primary: target, enemies: [target],
      rng: new Rng(3), grants, crit: false, castIndex: 0,
      hit: (_t: any, multiplier: number) => asked.push({ multiplier, seconds: 0 }),
      ailment: (_t: any, multiplier: number, seconds: number) => asked.push({ multiplier, seconds }),
      areaRadius: (base: number) => base,
      vfx: () => {},
    } as any);
    return asked[0];
  };

  const mismatched: string[] = [];
  for (const skill of PLAYER_SKILLS) {
    for (const walkTo of [0, 12, 30]) {
      const character = createGame('dev').character;
      character.skillId = skill.id;
      character.level = 24;
      const progress = skillProgress(character, skill.id);
      const tree = treeFor(skill.id);
      const rng = new Rng(11);
      while (progress.allocated.length < walkTo) {
        const open = tree.filter((n) => canAllocate(skill.id, n.id, progress.allocated));
        if (open.length === 0) break;
        const node = rng.pick(open)!;
        progress.allocated.push(node.id);
        if (node.choices?.length) (progress.choices ??= {})[node.id] = rng.pick(node.choices)!.id;
      }

      const grants = treeGrants(character);
      const detail = damageDetail(character);
      const stats = characterStats(character);
      const asked = castOnce(skill.id, grants);
      if (!asked) {
        mismatched.push(`${skill.id}@${walkTo}: the behaviour asked for nothing`);
        continue;
      }

      // What the sim will actually compute, from its own two numbers.
      const simWorth = stats.damage * asked.multiplier;
      const gap = Math.abs(simWorth - detail.perApplication);
      if (gap > Math.max(1e-9, detail.perApplication * 1e-9)) {
        mismatched.push(
          `${skill.id}@${walkTo}: sheet promises ${detail.perApplication.toFixed(2)} per ` +
            `${detail.seconds > 0 ? 'cast' : 'hit'}, sim asks for ${simWorth.toFixed(2)}`
        );
      }
      if (detail.seconds > 0 && Math.abs(asked.seconds - detail.seconds) > 1e-9) {
        mismatched.push(
          `${skill.id}@${walkTo}: sheet says ${detail.seconds}s, sim applies ${asked.seconds}s`
        );
      }
    }
  }

  for (const entry of mismatched.slice(0, 6)) line(`  ${entry}`);
  check(
    mismatched.length === 0,
    'and the sim asks for exactly what the sheet promised',
    `${mismatched.length} promises broken — see above`
  );
}

// A hit is delivered from `damageByType`, so anything that scales `damage`
// alone is a monster that hits for a number nothing on it claims. Rank and
// finale multipliers both did exactly that, and nothing else here noticed:
// every other check reads `damage`.
{
  const off: string[] = [];
  const ranged = new Set<number>();
  const wrongType: string[] = [];
  const ranks = new Set<string>();
  let sawFinale = false;

  for (const seed of [3, 9, 21, 44]) {
    const c = rollCrystal(4, pool, rng);
    const sim = new RunSim([c], ladderCharacter(6, new Rng(seed)), new Rng(seed));
    for (const m of sim.state.monsters) if (m.skillId) ranged.add(m.id);

    // Run it out so the finale spawns and is checked with the rest.
    for (let i = 0; i < 40000 && sim.state.status === 'running'; i++) sim.step(1 / 30);

    for (const m of sim.state.monsters) {
      if (m.rank) ranks.add(m.rank);
      if (!ranged.has(m.id) && m.skillId) sawFinale = true;
      const summed = Object.values(m.stats.damageByType).reduce((n, v) => n + v, 0);
      if (Math.abs(summed - m.stats.damage) > 1e-9) {
        off.push(`${m.sprite}/${m.rank}: hits for ${summed.toFixed(2)}, stats say ${m.stats.damage.toFixed(2)}`);
      }
      // A bolt is fire whatever the map is made of. Typed off the crystal it
      // would arrive as physical and walk straight past your fire resistance.
      const want = m.skillId ? SKILL_BY_ID[m.skillId]?.damageTypes[0] : m.stats.damageType;
      if (want && !(want in m.stats.damageByType)) {
        wrongType.push(`${m.sprite} should deal ${want}, deals ${Object.keys(m.stats.damageByType).join(', ')}`);
      }
    }
    if (sim.state.finale) sawFinale = true;
  }

  for (const entry of [...off, ...wrongType].slice(0, 6)) line(`  ${entry}`);
  check(
    off.length === 0,
    `what a monster hits for is what its stats say, across ${ranks.size} ranks and the finale`,
    `${off.length} deal a number nothing on them claims — see above`
  );
  check(
    wrongType.length === 0,
    'and a monster casting a spell delivers the SPELL’s type, not the crystal’s',
    `${wrongType.length} deal the wrong type — see above`
  );
  check(
    ranks.size > 1 && ranged.size > 0 && sawFinale,
    'and the runs checked actually contained several ranks, a caster and a finale',
    `${ranks.size} ranks, ${ranged.size} casters, finale ${sawFinale ? 'seen' : 'never reached'}`
  );
}

// ===========================================================================
rule('FAMILIES — a different fight, or a harder one?');

// A family decides WHICH monsters spawn and nothing else: difficulty is
// socketed modifiers, all of it. So three sets that differ only in family have
// to come out the same fight, which is asked twice — the pools have to weigh
// the same on paper, and the same character has to clear them in the same time.
{
  const weighted = (kinds: MonsterDef[], of: (m: MonsterDef) => number): number =>
    kinds.reduce((a, m) => a + m.weight * of(m), 0) / kinds.reduce((a, m) => a + m.weight, 0);
  const threat = (m: MonsterDef) => m.life * m.damage * m.attacksPerSecond;

  line('  family     kinds   threat     life   damage      aps    speed');
  for (const f of MONSTER_FAMILIES) {
    const kinds = MONSTERS_BY_FAMILY[f.id];
    line(
      `  ${f.id.padEnd(9)}  ${String(kinds.length).padStart(5)}   ` +
        [threat, (m: MonsterDef) => m.life, (m: MonsterDef) => m.damage,
         (m: MonsterDef) => m.attacksPerSecond, (m: MonsterDef) => m.moveSpeed]
          .map((of) => weighted(kinds, of).toFixed(3).padStart(6))
          .join('   ')
    );
  }

  const empty = MONSTER_FAMILIES.filter((f) => MONSTERS_BY_FAMILY[f.id].length < 4);
  check(
    empty.length === 0,
    `all ${MONSTER_FAMILIES.length} families field a pool of their own`,
    `nothing to spawn for: ${empty.map((f) => f.id).join(', ')}`
  );

  // Threat is life × damage × rate: what one monster is worth as a fight. A
  // family that beat the others on it would be a difficulty setting wearing a
  // costume, which is the one thing the socket model does not allow.
  const threats = MONSTER_FAMILIES.map((f) => weighted(MONSTERS_BY_FAMILY[f.id], threat));
  const mean = threats.reduce((a, b) => a + b, 0) / threats.length;
  const drift = Math.max(...threats.map((t) => Math.abs(t - mean) / mean));
  check(
    drift <= 0.1,
    `and none of them weighs more than the others: ${(drift * 100).toFixed(1)}% off the mean`,
    `${(drift * 100).toFixed(1)}% apart — one family is a difficulty axis`
  );

  // The paper version can be right while the fight is not — reach, speed and
  // body size all land somewhere the stat table cannot see. And two of the
  // three worlds bring AURAS, which the paper cannot see either: what the
  // pools weigh is held equal, and what they bring with them is the ladder.
  line();
  line('  a level 16 Strike character against four blank crystals of one world');
  line('  world       time   taken   per sec   deaths');
  const seeds = [3, 5, 7, 11, 13, 17];
  const room = (families: MonsterFamily[]) => {
    let time = 0;
    let taken = 0;
    let deaths = 0;
    for (const seed of seeds) {
      const hero = ladderCharacter(2, new Rng(99));
      const set = families.map((f) => makeCrystal(1, f));
      const s = runToCompletion(new RunSim(set, hero, new Rng(seed * 37)));
      time += s.elapsed;
      taken += Object.values(s.damageTaken).reduce((a, b) => a + b, 0);
      if (s.status === 'died') deaths++;
    }
    return { perSec: taken / time, deaths, time: time / seeds.length, taken: taken / seeds.length };
  };

  const four = (f: MonsterFamily) => RUN_SLOTS.map(() => f);
  const lived: Record<string, ReturnType<typeof room>> = {};
  for (const f of MONSTER_FAMILIES) {
    lived[f.id] = room(four(f.id));
    const r = lived[f.id];
    line(
      `  ${f.id.padEnd(10)} ${r.time.toFixed(0).padStart(4)}s   ` +
        `${Math.round(r.taken).toString().padStart(5)}   ${r.perSec.toFixed(1).padStart(7)}   ` +
        `${String(r.deaths).padStart(6)}`
    );
  }
  lived.seam = room(['demonic', 'demonic', 'prismatic', 'prismatic']);
  line(
    `  seam       ${lived.seam.time.toFixed(0).padStart(4)}s   ` +
      `${Math.round(lived.seam.taken).toString().padStart(5)}   ` +
      `${lived.seam.perSec.toFixed(1).padStart(7)}   ${String(lived.seam.deaths).padStart(6)}`
  );

  // The ladder, which is a DECISION rather than a drift: the Fissure is the
  // shallow end, the two worlds that carry auras are harder than it, and the
  // Seam — where the two kinds of aura multiply — is the worst room going.
  check(
    lived.demonic.perSec > lived.normal.perSec * 1.15 &&
      lived.prismatic.perSec > lived.normal.perSec * 1.15 &&
      lived.seam.perSec > Math.max(lived.demonic.perSec, lived.prismatic.perSec),
    'Normal is the shallow end, the aura worlds are harder, and the Seam is the worst of them',
    `${lived.normal.perSec.toFixed(1)} / ${lived.demonic.perSec.toFixed(1)} / ` +
      `${lived.prismatic.perSec.toFixed(1)} / ${lived.seam.perSec.toFixed(1)} per second`
  );
  // Harder, never a wall: the same under-geared character still walks out of
  // every one of them more often than not.
  const walls = Object.entries(lived).filter(([, r]) => r.deaths > seeds.length / 2);
  check(
    walls.length === 0,
    'and none of the four is a wall for the character that clears the Fissure',
    walls.map(([k, r]) => `${k} killed it ${r.deaths}/${seeds.length}`).join(', ')
  );

  // Each socketed crystal converts its share, and the share is exact rather
  // than rolled. Whole packs, so it lands on the nearest pack either way.
  const share = composition([makeCrystal(1, 'demonic'), makeCrystal(1, 'demonic'),
                             makeCrystal(1, 'demonic'), makeCrystal(1, 'normal')]);
  const plan = familyPlan(share, 20);
  const dealt = plan.filter((f) => f === 'demonic').length;
  check(
    plan.length === 20 && dealt === 15,
    'three demonic and one normal takes exactly three quarters of the packs',
    `${dealt} demonic packs of ${plan.length}, wanted 15 of 20`
  );

  const miscounted = [1, 3, 7, 12, 25, 40].filter(
    (packs) => familyPlan(share, packs).length !== packs
  );
  check(
    miscounted.length === 0,
    'and every pack in the run belongs to somebody, however the shares divide',
    `packs left unassigned at: ${miscounted.join(', ')}`
  );

  // What a set actually spawns, rather than what it planned to. Sprite ids are
  // monster ids, which is what makes this readable from the entities.
  const familyOf = new Map(MONSTERS.map((m) => [m.sprite, m.family]));
  const strays: string[] = [];
  for (const set of [['demonic'], ['prismatic'], ['demonic', 'prismatic']] as MonsterFamily[][]) {
    const crystals = set.map((f) => makeCrystal(1, f));
    const sim = new RunSim(crystals, makeCharacter(starterLoadout(new Rng(7)), 'strike'), new Rng(5));
    const wrong = sim.state.monsters.filter((m) => !set.includes(familyOf.get(m.sprite)!));
    if (wrong.length > 0) strays.push(`${set.join('+')} spawned ${wrong.length} outsiders`);
  }
  check(
    strays.length === 0,
    'and a socketed world is the only one that turns up in it',
    strays.join('; ')
  );
}

// ===========================================================================
rule('AURAS — do the two worlds multiply each other?');

// The claim: one world adds a fixed amount, the other multiplies, and a room
// holding both multiplies what the other added. That cross term is the whole
// design, so it is checked where it is unambiguous — on the arithmetic — and
// then looked for in a real room.
{
  const carriers = MONSTERS.filter((m) => m.aura);
  line(`  ${carriers.length} kinds carry one: ${carriers.map((m) => `${m.name} (${m.aura})`).join(', ')}`);
  check(
    carriers.every((m) => AURA_BY_ID[m.aura!]) && carriers.length >= 4,
    'every carrier names an aura that exists',
    carriers.filter((m) => !AURA_BY_ID[m.aura!]).map((m) => m.id).join(', ')
  );
  // One family adds, the other multiplies. If both did the same thing there
  // would be no interaction to have.
  const adds = AURAS.filter((a) => a.flatDamage || a.flatArmour);
  const multiplies = AURAS.filter((a) => a.incDamage || a.incArmour);
  check(
    adds.every((a) => a.family === 'demonic') &&
      multiplies.every((a) => a.family === 'prismatic') &&
      adds.length === multiplies.length,
    `${adds.length} auras add a fixed amount and ${multiplies.length} multiply, split cleanly by world`,
    AURAS.map((a) => `${a.id}:${a.family}`).join(' ')
  );

  // The arithmetic, on one monster's swing. `sum` is what each aura is worth
  // ALONE, added together — the number the pair has to beat to be an
  // interaction rather than two effects in the same room.
  const swing = 10;
  const chant = AURA_BY_ID.chant.flatDamage! * swing;
  const resonance = AURA_BY_ID.resonance.incDamage! / 100;
  const withChant = swing + chant;
  const withResonance = swing * (1 + resonance);
  const withBoth = (swing + chant) * (1 + resonance);
  const sum = swing + (withChant - swing) + (withResonance - swing);
  line(
    `  a swing of ${swing}: chanted ${withChant.toFixed(1)}, resonant ${withResonance.toFixed(1)}, ` +
      `both ${withBoth.toFixed(1)} against a sum of ${sum.toFixed(1)}`
  );
  check(
    withBoth > sum * 1.05,
    `both together beat the sum of each alone by ${(((withBoth - sum) / sum) * 100).toFixed(0)}%`,
    `${withBoth.toFixed(2)} against ${sum.toFixed(2)}`
  );

  // Armour is the sharper version: nothing multiplies an armour of zero, so
  // the Cavern's aura is worth nothing at all until the Rot's has landed.
  const bare = armourReduction(0);
  const flatOnly = armourReduction(AURA_BY_ID.bulwark.flatArmour!);
  const incOnly = armourReduction(0 * (1 + AURA_BY_ID.refraction.incArmour! / 100));
  const both = armourReduction(
    AURA_BY_ID.bulwark.flatArmour! * (1 + AURA_BY_ID.refraction.incArmour! / 100)
  );
  line(
    `  a bare monster turns aside ${bare.toFixed(0)}%, bulwarked ${flatOnly.toFixed(0)}%, ` +
      `refracted ${incOnly.toFixed(0)}%, both ${both.toFixed(0)}%`
  );
  check(
    incOnly === bare && both > flatOnly,
    'and a multiplier alone does nothing to armour nobody granted',
    `${bare} / ${flatOnly} / ${incOnly} / ${both}`
  );

  // In a real room: a carrier never buffs itself, and everything standing in
  // its circle does get the boost.
  const sim = new RunSim(
    [makeCrystal(1, 'demonic'), makeCrystal(1, 'prismatic')],
    ladderCharacter(3, new Rng(21)),
    new Rng(63)
  );
  for (let i = 0; i < 40; i++) sim.step(TICK);
  const state = sim.state;
  const boosted = state.monsters.filter((m) => m.boost);
  const selfBuffed = state.monsters.filter(
    (m) =>
      m.aura &&
      m.boost &&
      !state.monsters.some(
        (o) => o !== m && !o.dead && o.aura && Math.hypot(o.x - m.x, o.y - m.y) <= AURA.radius
      )
  );
  line(`  ${boosted.length} of ${state.monsters.length} monsters are standing in something`);
  check(
    boosted.length > 0 && selfBuffed.length === 0,
    'a carrier never buffs itself, and its neighbours are the ones that gain',
    `${selfBuffed.length} are carrying their own aura`
  );

  // Both renderers read one function for the ring, so the two kinds cannot be
  // the same colour in one and different in the other.
  const looks = AURAS.map((a) => auraLook(PALETTE, a));
  check(
    new Set(looks.map((l) => l.colour)).size === 2 &&
      looks.every((l) => l.alpha > 0 && l.alpha < 0.4),
    'and each world draws its reach in its own ink, quietly enough to fight over',
    looks.map((l) => `${l.colour}@${l.alpha}`).join(' ')
  );
}

// ===========================================================================
rule('THEMES — does the composition change the rock you stand on?');

// A theme is a LOOK, decided by the same shares that decide the packs. Two
// things have to hold: the thresholds are what the design says, and the four
// worlds are actually distinguishable — a tileset that renders identically to
// another one is a tileset nobody added.
{
  const of = (...families: MonsterFamily[]) =>
    mapTheme(composition(families.map((f) => makeCrystal(1, f))));

  const cases: Array<[MapTheme, MonsterFamily[]]> = [
    ['fissure', []],
    ['fissure', ['normal', 'normal', 'demonic', 'prismatic']],
    ['fissure', ['normal', 'normal', 'normal', 'demonic']],
    ['demonic', ['demonic', 'demonic', 'normal', 'normal']],
    ['demonic', ['demonic', 'demonic', 'demonic', 'prismatic']],
    ['demonic', ['demonic']],
    ['prismatic', ['prismatic', 'prismatic', 'normal', 'normal']],
    ['seam', ['demonic', 'prismatic']],
    ['seam', ['demonic', 'demonic', 'prismatic', 'prismatic']],
    // One of each is a quarter Normal, so the join is not clean and the rock
    // stays the Fissure's. The Seam takes exactly two and two.
    ['fissure', ['demonic', 'prismatic', 'normal', 'normal']],
  ];
  const wrong = cases.filter(([want, set]) => of(...set) !== want);
  for (const [want, set] of wrong) {
    line(`  ${set.join('+') || 'nothing'} → ${of(...set)}, wanted ${want}`);
  }
  check(
    wrong.length === 0,
    `every composition lands in the world the thresholds name (${cases.length} cases)`,
    `${wrong.length} land somewhere else — see above`
  );

  // The renderer's own vocabulary: floor colour, and what grows on a wall. If
  // two themes agree on both, they are one tileset with two names.
  // A wall with floor under it, which is the only rock either renderer draws.
  const face = (gx: number, gy: number) => (gy === 1 ? FLOOR : WALL);
  const swatch = (theme: MapTheme): string => {
    const floor = floorPalette(PALETTE, 3, theme);
    const growth = Array.from({ length: 60 }, (_, x) =>
      tileDecals(floor, face, x, 0).map((d) => `${d.colour}@${d.x.toFixed(2)}`).join(',')
    );
    return `${floor.room.join(',')}|${growth.join('/')}`;
  };
  const seen = new Map<string, MapTheme>();
  const twins: string[] = [];
  for (const theme of MAP_THEMES) {
    const key = swatch(theme.id);
    const already = seen.get(key);
    if (already) twins.push(`${theme.id} renders exactly like ${already}`);
    seen.set(key, theme.id);
    const floor = floorPalette(PALETTE, 3, theme.id);
    line(
      `  ${theme.name.padEnd(12)} floor ${floor.room[3]}  ` +
        `growth ${floor.growth || 'none'}${floor.growthAlt ? ` + ${floor.growthAlt}` : ''}`
    );
  }
  check(twins.length === 0, 'and each of the four is its own tileset', twins.join('; '));

  // A zone is its own rock, not stone with something growing on it, so what
  // has to hold is that no two are CUT the same way.
  const tiles = 1600;
  const surfaces = MAP_THEMES.map((t) => floorPalette(PALETTE, 3, t.id).surface);
  check(
    new Set(surfaces).size === MAP_THEMES.length && surfaces[0] === 'stone',
    'no two are made of the same thing, and the Fissure is bare rock',
    surfaces.join(', ')
  );

  // EVERY zone moves, drawn each frame off the tile and the clock. A zone whose
  // living layer is empty is standing still; one where every tile carries
  // something is a factory, which is what `motionDensity` is a knob against.
  const stirring = (theme: MapTheme): number => {
    const floor = floorPalette(PALETTE, 3, theme);
    let n = 0;
    for (let x = 0; x < tiles; x++) {
      if (livingDecals(floor, face, x, 1, 0).length > 0) n++;
    }
    return n;
  };
  const moving = MAP_THEMES.map((t) => `${t.name} ${stirring(t.id)}`);
  line(`  of ${tiles} floor tiles under rock, these many carry something alive:`);
  line(`  ${moving.join(' · ')}`);
  const quiet = MAP_THEMES.filter((t) => stirring(t.id) < tiles * 0.05);
  const busy = MAP_THEMES.filter((t) => stirring(t.id) > tiles * 0.9);
  check(
    quiet.length === 0 && busy.length === 0,
    'and all four move, none of them on every tile it owns',
    `still: ${quiet.map((t) => t.name).join(', ') || 'none'} · ` +
      `on everything: ${busy.map((t) => t.name).join(', ') || 'none'}`
  );

  // Nothing living may grow over the way on. Both landmarks are one tile and
  // the run is read off them.
  const overgrown = MAP_THEMES.filter((t) => {
    const floor = floorPalette(PALETTE, 3, t.id);
    const hole = (gx: number, gy: number) => (gy === 1 ? (gx % 2 ? ENTRANCE : EXIT) : WALL);
    return Array.from({ length: tiles }, (_, x) =>
      livingDecals(floor, hole, x, 1, 0.4).length
    ).some((n) => n > 0);
  });
  check(
    overgrown.length === 0,
    'and no zone grows anything over its entrance or its exit',
    overgrown.map((t) => t.name).join(', ')
  );

  // Both renderers read the same pure functions, so a themed map cannot be one
  // world in canvas and another in WebGL — but the map has to CARRY the theme
  // for that to mean anything.
  const set = [makeCrystal(1, 'demonic'), makeCrystal(1, 'prismatic')];
  const sim = new RunSim(set, makeCharacter({}, 'strike'), new Rng(19));
  check(
    sim.state.map.theme === 'seam' && sim.state.set.theme === 'seam',
    'and a run carries its world on the map itself, where both renderers read it',
    `map ${sim.state.map.theme}, set ${sim.state.set.theme}`
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
    const c = rollCrystal(3, pool, rng);
    const hero = makeCharacter(starterLoadout(new Rng(7)), 'strike');
    const sim = new RunSim([c], hero, new Rng(seed * 101));
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

  // WHERE and WHEN it happens, which is the half a tally cannot see. It comes
  // up the hole you are walking towards, a few at a time, and the readout
  // knows how many are coming before they are all out.
  const arrivals: string[] = [];
  const problems: string[] = [];

  for (const seed of [11, 13, 15]) {
    const c = rollCrystal(3, pool, rng);
    const sim = new RunSim([c], makeCharacter(starterLoadout(new Rng(7), 70), 'strike'), new Rng(seed * 101));
    let started = 0;
    let atStart = 0;
    let toExit = 99;
    let peak = 0;
    let counted = 0;

    for (let i = 0; i < 30 * 400 && sim.state.status === 'running'; i++) {
      const was = sim.state.finale;
      sim.step(TICK);
      const live = sim.state.monsters.filter((m) => !m.dead).length;
      if (!was && sim.state.finale) {
        started = sim.state.totalMonsters;
        atStart = live;
        counted = sim.state.totalMonsters - sim.state.killed;
        toExit = dist(sim.state.hero, sim.state.map.exit);
      }
      if (sim.state.finale) peak = Math.max(peak, live);
    }

    const def = ENCOUNTERS.find((e) => e.name === sim.state.finale);
    arrivals.push(
      `${sim.state.finale} ${atStart}→${peak} of ${def?.count} at ${toExit.toFixed(1)} tiles`
    );
    if (toExit > 5.5) problems.push(`${sim.state.finale} started ${toExit.toFixed(1)} tiles out`);
    // Counted whole at the start: everything still owed, whether or not it is
    // standing on the map yet.
    if (counted < (def?.count ?? 0)) {
      problems.push(`${sim.state.finale} counted ${counted} of ${def?.count}`);
    }
    if (def && def.count > def.wave.size && atStart >= def.count) {
      problems.push(`${sim.state.finale} arrived all at once`);
    }
    if (sim.state.status === 'cleared' && sim.state.killed !== started) {
      problems.push(`${sim.state.finale} left ${started - sim.state.killed} down the hole`);
    }
  }

  line(`  arrivals: ${arrivals.join(' · ')}`);
  check(
    problems.length === 0,
    'it comes up the hole as you near it, a wave at a time, counted whole',
    problems.join('; ')
  );
  check(
    ENCOUNTERS.every((e) => e.wave.size >= 1 && e.wave.every >= 0),
    'and every encounter says how it arrives',
    ENCOUNTERS.filter((e) => !(e.wave.size >= 1)).map((e) => e.id).join(', ')
  );
}

// ===========================================================================
rule('ONE SOCKET — which crystal level does each rung of gear survive?');

// Several seeds per cell — one run is far too noisy to tune against, and a
// ladder you can't trust is worse than no ladder.
const LADDER_SEEDS = [3, 17, 41, 58, 90];

// A grid, not a line. The question was never "where does gear fall over" — it
// was always "where does THIS gear fall over". Item level is the whole of the
// gear axis now: it decides the base's tier, which is how many modifiers the
// piece holds, AND which modifier tiers can roll on it. Reading down a column
// tells you what a crystal level demands; across a row, what a rung buys.
const RUNGS: Array<[string, number]> = [
  ['tier 1', BASE_TIER_ILVL[0]],
  ['tier 2', BASE_TIER_ILVL[1]],
  ['tier 3', BASE_TIER_ILVL[2]],
  ['ilvl 70', 70],
];

line('  gear         L1     L2     L3     L4');
for (const [label, ilvl] of RUNGS) {
  const kit = starterLoadout(new Rng(7), ilvl);
  const cells: string[] = [];

  for (const t of CRYSTAL_LEVELS) {
    let cleared = 0;
    for (const seed of LADDER_SEEDS) {
      const socketed = rollCrystal(t.level, pool, new Rng(200 + seed + t.level));
      const sim = new RunSim(
        [socketed],
        makeCharacter(kit, 'strike'),
        new Rng(900 + seed * 7 + t.level)
      );
      const f = runToCompletion(sim, 400);
      if (f.status === 'cleared') cleared++;
    }
    cells.push(`${cleared}/${LADDER_SEEDS.length}`.padStart(6));
  }

  const mods = loadoutMods(kit);
  line(`  ${label.padEnd(10)}${cells.join(' ')}   (${mods} mods worn)`);
}
line();
// Deliberately describes what to look FOR rather than asserting a result — a
// hardcoded verdict goes stale the moment the numbers move and then the
// harness is confidently lying to you.
line('Read down a column to see what a crystal level demands, across a row to');
line('see what a rung of gear buys. One socketed crystal is a shallow ladder on');
line('purpose: it is the rung the guided opening puts in front of a new player,');
line('and it should stay clearable. The deep end is four sockets, not four');
line('levels — see THE LADDER below for that.');

// ===========================================================================
rule('EVERY NUMBER SAID OUT LOUD — does any line withhold its figure?');

// The rule is in RULES.md: nothing a player reads may describe a quantity in
// words when there is a figure behind it. A digit is a coarse test and a
// deliberate one — "a third more ground" and "hits harder" both pass any
// cleverer check by describing something real, and both are the decision being
// asked for with the number taken out.
{
  const numberless: string[] = [];
  const looked: string[] = [];

  const holds = (where: string, text: string): void => {
    looked.push(where);
    if (!/\d/.test(text)) numberless.push(`${where}: ${text}`);
  };

  for (const tree of BUILT_TREES) {
    for (const node of tree.nodes) {
      // A conversion has no quantity in it at all: what it changes is WHICH
      // damage type, and the choices under it each name one.
      if (node.grants?.convertTree !== undefined || node.choices?.length) continue;
      holds(`${tree.spec.skillId}/${node.id}`, node.description);
    }
  }
  for (const c of CURRENCIES) {
    // Two of them act on EVERY modifier or on none in particular. There is no
    // figure being withheld, so there is none to print.
    if (c.id === 'shard_of_change' || c.id === 'shard_of_chaos') continue;
    holds(`currency/${c.id}`, c.description);
  }
  for (const q of CRYSTAL_QUESTS) holds(`quest/${q.id}`, q.detail);
  for (const a of AURAS) holds(`aura/${a.id}`, a.blurb);

  line(`  ${looked.length} lines read, ${numberless.length} with no figure in them`);
  check(
    numberless.length === 0,
    'every line that has a number behind it says the number',
    numberless.join('; ')
  );

  // What is deliberately NOT in that sweep, so the next session does not
  // "fix" it: an encounter's herald and the Lampwright's speeches are voice
  // rather than mechanics — nobody plays differently for knowing the Honour
  // Guard is four, and the kill readout says four the moment it starts.
  // GRANTS[].what describes a SWITCH with no value attached; a unique prints
  // `say` instead, which is checked where the uniques are.
  check(
    ENCOUNTERS.every((e) => e.herald.length > 0) && LAMPWRIGHT.first.said.length > 0,
    'and the lines that are voice rather than mechanics are left alone',
    'flavour went missing'
  );
}

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

  for (let band = 0; band < DROP_BANDS.length; band++) {
    for (const seed of [11, 29, 47, 63]) {
      const set = ladderSet(band, new Rng(200 + seed + band), pool);
      const sim = new RunSim(set, ladderCharacter(band, new Rng(seed)), new Rng(seed * 31 + band));
      const f = runToCompletion(sim, 400);
      checked++;
      if (f.status === 'running') stuck.push(`band ${band} seed ${seed}`);
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
rule('WHAT A BAND IS WORTH — does pushing power actually pay?');

// Measured by running descents rather than by a formula, so the harness and
// the game cannot disagree about what a run is worth. Crystals are permanent,
// so there is no per-run cost to divide by any more: the question is whether
// the curve rises at all, and whether it rises because of danger rather than
// because a longer run has more things in it.
{
  line('  band   power   monsters   avg yield   per kill   xp/kill   cleared');
  const perKill: number[] = [];
  const perXp: number[] = [];
  const reached: number[] = [];

  for (let band = 0; band < DROP_BANDS.length; band++) {
    const runs = 10;
    let banked = 0;
    let killed = 0;
    let cleared = 0;
    let power = 0;
    let monsters = 0;
    let xp = 0;

    for (let i = 0; i < runs; i++) {
      const set = ladderSet(band, new Rng(3300 + i * 13 + band), pool);
      const sim = new RunSim(set, ladderCharacter(band, new Rng(700 + i)), new Rng(5000 + band * 31 + i));
      power += sim.set.power;
      monsters += sim.state.totalMonsters;
      const final = runToCompletion(sim, 400);
      // Only a cleared run banks anything, which is the point of the mechanic.
      if (final.status !== 'cleared') continue;
      cleared++;
      banked += final.loot.currency.gold ?? 0;
      killed += final.killed;
      xp += final.xpGained;
    }

    const avg = banked / runs;
    const each = killed > 0 ? banked / killed : 0;
    const eachXp = killed > 0 ? xp / killed : 0;
    perKill.push(each);
    perXp.push(eachXp);
    reached.push(power / runs);
    line(
      `   ${band}    ${(power / runs).toFixed(2).padStart(5)}   ` +
        `${Math.round(monsters / runs).toString().padStart(8)}   ` +
        `${avg.toFixed(1).padStart(9)}   ${each.toFixed(3).padStart(8)}   ` +
        `${eachXp.toFixed(1).padStart(7)}   ${cleared}/${runs}`
    );
  }

  // Per KILL, not per run: a longer run pays more for being longer, and that
  // is length being rewarded rather than difficulty. What has to climb is what
  // one monster is worth, or filling sockets with blanks is the best farm in
  // the game.
  const flat = perKill.filter((n, i) => i > 0 && n <= perKill[i - 1]);
  check(
    flat.length === 0,
    'a monster is worth more at every band than at the one below',
    perKill.map((n) => n.toFixed(3)).join(' → ')
  );
  // XP reads the same number and would fail the same way — silently, since
  // nothing about a run reports what a kill was worth in experience.
  const flatXp = perXp.filter((n, i) => i > 0 && n <= perXp[i - 1]);
  check(
    flatXp.length === 0,
    'and is worth more experience',
    perXp.map((n) => n.toFixed(1)).join(' → ')
  );
  // The top of what four sockets can hold has to reach the top of the drop
  // table. If it does not, the best gear in the game is behind a set nobody
  // can assemble, and nothing else here would say so.
  check(
    reached[reached.length - 1] >= DROP_BANDS.length - 1.5,
    'and the best set four sockets can hold reaches the top drop band',
    `the ladder stops at power ${reached[reached.length - 1].toFixed(2)}`
  );
}

// ===========================================================================
rule('THE LADDER — is every rung reachable from the one below it?');

// Two ways to break this game with a balance number, both of which happened
// while these numbers were being set, and neither of which anything else here
// would have noticed.
{
  // 1. The free descent. It is the first thing anyone does, it costs nothing,
  //    and the character doing it owns nothing: no gear, no points, level one.
  //    A Fissure that cannot be cleared is a game that cannot be started.
  //    Empty sockets, so this is index zero of the same tables everything else
  //    reads rather than a special case beside them.
  let cleared = 0;
  const runs = 24;
  let lifeLeft = 0;
  for (let i = 0; i < runs; i++) {
    const hero = makeCharacter({}, 'strike');
    const sim = new RunSim([], hero, new Rng(4100 + i * 7));
    const final = runToCompletion(sim, 400);
    if (final.status === 'cleared') {
      cleared++;
      lifeLeft += final.hero.life / final.hero.stats.maxLife;
    }
  }
  const share = cleared / runs;
  line(`  naked, level 1, no tree: ${cleared}/${runs} cleared, ${((lifeLeft / Math.max(1, cleared)) * 100).toFixed(0)}% life left`);
  check(
    share >= 0.85,
    'a brand new character clears the Fissure',
    `only ${cleared}/${runs} — the first descent in the game is unwinnable`
  );
  // The other half of the same knob: a Fissure nobody can lose teaches nothing
  // about the fight, and the tier above it is where the lesson is meant to land.
  check(
    lifeLeft / Math.max(1, cleared) < 0.7,
    'and is made to work for it',
    'walks out barely touched — the Fissure is not teaching anything'
  );

  // 1b. The rung the game actually puts in front of you: the first crystal is
  //     given on that first clear, and the opening says to socket it. One
  //     blank crystal adds no danger at all, only length — so if this is a
  //     wall, the wall is the step from nothing socketed to something.
  {
    let survived = 0;
    const tries = 24;
    for (let i = 0; i < tries; i++) {
      const hero = makeCharacter({}, 'strike');
      addXp(hero, 60);
      const sim = new RunSim([makeCrystal(1)], hero, new Rng(5200 + i * 11));
      if (runToCompletion(sim, 400).status === 'cleared') survived++;
    }
    line(`  one blank crystal, straight after that first clear: ${survived}/${tries} cleared`);
    check(
      survived / tries >= 0.6,
      'and the first crystal it hands you is a descent that character can take',
      `${survived}/${tries} — socketing the gift is a death sentence`
    );
  }

  // 2. The gear ladder. A set the player can actually assemble at band n has
  //    to be clearable in what band n-1 drops, or the band that hands out what
  //    you need sits behind the thing you need it for. Same question the tier
  //    version asked, against the axis that replaced tiers.
  const wall: string[] = [];
  line('  band   cleared with what the band below drops');
  for (let band = 1; band < DROP_BANDS.length; band++) {
    let ok = 0;
    const tries = 12;
    for (let i = 0; i < tries; i++) {
      const set = ladderSet(band, new Rng(8800 + i * 17 + band), pool);
      const sim = new RunSim(set, ladderCharacter(band, new Rng(700 + i)), new Rng(8100 + band * 13 + i));
      if (runToCompletion(sim, 400).status === 'cleared') ok++;
    }
    line(`   ${band}    ${ok}/${tries}`);
    if (ok === 0) wall.push(`band ${band}`);
  }
  check(
    wall.length === 0,
    'every band can be cleared in gear the band below it drops',
    `${wall.join(', ')} cannot be entered in anything that band hands out`
  );

  // 3. The deep end, which is not a band. Power caps at the top one long
  //    before danger does, so the hardest set in the game is nobody's target
  //    and nothing else here looks at it. Against the gear a band below the
  //    top drops it has to be a WALL — and still be something a build gets
  //    through, or it is a ceiling rather than a wall.
  let through = 0;
  let deepest = 0;
  const deep = 12;
  for (let i = 0; i < deep; i++) {
    const set = deepestSet(new Rng(400 + i), pool);
    deepest += runSet(set).rewards.danger;
    const sim = new RunSim(set, ladderCharacter(6, new Rng(70 + i)), new Rng(900 + i));
    if (runToCompletion(sim, 600).status === 'cleared') through++;
  }
  line(`  the deep end: four crystals rolled for danger, ${Math.round(deepest / deep)} danger: ${through}/${deep}`);
  check(
    through <= deep / 3,
    'and the top of what four sockets can hold is a wall',
    `${through}/${deep} — the deep end is a farm`
  );
  check(
    through > 0,
    'and a wall rather than a ceiling — a build gets through it',
    'nothing gets through the deep end at all'
  );
}

// ===========================================================================
rule('BODIES — do they stay out of the rock, and does an area hit what it draws?');

// Both of these are things you can only see, which is why both went unnoticed:
// nothing here reads a position against a wall, and nothing reads a damage
// radius against the circle drawn for it.
{
  // 1. Separation is what shoves things sideways — a path only ever runs down
  //    tile centres — so a body ends up in rock by being pushed there.
  let inRock = 0;
  let samples = 0;
  let worst = 0;
  // Sixteen runs, not four: one monster wedged in a corner for a few seconds
  // moves a four-run figure between 0.04% and 1.07%, which is a check that
  // reports the seed it was given rather than whether bodies stay out of rock.
  for (const seed of [3, 11, 29, 47, 5, 13, 31, 53, 7, 17, 37, 59, 2, 19, 41, 61]) {
    const c = rollCrystal(3, pool, rng);
    const sim = new RunSim([c], ladderCharacter(3, new Rng(seed)), new Rng(seed * 7));
    const { grid } = sim.state.map;
    for (let k = 0; k < 5000 && sim.state.status === 'running'; k++) {
      sim.step(1 / 30);
      if (k % 15) continue;
      for (const e of [sim.state.hero, ...sim.state.monsters]) {
        if (e.dead) continue;
        samples++;
        if (grid.fits(e.x, e.y, e.radius)) continue;
        inRock++;
        worst = Math.max(worst, e.radius);
      }
    }
  }
  const share = (inRock / Math.max(1, samples)) * 100;
  line(`  ${share.toFixed(2)}% of ${samples} body samples overlap rock (worst radius ${worst.toFixed(2)})`);
  // Sampled eight ways over these seeds, the rate runs 0.34% to 1.40% — a
  // brief shove is separation working. What this catches is the order of
  // magnitude: collision reading centres puts a body in rock most of the time.
  check(
    share < 2,
    `bodies stay out of the walls across ${samples} samples`,
    `${share.toFixed(2)}% are standing in rock — collision is reading centres, not bodies`
  );

  // 2. Every area is DRAWN as a circle, and the vfx carries the radius the sim
  //    used. A monster the circle covers has to be one the circle hit.
  const dummy = (x: number, y: number, radius: number) =>
    ({
      x, y, radius, dead: false, kind: 'monster', ailments: [],
      stats: { maxLife: 1e6, attacksPerSecond: 1, critChance: 0, critMultiplier: 0, damageByType: {} },
    }) as any;

  const skill = SKILL_BY_ID.blight;
  const R = skill.params?.radius as number;
  const user = dummy(-4, 0, 0.34);
  // The cloud lands on the primary, so every distance below is from THAT.
  const centre = dummy(0, 0, 0.3);
  // Centre outside the circle, body inside it: drawn as a hit, resolved as a
  // miss. `centre` itself is poisoned unconditionally, so it proves nothing.
  const edge = dummy(R + 0.25, 0, 0.4);
  const far = dummy(R + 1.4, 0, 0.4);
  const poisoned: any[] = [];
  let drawn = 0;

  SKILL_BEHAVIOURS[skill.behaviour]({
    skill, user, primary: centre, enemies: [centre, edge, far],
    rng: new Rng(3), grants: {}, crit: false, castIndex: 0,
    hit: () => {},
    ailment: (t: any) => poisoned.push(t),
    areaRadius: (base: number) => base,
    vfx: (kind: string, points: any[]) => {
      if (kind === 'blight_field') drawn = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
    },
  } as any);

  line(`  a ${drawn.toFixed(2)} tile circle; a body centred ${(R + 0.25).toFixed(2)} out, reaching ${(R + 0.25 - 0.4).toFixed(2)}`);
  check(
    drawn > 0 && poisoned.includes(edge),
    'a monster the circle visibly covers is a monster the circle hit',
    'the ring lands on it and nothing happens — the area is testing centres'
  );
  check(
    !poisoned.includes(far),
    'and one it does not reach is left alone',
    'the area reaches past what it draws'
  );
}

// ===========================================================================
rule('MITIGATION — is every reachable set answerable?');

// Resistance and armour MULTIPLY, so a plausible-looking pair reduces a hit by
// more than either number suggests. Nothing hands these out any more — every
// point of both is rolled onto a crystal — so the question is whether a set
// the player can actually build makes itself unhittable.
{
  const bad: string[] = [];
  line('  band   danger   worst resist   armour   a hit of that type is worth');
  for (let band = 0; band < DROP_BANDS.length; band++) {
    const set = ladderSet(band, new Rng(6600 + band), pool);
    const mods = set.flatMap((c) => c.mods);
    const m = monsterStats(mods, MONSTER_BY_ID.grub);
    // The hardest type, not an arbitrary one: a set is answerable if the type
    // it turns aside HARDEST still gets through.
    const resist = Math.max(...DAMAGE_TYPES.map((t) => m.resistances[t.id] ?? 0));
    const through = (1 - resist / 100) * (1 - m.armourReduction / 100);
    line(
      `   ${band}     ${Math.round(runSet(set).rewards.danger).toString().padStart(4)}          ` +
        `${resist.toFixed(0).padStart(3)}%    ` +
        `${m.armourReduction.toFixed(0).padStart(3)}%    ${(through * 100).toFixed(0)}%`
    );
    if (through < 0.2) bad.push(`band ${band} eats ${((1 - through) * 100).toFixed(0)}% of every hit`);
  }
  for (const entry of bad) line(`  ${entry}`);
  check(
    bad.length === 0,
    'no set the ladder builds swallows four fifths of a hit',
    bad.join('; ')
  );

  // An empty Fissure is the floor of the game, so it has to be the floor of
  // this too: every point of resistance and armour is now something you chose
  // to socket, which is what makes a hard map answerable rather than a wall.
  const bare = monsterStats([], MONSTER_BY_ID.grub);
  check(
    bare.resistances.physical === 0 && bare.armour === 0,
    'nothing resists anything until a crystal says so',
    `bare Fissure: ${bare.resistances.physical}% resist, ${bare.armour} armour`
  );
  // And the cap is still reachable: two crystals both warding one type is a
  // set a player can hold, and it has to land somewhere real.
  const ward = (value: number): RolledMod => ({
    entryId: 'ward', defId: 'ward', group: 'ward', slot: 'mod', name: 'Ward', tier: 1,
    tags: ['danger'], stats: [{ stat: monsterResStat('fire'), form: 'inc', value, tags: [] }],
  });
  const doubled = monsterStats([ward(50), ward(50)], MONSTER_BY_ID.grub);
  check(
    doubled.resistances.fire === DEFENCE.resistanceCap,
    'and two crystals warding one type reach the cap, never past it',
    `two 50% wards came to ${doubled.resistances.fire}%`
  );
}

// ===========================================================================
rule('WHERE THE GOLD COMES FROM — is selling worth the walk to the counter?');

// Crystals are permanent and given, so there is no consumable to divide gold
// by any more. What is left is the two taps a run opens — coin off the corpses
// and gear you can sell — and whether either is worth having.
{
  const wallet: Wallet = {};
  grant(wallet, 'gold', 300);

  // Nothing may mint gold out of the shelf. A full tier 3 piece is the best
  // case for the mod bonus, so it is the one that has to stay under.
  const arbitrage: string[] = [];
  for (const base of ['bulwark_body_t1', 'bulwark_body_t2', 'bulwark_body_t3']) {
    const piece = rollGear(base, 60, 6, pool, new Rng(41));
    if (sellPrice(piece) >= priceOfItem(piece)) {
      arbitrage.push(`${base} ${sellPrice(piece)} >= ${priceOfItem(piece)}`);
    }
  }
  check(
    arbitrage.length === 0,
    'buying a piece and selling it straight back always loses',
    arbitrage.join(', ')
  );

  line('  band   gold banked   drops   sale value   share from selling');
  const shares: number[] = [];
  for (let band = 0; band < DROP_BANDS.length; band += 2) {
    const runs = 6;
    let banked = 0;
    let sold = 0;
    let drops = 0;

    for (let i = 0; i < runs; i++) {
      const set = ladderSet(band, new Rng(8800 + i * 17 + band), pool);
      const sim = new RunSim(set, ladderCharacter(band, new Rng(910 + i)), new Rng(6400 + band * 29 + i));
      const final = runToCompletion(sim, 400);
      if (final.status !== 'cleared') continue;
      banked += final.loot.currency.gold ?? 0;
      drops += final.loot.items.length;
      for (const item of final.loot.items) sold += sellPrice(item);
    }

    const share = banked + sold > 0 ? sold / (banked + sold) : 0;
    shares.push(share);
    line(
      `   ${band}   ${banked.toFixed(0).padStart(11)}   ${(drops / runs).toFixed(1).padStart(5)}   ` +
        `${sold.toFixed(0).padStart(10)}   ${(share * 100).toFixed(0).padStart(17)}%`
    );
  }

  // Neither tap may be noise. Selling is the larger of the two at every band
  // measured — which is a curve for Phase 7 to settle, not a bug — so the
  // bound here is only what catches one of them going to nothing.
  const lopsided = shares.filter((s) => s < 0.05 || s > 0.95);
  check(
    lopsided.length === 0,
    'selling and killing both pay something at every band sampled',
    shares.map((s) => `${(s * 100).toFixed(0)}%`).join(' → ')
  );

  // The free descent has to fund the bench, or a fresh character watches the
  // one run they can reach pay for nothing. Averaged: a single seed's drops
  // are the loosest number in the game.
  const descents = 5;
  let earned = 0;
  let sold = 0;
  for (let i = 0; i < descents; i++) {
    const opening = createGame('fresh');
    const final = runToCompletion(new RunSim([], makeCharacter({}, 'strike'), new Rng(77 + i)), 400);
    earned += final.loot.currency.gold ?? 0;
    for (const item of final.loot.items) addItem(opening, item);
    sold += sellAll(opening, plainGear(opening.inventory)).gold;
  }
  // What a level-1 shelf holds, which is the whole of what the opening asks for.
  const bench = RECIPES.filter((r) => (r.level ?? 1) === 1).reduce(
    (n, r) => n + (r.inputs.gold ?? 0),
    0
  );
  const perRun = (earned + sold) / descents;
  line(`  a bare descent pays ${(earned / descents).toFixed(1)} gold and ${(sold / descents).toFixed(1)} in sellable drops`);
  check(
    perRun >= bench,
    `and covers the level-1 shelf (${bench} gold) in one run`,
    `${perRun.toFixed(1)} gold a run against a ${bench} gold shelf`
  );
}

// ===========================================================================
rule('WHAT A SET FARMS — is where you go a decision or a formality?');

// Three claims to hold: pushing pays but does not make everything below it
// worthless, each world pays in its own currency, and what a set is pointed at
// is something you can actually aim.
{
  const perMinute = (band: number): { gold: number; sale: number; total: number } => {
    let secs = 0;
    let gold = 0;
    let sale = 0;
    for (let i = 0; i < 8; i++) {
      const set = ladderSet(band, new Rng(4000 + band * 31 + i), pool);
      const sim = new RunSim(set, ladderCharacter(band, new Rng(200 + i)), new Rng(700 + band * 17 + i));
      const s = runToCompletion(sim, 600);
      if (s.status !== 'cleared') continue;
      secs += s.elapsed;
      gold += s.loot.currency.gold ?? 0;
      sale += s.loot.items.reduce((n, it) => n + sellPrice(it), 0);
    }
    const minutes = Math.max(0.01, secs / 60);
    return { gold: gold / minutes, sale: sale / minutes, total: (gold + sale) / minutes };
  };

  line('  band   gold/min   drops sell for   everything');
  const paid = DROP_BANDS.map((_, band) => {
    const rate = perMinute(band);
    line(
      `   ${band}    ${rate.gold.toFixed(0).padStart(7)}   ${rate.sale.toFixed(0).padStart(14)}` +
        `   ${rate.total.toFixed(0).padStart(10)}`
    );
    return rate;
  });

  // The hard hour against the hour you have outgrown. Steeper than this and a
  // set you can no longer be bothered with is worth literally nothing; flatter
  // and there is no reason to push at all.
  const goldStep = paid[6].gold / paid[3].gold;
  const totalStep = paid[6].total / paid[3].total;
  line(`  the top band pays ${goldStep.toFixed(1)}x the gold of the middle, ${totalStep.toFixed(1)}x counting drops`);
  check(
    goldStep > 2.5 && goldStep < 6.5,
    'the top band pays a few times the middle, not a hundred times it',
    `${goldStep.toFixed(1)}x`
  );
  check(
    paid.every((rate, i) => i === 0 || rate.total > paid[i - 1].total),
    'and every band still pays more than the one below — pushing is never wrong',
    paid.map((r) => r.total.toFixed(0)).join(' → ')
  );

  // Both taps have to matter. All of it from corpses makes drops decoration;
  // all of it from selling makes killing things decoration.
  const shares = paid.map((r) => r.sale / r.total);
  line(`  share of income from selling: ${shares.map((s) => `${Math.round(s * 100)}%`).join(' ')}`);
  check(
    shares.every((s) => s > 0.1 && s < 0.95),
    'gold comes off corpses early and out of the haul late, and neither ever stops',
    shares.map((s) => `${Math.round(s * 100)}%`).join(' ')
  );

  // The Seam. §3 asks for the 50/50 to be the best-paying set there is, and it
  // is paid as YIELD rather than as power, so it can never skip an item level.
  const four = (families: MonsterFamily[]) => runSet(families.map((f) => makeCrystal(1, f)));
  const single = four(['demonic', 'demonic', 'demonic', 'demonic']);
  const seam = four(['demonic', 'demonic', 'prismatic', 'prismatic']);
  const lean = four(['demonic', 'demonic', 'demonic', 'prismatic']);
  line(
    `  yield: one world ${single.yield.toFixed(2)}x, three to one ${lean.yield.toFixed(2)}x, ` +
      `the Seam ${seam.yield.toFixed(2)}x`
  );
  check(
    Math.abs(seam.yield - (1 + REWARD.mixYield)) < 1e-6 &&
      single.yield === 1 &&
      lean.yield > 1 &&
      lean.yield < seam.yield,
    `an even split pays ${Math.round(REWARD.mixYield * 100)}% more, and a lopsided one pays part of it`,
    `${single.yield} / ${lean.yield} / ${seam.yield}`
  );
  check(
    seam.band.ilvl === single.band.ilvl,
    'and pays it without moving the item level — payment, never access',
    `${single.band.ilvl} vs ${seam.band.ilvl}`
  );

  // Each world pays in something the others do not, so no set is strictly best.
  const rows: string[] = [];
  for (const family of MONSTER_FAMILIES) {
    const set = four([family.id, family.id, family.id, family.id]);
    rows.push(
      `${family.name}: gold x${set.pays.gold.toFixed(2)}, currency x${set.pays.currency.toFixed(2)}, ` +
        `rarity +${Math.round(set.pays.rarity)}%`
    );
  }
  for (const row of rows) line(`  ${row}`);
  const best = MONSTER_FAMILIES.map((f) => four([f.id, f.id, f.id, f.id])).map((s) => s.pays);
  check(
    best.every((pays, i) =>
      best.some((other, j) => j !== i && (other.gold > pays.gold || other.currency > pays.currency || other.rarity > pays.rarity))
    ) && new Set(best.map((p) => `${p.gold}|${p.currency}|${p.rarity}`)).size === best.length,
    'no world pays in the same thing as another, so none of them is the correct one',
    rows.join('; ')
  );
}

// ===========================================================================
rule('GATES AND HUNTING — can a run be pointed at what you actually want?');

// Two mechanisms with the same shape: a gate says a thing does not exist here
// at all, and a finding modifier says which of what does exist you would like.
{
  const gated = CURRENCIES.filter((c) => c.gate);
  line(`  ${gated.length} currencies are gated: ${gated.map((c) => `${c.name} → ${c.gate!.zone ?? `power ${c.gate!.minPower}`}`).join(', ')}`);
  check(gated.length > 0, 'the table gates something at all', 'nothing is gated');

  // A gate is a WALL: the run either has it in the pool or does not, and no
  // amount of rarity argues with it.
  const wrong = gated.filter((c) => opensHere(c.gate, POWER.max, 'fissure'));
  check(
    wrong.length === 0,
    'and nothing gated to a world drops in the bare Fissure, however powerful the set',
    wrong.map((c) => c.name).join(', ')
  );
  const unreachable = gated.filter(
    (c) => !MAP_THEMES.some((t) => opensHere(c.gate, POWER.max, t.id))
  );
  check(
    unreachable.length === 0,
    'and every gate opens somewhere — a gate nothing satisfies is content nobody can have',
    unreachable.map((c) => c.name).join(', ')
  );

  // Played out. Every gated currency is exotic now, so it needs the top band
  // as well as its zone — too rare to sample for a POSITIVE. The negative is
  // the one that matters and it holds on every kill: the pool is filtered
  // before the pick, so a world can never produce another world's currency.
  const seen = (crystals: Item[], seeds: number): Set<string> => {
    const out = new Set<string>();
    for (let i = 0; i < seeds; i++) {
      const sim = new RunSim(crystals, ladderCharacter(6, new Rng(90 + i)), new Rng(300 + i));
      const s = runToCompletion(sim, 600);
      for (const id of Object.keys(s.loot.currency)) out.add(id);
    }
    return out;
  };
  const top = (family: MonsterFamily) => rollCrystal(4, pool, rng, family);
  const rot = seen([top('demonic'), top('demonic'), top('demonic'), top('demonic')], 14);
  const cavern = seen([top('prismatic'), top('prismatic'), top('prismatic'), top('prismatic')], 14);
  line(`  the Rot dropped ${rot.size} kinds of currency, the Cavern ${cavern.size}`);
  const trespass = [...rot]
    .filter((id) => CURRENCY_BY_ID[id]?.gate?.zone && CURRENCY_BY_ID[id].gate!.zone !== 'demonic')
    .concat(
      [...cavern].filter(
        (id) => CURRENCY_BY_ID[id]?.gate?.zone && CURRENCY_BY_ID[id].gate!.zone !== 'prismatic'
      )
    );
  check(
    trespass.length === 0,
    'and a world never produces a currency gated to a different one',
    trespass.join(', ')
  );

  // What the top of each world can reach AT ALL. This is where a gate that
  // opens nowhere, or opens everywhere, actually shows up.
  const poolAt = (zone: MapTheme) =>
    CURRENCIES.filter((c) => c.class === 'exotic' && opensHere(c.gate, POWER.max, zone)).map((c) => c.id);
  for (const theme of MAP_THEMES) {
    line(`  the top of ${theme.name} rolls from ${poolAt(theme.id).join(', ') || 'nothing exotic'}`);
  }
  const stray = gated.filter((c) =>
    MAP_THEMES.filter((t) => t.id !== c.gate!.zone).some((t) =>
      poolAt(t.id).includes(c.id)
    )
  );
  check(
    stray.length === 0,
    'and every gated currency is in exactly one world\'s pool',
    stray.map((c) => c.name).join(', ')
  );

  // Hunting. A crystal pointed at weapons has to actually change what turns up.
  const hunting = (group: string): RolledMod => ({
    entryId: `find_${group}`, defId: `find_${group}`, group: `find_${group}`, slot: 'mod',
    name: 'Hunting', tier: 1, tags: ['finding'],
    stats: [{ stat: findStat(group), form: 'inc', value: 120, tags: [] }],
  });
  const hunt = (group: string | null): number => {
    const bias = dropBias(group ? [hunting(group)] : []);
    let weapons = 0;
    let all = 0;
    const roll = new Rng(4242);
    for (let i = 0; i < 4000; i++) {
      const base = pickGearBase(70, roll, bias);
      if (!base) continue;
      all++;
      if (base.kind === 'weapon') weapons++;
    }
    return (weapons / all) * 100;
  };
  const plain = hunt(null);
  const aimed = hunt('weapons');
  line(`  weapons are ${plain.toFixed(1)}% of drops, ${aimed.toFixed(1)}% with one crystal hunting them`);
  check(
    aimed > plain * 1.5,
    'a crystal that hunts weapons visibly changes what the run hands you',
    `${plain.toFixed(1)}% → ${aimed.toFixed(1)}%`
  );
  // And it must not be a way around the ladder: the bias moves WHICH, never
  // how good — an ilvl 10 run hunting weapons still drops ilvl 10 weapons.
  const cheap = pickGearBase(10, new Rng(5), dropBias([hunting('weapons')]));
  check(
    (cheap?.ilvl ?? 1) <= 10,
    'and hunts only what the item level already allows',
    `${cheap?.id} at ilvl ${cheap?.ilvl}`
  );
}

// ===========================================================================
rule('THE COLLECTION — do crystals arrive, and do they grow?');

/** What a cleared descent was, in the shape an objective is asked about. */
const facts = (g: GameState, run: RunState): QuestFacts => ({
  set: run.set,
  elapsed: run.elapsed,
  socketed: socketed(g),
});

// Nothing here can be bought, so if the giving is wrong the game has no way
// up at all. Three things have to hold: the first four arrive, a socketed
// crystal levels, and the other two worlds are reachable on purpose.
{
  // Nothing about a gift is rolled. The schedule is a condition you can read
  // off the game rather than a coin flip, which is what lets a player plan the
  // only decision the game asks them to make.
  const fresh = createGame('fresh');
  check(
    giftWaiting(fresh)?.weapon === true,
    'a character who has never cleared anything is owed a weapon at the mouth',
    JSON.stringify(giftWaiting(fresh))
  );

  // A weapon picked off the SKILL. A Strike character handed a wand is the
  // first item the game gives you and the first one it teaches you to craft.
  const bySkill: string[] = [];
  for (const skill of PLAYER_SKILLS) {
    const g = createGame('fresh');
    g.character = makeCharacter({}, skill.id);
    const given = lampwrightWeapon(g);
    bySkill.push(`${skill.id}=${given?.item.base ?? 'NOTHING'}`);
  }
  line(`  the first weapon, by skill: ${bySkill.join(' ')}`);
  check(
    !bySkill.some((r) => r.endsWith('NOTHING')),
    'and every skill in the game resolves to one',
    bySkill.join(' ')
  );
  check(
    new Set(bySkill.map((r) => r.split('=')[1])).size > 1,
    'and not all to the same one, which is the whole point of the table',
    bySkill.join(' ')
  );

  // Played out. The meeting is at the MOUTH, so it is only ever reached on a
  // clear — a gift is never a thing standing next to the monsters.
  {
    const g = createGame('fresh');
    const sim = new RunSim([], g.character, new Rng(6100));
    runToCompletion(sim, 400);
    check(
      sim.state.status === 'cleared' && !sim.state.lampwright && !sim.state.meeting,
      'nobody is on the map during a descent',
      `${sim.state.status}, lampwright ${sim.state.lampwright ? 'placed' : 'absent'}`
    );

    buildReport(g, sim.state);
    const waiting = giftWaiting(g, facts(g, sim.state));
    check(
      waiting?.weapon === true && sim.greetAtExit() && !sim.state.meeting,
      'and climbs out of the exit once it is cleared, without a word yet',
      `waiting ${JSON.stringify(waiting)}, meeting ${sim.state.meeting}`
    );
    // Out of the hole and CLEAR of it: standing in it is the one place he
    // cannot be, since it is the thing the hero is about to drop through.
    const off = dist(sim.state.lampwright!, sim.state.map.exit);
    check(
      off > 0.9 && off < 3,
      'a stride off the hole rather than standing in it',
      `${off.toFixed(2)} tiles from the exit`
    );
    check(
      walkToMeeting(sim) && dist(sim.state.hero, sim.state.lampwright!) <= 1.2,
      'and the meeting is the hero walking over, not a panel appearing',
      `meeting ${sim.state.meeting}, ${dist(sim.state.hero, sim.state.lampwright!).toFixed(2)} apart`
    );

    // What the panel does. The run is already banked, so this is a handover
    // and not a payout — nothing about it can be lost.
    const hand = takeHandover(g, waiting!);
    sim.takeGift();
    const weapon = hand.items[0];
    check(
      weapon?.meta.firstClear === true &&
        [...g.inventory, ...g.stash].some((i) => i.id === weapon.id),
      'and hands over a marked weapon the guided opening can point at',
      `${weapon?.base}`
    );
    check(
      giftWaiting(g) === null,
      'and is not waiting again the next time you come up',
      JSON.stringify(giftWaiting(g))
    );

    // The crystal is the SECOND meeting, and it is EARNED rather than counted
    // out: the active skill at INTRO.crystalSkillLevel with a notable taken in
    // its tree — the level buys the point and the allocation spends it.
    check(
      g.clears === 1,
      'and the clear it banked is counted',
      String(g.clears)
    );
    const mine = g.character.skillId;
    const progress = skillProgress(g.character, mine);
    check(
      giftWaiting(g) === null &&
        giftSchedule(g).includes(`level ${INTRO.crystalSkillLevel}`) &&
        giftSchedule(g).includes('0 notables'),
      'and says what the first crystal is waiting on, in numbers',
      giftSchedule(g)
    );
    while (progress.level < INTRO.crystalSkillLevel) {
      addSkillXp(g.character, mine, xpToNext(progress.level));
    }
    check(
      giftWaiting(g) === null,
      `and ${INTRO.crystalSkillLevel} skill levels with nothing spent is still nothing owed`,
      JSON.stringify(giftWaiting(g))
    );
    const route = pathToNotable(mine, progress.allocated);
    check(
      route.length === INTRO.crystalSkillLevel && route[route.length - 1].kind === 'notable',
      `and the cheapest notable is ${INTRO.crystalSkillLevel} points away, which is exactly what that many levels buys`,
      `${route.length} nodes: ${route.map((n) => n.id).join(' → ')}`
    );
    for (const node of route) progress.allocated.push(node.id);
    const owed = giftWaiting(g);
    check(owed?.crystal === true, 'and taking it is what puts one at the mouth', JSON.stringify(owed));

    const second = takeHandover(g, owed!);
    const crystal = second.items[0];
    check(
      crystal?.kind === 'crystal' &&
        modCapacity(crystal) === 0 &&
        crystal.meta.scripted === INTRO.scriptedMod &&
        balance(g.wallet, INTRO.scriptedCurrency) > 0,
      'handing over a BLANK crystal, the shard for later, and the roll still waiting on it',
      `level ${crystal?.meta.level}, room ${modCapacity(crystal!)}, ` +
        `scripted ${crystal?.meta.scripted}, ${balance(g.wallet, INTRO.scriptedCurrency)} shards`
    );

    // Being used is the only thing that gives it room, which is what the
    // guided opening's craft steps wait for rather than queue behind.
    let bare = 0;
    while (modCapacity(crystal!) === 0 && bare < 100) {
      addCrystalXp(crystal!, xpForClear(0));
      bare++;
    }
    check(
      modCapacity(crystal!) === 1,
      `and ${bare} cleared descents socketed at no danger buy it 1 slot`,
      `level ${crystal?.meta.level}, room ${modCapacity(crystal!)}`
    );

    // The one arranged roll in the game. It rides on the CRYSTAL, so the
    // currency behaves the same way on everything else.
    const shard = CURRENCY_BY_ID[INTRO.scriptedCurrency];
    const made = craft(crystal!, shard, new ModPool(ALL_MODS), new Rng(11));
    check(
      made.ok && made.item.mods[0]?.defId === INTRO.scriptedMod,
      `and the first shard spent on it rolls ${INTRO.scriptedMod} and nothing else`,
      made.ok ? String(made.item.mods[0]?.defId) : String(made.error)
    );
    check(
      made.ok && made.item.meta.scripted === undefined,
      'and the arrangement is spent as it fires, so the next one is a real roll',
      made.ok ? String(made.item.meta.scripted) : '—'
    );
    check(
      giftWaiting(g) === null && giftSchedule(g).includes('earned below'),
      'and everything after that is a quest rather than a schedule',
      giftSchedule(g)
    );
  }
}

// Levelling. The standing decision is that danger multiplies it and only a
// SOCKETED crystal gains anything, so both are measured rather than asserted.
{
  const clearsTo = (level: number, danger: number): number => {
    const crystal = makeCrystal(1);
    let clears = 0;
    while (Number(crystal.meta.level) < level && clears < 500) {
      addCrystalXp(crystal, xpForClear(danger));
      clears++;
    }
    return clears;
  };

  const bare = clearsTo(4, 0);
  const mid = clearsTo(4, 60);
  const hard = clearsTo(4, 200);
  line(`  level 1 → 4 takes ${bare} clears bare, ${mid} at 60 danger, ${hard} at 200`);
  check(
    bare < 500 && hard < mid && mid < bare,
    'a blank set still levels a blank crystal, and danger is what makes it quick',
    `${bare} / ${mid} / ${hard}`
  );

  const grown = makeCrystal(1);
  addCrystalXp(grown, 999);
  check(
    grown.base === 'crystal_t4' &&
      Number(grown.meta.level) === 4 &&
      modCapacity(grown) === 3 &&
      grown.name.includes('Level 4'),
    'and a level gained moves the base, the name and the capacity together',
    `${grown.base} ${grown.name} holds ${modCapacity(grown)}`
  );

  // What a crystal is FOR is what is rolled on it, so growth must not touch it.
  const carrying = rollCrystal(2, pool, rng);
  const had = carrying.mods.map((m) => m.defId).join(',');
  addCrystalXp(carrying, 999);
  check(
    carrying.mods.map((m) => m.defId).join(',') === had && modCapacity(carrying) === 3,
    'room is added above what is already rolled, never instead of it',
    `${carrying.mods.length} mods, capacity ${modCapacity(carrying)}`
  );

  // A save written before xp existed: the level is real, the xp is not.
  const stale = makeCrystal(3);
  stale.meta.xp = 0;
  check(
    addCrystalXp(stale, 1) === 0 && Number(stale.meta.level) === 3,
    'and a crystal whose stored progress lags its level is never demoted for it',
    `${stale.name} after healing`
  );

  const game = createGame('fresh');
  game.character = ladderCharacter(1, new Rng(3));
  const socketed = makeCrystal(1);
  const pocketed = makeCrystal(1);
  addItem(game, socketed);
  addItem(game, pocketed);
  socketItem(game, socketed, RUN_SLOTS[0].id);
  const sim = new RunSim([socketed], game.character, new Rng(515));
  runToCompletion(sim, 400);
  const report = buildReport(game, sim.state);
  check(
    report.cleared && crystalXp(socketed) > crystalXp(pocketed) && crystalXp(pocketed) === 0,
    'a cleared run pays the sockets and nothing in a bag',
    `${sim.state.status}: socketed ${crystalXp(socketed)}, carried ${crystalXp(pocketed)}`
  );
}

// The quests. Each one is a wall if its objective is out of reach of the
// crystals you hold when it is the next thing in front of you.
{
  // Every clause has to name something in the registry. A kind that is not in
  // it is never met, so a typo here is a socket nobody can ever open.
  const unknown = CRYSTAL_QUESTS.flatMap((q) =>
    q.need.filter((c) => !QUEST_CONDITIONS[c.kind]).map((c) => `${q.id}:${c.kind}`)
  );
  check(
    unknown.length === 0,
    `every clause of all ${CRYSTAL_QUESTS.length} quests names a condition that exists`,
    `no such condition: ${unknown.join(', ')}`
  );

  // Walked in table order, which is the worst case: at rung i you have been
  // given i crystals on top of the one the opening hands you, so the CEILING
  // is that many sockets, levelled to the top and rolled full. Nothing here is
  // bought, so a threshold above this line is a wall rather than a climb.
  CRYSTAL_QUESTS.forEach((quest, i) => {
    const want = questDanger(quest);
    const sockets = Math.min(RUN_SLOTS.length, 1 + i);
    const family = quest.need.find((c) => c.kind === 'composition')?.family as
      | MonsterFamily
      | undefined;
    const dangers: number[] = [];
    for (let n = 0; n < 60; n++) {
      const set = Array.from({ length: sockets }, () => rollCrystal(4, pool, rng));
      if (family) set[0] = makeCrystal(1, family);
      dangers.push(runSet(set).rewards.danger);
    }
    dangers.sort((a, b) => a - b);
    const median = dangers[30];
    check(
      median >= want,
      `${quest.name}: ${want} danger against ${Math.round(median)} reachable on ${sockets} sockets`,
      `${quest.name} needs ${want} and ${sockets} sockets median ${Math.round(median)}`
    );
  });

  // A clock is the one objective that can be failed by succeeding — pile on
  // danger and the room takes longer — so it is played rather than reasoned
  // about, at the danger its own quest asks for.
  for (const quest of CRYSTAL_QUESTS) {
    const clock = quest.need.find((c) => c.kind === 'under_seconds');
    if (!clock) continue;
    const limit = Number(clock.value);
    const want = questDanger(quest);
    // Aimed AT the threshold, not past it: a player who has to beat a clock
    // rolls the cheapest set that clears the danger gate, and the sockets are
    // the ones the rungs before this one have handed over.
    const band = Math.round(want / POWER.perDanger + (RUN_SLOTS.length - 1) * POWER.perSocket);
    const times: number[] = [];
    let cleared = 0;
    for (let i = 0; i < 6; i++) {
      let set: Item[] = [];
      let gap = Infinity;
      for (let a = 0; a < 24; a++) {
        const tryset = Array.from({ length: RUN_SLOTS.length - 1 }, () => rollCrystal(3, pool, rng));
        const off = Math.abs(runSet(tryset).rewards.danger - want);
        if (off >= gap) continue;
        gap = off;
        set = tryset;
      }
      const sim = new RunSim(set, ladderCharacter(band, new Rng(200 + i)), new Rng(880 + i));
      runToCompletion(sim, 900);
      if (sim.state.status === 'cleared') {
        cleared++;
        times.push(sim.state.elapsed);
      }
    }
    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)] ?? Infinity;
    check(
      cleared > times.length / 2 && median <= limit,
      `${quest.name}: ${limit}s against a median clear of ${median.toFixed(0)}s at ${want} danger`,
      `${quest.name} allows ${limit}s, ${cleared}/6 cleared, and the room takes ${median.toFixed(0)}s`
    );
  }

  // The family gate is one socketed crystal of four — the second gift earned
  // by using the first, not by owning two of something you have none of.
  const game = createGame('fresh');
  const demonic = [makeCrystal(1, 'demonic'), ...Array.from({ length: 3 }, () => makeCrystal(4))];
  const set = runSet(demonic);
  const at = (danger: number): QuestFacts => ({
    set: { ...set, rewards: { ...set.rewards, danger } },
    elapsed: 0,
    socketed: demonic,
  });
  check(
    questMet(QUEST_BY_ID.demonic_ii, at(110)) && !questMet(QUEST_BY_ID.prismatic_ii, at(110)),
    'one Demonic crystal in four sockets answers the Demonic quest and not the Prismatic one',
    `composition ${JSON.stringify(set.composition)}`
  );

  // A crystal's own level is an objective too, and only a SOCKETED one counts.
  const grown: QuestFacts = { ...at(0), socketed: [makeCrystal(3)] };
  check(
    questMet(QUEST_BY_ID.normal_ii, grown) &&
      !questMet(QUEST_BY_ID.normal_ii, { ...grown, socketed: [makeCrystal(2)] }),
    'a rung that asks for a levelled crystal reads the sockets and nothing else',
    'the level objective does not answer to a socketed crystal'
  );

  // Paid once, and paid AT THE MOUTH. A quest that pays every clear is four
  // crystals a minute; one that pays into a report is one you can die holding.
  const everything: QuestFacts = {
    set: runSet([
      makeCrystal(1, 'demonic'),
      makeCrystal(1, 'prismatic'),
      ...Array.from({ length: 2 }, () => rollCrystal(4, pool, rng)),
    ]),
    elapsed: 0,
    socketed: [makeCrystal(4)],
  };
  const past = { ...everything, set: { ...everything.set, rewards: { ...everything.set.rewards, danger: 400 } } };
  game.given = ['weapon', 'crystal'];
  const first = giftWaiting(game, past);
  takeHandover(game, first!);
  const again = giftWaiting(game, past);
  check(
    first?.quests.length === CRYSTAL_QUESTS.length && again === null,
    `a set past every threshold pays all ${CRYSTAL_QUESTS.length} quests once and never again`,
    `${first?.quests.length} then ${again === null ? 'none' : again.quests.length}`
  );
  check(
    ownedCrystals(game).length === CRYSTAL_QUESTS.length,
    'and the crystals they pay are actually in your hands',
    `${ownedCrystals(game).length} owned`
  );
  // Four sockets, and the Normal ladder is what opens them. Every rung after
  // the opening is a quest, so a player who finishes them has a full set.
  const normals = ownedCrystals(game).filter((c) => crystalFamily(c) === 'normal').length;
  check(
    normals + 1 >= RUN_SLOTS.length,
    `the Normal rungs plus the one you are given fill all ${RUN_SLOTS.length} sockets`,
    `${normals} Normal crystals from quests, plus the opening's one`
  );
}

// ===========================================================================
rule('UNIQUES — is every named piece real, reachable and unbreakable?');

// A unique is a fixed identity plus a switch out of the same table the trees
// use, so the rules that hold a tree together hold here: declared, read by
// something, and stacking said out loud.
{
  const undeclared: string[] = [];
  const unread: string[] = [];
  const behaviours = new Set(PLAYER_SKILLS.map((s) => s.behaviour));
  for (const u of UNIQUES) {
    for (const key of Object.keys(u.grants ?? {})) {
      const def = GRANT_BY_ID[key];
      if (!def) {
        undeclared.push(`${u.id}: ${key}`);
        continue;
      }
      // Worn by anyone, so the test is whether ANY skill you can pick reads it.
      const reachable =
        def.reads.includes(STATS) || [...behaviours].some((b) => behaviourReads(b, key));
      if (!reachable) unread.push(`${u.id}: nothing reads ${key}`);
    }
  }
  check(undeclared.length === 0, `all ${UNIQUES.length} uniques grant only declared switches`, undeclared.join(', '));
  check(unread.length === 0, 'and every one of them is read by a skill you can pick', unread.join(', '));

  // Declared and read is not the same as READABLE. A grant whose value is the
  // wrong shape — a bare number where the sim wants { above, more } — is a
  // switch that does nothing, silently, and four of these had one. `say`
  // refusing the value is exactly that shape being wrong, so the line a card
  // prints and the line the sim acts on cannot come apart.
  const mute: string[] = [];
  const said: string[] = [];
  for (const u of UNIQUES) {
    for (const [key, value] of Object.entries(u.grants ?? {})) {
      const line = GRANT_BY_ID[key]?.say?.(value) ?? null;
      if (line === null) mute.push(`${u.id}: ${key} = ${JSON.stringify(value)}`);
      else said.push(`${u.name}: ${line}`);
    }
  }
  for (const one of said) line(`  ${one}`);
  check(
    mute.length === 0,
    'and says what it does with its own number in it, off a value the sim reads',
    mute.join('; ')
  );

  const noBase = UNIQUES.filter((u) => !GEAR_BASE_BY_ID[u.base]).map((u) => u.id);
  check(noBase.length === 0, 'and every one is a version of a base that exists', noBase.join(', '));

  // Every unique is a TRADE. A named piece that is strictly better than a
  // rolled one is not a decision, it is an upgrade with a story on it.
  const oneSided = UNIQUES.filter((u) => !u.stats.some((line) => line.range[0] < 0)).map((u) => u.id);
  check(oneSided.length === 0, 'and every one is paid for on the item itself', `no downside: ${oneSided.join(', ')}`);

  // Nothing at a bench may reach one. The slot table is empty, so capacity is
  // zero — including through the one currency that adds a slot past the cap.
  const rng2 = new Rng(77);
  const piece = makeUnique(UNIQUES[0], 70, rng2);
  const refusals = CURRENCIES.map((c) => canApply(piece, c)).filter((r) => r === null);
  check(
    modCapacity(piece) === 0 && refusals.length === 0,
    `and all ${CURRENCIES.length} currencies refuse one`,
    `capacity ${modCapacity(piece)}, ${refusals.length} would apply`
  );

  // The lines are real: worn, they move the sheet.
  const bare = makeCharacter({}, 'fireball');
  const armed = makeCharacter({}, 'fireball');
  armed.equipment.helmet = makeUnique(UNIQUE_BY_ID.hollow_crown, 70, new Rng(5));
  check(
    characterStats(armed).damage > characterStats(bare).damage &&
      characterStats(armed).maxLife < characterStats(bare).maxLife,
    'wearing one both gives and takes, on the sheet',
    `damage ${characterStats(armed).damage.toFixed(0)} vs ${characterStats(bare).damage.toFixed(0)}, ` +
      `life ${characterStats(armed).maxLife.toFixed(0)} vs ${characterStats(bare).maxLife.toFixed(0)}`
  );

  // And the switch reaches the sim, which is the whole point of routing it
  // through GRANTS rather than inventing a second path.
  const worn = makeCharacter({}, 'fireball');
  worn.equipment.gloves = makeUnique(UNIQUE_BY_ID.long_reach, 70, new Rng(6));
  check(
    treeGrants(worn).pierce === 2 && treeGrants(bare).pierce === undefined,
    'and the switch on it lands in the same grants the tree hands over',
    JSON.stringify(treeGrants(worn))
  );

  // Zone gates. Every world has something of its own, the Fissure included —
  // which is what the shallow end gets for being the shallow end.
  const zones = MAP_THEMES.map((t) => {
    const here = UNIQUES.filter((u) => opensHere(u.gate, 6, t.id));
    return `${t.name} ${here.length}`;
  });
  line(`  named pieces by world: ${zones.join(' · ')}`);
  const barren = MAP_THEMES.filter((t) => !UNIQUES.some((u) => opensHere(u.gate, 6, t.id)));
  check(
    barren.length === 0,
    'every world drops something that exists nowhere else',
    `nothing of their own: ${barren.map((t) => t.name).join(', ')}`
  );

  // A gate is a wall, not a weighting: played out, the Fissure never hands
  // over the Seam's piece however many kills it takes.
  {
    const set = deepestSet(new Rng(11), pool);
    const bare2 = new RunSim([], ladderCharacter(6, new Rng(3)), new Rng(21));
    runToCompletion(bare2, 600);
    const wrong = bare2.state.loot.items.filter(
      (i) => i.meta.unique !== undefined && UNIQUE_BY_ID[String(i.meta.unique)].gate?.zone !== 'fissure'
    );
    check(wrong.length === 0, 'and a run never drops one gated to a world it is not', `${wrong.length} out of place`);

    // And they DO drop, or the whole table is decoration.
    let found = 0;
    for (let i = 0; i < 8; i++) {
      const sim = new RunSim(set, ladderCharacter(6, new Rng(40 + i)), new Rng(600 + i));
      runToCompletion(sim, 600);
      found += sim.state.loot.items.filter((it) => it.meta.unique !== undefined).length;
    }
    check(found > 0, `and the deep end actually hands them out — ${found} in 8 descents`, 'none dropped at all');
  }

  // The bulk button takes every carried piece no currency has touched, which
  // is the whole reason it can never eat a decision — and a unique is nothing
  // but a decision, however few modifiers it rolls.
  const kit = createGame('dev');
  const named = kit.inventory.filter((i) => i.meta.unique !== undefined);
  const swept = plainGear(kit.inventory).filter((i) => i.meta.unique !== undefined);
  check(
    named.length === UNIQUES.length && swept.length === 0,
    `the kit carries all ${UNIQUES.length}, and Sell all takes none of them`,
    `${named.length} carried, ${swept.length} would be swept up`
  );

  // A cut unique costs the item and nothing else, the same as a cut base.
  const rotted = createGame('fresh');
  rotted.inventory = [makeUnique(UNIQUES[0], 70, new Rng(8))];
  rotted.inventory[0].meta.unique = 'a_unique_that_was_cut';
  heal(rotted);
  check(rotted.inventory.length === 0, 'and a save naming one that was cut drops it on load', `${rotted.inventory.length} left`);
}

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
  // The haul is a container a save can sit in for a week, so it rots too.
  bankToHaul(game, [
    makeGear('ash_wand', 1),
    { ...game.inventory[0], id: 'haul_ghost', base: 'base_that_was_renamed' },
  ]);
  game.wallet.shard_of_something_removed = 9;
  game.character.skillId = 'a_skill_that_was_cut';

  // A socket is a place an item lives, so it rots the same way a worn slot
  // does — and a run launched from a crystal whose level was cut would be
  // built on a base that resolves to nothing.
  const good = makeCrystal(4);
  addItem(game, good);
  socketItem(game, good, 's1');
  game.sockets.s2 = { ...good, id: 'socket_ghost', base: 'crystal_t9' };
  game.sockets.s_that_was_removed = { ...good, id: 'orphan' };

  // A crystal from before crystals levelled, and a quest that was cut. Neither
  // can cost the player the crystal itself, which was never bought and cannot
  // be bought back.
  const ancient = makeCrystal(3);
  delete ancient.meta.xp;
  addItem(game, ancient);
  game.quests = ['demonic_i', 'a_quest_that_was_cut'];

  // Written when crystals lived in the bags and had a tier rather than a
  // level. Both are ids in all but name, and a crystal is never bought back.
  const stranded = makeCrystal(2);
  stranded.meta.tier = stranded.meta.level;
  delete stranded.meta.level;
  game.inventory.push(stranded);
  const shelved = makeCrystal(2);
  game.stash.push(shelved);

  const healed = heal(game);
  line(`Healed: ${healed.points} points refunded, ${healed.items} items dropped, ` +
    `${healed.currencies} currencies dropped, skill replaced: ${healed.skill}`);

  check(
    !game.inventory.some((i) => i.id === 'ghost'),
    'an item whose base no longer exists is dropped',
    'a dropped base is still in the bag'
  );
  check(
    game.haul.length === 1 && !game.haul.some((i) => i.id === 'haul_ghost'),
    'and one sitting unsorted in the haul goes the same way',
    `${game.haul.length} left in the haul`
  );
  check(
    game.sockets.s1?.id === good.id &&
      game.sockets.s2 === undefined &&
      game.sockets.s_that_was_removed === undefined,
    'a socket empties when its crystal or the socket itself is gone',
    Object.entries(game.sockets).map(([k, v]) => `${k}=${v.base}`).join(' ')
  );
  check(
    healed.currencies === 1,
    'and so is a currency that no longer exists',
    `dropped ${healed.currencies} currencies`
  );
  check(
    crystalXp(ancient) === CRYSTAL_LEVELS[2].xp && addCrystalXp(ancient, 1) === 0,
    'a crystal written before it could level keeps its level and starts where it stands',
    `xp ${crystalXp(ancient)}, now level ${ancient.meta.level}`
  );
  check(
    game.crystals.includes(stranded) &&
      game.crystals.includes(shelved) &&
      !game.inventory.includes(stranded) &&
      !game.stash.includes(shelved) &&
      Number(stranded.meta.level) === 2,
    'a save from when crystals sat in the bags moves them out, tier renamed to level',
    `${game.crystals.length} in the collection, stranded at level ${stranded.meta.level}`
  );
  check(
    game.quests.length === 1 && game.quests[0] === 'demonic_i',
    'and a quest that was cut costs its entry, never the crystal it paid',
    game.quests.join(', ')
  );

  // Written before descents were counted. Nothing is scheduled on the number
  // now, so it reads off the one milestone the save does hold.
  {
    const banked = createGame('fresh');
    banked.firstClearDone = true;
    delete (banked as { clears?: number }).clears;
    heal(banked);
    const never = createGame('fresh');
    delete (never as { clears?: number }).clears;
    heal(never);
    check(
      banked.clears === 1 && never.clears === 0,
      'a save from before descents were counted reads the count off its milestone',
      `${banked.clears} after one clear, ${never.clears} after none`
    );
  }
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

  // Three slots, over a localStorage that does not exist in node. The one
  // thing here no browser test can reach: a save written BEFORE slots, which
  // has to become slot 1 rather than a game nobody can get back to.
  {
    const cells = new Map<string, string>();
    const fake = {
      getItem: (k: string) => cells.get(k) ?? null,
      setItem: (k: string, v: string) => void cells.set(k, v),
      removeItem: (k: string) => void cells.delete(k),
    };
    (globalThis as { localStorage?: unknown }).localStorage = fake;
    cells.set('crystal-core.save', JSON.stringify(game));
    cells.set('crystal-core.saved-at', '1234');

    const adopted = loadGame();
    check(
      adopted !== null && liveSlot() === 1 && cells.get('crystal-core.save') === undefined,
      'a save written before slots existed becomes slot 1, and the old key goes',
      `slot ${liveSlot()}, legacy ${cells.has('crystal-core.save') ? 'left behind' : 'gone'}`
    );
    check(savedAt(1) === 1234, 'keeping when it was written', String(savedAt(1)));

    // Where the writes go is the live slot and nothing else.
    setLiveSlot(2);
    saveGame(game);
    check(
      peekSlot(2)?.name === game.character.name && peekSlot(3) === null,
      'and every write after that lands in the slot being played',
      `2: ${peekSlot(2)?.name ?? 'empty'}, 3: ${peekSlot(3)?.name ?? 'empty'}`
    );

    // A copy is the text itself, so the two slots are the same game rather
    // than two serialisations that might disagree.
    copySlot(2, 3);
    check(
      cells.get('crystal-core.save.3') === cells.get('crystal-core.save.2'),
      'a copy is the save itself, byte for byte',
      'the copy differed from what it came from'
    );
    clearSave(3);
    check(
      peekSlot(3) === null && peekSlot(2) !== null,
      'and clearing one leaves the rest',
      `3: ${peekSlot(3) ? 'still there' : 'gone'}, 2: ${peekSlot(2) ? 'kept' : 'lost'}`
    );

    setLiveSlot(1);
    delete (globalThis as { localStorage?: unknown }).localStorage;
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
  const HIGH = 99000;
  const held = { ...game, inventory: [makeGear('ash_wand', 1)], stash: [], craftId: null };
  held.inventory[0].id = `gear_${HIGH}`;
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

  // The check above named the collections it looked in, and so did the code:
  // the shop's shelf is stored so it does not re-roll on every open, and it
  // was on neither list. So this asks the question of EVERY field that can
  // hold an item, found by walking the save rather than by remembering.
  const collections: Array<[string, (g: GameState, item: Item) => void]> = [
    ['inventory', (g, item) => { g.inventory = [item]; }],
    ['stash', (g, item) => { g.stash = [item]; }],
    ['crystals', (g, item) => { g.crystals = [item]; }],
    ['sold', (g, item) => { g.sold = [{ item, price: 1 }]; }],
    ['shopStock', (g, item) => { g.shopStock = [item]; }],
    ['equipment', (g, item) => { g.character.equipment = { weapon: item }; }],
  ];
  const leaked: string[] = [];
  collections.forEach(([where, put], i) => {
    // Its own high-water mark, above anything minted so far. One shared number
    // and the counter is already past it by the second case, which is a check
    // that passes whatever the code does.
    const mark = HIGH + (i + 1) * 1000;
    const save = {
      ...createGame('fresh'),
      inventory: [], stash: [], crystals: [], sold: [], shopStock: [], craftId: null,
    };
    save.character = { ...save.character, equipment: {} };
    const item = makeGear('ash_wand', 1);
    item.id = `gear_${mark}`;
    put(save, item);
    if (readSave(JSON.stringify(save)) === null) { leaked.push(`${where} (refused)`); return; }
    const next = Number(/_(\d+)$/.exec(makeGear('ash_wand', 1).id)?.[1] ?? 0);
    if (next <= mark) leaked.push(`${where} (minted gear_${next} against gear_${mark})`);
  });
  check(
    leaked.length === 0,
    `every collection a save can hold items in claims its ids: ${collections.map(([n]) => n).join(', ')}`,
    `handed out again after: ${leaked.join(', ')}`
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
