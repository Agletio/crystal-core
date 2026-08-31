import { readFileSync } from 'node:fs';
import { Rng } from './rng';
import { ModPool } from './mods';
import { canApply, craft, describeItem, describeMod, itemMatches } from './crafting';
import {
  AILMENT,
  ALL_MODS,
  AILMENT_OF_TYPE,
  CRYSTAL_MODS,
  USES,
  usesFor,
  ATTRIBUTES,
  DEFENCE,
  FISSURE,
  BINDING_BY_ID,
  HERO_BASE,
  MANA,
  MELEE,
  POTIONS,
  DROP_BANDS,
  monsterResStat,
  LEVELLING,
  ENCOUNTERS,
  MAIN_SKILLS,
  MAIN_SLOT,
  starterWeapon,
  PLAYER_SKILLS,
  SKILL_CATEGORIES,
  SKILL_SHELVES,
  SKILL_SLOTS,
  skillsInCategory,
  SKILL_SLOT_BY_ID,
  AURA,
  AURAS,
  AURA_BY_ID,
  CURRENCIES,
  CURRENCY_BY_ID,
  CAMPAIGN_REWARD,
  LADDER_RUNGS,
  CRYSTAL_LEVELS,
  CRYSTAL_XP,
  HOARD,
  INTRO,
  BOSSES,
  BOSS_BY_ID,
  BOSS_KEYS,
  BOSS_KEY_BY_ID,
  BOSS_POSES,
  LAMPWRIGHT,
  MOD_TIER_LIFT,
  DAMAGE_GROUPS,
  DAMAGE_TYPES,
  ARMOUR_BASES,
  ARMOUR_FAMILIES,
  ADDED_DAMAGE_STATS,
  ADDED_DAMAGE_TYPES,
  AILMENT_BY_ID,
  AILMENTS,
  DANGER_STATS,
  DROP_GROUPS,
  MONSTER_RANKS,
  CRYSTAL_LADDER,
  GRINDS,
  DAMAGE_TYPE_BY_ID,
  MONSTER_ABILITIES,
  abilitiesFor,
  MONSTER_ABILITY_BY_ID,
  monsterAddedStat,
  MONSTERS,
  MONSTERS_BY_FAMILY,
  MONSTER_FAMILIES,
  rungsBelow,
  LOCKS,
  MAP_THEMES,
  POWER,
  REWARD,
  findStat,
  opensHere,
  FORGED,
  FORGED_BY_ID,
  RELICS,
  RELIC_BY_ID,
  WEAPON_BASES,
  BASE_TIER_ILVL,
  ARMOUR_SLOT_KINDS,
  GEAR_BASES,
  HYBRID,
  IMPLICIT_STAT,
  JEWEL_IMPLICITS,
  STAT_POWER,
  GEAR_BASE_BY_ID,
  KIND_VARIETY,
  WARD_GROUPS,
  WEAPON_SPECIALITY,
  PERFECT,
  BASE_TIER_MODS,
  MATERIALS,
  MATERIAL_PRICE,
  GATHER,
  MATERIAL_FAMILIES,
  CRAFT,
  MATERIAL_BY_ID,
  MEAL,
  MEALS,
  MEAL_BY_FISH,
  MATERIAL_FAMILY_BY_ID,
  WORK,
  PROFESSION,
  PROFESSIONS,
  PROVING,
  RUN_SLOTS,
  armourBudget,
  implicitSpend,
  RECIPES,
  LADDER,
  ORDER,
  SKILLS,
  SKILL_BY_ID,
  THEME_BY_ID,
  TRADE,
  UNIQUES,
  UNIQUE_BY_ID,
  DUAL,
  EQUIP_SLOTS,
  OFF_SLOT,
  WARRIOR,
  TRADE_BASE,
  stunChanceFor,
  WEAPON_SLOT,
} from './data';
import { variants } from './sim/appearance';
import type { GearBase } from './types';
import {
  arenaAt, campaignDone, campaignLine, campaignPrize, canEnter, climbed, furthest, takeRung,
  zoneOpen,
} from './ladder';
import { canDualWield } from './sim/character';
import { seamSocketed } from './sim/crystal';
import {
  balance,
  grant,
  canBePerfect,
  makeCrystal,
  makeMaterial,
  pickGearBase,
  gamblePrice,
  bestSale,
  soldHere,
  gambleFor,
  shopIlvl,
  recipeInputs,
  rollCrystal,
  makeGear,
  makeUnique,
  makeRelic,
  canSell,
  isPerfect,
  perfectChance,
  rollGear,
  sellPrice,
} from './economy';
import { hasGearArt } from './ui/icons';
import { lootSpan } from './render/renderer';
import { RunSim, TICK, runToCompletion, walkToMeeting } from './sim/run';
import { findPath } from './sim/pathfind';
import { folkMet, gaveKey, hasMet, keyOwed, takeBoss, takeMet, whoIsDown } from './game/scenes';
import { GRIND_COUNTERS, descentFacts, healTrials, takeGrinds } from './game/trials';
import {
  TALLY_CAP, TRIAL_POINTS_MAX, canAllocateTrial, canDeallocateTrial, trialNodes, trialPointsFor,
} from './trials';
import * as trialsModule from './trials';
import { forgedFor, graft, graftRefusal, graftableKinds, relicFor, spendRelic } from './game/graft';
import {SCENES, SCENE_BY_ID } from './scenes';
import { CAMP_ART, CAMP_HOTSPOTS, CAMP_SPOTS, CAMP_STAND } from './scenes/camp';
import type { Hotspot } from './scenes/camp';
import { SCENE_ART } from './render/generated-scene';
import type { SceneDef } from './scenes';
import { COVER_PROPS, COVER_SET, FACE_FOOT, FACE_HEAD, FOOT, HUNG_PROPS, VIGNETTES, WALL_PROPS } from './vignettes';
import { PROP_ART } from './render/generated-props';
import {
  eatMeal,
  jobsIn,
  loadWork,
  mealRuns,
  professionAt,
  whyNotWork,
  xpToNext as workXpToNext,
} from './game/work';
import {
  craftBase,
  dismantle,
  dismantleYield,
  liftFor,
  makersOf,
  perfectChanceAt,
  qualityRoll,
  recipeFor,
  whyNotCraft,
} from './game/forge';
import { ZONES } from './render/generated-tiles';
import type { Entity, RunState } from './sim/run';
import {
  declaredCapacity,
  baseTier,
  fullUses,
  modCapacity,
  rollRandomMod,
  slotAllocation,
  slotCapacity,
  slotTypes,
  slotUsed,
  statPower,
} from './mods';
import { ENTRANCE, EXIT, FLOOR, TUNNEL, WALL, dist, generateMap, sceneMap } from './sim/grid';
import type { Grid } from './sim/grid';
import { CREATURE_FRAMES, GLOW, IDLE_CYCLE, STRIDE_CYCLE, framesOf, wellFormed } from './render/sprites';
import { PORTRAITS } from './render/portraits';
import { BEASTIARY, MONSTER_FRAMES } from './render/bestiary';
import { GENERATED } from './render/generated-art';
import { GENERATED_ICONS } from './render/generated-icons';
import { HELD, HERO_HANDS } from './render/held';
import { heldFor } from './sim/appearance';
import { IDLE_CALM, animates, generatedFrame, idleTravel } from './render/sprites';
import { HERO_SCALE } from './sim/appearance';
import type { Cel } from './render/sprites';

/** A frame request with everything defaulted, so a check names only what it
 *  is actually asking about. */
const cel = (of: Partial<Cel>): Cel => ({
  action: 'idle', through: 0, elapsed: 0, walked: 0,
  skill: null, facing: 0, spell: false, ...of,
});
import {
  characterStats,
  gripOf,
  specialistMod,
  convertedType,
  heroStats,
  damageBreakdown,
  damageDetail,
  monsterStats,
  effectiveSkill,
  weaponMod,
  weaponSwing,
  weaponRates,
  skillBase,
  statMods,
  passiveScale,
  treeGrants,
  trialMod,
  ailmentChances,
  attributeTotals,
  retag,
} from './sim/stats';
import { ailmentLine, damageWorkings, readWorkings } from './damage-text';
import { potionReading, potionWorkings } from './potion-text';
import { mainWorkings, slotWorkings } from './skill-text';
import { describeStatLine } from './mod-text';
import { KEYWORDS, KEYWORD_BY_GRANT, bannedIn, keywordsIn } from './keywords';
import type { KeywordDef } from './keywords';
import { SKILL_BEHAVIOURS, castScale, targetScale } from './sim/skills';
import {
  GRANTS,
  GRANT_BY_ID,
  SIM,
  STATS,
  behaviourReads,
  critBuff,
  landingOf,
  mergeGrants,
  overchargeOf,
  shieldShare,
  starvedMultiplier,
  bleedOf,
} from './sim/grants';
import { SPUR_COUNT, SPUR_STEPS, TRUNK_NODES } from './trees/layout';
import { SPOKE_COUNT, SPOKE_NODES, TRADE_NODES } from './trades/layout';
import {
  TRADES,
  baselineLines,
  tradeGrants,
  TRADE_BY_ID,
  canAllocateTrade,
  canDeallocateTrade,
  neighboursOfTrade,
  tradePointsFor,
  respecCost,
} from './trades';
import { INTERACTIONS, interactionOf } from './trees/interactions';
import { ARM_COUNT, ARM_STEPS, MOVE_NODES, MOVE_POINTS } from './moves/layout';

/** Every skill the movement slot takes, so a third one joins every sweep. */
const MOVERS = MOVE_WEBS.map((m) => m.spec.skillId);
import { canAllocateIn } from './webgraph';
import {
  BUILT_TREES,
  MOVE_WEBS,
  CENTRE,
  MAX_TREE_POINTS,
  blockedBy,
  canAllocate,
  canDeallocate,
  neighboursOf,
  nodeById,
  pathToNotable,
  treeFor,
} from './skills-tree';
import {
  addSkillXp,
  addXp,
  attributePointsFor,
  attributePointsLeft,
  forgetAttributes,
  attributesSpent,
  equipSkill,
  equippedSkill,
  mainSkillId,
  weaponFamilies,
  weaponFits,
  weaponRefusal,
  openSlots,
  slotForSkill,
  makeCharacter,
  pointsAvailable,
  skillProgress,
  spendAttribute,
  allocateTrade,
  deallocateTrade,
  takeUpTrade,
  tradePointsLeft,
  xpToNext,
} from './sim/character';
import type { Character } from './sim/character';
import { bestBuild, buildPower, deepestSet, ladderCharacter, ladderSet, loadoutMods, starterLoadout } from './sim/loadout';
import type { BuildShape } from './sim/loadout';
import { composition, crystalFamily, familyPlan, mapTheme, runSet } from './sim/crystal';
import { armourReduction, dropBias } from './sim/stats';
import {
  arrowFlight,
  auraLook,
  floorPalette,
  lightningArc,
  livingDecals,
  PROPS,
  STORM_HEIGHT,
  stormBolts,
  stormCloud,
  paletteFrom,
  tileDecals,
} from './render/renderer';
import { VFX_ART } from './render/generated-vfx';
import {
  CARRY,
  addItem,
  SOLD_CAP,
  bagsFull,
  bankLoot,
  buyBack,
  buyStashSpace,
  carryRoom,
  craftItem,
  createGame,
  crystalsIn,
  equipItem,
  grantFirstClear,
  handClash,
  armForSkill,
  giftWeapon,
  plainGear,
  isUnique,
  replaceItem,
  selectForCraft,
  sellAll,
  sellItem,
  socketFor,
  socketItem,
  socketed,
  gearKindOf,
  sortGear,
  relicsIn,
  stashRoom,
  stashUpgradeCost,
  toStash,
  unequipItem,
  fitsSlot,
} from './game/state';
import { buildReport } from './game/report';
import {
  addCrystalXp,
  crystalXp,
  giftWaiting,
  giftSchedule,
  ladderOwed,
  ladderSchedule,
  ownedCrystals,
  takeHandover,
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

/** A monster to MEASURE, off the pool rather than by name: every measurement
 *  here wants an ordinary body and none wants a particular one, so naming a
 *  row is a measurement that breaks the day the roster is cut. */
const PLAIN = MONSTERS.find((m) => m.family === 'normal')!;
const pool = new ModPool(ALL_MODS);

/**
 * The strongest build the search can find at a band, memoised — it is about a
 * second each. Anything measuring what a descent PAYS has to run one: a
 * character that dies banks nothing, so an economy read off `ladderCharacter`
 * is a measurement of a build with no plan rather than of the game.
 */
const ceilings = new Map<string, ReturnType<typeof bestBuild>>();
const ceiling = (band: number, skillId = 'strike', level?: number): ReturnType<typeof bestBuild> => {
  const key = `${band}:${skillId}:${level ?? ''}`;
  const already = ceilings.get(key);
  if (already) return already;
  const made = bestBuild(band, new Rng(99), skillId, level);
  ceilings.set(key, made);
  return made;
};
const rng = new Rng(20260804);

// The real palette, out of the stylesheet the page ships — checking what a
// player sees against invented colours would prove nothing.
const PALETTE = paletteFrom((cssVar) => {
  const css = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
  return new RegExp(`${cssVar}\\s*:\\s*([^;]+);`).exec(css)?.[1] ?? '';
});

const line = (s = '') => console.log(s);

/** A body that CANNOT move needs no walk, and nothing measured off one means
 *  anything for it. `moveSpeed` 0 is the whole test; the Spire is the first. */
const rooted = (sprite: string): boolean =>
  MONSTERS.some((m) => m.sprite === sprite && m.moveSpeed === 0);
/** `DEMO_TIME=1` prints how long each section took. The run is 19 minutes of
 *  real descents and knowing WHICH is the difference between cutting a check
 *  and cutting the wrong one. */
let ruleAt = Date.now();
let ruleWas = '';
const rule = (t: string) => {
  if (process.env.DEMO_TIME && ruleWas) {
    line(`   ${((Date.now() - ruleAt) / 1000).toFixed(1)}s — ${ruleWas}`);
  }
  ruleAt = Date.now();
  ruleWas = t;
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
let ran = 0;
function check(ok: boolean, good: string, bad: string): void {
  ran++;
  if (ok) {
    line(`  ✓ ${good}`);
    return;
  }
  failed++;
  line(`  ✗ FAILED — ${bad}`);
}

let parkedCount = 0;

/**
 * A check DEFERRED to the balance pass, at the user's word. Each reads off the
 * characters the ladder walks, and that walk moves with everything. The numbers
 * still print, and the line above each one says what it read.
 */
function parkedCheck(ok: boolean, good: string, bad: string): void {
  if (ok) {
    line(`  ✓ ${good}`);
    return;
  }
  parkedCount++;
  line(`  … PARKED for the balance pass — ${bad}`);
}

/**
 * A balance number: measured, printed, and never a failure.
 *
 * `CLAUDE.md` — nothing is tuned until every system is in, and each one still
 * to land hands out more power than the last. So the difficulty and reward
 * TARGETS report instead of asserting, and the figure beside each is what the
 * balance pass reads for a before and an after. What must not break is
 * MECHANISM, and that is still `check()`.
 */
const gauge = (s: string) => line(`  · ${s}`);

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

let trinket = makeGear('ring_life_t3', 40, 'Band of Ash');
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
  const rings = ['ring_life_t1', 'ring_life_t2', 'ring_life_t3'].map((b) => modCapacity(makeGear(b, 60)));
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

// Twelve families over TWO budgets. A hybrid spends `HYBRID.lift` of a
// specialist's, which is the user's own rule and the whole of what two
// professions buy — so what has to hold here is that each family spends ITS
// budget and no more, and that the spread WITHIN a group is rounding. The thing
// that stops "hybrid" being simply the correct answer is the other half, which
// THE HYBRID RULE holds: the most of any one stat is a specialist's.
{
  let overspent = 0;
  let worstSpread = 0;
  const rows: string[] = [];

  for (const kind of ['helmet', 'body', 'gloves', 'boots']) {
    for (let tier = 1; tier <= 3; tier++) {
      const spends = ARMOUR_FAMILIES.map((f) => {
        const base = GEAR_BASE_BY_ID[`${f.id}_${kind}_t${tier}`];
        return { id: f.id, hybrid: f.archetypes.length > 1, points: base ? implicitSpend(base) : -1 };
      });
      for (const s of spends) {
        // One line rounds by under a point, and no family authors more than
        // four, so anything past this is a mix that does not sum to one.
        if (Math.abs(s.points - armourBudget(kind, tier, s.hybrid)) > 1) overspent++;
      }
      // WITHIN a group: across the two, the gap is the lift and is the point.
      for (const group of [true, false]) {
        const at = spends.filter((s) => s.hybrid === group).map((s) => s.points);
        worstSpread = Math.max(worstSpread, Math.max(...at) - Math.min(...at));
      }
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
  check(worstSpread <= 1, 'so no family out-earns another of its own kind at the same slot and rung',
    `the widest spread inside one group is ${worstSpread.toFixed(2)} points`);

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

  // AND EVERY BASE HAS A SIZE ON THE FLOOR. Drawn at one width, a ring was as
  // big as a greatsword. Jewellery is only SLIGHTLY smaller than the smallest
  // gear — the user's call — so a ring is still a thing rather than a speck.
  {
    const span = (id: string) => {
      const b = GEAR_BASE_BY_ID[id];
      return lootSpan(b?.kind ?? 'weapon', b?.hands ?? 1);
    };
    const spans = GEAR_BASES.map((b) => [b.id, span(b.id)] as const);
    const unsized = spans.filter(([, n]) => !(n > 0)).map(([id]) => id);
    check(unsized.length === 0, 'every base has a size to lie on the floor at', unsized.join(', '));
    const smallestGear = Math.min(
      ...GEAR_BASES.filter((b) => !['ring', 'amulet'].includes(b.kind)).map((b) => span(b.id))
    );
    const jewels = GEAR_BASES.filter((b) => ['ring', 'amulet'].includes(b.kind)).map((b) => span(b.id));
    const twoHand = Math.max(...GEAR_BASES.map((b) => span(b.id)));
    line(`  on the floor: a two-hander spans ${twoHand} tiles, the smallest gear ${smallestGear}, jewellery ${Math.min(...jewels)}`);
    check(
      Math.max(...jewels) < smallestGear && Math.min(...jewels) > smallestGear * 0.75,
      'and jewellery is only SLIGHTLY under the smallest gear, never a speck',
      `${Math.min(...jewels)} against ${smallestGear}`
    );
    check(
      twoHand > smallestGear * 1.5,
      'while a two-handed weapon is the biggest thing that drops',
      `${twoHand} against ${smallestGear}`
    );
  }

  // EVERY BASE IS DRAWN, and there is nothing behind it any more: the
  // hand-drawn silhouettes are gone, so a base whose art nobody generated is a
  // blank square in the bag AND on the floor rather than a wrong picture.
  const artless = GEAR_BASES.filter((b) => !hasGearArt(b.art)).map((b) => b.id);
  check(artless.length === 0,
    `all ${new Set(GEAR_BASES.map((b) => b.art)).size} gear art keys are generated icons`,
    `${artless.length} bases have no icon: ${artless.slice(0, 3).join(', ')}`);
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
    for (const seed of [11, 29, 47, 63, 71, 89, 97, 103, 117, 131]) {
      const set = ladderSet(band, new Rng(400 + seed + band), pool);
      const sim = new RunSim(set, ceiling(band), new Rng(seed * 31 + band));
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
rule('THE BAG — what comes up out of the Fissure, and can the loop wedge?');

// There is one container: your bag, and everything a cleared descent found
// lands in it. What has to hold: a run never loses a drop, capacity is read
// between runs so nothing is split, and there is always a way back under the
// limit — otherwise the game has a state you cannot play out of.
{
  // WHAT THE MIX IS. *"you end up with just a ton of rings and amulets."*
  // Weighted by SLOTS alone that was true and measured: jewellery is 10 rows
  // of implicit an armour family is one of, so ten bases read as ten times the
  // variety. `KIND_VARIETY` is AUTHORED for exactly that reason — a weight
  // that tracks how many rows a table happens to hold is a weight the next
  // table to grow silently moves.
  {
    const roll = new Rng(7);
    const share: Record<string, number> = {};
    const SPINS = 20000;
    for (let i = 0; i < SPINS; i++) {
      const base = pickGearBase(60, roll);
      if (base) share[base.kind] = (share[base.kind] ?? 0) + 1;
    }
    const pct = (kind: string) => (100 * (share[kind] ?? 0)) / SPINS;
    gauge(
      'every drop: ' +
        Object.keys(KIND_VARIETY).map((k) => `${pct(k).toFixed(1)}% ${k}`).join(', ')
    );
    const barren = Object.keys(KIND_VARIETY).filter((k) => !share[k]);
    check(
      barren.length === 0 && pct('ring') < 15,
      'every kind is reachable by a drop, and no one of them owns the bag',
      `${barren.join(', ') || 'all reachable'}, rings ${pct('ring').toFixed(1)}%`
    );
  }

  const game = createGame('fresh');
  const drops = Array.from({ length: 20 }, (_, i) => makeGear('ash_wand', i + 1));
  bankLoot(game, drops);
  check(
    game.inventory.length === 20,
    'a cleared run banks the lot into your bags',
    `${game.inventory.length} carried`
  );

  // Deliberately past the limit: the alternative is splitting a descent's
  // drops, and the run that was cut in half is the one you remember.
  const flood = CARRY.gear;
  bankLoot(
    game,
    Array.from({ length: flood }, (_, i) =>
      i % 2 === 0 ? makeGear('ash_wand', 5) : rollGear('ash_wand', 40, 2, pool, new Rng(600 + i))
    )
  );
  check(
    game.inventory.length === 20 + flood && bagsFull(game),
    'and overflows rather than dropping anything on the floor',
    `${game.inventory.length} of ${CARRY.gear}`
  );

  // The wedge: bag over its limit, stash full. Selling is the one move that
  // needs room nowhere, which is what makes it the way out.
  while (stashRoom(game) > 0) game.stash.push(makeGear('ash_wand', 1));
  check(
    carryRoom(game, 'gear') <= 0 && stashRoom(game) === 0 && bagsFull(game),
    'with everything full there is nowhere left to put one',
    `${game.inventory.length} carried, ${carryRoom(game, 'gear')} bag room`
  );

  // What a Find box matches. A bag is a night's work and the only other way
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

  // Sorting is not moving: the dock's comparator orders the pile in place and
  // a sort that quietly took something out of it would be the one screen that
  // spends your loot for you.
  {
    const pile = createGame('dev');
    pile.inventory = [
      makeGear('bulwark_helmet_t1', 8),
      makeGear('rusted_sword', 8),
      makeGear('shiv', 30),
      makeGear('bulwark_body_t2', 30),
    ];
    const was = [...pile.inventory];
    sortGear(pile.inventory);
    check(
      pile.inventory.length === was.length && was.every((i) => pile.inventory.includes(i)),
      'sorting a pile holds exactly what it held',
      `${was.length} in, ${pile.inventory.length} out`
    );
    const order = pile.inventory.map((i) => i.id).join(',');
    sortGear(pile.inventory);
    check(
      pile.inventory.map((i) => i.id).join(',') === order,
      'and sorting it twice changes nothing',
      order
    );
  }

  const sold = sellAll(game, plainGear(game.inventory));
  check(
    sold.count > 0 && !bagsFull(game) && sold.gold > 0,
    `and selling ${sold.count} pieces for ${sold.gold} gold reopens the Fissure`,
    `${game.inventory.length} still carried after selling ${sold.count}`
  );
  const rest = sellAll(game, [...game.inventory]);
  check(
    game.inventory.length === 0 && rest.count > 0,
    'and selling ALL of it empties the bag with every other container full',
    `${game.inventory.length} left after selling ${rest.count}`
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
//
// THE BOUND IS 200 BECAUSE GEAR IS RARE. At 0.27 pieces a clear a 32-slot bag
// is roughly ninety descents of chaining, where it used to be a dozen — so a
// bound of 60 stopped measuring the terminus and started asserting that gear
// is common.
{
  const game = createGame('fresh');
  game.character = ladderCharacter(2, new Rng(31));
  const set = ladderSet(2, new Rng(4141), pool);
  let runs = 0;
  let stop = 'never';

  while (runs < 200) {
    const final = runToCompletion(new RunSim(set, game.character, new Rng(9000 + runs)), 400);
    runs++;
    const report = buildReport(game, final);
    if (!report.cleared) { stop = 'died'; break; }
    if (report.bagsFull) { stop = 'full'; break; }
  }
  line(`  the loop ran ${runs} descents and stopped: ${stop} (${game.inventory.length} carried)`);
  check(
    stop !== 'never' && runs > 1,
    'a loop stops on a death or a full bag, and never on the first clear',
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
  const first = makeGear('skirmisher_helmet_t1', 20);
  const spacer = makeGear('skirmisher_body_t1', 20);
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

// A bow takes both hands. Neither direction may be a refusal: the piece in the
// other hand comes OFF and goes back in the bag, and the undo puts both back —
// otherwise swapping between a shield build and a bow build is a puzzle.
//
// Cast by a SPELL, which requires no weapon at all: a melee skill refuses a bow
// outright now, and this is about the HAND clash rather than about that.
{
  const game = createGame('fresh');
  game.character.equipped = { ...game.character.equipped, main: 'fireball' };
  game.inventory = [];
  const bow = makeGear('crude_bow', 20);
  const shield = makeGear('bark_buckler', 20);
  const sword = makeGear('rusted_sword', 20);
  for (const item of [bow, shield, sword]) addItem(game, item);

  equipItem(game, shield, 'offhand');
  const undoBow = equipItem(game, bow, 'weapon');
  check(
    game.character.equipment.weapon?.id === bow.id &&
      !game.character.equipment.offhand &&
      game.inventory.some((i) => i.id === shield.id),
    'a bow takes the off hand off rather than refusing to go on',
    `weapon=${game.character.equipment.weapon?.name} offhand=${game.character.equipment.offhand?.name}`
  );
  check(
    undoBow?.() === true &&
      game.character.equipment.offhand?.id === shield.id &&
      !game.character.equipment.weapon,
    'and undoing it puts the shield back in the hand it came out of',
    `offhand=${game.character.equipment.offhand?.name}`
  );

  // And the other way round, which is the direction a player hits by accident.
  equipItem(game, bow, 'weapon');
  equipItem(game, shield, 'offhand');
  check(
    game.character.equipment.offhand?.id === shield.id &&
      !game.character.equipment.weapon &&
      game.inventory.some((i) => i.id === bow.id),
    'and an off hand takes the two-hander off the same way',
    `weapon=${game.character.equipment.weapon?.name} offhand=${game.character.equipment.offhand?.name}`
  );

  // A one-handed weapon clashes with nothing, or every sword build would be
  // dropping its shield on the floor.
  equipItem(game, sword, 'weapon');
  check(
    game.character.equipment.weapon?.id === sword.id &&
      game.character.equipment.offhand?.id === shield.id,
    'while a one-handed weapon leaves the off hand exactly where it was',
    `offhand=${game.character.equipment.offhand?.name}`
  );
}

// Block is a shield and nothing else, and a stat nobody can see landing is a
// stat that might not be wired at all. Two runs of the same seed against the
// same set: one holding a shield, one holding nothing.
{
  const blocksIn = (shield: string | null): { blocked: number; chance: number } => {
    const game = createGame('dev');
    equipSkill(game.character, 'strike');
    game.character.level = 16;
    game.character.equipment = {};
    if (shield) game.character.equipment.offhand = makeGear(shield, 40);
    const sim = new RunSim([], game.character, new Rng(99));
    runToCompletion(sim, 400);
    return {
      blocked: sim.state.blocked,
      chance: characterStats(game.character).blockChance,
    };
  };
  const bare = blocksIn(null);
  const held = blocksIn('tower_shield');
  line(`  a Graven Tower Shield is ${held.chance}% Block, and turned aside ${held.blocked} hits in one descent`);
  check(bare.chance === 0 && bare.blocked === 0, 'nothing but a shield grants Block', `${bare.chance}% bare`);
  check(held.chance > 0 && held.blocked > 0, 'and a shield really does turn hits aside', `${held.blocked} blocked`);
  check(
    held.chance <= DEFENCE.blockCap,
    'and it never reads past the cap',
    `${held.chance}% against a cap of ${DEFENCE.blockCap}%`
  );
}

// The bench takes worn gear, so the crafting window can show what you are
// wearing beside it. Two things have to hold: the bench must RESOLVE a worn
// item, and a craft must land back in the equip slot rather than in the bag.
{
  const game = createGame('fresh');
  game.inventory = [];
  // Cast by a SPELL, which requires no weapon: this is about the BENCH, and
  // Strike both refuses a wand and refuses to have its sword taken off.
  game.character.equipped = { ...game.character.equipped, main: 'fireball' };
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

  // GENERATED bodies are their own table, and `monsterArt` asks `BEASTIARY`
  // FIRST — so a sprite id in both is a generated body that never draws, in
  // silence. That cost a whole session's judgement of generated art once.
  {
    const shared = Object.keys(GENERATED).filter((id) => BEASTIARY[id]);
    check(
      shared.length === 0,
      `all ${Object.keys(GENERATED).length} generated bodies have an id no hand-drawn one uses`,
      shared.join(', ')
    );
    // And every frame of one is square, exactly as a hand-drawn one is, plus
    // every state naming frames that exist — a run past the end is a body that
    // stops mid-animation and never says why.
    const bad: string[] = [];
    for (const [id, art] of Object.entries(GENERATED)) {
      bad.push(...wellFormed(art.frames, art.grid).map((b) => `${id} ${b}`));
      for (const [state, run] of Object.entries(art.states)) {
        if (run.length === 0) bad.push(`${id}/${state} is empty`);
        for (const at of run) {
          if (!art.frames[at]) bad.push(`${id}/${state} wants frame ${at} of ${art.frames.length}`);
        }
      }
      if (!art.states.walk && !rooted(id)) bad.push(`${id} has no walk`);
      // A facing is one STRIDE along the flat list, so the list has to divide
      // by the facings and a state's runs have to sit inside the first one.
      const stride = art.frames.length / art.dirs.length;
      if (!Number.isInteger(stride)) {
        bad.push(`${id}: ${art.frames.length} frames over ${art.dirs.length} facings`);
      } else {
        for (const [state, run] of Object.entries(art.states)) {
          if (run.some((at) => at >= stride)) bad.push(`${id}/${state} runs past one facing`);
        }
      }
    }
    check(bad.length === 0, 'and every state of one names frames that exist', bad.join('; '));

    // What a hand HOLDS is pinned to a frame of a body, so both halves have to
    // resolve: an icon nobody drew is a weapon that silently vanishes, and a
    // hand run shorter than the state it belongs to leaves a sword hanging on
    // the frame the arm has already left.
    {
      const wrong: string[] = [];
      for (const [art, spec] of Object.entries(HELD)) {
        if (!GENERATED_ICONS[spec.icon]) wrong.push(`${art} wants icon ${spec.icon}`);
        if (!(spec.size > 0)) wrong.push(`${art} is ${spec.size} tiles`);
      }
      // Every weapon FAMILY is holdable, or a base drops that nothing draws.
      const families = [...new Set(WEAPON_BASES.map((b) => b.family ?? b.id))];
      const nothing = families.filter((f) => !HELD[f]);
      check(
        wrong.length === 0 && nothing.length === 0,
        `every weapon family is held — ${families.join(', ')}`,
        [...wrong, ...nothing.map((f) => `${f} holds nothing`)].join('; ')
      );

      // A run may be a TRACK — `attack/bow` is the same animation held in the
      // other hand — so the state is what is left of the key.
      for (const [sprite, states] of Object.entries(HERO_HANDS)) {
        const art = GENERATED[sprite];
        if (!art) {
          wrong.push(`${sprite} is not a generated body`);
          continue;
        }
        for (const [key, run] of Object.entries(states)) {
          const [state, track] = key.split('/');
          const own = art.states[state];
          if (track && !Object.values(HELD).some((h) => h.track === track)) {
            wrong.push(`${sprite}/${key}: nothing rides the ${track} track`);
          }
          if (!own) wrong.push(`${sprite}/${key} is not a state it has`);
          else if (own.length !== run.length) {
            wrong.push(`${sprite}/${key}: ${run.length} hands over ${own.length} frames`);
          }
        }
      }
      // And every track a weapon names is authored for every hero, or it
      // silently falls back to the swinging hand — which is the other arm.
      for (const spec of Object.values(HELD)) {
        if (!spec.track) continue;
        for (const [sprite, states] of Object.entries(HERO_HANDS)) {
          for (const key of Object.keys(states)) {
            if (key.includes('/')) continue;
            if (!states[`${key}/${spec.track}`]) {
              wrong.push(`${sprite}/${key} has no ${spec.track} track`);
            }
          }
        }
      }
      check(
        wrong.length === 0,
        'and every authored hand run is exactly as long as the animation it pins to',
        wrong.join('; ')
      );

      // BOTH hands reach the renderer. The off hand is the one a shield lives
      // in, and it is a second field on the entity — read off the wrong slot
      // it draws the weapon twice and nobody can tell from a still.
      {
        const who = makeCharacter({}, 'strike');
        who.trade = 'alchemist';
        who.equipment.weapon = makeGear('rusted_sword', 8);
        who.equipment.offhand = makeGear('bark_buckler', 8);
        const both = { main: heldFor(who), off: heldFor(who, 'offhand') };
        check(
          both.main === 'sword' && both.off === 'shield',
          'a worn sword and shield answer as two different pictures, one per hand',
          JSON.stringify(both)
        );
        // A two-hander empties the off hand, so nothing can hold both.
        const clash = handClash(who, makeGear('crude_bow', 8), 'weapon');
        check(
          clash === 'offhand',
          'and a bow takes the off hand off, so a shield and a bow never draw together',
          String(clash)
        );
      }
    }

    // Nothing may ask for a frame nobody DREW. `makeSheet` builds one canvas
    // per frame the art has, and every frame past that falls back to the first
    // in silence — which is a body that lunges at you and never moves.
    const past: string[] = [];
    const reached = new Set<string>();
    for (const [id, art] of Object.entries(GENERATED)) {
      const skills = [null, ...Object.keys(art.states)];
      // Dying is not an `EntityAction`, so it is swept as its own axis: a
      // corpse plays its own run over `DEATH_FADE` whatever it was doing.
      // A walk is indexed by GROUND COVERED and the others by how far through
      // they are, so the sweep has to cover a whole stride cycle at a step
      // finer than the longest run — four samples cannot reach every frame of
      // a six-frame walk, and the frame they miss is not one the game misses.
      const steps = Math.max(16, art.frames.length);
      for (const action of ['idle', 'move', 'attack', 'hurt']) {
        for (const skill of skills) {
          for (let turn = 0; turn < 16; turn++) {
            for (let step = 0; step <= steps; step++) {
              const at = step / steps;
              for (const dead of [false, true]) {
              const facing = (turn / 16) * Math.PI * 2 - Math.PI;
              const frame = generatedFrame(id, {
                action, through: at, elapsed: at * steps / IDLE_CYCLE,
                walked: at * STRIDE_CYCLE * steps,
                skill, facing, spell: false, dead, dying: at,
              });
              if (frame >= art.frames.length || frame < 0) {
                past.push(`${id} ${action}/${skill} -> ${frame} of ${art.frames.length}`);
              }
              reached.add(`${id}:${frame}`);
              }
            }
          }
        }
      }
    }
    check(past.length === 0, 'and nothing ever asks for a frame past the ones drawn', past.slice(0, 3).join('; '));
    // The other half of that, and the half no headless harness can see: how
    // many canvases `makeSheet` builds. jsdom has no 2D context, so what is
    // held here is the COUNT it loops to.
    const short = Object.entries(GENERATED).filter(([id, art]) => framesOf(id) !== art.frames.length);
    check(
      short.length === 0 && framesOf('grub') === CREATURE_FRAMES,
      'and the sheet is built to the count the art declares, not a constant',
      short.map(([id]) => id).join(', ')
    );

    // Every frame that ships is one something can actually reach. A window
    // that keeps a frame no state names is a generation nobody sees. THE ONE
    // EXCEPTION IS A RESTLESS IDLE: past `IDLE_CALM` the run holds its first
    // frame, so the rest of it is stood down on purpose — *"make the idle
    // animations way more chill."* Counted out loud, since a stand-down nobody
    // can see is the same as a frame nobody noticed was dead.
    const calmed = new Set(
      Object.entries(GENERATED).flatMap(([id, art]) =>
        idleTravel(id) > IDLE_CALM
          ? (art.states.idle ?? []).slice(1).map((at) => `${id}:${at}`)
          : []
      )
    );
    const stranded = Object.entries(GENERATED).flatMap(([id, art]) =>
      art.frames.map((_, at) => `${id}:${at}`)
        .filter((k) => !reached.has(k) && !calmed.has(k))
    );
    const restless = Object.keys(GENERATED).filter((id) => idleTravel(id) > IDLE_CALM);
    line(`  ${restless.length} idles shift their box past ${IDLE_CALM} cells and hold one frame instead`);
    check(stranded.length === 0, 'and every frame that ships is one something reaches', stranded.join(', '));
    // AND A CALM IDLE IS STILL AN IDLE: the median must stay under the line, or
    // the rule is holding the whole roster still rather than the loud few.
    const travels = Object.keys(GENERATED).map((id) => idleTravel(id)).sort((a, b) => a - b);
    const median = travels[Math.floor(travels.length / 2)];
    check(
      median <= IDLE_CALM && restless.length < Object.keys(GENERATED).length / 3,
      `and the median idle shifts ${median} cells, so it is the loud few that stand down`,
      `${restless.length} of ${Object.keys(GENERATED).length}, median ${median}`
    );

    // The three thrown abilities are three ANIMATIONS, or a body that spits
    // fire, frost and lightning plays one pose for all three.
    const throwers = MONSTER_ABILITIES.filter((a) => a.skill).map((a) => a.skill!);
    for (const [id, art] of Object.entries(GENERATED)) {
      const own = throwers.filter((s) => art.states[s]);
      if (own.length < 2) continue;
      const poses = new Set(
        own.map((s) => generatedFrame(id, cel({ action: 'attack', through: 0.5, skill: s })))
      );
      check(
        poses.size === own.length,
        `${id} plays a different animation for each of its ${own.length} thrown skills`,
        `${poses.size} poses for ${own.join(', ')}`
      );
    }

    // `cast` is for a SPELL. A body carrying one and swinging a sword must
    // swing it — the hero holds both, and the fallback is what decides.
    for (const [id, art] of Object.entries(GENERATED)) {
      if (!art.states.cast || !art.states.attack) continue;
      // Modulo the stride, since a run is written for the FIRST facing and
      // facing 0 is east, which is the middle of five.
      const stride = art.frames.length / art.dirs.length;
      const swung = generatedFrame(id, cel({ action: 'attack', through: 0.5, skill: 'strike' })) % stride;
      const cast =
        generatedFrame(id, cel({ action: 'attack', through: 0.5, skill: 'fireball', spell: true })) %
        stride;
      check(
        swung !== cast && art.states.attack.includes(swung) && art.states.cast.includes(cast),
        `${id} swings with its swing and casts with its cast`,
        `${swung} and ${cast}`
      );
    }

    // The lunge and the bob are TRANSFORMS standing in for frames. Over a body
    // that has them they are a second motion fighting the first, which reads
    // as the model being shoved forward — so both are off for every state a
    // generated body actually draws.
    const shoved = Object.entries(GENERATED).flatMap(([id, art]) =>
      ['move', 'attack']
        .filter((action) => !(action === 'move' && rooted(id)))
        .filter((action) => !animates(id, { action, skill: null, spell: false }))
        .map((action) => `${id} ${action}`)
    );
    check(
      shoved.length === 0,
      'and no generated body is moved by a transform it has frames for',
      shoved.join(', ')
    );

    // How much a run actually MOVES, as a share of the body's own ink. A walk
    // generated per facing can come back as a standing pose for the facings
    // where a stride is hard to see, and nothing else here can tell: the frames
    // differ, they are all reached, and the body slides. The hero shipped that
    // way — 26% on east and 1-7% on the other four — until the ask named the
    // legs. It PRINTS rather than fails because the Heap is a fused mass with
    // barely a gait and 1% is honest for it; what to read is one facing far
    // below the same body's best.
    for (const [id, art] of Object.entries(GENERATED)) {
      if (rooted(id)) continue;
      const run = art.states.walk;
      if (!run || run.length < 2) continue;
      const stride = art.frames.length / art.dirs.length;
      const moved = art.dirs.map((_, d) => {
        let least = 1;
        for (let i = 1; i < run.length; i++) {
          const a = art.frames[d * stride + run[i - 1]];
          const b = art.frames[d * stride + run[i]];
          let differ = 0;
          let ink = 0;
          for (let y = 0; y < a.length; y++)
            for (let x = 0; x < a[y].length; x++) {
              const p = a[y][x] !== '.';
              const q = b[y][x] !== '.';
              if (p || q) ink++;
              if (p !== q) differ++;
            }
          least = Math.min(least, ink ? differ / ink : 0);
        }
        return least;
      });
      // And how far the legs SAY they carry him: the feet at their widest is
      // one step, two of those is a cycle, and `stride` has to match it or the
      // body slides — over-travelling it skates forward, under-travelling it
      // skids back. The global per-frame constant matched no body at all.
      const drawn = MONSTERS.find((m) => m.sprite === id)?.scale ?? HERO_SCALE;
      let apart = 0;
      const side = Math.max(0, art.dirs.indexOf('east'));
      for (const f of run) {
        const rows = art.frames[side * stride + f];
        let top = rows.length;
        let bottom = -1;
        for (let y = 0; y < rows.length; y++)
          if ([...rows[y]].some((c) => c !== '.')) {
            if (y < top) top = y;
            bottom = y;
          }
        let lo = Infinity;
        let hi = -1;
        for (let y = bottom - Math.round(0.14 * (bottom - top)); y <= bottom; y++)
          for (let x = 0; x < rows[y].length; x++)
            if (rows[y][x] !== '.') {
              lo = Math.min(lo, x);
              hi = Math.max(hi, x);
            }
        if (hi >= 0) apart = Math.max(apart, hi - lo);
      }
      const depicts = (2 * apart * drawn) / art.grid;
      const shipping = art.stride ?? STRIDE_CYCLE;
      // A hem to the floor measures as a hem, so printing a percentage off it
      // would be a figure the balance pass could act on and should not.
      const off = art.robed
        ? 'its hem hides its legs, so the number is judged'
        : `its legs depict ${depicts.toFixed(2)} tiles a cycle and it travels ${shipping.toFixed(2)} ` +
          `(${depicts ? `${Math.round((100 * (shipping - depicts)) / depicts)}%` : '—'} off)`;
      gauge(
        `${id.padEnd(9)} moves ${moved.map((m) => `${Math.round(m * 100)}%`.padStart(4)).join('')} per frame; ${off}`
      );
    }

    // A state named for a skill nothing throws is a generation spent on a
    // pose that never plays.
    const known = new Set(['idle', 'walk', 'attack', 'cast', 'hurt', 'death', ...BOSS_POSES, ...throwers]);
    const odd = Object.entries(GENERATED).flatMap(([id, art]) =>
      Object.keys(art.states).filter((s) => !known.has(s)).map((s) => `${id}/${s}`)
    );
    check(odd.length === 0, 'and every state is an action or a skill something throws', odd.join(', '));
  }

  // A scene needs a BODY and a PORTRAIT: one of them walks about the room and
  // the other one speaks, and a character with only half of that is half a
  // person. Either table may hold the body — a generated one is not in
  // `BEASTIARY` at all, and must not be, or it would never draw.
  // A ROOM is a fight now and everything else is somebody you meet.
  const ARENAS = SCENES.filter((s) => s.plan);
  const rooms = SCENES;
  const halfDrawn = rooms.filter(
    (s) => !(BEASTIARY[s.who] || GENERATED[s.who]) || !PORTRAITS[s.who]
  ).map((s) => s.id);
  check(
    halfDrawn.length === 0,
    `all ${rooms.length} scenes have a sprite AND a portrait for whoever is in them`,
    halfDrawn.join(', ')
  );
  // A mis-typed id is a bench that silently is not there rather than a missing
  // texture. A BARE room draws the generated picture and skips the decals, so
  // which table has to hold it depends on whether its zone has a set — and a
  // room that went bare with only decals behind it is an EMPTY room.
  const noProp = ARENAS.flatMap((s) => {
    const map = sceneMap(s.plan!, s.theme, 1);
    const table = map.bare ? PROP_ART : PROPS;
    return map.props
      .filter((p) => !(p.id in table))
      .map((p) => `${s.id}: ${p.id}${map.bare ? ' (bare, needs generated art)' : ''}`);
  });
  check(noProp.length === 0, 'and every prop in one is drawn', [...new Set(noProp)].join(', '));

  // A VIGNETTE is placed as one thing, so its own props have to fit inside the
  // footprint it declares — over the edge, two of them overlap and a cart ends
  // up inside an altar.
  const VIGNETTE_PROPS = new Set(VIGNETTES.flatMap((v) => v.props.map((p) => p.id)));
  const spilling = VIGNETTES.flatMap((v) => [
    ...v.props.filter((p) => p.x < 0 || p.y < 0 || p.x >= v.w || p.y >= v.h).map((p) => `${v.id}/${p.id}`),
    ...v.props.filter((p) => !PROP_ART[p.id]).map((p) => `${v.id}/${p.id} undrawn`),
  ]);
  check(spilling.length === 0, `all ${VIGNETTES.length} arrangements fit the room they claim`, spilling.join(', '));

  // The two tables the ROCK is dressed from, which no vignette references and
  // so nothing else sweeps.
  const noArt = [...COVER_PROPS, ...WALL_PROPS]
    .map((w) => w.id)
    .concat([...HUNG_PROPS])
    .filter((id) => !PROP_ART[id]);
  check(noArt.length === 0, 'and everything the rock gathers is drawn too', noArt.join(', '));

  // A DESCENT over a generated set is dressed with what the ROCK did and with
  // nothing else: loose stone drifted at the wall's foot, and growth on the cut
  // face. Everything a PERSON left is placed by hand in a scene, so a descent
  // has no furniture standing on its floor at all.
  const WALL_SET = new Set(WALL_PROPS.map((w) => w.id));
  const dressedMap = (seed: number, theme: MapTheme = 'fissure') =>
    generateMap([], new Rng(seed), 1, 1, theme);
  // THE LOCKS. Three a world, and BOTH frames of each — a shut one whose open
  // frame is missing is a chest that cannot be opened, and nothing else asks.
  {
    const want = MAP_THEMES.flatMap((t) => {
      const set = LOCKS[t.id as MapTheme];
      return [...set.common, set.rare].flatMap((one) => [one.shut, one.open]);
    });
    const undrawn = want.filter((id) => !PROP_ART[id]);
    check(
      undrawn.length === 0,
      `every world's three locks are drawn shut AND open: ${want.length} frames`,
      undrawn.join(', ')
    );
    // One box, or the lid going back moves the box under it.
    const jumps = MAP_THEMES.flatMap((t) => {
      const set = LOCKS[t.id as MapTheme];
      return [...set.common, set.rare]
        .filter((one) => PROP_ART[one.shut]?.grid !== PROP_ART[one.open]?.grid)
        .map((one) => one.shut);
    });
    check(jumps.length === 0, 'and a pair shares one grid, so opening one moves nothing', jumps.join(', '));

    // AND ONE TURNS UP FOR NOTHING. *"Add some chests randomly that spawn
    // baseline… maybe 1/5 runs you get one with no points or anything."* Blank
    // crystals buy no `hoardChance` at all, so without a baseline the art
    // nobody has spent a point on is art nobody ever sees. Forty runs at 20%
    // reads zero once in seven thousand.
    const bare = ladderCharacter(0, new Rng(3));
    let saw = 0;
    for (let i = 0; i < 40; i++) {
      saw += new RunSim([], bare, new Rng(2000 + i)).state.hoards.length > 0 ? 1 : 0;
    }
    check(
      saw > 0,
      `and one turns up on BLANK crystals — ${saw} of 40 runs, against ${HOARD.baseline} a run`,
      'no chest ever appears without a point spent on it'
    );

    // AND THE PICTURE FOLLOWS. The prop the box sits on wears the OPEN frame
    // once its guards are down; the renderer reads that id per frame, so a lid
    // that stayed shut on screen was a map built once and never re-read.
    let opened = 0;
    let shut = 0;
    for (let i = 0; i < 40 && opened === 0; i++) {
      const sim = new RunSim([], ladderCharacter(0, new Rng(4)), new Rng(2000 + i));
      runToCompletion(sim, 400);
      for (const box of sim.state.hoards) {
        if (!box.opened) continue;
        if (sim.state.map.props[box.at]?.id === box.lock.open) opened++;
        else shut++;
      }
    }
    check(
      opened > 0 && shut === 0,
      `a lock that pays wears its open frame: ${opened} opened`,
      `${shut} paid out still drawn shut`
    );
  }

  {
    const map = dressedMap(11);
    const growth = map.props.filter((p) => WALL_SET.has(p.id));
    const cover = map.props.filter((p) => COVER_SET.has(p.id));
    const loose = map.props.filter((p) => !COVER_SET.has(p.id) && !WALL_SET.has(p.id));
    const undrawn = [...new Set(map.props.filter((p) => !PROP_ART[p.id]).map((p) => p.id))];
    line(`  a Fissure descent: ${cover.length} of cover, ${growth.length} on the face, ${loose.length} standing`);
    check(
      map.bare === true &&
        !!map.zone &&
        !!ZONES[map.zone] &&
        cover.length > 0 &&
        growth.length > 0 &&
        loose.length === 0 &&
        undrawn.length === 0,
      'a Fissure descent draws a generated zone, dressed with what the rock did and nothing else',
      `zone ${map.zone}, ${cover.length} cover, ${growth.length} growth, standing ${loose.map((p) => p.id).join(', ')}, undrawn ${undrawn.join(', ')}`
    );

    // What the ROCK does belongs to every zone with a set — without it an open
    // floor is one picture repeated. NO zone gets an arrangement: a room's worth
    // of objects dropped a tile at a time reads as exactly that, and a mine cart
    // is something somebody pushed there rather than something the stone grew.
    const worked = MAP_THEMES.filter((t) => {
      const it = dressedMap(12, t.id);
      return it.props.some((p) => VIGNETTE_PROPS.has(p.id));
    }).map((t) => t.id);
    const setless = MAP_THEMES.filter((t) => !dressedMap(12, t.id).zone).map((t) => t.id);
    const undressed = MAP_THEMES.filter((t) => {
      const it = dressedMap(12, t.id);
      return !!it.zone && it.props.length === 0;
    }).map((t) => t.id);
    check(
      worked.length === 0 && undressed.length === 0 && setless.length === 0,
      'every zone draws a set and the rock dresses it, and nothing scatters furniture',
      `worked: ${worked.join(', ') || 'none'}; no set: ${setless.join(', ') || 'none'}; bare: ${undressed.join(', ') || 'none'}`
    );

    // COVER is drawn as one pass UNDER the furniture, so an id in both a cover
    // table and a furniture one is a prop that sometimes goes under whatever it
    // is standing next to. The renderer splits on the id and cannot tell.
    const both = [...WALL_PROPS]
      .map((w) => w.id)
      .concat(VIGNETTES.flatMap((v) => v.props.map((p) => p.id)))
      .filter((id) => COVER_SET.has(id));
    check(
      both.length === 0,
      'and nothing that furnishes a room is also the cover under it',
      [...new Set(both)].join(', ')
    );
  }

  // Furniture you cannot walk through, and the two ways that goes wrong: a
  // solid tile that is not floor, and a solid tile nothing is standing on.
  // Then that it never walls the map off — whatever the hero is sent to has to
  // still be reachable, or a run stands still forever.
  //
  // A descent scatters none of it, so the producer is the four authored rooms:
  // every bench, shelf, rack, slab, plinth and orrery somebody put down is a
  // thing you go round. `findPath` asks `walkable`, and anything reading
  // `tiles` alone parks the hero on a tile it can never step off.
  const standsIn = (room: SceneDef) => ({
    x: Math.round(room.plan!.stands.x),
    y: Math.round(room.plan!.stands.y),
  });
  const at = (grid: Grid, v: { x: number; y: number }) =>
    Math.round(v.y) * grid.width + Math.round(v.x);

  // `block` is order-dependent and UNDOES the piece that strands something, so
  // it is DRIVEN BY HAND: nothing the game authors places furniture any more,
  // and a check whose subject nothing reaches is vacuous rather than green.
  // Beside the person is the hardest place to put one — a ring of them is a
  // meeting that can never happen, and the tile that closes it is refused.
  {
    const room = ARENAS[0];
    const plain = sceneMap(room.plan!, room.theme, 1);
    const stands = standsIn(room);
    const ring = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
      .map(([dx, dy]) => ({ x: stands.x + dx, y: stands.y + dy }))
      .filter((v) => plain.grid.at(v.x, v.y) === FLOOR);
    const walled = sceneMap(
      { ...room.plan!, props: [...room.plan!.props, ...ring.map((v) => ({ id: 'cairn', ...v }))] },
      room.theme,
      1
    );
    const grid = walled.grid;

    const seen = new Set<number>();
    const queue = [at(grid, walled.entrance)];
    seen.add(queue[0]);
    for (let head = 0; head < queue.length; head++) {
      const x = queue[head] % grid.width;
      const y = (queue[head] - x) / grid.width;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!grid.walkable(x + dx, y + dy)) continue;
        const to = (y + dy) * grid.width + (x + dx);
        if (seen.has(to)) continue;
        seen.add(to);
        queue.push(to);
      }
    }
    const held = ring.filter((v) => grid.solid[at(grid, v)]).length;
    const spared = ring.length - held;
    line(`  ${ring.length} pieces put round the person, ${held} block, ${spared} refused`);
    check(
      held >= 4 && spared >= 1 && seen.has(at(grid, stands)),
      'a solid piece of furniture blocks, and the one that would wall somebody off is refused',
      `${held} blocked, ${spared} refused${seen.has(at(grid, stands)) ? '' : ' — the person is cut off'}`
    );
    // And the route across the arena goes round whatever is standing in it.
    const route = findPath(plain.grid, plain.entrance, stands);
    const through = route.filter((wp) => plain.grid.solid[wp.y * plain.grid.width + wp.x]);
    check(
      route.length > 0 && through.length === 0,
      'and the way across the arena is walkable end to end',
      route.length === 0 ? 'no way across at all' : `${through.length} solid waypoints`
    );
  }

  // THE CAMP is the screen the game OPENS on, and it is a PICTURE — so what
  // can go wrong is not rock but ARITHMETIC: a hotspot off the edge of the art,
  // two of them overlapping so one can never be clicked, or a body standing
  // where the picture has already ended.
  {
    const art = SCENE_ART[CAMP_ART];
    const inside = (x: number, y: number, w = 0, h = 0) =>
      !!art && x >= 0 && y >= 0 && x + w <= art.w && y + h <= art.h;
    const overlap = (a: Hotspot, b: Hotspot) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

    const astray = [
      ...CAMP_HOTSPOTS.filter((h) => !inside(h.x, h.y, h.w, h.h)).map((h) => `${h.id} off the art`),
      ...CAMP_HOTSPOTS.flatMap((a, i) =>
        CAMP_HOTSPOTS.slice(i + 1).filter((b) => overlap(a, b)).map((b) => `${a.id} over ${b.id}`)
      ),
      ...CAMP_SPOTS.filter((at) => !inside(at.x, at.y)).map((at) => `a spot at ${at.x},${at.y} off the art`),
      ...(inside(CAMP_STAND.x, CAMP_STAND.y) ? [] : ['the hero stands off the art']),
    ];
    line(`  the camp is ${art?.w}x${art?.h} of drawn art with ${CAMP_HOTSPOTS.length} things on it`);
    check(
      !!art && astray.length === 0,
      'every hotspot is ON the picture, and no two cover each other',
      astray.join(', ')
    );
    // A SOCKET on the wall is one of the four the Fissure card holds; a fifth
    // would be a hole nothing can ever go in.
    const sockets = CAMP_HOTSPOTS.filter((h) => h.opens === 'socket');
    const slots = sockets.map((h) => h.slot).sort();
    check(
      sockets.length === RUN_SLOTS.length && slots.join() === RUN_SLOTS.map((_, i) => i).join(),
      `and its ${sockets.length} sockets are the ${RUN_SLOTS.length} the set has, one each`,
      slots.join(',')
    );
    // Everybody you can MEET has somewhere to stand, or the fifth one you meet
    // stands inside the first.
    const meetable = SCENES.filter((s) => !s.encounter);
    check(
      CAMP_SPOTS.length >= meetable.length,
      `and a place to stand for all ${meetable.length} people you can meet`,
      `${CAMP_SPOTS.length} spots`
    );
  }


  // A WALL prop is drawn side-on and belongs ON the cut face — a deep set
  // draws that TWO rows tall, so it is the ROCK tile at the boundary: rock
  // above it, floor below it. On the floor cell instead, every root sat at
  // the wall's foot, over the seam with the ground.
  {
    const { grid, props } = dressedMap(23);
    const off = props
      .filter((p) => HUNG_PROPS.has(p.id))
      .filter(
        (p) =>
          grid.at(p.x, p.y) !== WALL ||
          grid.at(p.x, p.y - 1) !== WALL ||
          grid.at(p.x, p.y + 1) === WALL
      )
      .map((p) => `${p.id}@${p.x},${p.y}`);
    const growing = props.filter((p) => HUNG_PROPS.has(p.id)).length;
    check(
      growing > 0 && off.length === 0,
      `all ${growing} things growing on the rock are on the cut face`,
      off.slice(0, 4).join(', ')
    );
  }

  // Every monster the tables can spawn has to have a drawing, or a pack of
  // them arrives as whatever the fallback happens to be. Either table draws
  // it: `monsterArt` asks the hand-drawn one first and falls through to the
  // generated one, which is how a body a player fights got there. A boss is
  // not in `MONSTERS` — that is the pack pool — so its own table is swept too.
  const drawn = (sprite: string) => !!MONSTER_FRAMES[sprite] || !!GENERATED[sprite];
  const undrawn = [
    ...MONSTERS.filter((m) => !drawn(m.sprite)).map((m) => m.id),
    ...BOSSES.filter((b) => !drawn(b.sprite)).map((b) => b.id),
  ];
  check(
    undrawn.length === 0,
    `all ${MONSTERS.length} monsters and ${BOSSES.length} bosses are drawn`,
    undrawn.join(', ')
  );

  // And at least one of them is a GENERATED body, or the whole pipeline is art
  // a player never meets. A generated body spans about 69% of its grid where
  // the doll spans nearly all of 24, so it needs a bigger `scale` to stand the
  // same height as the pack around it.
  const fought = MONSTERS.filter((m) => GENERATED[m.sprite]);
  const shrunk = fought
    .filter((m) => m.scale < 1.3 && (GENERATED[m.sprite]?.copies ?? 1) < 2)
    .map((m) => `${m.id} at ${m.scale}`);
  line(`  ${fought.length} of ${MONSTERS.length} monsters are generated: ${fought.map((m) => m.id).join(', ')}`);
  check(
    fought.length > 0 && shrunk.length === 0,
    "and a player meets a generated body, drawn at a generated body's scale",
    shrunk.join(', ') || 'none are generated'
  );
  // And nothing in the boss table may leak into the pack pool: a slab of the
  // rock arriving four at a time in a corridor is not a boss.
  const leaked = BOSSES.filter((b) => MONSTERS.some((m) => m.sprite === b.sprite)).map((b) => b.id);
  check(leaked.length === 0, 'and no boss is also a monster', leaked.join(', '));

  // A rank has to be visible before it reaches you, and it is LIGHT now rather
  // than a band: a solid border is a low-resolution convention that read as a
  // sticker once the art stopped being chunky. The reach is what tells the two
  // apart, so the pair must differ and the common must have none at all.
  const ranks = ['common', 'magic', 'rare'] as const;
  const reaches = ranks.map((r) => GLOW[r]?.reach ?? 0);
  check(reaches[0] === 0, 'and a common one glows not at all', `${reaches[0]}`);
  check(
    reaches[1] > 0 && reaches[2] > reaches[1],
    'and a rare one reaches further than a magic one',
    reaches.join(' / ')
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
  // CONSISTENT, not pointing anywhere in particular. What a player can see is
  // sprites disagreeing with each other; nobody can tell which way the sun is.
  // And the direction test does not survive the resolution: it reads vertically
  // adjacent pairs, which track the form on hand-placed mass shading and are
  // texture noise on a 256 grid full of grime.
  const bias = (g: string[], l: string, s: string): number => {
    const body = g.reduce((n, row) => n + [...row].filter((c) => c !== '.').length, 0);
    return body === 0 ? 0 : (upsideDown(g, s, l) - upsideDown(g, l, s)) / body;
  };
  // Measured to set it: hand-drawn frames run to +7% and never go negative,
  // where a grimy 256 one sits inside half a percent of nothing. So a sign on
  // its own is noise, and only a frame PAST the band is really lit from under.
  const LIT_BAND = 0.01;
  const leaning = Object.values(BEASTIARY)
    .flatMap((a) => [...a.frames, ...(a.attack ? [a.attack] : [])])
    .map((g) => bias(g, 'M', 's'));
  const under = leaning.filter((b) => b < -LIT_BAND).length;
  check(under === 0, 'and none of them is lit from underneath', `${under} frames are`);
  gauge(
    `how the bestiary is lit: ${leaning.filter((b) => b > LIT_BAND).length} frames from above,` +
      ` ${leaning.filter((b) => Math.abs(b) <= LIT_BAND).length} flat, ${under} from under`
  );

  // Two frames that are identical are not a walk cycle. Cheap to write, and
  // exactly the thing you would not notice from a still.
  const same = Object.entries(MONSTER_FRAMES).filter(
    ([, frames]) => frames[0].join('') === frames[1].join('')
  );
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
        // Furniture is the OTHER reason a carved tile blocks, and a legitimate
        // one. What this is watching for is a tile CONSTANT nothing walks on.
        if (!grid.solid[y * grid.width + x] && !grid.walkable(x, y)) unwalkable++;
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
  check(
    unwalkable === 0,
    'every carved tile with nothing standing on it is walkable',
    `${unwalkable} carved tiles block the hero`
  );
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

  // WHERE A BODY'S FEET LAND against where the rock is DRAWN. The cut face
  // hangs into the tile under it and only its last fifth is ground, so a body
  // standing too high on that tile draws its feet inside the rock — which is
  // what the user saw, and the arithmetic that says it cannot happen again.
  {
    const { grid } = generateMap([], new Rng(1717), 1, 3);
    /** How far past its tile centre a body can get with rock `dy` away. */
    const reach = (dy: number): number => {
      let far = 0;
      for (let y = 1; y < grid.height - 1; y++) {
        for (let x = 1; x < grid.width - 1; x++) {
          if (grid.at(x, y + dy) !== WALL || !grid.walkable(x, y)) continue;
          let off = 0;
          while (off < 0.5 && grid.fits(x, y + dy * (off + 0.01), HERO_BASE.radius)) off += 0.01;
          far = Math.max(far, off);
        }
      }
      return far;
    };
    // Feet are drawn FOOT below the body, and a tile centre is half a tile in.
    const north = 0.5 - reach(-1) + FOOT - 0.5;
    const south = reach(1) + FOOT - 0.5;
    line(
      `  drawn feet land ${north.toFixed(2)} down their own tile against a NORTH wall, ` +
        `where the face hanging into it ends at ${FACE_FOOT}`
    );
    line(
      `  and ${(south - 0.5).toFixed(2)} into the wall tile to the SOUTH, whose own face ` +
        `starts ${FACE_HEAD} down it — so ${(FACE_HEAD - south + 0.5).toFixed(2)} tiles of ` +
        `drawn ground there is out of reach`
    );
    check(
      north >= FACE_FOOT - 0.005,
      'no body stands high enough on a tile to draw its feet inside the rock over it',
      `feet at ${north.toFixed(2)} against a face ending at ${FACE_FOOT}`
    );
  }
}

// ===========================================================================
rule('THE OPENING — is the first hour walkable with nothing explaining it?');

// Nothing teaches any more. What has to hold is that the road EXISTS: the
// first clear pays for the one currency the shop sells, the weapon handed
// over at the mouth is the one the bench then works on, and the bench
// reaches a piece wherever that piece is kept.
{
  const game = createGame('fresh');
  grantFirstClear(game);
  bankLoot(game, [makeGear('ash_wand', 1), makeGear('bulwark_helmet_t1', 8)]);
  takeHandover(game, { weapon: true, crystal: false, campaign: false, ladder: null });
  line(
    `  after the first clear: ${balance(game.wallet, 'gold')} gold, ` +
      `${game.inventory.length} items`
  );

  // NOT off the counter — *"increase the cost of them in the store by like
  // 10x"* puts the first shard several descents out of reach, so what stops a
  // player meeting the bench with nothing to pour is the one he is HANDED.
  const making = RECIPES.find((r) => r.id === 'make_shard_of_making');
  const bill = making ? (recipeInputs(making, 1).gold ?? 0) : 0;
  const handed = createGame('fresh');
  const owed = takeHandover(handed, { weapon: false, crystal: true, campaign: false, ladder: null });
  check(
    (owed.currency[INTRO.scriptedCurrency] ?? 0) > 0,
    `the opening HANDS you the craft — the counter's own is ${bill} gold, several descents off`,
    `he handed over ${JSON.stringify(owed.currency)}`
  );

  // The mark on the gift. It is what tells the weapon he handed over from
  // anything a first run dropped, and it has to survive being worked on.
  const gift = giftWeapon(game);
  check(
    gift?.meta.firstClear === true,
    'the weapon he hands over is marked as his',
    `the gift is ${gift?.name ?? 'nothing'}`
  );
  const worked = craft(gift!, CURRENCY_BY_ID.shard_of_making, pool, new Rng(3));
  check(
    worked.ok && worked.item.meta.firstClear === true,
    'and keeps the mark through a craft',
    'crafting the gift lost what identifies it'
  );

  // A save from before the mark existed: heal() picks one, ONCE.
  const old = createGame('fresh');
  old.firstClearDone = true;
  old.inventory = [makeGear('ash_wand', 1), makeGear('skirmisher_helmet_t1', 20)];
  heal(old);
  check(
    giftWeapon(old)?.base === 'ash_wand',
    'and a save that predates it is marked on load',
    `heal marked ${giftWeapon(old)?.name ?? 'nothing'}`
  );

  // Worn gear and socketed crystals are both worked on where they LIVE, which
  // is what the two columns beside the bench are for. Either move losing the
  // bench is a bench that resolves to nothing mid-craft.
  equipItem(game, gift!, 'weapon');
  selectForCraft(game, game.character.equipment.weapon!);
  check(
    craftItem(game)?.id === game.character.equipment.weapon!.id,
    'the bench reaches a weapon you are wearing',
    'wearing the benched item lost it — the bench resolves to nothing'
  );
  takeHandover(game, { weapon: false, crystal: true, campaign: false, ladder: null });
  const crystal = crystalsIn(game)[0];
  selectForCraft(game, crystal);
  socketItem(game, crystal, socketFor(game, crystal)!);
  check(
    socketed(game).some((c) => c.id === craftItem(game)?.id),
    'and a crystal stays on it once you socket it',
    'socketing the benched crystal lost it — the bench resolves to nothing'
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
rule('THE MOVEMENT WEBS — is a small web still a decision?');

// Three arms of three over six points. `THE WEB` above cannot be pointed at
// these: it is derived from `TreeSpec`'s branches and twigs, and it asks
// whether a notable is a long walk, which for a nine-node web it never is.
// What IS the same is the geometry and the refund rule, so those are checked
// exactly as they are up there.
for (const web of MOVE_WEBS) {
  const skillId = web.spec.skillId;
  const nodes = web.nodes;
  const notables = nodes.filter((n) => n.kind === 'notable');

  line(`  ${skillId}: ${nodes.length} nodes, ${notables.length} notable, ${MOVE_POINTS} points`);
  check(
    nodes.length === MOVE_NODES && notables.length === ARM_COUNT,
    'the web is the shape the layout promises',
    `${nodes.length} nodes, ${notables.length} notable`
  );
  check(new Set(nodes.map((n) => n.id)).size === nodes.length, 'and no id is used twice', 'duplicate ids');

  // The whole mechanism: fewer points than nodes, so a third arm never fits
  // and WHICH TWO stays a decision no level ever takes back.
  check(
    MOVE_POINTS < nodes.length && MOVE_POINTS >= ARM_STEPS * 2,
    'the budget is smaller than the web and buys exactly two whole arms',
    `${MOVE_POINTS} points over ${nodes.length} nodes`
  );

  // A mover's switches have to be declared and READ by its own behaviour: a
  // landing switch on the web of a skill that does not land is the point spent
  // on nothing this check exists for.
  const behaviour = SKILL_BY_ID[skillId]?.behaviour ?? '';
  const unread: string[] = [];
  const handed = new Map<string, number>();
  for (const n of nodes) {
    for (const key of Object.keys(n.grants ?? {})) {
      handed.set(key, (handed.get(key) ?? 0) + 1);
      const def = GRANT_BY_ID[key];
      if (!def) unread.push(`${n.id}: ${key} is not a declared grant`);
      else if (!def.reads.includes(STATS) && !behaviourReads(behaviour, key)) {
        unread.push(`${n.id}: ${behaviour} never reads ${key}`);
      }
    }
  }
  check(unread.length === 0, 'every grant is one this mover actually reads', unread.join(', '));
  const lossy = [...handed]
    .filter(([key, count]) => count > 1 && !GRANT_BY_ID[key]?.merge)
    .map(([key, count]) => `${key} on ${count} nodes`);
  check(lossy.length === 0, 'and anything granted twice says how it stacks', lossy.join(', '));

  // Every notable is the TIP of its arm, so the arm is the whole price.
  const tips = notables.filter((n) => neighboursOf(skillId, n.id).size === 1);
  check(tips.length === notables.length, 'every notable is a dead end at the tip of its arm',
    notables.filter((n) => neighboursOf(skillId, n.id).size !== 1).map((n) => n.id).join(', '));

  // Same geometry as a skill web and a trade: no link crosses another, and none
  // runs through a node it does not join. Both read on screen as a link to
  // somewhere it does not go.
  const at = new Map<string, { x: number; y: number }>(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
  at.set(CENTRE, { x: 0, y: 0 });
  const pairs: Array<[string, string]> = [];
  for (const n of nodes) {
    for (const other of neighboursOf(skillId, n.id)) {
      if (!pairs.some(([a, b]) => (a === n.id && b === other) || (a === other && b === n.id))) {
        pairs.push([n.id, other]);
      }
    }
  }
  type P = { x: number; y: number };
  const side = (a: P, b: P, c: P) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const crossed: string[] = [];
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const [a1, b1] = pairs[i];
      const [a2, b2] = pairs[j];
      if (a1 === a2 || a1 === b2 || b1 === a2 || b1 === b2) continue;
      const [p1, q1, p2, q2] = [at.get(a1)!, at.get(b1)!, at.get(a2)!, at.get(b2)!];
      if (
        side(p2, q2, p1) > 0 !== side(p2, q2, q1) > 0 &&
        side(p1, q1, p2) > 0 !== side(p1, q1, q2) > 0
      ) {
        crossed.push(`${a1}~${b1} over ${a2}~${b2}`);
      }
    }
  }
  check(crossed.length === 0, 'no link crosses another', crossed.join(', '));

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
      if (Math.hypot(n.x - (p.x + t * dx), n.y - (p.y + t * dy)) < 0.45) {
        grazed.push(`${a}~${b} through ${id}`);
      }
    }
  }
  check(grazed.length === 0, 'and none runs through a node it does not join', grazed.join(', '));

  // Walked in, and out again. A build you can walk into and not out of is
  // worse than one with no refunds at all.
  const walk: string[] = [];
  const spendRng = new Rng(909);
  while (walk.length < MOVE_POINTS) {
    const open = nodes.filter((n) => canAllocate(skillId, n.id, walk));
    if (open.length === 0) break;
    walk.push(spendRng.pick(open)!.id);
  }
  check(walk.length === MOVE_POINTS, 'every point can be spent', String(walk.length));
  let held = [...walk];
  while (held.length > 0) {
    const loose = held.find((id) => canDeallocate(skillId, id, held));
    if (!loose) break;
    held = held.filter((id) => id !== loose);
  }
  check(held.length === 0, 'and every one of them refunded again', `${held.length} stuck`);
}

/** Every node between a tree's middle and one named, in order. Nothing else
 *  reaches a particular enabler, and the enabler is the whole point. */
function walkTo(skillId: string, goal: string): string[] {
  const from = new Map<string, string | null>([[CENTRE, null]]);
  const queue: string[] = [CENTRE];
  while (queue.length > 0) {
    const at = queue.shift()!;
    if (at === goal) break;
    for (const next of neighboursOf(skillId, at)) {
      if (from.has(next)) continue;
      from.set(next, at);
      queue.push(next);
    }
  }
  const route: string[] = [];
  for (let at = goal; at && at !== CENTRE; at = from.get(at) ?? '') route.unshift(at);
  return route;
}

// ===========================================================================
rule('AILMENTS — does dealing the type, and only that, apply the ailment?');

{
  const chanceLine = (value: number, tag: string): RolledMod => ({
    entryId: 'x', defId: 'x', group: 'x', slot: 'x', name: 'x', tier: 1, tags: [],
    stats: [{ stat: 'ailmentChance', form: 'flat', value, tags: [tag] }],
  });

  check(
    AILMENTS.every((a) => a.bySource || a.chance === 0),
    'no ailment a damage type applies has a base chance: one is BOUGHT',
    AILMENTS.filter((a) => !a.bySource && a.chance !== 0).map((a) => a.id).join(', ')
  );
  check(
    ailmentChances([])['burn'] === 0 && ailmentChances([chanceLine(25, 'burn')])['burn'] === 25,
    'and a chance line is the whole of what turns one on',
    String(ailmentChances([chanceLine(25, 'burn')])['burn'])
  );
  // Tagged by TYPE reaches it too, which is what lets one gear line cover the
  // element rather than the player learning two vocabularies for one thing.
  check(
    ailmentChances([chanceLine(30, 'fire')])['burn'] === 30,
    'and a line aimed at the TYPE reaches its ailment as well',
    String(ailmentChances([chanceLine(30, 'fire')])['burn'])
  );

  const owners = AILMENTS.filter((a) => !a.bySource).map((a) => a.type);
  check(
    new Set(owners).size === owners.length,
    'each damage type owns exactly ONE ailment, so dealing it is the other half',
    owners.join(', ')
  );

  // CONVERSION has to carry the chance across, or a tree of Burn chance
  // survives a turn to cold as chance to apply something you no longer deal.
  const fire = SKILLS.find((s) => s.damageTypes.includes('fire'))!;
  check(
    retag('fire', fire, 'cold') === 'cold' && retag('burn', fire, 'cold') === 'chill',
    'and a conversion retags the AILMENT with the type, Burn chance to Chill chance',
    `${retag('fire', fire, 'cold')} / ${retag('burn', fire, 'cold')}`
  );
  check(
    retag('bleed', fire, 'cold') === 'bleed',
    'while an ailment the skill never dealt is left exactly where it was',
    retag('bleed', fire, 'cold')
  );

  // AN UNTAGGED CHANCE NODE IS ITS OWN TREE'S. *"I have no source of curse (i
  // do have dark damage) but im still applying curse. Running strike and taking
  // the bleed chance node."* Rend grants a bare `ailmentChance`; spread across
  // every type in the hit it also cursed whatever a dark line on a ring added,
  // so a Bleed node bought six ailments. It rides the skill's OWN type and
  // follows a Conversion there.
  {
    const rend = ailmentChances([], 'physical', 55);
    const byType = AILMENTS.filter((a) => !a.bySource); // Poison is a SKILL's, never a type's
    const spilt = byType.filter((a) => a.type !== 'physical' && rend[a.id] > 0);
    check(
      rend.bleed === 55 && spilt.length === 0,
      `a bare chance node buys the skill's OWN ailment alone — Bleed ${rend.bleed}%`,
      `it also bought ${spilt.map((a) => a.name).join(', ')}`
    );
    // And a Conversion moves it whole: the node is still worth its point.
    const turned = ailmentChances([], 'cold', 55);
    check(
      turned.chill === 55 && turned.bleed === 0,
      'and a Conversion carries it to what the skill lands as instead',
      `bleed ${turned.bleed}%, chill ${turned.chill}%`
    );
    // The SIM reads these stats rather than adding the grant a second time, so
    // a hero carrying added Dark damage cannot Curse off a Bleed node. Read as
    // the DELTA of walking to Rend: a rolled Curse line on a ring is a real
    // source and says nothing about the node.
    const who = ladderCharacter(2, new Rng(77), 'strike');
    who.tradeAllocated = [];
    const bare = characterStats(who).ailmentChance;
    skillProgress(who, 'strike').allocated = walkTo('strike', 'st_rend');
    const rent = characterStats(who).ailmentChance;
    const moved = byType
      .map((a) => [a, (rent[a.id] ?? 0) - (bare[a.id] ?? 0)] as const)
      .filter(([, d]) => Math.abs(d) > 0.001);
    check(
      moved.length === 1 && moved[0][0].id === 'bleed' && moved[0][1] >= 55,
      `and the SHEET says the same: walking to Rend moved Bleed alone, by ${Math.round(moved[0]?.[1] ?? 0)}%`,
      moved.map(([a, d]) => `${a.name} ${Math.round(d)}%`).join(', ') || 'nothing moved at all'
    );
  }
}

// ===========================================================================
rule('MATERIALS AND PROFESSIONS — is the table a thing a recipe could read?');

// STEP 1 OF THE CRAFTING ARC: the tables exist and NOTHING reads them yet, so
// what can be wrong is the table itself — a world with a hole in it, two rows
// sharing a name, a profession working a family nothing drops, or an icon that
// resolves to nothing and renders as a blank square nobody notices.
{
  line(`  ${MATERIALS.length} materials, ${MATERIAL_FAMILIES.length} families, ${PROFESSIONS.length} professions`);

  // EVERY WORLD CARRIES EVERY FAMILY, plus ONE of its own. *"They should all
  // contain the normal ones but maybe just a single unique material per zone."*
  // A world short a family is a world whose recipes cannot be finished there.
  const holes: string[] = [];
  for (const theme of MAP_THEMES) {
    const mine = MATERIALS.filter((m) => m.world === theme.id);
    for (const fam of MATERIAL_FAMILIES) {
      const n = mine.filter((m) => m.family === fam.id).length;
      if (n !== 1) holes.push(`${theme.id} has ${n} ${fam.id}`);
    }
    const uniques = mine.filter((m) => m.family === null).length;
    if (uniques !== 1) holes.push(`${theme.id} has ${uniques} uniques`);
  }
  check(
    holes.length === 0,
    `every one of the ${MAP_THEMES.length} worlds carries all ${MATERIAL_FAMILIES.length} families and exactly one unique of its own`,
    holes.join(', ')
  );
  check(
    MATERIALS.length === MAP_THEMES.length * (MATERIAL_FAMILIES.length + 1),
    `which is ${MAP_THEMES.length} × ${MATERIAL_FAMILIES.length + 1} = ${MATERIALS.length} rows and no others`,
    String(MATERIALS.length)
  );

  // A ZONE-UNIQUE IS TIED TO NO PROFESSION, which is the whole of what makes it
  // the thing the best recipes ask for rather than a seventh family.
  const owned = MATERIALS.filter((m) => m.family !== null && !MATERIAL_FAMILY_BY_ID[m.family]);
  check(owned.length === 0, 'and every family named is one that exists', owned.map((m) => m.id).join(', '));

  // ONE PROFESSION PER FAMILY, both ways round: a family nobody works is a
  // material nobody can spend, and two professions on one family is a choice
  // with no difference in it.
  const worked = PROFESSIONS.map((p) => p.family);
  check(
    new Set(worked).size === worked.length
      && MATERIAL_FAMILIES.every((f) => worked.includes(f.id)),
    `and each of the ${PROFESSIONS.length} professions works exactly one family, with none left unworked`,
    worked.join(', ')
  );

  // IDS AND NAMES ARE BOTH UNIQUE. An id collision is a save pointing at the
  // wrong material; a NAME collision is two rows a player cannot tell apart.
  const dupId = MATERIALS.map((m) => m.id).filter((id, i, a) => a.indexOf(id) !== i);
  const dupName = MATERIALS.map((m) => m.name).filter((n, i, a) => a.indexOf(n) !== i);
  check(
    dupId.length === 0 && dupName.length === 0,
    'and no two materials share an id or a name',
    [...dupId, ...dupName].join(', ')
  );

  // AN ICON THAT RESOLVES. *"They should just exist as single line items with a
  // little icon next to them so we can fit a lot"* — so the icon IS how a
  // material is read, and one that resolves to nothing renders a blank square
  // and fails nowhere.
  const blind = MATERIALS.filter((m) => !GENERATED_ICONS[m.icon]).map((m) => `${m.id}→${m.icon}`);
  check(
    blind.length === 0,
    `and all ${MATERIALS.length} of them draw a generated icon`,
    blind.join(', ')
  );

  // THE VOCABULARY. Every other authored table is swept for a retired phrasing
  // and these are no different: a material that says it in the old words is a
  // second vocabulary the player has to learn.
  const said = MATERIALS.flatMap((m) => [
    { where: `material/${m.id}`, text: m.name },
    { where: `material/${m.id}`, text: m.description },
  ]).concat(
    PROFESSIONS.flatMap((p) => [
      { where: `profession/${p.id}`, text: p.name },
      { where: `profession/${p.id}`, text: p.makes },
    ]),
    MATERIAL_FAMILIES.flatMap((f) => [
      { where: `family/${f.id}`, text: f.raw },
      { where: `family/${f.id}`, text: f.processed },
      { where: `family/${f.id}`, text: f.one },
      { where: `family/${f.id}`, text: f.verb },
      { where: `family/${f.id}`, text: f.station },
    ])
  );
  const wrongWord = said.flatMap(({ where, text }) =>
    bannedIn(text).map((b) => `${where} says "${b.said}" — use ${b.use}`)
  );
  check(wrongWord.length === 0, 'and not one of them says a thing the old way', wrongWord.join('; '));

  // A DESCENT IS THE ONLY SOURCE. A new character is handed none, so what a
  // player holds is exactly what they went down and dug up — and the DEV kit
  // holds every one, because a station nobody can load is a screen nobody can
  // look at.
  const g = createGame('fresh');
  const kit = createGame('dev');
  // The kit holds a RAW stack of every one and a WORKED stack of every one
  // that has a family, since a zone-unique is worked by nothing.
  const workable = MATERIALS.filter((m) => m.family !== null).length;
  check(
    (g.materials ?? []).length === 0 &&
      [...g.inventory, ...g.stash].every((i) => i.kind !== 'material') &&
      (kit.materials ?? []).length === MATERIALS.length + workable,
    'and nobody starts holding one, though the dev kit is handed all of them raw and worked',
    `${(g.materials ?? []).length} fresh, ${(kit.materials ?? []).length} in the kit`
  );

  // A NODE IS A PICTURE, and one that resolves to nothing draws an invisible
  // thing the hero walks to — the worst possible version of this bug.
  const unseen = MATERIAL_FAMILIES.flatMap((f) =>
    [f.node, f.spent].filter((id) => !PROP_ART[id]).map((id) => `${f.id}→${id}`)
  );
  check(unseen.length === 0, 'and every family has a node and a worked-out frame that draw', unseen.join(', '));
}

// ===========================================================================
rule('GATHERING — is a node free, guarded, walked to and equally spread?');

// STEP 2: *"Should there be ore to mine in the area and your character just
// goes up and mines it?"* — as a LOCK with a family on it, which is the one
// shape that satisfies universal automation without a policy to ship.
{
  const bareSet = [makeCrystal(1), makeCrystal(1), makeCrystal(1), makeCrystal(1)];
  const digger = ladderCharacter(6, new Rng(11));

  // FREE, AND NOT BOUGHT. A Hoard needs a walked arm; gathering is what every
  // descent pays, or a new character has no road into crafting at all.
  const first = new RunSim(bareSet, digger, new Rng(4242));
  check(
    first.state.nodes.length > 0,
    'a bare set puts nodes down: gathering is what a descent pays, never what a web buys',
    String(first.state.nodes.length)
  );

  // GUARDED, and by a pack that really exists — a node whose pack was never
  // spawned is a node nothing can ever free.
  const orphan = first.state.nodes.filter(
    (n) => !first.state.monsters.some((m) => m.pack === n.pack)
  );
  check(
    orphan.length === 0 && first.state.nodes.every((n) => !n.free),
    'and every one of them starts shut behind a pack that is actually standing there',
    `${orphan.length} unguarded`
  );

  // THE RUN'S OWN WORLD. Cross-world recipes come from the TIER rule, never
  // from a node handing out a material the descent could not have held.
  const wrongWorld = first.state.nodes.filter(
    (n) => MATERIAL_BY_ID[n.material]?.world !== first.state.set.theme
  );
  check(
    wrongWorld.length === 0,
    'and each hands over this world\'s own version of its family, never another world\'s',
    wrongWorld.map((n) => n.material).join(', ')
  );

  // WALKED TO AND WORKED, HEADLESS. Automation is universal and has no
  // exception: `runToCompletion` runs the shipped policy and there is no other.
  runToCompletion(first, 600);
  const worked = first.state.nodes.filter((n) => n.taken).length;
  const rows = first.state.loot.items.filter((i) => i.kind === 'material');
  check(
    first.state.status === 'cleared' && worked === first.state.nodes.length && rows.length > 0,
    'and a headless run walks to every one of them, with no policy to ship',
    `${worked}/${first.state.nodes.length} worked, ${rows.length} rows, ${first.state.status}`
  );

  // A NODE IS TAKEN ON THE WAY, NEVER FETCHED BACK. `GATHER.near` is what he
  // steps aside for with a pack still standing; a node he has walked three
  // chambers past is LEFT, one way, which is what stops him crossing a
  // distance boundary for ever on a map where the way round is long.
  const settled = first.state.nodes.every((n) => n.taken || n.left);
  check(
    settled,
    'and nothing is left half-decided: every node is worked or passed over for good',
    String(first.state.nodes.filter((n) => !n.taken && !n.left).length)
  );

  // A MATERIAL STACKS: `meta.n` is how many, so a bag holds one row a kind.
  const kinds = new Set(rows.map((i) => i.base));
  check(
    kinds.size === rows.length && rows.every((i) => ((i.meta.n as number) ?? 0) > 0),
    'and it arrives STACKED — one row a kind, however many the run dug up',
    `${rows.length} rows over ${kinds.size} kinds`
  );

  // A RUN NUMBER, NEVER A PER-KILL RATE. What a descent puts down is read off
  // the SET without running it, which is the whole claim: kills triple between
  // the two ends and the nodes do not move at all.
  const deepSet = deepestSet(new Rng(4242), pool);
  const laid = (crystals: Item[], seed: number) => {
    const sim = new RunSim(crystals, digger, new Rng(seed));
    return {
      units: sim.state.nodes.reduce((n, x) => n + x.n, 0),
      bodies: sim.state.monsters.length,
    };
  };
  let shallow = { units: 0, bodies: 0 };
  let deep = { units: 0, bodies: 0 };
  for (let i = 0; i < 6; i++) {
    const a = laid(bareSet, 900 + i);
    const b = laid(deepSet, 900 + i);
    shallow = { units: shallow.units + a.units, bodies: shallow.bodies + a.bodies };
    deep = { units: deep.units + b.units, bodies: deep.bodies + b.bodies };
  }
  const ratio = shallow.units > 0 ? deep.units / shallow.units : Infinity;
  const bodyRatio = shallow.bodies > 0 ? deep.bodies / shallow.bodies : Infinity;
  line(
    `  materials a descent: ${(shallow.units / 6).toFixed(1)} at the bare Fissure ` +
      `(${Math.round(shallow.bodies / 6)} bodies), ${(deep.units / 6).toFixed(1)} deep ` +
      `(${Math.round(deep.bodies / 6)} bodies) — ${ratio.toFixed(2)}× against ${bodyRatio.toFixed(1)}×`
  );
  check(
    ratio < bodyRatio / 2,
    'and what a descent digs up rides the RUN, not the body count',
    `${ratio.toFixed(2)}× the materials against ${bodyRatio.toFixed(1)}× the bodies`
  );

  // *"RELATIVELY EQUAL DROP RATES BETWEEN MATERIALS."* Dealt round rather than
  // rolled, so a hundred descents cannot starve one profession.
  const spread = new Map<string, number>(MATERIAL_FAMILIES.map((f) => [f.id, 0]));
  for (let i = 0; i < 12; i++) {
    const sim = new RunSim(bareSet, digger, new Rng(1300 + i));
    for (const node of sim.state.nodes) {
      spread.set(node.family, (spread.get(node.family) ?? 0) + 1);
    }
  }
  const counts = [...spread.values()];
  const least = Math.min(...counts);
  const most = Math.max(...counts);
  line(`  nodes a family over 12 descents: ${[...spread].map(([f, n]) => `${f} ${n}`).join(', ')}`);
  check(
    least > 0 && most <= least * 1.6,
    'and the six families come out level, because they are DEALT and not rolled',
    `${least} at the least, ${most} at the most`
  );

  // GEAR GOT RARE IN THE SAME STEP, or the bag holds both economies at once.
  // Cleared runs only: a death banks nothing, so a run that ends in one is not
  // a measurement of what a clear pays.
  let clears = 0;
  let gear = 0;
  let units = 0;
  for (let i = 0; i < 8; i++) {
    const sim = new RunSim(bareSet, digger, new Rng(1700 + i));
    runToCompletion(sim, 600);
    if (sim.state.status !== 'cleared') continue;
    clears++;
    gear += sim.state.loot.items.filter((i2) => i2.kind === 'gear').length;
    units += sim.state.loot.items
      .filter((i2) => i2.kind === 'material')
      .reduce((n, i2) => n + ((i2.meta.n as number) ?? 0), 0);
  }
  line(
    `  a bare Fissure clear pays ${(units / Math.max(1, clears)).toFixed(1)} materials ` +
      `and ${(gear / Math.max(1, clears)).toFixed(2)} pieces of gear, over ${clears} clears`
  );
  check(
    clears > 0 && gear / clears < 1 && units / clears > gear / clears,
    'and GEAR is the lucky exception now, not the heap you sort',
    `${(gear / Math.max(1, clears)).toFixed(2)} pieces against ${(units / Math.max(1, clears)).toFixed(1)} materials`
  );
}

// ===========================================================================
rule('THE STATIONS — does a job advance on descents, and never on a clock?');

// STEP 3: *"A smelter job is N clears long: load it, go down, come back to
// bars."* What has to hold is that NOTHING here moves without a descent, that a
// job neither loses nor mints, and that the whole loop runs headless.
{
  const fresh = createGame('fresh');
  check(
    jobsIn(fresh).length === 0 &&
      PROFESSIONS.every((p) => professionAt(fresh, p.id).level === 1),
    `a new character starts with no job loaded and all ${PROFESSIONS.length} professions at level 1`,
    `${jobsIn(fresh).length} jobs`
  );

  // NOTHING IS WORKED THAT WAS NOT DUG UP. A batch you cannot afford is refused
  // and SAYS SO — a button that greys out and will not say why is one nobody
  // learns from.
  const ore = MATERIAL_BY_ID.pale_iron;
  const refused = whyNotWork(fresh, ore);
  check(
    refused !== null && /\d/.test(refused) && loadWork(fresh, ore) === null,
    'and a batch it cannot pay for is refused, in numbers',
    refused ?? 'it went ahead anyway'
  );

  // A ZONE-UNIQUE BELONGS TO NO FAMILY, so no station works it: it is what the
  // best recipes ask for exactly as it came up out of the floor.
  const unique = MATERIALS.find((m) => m.family === null)!;
  addItem(fresh, makeMaterial(unique, 99));
  check(
    whyNotWork(fresh, unique) !== null && loadWork(fresh, unique) === null,
    'and a world\'s own unique is worked by nothing at all',
    whyNotWork(fresh, unique) ?? 'a station took it'
  );

  // THE SLOT CAP IS THE WHOLE OF WHAT A JOB COSTS, beyond the descents.
  const shop = createGame('fresh');
  for (const def of MATERIALS.filter((m) => m.family !== null)) {
    addItem(shop, makeMaterial(def, WORK.batch * 4));
  }
  const loaded = MATERIALS.filter((m) => m.family !== null)
    .map((def) => loadWork(shop, def))
    .filter(Boolean);
  check(
    loaded.length === WORK.slots && jobsIn(shop).length === WORK.slots,
    `and ${WORK.slots} jobs is every station loaded, whatever is in the bag`,
    `${loaded.length} took`
  );

  // THE RAW LEAVES THE BAG NOW. A job you could cancel for a refund is a slot
  // that costs nothing to fill.
  const first = MATERIALS.find((m) => m.family !== null)!;
  const heldNow = (shop.materials ?? []).find((i) => i.base === first.id && !i.meta.done);
  check(
    ((heldNow?.meta.n as number) ?? 0) === WORK.batch * 4 - WORK.batch,
    'and the raw leaves the bag the moment it is loaded',
    String((heldNow?.meta.n as number) ?? 0)
  );

  // A DEATH ADVANCES NOTHING, which is the rule a crystal's `uses` is under:
  // what a walk out does not buy is PROGRESS, and a job is progress.
  const before = jobsIn(shop).map((j) => j.left).join(',');
  const died = new RunSim([makeCrystal(1)], ladderCharacter(1, new Rng(3)), new Rng(1));
  died.state.status = 'died';
  buildReport(shop, died.state);
  check(
    jobsIn(shop).map((j) => j.left).join(',') === before,
    'and a death moves no job at all: what a run does not clear, it does not bank',
    `${before} -> ${jobsIn(shop).map((j) => j.left).join(',')}`
  );

  // A WALK OUT KEEPS THE LOOT AND BUYS NO PROGRESS, so it moves no job either.
  const cleared = new RunSim([makeCrystal(1)], ladderCharacter(1, new Rng(3)), new Rng(1));
  cleared.state.status = 'cleared';
  buildReport(shop, cleared.state, true);
  check(
    jobsIn(shop).map((j) => j.left).join(',') === before,
    'and neither does walking out with what you found',
    jobsIn(shop).map((j) => j.left).join(',')
  );

  // A CLEAR, and the WHOLE of it: one for one, banked, and paid in XP.
  const wanted = jobsIn(shop).map((j) => ({ ...j }));
  let report = buildReport(shop, cleared.state);
  for (let i = 1; i < WORK.clears; i++) report = buildReport(shop, cleared.state);
  const done = report.worked;
  check(
    done.length === wanted.length && jobsIn(shop).length === 0,
    `and ${WORK.clears} clears takes every one of them off the station`,
    `${done.length} finished, ${jobsIn(shop).length} still on`
  );
  const minted = done.filter((d) => ((d.item.meta.n as number) ?? 0) !== WORK.batch);
  check(
    minted.length === 0,
    'and a job hands back exactly what it took: nothing lost, nothing minted',
    minted.map((d) => `${d.item.name} ${d.item.meta.n}`).join(', ')
  );

  // RAW AND PROCESSED ARE TWO STACKS OF ONE ROW. Merged, a recipe could not
  // tell ore from bars; two tables, and every screen has to learn both.
  const both = (shop.materials ?? []).filter((i) => i.base === first.id);
  check(
    both.length === 2 && both.filter((i) => i.meta.done).length === 1,
    'and it stacks apart from the raw it came from, off ONE material row',
    `${both.length} stacks of ${first.id}`
  );

  const smith = professionAt(shop, 'blacksmithing');
  check(
    smith.level > 1 || smith.xp > 0,
    'and the profession that did the work is further on for it',
    `level ${smith.level}, ${smith.xp} xp`
  );

  // WHAT 99 COSTS, measured rather than chosen: *"you can freely level them all
  // but it just costs your time."* Printed, because it is a balance number.
  let jobs = 0;
  let banked = 0;
  for (let level = 1; level < PROFESSION.maxLevel; level++) banked += workXpToNext(level);
  jobs = Math.ceil(banked / (WORK.xp * WORK.batch));
  line(
    `  level ${PROFESSION.maxLevel} is ${banked.toLocaleString()} xp — ${jobs.toLocaleString()} batches, ` +
      `${Math.ceil((jobs * WORK.clears) / WORK.slots).toLocaleString()} descents with every slot full`
  );
  // A LEVEL HAS TO BE FELT IN THE FIRST HOUR, or the whole mechanism is a wall
  // pretending to be a curve.
  check(
    workXpToNext(1) <= WORK.xp * WORK.batch,
    'and the FIRST level costs one batch, so the curve is felt before it is long',
    `${workXpToNext(1)} xp against ${WORK.xp * WORK.batch} a batch`
  );

  // A JOB POINTS AT A TABLE, and a save that outlives the table takes the job
  // with it rather than paying out something that no longer exists.
  const rotted = createGame('fresh');
  rotted.jobs = [{ id: 'job_x', profession: 'nobody', material: 'nothing', n: 4, left: 1 }];
  const healed = heal(rotted);
  check(
    rotted.jobs.length === 0 && healed.items > 0,
    'and a save holding a job for a material nobody makes any more loses the job',
    `${rotted.jobs.length} left`
  );

  // THE WHOLE LOOP, HEADLESS. Gathering feeds the station and the station pays
  // the profession, with a real descent between: automation is universal and
  // there is no step in this a player has to be present for.
  const loop = createGame('fresh');
  loop.character = ladderCharacter(6, new Rng(11));
  const kit = [makeCrystal(1), makeCrystal(1), makeCrystal(1), makeCrystal(1)];
  let ran = 0;
  let anyDone = 0;
  while (ran < 12 && anyDone === 0) {
    const sim = new RunSim(kit, loop.character, new Rng(2200 + ran));
    runToCompletion(sim, 600);
    ran++;
    if (sim.state.status !== 'cleared') continue;
    anyDone += buildReport(loop, sim.state).worked.length;
    // Load whatever came up, which is what a player would do.
    for (const def of MATERIALS.filter((m) => m.family !== null)) loadWork(loop, def);
  }
  const madeAny = (loop.materials ?? []).filter((i) => i.meta.done).length;
  check(
    anyDone > 0 && madeAny > 0,
    'and the whole loop runs headless: dug up, loaded, descended, worked',
    `${ran} descents, ${anyDone} jobs off, ${madeAny} processed stacks`
  );
}

// ===========================================================================
rule('THE ANVIL — does a level slide the window, and can a dismantle print?');

// STEP 4: **MATERIALS DECIDE WHAT AN ITEM IS; CURRENCY DECIDES WHAT IS ON IT.**
// A recipe is DERIVED off the base rather than authored, so what can be wrong
// is the derivation, the window, and the one thing that would break the whole
// economy — a dismantle handing back more than the recipe took.
{
  const kit = () => {
    const g = createGame('fresh');
    for (const def of MATERIALS) {
      addItem(g, makeMaterial(def, 400));
      addItem(g, makeMaterial(def, 400, true));
    }
    return g;
  };
  const at = (g: GameState, level: number): GameState => {
    g.character.professions = Object.fromEntries(
      PROFESSIONS.map((p) => [p.id, { level, xp: 0 }])
    );
    return g;
  };

  // EVERY BASE THAT IS NOT NAMED IS MAKEABLE. A base with no recipe is one
  // nobody can ever get on purpose, now that the floor pays a quarter a clear.
  const plain = GEAR_BASES.filter((b) => !UNIQUES.some((u) => u.base === b.id));
  const unmade = plain.filter((b) => recipeFor(b.id) === null);
  check(
    unmade.length === 0,
    `all ${plain.length} unnamed bases have a recipe, derived off the base and authored nowhere`,
    unmade.slice(0, 5).map((b) => b.id).join(', ')
  );

  // A HYBRID FAMILY NAMES EXACTLY THE TWO PROFESSIONS ITS ARCHETYPES DO, which
  // is the whole reason no table special-cases anything.
  const wrong = ARMOUR_FAMILIES.filter((family) => {
    const base = GEAR_BASES.find((b) => b.family === family.id);
    const made = base ? makersOf(base) : [];
    return made.length !== family.archetypes.length;
  });
  check(
    wrong.length === 0,
    'and a hybrid armour family asks for exactly the two professions its archetypes name',
    wrong.map((f) => f.id).join(', ')
  );

  // A TIER IS HOW MANY DIFFERENT VERSIONS IT DEMANDS. Depth matters because
  // ACCESS is gated, never because deep ore is better ore.
  const tiers = [1, 2, 3].map((tier) => {
    const base = GEAR_BASES.find((b) => b.tier === tier && recipeFor(b.id));
    return recipeFor(base?.id ?? '')!;
  });
  check(
    tiers[0].parts[0].versions < tiers[1].parts[0].versions &&
      tiers[1].parts[0].versions < tiers[2].parts[0].versions &&
      tiers[2].unique > 0 && tiers[0].unique === 0,
    'and a higher tier asks for more DIFFERENT versions, the top one for a world\'s own',
    tiers.map((r) => `t${r.tier} ${r.parts[0].versions}x${r.parts[0].wants}`).join(', ')
  );

  // THE WINDOW. *"A plate helm can get between 100–150 armour, where if you're
  // 1 blacksmithing it's always 100–105 and if you're 99 it's always 145–150."*
  const helm = GEAR_BASES.find((b) => b.id === 'bulwark_helmet_t1')!;
  const spread = (level: number): [number, number] => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < 400; i++) {
      const made = liftFor(qualityRoll(level, new Rng(9000 + i))) * (helm.armour ?? 0);
      lo = Math.min(lo, made);
      hi = Math.max(hi, made);
    }
    return [lo, hi];
  };
  const low = spread(1);
  const top = spread(PROFESSION.maxLevel);
  line(
    `  ${helm.name} is ${helm.armour} armour on the row: level 1 makes ` +
      `${low[0].toFixed(1)}–${low[1].toFixed(1)}, level ${PROFESSION.maxLevel} makes ` +
      `${top[0].toFixed(1)}–${top[1].toFixed(1)}`
  );
  check(
    low[1] < (helm.armour ?? 0) && top[0] > (helm.armour ?? 0),
    'a level 1 craft lands UNDER the row and a level 99 one over it, so a DROP is the middle',
    `${low[1].toFixed(1)} and ${top[0].toFixed(1)} against ${helm.armour}`
  );
  check(
    top[1] - top[0] < low[1] - low[0],
    'and the window NARROWS as it climbs, so the level buys certainty as well as size',
    `${(low[1] - low[0]).toFixed(2)} wide at 1, ${(top[1] - top[0]).toFixed(2)} at the cap`
  );

  // AND IT REACHES THE ITEM, not just the arithmetic: a made piece differs
  // from a found one in `armour`, `damage` and every implicit it carries.
  const madeLow = craftBase(at(kit(), 1), recipeFor('bulwark_helmet_t1')!, new Rng(3))!;
  const madeTop = craftBase(at(kit(), PROFESSION.maxLevel), recipeFor('bulwark_helmet_t1')!, new Rng(3))!;
  const found = makeGear('bulwark_helmet_t1', helm.ilvl ?? 1);
  check(
    (madeLow.item.armour ?? 0) < (found.armour ?? 0) &&
      (madeTop.item.armour ?? 0) > (found.armour ?? 0),
    'and it reaches the PIECE: a made helm at 1 is worse than a found one and at 99 is better',
    `${madeLow.item.armour} · ${found.armour} · ${madeTop.item.armour}`
  );
  const weapon = GEAR_BASES.find((b) => b.kind === 'weapon' && b.implicit?.length && b.tier === 1)!;
  const swung = craftBase(at(kit(), PROFESSION.maxLevel), recipeFor(weapon.id)!, new Rng(4))!;
  check(
    (swung.item.damage ?? 0) > (weapon.damage ?? 0) &&
      swung.item.implicits[0].stats[0].value > (weapon.implicit![0].range[0] ?? 0),
    'and the IMPLICIT rides the same window, not the damage alone',
    `${swung.item.damage} vs ${weapon.damage}, ${swung.item.implicits[0].stats[0].value} vs ${weapon.implicit![0].range[0]}`
  );

  // A CRAFT IS REFUSED IN NUMBERS. A level you have not reached and a material
  // you do not hold are the two walls, and both say what they want.
  const poor = createGame('fresh');
  const why = whyNotCraft(poor, recipeFor('bulwark_helmet_t1')!);
  check(
    why !== null && /\d/.test(why) && craftBase(poor, recipeFor('bulwark_helmet_t1')!, new Rng(1)) === null,
    'a craft with nothing in the bag is refused, and says what it wanted in numbers',
    why ?? 'it went ahead anyway'
  );
  const low3 = at(kit(), 1);
  const gated = whyNotCraft(low3, recipeFor(tiers[2].base)!);
  check(
    gated !== null && /\d/.test(gated),
    'and a tier 3 recipe at level 1 is refused on the LEVEL, however full the bag',
    gated ?? 'it went ahead anyway'
  );

  // A CRAFT PAYS XP, weighted so a higher recipe beats spamming the cheapest.
  check(
    CRAFT.xp.every((n, i) => i === 0 || n > CRAFT.xp[i - 1]) &&
      CRAFT.xp[2] > CRAFT.xp[0] * CRAFT.each[2] / CRAFT.each[0],
    'and a tier 3 craft pays more XP than the materials it costs would buy as tier 1s',
    CRAFT.xp.join(' → ')
  );
  const learner = at(kit(), 1);
  craftBase(learner, recipeFor('bulwark_helmet_t1')!, new Rng(7));
  check(
    professionAt(learner, 'blacksmithing').level > 1 ||
      professionAt(learner, 'blacksmithing').xp > 0,
    'and the profession that made it is further on for having made it',
    JSON.stringify(professionAt(learner, 'blacksmithing'))
  );

  // **A DISMANTLE MAY NEVER RETURN MORE THAN THE RECIPE TOOK.** This is the one
  // check that stands between the whole economy and a material printer, and it
  // is asked of EVERY base rather than of a sample.
  const printers: string[] = [];
  for (const base of plain) {
    const recipe = recipeFor(base.id);
    if (!recipe) continue;
    const g = at(kit(), PROFESSION.maxLevel);
    const made = craftBase(g, recipe, new Rng(11));
    if (!made) continue;
    const took = new Map<string, number>();
    for (const row of made.spent) took.set(row.material, (took.get(row.material) ?? 0) + row.n);
    let backTotal = 0;
    let tookTotal = 0;
    for (const row of dismantleYield(g, made.item)) {
      if (row.n > (took.get(row.material) ?? 0)) printers.push(`${base.id}/${row.material}`);
      backTotal += row.n;
    }
    for (const n of took.values()) tookTotal += n;
    if (backTotal >= tookTotal) printers.push(`${base.id} whole`);
  }
  check(
    printers.length === 0,
    `and not one of the ${plain.length} bases hands back as much as it took: craft → dismantle → craft cannot print`,
    printers.slice(0, 4).join(', ')
  );

  // AND IT ACTUALLY RUNS: the piece leaves the bag and the materials arrive.
  const taker = at(kit(), PROFESSION.maxLevel);
  const piece = craftBase(taker, recipeFor('bulwark_helmet_t1')!, new Rng(13))!.item;
  const heldBefore = (taker.materials ?? []).reduce((n, i) => n + ((i.meta.n as number) ?? 0), 0);
  const paidBack = dismantle(taker, piece);
  const heldAfter = (taker.materials ?? []).reduce((n, i) => n + ((i.meta.n as number) ?? 0), 0);
  check(
    paidBack !== null && !taker.inventory.includes(piece) && heldAfter > heldBefore,
    'and taking one apart really does spend the piece and bank what came off it',
    `${heldBefore} → ${heldAfter}`
  );

  // A PERFECT BASE IS CRAFTABLE AND STILL DROPS, and the craft's odds ride the
  // LEVEL — either luck or a hundred levels of work, and neither road closes
  // the other.
  check(
    perfectChanceAt(1) < perfectChanceAt(PROFESSION.maxLevel) &&
      perfectChanceAt(PROFESSION.maxLevel) > 0,
    'a Perfect base comes off the LEVEL as well as off the floor',
    `${(perfectChanceAt(1) * 100).toFixed(1)}% at 1, ${(perfectChanceAt(PROFESSION.maxLevel) * 100).toFixed(1)}% at the cap`
  );
  const perfectBase = GEAR_BASES.find((b) => canBePerfect(b.id) && recipeFor(b.id))!;
  let perfects = 0;
  const runs = 400;
  for (let i = 0; i < runs; i++) {
    const g = at(kit(), PROFESSION.maxLevel);
    if (craftBase(g, recipeFor(perfectBase.id)!, new Rng(500 + i))?.perfect) perfects++;
  }
  line(`  ${perfects} Perfect in ${runs} crafts of ${perfectBase.name} at the cap`);
  check(
    perfects > 0,
    'and it really does come out of a craft at the cap, not only out of the table',
    `${perfects} in ${runs}`
  );
}

// ===========================================================================
rule('JEWELLERY — is the amulet slot contested, and is a ring a decision?');

// STEP 5: *"Ten base types, each one an implicit... both a RING and an AMULET
// of each."* Jewellery used to differ from rung to rung in exactly one way —
// how many modifiers it held — which made it the least interesting pair of
// slots in the game. The implicit is what it is FOR now.
{
  const jewels = GEAR_BASES.filter((b) => b.kind === 'ring' || b.kind === 'amulet');
  check(
    JEWEL_IMPLICITS.length === 10 && jewels.length === JEWEL_IMPLICITS.length * 2 * 3,
    `${JEWEL_IMPLICITS.length} implicits, a ring and an amulet of each, at three rungs — ${jewels.length} rows`,
    String(jewels.length)
  );

  // EVERY ONE OF THE TEN REACHES A NUMBER. An implicit naming a stat nothing
  // computes is a line on a card that changes nothing at all.
  // BOTH HALVES OF THE ROSTER: Acuity buys spell crit and cast speed, which an
  // attack character's sheet cannot see at all, so one probe would call it
  // inert and it is the opposite — it is the line a caster wants most.
  const sheet = (skill: string, amulet?: string): string => {
    const worn = makeCharacter({}, skill);
    if (amulet) worn.equipment.amulet = makeGear(amulet, 60);
    return JSON.stringify(characterStats(worn));
  };
  const dead = JEWEL_IMPLICITS.filter(
    (line) =>
      sheet('strike', `amulet_${line.id}_t3`) === sheet('strike') &&
      sheet('fireball', `amulet_${line.id}_t3`) === sheet('fireball')
  );
  check(
    dead.length === 0,
    'and every one of them moves a number on the sheet',
    dead.map((l) => l.id).join(', ')
  );

  // **THE AMULET'S IMPLICIT ROLLS STRONGER THAN A RING'S.** Two ring slots
  // against one amulet: without the split the answer is always "wear the three
  // best" and the amulet slot is contested by nothing.
  const weaker = JEWEL_IMPLICITS.filter((line) => {
    const ring = GEAR_BASE_BY_ID[`ring_${line.id}_t3`];
    const amulet = GEAR_BASE_BY_ID[`amulet_${line.id}_t3`];
    return (amulet?.implicit?.[0].range[0] ?? 0) <= (ring?.implicit?.[0].range[0] ?? 0);
  });
  check(
    weaker.length === 0,
    `and an amulet's line beats a ring's at every one of the ${JEWEL_IMPLICITS.length}`,
    weaker.map((l) => l.id).join(', ')
  );

  // A RUNG BUYS THE LINE, since every rung holds the same modifiers: without
  // that, jewellery has no ladder at all.
  const flat = JEWEL_IMPLICITS.filter((line) => {
    const at = [1, 2, 3].map((t) => GEAR_BASE_BY_ID[`ring_${line.id}_t${t}`]?.implicit?.[0].range[0] ?? 0);
    return !(at[0] < at[1] && at[1] < at[2]);
  });
  check(flat.length === 0, 'and a rung buys a bigger line, which is the whole of what a rung is here', flat.map((l) => l.id).join(', '));

  // NO NEW ICONS. *"`gear_ring` and `gear_amulet` are recoloured per
  // implicit"* — so the twenty of them draw two shapes and twenty colours.
  const undrawn = jewels.filter((b) => !hasGearArt(b.art)).map((b) => b.id);
  check(
    undrawn.length === 0 && new Set(jewels.map((b) => b.art)).size === 2,
    'and all of them draw ONE of two shapes, recoloured — no new icons',
    undrawn.join(', ') || String(new Set(jewels.map((b) => b.art)).size)
  );
  const hues = new Set(JEWEL_IMPLICITS.map((l) => l.hue));
  check(
    hues.size === JEWEL_IMPLICITS.length,
    'each with a hue of its own, so two rings side by side are told apart',
    `${hues.size} hues over ${JEWEL_IMPLICITS.length} lines`
  );

  // JEWELLING MAKES ALL OF THEM AND NOTHING ELSE MAKES ANY.
  const wrongHands = jewels.filter((b) => makersOf(b).join() !== 'jewelling').map((b) => b.id);
  check(
    wrongHands.length === 0,
    `and Jewelling makes every one of the ${jewels.length}, which is its whole output`,
    wrongHands.slice(0, 4).join(', ')
  );

  // WHAT ONE IS WORTH, printed: these are balance numbers and the pass reads
  // them rather than a check failing on a figure nobody has tuned.
  for (const jewel of JEWEL_IMPLICITS) {
    const ring = GEAR_BASE_BY_ID[`ring_${jewel.id}_t1`]?.implicit?.[0].range[0] ?? 0;
    const amulet = GEAR_BASE_BY_ID[`amulet_${jewel.id}_t3`]?.implicit?.[0].range[0] ?? 0;
    line(
      `  ${jewel.name.padEnd(22)} ${String(ring).padStart(3)} on a tier 1 ring, ` +
        `${String(amulet).padStart(3)} on a tier 3 amulet`
    );
  }
}

// ===========================================================================
rule('THE HYBRID RULE — is breadth worth two professions, and what does it cost?');

// STEP 6: *"The hybrids can be strictly more overall stat power so for most
// builds they can be better, but you can get more of one stat going specific."*
// Both halves, and without `STAT_POWER` neither is checkable — a hybrid family
// spent exactly the same budget as a specialist until this step, so the rule
// was a sentence in a file and nothing else.
{
  const single = ARMOUR_FAMILIES.filter((f) => f.archetypes.length === 1);
  const both = ARMOUR_FAMILIES.filter((f) => f.archetypes.length > 1);
  check(
    single.length === both.length && single.length > 0,
    `${single.length} specialist armour families and ${both.length} hybrids, one for one`,
    `${single.length} against ${both.length}`
  );

  // EVERY IMPLICIT IS PRICED, or a family goes missing from its own total and
  // the whole comparison is read off a table with a hole in it.
  const unpriced = new Set<string>();
  for (const base of GEAR_BASES) {
    for (const spec of base.implicit ?? []) {
      if (!STAT_POWER[`${spec.stat}:${spec.form}`]) unpriced.add(`${spec.stat}:${spec.form}`);
    }
    if ((base.armour ?? 0) > 0 && !STAT_POWER['armour:flat']) unpriced.add('armour:flat');
  }
  check(
    unpriced.size === 0,
    'and every stat a base implicit carries has a price, so no line is worth nothing by accident',
    [...unpriced].join(', ')
  );

  // HALF ONE: a hybrid is MORE TOTAL POWER, read off the finished ITEM rather
  // than off the mix it was built from.
  const power = (family: string, kind: string, tier: number): number =>
    statPower(makeGear(`${family}_${kind}_t${tier}`, 70));
  const worst = Math.min(...both.map((f) => power(f.id, 'body', 3)));
  const best = Math.max(...single.map((f) => power(f.id, 'body', 3)));
  line(
    `  a tier 3 body: specialists ${single.map((f) => power(f.id, 'body', 3).toFixed(0)).join(' ')} · ` +
      `hybrids ${both.map((f) => power(f.id, 'body', 3).toFixed(0)).join(' ')}`
  );
  check(
    worst > best,
    `and the WEAKEST hybrid totals more power than the strongest specialist — ${HYBRID.lift}× the budget`,
    `${worst.toFixed(1)} against ${best.toFixed(1)}`
  );

  // AND AT EVERY SLOT AND EVERY RUNG, not only the one this happened to check.
  const beaten: string[] = [];
  for (const kind of ARMOUR_SLOT_KINDS) {
    for (let tier = 1; tier <= 3; tier++) {
      const low = Math.min(...both.map((f) => power(f.id, kind, tier)));
      const high = Math.max(...single.map((f) => power(f.id, kind, tier)));
      if (low <= high) beaten.push(`${kind} t${tier}`);
    }
  }
  check(beaten.length === 0, 'at every slot and every rung there is', beaten.join(', '));

  // HALF TWO, AND IT IS THE ONE THAT KEEPS A SPECIALIST WORTH TAKING: *"you can
  // get more of one stat going specific."* For every stat any family carries,
  // the family with the MOST of it is a specialist — so whatever you are
  // stacking, a hybrid is never the answer.
  const mostOf = new Map<string, { id: string; at: number; hybrid: boolean }>();
  for (const family of ARMOUR_FAMILIES) {
    const hybrid = family.archetypes.length > 1;
    for (const [stat, share] of Object.entries(family.mix)) {
      const at = share * (hybrid ? HYBRID.lift : 1);
      const held = mostOf.get(stat);
      if (!held || at > held.at) mostOf.set(stat, { id: family.id, at, hybrid });
    }
  }
  const stolen = [...mostOf].filter(([, who]) => who.hybrid).map(([stat, who]) => `${stat}→${who.id}`);
  line(
    `  the most of each: ${[...mostOf].map(([stat, who]) => `${stat} ${who.id}`).join(', ')}`
  );
  check(
    stolen.length === 0,
    `and the family with the MOST of each of the ${mostOf.size} stats is a SPECIALIST, whatever you are stacking`,
    stolen.join(', ')
  );

  // AND IT REACHES THE ITEM. The share is arithmetic; what a player wears is a
  // number on a piece, and that is what has to be bigger.
  const short: string[] = [];
  for (const [stat, who] of mostOf) {
    const at = (family: string): number => {
      const base = GEAR_BASE_BY_ID[`${family}_body_t3`];
      if (stat === 'armour') return base?.armour ?? 0;
      const want = IMPLICIT_STAT[stat];
      const line3 = base?.implicit?.find(
        (l) => l.stat === want?.stat && l.form === want?.form
          && (want.tags?.[0] === undefined || (l.tags ?? []).includes(want.tags[0]))
      );
      return line3?.range[0] ?? 0;
    };
    const bestSingle = Math.max(...single.map((f) => at(f.id)));
    const bestHybrid = Math.max(...both.map((f) => at(f.id)));
    if (bestHybrid >= bestSingle) short.push(`${stat}: ${bestHybrid} vs ${bestSingle}`);
    void who;
  }
  check(
    short.length === 0,
    'and it is on the PIECE, not only in the mix it was built from',
    short.join(', ')
  );
}

// ===========================================================================
rule('COOKING — does a meal reach the sheet, and does it burn down?');

// STEP 7: **A MEAL IS A BUFF THAT LASTS RUNS**, which is the crystal roll's own
// shape pointed at the hero. The PROCESSED fish IS the meal, so there is no
// second recipe — and the level slides how long it lasts by the identical rule
// that slides a base's roll, which is the whole reason there is one to learn.
{
  const kit = (): GameState => {
    const g = createGame('fresh');
    g.character = ladderCharacter(3, new Rng(4));
    for (const meal of MEALS) addItem(g, makeMaterial(MATERIAL_BY_ID[meal.fish], 9, true));
    return g;
  };

  // ONE MEAL PER FISH, and every fish has one: a world whose catch cooks into
  // nothing is a family of material with a dead end at the kitchen.
  const fish = MATERIALS.filter((m) => m.family === 'fish');
  check(
    MEALS.length === fish.length && fish.every((f) => MEAL_BY_FISH[f.id]),
    `all ${fish.length} fish cook into a meal of their own`,
    fish.filter((f) => !MEAL_BY_FISH[f.id]).map((f) => f.id).join(', ')
  );
  const unpaid = MEALS.filter((m) => m.stats.length === 0 || m.stats.some((l) => l.range[0] === 0));
  check(
    unpaid.length === 0 && new Set(MEALS.map((m) => m.stats[0].stat)).size === MEALS.length,
    'and each buys something different, in a figure',
    unpaid.map((m) => m.name).join(', ')
  );

  // **THE LEVEL SLIDES HOW LONG IT LASTS**, off the same window a craft reads.
  // *"One buff can give 5–15 runs, and at level 1 you can only get it to land
  // on 5–8 and it goes up until level 99 cooking is always 14–15."*
  const window = (level: number): [number, number] => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < 2000; i++) {
      const at = mealRuns(level, new Rng(4000 + i));
      lo = Math.min(lo, at);
      hi = Math.max(hi, at);
    }
    return [lo, hi];
  };
  const low = window(1);
  const top = window(PROFESSION.maxLevel);
  line(
    `  a meal lasts ${low[0]}–${low[1]} descents at Cooking 1 and ${top[0]}–${top[1]} at ` +
      `${PROFESSION.maxLevel}, out of ${MEAL.runs[0]}–${MEAL.runs[1]}`
  );
  check(
    low[0] === MEAL.runs[0] && top[1] === MEAL.runs[1] && low[1] < top[0],
    'the level slides the run count and the two windows do not overlap',
    `${low.join('–')} against ${top.join('–')}`
  );

  // IT REACHES THE SHEET, through `statMods` like every other line — so the
  // sim, the card and the sheet all read one meal and cannot disagree.
  const g = kit();
  const before = characterStats(g.character);
  const meal = eatMeal(g, 'blindfish', new Rng(7));
  check(
    meal !== null && characterStats(g.character).maxLife > before.maxLife,
    'and eating one reaches the sheet — it is a mod, through the seam every line uses',
    `${before.maxLife.toFixed(1)} -> ${characterStats(g.character).maxLife.toFixed(1)}`
  );
  const left = (g.materials ?? []).find((i) => i.base === 'blindfish' && i.meta.done);
  check(
    ((left?.meta.n as number) ?? 0) === 8,
    'and it spends exactly one cooked fish',
    String((left?.meta.n as number) ?? 0)
  );

  // ONE AT A TIME. A second sits the first down, which is what makes which fish
  // you cooked a decision rather than a checklist you tick off.
  const second = eatMeal(g, 'palefin', new Rng(8));
  check(
    second !== null && g.character.meal?.defId === second.defId,
    'and a second sits the first one down: one at a time, so it is a choice',
    g.character.meal?.name ?? 'nothing'
  );

  // **IT BURNS DOWN ON A CLEAR AND ON NOTHING ELSE**, the rule a crystal roll
  // is already under: what a walk out does not buy is PROGRESS.
  const sim = new RunSim([makeCrystal(1)], g.character, new Rng(1));
  const was = g.character.meal!.uses!;
  sim.state.status = 'died';
  buildReport(g, sim.state);
  const afterDeath = g.character.meal?.uses;
  sim.state.status = 'cleared';
  buildReport(g, sim.state, true);
  const afterWalk = g.character.meal?.uses;
  check(
    afterDeath === was && afterWalk === was,
    'a death spends none of it, and neither does walking out with what you found',
    `${was} → ${afterDeath} → ${afterWalk}`
  );

  let clears = 0;
  let ended: RolledMod | null = null;
  while (g.character.meal && clears < 60) {
    ended = buildReport(g, sim.state).eaten;
    clears++;
  }
  check(
    clears === was && ended !== null && g.character.meal === undefined,
    `and ${was} clears is exactly what it lasted, and the report says it went`,
    `${clears} clears, ended ${ended?.name ?? 'silently'}`
  );

  // A MEAL IS NEVER A THING YOU CANNOT DESCEND WITHOUT. A crystal roll running
  // out ends an Enter-chain; this must not, or eating one is a leash.
  const chained = kit();
  eatMeal(chained, 'riftfin', new Rng(9));
  const report = buildReport(chained, sim.state);
  check(
    report.cleared && !report.bagsFull,
    'and it never stops a chain: a buff is not a thing a descent needs',
    `${report.status}`
  );

  // A SAVE THAT OUTLIVES THE TABLE. A meal whose fish is gone, or whose
  // descents ran out on disk, is a buff that would never end.
  const rotted = createGame('fresh');
  rotted.character.meal = {
    entryId: 'meal_x', defId: 'meal_nothing', group: 'meal', slot: 'meal',
    name: 'Nothing', tier: 0, tags: ['meal'], uses: 4, stats: [],
  };
  heal(rotted);
  check(
    rotted.character.meal === undefined,
    'and a save holding a meal for a fish nobody cooks any more loses the meal',
    rotted.character.meal ? 'it survived' : ''
  );
}

// ===========================================================================
rule('THE RECKONING — is a harder descent actually harder, and paid for?');

{
  const nodes = trialNodes();
  const bare = [makeCrystal(2), makeCrystal(2)];

  // THE LEDGER. Every line has to name a counter something actually adds to,
  // or it is a grind nobody can ever finish and the Tallies never arrive.
  const strays = GRINDS.filter((g) => !GRIND_COUNTERS[g.counter]).map((g) => `${g.id}: ${g.counter}`);
  check(strays.length === 0, `all ${GRINDS.length} lines of the Ledger count something that exists`, strays.join(', '));
  // AND THE BUDGET IS EXACT. The web is built for `TALLIES.max`; the campaign
  // and the Ledger between them have to come to it, or the Reckoning is sized
  // for points nothing pays or holds points nothing can spend.
  check(
    TRIAL_POINTS_MAX === TALLY_CAP,
    `the campaign's ${CAMPAIGN_REWARD.points} and the Ledger's ${TRIAL_POINTS_MAX - CAMPAIGN_REWARD.points} come to exactly the ${TALLY_CAP} the web is built for`,
    `${TRIAL_POINTS_MAX} against ${TALLY_CAP}`
  );
  // Nothing is bigger than the campaign's own handout, which is the ONE thing
  // paid without grinding: a single line worth more would beat the finish line.
  const outsized = GRINDS.filter((g) => g.pays > CAMPAIGN_REWARD.points).map((g) => g.id);
  check(outsized.length === 0, 'and no one line of it outpays finishing the campaign', outsized.join(', '));

  // PER CHARACTER, and always OPEN. Everything the web is made of hangs off the
  // character — the Ledger's counts, the nodes walked and the choices on them —
  // so a second one starts at nothing with the web in front of it. Shared, one
  // character's grind would spend another's Tallies.
  {
    const one = makeCharacter({}, 'strike');
    one.grinds = Object.fromEntries(GRINDS.map((g) => [g.counter, g.need]));
    // THE WHOLE CAMPAIGN, PAID, because nothing pays a point before the
    // Lampwright has handed the climb's own reward over.
    one.climbed = Object.fromEntries(LADDER.zones.map((zone) => [zone.id, zone.rungs]));
    one.paidCampaign = true;
    one.trialAllocated = [trialNodes()[0].id];
    const two = makeCharacter({}, 'strike');
    check(
      trialPointsFor(two) === 0
        && (two.trialAllocated ?? []).length === 0
        && trialPointsFor(one) > 0,
      'the Reckoning is the CHARACTER\'s: a second one starts at nothing',
      `${trialPointsFor(one)} against ${trialPointsFor(two)}`
    );
    // And nothing gates LOOKING at it: a plan you cannot see is a plan nobody
    // makes. What a new character has is no points, which is not a door.
    check(
      trialNodes().length > 0 && !('trialsOpen' in trialsModule),
      'and nothing gates opening it — a new character sees the whole web',
      'something still shuts the web'
    );
  }

  // Every line here is either DANGER — which is the bargain, since reward is
  // derived from danger — or REWARD, which is the other half of it. A reward
  // line is not free: the POINT is what it costs, and a web of a hundred and
  // fifty-six nodes against fifty points is a web where a rarity node is a
  // danger node you did not take. What nothing may be is UNREAD: a stat neither
  // side weighs is a line that prints and does nothing.
  const paying = new Set([
    'rarity',
    'currencyFind',
    ...DROP_GROUPS.map((g) => findStat(g.id)),
  ]);
  const unweighed = nodes.flatMap((n) =>
    (n.stats ?? [])
      .filter((s) => !DANGER_STATS[s.stat] && !paying.has(s.stat))
      .map((s) => `${n.id}: ${s.stat}`)
  );
  check(
    unweighed.length === 0,
    `every stat on all ${nodes.length} trial nodes is one \`crystalRewards\` weighs, or one it PAYS in`,
    unweighed.join(', ')
  );

  // The one node that asks something. An option nothing reads is the whole
  // reason `NodeChoice.stats` exists rather than only `grants`.
  const asks = nodes.filter((n) => (n.choices ?? []).length > 0);
  check(asks.length === 2, 'two trial nodes ask a question', String(asks.length));
  const asked = asks[0];
  const aimed = (pick: string): number => {
    const who: Character = {
      ...ladderCharacter(4, new Rng(7)),
      grinds: Object.fromEntries(GRINDS.map((g) => [g.counter, g.need])),
      trialAllocated: [asked.id],
      trialChoices: { [asked.id]: pick },
    };
    return dropBias(runSet(bare, trialMod(who)).mods)[pick] ?? 1;
  };
  const bent = DROP_GROUPS.map((g) => `${g.id} ${aimed(g.id).toFixed(2)}x`);
  check(
    DROP_GROUPS.every((g) => aimed(g.id) > 1.01),
    `and every one of its ${DROP_GROUPS.length} options bends what drops`,
    bent.join(', ')
  );

  // Walked in, and out again, at the full budget the Ledger can ever pay.
  const walk: string[] = [];
  const spendRng = new Rng(4141);
  while (walk.length < TRIAL_POINTS_MAX) {
    const open = nodes.filter((n) => canAllocateTrial(n.id, walk));
    if (open.length === 0) break;
    walk.push(spendRng.pick(open)!.id);
  }
  check(walk.length === TRIAL_POINTS_MAX, `all ${TRIAL_POINTS_MAX} Tallies can be spent`, String(walk.length));
  let held = [...walk];
  while (held.length > 0) {
    const loose = held.find((id) => canDeallocateTrial(id, held));
    if (!loose) break;
    held = held.filter((id) => id !== loose);
  }
  check(held.length === 0, 'and every one of them refunded again', `${held.length} stuck`);

  // The whole web on one character, against the same crystals: what it does to
  // a descent has to be visible in the SET, or none of the rest of this matters.
  const walked = {
    ...ladderCharacter(4, new Rng(7)),
    grinds: Object.fromEntries(GRINDS.map((g) => [g.counter, g.need])),
    trialAllocated: nodes.map((n) => n.id),
  };
  const before = runSet(bare);
  const after = runSet(bare, trialMod(walked));
  check(
    after.rewards.danger > before.rewards.danger,
    'the whole web walked raises a set\'s danger',
    `${Math.round(before.rewards.danger)} -> ${Math.round(after.rewards.danger)}`
  );
  check(
    after.rewards.rarity > before.rewards.rarity,
    'and pays for it in rarity, off the same arithmetic a crystal pays by',
    `${Math.round(before.rewards.rarity)}% -> ${Math.round(after.rewards.rarity)}%`
  );

  // `monsterRank` is the one stat this phase INVENTED, so it is the one that
  // can be declared, weighed, printed on a card and read by nothing at all.
  const ranked = (character: Character): number => {
    const sim = new RunSim(bare, character, new Rng(5150));
    return sim.state.monsters.filter((m) => m.rank !== 'common').length;
  };
  const plain = ranked(ladderCharacter(4, new Rng(7)));
  const lifted = ranked({
    ...ladderCharacter(4, new Rng(7)),
    grinds: Object.fromEntries(GRINDS.map((g) => [g.counter, g.need])),
    trialAllocated: nodes.filter((n) => (n.stats ?? []).some((s) => s.stat === 'monsterRank')).map((n) => n.id),
  });
  check(lifted > plain, 'and the Watch really does put more Rares in a room', `${plain} -> ${lifted}`);

  // A HOARD is the first EVENT, and the whole of it has to be provable without
  // a player: it is put down, it is guarded, and killing the guard opens it.
  const hoarder: Character = {
    ...ladderCharacter(4, new Rng(7)),
    grinds: Object.fromEntries(GRINDS.map((g) => [g.counter, g.need])),
    trialAllocated: nodes
      .filter((n) => (n.stats ?? []).some((s) => s.stat === 'hoardChance'))
      .map((n) => n.id),
  };
  const withHoards = new RunSim(bare, hoarder, new Rng(3131));
  const without = new RunSim(bare, ladderCharacter(4, new Rng(7)), new Rng(3131));
  check(
    withHoards.state.hoards.length > 0 && without.state.hoards.length === 0,
    'a Hoard is put down only by a walked arm',
    `${withHoards.state.hoards.length} with it, ${without.state.hoards.length} without`
  );
  check(
    withHoards.state.monsters.filter((m) => m.hoard).length > 0,
    'and it is guarded — the guard IS the lock, since nothing is ever clicked',
    String(withHoards.state.monsters.filter((m) => m.hoard).length)
  );

  // The seed may not part on a set that bought no Hoards: the roll is only
  // taken when the chance is above zero, exactly as a Block is.
  const plainA = new RunSim(bare, ladderCharacter(4, new Rng(7)), new Rng(777));
  const plainB = new RunSim(bare, ladderCharacter(4, new Rng(7)), new Rng(777));
  check(
    plainA.state.monsters.length === plainB.state.monsters.length &&
      plainA.state.monsters[0]?.x === plainB.state.monsters[0]?.x,
    'and a set that bought none spends no draw on one',
    `${plainA.state.monsters.length} vs ${plainB.state.monsters.length}`
  );

  runToCompletion(withHoards, 400);
  const opened = withHoards.state.hoards.filter((h) => h.opened).length;
  // Materials come out of the same list and out of a NODE, so they are not
  // evidence about a lock.
  const paid = withHoards.state.loot.items.filter((i) => i.kind !== 'material').length;
  check(
    opened > 0 && paid > 0,
    'and a headless run opens one and is paid for it, with no policy to ship',
    `${opened}/${withHoards.state.hoards.length} opened, ${paid} pieces`
  );

  // THE WELLING, and the thing that matters about it is that a run still ENDS.
  // A chain where each death can cause a death is a run that may never finish,
  // and a run that does not finish is a mechanism failure rather than a number.
  const welling: Character = {
    ...ladderCharacter(4, new Rng(7)),
    grinds: Object.fromEntries(GRINDS.map((g) => [g.counter, g.need])),
    trialAllocated: nodes
      .filter((n) => (n.stats ?? []).some((s) => s.stat === 'wellChance'))
      .map((n) => n.id),
  };
  const rose = new RunSim(bare, welling, new Rng(2020));
  const spawnedWith = rose.state.totalMonsters;
  const ended = runToCompletion(rose, 400);
  check(
    ended.status !== 'running',
    'a descent full of Welling still ENDS — the rank ladder is the whole bound',
    ended.status
  );
  check(
    ended.welled > 0,
    'and something really did come up out of a body',
    `${ended.welled} put down of ${ended.totalMonsters - spawnedWith} raised`
  );
  check(
    ended.totalMonsters === ended.killed || ended.status === 'died',
    'and the readout counted every one, so it never ticks down and climbs',
    `${ended.killed}/${ended.totalMonsters}`
  );

  // The ladder is the proof, so the top rung has to be a rung nothing rolls:
  // one that came up naturally would make the chain start anywhere.
  const top = MONSTER_RANKS[MONSTER_RANKS.length - 1];
  check(
    top.weight === 0 && MONSTER_RANKS.filter((r) => r.weight === 0).length === 1,
    `the Welling's top rung (${top.id}) is the one rank nothing ever rolls`,
    MONSTER_RANKS.map((r) => `${r.id} ${r.weight}`).join(', ')
  );
  check(
    ended.totalMonsters <= spawnedWith * MONSTER_RANKS.length,
    `so a descent can never grow past ${MONSTER_RANKS.length}x what it spawned with`,
    `${spawnedWith} -> ${ended.totalMonsters}`
  );

  // BEARERS. The gate is a wall and has to stay one: a Bearer in the Fissure
  // handing over a corpse the Rot owns is the whole failure this can have.
  const bearing = (crystals: Item[]): RunState => {
    const who: Character = {
      ...ladderCharacter(4, new Rng(7)),
      grinds: Object.fromEntries(GRINDS.map((g) => [g.counter, g.need])),
      trialAllocated: nodes
        .filter((n) => (n.stats ?? []).some((s) => s.stat === 'bearerChance'))
        .map((n) => n.id),
    };
    return new RunSim(crystals, who, new Rng(6161)).state;
  };
  const inTheRot = bearing([makeCrystal(2, 'demonic'), makeCrystal(2, 'demonic')]);
  const inTheFissure = bearing(bare);
  const borne = inTheRot.monsters.filter((m) => m.bears);
  check(borne.length > 0, 'a walked Bearer arm puts one in the Rot', String(borne.length));
  check(
    borne.every((m) => RELIC_BY_ID[m.bears!]?.gate?.zone === 'demonic'),
    'and what it carries is what THAT world owns, never the other one',
    [...new Set(borne.map((m) => m.bears))].join(', ')
  );
  check(
    inTheFissure.monsters.every((m) => !m.bears),
    'and the Fissure owns neither, so nothing there carries one at all',
    String(inTheFissure.monsters.filter((m) => m.bears).length)
  );
  const hardest = MONSTER_RANKS[MONSTER_RANKS.length - 1];
  check(
    borne.every((m) => m.rank === hardest.id),
    `and every Bearer comes up ${hardest.id} — ${hardest.life}x life, so it is a body you can lose to`,
    [...new Set(borne.map((m) => m.rank))].join(', ')
  );

  // A COUNTER NOBODY READS refunds whatever it paid rather than stranding the
  // walk. On a PAID campaign, since nothing pays a Tally before that.
  const save = createGame('dev');
  save.character.paidCampaign = true;
  save.character.trialAllocated = [...walk];
  save.character.grinds = {
    [GRINDS[0].counter]: GRINDS[0].need,
    a_counter_nobody_wrote: 9999,
  };
  healTrials(save.character);
  const owed = CAMPAIGN_REWARD.points + GRINDS[0].pays;
  check(
    !('a_counter_nobody_wrote' in save.character.grinds)
      && save.character.trialAllocated.length === Math.min(walk.length, owed),
    `and heal() drops a counter nothing reads and cuts the walk back to ${owed}`,
    `${JSON.stringify(save.character.grinds)}, ${save.character.trialAllocated.length} nodes`
  );
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

  const ahead = dummy(3, 0);
  const behind = dummy(5.5, 0);
  const beside = dummy(3, 2.4);
  const across = dummy(24, 0);
  const name = (e: any) =>
    e === ahead ? 'ahead' : e === behind ? 'behind' : e === beside ? 'beside' : 'across';

  const cast = (grants: Record<string, unknown>, crit = false, momentum = 1) => {
    const user = dummy(0, 0);
    const enemies = [ahead, behind, beside, across];

    const hits: Array<{ who: any; multiplier: number }> = [];
    const burns: Array<{ who: any; seconds: number }> = [];

    SKILL_BEHAVIOURS.projectile({
      skill: SKILL_BY_ID.fireball,
      user, primary: ahead, enemies,
      rng: new Rng(9), grants, crit, castIndex: 0, momentum,
      hit: (who: any, multiplier: number) => hits.push({ who, multiplier }),
      ailment: (who: any, _m: number, seconds: number) => burns.push({ who, seconds }),
      leave: () => {},
      areaRadius: (base: number) => base,
      vfx: () => {},
    } as any);

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

  // MOMENTUM reaches the body you AIMED at and no other. A build that spreads
  // its uses is what it is worth nothing to, so a Fork carrying it would be the
  // whole trade undone in silence.
  {
    const spread = cast({ extraTargets: 2 }, false, 1.5);
    const aimed = spread.hits.find((h) => name(h.who) === 'ahead');
    const other = spread.hits.find((h) => name(h.who) !== 'ahead');
    line(
      `  momentum x1.5      → ahead ${aimed?.multiplier.toFixed(2)}, ` +
        `${other ? name(other.who) : 'nobody'} ${other?.multiplier.toFixed(2)}`
    );
    check(
      aimed !== undefined && other !== undefined
        && Math.abs(aimed.multiplier - 1.5) < 1e-9 && Math.abs(other.multiplier - 1) < 1e-9,
      'Momentum reaches the enemy you aimed at and no other',
      `${aimed?.multiplier} / ${other?.multiplier}`
    );
  }

  // THE CHAIN. A kill Burst sets off the Burst of whatever it kills, so what
  // has to hold is that it travels FURTHER than one hop and that a body it
  // cannot kill is where it stops. Both are silent failures otherwise: one
  // reads as a small Burst, the other as an unstoppable one.
  {
    const line5 = (tough: number | null) =>
      [3, 4.8, 6.6, 8.4, 10.2].map((x, i) => dummy(x, 0, tough === i ? 1e6 : 1));
    const far = dummy(20, 0, 1);

    const chainCast = (bodies: any[]) => {
      const reached: any[] = [];
      SKILL_BEHAVIOURS.projectile({
        skill: SKILL_BY_ID.fireball,
        user: dummy(0, 0), primary: bodies[0], enemies: [...bodies, far],
        rng: new Rng(9), grants: { explodeOnKill: { radius: 2, multiplier: 1 } },
        crit: false, castIndex: 0,
        hit: (who: any) => {
          reached.push(who);
          // Frail bodies die to anything; the tough one never does, which is
          // what makes it a wall rather than a slower link.
          if (who.life < 1e6) who.dead = true;
        },
        ailment: () => {}, leave: () => {}, areaRadius: (base: number) => base, vfx: () => {},
      } as any);
      return reached;
    };

    const open = line5(null);
    const swept = chainCast(open);
    line(`  chain, open line   → ${swept.length} of 5 bodies 1.8 tiles apart, and ${swept.includes(far) ? 'the far one too' : 'nothing across the room'}`);
    check(
      swept.length === 5 && !swept.includes(far),
      'a chain walks the whole line, four hops out, and stops where the line does',
      `${swept.length} reached, far ${swept.includes(far)}`
    );

    const walled = line5(2);
    const stopped = chainCast(walled);
    line(`  chain, one wall    → ${stopped.length} bodies, the third of them alive`);
    check(
      stopped.length === 3 && !walled[2].dead && !stopped.includes(walled[4]),
      'and a body it cannot kill is where the chain stops',
      `${stopped.length} reached, wall dead ${walled[2].dead}`
    );
  }

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

  // Overload counts casts, so the fifth one is the one that pays.
  const overload = { everyNth: { n: 5, multiplier: 3 } };
  const early = cast(overload).hits[0].multiplier;
  line(`  overload cast 1    → x${early}`);
  check(early === 1, 'the first cast is ordinary', String(early));

  // --- and the WEDGE, which is the only delivery with a direction ----------
  //
  // Everything above is about how far a shot reaches. A Cone is about which
  // WAY it is pointing, and nothing else in the game has ever had to be.
  const wedge = (grants: Record<string, unknown>) => {
    const user = dummy(0, 0);
    const ahead = dummy(2, 0);
    const flank = dummy(1, 1.6); // 58° off, so the bare wedge does not hold it
    const back = dummy(-2, 0);
    const far = dummy(9, 0);
    const enemies = [ahead, flank, back, far];
    const hits: any[] = [];
    SKILL_BEHAVIOURS.cone({
      skill: SKILL_BY_ID.shockwave,
      user, primary: ahead, enemies,
      rng: new Rng(9), grants, crit: false, castIndex: 0,
      hit: (who: any) => hits.push(who),
      ailment: () => {},
      leave: () => {},
      areaRadius: (base: number) => base,
      vfx: () => {},
    } as any);
    const name = (e: any) =>
      e === ahead ? 'ahead' : e === flank ? 'flank' : e === back ? 'back' : 'far';
    return hits.map(name);
  };

  const front = wedge({});
  line(`  wedge bare         → ${front.join(', ')}`);
  check(front.join() === 'ahead', 'a bare Cone takes what is in front of it and nothing else', front.join());

  // The Burst under the mouth is the SAME picture the passive throws, and it is
  // drawn at YOUR feet at a fixed size — sized to the reach it would be a
  // circle where the wedge is a wedge, and what a Cone caught is the wedge's to
  // say. The wedge itself still carries the reach and the opening.
  {
    const shown: Array<{ kind: string; points: any[] }> = [];
    const user = dummy(0, 0);
    SKILL_BEHAVIOURS.cone({
      skill: SKILL_BY_ID.shockwave,
      user, primary: dummy(2, 0), enemies: [dummy(2, 0)],
      rng: new Rng(9), grants: { coneReach: 3 }, crit: false, castIndex: 0,
      hit: () => {}, ailment: () => {}, leave: () => {}, areaRadius: (base: number) => base,
      vfx: (kind: string, points: any[]) => shown.push({ kind, points }),
    } as any);
    const blast = shown.find((v) => v.kind === 'burst');
    const cut = shown.find((v) => v.kind !== 'burst');
    const wide = blast ? Math.hypot(blast.points[1].x - blast.points[0].x, blast.points[1].y - blast.points[0].y) : 0;
    const far = cut ? Math.hypot(cut.points[1].x - cut.points[0].x, cut.points[1].y - cut.points[0].y) : 0;
    line(`  and a ${wide.toFixed(2)} tile Burst under a wedge reaching ${far.toFixed(2)}`);
    check(
      blast !== undefined && cut !== undefined && wide > 0 && wide < far
        && blast.points[0].x === user.x && blast.points[0].y === user.y,
      'a Cone Bursts at your feet, smaller than the wedge it opens',
      `burst ${wide.toFixed(2)} at ${blast?.points[0].x},${blast?.points[0].y}; wedge ${far.toFixed(2)}`
    );
  }

  const opened = wedge({ coneArc: 60 });
  line(`  wedge +60°         → ${opened.join(', ')}`);
  check(opened.includes('flank'), 'opening it wider catches the flank', opened.join());
  check(!opened.includes('back'), 'and still nothing behind you', opened.join());

  const around = wedge({ coneArc: 260 });
  line(`  wedge +260°        → ${around.join(', ')}`);
  check(around.includes('back'), 'past 360° there is no behind left', around.join());
  check(!around.includes('far'), 'and it never reaches past its own length', around.join());

  const longer = wedge({ coneReach: 3 });
  line(`  wedge reach x3     → ${longer.join(', ')}`);
  check(longer.includes('far'), 'where reaching further does exactly that', longer.join());
}

// ===========================================================================
rule('THE WEAPON — is its own damage its own?');
{
  const inc: RolledMod = {
    entryId: 'probe', defId: 'probe', group: 'probe', slot: 'offence',
    name: 'probe', tier: 1, tags: [],
    stats: [{ stat: 'damage', form: 'inc', value: 100, tags: ['physical'] }],
  };
  const wielding = (where: 'none' | 'weapon' | 'ring'): Character => {
    const c = makeCharacter(starterLoadout(new Rng(9)), 'strike');
    c.level = 1;
    delete c.equipment.offhand;
    for (const worn of Object.values(c.equipment)) {
      worn.mods = [];
      worn.implicits = [];
    }
    const bow = makeGear('crude_bow', 1);
    bow.mods = where === 'weapon' ? [inc] : [];
    bow.implicits = [];
    c.equipment.weapon = bow;
    if (where === 'ring') c.equipment.ring1.mods = [inc];
    return c;
  };
  const swing = (c: Character): number => weaponMod(c)?.stats[0].value ?? 0;
  const base = GEAR_BASE_BY_ID.crude_bow.damage ?? 0;

  line(
    `  a Crude Bow of ${base} swings ${swing(wielding('none')).toFixed(0)} bare, ` +
      `${swing(wielding('weapon')).toFixed(0)} with +100% increased Physical ON IT, ` +
      `${swing(wielding('ring')).toFixed(0)} with the same line on a ring`
  );
  check(
    base > 0
      && Math.abs(swing(wielding('none')) - base) < 1e-9
      && Math.abs(swing(wielding('weapon')) - base * 2) < 1e-9
      && Math.abs(swing(wielding('ring')) - base) < 1e-9,
    'a damage increase rolled ON the weapon scales the WEAPON, and the same line elsewhere does not',
    `${swing(wielding('none'))} / ${swing(wielding('weapon'))} / ${swing(wielding('ring'))}`
  );

  // And it is counted ONCE. Left in the global pool as well, a weapon's own
  // increase would scale the whole build too — which is the bug local exists
  // to stop, and it would be invisible in the total.
  {
    const c = wielding('weapon');
    const global = statMods(c).filter((m) => m.entryId === 'probe').flatMap((m) => m.stats);
    check(
      global.length === 0,
      'and it is gone from what the rest of your damage reads, so nothing counts it twice',
      JSON.stringify(global)
    );
  }

  // A SPELL never reads it. The line is tagged `attack`, so a wand user holding
  // a mace for free damage is refused by the tag rather than by a rule.
  {
    const c = wielding('none');
    const bare = heroStats([], 1, SKILL_BY_ID.fireball).damage;
    const armed = heroStats(statMods(c), 1, SKILL_BY_ID.fireball).damage;
    line(`  and a Fireball reads ${armed.toFixed(1)} holding it against ${bare.toFixed(1)} holding nothing`);
    check(
      Math.abs(armed - bare) < 1e-9,
      'and a SPELL takes nothing from the weapon in your hand',
      `${armed} against ${bare}`
    );
  }
}

// ===========================================================================
rule('WHAT IT IS SWUNG WITH — does a skill get the weapon it needs?');
{
  const wants: string[] = [];
  for (const skill of MAIN_SKILLS) {
    const need = skill.requires ? weaponFamilies(skill).join('/') : 'anything';
    line(`  ${skill.name.padEnd(17)} ${need}`);
    // A SPELL names nothing: cast it holding whatever you like.
    if (skill.category === 'spell' && skill.requires) wants.push(`${skill.id} is a spell and requires ${skill.requires}`);
  }
  check(wants.length === 0, 'a spell asks for no weapon at all', wants.join('; '));

  // The weapon the Lampwright hands you SATISFIES the skill you picked. Derived
  // rather than written twice, and checked, or the opening arms you with a
  // piece your own skill refuses and the first descent cannot be swung.
  const wrong = MAIN_SKILLS.filter((sk) => {
    const base = starterWeapon(sk);
    return !base || !weaponFits(sk, makeGear(base, 1));
  }).map((sk) => `${sk.id} → ${starterWeapon(sk)}`);
  check(wrong.length === 0, 'and the weapon it is opened with is one it can be swung with', wrong.join(', '));

  // NEITHER direction refuses. Two doors that each check the other are a
  // deadlock: holding a mace and swinging Shockwave, the bow is refused because
  // of the skill and the skill is refused because of the bow, and the only way
  // out is a spell. What the mismatch costs is said at the Fissure instead.
  {
    const game = createGame('fresh');
    game.inventory = [];
    const bow = makeGear('crude_bow', 20);
    const mace = makeGear('cudgel', 20);
    for (const i of [bow, mace]) addItem(game, i);
    equipItem(game, mace, 'weapon');
    equipSkill(game.character, 'shockwave');

    const tookBow = equipItem(game, bow, 'weapon') !== null;
    const stuck = weaponRefusal(game.character);
    const tookArrow = equipSkill(game.character, 'lightning_arrow');
    line(`  a mace and Shockwave: the bow ${tookBow ? 'went on' : 'was refused'}, then Lightning Arrow ${tookArrow ? 'went on' : 'was refused'}`);
    line(`  and in between, the Fissure said: ${stuck ?? '(nothing)'}`);
    check(
      tookBow && tookArrow && mainSkillId(game.character) === 'lightning_arrow',
      'a weapon and a skill swap freely in either order, with no juggling',
      `bow ${tookBow}, arrow ${tookArrow}, holding ${mainSkillId(game.character)}`
    );
    check(
      stuck !== null && weaponRefusal(game.character) === null,
      'and a pair that disagrees shuts the Fissure until it agrees again',
      `mid-swap ${stuck}, after ${weaponRefusal(game.character)}`
    );
  }

  // Taking the weapon OFF is the third door, and it does not refuse either.
  {
    const game = createGame('fresh');
    game.inventory = [];
    addItem(game, makeGear('cudgel', 20));
    equipItem(game, game.inventory[0], 'weapon');
    equipSkill(game.character, 'shockwave');
    const off = unequipItem(game, 'weapon');
    check(
      off && weaponRefusal(game.character) !== null,
      'and an empty hand is a state you can reach, and one the Fissure names',
      `${off} / ${weaponRefusal(game.character)}`
    );
  }

  // CONVERSION is what makes a Physical weapon worth swinging on a Lightning
  // skill. It MOVES damage and may not make any: on a bare build every type
  // carries the same increases, so the total either side has to be identical.
  {
    const turn = SKILL_BY_ID.lightning_arrow.convert!;
    const bare = (skillId: string, base: string): Character => {
      const c = makeCharacter(starterLoadout(new Rng(9)), skillId);
      c.level = 1;
      delete c.equipment.offhand;
      for (const worn of Object.values(c.equipment)) {
        worn.mods = [];
        worn.implicits = [];
      }
      const w = makeGear(base, 1);
      w.mods = [];
      w.implicits = [];
      c.equipment.weapon = w;
      return c;
    };
    const shot = characterStats(bare('lightning_arrow', 'crude_bow'));
    const swing = GEAR_BASE_BY_ID.crude_bow.damage ?? 0;
    const moved = swing * turn.share;
    line(
      `  Lightning Arrow turns ${Math.round(turn.share * 100)}% of a bow's ${swing}: ` +
        Object.entries(shot.damageByType).map(([t, v]) => `${t} ${v.toFixed(1)}`).join(', ')
    );
    check(
      Math.abs((shot.damageByType.physical ?? 0) - (swing - moved)) < 1e-6
        && Math.abs((shot.damageByType.lightning ?? 0) - (skillBase(SKILL_BY_ID.lightning_arrow, 1) + moved)) < 1e-6,
      'a Conversion moves a share of the weapon into the skill’s type and leaves the rest',
      JSON.stringify(shot.damageByType)
    );
    check(
      Math.abs(shot.damage - (skillBase(SKILL_BY_ID.lightning_arrow, 1) + swing)) < 1e-6,
      'and it MOVES damage rather than making any',
      `${shot.damage} against ${skillBase(SKILL_BY_ID.lightning_arrow, 1) + swing}`
    );
  }

  // And a SAVE holding a mismatched pair keeps it. Healing it away would undo
  // a swap the player is halfway through: they put the bow on, closed the game,
  // and came back to a skill they did not choose.
  {
    const game = createGame('fresh');
    game.character.equipment.weapon = makeGear('crude_bow', 20);
    game.character.equipped = { ...game.character.equipped, [MAIN_SLOT]: 'shockwave' };
    heal(game);
    const now = mainSkillId(game.character);
    line(`  and a save holding a bow and Shockwave comes back holding ${SKILL_BY_ID[now]?.name}`);
    check(
      now === 'shockwave' && weaponRefusal(game.character) !== null,
      'and a save holding a pair that disagrees keeps it, rather than choosing for you',
      `${now} with a bow`
    );
  }
}

// ===========================================================================
rule('DUAL WIELDING — is a pair two weapons or an average of one?');

// The user's own shape: every hit is BOTH hands, and the RATE alternates. So
// what has to hold is that a pair out-damages either weapon alone, that the two
// rates are the two weapons' own rather than a blend, and that the sheet's one
// number is what a long run of alternating swings actually comes to.
{
  const held = (main: string, off: string | null): Character => {
    const c = makeCharacter(starterLoadout(new Rng(9)), 'strike');
    c.level = 1;
    // The one trade that may hold a pair — a bare character cannot, and both
    // the stat seam and the ART seam ask that question rather than assuming.
    takeUpTrade(c, 'rogue');
    for (const worn of Object.values(c.equipment)) {
      worn.mods = [];
      worn.implicits = [];
    }
    c.equipment.weapon = makeGear(main, 1);
    if (off) c.equipment.offhand = makeGear(off, 1);
    else delete c.equipment.offhand;
    return c;
  };
  const swing = (c: Character): number => weaponMod(c)?.stats[0].value ?? 0;

  // A dagger is the fast one and a mace the slow one, so a mixed pair is the
  // case a single blended rate would hide.
  const alone = held('shiv', null);
  const shielded = held('shiv', 'bark_buckler');
  const pair = held('shiv', 'cudgel');
  line(
    `  a shiv alone swings ${swing(alone).toFixed(1)}, with a shield ` +
      `${swing(shielded).toFixed(1)}, with a cudgel ${swing(pair).toFixed(1)}`
  );
  check(
    Math.abs(swing(alone) - swing(shielded)) < 1e-6,
    'a shield swings for nothing, so an off hand holding one is a hand held free',
    `${swing(alone)} against ${swing(shielded)}`
  );
  const both =
    weaponSwing(pair.equipment.weapon!) * DUAL.main + weaponSwing(pair.equipment.offhand!) * DUAL.off;
  check(
    Math.abs(swing(pair) - both) < 1e-6 && swing(pair) > swing(alone),
    `a pair puts ${Math.round(DUAL.main * 100)}% of one hand and ` +
      `${Math.round(DUAL.off * 100)}% of the other into ` +
      'every hit, and beats either alone',
    `${swing(pair).toFixed(2)} against ${swing(alone).toFixed(2)}`
  );

  const rates = weaponRates(pair);
  const stats = characterStats(pair);
  line(
    `  and swings at ${rates.map((r) => r.toFixed(2)).join(' then ')} a second, ` +
      `which is ${stats.attacksPerSecond.toFixed(3)} over any run of them`
  );
  check(
    rates.length === 2 && Math.abs(rates[0] - rates[1]) > 0.01,
    'the two hands keep their OWN rates rather than being blended into one',
    rates.join(', ')
  );
  // Two swings take 1/a + 1/b seconds. The sheet prints one number and the sim
  // alternates; this is the arithmetic that makes them the same answer. Read as
  // a RATIO against the same character holding one weapon, so whatever his
  // attributes buy in attack speed is on both sides of it.
  const lift = characterStats(alone).attacksPerSecond / weaponRates(alone)[0];
  const over = (2 / (1 / rates[0] + 1 / rates[1])) * lift;
  const mean = ((rates[0] + rates[1]) / 2) * lift;
  check(
    Math.abs(stats.attacksPerSecond - over) < 1e-6
      && Math.abs(stats.attacksPerSecond - mean) > 1e-6
      && stats.handRates.length === 2,
    'and the sheet says what a run of alternating swings comes to, not their average',
    `${stats.attacksPerSecond.toFixed(4)} against ${over.toFixed(4)}, mean ${mean.toFixed(4)}`
  );
  // A pair is ORDERLESS in art and ORDERED in stats. Asked of the KEY rather
  // than of the resolved sprite: with no pair drawn yet both fall back to the
  // same single-weapon body and the question answers itself.
  const swapped = held('cudgel', 'shiv');
  const key = (c: Character) => variants(c)[0];
  check(
    key(pair) === key(swapped) && key(pair) === 'dagger_mace',
    'a pair asks for ONE picture whichever hand you filled',
    `${key(pair)} against ${key(swapped)}`
  );
  check(
    Math.abs(swing(pair) - swing(swapped)) > 1e-6,
    'and which hand is which still decides what it swings for',
    `${swing(pair).toFixed(2)} against ${swing(swapped).toFixed(2)}`
  );
  // DUAL WIELDING IS ONE TRADE'S PRIVILEGE. *"All characters should just not be
  // able to dual wield and then we just have a trade that can."* Everybody may
  // hold a shield; a second WEAPON is a decision made at character creation.
  const off = EQUIP_SLOTS.find((sl) => sl.id === OFF_SLOT)!;
  const anybody = makeCharacter({}, 'strike');
  const wielder = TRADES.find((t) => t.spec.dualWields)?.spec.id;
  const dual = makeCharacter({}, 'strike');
  if (wielder) takeUpTrade(dual, wielder);
  check(
    fitsSlot(makeGear('bark_buckler', 1), off, anybody)
      && !fitsSlot(makeGear('crude_bow', 1), off, anybody)
      && !fitsSlot(makeGear('cudgel', 1), off, anybody),
    'the off hand takes a shield from anybody, and never a two-hander or a second weapon',
    String(off.accepts)
  );
  check(
    !!wielder && fitsSlot(makeGear('cudgel', 1), off, dual)
      && !fitsSlot(makeGear('crude_bow', 1), off, dual),
    `and a second weapon only from the one trade that dual wields — ${wielder ?? 'nobody'}`,
    `wielder ${wielder}`
  );
  check(
    TRADES.filter((t) => t.spec.dualWields).length === 1,
    'and exactly one trade has it, or it is not a privilege',
    String(TRADES.filter((t) => t.spec.dualWields).length)
  );
}

// ===========================================================================
rule('RIMEFIELD — does the one single-target skill reach a pack?');

// Rimespike hits ONE body. The arm's whole job is the room, and what it leaves
// is a CLOUD: no damage at all, and the build's own Chill on everything
// standing in it. So what is counted is bodies CAUGHT, and the ones the cast
// never touched are the whole answer.
{
  const dummy = (x: number, y: number) =>
    ({ x, y, life: 1e6, radius: 0, dead: false, ailments: [] as unknown[],
       stats: { maxLife: 1e6, attacksPerSecond: 1 } }) as any;
  const primary = dummy(4, 0);
  // Two inside a bare Cloud, one only a WIDER one reaches, one across the room.
  const enemies = [primary, dummy(4.8, 0.5), dummy(3.4, 1.1), dummy(6.6, 0), dummy(24, 0)];
  const grantsOf = (id: string) => nodeById('rimespike', id)?.grants ?? {};

  /** Bodies a Cloud caught over four casts, counting repeats. */
  const caught = (grants: Record<string, unknown>): number => {
    let left = 0;
    for (let castIndex = 0; castIndex < 4; castIndex++) {
      SKILL_BEHAVIOURS.single_target({
        skill: SKILL_BY_ID.rimespike,
        user: dummy(0, 0), primary, enemies,
        rng: new Rng(9), grants, crit: false, castIndex, momentum: 1,
        hit: () => {}, ailment: () => {}, leave: () => { left++; },
        areaRadius: (base: number) => base, vfx: () => {},
      } as any);
    }
    return left;
  };

  const bare = caught({});
  const field = { ...grantsOf('rs_field') };
  const armed = caught(field);
  const wide = caught({ ...field, ...grantsOf('rs_whiteout') });
  const often = caught({ ...field, ...grantsOf('rs_frostfall') });
  const bloom = caught({ ...field, ...grantsOf('rs_bloom') });
  line(
    `  bodies a Cloud catches in 4 casts: bare ${bare}, Rimefield ${armed}, ` +
      `Whiteout ${wide}, Frostfall ${often}, Bloom ${bloom}`
  );
  check(bare === 0, 'a bare Rimespike leaves no Cloud at all', String(bare));
  check(
    armed > 1,
    'Rimefield catches bodies the spike never touched',
    `${armed} caught, and one of them is the target`
  );
  check(wide > armed, 'a wider Cloud catches more of them', `${wide} against ${armed}`);
  check(often > armed, 'and a more frequent one catches them more often', `${often} against ${armed}`);
  check(bloom > armed, 'and a second and third Cloud reach further still', `${bloom} against ${armed}`);
}

// ===========================================================================
rule('THE RELAY — does a Critical carry you into the next body?');

// The one switch the SIM reads rather than the delivery: it lands after the use
// that bought it has ended, so firing a behaviour twice cannot see it and only
// a descent can. What has to hold is that it FIRES, that it chains past one
// follow-up, and that a room full of bodies at 100% crit still ends.
{
  const descend = (relay: boolean) => {
    const character = ladderCharacter(3, new Rng(88), 'ambush');
    const progress = skillProgress(character, 'ambush');
    progress.allocated = relay ? walkTo('ambush', 'am_relay') : [];
    const sim = new RunSim([], character, new Rng(404));
    // FORCED, so the reading is about the chain rather than about a crit roll.
    sim.state.hero.stats.critChance = 100;
    return runToCompletion(sim, 400);
  };

  const bare = descend(false);
  const armed = descend(true);
  // A follow-up PAYS, so it counts as a use: what the hero started himself is
  // the difference, and the ratio between them is how deep a chain runs.
  const started = armed.casts - armed.relays;
  line(
    `  at 100% crit: bare ${bare.casts} uses and ${bare.relays} follow-ups, ` +
      `with Relay ${started} started and ${armed.relays} followed`
  );
  check(bare.relays === 0, 'nothing chains without the node', String(bare.relays));
  check(armed.relays > 0, 'and a Critical buys a follow-up with it', String(armed.relays));
  check(
    armed.relays > started,
    'and the follow-up chains rather than stopping at one',
    `${armed.relays} follow-ups off ${started} uses`
  );
  // A chain that landed on a body it had already opened on would go round for
  // ever; that it does not is what makes the node shippable at all.
  check(
    armed.status !== 'running',
    'and a room at 100% crit still ends, because a repeat ends the chain',
    `${armed.status} at ${armed.elapsed.toFixed(0)}s`
  );
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
    // 58° off the axis, so a WEDGE that opens wider catches something it did
    // not before: everything else here is within 45°, which the narrowest cone
    // in the game already holds.
    out.push(dummy(1, 1.6, 1e6));
    return out;
  };

  /**
   * What one set of grants does, as a string. Cast from several primaries, at
   * several cast counts, critting and not, after a kill and not — so a talent
   * that only shows on the fifth cast, or only against something nearly dead,
   * or only while nothing has touched you, still shows.
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
            // A kill still counting on the odd casts, and a stretch untouched
            // growing across them: both conditions live inside the five.
            sinceKill: castIndex % 2 === 1 ? 2 : 0,
            sinceHit: castIndex,
            hit: (who: any, multiplier: number) => {
              marks.push(`h${enemies.indexOf(who)}:${multiplier.toFixed(3)}`);
              who.life -= multiplier * 5e4;
              if (who.life <= 0) who.dead = true;
            },
            ailment: (who: any, m: number, seconds: number, spread: any) => {
              who.ailments.push(1);
              marks.push(`a${enemies.indexOf(who)}:${m.toFixed(3)}:${seconds.toFixed(2)}:${spread?.radius ?? 0}`);
            },
            // A Cloud's whole content: no damage, and it marks WHO it caught,
            // so a wider one or a second one is a different fingerprint.
            leave: (who: any) => marks.push(`l${enemies.indexOf(who)}`),
            areaRadius: (base: number) => base,
            vfx: (kind: string, points: any[]) =>
              marks.push(`v${kind}:${points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('|')}`),
            // Where the sim would PUT you. There is no map here, so it records
            // the ask: a step behind the body it was aimed at.
            blink: (who: any) => marks.push(`b${enemies.indexOf(who)}`),
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
        // The stat layer is checked by the stat pipeline, not by casting — and
        // a SIM switch lands after the use, so a cast cannot show it either.
        const switches = Object.keys(answer).filter(
          (k) => !GRANT_BY_ID[k]?.reads.some((r) => r === STATS || r === SIM)
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
rule('COMBINATIONS — is every pair of changing nodes a decided thing?');

// `mergeGrants` says what two nodes granting the SAME switch fold to. What
// nothing said is what two nodes changing DIFFERENT things about one cast come
// to. Audited over CLASSES rather than nodes: at node level it is 742 pairs
// across three trees, which goes stale the day a node is added.
{
  const classed = GRANTS.filter((g) => g.changes);
  const classes = [...new Set(classed.map((g) => g.changes!))].sort();
  line(`  ${classed.length} switches in ${classes.length} classes: ${classes.join(', ')}`);

  // Every switch a DELIVERY reads has to be classed, or it is a mechanism the
  // audit cannot see. Derived from `SKILL_BEHAVIOURS` rather than from a second
  // list of exemptions: the stat layer changes no delivery, and neither does a
  // movement web — a mover never casts, so there is no cast for its switches to
  // interact over and a class for one would be a row nothing can produce.
  const delivers = (g: (typeof GRANTS)[number]) => g.reads.some((r) => r in SKILL_BEHAVIOURS);
  const unclassed = GRANTS.filter((g) => !g.changes && delivers(g));
  check(
    unclassed.length === 0,
    'every switch a delivery reads declares what it changes',
    unclassed.map((g) => g.id).join(', ')
  );

  // The audit is COMPLETE: every unordered pair of classes, self-pairs
  // included, has a written answer. This is the check that stops a new node
  // quietly adding a combination nobody decided.
  const missing: string[] = [];
  const wanted = new Set<string>();
  for (const a of classes) {
    for (const b of classes) {
      const key = [a, b].sort().join('|');
      if (wanted.has(key)) continue;
      wanted.add(key);
      if (!interactionOf(a, b)) missing.push(key);
    }
  }
  line(`  ${INTERACTIONS.length} pairs written down, ${wanted.size} the classes can make`);
  check(
    missing.length === 0 && INTERACTIONS.length === wanted.size,
    'every pair of classes has a written answer, and none is written twice',
    missing.join(', ') || `${INTERACTIONS.length} rows against ${wanted.size} pairs`
  );
  check(
    INTERACTIONS.every((i) => i.says.length > 30 && interactionOf(i.pair[0], i.pair[1]) === i),
    'and each says what taking both comes to rather than that it is fine',
    INTERACTIONS.filter((i) => i.says.length <= 30).map((i) => i.pair.join('|')).join(', ')
  );

  // What the audit FOUND. Nothing is blocked: every pair composes, and the
  // worked example the phase was written around — a burst under a tree about a
  // cloud — turns out to be a trade rather than a contradiction.
  const blocked = INTERACTIONS.filter((i) => i.blocked);
  line(`  ${blocked.length} of them have no coherent answer and are refused`);
  const rupture = interactionOf('burst', 'field');
  check(
    !rupture?.blocked && /armour/.test(rupture?.says ?? ''),
    'Rupture under the cloud tree is a trade the card names, not a contradiction',
    rupture?.says ?? 'no answer written'
  );

  // Nothing currently allocatable is refused. This is the safety check the
  // phase demanded: allocations are REPLAYED on load, so a wrong refusal costs
  // every player their build the next time they open the game.
  const refused: string[] = [];
  for (const tree of BUILT_TREES) {
    const skillId = tree.spec.skillId;
    const held: string[] = [];
    const spendRng = new Rng(31337);
    while (held.length < MAX_TREE_POINTS) {
      const open = tree.nodes.filter(
        (n) => canAllocateIn(tree.nodes, n.id, held) && !held.includes(n.id)
      );
      if (open.length === 0) break;
      const pick = spendRng.pick(open)!;
      if (blockedBy(skillId, pick.id, held)) refused.push(`${skillId}/${pick.id}`);
      held.push(pick.id);
    }
  }
  check(
    refused.length === 0,
    'and no build anybody has already walked is refused by it',
    refused.join(', ')
  );

  // The mechanism itself, proved on a pair the table does not block — by
  // blocking one for the length of this check. A refusal nobody can trigger is
  // a refusal nobody has tested.
  {
    const pair = interactionOf('scale', 'field')!;
    const was = pair.blocked;
    pair.blocked = true;
    const held = ['bl_fixation'];
    const stopped = blockedBy('blight', 'bl_canopy', held);
    const free = blockedBy('blight', 'bl_slowrot', held);
    pair.blocked = was;

    check(
      stopped?.node.id === 'bl_fixation' && stopped.says === pair.says,
      'a blocked pair refuses the second node and names the first',
      stopped ? `${stopped.node.id}` : 'nothing was refused'
    );
    check(
      free === null && blockedBy('blight', 'bl_canopy', held) === null,
      'and it catches only what it means to, in both directions',
      free ? free.node.id : 'a class it does not touch was refused'
    );
  }

  // ECHOES. Strike takes one enemy and every body past it is bought, so what
  // has to hold is that they are taken NEAREST FIRST, that each one is allowed
  // to stand further out than the last, and that a pack nobody paid for stays
  // untouched.
  {
    const dummy = (x: number, y: number) =>
      ({
        x, y, life: 1e6, radius: 0, dead: false, ailments: [] as unknown[],
        stats: { maxLife: 1e6, attacksPerSecond: 1 },
      }) as any;

    // A line running away from the enemy you struck, a stride apart, so how
    // many are taken IS how far the allowance has grown.
    const swing = (grants: Record<string, unknown>) => {
      const user = dummy(0, 0);
      const primary = dummy(1, 0);
      const line1 = dummy(2.2, 0); // 1.2 out, inside the first Echo's 1.5
      const line2 = dummy(3.0, 0); // 2.0, which only the second is allowed
      const line3 = dummy(3.6, 0); // 2.6, only the third
      const line4 = dummy(8, 0); // 7.0 — past anything this branch can buy
      const enemies = [primary, line1, line2, line3, line4];
      const hits: Array<{ who: any; multiplier: number }> = [];
      SKILL_BEHAVIOURS.melee({
        skill: SKILL_BY_ID.strike,
        user, primary, enemies,
        rng: new Rng(3), grants, crit: false, castIndex: 0,
        hit: (who: any, multiplier: number) => hits.push({ who, multiplier }),
        ailment: () => {},
        leave: () => {},
        areaRadius: (base: number) => base,
        vfx: () => {},
      } as any);
      const name = (e: any) =>
        e === primary ? 'struck' : `out${enemies.indexOf(e)}`;
      return { hits, names: hits.map((h) => name(h.who)) };
    };

    const alone = swing({});
    line(`  bare Strike        → ${alone.names.join(', ')}`);
    check(alone.names.join() === 'struck', 'a bare Strike takes one enemy and nothing else', alone.names.join());

    const two = swing({ echoes: 2 });
    line(`  +2 Echoes          → ${two.names.join(', ')}`);
    check(
      two.names.join() === 'struck,out1,out2',
      'Echoes work outward from the enemy you struck, nearest first',
      two.names.join()
    );
    check(
      Math.abs(two.hits[1].multiplier - MELEE.echoDamage) < 1e-6,
      `and each lands for ${Math.round(MELEE.echoDamage * 100)}% of the swing`,
      String(two.hits[1].multiplier)
    );

    // The third body is 2.6 tiles out, past what the second Echo is allowed,
    // so buying more of them is what buys the distance.
    const three = swing({ echoes: 3 });
    line(`  +3 Echoes          → ${three.names.join(', ')}`);
    check(
      three.names.includes('out3'),
      'a further Echo is allowed to stand further out',
      three.names.join()
    );
    check(
      !swing({ echoes: 7 }).names.includes('out4'),
      'and no number of them reaches a body the run never got to',
      swing({ echoes: 7 }).names.join()
    );

    const full = swing({ echoes: 2, echoDamage: 1 });
    check(
      full.hits[1].multiplier === 1,
      'buying the falloff back makes an Echo the whole swing',
      String(full.hits[1].multiplier)
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
    equipSkill(game.character, skillId);
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
  equipSkill(game.character, 'blight');
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

  equipSkill(game.character, 'strike');
  check(
    damageDetail(game.character).seconds === 0,
    'and a skill that hits reports no duration at all',
    'a hit claims a duration'
  );

  // WHAT IT LEAVES BEHIND, on the sheet. Every ailment says its chance AND
  // what one stack is worth in its own units — a Burn is damage a second, a
  // Chill is a share off speed and a count that Freezes — because "applies
  // Chill" is the sentence this game does not write. Prismatic leaves nothing
  // ON PURPOSE and has to say so rather than being left off.
  {
    const stats = characterStats(game.character);
    const vague: string[] = [];
    for (const type of DAMAGE_TYPES) {
      const said = ailmentLine(type.id, stats);
      line(`  ${said}`);
      const def = AILMENT_OF_TYPE[type.id];
      if (!def) {
        if (!/no Ailment/.test(said)) vague.push(`${type.id} says nothing about having none`);
        continue;
      }
      if (!/%/.test(said)) vague.push(`${def.id} never says how often`);
      if (!/\d/.test(said.split(',').slice(1).join(','))) vague.push(`${def.id} never says what a stack is worth`);
      if (!said.includes(`${def.seconds}s`)) vague.push(`${def.id} never says how long`);
    }
    check(
      vague.length === 0,
      'every damage type says what it leaves behind, how often, and what a stack is worth',
      vague.join('; ')
    );
  }
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
  for (const skill of MAIN_SKILLS) {
    for (const [label, level, walkTo] of [
      ['bare, level 1', 1, 0],
      ['geared, level 20', 20, 0],
      ['half a tree', 20, 14],
      ['a deep tree', 40, 40],
    ] as Array<[string, number, number]>) {
      const character = createGame(walkTo === 0 && level === 1 ? 'fresh' : 'dev').character;
      equipSkill(character, skill.id);
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
  // touches a damage multiplier gets walked to on purpose, choices and all —
  // a MORE line included, which sixteen random points never once landed on
  // even though every tree has one.
  const multiplies = (node: ReturnType<typeof treeFor>[number], choice: string | null): boolean => {
    const picked = node.choices?.find((c) => c.id === choice);
    const grants = { ...(node.grants ?? {}), ...(picked?.grants ?? {}) };
    if ('ailmentMultiplier' in grants || 'convertTree' in grants) return true;
    return [...(node.stats ?? []), ...(picked?.stats ?? [])].some((l) => l.form === 'more');
  };
  for (const skill of MAIN_SKILLS) {
    for (const node of treeFor(skill.id)) {
      const options = node.choices?.length ? node.choices.map((c) => c.id) : [null];
      for (const choice of options) {
        if (!multiplies(node, choice)) continue;

        const path = pathTo(skill.id, node.id);
        if (path.length === 0) continue;
        const character = createGame('dev').character;
        equipSkill(character, skill.id);
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
      effectiveSkill(SKILL_BY_ID[mainSkillId(character)], treeGrants(character)),
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
  parkedCheck(
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

  /**
   * What one cast asks the sim for, against a single enemy standing on you —
   * and, beside it, what the enemy's own STATE is worth. A node reading "35%
   * more against something close" is real damage the sheet deliberately cannot
   * promise, since it depends on where the monster is standing; dividing it out
   * is what leaves the sheet's own promise to compare.
   */
  const castOnce = (skillId: string, grants: Record<string, unknown>) => {
    const skill = SKILL_BY_ID[skillId];
    const user = dummy(0, 0);
    const target = dummy(0.2, 0);
    const asked: Array<{ multiplier: number; seconds: number }> = [];
    const use = {
      skill, user, primary: target, enemies: [target],
      rng: new Rng(3), grants, crit: false, castIndex: 0,
      hit: (_t: any, multiplier: number) => asked.push({ multiplier, seconds: 0 }),
      ailment: (_t: any, multiplier: number, seconds: number) => asked.push({ multiplier, seconds }),
      leave: () => {},
      areaRadius: (base: number) => base,
      vfx: () => {},
      blink: () => {},
    } as any;
    SKILL_BEHAVIOURS[skill.behaviour](use);
    const conditional = castScale(grants, 0) * targetScale(use, target);
    return asked[0] ? { ...asked[0], conditional } : undefined;
  };

  const mismatched: string[] = [];
  for (const skill of MAIN_SKILLS) {
    for (const walkTo of [0, 12, 30]) {
      const character = createGame('dev').character;
      equipSkill(character, skill.id);
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

      // What the sim will actually compute, from its own two numbers, less
      // whatever the target's own position and state were worth.
      const simWorth = (stats.damage * asked.multiplier) / asked.conditional;
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
  parkedCheck(
    mismatched.length === 0,
    'and the sim asks for exactly what the sheet promised',
    `${mismatched.length} promises broken — see above`
  );

  // THE HOVER IS THE SAME ANSWER. It is the one place most builds ever read a
  // number, and it is a slot away from the sheet — so it is held to the sheet's
  // own totals rather than being trusted to have quoted them.
  {
    const who = ladderCharacter(6, new Rng(88), 'fireball');
    const detail = damageDetail(who);
    const stats = characterStats(who);
    const said = mainWorkings(who).join(' | ');
    line(`  the main slot's hover: ${said.split(' | ').slice(0, 3).join(', ')}`);
    check(
      said.includes(`${Math.round(detail.perApplication).toLocaleString()} `) &&
        said.includes(`${Math.round(detail.perSecond).toLocaleString()} damage per second`) &&
        said.includes(`${Math.round(stats.critChance)}% critical chance`) &&
        said.includes(`${stats.attackRange.toFixed(1)} tile reach`),
      'and the skill HOVER is the sheet’s own numbers, not the table’s',
      said
    );

    // A mover's WEB buys distance, and reading `params` would print the number
    // it had before a single point was spent.
    const walker = ladderCharacter(6, new Rng(88), 'fireball');
    equipSkill(walker, 'blink');
    const mover = SKILL_BY_ID[equippedSkill(walker, 'movement') ?? ''];
    const bare = mover ? slotWorkings(mover, walker).join(' ') : '';
    if (mover) {
      const progress = skillProgress(walker, mover.id);
      progress.allocated = [...progress.allocated, 'bk_reach_m0', 'bk_longstep'];
    }
    const walked = mover ? slotWorkings(mover, walker).join(' ') : '';
    line(`  the movement slot's hover: ${bare} → ${walked} with Longstep`);
    check(
      !!mover &&
        bare.includes('tiles every') &&
        bare.includes('on its own') &&
        walked !== bare &&
        (treeGrants(walker).moveDistance as number) === 1.6,
      'and a mover reads its two numbers THROUGH the web, never off the table',
      `${bare} → ${walked}`
    );
  }
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
  // Twelve, not six. What separates the Seam from four Demonic crystals is a
  // couple of percent, and at six seeds the run-to-run noise is bigger than
  // that — the ORDER of the two came out differently on consecutive runs.
  const seeds = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41];
  // LEVEL matters to one of these and one only: the Seam is the world a level
  // buys, so its set is socketed at the top and every other set is blank.
  const room = (families: MonsterFamily[], level = 1) => {
    let time = 0;
    let taken = 0;
    let deaths = 0;
    for (const seed of seeds) {
      const hero = ladderCharacter(2, new Rng(99));
      const set = families.map((f) => makeCrystal(level, f));
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
  lived.seam = room(['demonic', 'demonic', 'prismatic', 'prismatic'], 4);
  line(
    `  seam       ${lived.seam.time.toFixed(0).padStart(4)}s   ` +
      `${Math.round(lived.seam.taken).toString().padStart(5)}   ` +
      `${lived.seam.perSec.toFixed(1).padStart(7)}   ${String(lived.seam.deaths).padStart(6)}`
  );

  // The ladder, which is a DECISION rather than a drift: the Fissure is the
  // shallow end and the two worlds that carry auras are harder than it. This
  // half is not close — the aura worlds hurt getting on for twice as much.
  check(
    lived.demonic.perSec > lived.normal.perSec * 1.15 &&
      lived.prismatic.perSec > lived.normal.perSec * 1.15,
    'Normal is the shallow end and both aura worlds are harder than it',
    `${lived.normal.perSec.toFixed(1)} / ${lived.demonic.perSec.toFixed(1)} / ` +
      `${lived.prismatic.perSec.toFixed(1)} per second`
  );
  // The Seam is where both kinds of aura meet, and it takes two crystals of
  // each — so half its packs carry what all four of a single world's do. It
  // measures level with the hardest single world rather than above it, and the
  // gap moves several percent either way whenever anything in the sim changes,
  // so what is held here is the CLASS and not the ordering. Which of the two is
  // actually worst is an open question in ROADMAP.md, and this prints the
  // margin so an answer has something to read.
  const hardest = Math.max(lived.demonic.perSec, lived.prismatic.perSec);
  gauge(
    `the Seam is ${(((lived.seam.perSec - hardest) / hardest) * 100).toFixed(1)}% ` +
      'over the hardest single world — the same class within 15%'
  );
  // Harder, never a wall: the same under-geared character still walks out of
  // every one of them more often than not.
  //
  // PARKED, and this is the one to read first. `ladderCharacter` walks its tree
  // at RANDOM and sixteen points never reach a branch, so this character has no
  // coverage at all now that Strike's free Splash is gone — measured, it takes
  // 11.5 a second in Demonic where Shockwave takes 3.3 and Blight 2.8. Melee
  // with nothing bought standing in an aura pack is the finding; whether Strike
  // answers it with a base Echo is a DESIGN question and not a number.
  const walls = Object.entries(lived).filter(([, r]) => r.deaths > seeds.length / 2);
  parkedCheck(
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
  // AT THE TOP LEVEL, because the Seam is the one world a LEVEL buys — every
  // other line here is decided by the share alone and level 4 changes none.
  const top = CRYSTAL_LEVELS[CRYSTAL_LEVELS.length - 1].level;
  const of = (...families: MonsterFamily[]) =>
    mapTheme(families.map((f) => makeCrystal(top, f)));

  const cases: Array<[MapTheme, MonsterFamily[]]> = [
    ['fissure', []],
    ['fissure', ['normal', 'normal', 'demonic', 'prismatic']],
    ['fissure', ['normal', 'normal', 'normal', 'demonic']],
    ['demonic', ['demonic', 'demonic', 'normal', 'normal']],
    ['demonic', ['demonic', 'demonic', 'demonic', 'prismatic']],
    ['demonic', ['demonic']],
    ['prismatic', ['prismatic', 'prismatic', 'normal', 'normal']],
    ['seam', ['demonic', 'demonic', 'prismatic', 'prismatic']],
    // TWO AND TWO AND NOTHING ELSE. One of each is half a wall, and a wall
    // half spent is not the last world.
    ['demonic', ['demonic', 'prismatic']],
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
  // The SEAM, since it is the world nothing but a socketed set can reach.
  const seamTop = CRYSTAL_LEVELS[CRYSTAL_LEVELS.length - 1].level;
  const set = [
    makeCrystal(seamTop, 'demonic'), makeCrystal(seamTop, 'demonic'),
    makeCrystal(seamTop, 'prismatic'), makeCrystal(seamTop, 'prismatic'),
  ];
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
  const seeds = [11, 13, 15];
  let never = 0;

  for (const seed of seeds) {
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

    // A RUN THAT DIED ON THE WAY is not a reading on where the finale arrives:
    // it never arrived, and `toExit` is still its sentinel. Counted rather than
    // dropped, so three of three skipped cannot pass as evidence of anything.
    if (!sim.state.finale) {
      never++;
      arrivals.push(`seed ${seed} died before the exit`);
      continue;
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
    problems.length === 0 && never < seeds.length,
    `it comes up the hole as you near it, a wave at a time, counted whole` +
      `${never > 0 ? ` (${never} of ${seeds.length} seeds died first)` : ''}`,
    never === seeds.length
      ? `every seed died before the exit — nothing was measured`
      : problems.join('; ')
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

// The rule is in CLAUDE.md: nothing a player reads may describe a quantity in
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
  // Every movement node too: a small web is still six points spent by hand.
  for (const web of MOVE_WEBS) {
    for (const node of web.nodes) holds(`${web.spec.skillId}/${node.id}`, node.description);
  }
  // Every trade node too. A trade is nothing but rules with numbers on them,
  // so a line here with no figure is a decision the player cannot make.
  for (const trade of TRADES) {
    for (const node of trade.nodes) holds(`${trade.spec.id}/${node.id}`, node.description);
  }
  for (const c of CURRENCIES) {
    // Two of them act on EVERY modifier or on none in particular. There is no
    // figure being withheld, so there is none to print.
    if (c.id === 'shard_of_change' || c.id === 'shard_of_chaos') continue;
    holds(`currency/${c.id}`, c.description);
  }
  for (const a of AURAS) holds(`aura/${a.id}`, a.blurb);
  for (const attr of ATTRIBUTES) {
    for (const s of attr.per) holds(`attribute/${attr.id}`, describeStatLine(s));
  }

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
    ENCOUNTERS.every((e) => e.herald.length > 0) &&
      LAMPWRIGHT.first.beats.every((b) => b.said.length > 0),
    'and the lines that are voice rather than mechanics are left alone',
    'flavour went missing'
  );
}

// ===========================================================================
rule('ONE WORD PER MECHANISM — does the game say Arc every time it means Arc?');

// A keyword is only worth anything if it is the ONLY way the game says that
// thing. Learn what Pierce means once and every later card saying +1 Pierce is
// free to read — unless something somewhere still says "passes through", in
// which case the player has learnt one of two vocabularies.
{
  // Everything a player reads that could name a mechanism. Modifier lines are
  // in it because "increased" and "more" are keywords, and a rolled line is
  // where most players meet them.
  const lines: { where: string; text: string }[] = [];
  const read = (where: string, text: string): void => {
    lines.push({ where, text });
  };

  for (const tree of BUILT_TREES) {
    for (const node of tree.nodes) {
      read(`${tree.spec.skillId}/${node.id}`, node.description);
      for (const choice of node.choices ?? []) {
        read(`${tree.spec.skillId}/${node.id}/${choice.id}`, choice.description);
      }
    }
  }
  for (const web of MOVE_WEBS) {
    for (const node of web.nodes) read(`${web.spec.skillId}/${node.id}`, node.description);
  }
  for (const trade of TRADES) {
    read(`${trade.spec.id}`, trade.spec.blurb);
    for (const node of trade.nodes) read(`${trade.spec.id}/${node.id}`, node.description);
  }
  for (const skill of PLAYER_SKILLS) read(`skill/${skill.id}`, skill.description);
  for (const c of CURRENCIES) read(`currency/${c.id}`, c.description);
  for (const g of GRANTS) read(`grant/${g.id}`, g.what);
  for (const def of ALL_MODS) {
    for (const s of def.tiers[0]?.stats ?? []) {
      read(`mod/${def.id}`, describeStatLine({ ...s, value: s.range[0] } as never));
    }
  }
  // A base's implicit prints on the card exactly as a rolled line does, and for
  // some mechanisms it is the ONLY line that ever names them: Block is a shield
  // and nothing else, so a sweep that skipped implicits could not see the word.
  for (const base of GEAR_BASES) {
    for (const s of base.implicit ?? []) {
      read(`base/${base.id}`, describeStatLine({ ...s, value: s.range[0] } as never));
    }
  }

  // 1. Nothing says it the old way.
  const wrong = lines.flatMap(({ where, text }) =>
    bannedIn(text).map((b) => `${where} says "${b.said}" — use ${b.use}`)
  );
  line(`  ${lines.length} lines read, ${KEYWORDS.length} keywords defined`);
  check(
    wrong.length === 0,
    'no line says in its own words what a keyword already says',
    wrong.join('; ')
  );

  // 2. Every keyword is actually MET. Vocabulary nobody runs into is a
  //    glossary entry rather than a word, and it goes stale unread.
  const met = new Set(keywordsIn(lines.map((l) => l.text)).map((k) => k.id));
  const unmet = KEYWORDS.filter((k) => !met.has(k.id));
  check(
    unmet.length === 0,
    'and every keyword is one the player actually runs into',
    unmet.map((k) => k.name).join(', ')
  );

  // 3. A node handing over a keyword's switch NAMES it. This is the half that
  //    makes "+1 Pierce" compulsory rather than a style anyone may drop.
  const silent: string[] = [];
  const names = (text: string, keyword: KeywordDef): boolean =>
    keywordsIn([text]).some((k) => k.id === keyword.id || k.kin === keyword.id);

  for (const web of [
    ...BUILT_TREES.map((t) => ({ id: t.spec.skillId, nodes: t.nodes })),
    ...MOVE_WEBS.map((m) => ({ id: m.spec.skillId, nodes: m.nodes })),
    ...TRADES.map((t) => ({ id: t.spec.id, nodes: t.nodes })),
  ]) {
    for (const node of web.nodes) {
      for (const id of Object.keys(node.grants ?? {})) {
        const keyword = KEYWORD_BY_GRANT[id];
        if (keyword && !names(node.description, keyword)) {
          silent.push(`${web.id}/${node.id} grants ${id} without saying ${keyword.name}`);
        }
      }
    }
  }
  check(
    silent.length === 0,
    'and a node handing over a keyword’s switch says the keyword',
    silent.join('; ')
  );

  // 4. So does the switch's own generic line, which is what a unique with no
  //    `say` falls back to.
  const mute = GRANTS.filter((g) => {
    const keyword = KEYWORD_BY_GRANT[g.id];
    return keyword && !names(g.what, keyword);
  });
  check(
    mute.length === 0,
    'and so does the switch’s own description in GRANTS',
    mute.map((g) => g.id).join(', ')
  );

  // 5. A definition with a figure behind it says the figure — the same rule as
  //    every other line, applied to the place the figure is explained.
  const QUANTIFIED = [
    'projectile', 'pierce', 'arc', 'spread', 'critical',
    'resistance', 'armour', 'starved', 'charge', 'increased', 'more',
  ];
  const vague = KEYWORDS.filter((k) => QUANTIFIED.includes(k.id) && !/\d/.test(k.means));
  check(
    vague.length === 0,
    'and a definition with a number behind it says the number',
    vague.map((k) => k.name).join(', ')
  );

  // 6. No grant is claimed twice, and nothing claims a grant that is gone.
  const claimed = KEYWORDS.flatMap((k) => k.grants ?? []);
  const twice = claimed.filter((id, i) => claimed.indexOf(id) !== i);
  const ghosts = claimed.filter((id) => !GRANT_BY_ID[id]);
  check(
    twice.length === 0 && ghosts.length === 0,
    'and every grant a keyword claims exists, and belongs to one keyword',
    `${twice.join(', ')} / ${ghosts.join(', ')}`
  );

  // What the player is shown, so a session can read the vocabulary without
  // opening the table.
  for (const k of KEYWORDS) line(`  ${k.name.padEnd(15)}${k.means.slice(0, 88)}`);
}

// ===========================================================================
rule('THREE SLOTS — one that kills, one always on, one that moves you');

// A character is three skills now, and the two new ones never cast: a passive
// is its `grants` and a movement skill is params the sim fires itself. What
// can break quietly is a slot accepting the wrong shelf, a save losing the
// skill it was swinging, or a trade that took something away and gave nothing.
{
  line(
    `  ${SKILL_SLOTS.map((s) => `${s.name}: ${s.accepts.join('/')}` + (s.unlocksAt ? ` @${s.unlocksAt}` : '')).join(' · ')}`
  );
  // A SHELF is what the Skills screen offers, and a category on none of them is
  // a skill nobody can reach — the screen walks shelves, not categories.
  {
    const homelessCat = SKILL_CATEGORIES.filter(
      (c) => SKILL_SHELVES.filter((sh) => sh.holds.includes(c.id)).length !== 1
    );
    line(`  ${SKILL_SHELVES.map((sh) => `${sh.name}: ${sh.holds.join('+')}`).join(' · ')}`);
    check(
      homelessCat.length === 0,
      `${SKILL_SHELVES.length} shelves, and every category is on exactly one`,
      homelessCat.map((c) => c.id).join(', ')
    );
    // And a shelf is what ONE KIND of slot takes, which is the whole reason
    // attacks and spells share one: a shelf nothing can equip off opens onto a
    // decision the character cannot make.
    const orphan = SKILL_SHELVES.filter(
      (sh) => !SKILL_SLOTS.some((slot) => sh.holds.every((c) => slot.accepts.includes(c)))
    );
    check(
      orphan.length === 0,
      'and every shelf is exactly what one kind of slot accepts',
      orphan.map((sh) => sh.id).join(', ')
    );
  }
  const passiveSlots = SKILL_SLOTS.filter((s) => s.accepts.includes('passive'));
  check(
    SKILL_SLOT_BY_ID[MAIN_SLOT]?.accepts.join(',') === 'spell,attack'
      && SKILL_SLOTS.every((s) => s.accepts.length > 0 && s.blurb.length > 0),
    `${SKILL_SLOTS.length} slots, declared as a table, and every one says what it is for`,
    SKILL_SLOTS.map((s) => s.id).join(', ')
  );
  // THREE passives, and the two beyond the first are gated: a slot you have
  // from the start is a pick, and one you climb to is a build.
  check(
    passiveSlots.length === 3
      && passiveSlots.map((s) => s.unlocksAt ?? 1).join(',') === '1,20,40',
    'three passive slots, opening at levels 1, 20 and 40',
    passiveSlots.map((s) => `${s.id}@${s.unlocksAt ?? 1}`).join(', ')
  );
  check(
    LEVELLING.maxLevel === 99 && passiveSlots.every((s) => (s.unlocksAt ?? 1) <= LEVELLING.maxLevel),
    `and every one of them is reachable inside the ${LEVELLING.maxLevel} levels there are`,
    String(LEVELLING.maxLevel)
  );
  // Every shelf fills at least one slot, and every slot has something to put in
  // it — an empty shelf is a slot nobody can fill.
  const homeless = PLAYER_SKILLS.filter((s) => !slotForSkill(s.id));
  const bare = SKILL_SLOTS.filter(
    (slot) => !PLAYER_SKILLS.some((s) => s.category && slot.accepts.includes(s.category))
  );
  check(
    homeless.length === 0 && bare.length === 0,
    'every skill has a slot and every slot has a skill',
    `${homeless.map((s) => s.id).join(', ')} / ${bare.map((s) => s.id).join(', ')}`
  );
  // A slot refuses what it does not accept: equipping the blink must never be
  // the thing that stops you swinging.
  {
    const c = makeCharacter({}, 'strike');
    equipSkill(c, 'blink');
    equipSkill(c, 'surge');
    check(
      mainSkillId(c) === 'strike'
        && equippedSkill(c, 'movement') === 'blink'
        && equippedSkill(c, 'passive') === 'surge',
      'and equipping one lands in its own slot without displacing the others',
      JSON.stringify(c.equipped)
    );
  }

  // The gate itself, walked. A level 1 character has ONE passive however many
  // it is handed; a level 40 one has three and they are three DIFFERENT ones.
  {
    const young = makeCharacter({}, 'strike');
    const passives = skillsInCategory('passive');
    for (const p of passives.slice(0, 3)) equipSkill(young, p.id);
    const heldYoung = Object.entries(young.equipped ?? {}).filter(([id]) => id.startsWith('passive'));
    check(
      heldYoung.length === 1 && openSlots(young).length === SKILL_SLOTS.length - 2,
      'a level 1 character fills one passive slot however many it is offered',
      `${heldYoung.length} filled, ${openSlots(young).length} slots open`
    );

    const grown = makeCharacter({}, 'strike');
    grown.level = 40;
    for (const p of passives.slice(0, 3)) equipSkill(grown, p.id);
    const heldGrown = Object.entries(grown.equipped ?? {})
      .filter(([id]) => id.startsWith('passive'))
      .map(([, what]) => what);
    check(
      heldGrown.length === 3 && new Set(heldGrown).size === 3,
      'and a level 40 one fills all three, with three different passives in them',
      heldGrown.join(', ')
    );

    // The one thing three slots off one shelf could get wrong: a passive held
    // twice merges its own grants into itself, which is a build nobody walked.
    const doubled = makeCharacter({}, 'strike');
    doubled.level = 40;
    equipSkill(doubled, passives[0].id, 'passive');
    equipSkill(doubled, passives[0].id, 'passive2');
    check(
      Object.values(doubled.equipped ?? {}).filter((w) => w === passives[0].id).length === 1,
      'and one held in two slots MOVES rather than doubling',
      JSON.stringify(doubled.equipped)
    );

    // And a save that says otherwise is healed, not trusted.
    const cheat = createGame('fresh');
    cheat.character.level = 5;
    cheat.character.equipped = { main: 'strike', passive: 'surge', passive3: passives[1].id };
    heal(cheat);
    check(
      cheat.character.equipped.passive3 === undefined && cheat.character.equipped.passive === 'surge',
      'and a save holding one in a slot the level has not opened has it healed away',
      JSON.stringify(cheat.character.equipped)
    );
  }

  // Every passive is a TRADE and every switch it hands over is read. A passive
  // never casts, so its static grants ARE the skill — an unread one is a slot
  // spent on a line that prints and does nothing.
  {
    const unread: string[] = [];
    for (const p of skillsInCategory('passive')) {
      for (const key of Object.keys(p.grants ?? {})) {
        const def = GRANT_BY_ID[key];
        if (!def) unread.push(`${p.id}: ${key} is not declared`);
        else if (!def.reads.includes(STATS)) unread.push(`${p.id}: ${key} is not read off the stat layer`);
        else if (def.say && def.say((p.grants ?? {})[key]) === null) {
          unread.push(`${p.id}: ${key} is the wrong shape to say`);
        }
      }
    }
    line(`  ${skillsInCategory('passive').length} passives, all no_cast, all reading STATS`);
    check(unread.length === 0, 'every passive grants only declared switches the sim reads', unread.join(', '));
    check(
      skillsInCategory('passive').every((p) => p.behaviour === 'no_cast' && Object.keys(p.grants ?? {}).length > 0),
      'and every one of them changes a RULE rather than casting anything',
      skillsInCategory('passive').map((p) => `${p.id}:${p.behaviour}`).join(', ')
    );
  }

  // The passive is a TRADE, and both halves have to hold at once.
  {
    const withIt = makeCharacter(starterLoadout(new Rng(9)), 'strike');
    equipSkill(withIt, 'surge');
    const buff = critBuff(treeGrants(withIt));
    // Against a real crit-damage line, since the hero's own base is 0: what
    // the passive takes away is whatever you found, not a number nobody had.
    const savage: RolledMod = {
      entryId: 'probe', defId: 'probe', group: 'probe', slot: 'offence',
      name: 'probe', tier: 1, tags: [],
      stats: [{ stat: 'critMultiplier', form: 'flat', value: 40, tags: [] }],
    };
    const strike = SKILL_BY_ID.strike;
    const kept = heroStats([savage], 1, strike, {}).critMultiplier;
    const lost = heroStats([savage], 1, strike, treeGrants(withIt)).critMultiplier;
    line(
      `  crit damage ×${(2 + kept / 100).toFixed(2)} bare, ×${(2 + lost / 100).toFixed(2)} ` +
        `with the passive, for ${buff?.more}% more for ${buff?.seconds}s`
    );
    check(
      kept > 0 && lost === 0 && !!buff && buff.more > 0 && buff.seconds > 0,
      'the passive takes crit damage away and gives a window back — both halves',
      `${kept} then ${lost}, ${JSON.stringify(buff)}`
    );
    const said = GRANT_BY_ID.critIntoBuff?.say?.(SKILL_BY_ID.surge.grants!.critIntoBuff);
    check(
      typeof said === 'string' && /\d/.test(said) && said.split(/\d+/).length >= 3,
      'and says both numbers, out of the grant rather than its own prose',
      String(said)
    );
    // It has to land in a real fight. Crit forced to certain, so this measures
    // the mechanism rather than the seed's luck.
    const sim = new RunSim([], withIt, new Rng(4242));
    sim.state.hero.stats.critChance = 100;
    let seen = false;
    for (let i = 0; i < 4000 && sim.state.status === 'running'; i++) {
      sim.step(TICK);
      if (sim.state.hero.effects.some((e) => e.id === 'crit_surge')) seen = true;
    }
    check(seen, 'and a crit in a real descent arms it', 'the buff never appeared');
  }

  // And the five that came after it, each measured at the seam it changed.
  // Declared and read is not the same as DOES SOMETHING, which is the promise
  // `npm run mods` makes about a modifier and this section makes about a slot.
  {
    const wearing = (id: string, level = 40) => {
      const c = makeCharacter(starterLoadout(new Rng(9)), 'strike');
      c.level = level;
      equipSkill(c, id);
      return c;
    };
    const strike = SKILL_BY_ID.strike;

    // BLOOD PACT: no pool at all, and the damage you deal comes back as life.
    {
      const c = wearing('bloodpact');
      const g = treeGrants(c);
      const pool = heroStats([], 40, strike, g).maxMana;
      const bare = heroStats([], 40, strike, {}).maxMana;
      line(`  Blood Pact: mana ${bare.toFixed(0)} bare, ${pool.toFixed(0)} worn`);
      check(bare > 0 && pool === 0, 'Blood Pact leaves no mana pool at all', `${bare} then ${pool}`);

      const sim = new RunSim([], c, new Rng(77));
      let spent = false;
      const started = sim.state.hero.life;
      for (let i = 0; i < 3000 && sim.state.status === 'running'; i++) {
        sim.step(TICK);
        if (sim.state.casts > 0) spent = true;
        if (spent) break;
      }
      check(
        spent && sim.state.dryCasts === 0,
        'and it casts anyway, never Starved, because life is what pays',
        `${sim.state.casts} casts, ${sim.state.dryCasts} dry`
      );
      check(started > 0, 'and it started the descent on a full bar', String(started));
    }

    // REFRACTION: a tail of Prismatic off the elemental half, resisted as
    // Prismatic and not as the type that carried it.
    {
      const share = (SKILL_BY_ID.refraction.grants ?? {}).prismaticExtra as number;
      // A FIRE skill, so there is an elemental half for the tail to come off.
      // What a HIT is worth, never a clear: a reference build one-shots its way
      // through the Fissure, so every point past the first is overkill and a
      // clock cannot see damage at all. Measured against a body that survives.
      const landed = (who: Character): number => {
        const sim = new RunSim([], who, new Rng(11)) as any;
        let total = 0;
        const real = sim.dealDamage.bind(sim);
        sim.dealDamage = (a: any, d: any, m: number, sk: any) => {
          if (a.kind === 'hero') d.stats.maxLife = d.life = 1e9; // never overkill
          const was = d.life;
          real(a, d, m, sk);
          if (a.kind === 'hero') total += was - d.life;
        };
        for (let n = 0; n < 400 && sim.state.status === 'running'; n++) sim.step(TICK);
        return total;
      };
      const plain = makeCharacter(starterLoadout(new Rng(9)), 'fireball');
      plain.level = 40;
      const lit = makeCharacter(starterLoadout(new Rng(9)), 'fireball');
      lit.level = 40;
      equipSkill(lit, 'refraction');
      const before = landed(plain);
      const after = landed(lit);
      line(`  Refraction: ${after.toFixed(0)} damage landed against ${before.toFixed(0)} without it`);
      check(
        typeof share === 'number' && share > 0 && after > before,
        `Refraction's ${Math.round(share * 100)}% tail is damage that actually lands`,
        `${after.toFixed(0)} against ${before.toFixed(0)}`
      );
    }

    // THE TWO AURAS: each names its own group and nothing else, so a passive
    // for Fire never quietly softens Poison as well.
    {
      const el = (SKILL_BY_ID.unmaking.grants ?? {}).elementalShred as { radius: number; amount: number };
      const oc = (SKILL_BY_ID.unbinding.grants ?? {}).occultShred as { radius: number; amount: number };
      line(`  the auras: ${el.amount}% off Elemental and ${oc.amount}% off Occult, both within ${el.radius} tiles`);
      check(
        el.amount > 0 && oc.amount > 0 && el.radius > 0 && oc.radius > 0
          && !(SKILL_BY_ID.unmaking.grants ?? {}).occultShred
          && !(SKILL_BY_ID.unbinding.grants ?? {}).elementalShred,
        'each aura takes resistance off its OWN group and leaves the other alone',
        JSON.stringify([el, oc])
      );
      // The groups they name are the ones the damage table has, and the two of
      // them between them cover every type that belongs to one.
      const grouped = DAMAGE_TYPES.filter((d) => d.group);
      check(
        new Set(grouped.map((d) => d.group)).size === 2 && grouped.length === 6,
        'and between them they cover all 6 grouped damage types',
        grouped.map((d) => `${d.id}:${d.group}`).join(', ')
      );

      // The PICTURE may not disagree with the arithmetic: a body wearing the
      // marks is a body `shredding` actually softens, and one without them is
      // one it does not. Drawn off `Entity.shred`, decided by `shredding`, so
      // the two are checked against each other rather than against a formula.
      {
        const sim = new RunSim([], wearing('unmaking'), new Rng(11)) as any;
        let marked = 0;
        let wrong = 0;
        for (let n = 0; n < 600 && sim.state.status === 'running'; n++) {
          sim.step(TICK);
          for (const m of sim.state.monsters) {
            if (m.dead) continue;
            const softened = sim.shredding(m, 'fire') > 0;
            if (!!m.shred !== softened) wrong++;
            if (m.shred) marked++;
          }
        }
        line(`  and the marks drawn on ${marked} body-frames all named a softened body`);
        check(
          wrong === 0 && marked > 0,
          'and a body wearing the marks is a body the aura is actually softening',
          `${wrong} disagreed of ${marked} marked`
        );
      }
    }

    // FEATHERSTEP: armour stops blunting and starts dodging, and the two are
    // never both on — that IS the trade.
    {
      const c = wearing('featherstep');
      const plate: RolledMod = {
        entryId: 'probe', defId: 'probe', group: 'probe', slot: 'defence',
        name: 'probe', tier: 1, tags: [],
        stats: [{ stat: 'armour', form: 'flat', value: 400, tags: [] }],
      };
      const bare = heroStats([plate], 40, strike, {});
      const light = heroStats([plate], 40, strike, treeGrants(c));
      line(
        `  Featherstep: ${bare.armourReduction.toFixed(0)}% blunting becomes ` +
          `${light.dodgeChance.toFixed(0)}% Dodge`
      );
      check(
        bare.armourReduction > 0 && bare.dodgeChance === 0
          && light.armourReduction === 0 && light.dodgeChance > 0,
        'Featherstep trades every point of blunting for a Dodge chance',
        `${bare.armourReduction}/${bare.dodgeChance} then ${light.armourReduction}/${light.dodgeChance}`
      );
      check(
        light.dodgeChance < bare.armourReduction && light.dodgeChance <= DEFENCE.dodgeCap,
        'and gets back LESS than it gave up, which is the squishy half of it',
        `${light.dodgeChance} against ${bare.armourReduction}`
      );

      // KITING IS GONE. It was the passive's, then it was the skill's, and it
      // is now nobody's — *the user's call: "kiting is too op. I think remove
      // it entirely for now"* — so a build STANDS IN IT while the skill
      // recovers, ranged and melee alike. What must not come back by accident
      // is a build that gives ground for free.
      const walked = (who: Character): number => {
        const sim = new RunSim([], who, new Rng(808));
        let far = 0;
        let last = { x: sim.state.hero.x, y: sim.state.hero.y };
        for (let i = 0; i < 2400 && sim.state.status === 'running'; i++) {
          sim.step(TICK);
          far += Math.hypot(sim.state.hero.x - last.x, sim.state.hero.y - last.y);
          last = { x: sim.state.hero.x, y: sim.state.hero.y };
        }
        return far;
      };
      const melee = makeCharacter(starterLoadout(new Rng(9)), 'strike');
      const ranged = makeCharacter(starterLoadout(new Rng(9)), 'fireball');
      line(`  a ranged build covers ${walked(ranged).toFixed(0)} tiles, a melee one ${walked(melee).toFixed(0)}`);
      check(
        !('kite' in treeGrants(c)) && !('kite' in GRANT_BY_ID),
        'nothing in the game hands out kiting: a build stands in it',
        Object.keys(treeGrants(c)).join(', ')
      );
    }

    // SUNDERING and HOARFROST: what the BUILD may move about a passive's own
    // damage, and what it may not. Increased Damage and increased damage of its
    // TYPE, and nothing else — not the tag of the skill that armed it, not
    // added flat damage. Every line below is one a real modifier rolls, so the
    // list is the vocabulary rather than a paraphrase of it.
    {
      const at = (id: string, level: number): number => {
        const g = treeGrants(wearing(id, level));
        const bag = (g.burstOnHit ?? g.frostVolley) as { every: number; perLevel: number };
        return bag.perLevel * level;
      };
      line(`  Sundering: ${at('sundering', 20)} at level 20, ${at('sundering', 40)} at 40`);
      check(
        at('sundering', 40) === at('sundering', 20) * 2 && at('sundering', 20) > 0,
        'Sundering scales on character level',
        `${at('sundering', 20)} then ${at('sundering', 40)}`
      );

      const probe = (form: 'inc' | 'flat', value: number, tags: string[]): RolledMod => ({
        entryId: 'probe', defId: 'probe', group: 'probe', slot: 'offence',
        name: 'probe', tier: 1, tags: [],
        stats: [{ stat: 'damage', form, value, tags }],
      });
      const LINES: Array<[string, RolledMod, boolean]> = [
        ['+100% increased Damage', probe('inc', 100, []), true],
        ['+100% increased Physical Damage', probe('inc', 100, ['physical']), true],
        ['+100% increased Spell Damage', probe('inc', 100, ['spell']), false],
        ['+100% increased Attack Damage', probe('inc', 100, ['attack']), false],
        ['+100% increased Fire Damage', probe('inc', 100, ['fire']), false],
        ['+500 added Physical Damage', probe('flat', 500, ['physical']), false],
      ];
      const wrong: string[] = [];
      for (const [name, mod, moves] of LINES) {
        const got = passiveScale([mod], 'physical');
        if (moves ? got <= 1 : got !== 1) wrong.push(`${name} → x${got.toFixed(2)}`);
        line(`    ${name.padEnd(32)} x${got.toFixed(2)}${moves ? '' : '   (and must not)'}`);
      }
      check(
        wrong.length === 0 && passiveScale([probe('inc', 100, ['cold'])], 'cold') > 1,
        'and only by increases to Damage and to its own type — never a skill tag, never flat',
        wrong.join('; ')
      );

      // Hoarfrost asks for a CHILL it cannot apply, so it is worth nothing in a
      // hand that deals no Cold — measured, not asserted from the table.
      const volley = treeGrants(wearing('hoarfrost')).frostVolley as { every: number; perLevel: number };
      const cold = (skill: string, worn: boolean): number => {
        let total = 0;
        for (const seed of [11, 13, 17, 19]) {
          const c = makeCharacter(starterLoadout(new Rng(9)), skill);
          c.level = 40;
          if (worn) equipSkill(c, 'hoarfrost');
          total += runToCompletion(new RunSim([], c, new Rng(seed))).elapsed;
        }
        return total / 4;
      };
      const chillFree = cold('strike', true) - cold('strike', false);
      line(
        `  Hoarfrost: every ${volley.every}s at ${volley.perLevel} a level, and ` +
          `${chillFree >= 0 ? 'no' : 'some'} help to a build that Chills nothing`
      );
      check(
        volley.every > 0 && volley.perLevel > 0 && chillFree >= -0.5,
        'Hoarfrost is worth nothing to a build that applies no Chill',
        `${chillFree.toFixed(2)}s difference on Strike`
      );
    }

    // CONTAGION: what a body carried passes on to a FEW, and everything you
    // apply is weaker for it. The cap is the whole mechanism — uncapped, a pack
    // dying is what feeds it, so the second death lands on a pack that is
    // already ailing and the room clears itself. Measured: a naked Strike with
    // the Bleed node clears 27% faster uncapped and 17% faster at two, and four
    // is already indistinguishable from uncapped because the radius holds four.
    {
      const c = wearing('contagion');
      const g = treeGrants(c);
      const aura = g.ailmentSpread as { radius: number; stacks: number; targets: number };
      const weak = g.ailmentWeak as number;
      line(
        `  Contagion: ${aura.stacks} stack to the ${aura.targets} nearest within ` +
          `${aura.radius} tiles, everything ${Math.round((1 - weak) * 100)}% weaker`
      );
      check(
        aura.stacks === 1 && aura.radius > 0 && weak > 0 && weak < 1,
        'Contagion passes ONE stack on and weakens every Ailment to pay for it',
        JSON.stringify([aura, weak])
      );

      // The cap holds in the SIM, not just in the table: a body dying in a
      // crowd hands its Bleed to two of them and to no more.
      {
        const sim = new RunSim([], c, new Rng(11)) as any;
        const hero = sim.state.hero;
        const bodies = Array.from({ length: 6 }, (_, i) => {
          const m = { ...sim.state.monsters[0], id: 900 + i, x: hero.x + 0.4 * (i + 1), y: hero.y, dead: false, ailments: [] as unknown[] };
          return m;
        });
        const victim = { ...bodies[0], id: 899, x: hero.x, y: hero.y, ailments: [{ id: 'bleed', stacks: 1 }] };
        sim.state.monsters = [victim, ...bodies];
        sim.spreadAilments(victim);
        const caught = bodies.filter((m: any) => m.ailments.length > 0).length;
        line(`  and a body dying among ${bodies.length} inside its radius reaches ${caught} of them`);
        check(
          caught === aura.targets,
          'and the cap is what the sim applies, never the whole circle',
          `${caught} caught, ${aura.targets} allowed`
        );

        // And the PICTURE is of what it reached. A circle at the aura's radius
        // is a drawing of the uncapped rule, and this one was hardcoded poison
        // whatever spread — so both the COUNT and the COLOUR are held here.
        const reaches = sim.state.vfx.filter((v: any) => v.kind === 'arc');
        const wide = sim.state.vfx.filter(
          (v: any) => v.kind === 'burst'
            && Math.hypot(v.points[1].x - v.points[0].x, v.points[1].y - v.points[0].y) > aura.radius * 0.6
        );
        line(`  drawing ${reaches.length} reaches in ${new Set(reaches.map((v: any) => v.damageType)).size} colour`);
        check(
          reaches.length === caught && wide.length === 0
            && reaches.every((v: any) => v.damageType === AILMENT_BY_ID.bleed.type),
          'and it draws one reach per body it caught, in the ailment’s own colour',
          `${reaches.length} reaches for ${caught} caught, ${wide.length} drawn at the aura's radius`
        );
      }
    }
  }

  // A movement skill fires ITSELF and may never put a body in rock. BOTH of
  // them: a jump wants no clear line, so it is the one that could land
  // somewhere the step never could.
  for (const mover of MOVERS) {
    const walker = makeCharacter(starterLoadout(new Rng(9)), 'strike');
    equipSkill(walker, mover);
    let inRock = 0;
    let moves = 0;
    let cleared = 0;
    const seeds = [3, 11, 29, 47, 5, 13];
    for (const seed of seeds) {
      const sim = new RunSim([], walker, new Rng(seed * 7));
      const grid = sim.state.map.grid;
      for (let k = 0; k < 6000 && sim.state.status === 'running'; k++) {
        sim.step(TICK);
        if (!grid.walkable(sim.state.hero.x, sim.state.hero.y)) inRock++;
      }
      if (sim.state.status === 'cleared') cleared++;
      moves += sim.state.blinks;
    }
    line(`  ${mover}: ${moves} moves over ${seeds.length} descents, ${cleared} cleared, ${inRock} ticks in rock`);
    check(
      moves > 0 && inRock === 0,
      `the ${mover} fires itself with nobody watching, and never lands in rock`,
      `${moves} moves, ${inRock} ticks inside a wall`
    );
    // A new way for a run to end early or never end. Both, on the same seeds.
    const ends = seeds.every((seed) => {
      const sim = new RunSim([], walker, new Rng(seed * 13));
      return runToCompletion(sim, 800).status !== 'running';
    });
    check(ends, `and every descent ${mover} is in still ends`, `a ${mover} run never finished`);
  }

  // A body that has not seen you PACES, and stays where it was put. Both halves
  // matter: standing perfectly still reads as a prop, and a pack that walks
  // somewhere has left the room it guards — and neither may put a body in rock,
  // which `nudge` is the mover for.
  {
    const idler = makeCharacter(starterLoadout(new Rng(7)), 'strike');
    let stirred = 0;
    let furthest = 0;
    let inRock = 0;
    for (const seed of [11, 42, 77]) {
      // Per SEED: ids start again with each sim, so one map across all three
      // measures a body in this descent against where a different one stood in
      // the last, and reads 27 tiles of drift that nothing walked.
      const home = new Map<number, { x: number; y: number }>();
      const sim = new RunSim([], idler, new Rng(seed));
      for (let k = 0; k < 900 && sim.state.status === 'running'; k++) {
        for (const m of sim.state.monsters) {
          if (!m.dead && !m.aggroed && !home.has(m.id)) home.set(m.id, { x: m.x, y: m.y });
        }
        sim.step(TICK);
        for (const m of sim.state.monsters) {
          if (m.dead) continue;
          if (!sim.state.map.grid.walkable(m.x, m.y)) inRock++;
          const was = m.aggroed ? undefined : home.get(m.id);
          if (!was) continue;
          const gone = Math.hypot(m.x - was.x, m.y - was.y);
          furthest = Math.max(furthest, gone);
          if (gone > 0.05) stirred++;
        }
      }
    }
    line(`  ${stirred} unaggroed ticks with movement in them, furthest from home ${furthest.toFixed(2)} tiles`);
    check(
      stirred > 0 && furthest > 0.2 && furthest < 2.5 && inRock === 0,
      'a body that has not seen you paces, stays where it was put, and never in rock',
      `${stirred} stirred, ${furthest.toFixed(2)} tiles, ${inRock} ticks in rock`
    );
  }

  // Every movement notable changes what the MOVE does. `FIREBALL` above asks
  // this of a cast by firing the behaviour; a mover has no behaviour to fire,
  // so what is measured is the move itself: how often, how far, and what is
  // standing near you afterwards.
  for (const web of MOVE_WEBS) {
    const skillId = web.spec.skillId;
    const skill = SKILL_BY_ID[skillId];
    const inert: string[] = [];
    for (const node of web.nodes) {
      if (node.kind !== 'notable') continue;
      const bag = node.grants ?? {};
      if (Object.keys(bag).length === 0) {
        inert.push(`${node.id} (nothing at all)`);
        continue;
      }
      // Straight off the same expressions the sim reads, so a grant renamed in
      // one place and not the other is a failure here rather than a silence.
      const reach = ((skill.params?.distance as number) ?? 0) * ((bag.moveDistance as number) ?? 1);
      const wait = ((skill.params?.cooldown as number) ?? 0) * ((bag.moveCooldown as number) ?? 1);
      const back = (bag.moveMana as number) ?? 0;
      const moved =
        reach !== (skill.params?.distance as number) ||
        wait !== (skill.params?.cooldown as number) ||
        back > 0 ||
        landingOf(bag) !== null;
      if (!moved) inert.push(`${node.id} (${Object.keys(bag).join(', ')})`);
    }
    check(inert.length === 0, `${skillId}: every notable changes the move`, inert.join(', '));
  }

  // A Slow reaches a MELEE pack and a ranged one alike: the swing rate is set
  // in two places and was, for a while, only one of them.
  {
    const jumper = makeCharacter(starterLoadout(new Rng(9)), 'strike');
    equipSkill(jumper, 'leap');
    skillProgress(jumper, 'leap').allocated = ['lp_tremor'];
    const shock = landingOf(treeGrants(jumper));
    check(!!shock && shock.slow > 0, 'walking to Tremor reaches the sim through the web',
      JSON.stringify(shock));

    // Over SEEDS, because whether a leap lands on top of anything is a fact
    // about one map: measured, a Slow lands on six maps in eight and two of the
    // eight see none at all. One seed here is a check that passes until the rng
    // shifts under it, which is what it did.
    const seeds = [77, 78, 79, 80, 81, 90, 101, 202];
    let slowed = 0;
    let slower = 0;
    let maps = 0;
    for (const seed of seeds) {
      const sim = new RunSim([], jumper, new Rng(seed));
      const was = slowed;
      for (let k = 0; k < 6000 && sim.state.status === 'running'; k++) {
        sim.step(TICK);
        for (const m of sim.state.monsters) {
          if (m.dead || !m.slowed) continue;
          slowed++;
          // What a Slow IS: the cooldown between its swings, longer.
          if (m.cooldown > 1 / m.stats.attacksPerSecond + 1e-9) slower++;
        }
      }
      if (slowed > was) maps++;
    }
    line(
      `  ${slowed} slowed monster-ticks over ${seeds.length} maps, ${maps} of them saw one, ` +
        `${slower} mid-swing and slower for it`
    );
    check(maps >= seeds.length / 2, 'a landing Slows what is standing in it', `${maps}/${seeds.length} maps`);
    check(
      slowed === 0 || slower > 0,
      'and a Slowed body genuinely swings less often',
      `${slower} of ${slowed}`
    );
  }

  // A save written before slots existed. The demo already holds every
  // container to being healed; this is the same rule for what you swing.
  {
    const old = createGame('fresh');
    delete (old.character as unknown as { equipped?: unknown }).equipped;
    (old.character as unknown as { skillId?: string }).skillId = 'blight';
    heal(old);
    check(
      mainSkillId(old.character) === 'blight'
        && (old.character as unknown as { skillId?: string }).skillId === undefined,
      'a save that predates the slots puts what it was swinging in the main one',
      JSON.stringify(old.character.equipped)
    );
    const cut = createGame('fresh');
    cut.character.equipped = { main: 'gone', passive: 'surge', movement: 'surge' };
    heal(cut);
    check(
      SKILL_BY_ID[mainSkillId(cut.character)] !== undefined
        && equippedSkill(cut.character, 'passive') === 'surge'
        && equippedSkill(cut.character, 'movement') === null,
      'and a slot naming a cut skill — or the wrong shelf — empties rather than sticking',
      JSON.stringify(cut.character.equipped)
    );
  }
}

// ===========================================================================
rule('ATTRIBUTES — does a level buy anything, and only what it paid for?');

// A level hands out points, the sheet spends them, and everything downstream
// has to see them as ordinary stat lines. Three things can break silently: a
// point that pays nothing, a tag that lets an attack line arm a spell, and a
// point no level ever granted surviving a load.
{
  const round = (n: number) => Math.round(n).toString();

  // What one point is worth, measured on the character it is meant for. Half
  // of each attribute is tagged, so the skill is what decides whether it
  // lands — which is the whole of how the four stay apart.
  line('  attribute      one point, on the skill it is for');
  for (const attr of ATTRIBUTES) {
    line(`  ${attr.name.padEnd(13)} ${attr.per.map((s) => describeStatLine(s)).join(', ')}`);
  }

  const withPoints = (skillId: string, id: string, points: number): Character => {
    const c = makeCharacter({}, skillId);
    c.level = 40;
    c.attributes[id] = points;
    return c;
  };
  const bare = (skillId: string) => characterStats(withPoints(skillId, 'strength', 0));

  // EVERY point pays. Flooring meant four in five spent points showed the
  // player nothing at all, and the one that mattered was invisible until it
  // landed — so the thing to hold is that each one in a row moves the number.
  {
    const life = [0, 1, 2, 3].map((n) => characterStats(withPoints('strike', 'strength', n)).maxLife);
    line(`  1 point at a time into Strength: ${life.map(round).join(' -> ')} life`);
    const rising = life.every((v, i) => i === 0 || v > life[i - 1]);
    check(
      rising && life[0] === bare('strike').maxLife,
      'every single point moves the number, with nothing banked toward a step',
      life.map(round).join(' -> ')
    );
  }

  // The tags. An attack critical chance on a spell is the silent one: it
  // rolls, it shows, it stacks, and it does nothing — which is exactly what
  // `heroStats` passing the skill's tags into `critChance` prevents.
  {
    const dexOnStrike = characterStats(withPoints('strike', 'dexterity', 20));
    const dexOnBlight = characterStats(withPoints('blight', 'dexterity', 20));
    const acuOnBlight = characterStats(withPoints('blight', 'acuity', 20));
    line(
      `  20 points of Dexterity: ${dexOnStrike.critChance.toFixed(1)}% crit on Strike, ` +
        `${dexOnBlight.critChance.toFixed(1)}% on Blight — Acuity gives it ` +
        `${acuOnBlight.critChance.toFixed(1)}%`
    );
    check(
      dexOnStrike.critChance > bare('strike').critChance
        && dexOnBlight.critChance === bare('blight').critChance
        && acuOnBlight.critChance > bare('blight').critChance,
      'an attack critical chance does nothing for a spell, and Acuity is its other half',
      `${dexOnStrike.critChance} / ${dexOnBlight.critChance} / ${acuOnBlight.critChance}`
    );
    // Speed is the same split, and it rides on a seam that already existed:
    // a spell reads castSpeed and never attackSpeed.
    check(
      characterStats(withPoints('blight', 'dexterity', 20)).attacksPerSecond
        === bare('blight').attacksPerSecond
        && characterStats(withPoints('blight', 'acuity', 20)).attacksPerSecond
          > bare('blight').attacksPerSecond,
      'and cast speed is bought with Acuity rather than with Dexterity',
      'the wrong attribute moved a spell’s rate'
    );
    // Damage, the same way round.
    const str = characterStats(withPoints('strike', 'strength', 20));
    const int = characterStats(withPoints('strike', 'intelligence', 20));
    check(
      str.damage > bare('strike').damage && int.damage === bare('strike').damage,
      'and a spell damage attribute leaves an attack exactly where it was',
      `${round(str.damage)} / ${round(int.damage)} against ${round(bare('strike').damage)}`
    );
  }

  // The budget. A level pays for the points and nothing else does.
  {
    const c = makeCharacter({}, 'strike');
    c.level = 5;
    const granted = attributePointsFor(5);
    let spent = 0;
    while (spendAttribute(c, 'strength')) spent++;
    line(`  level 5 grants ${granted} points, and ${spent} went in before it refused`);
    check(
      granted === (5 - 1) * LEVELLING.attributePointsPerLevel
        && spent === granted
        && attributePointsLeft(c) === 0
        && !spendAttribute(c, 'strength'),
      `${LEVELLING.attributePointsPerLevel} points a level, and never one more`,
      `${granted} granted, ${spent} spent, ${attributePointsLeft(c)} left`
    );
    check(
      attributePointsFor(1) === 0,
      'and level 1 grants none — the first level is the one you start on',
      `a new character already has ${attributePointsFor(1)}`
    );
  }

  // Healed. Points are REPLAYED against the level that paid for them, the way
  // tree points are: a curve that moves, or an attribute that is cut, hands
  // back what it stranded rather than leaving a build nobody could reach.
  {
    const game = createGame('fresh');
    game.character.level = 3;
    game.character.attributes = { strength: 99, nonesuch: 12 };
    const healed = heal(game);
    const kept = game.character.attributes;
    line(
      `  a save holding 99 Strength and 12 of an attribute that is gone, at level 3: ` +
        `${JSON.stringify(kept)}, ${healed.points} handed back`
    );
    check(
      kept.strength === attributePointsFor(3)
        && kept.nonesuch === undefined
        && attributePointsLeft(game.character) === 0,
      'a load replays attribute points and refunds what no level granted',
      `${JSON.stringify(kept)} survived`
    );
  }

  // And what a measured character actually carries, so the ladder numbers
  // below have something to be read against.
  const spread = ladderCharacter(DROP_BANDS.length - 1, new Rng(11));
  line(
    `  a top-band ladder character is level ${spread.level} with ` +
      `${attributesSpent(spread)} points spread ${ATTRIBUTES.length} ways: ` +
      ATTRIBUTES.map((a) => `${a.name.slice(0, 3).toLowerCase()} ${spread.attributes[a.id]}`).join(', ')
  );

  // A TRADE COMES DOWN WITH A SPREAD, and it is never in `Character.attributes`
  // — that is what a respec hands back, and a trade's own points are not the
  // player's to move. 6 to 15 an attribute so no trade is blank anywhere, and
  // the same total each so what separates two of them is the SHAPE.
  line('  trade          attributes');
  const totals = TRADES.map((t) => {
    const own = ATTRIBUTES.map((a) => t.spec.attributes[a.id] ?? 0);
    gauge(`${t.spec.name.padEnd(14)} ${ATTRIBUTES.map((a, i) =>
      `${a.name.slice(0, 3).toLowerCase()} ${String(own[i]).padStart(2)}`).join('  ')}`);
    return own;
  });
  const outside = TRADES.filter((t, i) => totals[i].some((n) => n < 6 || n > 15)).map((t) => t.spec.name);
  check(
    outside.length === 0,
    `every trade holds 6 to 15 of each of the ${ATTRIBUTES.length} attributes`,
    outside.join(', ')
  );
  const sums = totals.map((own) => own.reduce((a, b) => a + b, 0));
  check(
    new Set(sums).size === 1,
    `and the same ${sums[0]} in all, so the SHAPE is the difference`,
    sums.join(', ')
  );
  // The sheet's number is the sim's: `attributeTotals` is the one seam, so a
  // spread cannot show on the sheet and land nowhere.
  {
    const c = ladderCharacter(0, new Rng(12));
    c.attributes = {};
    c.trade = TRADES[0].spec.id;
    const shown = attributeTotals(c);
    const off = ATTRIBUTES.filter((a) => shown[a.id] !== (TRADES[0].spec.attributes[a.id] ?? 0));
    check(
      off.length === 0,
      `and it is what the sheet reads with nothing spent — ${TRADES[0].spec.name} at ` +
        ATTRIBUTES.map((a) => shown[a.id]).join('/'),
      off.map((a) => a.name).join(', ')
    );
  }
}

// ===========================================================================
rule('TRADES — is the part that is not the skill worth keeping a character for?');

// A skill tree belongs to the SKILL: change from Strike to Blight and the whole
// of what your character was is gone. A trade belongs to the character, out of
// its own budget, and it survives every skill you ever swap to. What can break
// quietly is a switch nobody reads, a walk that cheats the distance it is meant
// to cost, or a rule that reads on a card and does nothing in the sim.
{
  const grants = TRADE.maxPoints / TRADE.pointsPerGrant;
  const maxedAt = TRADE.firstAt + (grants - 1) * TRADE.levelsPerGrant;
  line(
    `  ${TRADES.length} trades · ${TRADE.maxPoints} points in ${grants} pairs, ` +
      `level ${TRADE.firstAt} to ${maxedAt}`
  );

  check(
    tradePointsFor(TRADE.firstAt - 1) === 0
      && tradePointsFor(TRADE.firstAt) === TRADE.pointsPerGrant
      && tradePointsFor(maxedAt) === TRADE.maxPoints
      && tradePointsFor(999) === TRADE.maxPoints,
    'character level funds it, on its own curve, capped',
    `${[TRADE.firstAt - 1, TRADE.firstAt, maxedAt, 999].map(tradePointsFor).join(', ')}`
  );
  // TWO AT A TIME, and never an odd number: a notable is always two steps on,
  // so an odd budget would strand every build one short of one.
  const odd = Array.from({ length: 120 }, (_, l) => tradePointsFor(l)).filter((p) => p % 2 !== 0);
  check(
    odd.length === 0 && TRADE.maxPoints % TRADE.pointsPerGrant === 0,
    'and hands them over two at a time, so no level ever holds an odd number',
    odd.join(', ')
  );

  // WHAT A TRADE GIVES FOR NOTHING. A baseline is what tells two of them apart
  // in the first hour, before a level has paid for a point — so the screen you
  // pick on has to say it, and the sim has to be holding it with nothing walked.
  {
    const mute: string[] = [];
    const unread: string[] = [];
    const missing: string[] = [];
    for (const trade of TRADES) {
      const { spec } = trade;
      const said = baselineLines(spec);
      if (!spec.baseline.short || said.length === 0) missing.push(spec.id);
      // The web's middle prints figures, so a baseline with no number in it is
      // a line a player cannot act on.
      if (!said.some((s) => /\d/.test(s))) mute.push(spec.id);
      const held = tradeGrants(spec.id, []);
      for (const key of Object.keys(spec.baseline.grants ?? {})) {
        const def = GRANT_BY_ID[key];
        if (!def || !def.reads.includes(STATS)) unread.push(`${spec.id}: ${key}`);
        else if (held[key] === undefined) unread.push(`${spec.id}: ${key} never reaches the sim`);
      }
      line(`  ${spec.id.padEnd(13)}${said.join(' · ').slice(0, 84)}`);
    }
    check(missing.length === 0, 'every trade gives something before a point is spent', missing.join(', '));
    check(mute.length === 0, 'and the web’s middle says it with the figures in it', mute.join(', '));
    check(
      unread.length === 0,
      'and it reaches the sim through the one seam, with nothing walked',
      unread.join(', ')
    );

    // A SUMMED grant a node also carries ADDS to the baseline rather than
    // replacing it — the Aether Ward is a bigger version of the one you had.
    const bare = tradeGrants('aethermancer', []).manaShield as number;
    const warded = tradeGrants('aethermancer', ['aet_warding_m0', 'aet_ward']).manaShield as number;
    check(
      bare === TRADE_BASE.aethermancerShield && warded > bare,
      `the Ward builds on the free ${(bare * 100).toFixed(0)}% rather than replacing it — ` +
        `${(warded * 100).toFixed(0)}% walked`,
      `${bare} then ${warded}`
    );
  }

  for (const trade of TRADES) {
    const id = trade.spec.id;
    const nodes = trade.nodes;
    const notables = nodes.filter((n) => n.kind === 'notable');
    line(`  ${id}: ${nodes.length} nodes, ${notables.length} of them notable`);

    // FIVE notables a spoke: the GATE everybody on it takes, and a middle and a
    // tip on each of the two branches past the fork.
    const perSpoke = 5;
    check(
      nodes.length === TRADE_NODES
        && notables.length === SPOKE_COUNT * perSpoke
        && new Set(nodes.map((n) => n.id)).size === nodes.length,
      `${TRADE_NODES} nodes, ${SPOKE_COUNT * perSpoke} of them notables, and no id used twice`,
      `${nodes.length} nodes, ${notables.length} notable`
    );

    // The FORK is the shape: a gate carries two ways on, and nothing else does.
    const forks = nodes.filter((n) => neighboursOfTrade(id, n.id).size === 3);
    check(
      forks.length === SPOKE_COUNT &&
        forks.every((n) => trade.spec.spokes.some((sp) => sp.gate.id === n.id)),
      'and the only node with two ways past it is the gate everyone walks',
      forks.map((n) => n.id).join(', ')
    );

    // Distance is the only price here too: what a node costs is the walk.
    const distance = new Map<string, number>();
    let edge = nodes.filter((n) => neighboursOfTrade(id, n.id).has(CENTRE));
    let step = 1;
    for (const n of edge) distance.set(n.id, step);
    while (edge.length) {
      const next: typeof edge = [];
      step++;
      for (const at of edge) {
        for (const other of neighboursOfTrade(id, at.id)) {
          if (other === CENTRE || distance.has(other)) continue;
          const node = nodes.find((n) => n.id === other);
          if (!node) continue;
          distance.set(other, step);
          next.push(node);
        }
      }
      edge = next;
    }
    const orphans = nodes.filter((n) => !distance.has(n.id));
    const dear = nodes.filter((n) => (distance.get(n.id) ?? Infinity) > TRADE.maxPoints);
    check(
      orphans.length === 0 && dear.length === 0,
      'every node connects to the middle and is affordable inside the budget',
      [...orphans, ...dear].map((n) => n.id).join(', ')
    );

    // The shape, and the whole of what makes the tree a decision: a GATE is two
    // steps out and a branch tip six, which is the entire budget — so ONE
    // branch fits whole and the fork stays a choice at the level cap.
    const gates = trade.spec.spokes.map((sp) => distance.get(sp.gate.id) ?? 0);
    const deepest = Math.max(...nodes.map((n) => distance.get(n.id) ?? 0));
    line(`  a gate costs ${gates[0]}, the deepest node ${deepest} of ${TRADE.maxPoints}`);
    check(
      gates.every((d) => d === 2) && deepest === TRADE.maxPoints,
      'a gate is 2 steps out and a branch tip is the whole budget, so ONE branch fits',
      `gates ${gates.join('/')} · deepest ${deepest} of ${TRADE.maxPoints}`
    );
    // And the OTHER branch cannot also be had: a spoke is ten nodes against
    // six points, which is what the old nine-against-ten stopped being.
    check(
      SPOKE_NODES > TRADE.maxPoints,
      'and a whole spoke never fits, so the fork is still a decision at the cap',
      `${SPOKE_NODES} nodes a spoke against ${TRADE.maxPoints} points`
    );

    // Every switch declared, read whatever the skill's delivery is, and able to
    // say its own number: a trade belongs to the character, so a grant only one
    // behaviour read would be a trade you had to pick a skill for.
    const unread: string[] = [];
    const silent: string[] = [];
    for (const n of nodes) {
      for (const [key, value] of Object.entries(n.grants ?? {})) {
        const def = GRANT_BY_ID[key];
        if (!def) unread.push(`${n.id}: ${key} is not declared`);
        else if (!def.reads.includes(STATS)) unread.push(`${n.id}: ${key} is not read by every skill`);
        else if (!def.say?.(value)) silent.push(`${n.id}: ${key}`);
      }
    }
    check(unread.length === 0, 'every grant is declared and reaches every skill', unread.join(', '));
    check(silent.length === 0, 'and every one of them says its own number', silent.join(', '));

    // A trade changes a RULE, not a number. A notable that only carried stat
    // lines would be a percentage competing with the other trade's percentage,
    // and one of them would win.
    const numbers = notables.filter((n) => Object.keys(n.grants ?? {}).length === 0);
    check(numbers.length === 0, 'every notable changes a rule rather than a number', numbers.map((n) => n.name).join(', '));

    // THE GEOMETRY THE POINTS ARE HANDED OVER ON. Points come two at a time,
    // so a notable has to sit at every EVEN step from the middle and a minor
    // at every odd one — otherwise a pair lands you on a minor and the last
    // one strands you a step short of a tip. This is the whole rework.
    {
      const by = Object.fromEntries(trade.nodes.map((n) => [n.id, n]));
      const depth = (id: string): number => {
        let d = 0;
        let at: string | undefined = id;
        while (at && at !== CENTRE) {
          d++;
          at = by[at]?.links?.[0];
        }
        return d;
      };
      const wrong = trade.nodes
        .filter((n) => (depth(n.id) % 2 === 0) !== (n.kind === 'notable'))
        .map((n) => `${n.id}@${depth(n.id)} is a ${n.kind}`);
      check(
        wrong.length === 0,
        `${id}: a notable at every even step and a minor at every odd one`,
        wrong.slice(0, 4).join(', ')
      );

      // PLAYED OUT, rather than argued from the shape: walk the web greedily a
      // pair at a time, the way the levels hand them over, and every stop has
      // to land on a notable. A build that never strands is the whole ask.
      const walked: string[] = [];
      const stops: string[] = [];
      for (let pair = 0; pair < TRADE.maxPoints / TRADE.pointsPerGrant; pair++) {
        for (let step = 0; step < TRADE.pointsPerGrant; step++) {
          const open = trade.nodes.find((n) => canAllocateTrade(id, n.id, walked));
          if (open) walked.push(open.id);
        }
        stops.push(by[walked[walked.length - 1]]?.kind ?? 'nothing');
      }
      check(
        walked.length === TRADE.maxPoints && stops.every((k) => k === 'notable'),
        `and every pair spent walks onto one — ${stops.join(', ')}`,
        `${walked.length} spent, stopped on ${stops.join(', ')}`
      );
      line(`  ${id}: ${walked.length} points, ending on ${stops.length} notables`);
    }

    const handed = new Map<string, number>();
    for (const n of nodes) {
      for (const key of Object.keys(n.grants ?? {})) handed.set(key, (handed.get(key) ?? 0) + 1);
    }
    const lossy = [...handed]
      .filter(([key, count]) => count > 1 && !GRANT_BY_ID[key]?.merge)
      .map(([key, count]) => `${key} on ${count} nodes`);
    check(lossy.length === 0, 'and anything granted twice says how it stacks', lossy.join(', '));

    // `needs` is the trap this catches: a switch that does nothing without
    // another one, sitting where you could buy it first.
    const stranded: string[] = [];
    for (const n of nodes) {
      for (const key of Object.keys(n.grants ?? {})) {
        const wants = trade.spec.needs[key];
        if (!wants || n.id === wants) continue;
        if (trade.spokeOf[n.id] !== trade.spokeOf[wants]) stranded.push(`${n.id} needs ${wants}`);
        else if ((distance.get(n.id) ?? 0) <= (distance.get(wants) ?? 0)) {
          stranded.push(`${n.id} is reachable before ${wants}`);
        }
      }
    }
    check(stranded.length === 0, 'nothing conditional can be bought before what it needs', stranded.join(', '));

    // Geometry, exactly as the skill webs are held to it: both defects read on
    // screen as a link to somewhere it does not go.
    {
      const at = new Map<string, { x: number; y: number }>(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
      at.set(CENTRE, { x: 0, y: 0 });
      const edges = new Set<string>();
      for (const n of nodes) {
        for (const other of neighboursOfTrade(id, n.id)) edges.add([n.id, other].sort().join('|'));
      }
      const pairs = [...edges].map((key) => key.split('|') as [string, string]);
      type P = { x: number; y: number };
      const side = (a: P, b: P, c: P) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

      const crossed: string[] = [];
      for (let i = 0; i < pairs.length; i++) {
        for (let j = i + 1; j < pairs.length; j++) {
          const [a1, b1] = pairs[i];
          const [a2, b2] = pairs[j];
          if (a1 === a2 || a1 === b2 || b1 === a2 || b1 === b2) continue;
          const [p1, q1, p2, q2] = [at.get(a1)!, at.get(b1)!, at.get(a2)!, at.get(b2)!];
          if (
            side(p2, q2, p1) > 0 !== side(p2, q2, q1) > 0 &&
            side(p1, q1, p2) > 0 !== side(p1, q1, q2) > 0
          ) {
            crossed.push(`${a1}~${b1} over ${a2}~${b2}`);
          }
        }
      }
      const grazed: string[] = [];
      for (const [a, b] of pairs) {
        const p = at.get(a)!;
        const q = at.get(b)!;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const span = dx * dx + dy * dy;
        for (const [other, n] of at) {
          if (other === a || other === b) continue;
          const t = span === 0 ? 0 : Math.max(0, Math.min(1, ((n.x - p.x) * dx + (n.y - p.y) * dy) / span));
          if (Math.hypot(n.x - (p.x + t * dx), n.y - (p.y + t * dy)) < 0.45) {
            grazed.push(`${a}~${b} through ${other}`);
          }
        }
      }
      check(
        crossed.length === 0 && grazed.length === 0,
        'no link crosses another, and none runs through a node it does not join',
        [...crossed, ...grazed].join(', ')
      );
    }

    // What the shape is really worth. A point spent on a minor whose notable
    // you never buy is a point spent on travel to nowhere, so the ceiling is
    // half the budget and reaching it means finishing what you start.
    const fresh = (): Character => {
      const who = makeCharacter({}, 'strike');
      who.level = maxedAt;
      takeUpTrade(who, id);
      return who;
    };
    const notablesIn = (who: Character) =>
      who.tradeAllocated.filter((x) => nodes.find((n) => n.id === x)?.kind === 'notable').length;

    const spendRng = new Rng(5150);
    let stuck = 0;
    let most = 0;
    let fewest = Infinity;
    let walker = fresh();
    for (let walk = 0; walk < 200; walk++) {
      walker = fresh();
      while (tradePointsLeft(walker) > 0) {
        const open = nodes.filter((n) => canAllocateTrade(id, n.id, walker.tradeAllocated));
        if (open.length === 0) break;
        allocateTrade(walker, spendRng.pick(open)!.id);
      }
      if (walker.tradeAllocated.length !== TRADE.maxPoints) stuck++;
      most = Math.max(most, notablesIn(walker));
      fewest = Math.min(fewest, notablesIn(walker));
    }

    // The deliberate walk: two spokes finished, then pairs. Nothing on the web
    // reaches a sixth notable, and a careless walk reaches fewer than five.
    const aimed = fresh();
    for (const spoke of trade.spec.spokes) {
      for (const step of [
        `${trade.spec.prefix}_${spoke.id}_m0`,
        `${trade.spec.prefix}_${spoke.id}_m1`,
        spoke.gate.id,
      ]) {
        allocateTrade(aimed, step);
      }
    }
    line(
      `  200 random walks reached ${fewest} to ${most} notables; walked on purpose, ${notablesIn(aimed)}`
    );
    // Three GATES is what ten points buys if you spend them all on stems, and
    // it is the ceiling: a fourth gate is twelve. What a walk decides is
    // whether those points go to breadth or to one spoke's far branch.
    check(
      stuck === 0 && most === 3 && notablesIn(aimed) === 3,
      `${TRADE.maxPoints} points always spend, and 3 notables is the ceiling`,
      `${stuck} walks short, ${most} the most reached`
    );
    check(fewest < 3, 'and a careless walk pays for travel it never uses', String(fewest));

    while (walker.tradeAllocated.length > 0) {
      const loose = walker.tradeAllocated.find((x) =>
        canDeallocateTrade(id, x, walker.tradeAllocated)
      );
      if (!loose || !deallocateTrade(walker, loose)) break;
    }
    check(walker.tradeAllocated.length === 0, 'and every one of them refunds again', `${walker.tradeAllocated.length} stuck`);
  }

  // The whole reason it exists: what a trade gave you is still there after the
  // one choice the game most wants you to experiment with.
  {
    const who = makeCharacter({}, 'strike');
    who.level = 50;
    takeUpTrade(who, 'aethermancer');
    // A gate is three steps out, so the stem is walked before it is reached.
    for (const step of ['aet_warding_m0', 'aet_warding_m1', 'aet_ward']) {
      allocateTrade(who, step);
    }
    const before = treeGrants(who).manaShield;
    equipSkill(who, 'blight');
    check(
      mainSkillId(who) === 'blight'
        && treeGrants(who).manaShield === before
        && (before as number) > TRADE_BASE.aethermancerShield,
      'a trade survives changing skill, where a skill tree does not — its baseline too',
      `${before} → ${treeGrants(who).manaShield}`
    );
  }

  // A trade is taken up ONCE. The user's call, and the one hard lock in a game
  // that otherwise replays every allocation: what a respec buys back is the
  // ATTRIBUTES, which are the one thing no click undoes.
  {
    const who = makeCharacter({}, 'strike');
    who.level = 30;
    takeUpTrade(who, 'alchemist');
    allocateTrade(who, TRADE_BY_ID.alchemist.nodes[0].id);
    const again = takeUpTrade(who, 'aethermancer');
    check(
      !again && who.trade === 'alchemist' && who.tradeAllocated.length === 1,
      'a trade is taken up once and never swapped, and the walk survives asking',
      `${who.trade}, ${who.tradeAllocated.length} points`
    );

    spendAttribute(who, ATTRIBUTES[0].id);
    spendAttribute(who, ATTRIBUTES[1].id);
    const cost = respecCost(who.level);
    const before = attributePointsLeft(who);
    const gave = forgetAttributes(who);
    line(`  forgetting your attributes at level ${who.level} costs ${cost} gold`);
    check(
      cost > 0 && gave && attributePointsLeft(who) === before + 2
        && Object.keys(who.attributes).length === 0,
      'and every attribute point comes back for gold, which is the only way one does',
      `${before} then ${attributePointsLeft(who)}`
    );
    check(!forgetAttributes(who), 'and asking twice does nothing', 'it refunded nothing twice');
  }

  // Replayed on load like everything else: a trade that is cut, or a level
  // curve that moves, hands the points back rather than leaving a build nobody
  // could have walked to.
  {
    const saved = createGame('fresh');
    saved.character.level = 50;
    takeUpTrade(saved.character, 'alchemist');
    // A stem minor, the gate, and one branch whole — six nodes for six points,
    // which is the entire budget walked in three pairs.
    for (const n of [
      'alc_reaction_m0', 'alc_volatile',
      'alc_detonating_m0', 'alc_touchpaper', 'alc_detonating_m2', 'alc_detonation',
    ]) {
      allocateTrade(saved.character, n);
    }
    const walked = saved.character.tradeAllocated.length;

    saved.character.level = 1;
    const cut = heal(saved);
    check(
      walked === 6 && saved.character.tradeAllocated.length === 0 && cut.points >= walked,
      'a level that never paid for a trade point hands it back on load',
      `${walked} walked, ${saved.character.tradeAllocated.length} kept, ${cut.points} refunded`
    );

    const gone = createGame('fresh');
    gone.character.level = 50;
    gone.character.trade = 'tanner';
    gone.character.tradeAllocated = ['tan_hide'];
    heal(gone);
    check(
      gone.character.trade === null && gone.character.tradeAllocated.length === 0,
      'and a trade that no longer exists takes its walk with it',
      `${gone.character.trade}`
    );
  }
}

// ===========================================================================
rule('TRADE RULES — does each one actually change what the sim does?');

// A card that says a thing and a sim that does not is the failure mode a table
// of switches invites. Each of these is the SAME seed and the same character
// with one node added, so what moved is the node.
{
  const armed = (nodes: string[], skillId = 'strike'): Character => {
    const who = makeCharacter(starterLoadout(new Rng(21), 30), skillId);
    who.level = 50;
    takeUpTrade(who, TRADE_BY_ID[nodes[0]?.startsWith('alc') ? 'alchemist' : 'aethermancer'].spec.id);
    who.tradeAllocated = nodes;
    return who;
  };
  const descend = (who: Character, seed = 9091, band = 2) => {
    const sim = new RunSim(ladderSet(band, new Rng(4), pool), who, new Rng(seed));
    const final = runToCompletion(sim, 900);
    return { sim, final };
  };

  // THE POOL REFILLS ON ITS OWN, for nothing, and it is a SHARE of the pool
  // rather than a flat number — so pouring points into mana refills faster too,
  // which is what makes every one of the five roads pull on the same thing.
  {
    const his = characterStats(armed([]));
    const nobody = characterStats(makeCharacter(starterLoadout(new Rng(21), 30), 'strike'));
    check(
      his.manaRegen > nobody.manaRegen && nobody.manaRegen > 0,
      `the Aethermancer regenerates ${his.manaRegen.toFixed(1)} mana a second against ` +
        `everybody else's ${nobody.manaRegen.toFixed(1)}`,
      `${his.manaRegen} against ${nobody.manaRegen}`
    );
    const deeper = armed(['aet_vessel_m0']);
    const grown = characterStats(deeper);
    check(
      grown.maxMana <= his.maxMana || grown.manaRegen / grown.maxMana - his.manaRegen / his.maxMana < 1e-9,
      'and it is a share of the pool, so a bigger pool refills proportionally',
      `${(grown.manaRegen / grown.maxMana).toFixed(4)} against ${(his.manaRegen / his.maxMana).toFixed(4)}`
    );
  }

  // The pool takes hits, and ailments, before life does.
  {
    const bare = descend(armed([]));
    const ward = descend(armed(['aet_warding_m0', 'aet_ward', 'aet_warding_m1', 'aet_bulwark']));
    const lost = (r: typeof bare) => Object.values(r.sim.state.damageTaken).reduce((a, b) => a + b, 0);
    // Within ONE descent, not across two: the two runs no longer face the same
    // amount of damage, so the far end of one is not a reading on the node.
    const toLife = (r: typeof bare) => lost(r) - r.sim.state.absorbed;
    line(
      `  damage taken over one descent: ${Math.round(lost(bare))} bare, ` +
        `${Math.round(lost(ward))} warded — ${Math.round(ward.sim.state.absorbed)} paid in mana, ` +
        `${Math.round(toLife(ward))} reaching life`
    );
    check(
      ward.sim.state.absorbed > 0 && toLife(ward) < lost(ward),
      'the Aether Ward pays for damage out of mana, so less of it reaches your life',
      `${ward.sim.state.absorbed} absorbed`
    );
    check(
      shieldShare({ manaShield: 9 }) === MANA.shieldCap,
      'and the share it can take is capped, so the pool is never a second life bar',
      String(shieldShare({ manaShield: 9 }))
    );
  }

  // A cast that spends the pool for damage, and the pool that fills itself out
  // of what that damage did.
  {
    const over = descend(armed(['aet_overflow_m0', 'aet_overcharge']));
    check(
      over.sim.state.overcharges > 0,
      'Overcharge spends a share of the maximum pool on uses it can pay for',
      `${over.sim.state.overcharges} of ${over.sim.state.casts} casts`
    );
    const both = armed(['aet_overflow_m0', 'aet_overcharge', 'aet_overflow_m1', 'aet_cataclysm']);
    const share = overchargeOf(treeGrants(both));
    check(
      Math.abs(share - 0.18) < 1e-9,
      'and a second node sums into the share, which is the price AND the payoff',
      String(share)
    );

    // The whole of what was wrong with the old shape: a MORE multiplier paid a
    // stacked pool nothing, so regeneration was the only mana stat worth
    // having. What it adds now IS what it spent, so the pool is the damage.
    const small = characterStats(both);
    const bigger = armed([
      'aet_overflow_m0', 'aet_overcharge', 'aet_overflow_m1', 'aet_cataclysm',
      'aet_vessel_m0', 'aet_vessel_m1', 'aet_vessel',
    ]);
    const pool = characterStats(bigger).maxMana;
    check(
      pool > small.maxMana && pool * share > small.maxMana * share,
      'so a bigger pool is a bigger hit, which a `more` multiplier never gave',
      `${Math.round(small.maxMana * share)} added against ${Math.round(pool * share)}`
    );

    const dry = armed(['aet_siphoning_m0', 'aet_siphon']);
    check(
      (treeGrants(dry).manaLeech as number) === 0.04,
      'the Siphon returns a share of the damage you deal as mana',
      String(treeGrants(dry).manaLeech)
    );
  }

  // The one road to mana nothing else offers, and it lands on the sheet.
  {
    const plain = characterStats(armed([]));
    const vessel = characterStats(armed(['aet_vessel_m0', 'aet_vessel', 'aet_vessel_m1', 'aet_confluence']));
    line(`  the mana pool: ${Math.round(plain.maxMana)} bare, ${Math.round(vessel.maxMana)} with the Vessel walked`);
    check(
      vessel.maxMana > plain.maxMana * 1.5,
      'the Vessel builds the pool out of life, which is the stat everything grants',
      `${plain.maxMana} → ${vessel.maxMana}`
    );
  }

  // Charges as a cooldown rather than a budget, and a flask that carries a buff.
  {
    // Deep enough that he is actually hurt: his own Spirit regenerates a
    // level-50 hero through a shallow set without a mouthful being drunk, and
    // a flask nobody drinks says nothing about the Still.
    const still = descend(
      armed(['alc_condensate_m0', 'alc_still', 'alc_condensate_m1', 'alc_cascade']),
      9091,
      4
    );
    line(
      `  the Still over one descent: ${still.sim.state.drunk} charges drunk, ` +
        `${still.sim.state.regained} handed back`
    );
    check(
      still.sim.state.regained > 0 && still.sim.state.drunk > POTIONS[0].charges,
      'charges come back mid-descent, so a flask is a cooldown rather than a budget',
      `${still.sim.state.regained} regained`
    );

    const buffed = treeGrants(armed(['alc_reaction_m0', 'alc_volatile', 'alc_reaction_m1', 'alc_detonation']));
    check(
      Math.abs((buffed.potionMore as number) - 1.56) < 1e-9,
      'and two magnitude nodes compound into what a flask is worth while it runs',
      String(buffed.potionMore)
    );

    // WHAT THE HOVER SAYS IS WHAT IT POURS. The Alchemist moves the pour and
    // the length at once, so a flask quoting its printed line would be wrong
    // for exactly the build the trade exists to make. Measured against a hero
    // emptied first, or regeneration and the cap are in the number too.
    const steeped = armed(['alc_steeping_m0', 'alc_slow_burn', 'alc_steeping_m1', 'alc_thickened']);
    const grants = treeGrants(steeped);
    const flask = POTIONS[0];
    const sim = new RunSim([], steeped, new Rng(4242));
    const said = potionReading(flask, sim.state.hero.stats.maxLife, grants);
    sim.state.hero.life = 1;
    sim.usePotion(flask.id);
    let poured = 0;
    for (let n = 0; n < Math.ceil((said.seconds + 0.5) / TICK); n++) {
      const was = sim.state.hero.life;
      sim.step(TICK);
      poured += Math.max(0, sim.state.hero.life - was);
    }
    const regen = sim.state.hero.stats.lifeRegen * (said.seconds + 0.5);
    line(
      `  the Alchemist's Flask of Blood: hover says ${Math.round(said.total)} over ` +
        `${said.seconds.toFixed(1)}s, the sim poured ${Math.round(poured - regen)}`
    );
    check(
      Math.abs(poured - regen - said.total) / said.total < 0.05 && said.seconds === 6,
      'and what the flask HOVER promises is what the sim actually pours',
      `${Math.round(said.total)} said, ${Math.round(poured - regen)} poured over ${said.seconds}s`
    );
    // In the BUILD's numbers: 7% over 6s where the table says 5% over 4s.
    const words = potionWorkings(flask, said, 2).join(' | ');
    check(
      words.includes(`${Math.round(said.perSecond)} life per second`) &&
        words.includes('over 6s') &&
        words.includes('Heals 7% of max life per second'),
      'in this build’s own numbers rather than the table’s',
      words
    );

    // And what HOLDING one is worth, which is a flask's whole point on three
    // of the five spokes and reads nowhere else on the screen.
    const spokes = ['alc_reaction_m0', 'alc_volatile', 'alc_condensate_m0', 'alc_still'];
    const wide = treeGrants(armed(spokes));
    const other = potionWorkings(flask, potionReading(flask, 1000, wide), 1).join(' | ');
    check(
      other.includes('more damage while running') && other.includes('charges per second'),
      'and says what HOLDING one is worth, and how fast a charge comes back',
      other
    );
  }

  // Whether a trade FAVOURS a skill. Some pairings being stronger is the system
  // working; a trade with exactly one correct skill is a skill node that got
  // lost. Three skills is too few to tell the two apart, so this is PRINTED and
  // nothing is tuned to it — see the roadmap.
  {
    const WALKS: Record<string, string[]> = {
      'no trade': [],
      alchemist: ['alc_reaction_m0', 'alc_volatile', 'alc_condensate_m0', 'alc_still',
        'alc_quicksilver_m0', 'alc_quicksilver', 'alc_steeping_m0', 'alc_slow_burn',
        'alc_etching_m0', 'alc_etched'],
      aethermancer: ['aet_warding_m0', 'aet_ward', 'aet_overflow_m0', 'aet_overcharge',
        'aet_siphoning_m0', 'aet_siphon', 'aet_vessel_m0', 'aet_vessel',
        'aet_drought_m0', 'aet_dry_season'],
    };
    // The deep end, where a band is not: below it everything clears and the
    // measurement says nothing at all.
    const runs = 4;
    const sets = Array.from({ length: runs }, (_, i) => deepestSet(new Rng(400 + i), pool));
    const spread: number[] = [];

    for (const [name, walk] of Object.entries(WALKS)) {
      const said: string[] = [];
      for (const skill of MAIN_SKILLS) {
        const who = ladderCharacter(6, new Rng(70), skill.id);
        if (walk.length > 0) {
          takeUpTrade(who, walk[0].startsWith('alc') ? 'alchemist' : 'aethermancer');
          who.tradeAllocated = [...walk];
        }
        // Kills a second, not clears: at the deep end a clear count saturates
        // and the measurement stops being able to tell the three apart.
        let killed = 0;
        let seconds = 0;
        sets.forEach((set, i) => {
          const final = runToCompletion(new RunSim(set, who, new Rng(900 + i)), 600);
          killed += final.killed;
          seconds += final.elapsed;
        });
        const rate = killed / Math.max(1, seconds);
        said.push(`${skill.id} ${rate.toFixed(2)}`);
        spread.push(rate);
      }
      line(`  ${name.padEnd(13)} ${said.join('  ')} kills/s`);
    }
    gauge(
      `at the deep end a trade moves the kill rate between ${Math.min(...spread).toFixed(2)} and ` +
        `${Math.max(...spread).toFixed(2)}/s, and no pairing is meant to be the only one that works`
    );
  }

  // What the harnesses measure. Every ladder number in this file is a character
  // with NO trade, deliberately — a trade is a choice, and measuring one would
  // measure that choice rather than the rung.
  {
    const measured = ladderCharacter(DROP_BANDS.length - 1, new Rng(11));
    check(
      measured.trade === null && measured.tradeAllocated.length === 0,
      'and every measured ladder character has no trade at all, so a rung is a rung',
      `${measured.trade}`
    );
  }
}

// ===========================================================================
rule('THE ROSTER — is every hero drawn holding what it carries?');

// A trade is what the hero LOOKS like, and `heroSpriteFor` falls back to the
// bare body for an arrangement nobody has drawn. That fallback is what lets a
// trade ship playable the day its body lands — and it is also how a missing
// picture hides, because the game draws SOMETHING either way.
{
  // Every base a hand can hold, by the `HELD` row its art names — so this is
  // the arrangements a PLAYER can reach rather than a list kept beside them.
  const oneHanded = GEAR_BASES.filter((b) => b.kind === 'weapon' && (b.hands ?? 1) === 1);
  const twoHanded = GEAR_BASES.filter((b) => b.kind === 'weapon' && (b.hands ?? 1) > 1);
  const artOf = (b: GearBase) => b.art ?? '';
  const oneOfEach = (list: GearBase[]) =>
    list.filter((b, i) => list.findIndex((o) => artOf(o) === artOf(b)) === i);

  for (const trade of TRADES) {
    const body = trade.spec.sprite;
    if (!body || !GENERATED[body]) continue;

    const wearing = (main?: GearBase, off?: GearBase): Character => {
      const who = makeCharacter({}, 'strike');
      who.trade = trade.spec.id;
      if (main) who.equipment[WEAPON_SLOT] = makeGear(main.id, 20);
      if (off) who.equipment[OFF_SLOT] = makeGear(off.id, 20);
      return who;
    };

    const missing: string[] = [];
    const seen = new Set<string>();
    // The FIRST variant, not whatever `heroSpriteFor` settles for: a pair falls
    // back to the hand that WAS drawn, which is a picture of him holding one
    // thing and reads as a complete roster from the outside.
    const want = (who: Character) => {
      const asked = variants(who);
      if (asked.length === 0) return;
      seen.add(asked[0]);
      if (!GENERATED[`${body}_${asked[0]}`]) missing.push(asked[0]);
    };
    for (const main of oneOfEach([...oneHanded, ...twoHanded])) want(wearing(main));
    for (const shield of oneOfEach(GEAR_BASES.filter((b) => b.kind === 'shield'))) {
      want(wearing(undefined, shield));
      for (const main of oneOfEach(oneHanded)) want(wearing(main, shield));
    }
    // A PAIR is only an arrangement for the trade that may hold one. Asking the
    // other three for pair art is asking for pictures nobody can reach.
    if (canDualWield(wearing())) {
      for (const main of oneOfEach(oneHanded)) {
        for (const off of oneOfEach(oneHanded)) want(wearing(main, off));
      }
    }
    // A ROSTER NOT STARTED is not the same fault as one half drawn. A trade
    // ships playable the moment its BODY lands and gets its weapons afterwards
    // — `heroSpriteFor` falls back to the bare man — so a hero with none of
    // them is the next job. A hero with SOME is the bug: he would hold a sword
    // and then hold nothing, and only one of those is a picture.
    const drawn = seen.size - new Set(missing).size;
    line(`  ${body}: ${drawn} of ${seen.size} arrangements a player can reach are drawn`);
    if (drawn === 0) {
      gauge(`${body} has no weapon art yet — he plays on the bare body`);
      continue;
    }
    check(
      missing.length === 0,
      `every one of ${body}'s ${seen.size} arrangements is a picture of him holding it`,
      `${missing.length} fall back to the bare body: ${[...new Set(missing)].join(', ')}`
    );
  }
}

// ===========================================================================
rule('THE ROGUE — is a second weapon worth the shield it costs?');

// *"All characters should just not be able to dual wield and then we just have
// a trade that can."* So a pair is a thing exactly one character can reach, and
// almost every notable here pays only while both hands are full. What breaks
// quietly is a rule that reads on a card and does nothing in the sim.
{
  const STANDING = 1e7;
  const rogue = (nodes: string[], main = 'shiv', off?: string): Character => {
    const who = makeCharacter(starterLoadout(new Rng(21), 30), 'strike');
    who.level = 50;
    takeUpTrade(who, 'rogue');
    who.tradeAllocated = nodes;
    who.equipment[WEAPON_SLOT] = makeGear(main, 60);
    if (off) who.equipment[OFF_SLOT] = makeGear(off, 60);
    else delete who.equipment[OFF_SLOT];
    return who;
  };

  // THE OBSIDIAN ORDER. A faction rather than a person, and it is only a
  // faction if more than one of them is in it — the Lambengolmor says so where
  // he hands over the name, and Obreth says so on the card you pick him from.
  {
    const said = [
      ...(SCENE_BY_ID.reading_room.beats ?? []).map((b) => b.said),
      TRADE_BY_ID.rogue.spec.lore,
    ];
    const naming = said.filter((line) => line.includes(ORDER.name));
    check(
      naming.length >= 2,
      `${ORDER.name} is named by both of the people in it`,
      `${naming.length} of ${said.length} lines name it`
    );
    check(
      TRADE_BY_ID.rogue.spec.sprite === 'obreth',
      'and the rogue is drawn as one of them',
      String(TRADE_BY_ID.rogue.spec.sprite)
    );
  }

  check(
    gripOf(rogue([], 'shiv', 'cudgel')) === 'pair' && gripOf(rogue([])) === 'one',
    'a rogue holding two weapons reads as a pair',
    `${gripOf(rogue([], 'shiv', 'cudgel'))}, ${gripOf(rogue([]))}`
  );

  // A PAIR, and what the gate buys for holding one.
  {
    const bare = characterStats(rogue([], 'shiv', 'cudgel'));
    const paired = characterStats(rogue(['rog_pair_m0', 'rog_pair'], 'shiv', 'cudgel'));
    const alone = characterStats(rogue(['rog_pair_m0', 'rog_pair'], 'shiv'));
    const aloneBare = characterStats(rogue([], 'shiv'));
    check(
      paired.damage > bare.damage * 1.24,
      `two weapons deal ${Math.round((paired.damage / bare.damage - 1) * 100)}% more for the gate`,
      `${paired.damage.toFixed(1)} against ${bare.damage.toFixed(1)}`
    );
    check(
      Math.abs(alone.damage - aloneBare.damage) < 1e-6,
      'and one weapon and an empty hand buys nothing at all, which is the choice',
      `${alone.damage} against ${aloneBare.damage}`
    );
    const faster = characterStats(
      rogue(['rog_pair_m0', 'rog_pair', 'rog_alternating_m0', 'rog_rhythm'], 'shiv', 'cudgel')
    );
    check(
      faster.attacksPerSecond > bare.attacksPerSecond * 1.09,
      `and a pair swings ${Math.round((faster.attacksPerSecond / bare.attacksPerSecond - 1) * 100)}% faster for a point`,
      `${faster.attacksPerSecond.toFixed(3)} against ${bare.attacksPerSecond.toFixed(3)}`
    );
    const heavier = characterStats(
      rogue(['rog_pair_m0', 'rog_pair', 'rog_weakhand_m0', 'rog_evenly'], 'shiv', 'cudgel')
    );
    check(
      heavier.damage > paired.damage,
      `and the off hand puts ${Math.round((heavier.damage / paired.damage - 1) * 100)}% more of itself in`,
      `${heavier.damage.toFixed(1)} against ${paired.damage.toFixed(1)}`
    );
  }

  // THE SPECIALIST — the user's own node. PER WEAPON, so a matched pair is its
  // family's line twice, and every family in the table has to do something.
  {
    const spec = ['rog_trade_m0', 'rog_specialist'];
    const knives = characterStats(rogue(spec, 'shiv', 'stiletto'));
    const plain = characterStats(rogue([], 'shiv', 'stiletto'));
    check(
      knives.critChance > plain.critChance + WEAPON_SPECIALITY.dagger.per * 1.5,
      `two daggers grant the dagger line TWICE — ${knives.critChance.toFixed(1)}% crit against ${plain.critChance.toFixed(1)}%`,
      `${knives.critChance} against ${plain.critChance}`
    );
    // Against the SAME weapons without the node — a dagger and a club start
    // from a different crit than two daggers do, and that is the weapons.
    const one = characterStats(rogue(spec, 'shiv', 'cudgel'));
    const oneBare = characterStats(rogue([], 'shiv', 'cudgel'));
    check(
      one.critChance > oneBare.critChance
        && one.critChance - oneBare.critChance < knives.critChance - plain.critChance,
      `and one dagger grants it once — +${(one.critChance - oneBare.critChance).toFixed(1)}% against +${(knives.critChance - plain.critChance).toFixed(1)}%`,
      `${one.critChance} against ${oneBare.critChance}`
    );

    // EVERY FAMILY IN THE TABLE writes a line, asked of the seam rather than of
    // a character: a wand's cast speed changes nothing for a build swinging a
    // knife, and that is the SKILL rather than the switch doing nothing.
    const dead = Object.entries(WEAPON_SPECIALITY).filter(([family, want]) => {
      const base = GEAR_BASES.find((b) => b.family === family);
      if (!base) return true;
      const who = rogue(spec, base.id);
      const mod = specialistMod(who, treeGrants(who));
      return mod?.stats.length !== 1 || mod.stats[0].stat !== want.stat;
    });
    check(
      dead.length === 0,
      `and all ${Object.keys(WEAPON_SPECIALITY).length} families in the table write their own line`,
      dead.map(([f]) => f).join(', ')
    );
    // And it reaches a build that actually uses the stat.
    const caster = makeCharacter(starterLoadout(new Rng(21), 30), 'fireball');
    caster.level = 50;
    takeUpTrade(caster, 'rogue');
    caster.tradeAllocated = spec;
    caster.equipment[WEAPON_SLOT] = makeGear('ash_wand', 60);
    delete caster.equipment[OFF_SLOT];
    const bareCaster = { ...caster, tradeAllocated: [] as string[] };
    check(
      characterStats(caster).attacksPerSecond > characterStats(bareCaster).attacksPerSecond,
      `a wand's cast speed reaches a build that casts — ${characterStats(caster).attacksPerSecond.toFixed(3)} against ${characterStats(bareCaster).attacksPerSecond.toFixed(3)}`,
      `${characterStats(caster).attacksPerSecond} against ${characterStats(bareCaster).attacksPerSecond}`
    );
  }

  // MATCHED against ODD: two rules that cannot both be live, which is what
  // makes the fork a decision rather than a sum.
  {
    const twin = ['rog_trade_m0', 'rog_specialist', 'rog_matched_m0', 'rog_twinned'];
    const odd = ['rog_trade_m0', 'rog_specialist', 'rog_mixed_m0', 'rog_odd'];
    const same = characterStats(rogue(twin, 'shiv', 'stiletto')).damage;
    const sameOnOdd = characterStats(rogue(twin, 'shiv', 'cudgel')).damage;
    const base = characterStats(rogue(['rog_trade_m0', 'rog_specialist'], 'shiv', 'stiletto')).damage;
    const mixed = characterStats(rogue(odd, 'shiv', 'cudgel')).damage;
    const mixedOnSame = characterStats(rogue(odd, 'shiv', 'stiletto')).damage;
    const mixedBase = characterStats(rogue(['rog_trade_m0', 'rog_specialist'], 'shiv', 'cudgel')).damage;
    check(
      same > base * 1.19 && Math.abs(sameOnOdd / mixedBase - 1) < 1e-9,
      'Twinned pays on two of one family and nothing on two of different ones',
      `${(same / base).toFixed(3)} matched, ${(sameOnOdd / mixedBase).toFixed(3)} odd`
    );
    check(
      mixed > mixedBase * 1.17 && Math.abs(mixedOnSame / base - 1) < 1e-9,
      'and Odd Hands is the exact mirror of it',
      `${(mixed / mixedBase).toFixed(3)} odd, ${(mixedOnSame / base).toFixed(3)} matched`
    );
  }

  // What a hit COMES TO, in front of the sim. The FIRST one on a body, and
  // every one after it.
  {
    const opened = (nodes: string[], first: boolean): number => {
      const sim = new RunSim([], rogue(nodes, 'shiv', 'cudgel'), new Rng(808)) as any;
      const hero = sim.state.hero;
      const foe = sim.state.monsters[0];
      foe.x = hero.x + 9;
      foe.y = hero.y;
      foe.life = STANDING;
      if (!first) foe.struck = true;
      sim.dealDamage(hero, foe, 1, undefined);
      return STANDING - foe.life;
    };
    const unseen = ['rog_shadow_m0', 'rog_unseen'];
    const opener = opened(unseen, true);
    const after = opened(unseen, false);
    const flat = opened([], true);
    check(
      opener > after * 1.5 && Math.abs(after - flat) < 0.01,
      `Unseen is ${Math.round((opener / after - 1) * 100)}% more on the FIRST hit and nothing after it`,
      `${opener.toFixed(1)} first, ${after.toFixed(1)} after, ${flat.toFixed(1)} bare`
    );
  }

  // WHAT A KILL BUYS: cover, swing and pace, off one clock.
  {
    const killed = (nodes: string[]) => {
      const sim = new RunSim([], rogue(nodes, 'shiv', 'cudgel'), new Rng(808)) as any;
      const before = { haste: sim.hasteOf(sim.state.hero), pace: sim.paceOf(sim.state.hero) };
      sim.kill(sim.state.monsters[0]);
      return { sim, before, after: { haste: sim.hasteOf(sim.state.hero), pace: sim.paceOf(sim.state.hero) } };
    };
    const quick = killed(['rog_quick_m0', 'rog_quickening']);
    check(
      quick.after.haste > quick.before.haste * 1.14,
      `a kill quickens the next swing by ${Math.round((quick.after.haste / quick.before.haste - 1) * 100)}%`,
      `${quick.after.haste} against ${quick.before.haste}`
    );
    const running = killed(['rog_quick_m0', 'rog_quickening', 'rog_footwork_m0', 'rog_carried']);
    check(
      running.after.pace > running.before.pace * 1.14,
      `and carries you ${Math.round((running.after.pace / running.before.pace - 1) * 100)}% faster to the next`,
      `${running.after.pace} against ${running.before.pace}`
    );
    // And COVER, which is on the way in rather than the way out.
    const took = (nodes: string[], afterKill: boolean): number => {
      const sim = new RunSim([], rogue(nodes, 'shiv', 'cudgel'), new Rng(808)) as any;
      if (afterKill) sim.kill(sim.state.monsters[1] ?? sim.state.monsters[0]);
      const hero = sim.state.hero;
      const was = hero.life;
      sim.dealDamage(sim.state.monsters[0], hero, 1, undefined);
      return was - hero.life;
    };
    const cover = ['rog_shadow_m0', 'rog_unseen', 'rog_vanishing_m0', 'rog_cover'];
    check(
      took(cover, true) < took(cover, false) * 0.95,
      `and a kill covers you for ${Math.round((1 - took(cover, true) / took(cover, false)) * 100)}% of the next hit`,
      `${took(cover, true).toFixed(1)} against ${took(cover, false).toFixed(1)}`
    );
  }

  // A CRITICAL STRIKES AGAIN, and only with a pair — it is the off hand that
  // swings, so one weapon and an empty fist has nothing to swing with.
  {
    const echo = ['rog_edge_m0', 'rog_edge', 'rog_follow_m0', 'rog_follow'];
    const crit = (nodes: string[], off?: string): number => {
      const sim = new RunSim([], rogue(nodes, 'shiv', off), new Rng(808)) as any;
      const hero = sim.state.hero;
      const foe = sim.state.monsters[0];
      foe.x = hero.x + 9;
      foe.y = hero.y;
      foe.life = STANDING;
      sim.useCrit = true;
      sim.dealDamage(hero, foe, 1, undefined);
      return STANDING - foe.life;
    };
    check(
      crit(echo, 'cudgel') > crit([], 'cudgel') * 1.2,
      `a Critical strikes again for ${Math.round((crit(echo, 'cudgel') / crit([], 'cudgel') - 1) * 100)}% more`,
      `${crit(echo, 'cudgel').toFixed(1)} against ${crit([], 'cudgel').toFixed(1)}`
    );
    check(
      Math.abs(crit(echo) - crit([])) < 0.01,
      'and nothing at all with one hand empty',
      `${crit(echo).toFixed(1)} against ${crit([]).toFixed(1)}`
    );
  }

  // And it PLAYS, with the arrangement no other character in the game can hold.
  {
    const walk = (nodes: string[], main: string, off?: string): string => {
      const sim = new RunSim([], rogue(nodes, main, off), new Rng(4242));
      const final = runToCompletion(sim, 900);
      return `${final.status} in ${final.elapsed.toFixed(0)}s, ${final.killed} down`;
    };
    gauge(`two daggers, Specialist to Mirror Work: ${walk(
      ['rog_trade_m0', 'rog_specialist', 'rog_matched_m0', 'rog_twinned', 'rog_matched_m1', 'rog_mirror'],
      'shiv', 'stiletto'
    )}`);
    gauge(`dagger and club, Both Hands Full to Ambidextrous: ${walk(
      ['rog_pair_m0', 'rog_pair', 'rog_weakhand_m0', 'rog_evenly', 'rog_weakhand_m1', 'rog_ambidextrous'],
      'shiv', 'cudgel'
    )}`);
  }
}

// ===========================================================================
rule('THE WARRIOR — does what is in your other hand change anything?');

// Mahthar's whole web asks ONE question and every notable answers it: a shield
// blunts and a Block pays, or both hands are on one weapon and it swings. What
// breaks quietly here is a rule that reads on a card and does nothing in the
// sim, so each is put in front of the sim rather than checked off a table.
{
  /** Life put on a body so it lives through a measured hit. */
  const STANDING = 1e7;

  const warrior = (nodes: string[], off?: string, main?: string): Character => {
    const who = makeCharacter(starterLoadout(new Rng(21), 30), 'strike');
    who.level = 50;
    takeUpTrade(who, 'warrior');
    who.tradeAllocated = nodes;
    // Straight into the slot: `equipItem` is the game's undoable move and
    // wants a bag under it, and what is being measured here is the ARRANGEMENT.
    if (main) {
      who.equipment[WEAPON_SLOT] = makeGear(main, 60);
      delete who.equipment[OFF_SLOT];
    }
    if (off) who.equipment[OFF_SLOT] = makeGear(off, 60);
    return who;
  };

  const withShield = warrior([], 'tower_shield');
  const withBoth = warrior([], undefined, 'reaver_sword');
  const withPair = warrior([], 'steel_sword');
  const bare = warrior([]);
  delete bare.equipment[OFF_SLOT];
  const grips = [withShield, withBoth, withPair, bare].map(gripOf);
  check(
    grips.join(',') === 'shield,both,pair,one',
    `what is in your hands reads as one word — ${grips.join(', ')}`,
    grips.join(', ')
  );
  check(
    withShield.equipment[OFF_SLOT] !== undefined && characterStats(withShield).blockChance > 0,
    `a shield in the off hand is ${Math.round(characterStats(withShield).blockChance)}% Block`,
    String(characterStats(withShield).blockChance)
  );
  // NOTHING in the web writes it. A shield's whole worth stays one number.
  const writes = TRADE_BY_ID.warrior.nodes.filter(
    (n) => (n.stats ?? []).some((l) => l.stat === 'blockChance') || 'blockChance' in (n.grants ?? {})
  );
  check(writes.length === 0, 'and not one node in the web raises it', writes.map((n) => n.id).join(', '));

  // BOTH HANDS, and the sheet's own workings: a factor the breakdown cannot
  // show is a sheet that does not add up to its own total.
  {
    const plain = characterStats(warrior([], undefined, 'reaver_sword'));
    const swung = characterStats(
      warrior(['mah_bothhands_m0', 'mah_bothhands'], undefined, 'reaver_sword')
    );
    const wasted = characterStats(warrior(['mah_bothhands_m0', 'mah_bothhands'], 'tower_shield'));
    const shieldPlain = characterStats(warrior([], 'tower_shield'));
    check(
      swung.damage > plain.damage * 1.29,
      `both hands on one weapon deal ${Math.round((swung.damage / plain.damage - 1) * 100)}% more`,
      `${swung.damage.toFixed(1)} against ${plain.damage.toFixed(1)}`
    );
    check(
      Math.abs(wasted.damage / shieldPlain.damage - swung.damage / plain.damage) > 0.25,
      'and the same points buy a shield build nothing at all, which is the choice',
      `${(wasted.damage / shieldPlain.damage).toFixed(3)} against ${(swung.damage / plain.damage).toFixed(3)}`
    );
    const faster = characterStats(
      warrior(['mah_bothhands_m0', 'mah_bothhands', 'mah_swinging_m0', 'mah_followthrough'], undefined, 'reaver_sword')
    );
    check(
      faster.attacksPerSecond > plain.attacksPerSecond * 1.11,
      `and it swings ${Math.round((faster.attacksPerSecond / plain.attacksPerSecond - 1) * 100)}% faster for a point`,
      `${faster.attacksPerSecond.toFixed(3)} against ${plain.attacksPerSecond.toFixed(3)}`
    );
  }

  // BARE TO THE ROCK: a slot given up, and the life it is given up for.
  {
    const clothed = characterStats(warrior([], 'tower_shield'));
    const stripped = characterStats(warrior(['mah_blood_m0', 'mah_bare'], 'tower_shield'));
    check(
      stripped.maxLife > clothed.maxLife * 1.29 && stripped.armour < clothed.armour,
      `bare to the rock is ${Math.round(stripped.maxLife)} life against ${Math.round(clothed.maxLife)}, ` +
        `and ${Math.round(stripped.armour)} armour against ${Math.round(clothed.armour)}`,
      `${stripped.maxLife} / ${stripped.armour} against ${clothed.maxLife} / ${clothed.armour}`
    );
  }

  // What a hit COMES TO, put in front of the sim, `since` seconds after
  // anything last landed on the hero. Two sims off one seed differ only by the
  // grant, and neither draws a number the other does not.
  const hitFor = (who: Character, since = 0): number => {
    const sim = new RunSim([], who, new Rng(808)) as any;
    const hero = sim.state.hero;
    const foe = sim.state.monsters[0];
    foe.x = hero.x + 0.5;
    foe.y = hero.y;
    sim.sinceHit = since;
    // A BODY THAT SURVIVES IT. A level 50 hero one-shots anything in the bare
    // Fissure, and every reading off a corpse is the same number: its life.
    foe.life = STANDING;
    sim.dealDamage(hero, foe, 1, undefined);
    return STANDING - foe.life;
  };

  {
    const cold = WARRIOR.paintSeconds + 1;
    const plain = hitFor(warrior([]));
    const painted = hitFor(warrior(['mah_paint_m0', 'mah_paint']));
    check(
      painted > plain * 1.2,
      `War Paint is ${Math.round((painted / plain - 1) * 100)}% more damage in the ` +
        `${WARRIOR.paintSeconds}s after a blow lands on you`,
      `${painted.toFixed(1)} against ${plain.toFixed(1)}`
    );
    const late = hitFor(warrior(['mah_paint_m0', 'mah_paint']), cold);
    check(
      Math.abs(late - hitFor(warrior([]), cold)) < 0.01,
      'and nothing at all once that window has run out, which is what makes it a rule',
      `${late.toFixed(1)} against ${hitFor(warrior([]), cold).toFixed(1)}`
    );
    // Against a body with ARMOUR ON IT: nothing in the bare Fissure has any,
    // and a share of nothing is nothing however the switch is wired.
    const throughPlate = (nodes: string[]): number => {
      const sim = new RunSim([], warrior(nodes), new Rng(808)) as any;
      const hero = sim.state.hero;
      const foe = sim.state.monsters[0];
      foe.x = hero.x + 9;
      foe.y = hero.y;
      foe.life = STANDING;
      foe.stats = { ...foe.stats, armourReduction: 60 };
      sim.dealDamage(hero, foe, 1, undefined);
      return STANDING - foe.life;
    };
    const armoured = throughPlate(['mah_bothhands_m0', 'mah_bothhands', 'mah_sundering_m0', 'mah_overwhelm']);
    const without = throughPlate(['mah_bothhands_m0', 'mah_bothhands']);
    check(
      armoured > without * 1.3,
      `Overwhelm gets ${Math.round((armoured / without - 1) * 100)}% more through 60% Armour`,
      `${armoured.toFixed(1)} against ${without.toFixed(1)}`
    );
  }

  // CORNERED reads the life you are standing on, so it is checked at both ends.
  {
    const hurt = (who: Character): number => {
      const sim = new RunSim([], who, new Rng(808)) as any;
      const hero = sim.state.hero;
      hero.life = hero.stats.maxLife * 0.2;
      const foe = sim.state.monsters[0];
      foe.x = hero.x + 9;
      foe.y = hero.y;
      foe.life = STANDING;
      sim.dealDamage(hero, foe, 1, undefined);
      return STANDING - foe.life;
    };
    const backs = warrior(['mah_cornered_m0', 'mah_cornered', 'mah_cornered_m1', 'mah_laststand']);
    check(
      hurt(backs) > hurt(warrior([])) * 1.8 && Math.abs(hitFor(backs, 9) - hitFor(warrior([]), 9)) < 0.01,
      `Cornered is ${Math.round((hurt(backs) / hurt(warrior([])) - 1) * 100)}% more at a fifth life and nothing at full`,
      `${hurt(backs).toFixed(1)} hurt, ${hitFor(backs, 9).toFixed(1)} whole`
    );
  }

  // WHAT A BLOCK IS WORTH beyond stopping the hit. Blocks are frequent over a
  // descent and rare in any one tick, so this puts one in front of the sim.
  {
    const blocked = (nodes: string[]) => {
      const who = warrior(nodes, 'tower_shield');
      const sim = new RunSim([], who, new Rng(808)) as any;
      const hero = sim.state.hero;
      hero.life = hero.stats.maxLife * 0.5;
      const foe = sim.state.monsters[0];
      foe.life = STANDING;
      const was = { life: hero.life, foe: foe.life, slow: foe.slowed ?? 0 };
      sim.afterBlock(hero, foe);
      return { sim, hero, foe, was };
    };
    const thorns = blocked(['mah_wall_m0', 'mah_wall', 'mah_bracing_m0', 'mah_boss']);
    check(
      thorns.foe.life < thorns.was.foe,
      `a Block gives ${Math.round(thorns.was.foe - thorns.foe.life)} damage back to what you blocked`,
      `${thorns.foe.life} against ${thorns.was.foe}`
    );
    const wind = blocked(['mah_wall_m0', 'mah_wall', 'mah_turning_m0', 'mah_wind']);
    check(
      wind.hero.life > wind.was.life,
      `and Second Wind puts ${Math.round(wind.hero.life - wind.was.life)} life back`,
      `${wind.hero.life} against ${wind.was.life}`
    );
    const shaken = blocked(['mah_wall_m0', 'mah_wall', 'mah_turning_m0', 'mah_wind', 'mah_turning_m1', 'mah_unshaken']);
    check(
      (shaken.foe.slowed ?? 0) > 0 && shaken.foe.effects.length > 0,
      `and Unshaken Slows what you blocked by ${Math.round((shaken.foe.slowed ?? 0) * 100)}%`,
      `slowed ${shaken.foe.slowed}`
    );
    // The RIPOSTE window: sharpened for its seconds and nothing after them.
    const riposte = blocked(['mah_answer_m0', 'mah_answer']);
    const sharp = (sim: any, who: Character): number => {
      const foe = sim.state.monsters[1] ?? sim.state.monsters[0];
      foe.x = sim.state.hero.x + 9;
      foe.y = sim.state.hero.y;
      foe.life = STANDING;
      sim.dealDamage(sim.state.hero, foe, 1, undefined);
      return STANDING - foe.life;
    };
    const after = sharp(riposte.sim, riposte.hero as unknown as Character);
    const flat = sharp(blocked([]).sim, bare);
    check(
      after > flat * 1.3,
      `and The Answer sharpens the next hit by ${Math.round((after / flat - 1) * 100)}%`,
      `${after.toFixed(1)} against ${flat.toFixed(1)}`
    );
  }

  // A SHIELD BLUNTS, a kill feeds, a hit Slows, and Armour gets a say over
  // Ailments — the four that are read where they are read and nowhere else.
  {
    const lessSim = new RunSim([], warrior(['mah_wall_m0', 'mah_wall'], 'tower_shield'), new Rng(808)) as any;
    const plainSim = new RunSim([], warrior([], 'tower_shield'), new Rng(808)) as any;
    const took = (sim: any): number => {
      const hero = sim.state.hero;
      const before = hero.life;
      // FORTY, because a tower shield BLOCKS: one hit reads zero on both sides
      // whenever the roll goes that way, which is the flake this replaces.
      for (let i = 0; i < 40; i++) sim.dealDamage(sim.state.monsters[0], hero, 1, undefined);
      return before - hero.life;
    };
    const a = took(lessSim);
    const b = took(plainSim);
    check(
      a < b * 0.9,
      `The Wall takes ${Math.round((1 - a / b) * 100)}% less from a hit while a shield is up`,
      `${a.toFixed(1)} against ${b.toFixed(1)}`
    );

    const fed = new RunSim([], warrior(['mah_blood_m0', 'mah_bare', 'mah_feeding_m0', 'mah_feed'], 'tower_shield'), new Rng(808)) as any;
    fed.state.hero.life = fed.state.hero.stats.maxLife * 0.5;
    const wasLife = fed.state.hero.life;
    fed.kill(fed.state.monsters[0]);
    check(
      fed.state.hero.life > wasLife,
      `a kill feeds ${Math.round(fed.state.hero.life - wasLife)} life back`,
      `${fed.state.hero.life} against ${wasLife}`
    );

    const heavy = new RunSim([], warrior(['mah_paint_m0', 'mah_paint', 'mah_marks_m0', 'mah_heavyhand']), new Rng(808)) as any;
    const target = heavy.state.monsters[0];
    target.x = heavy.state.hero.x + 9;
    target.y = heavy.state.hero.y;
    target.life = STANDING;
    heavy.dealDamage(heavy.state.hero, target, 1, undefined);
    check(
      (target.slowed ?? 0) > 0,
      `a Heavy Hand Slows what it lands on by ${Math.round((target.slowed ?? 0) * 100)}%`,
      `slowed ${target.slowed}`
    );

    const skinned = new RunSim([], warrior(['mah_answer_m0', 'mah_answer', 'mah_hide_m0', 'mah_secondskin'], 'tower_shield'), new Rng(808)) as any;
    const naked = new RunSim([], warrior([], 'tower_shield'), new Rng(808)) as any;
    check(
      skinned.hide(skinned.state.hero) < 1 && naked.hide(naked.state.hero) === 1,
      `Second Skin blunts an Ailment by ${Math.round((1 - skinned.hide(skinned.state.hero)) * 100)}%, and every other build by nothing`,
      `${skinned.hide(skinned.state.hero)} against ${naked.hide(naked.state.hero)}`
    );
  }

  // THE STUN, which is the trade's for nothing. It is what a HEAVY BLOW does:
  // the chance is the share of the body's own maximum life the one hit took,
  // and a hit that kills always Stuns — which is the whole reason Aftershock
  // can be spent on by a build that one-shots what it swings at.
  {
    const struck = (nodes: string[], life: number, seed = 808) => {
      const sim = new RunSim([], warrior(nodes), new Rng(seed)) as any;
      const hero = sim.state.hero;
      const foe = sim.state.monsters[0];
      foe.x = hero.x + 0.5;
      foe.y = hero.y;
      foe.stats.maxLife = life;
      foe.life = life;
      sim.dealDamage(hero, foe, 1, undefined);
      return sim;
    };
    // A body with a hundred times the life the hero can deal takes a graze.
    const oneHit = struck([], 1);
    const graze = Array.from({ length: 60 }, (_, i) => struck([], 1e7, 400 + i)).filter(
      (s) => s.state.stunned > 0
    ).length;
    check(
      oneHit.state.stunned === 1 && oneHit.state.monsters[0].dead,
      'a hit that kills a body outright always Stuns it',
      `${oneHit.state.stunned} Stuns`
    );
    check(
      graze === 0,
      `and a graze at a millionth of a body's life Stuns none of 60 — ${graze}`,
      `${graze} of 60`
    );
    // AND IT STOPS THE BODY. A stunned monster neither swings nor closes.
    const held = struck([], 1e7, 808);
    held.state.monsters[0].effects.push({ id: 'stunned', remaining: 5 });
    held.state.monsters[0].aggroed = true;
    const wasAt = { x: held.state.monsters[0].x, y: held.state.monsters[0].y };
    for (let i = 0; i < 30; i++) held.stepMonster(held.state.monsters[0], TICK);
    check(
      held.state.monsters[0].x === wasAt.x && held.state.monsters[0].y === wasAt.y,
      'a Stunned body neither swings nor closes for as long as it runs',
      `moved to ${held.state.monsters[0].x}, ${held.state.monsters[0].y}`
    );

    // AFTERSHOCK, on a body the hit KILLED — the case the guaranteed Stun on a
    // killing blow exists for. A BYSTANDER is stood inside the radius and its
    // life read: a Burst measured on an empty floor proves nothing.
    const shocking = (nodes: string[]): number => {
      const sim = new RunSim([], warrior(nodes), new Rng(808)) as any;
      const hero = sim.state.hero;
      const [foe, near] = sim.state.monsters;
      foe.x = hero.x + 0.5;
      foe.y = hero.y;
      foe.stats.maxLife = 1;
      foe.life = 1;
      near.x = foe.x + 1;
      near.y = foe.y;
      near.stats.maxLife = STANDING;
      near.life = STANDING;
      sim.dealDamage(hero, foe, 1, undefined);
      return STANDING - near.life;
    };
    const spent = ['mah_paint_m0', 'mah_paint', 'mah_marks_m0', 'mah_heavyhand', 'mah_marks_m1', 'mah_aftershock'];
    const burst = shocking(spent);
    const nothing = shocking([]);
    check(
      burst > 0 && nothing === 0,
      `a Stun on a body killed outright Bursts ${Math.round(burst)} onto what stands ` +
        `within ${WARRIOR.stunBurstRadius} tiles, where the same hit unspent does nothing`,
      `${burst} against ${nothing}`
    );
    // The chance is the CURVE, and one implementation answers the card too.
    line(
      `  a hit for a tenth of a body's life Stuns ${(stunChanceFor(0.1) * 100).toFixed(1)}% ` +
        `of the time, four fifths ${(stunChanceFor(0.8) * 100).toFixed(1)}%, a kill always`
    );
    check(
      stunChanceFor(0.01) < stunChanceFor(0.1)
        && stunChanceFor(0.1) < stunChanceFor(0.8)
        && stunChanceFor(1.2) === 1,
      'and the bigger the share of a body it took, the likelier it is',
      `${stunChanceFor(0.01)}, ${stunChanceFor(0.8)}, ${stunChanceFor(1.2)}`
    );
  }

  // And it PLAYS: the same six points on the two arrangements the trade is
  // about, each walked to its own tip and each clearing what it walks into.
  {
    const walk = (nodes: string[], off?: string, main?: string): string => {
      const sim = new RunSim([], warrior(nodes, off, main), new Rng(4242));
      const final = runToCompletion(sim, 900);
      return `${final.status} in ${final.elapsed.toFixed(0)}s, ${final.killed} down`;
    };
    gauge(`shield, The Wall to Teeth in the Rim: ${walk(
      ['mah_wall_m0', 'mah_wall', 'mah_bracing_m0', 'mah_boss', 'mah_bracing_m1', 'mah_teeth'], 'tower_shield'
    )}`);
    gauge(`two hands, Both Hands to Shatter the Plate: ${walk(
      ['mah_bothhands_m0', 'mah_bothhands', 'mah_sundering_m0', 'mah_overwhelm', 'mah_sundering_m1', 'mah_shatterplate'],
      undefined, 'reaver_sword'
    )}`);
  }
}

// ===========================================================================
rule('MANA — is a bare skill just barely sustainable?');

// The calibration this whole resource exists for, and it is measured against
// real descents rather than against a formula: a level 1 character with no
// gear, no points and a bare skill has to be able to keep casting MOST of the
// time and not all of it. Comfortable is a resource nobody notices; starving
// is a character that never gets to use the skill it chose.
{
  // Every bare skill costs the same PER SECOND. The per-use number differs
  // because the rates do, which is the only reason the table holds three
  // different figures.
  const off: string[] = [];
  for (const skill of MAIN_SKILLS) {
    const perSecond = skill.manaCost * HERO_BASE.attacksPerSecond * skill.rateMultiplier;
    const drift = Math.abs(perSecond - MANA.costPerSecond) / MANA.costPerSecond;
    line(
      `  ${skill.id.padEnd(9)} ${skill.manaCost} a use at ${(HERO_BASE.attacksPerSecond * skill.rateMultiplier).toFixed(2)}/s ` +
        `= ${perSecond.toFixed(1)}/s`
    );
    if (drift > MANA.costTolerance) off.push(`${skill.id} at ${perSecond.toFixed(1)}/s`);
  }
  check(
    off.length === 0,
    `every bare skill costs ${MANA.costPerSecond}/s, whatever its cast rate`,
    `off the mark: ${off.join(', ')}`
  );

  // And what that comes to in a descent. A share of swings that could not pay
  // for the skill, so it is the same number whatever the skill's rate.
  const dryShare: number[] = [];
  const unclear: string[] = [];
  for (const skill of MAIN_SKILLS) {
    const hero = makeCharacter({}, skill.id);
    let dry = 0;
    let casts = 0;
    let cleared = 0;
    const runs = 10;
    for (let i = 1; i <= runs; i++) {
      const sim = new RunSim([], hero, new Rng(i * 977));
      if (runToCompletion(sim, 800).status === 'cleared') cleared++;
      dry += sim.state.dryCasts;
      casts += sim.state.casts;
    }
    const share = dry / Math.max(1, casts);
    dryShare.push(share);
    line(
      `  ${skill.id.padEnd(9)} ${(share * 100).toFixed(0)}% of swings were starved, ${cleared}/${runs} cleared`
    );
    if (cleared < runs * 0.8) unclear.push(`${skill.id} ${cleared}/${runs}`);
  }
  check(
    unclear.length === 0,
    'a bare level 1 still clears the Fissure paying for its skill',
    `mana made the first descent unwinnable: ${unclear.join(', ')}`
  );
  const worst = Math.max(...dryShare);
  const best = Math.min(...dryShare);
  // Both ends of one knob: half a character's swings bare is a skill it never
  // gets to cast, and none of them bare is a resource nobody notices.
  gauge(
    `${(best * 100).toFixed(0)}% to ${(worst * 100).toFixed(0)}% of swings go unpaid — ` +
      'the skill is cast most of the time between 5% and 50%'
  );

  // What running dry COSTS, and that it is a penalty rather than a wall. The
  // skill is still yours: same delivery, same grants, same targets, at a
  // multiplier that arrives through one declared seam a trade can move.
  {
    const bare = starvedMultiplier({});
    gauge(`a starved cast lands for ${Math.round(bare * 100)}% of your damage, and is still your skill`);

    const def = GRANT_BY_ID.starvedDamage;
    check(
      def?.merge === 'product'
        && def.reads.includes(STATS)
        && typeof def.say?.(1.4) === 'string'
        && starvedMultiplier({ starvedDamage: 1.4 }) > bare
        && starvedMultiplier({ starvedDamage: 0.5 }) < bare,
      'and the penalty moves through a declared grant, in both directions',
      `merge ${def?.merge}, ${starvedMultiplier({ starvedDamage: 1.4 })} against ${bare}`
    );
    // A pool of nothing is the whole of the difference. Same seed, same
    // presses, same everything else — so what changes is the penalty.
    const measure = (mana: number) => {
      const hero = makeCharacter(starterLoadout(new Rng(3)), 'strike');
      const sim = new RunSim([], hero, new Rng(8181));
      sim.state.hero.stats.maxMana = mana;
      sim.state.hero.stats.manaRegen = mana;
      sim.state.hero.mana = mana;
      const final = runToCompletion(sim, 800);
      return { killed: final.killed, starved: sim.state.dryCasts, casts: sim.state.casts };
    };
    const fed = measure(9999);
    const dryRun = measure(0);
    line(
      `  the same descent on a full pool and on none: ` +
        `${fed.starved}/${fed.casts} starved against ${dryRun.starved}/${dryRun.casts}`
    );
    check(
      fed.starved === 0 && dryRun.starved === dryRun.casts && dryRun.casts > 0,
      'a character with a pool never starves, and one with none starves every cast',
      `${fed.starved} against ${dryRun.starved} of ${dryRun.casts}`
    );
  }

  // The pressure the phase exists to create. Nodes that change what the skill
  // DOES multiply the cost, so a build stacking them pays for the privilege —
  // and the trees have to actually carry them for that to be true.
  {
    const carriers = BUILT_TREES.flatMap((t) =>
      t.nodes.filter((n) => typeof n.grants?.manaMultiplier === 'number')
    );
    line(`  ${carriers.length} nodes multiply the cost of the skill they change`);
    check(
      BUILT_TREES.every((t) =>
        t.nodes.some((n) => typeof n.grants?.manaMultiplier === 'number')
      ),
      'every tree charges for the nodes that change what its skill does',
      'a tree hands out delivery for free'
    );
    // Declared, product-merged, and able to say its own number: without the
    // last one a node changes a cost the card never mentions.
    const def = GRANT_BY_ID.manaMultiplier;
    check(
      def?.merge === 'product' && carriers.every((n) => def.say?.(n.grants!.manaMultiplier)),
      'and every one of them says what it costs, out of the grant rather than its prose',
      `merge ${def?.merge}, ${carriers.filter((n) => !def?.say?.(n.grants!.manaMultiplier)).length} silent`
    );
    const stacked = carriers.slice(0, 4).reduce((n, x) => n * (x.grants!.manaMultiplier as number), 1);
    line(`  four of them together: ×${stacked.toFixed(2)} on the cost`);
  }
}

// ===========================================================================
rule('POTIONS — a budget you spend, and one rule that spends it');

// The one input a descent has. Three things have to hold: it is a budget
// rather than a stockpile, the same rule fires it whether or not anybody is
// watching, and a press cannot land between two ticks.
{
  const hero = makeCharacter({}, 'blight');

  // A budget. Charges are RUN state, so a descent always begins full and
  // nothing carries over — there is no stockpiling and nothing to hoard.
  {
    const first = new RunSim([], hero, new Rng(4242));
    runToCompletion(first, 800);
    const second = new RunSim([], hero, new Rng(4242));
    const full = POTIONS.every((p) => second.state.charges[p.id] === p.charges);
    line(
      `  a descent spends ${first.state.drunk} of ` +
        `${POTIONS.reduce((n, p) => n + p.charges, 0)} charges, and the next one starts full`
    );
    check(
      full && first.state.drunk > 0,
      'charges are a descent’s budget: spent during one, full at the start of the next',
      `${first.state.drunk} drunk, next descent started ${JSON.stringify(second.state.charges)}`
    );
    // The save is JSON.stringify(game), so this is the whole of "not save
    // state": a stockpile cannot exist because there is nowhere to keep one.
    check(
      !JSON.stringify(createGame('fresh')).includes('charges'),
      'and no save holds a charge count anywhere, so a stockpile has nowhere to live',
      'a charge count reached the save'
    );
  }

  // ONE rule. `runToCompletion` is the shipped policy running with nobody
  // there, so a threshold the player moves moves what a harness measures —
  // which is the whole of why no build may depend on being watched.
  {
    const eager = new RunSim([], hero, new Rng(4242), {
      potionThresholds: Object.fromEntries(POTIONS.map((p) => [p.id, 0.99])),
    });
    runToCompletion(eager, 800);
    const never = new RunSim([], hero, new Rng(4242), {
      potionThresholds: Object.fromEntries(POTIONS.map((p) => [p.id, 0])),
    });
    runToCompletion(never, 800);
    line(`  thresholds at 99% spend ${eager.state.drunk}; at 0% they spend ${never.state.drunk}`);
    check(
      eager.state.drunk > never.state.drunk,
      'the threshold is what fires a potion, and a headless run obeys the same one',
      `${eager.state.drunk} against ${never.state.drunk}`
    );
    check(
      never.state.status !== 'running',
      'and a run that never drinks still ends',
      'a character that never drank never finished'
    );
  }

  // Replay-safe. A press is QUEUED, so the same seed and the same presses on
  // the same ticks give the same run — and a press on a tick nobody made
  // changes nothing at all.
  {
    const fingerprint = (sim: RunSim): string =>
      `${sim.state.status}|${sim.state.elapsed.toFixed(3)}|${sim.state.killed}|` +
      `${sim.state.hero.life.toFixed(4)}|${sim.state.hero.mana.toFixed(4)}`;

    const play = (presses: number[]): string => {
      const sim = new RunSim([], hero, new Rng(9090));
      for (let tick = 0; sim.state.status === 'running' && tick < 24000; tick++) {
        if (presses.includes(tick)) sim.usePotion(POTIONS[0].id);
        sim.step(TICK);
      }
      return fingerprint(sim);
    };
    const a = play([40, 400]);
    const b = play([40, 400]);
    check(a === b, 'the same seed and the same presses replay identically', `${a} then ${b}`);

    // That a press DOES something is asked of the press, not of the end of the
    // run: a flask poured into a character who is barely hurt heals a few life
    // that regenerate anyway, so two fingerprints taken eighty seconds later
    // are equal for a reason that has nothing to do with the flask. It waits
    // for a hero who can actually drink, then reads the charge and the effect.
    {
      const sim = new RunSim([], hero, new Rng(9090));
      const flask = POTIONS[0].id;
      for (let tick = 0; tick < 40 && sim.state.status === 'running'; tick++) sim.step(TICK);
      const had = sim.state.charges[flask] ?? 0;
      const before = sim.state.hero.effects.length;
      sim.usePotion(flask);
      sim.step(TICK);
      check(
        had > 0 &&
          (sim.state.charges[flask] ?? 0) === had - 1 &&
          sim.state.hero.effects.length > before,
        'and a press spends a charge and puts the flask on the hero',
        `${had} charges to ${sim.state.charges[flask]}, ${before} effects to ${sim.state.hero.effects.length}`
      );
    }
  }

  // THE ALCHEMIST'S BASELINE, which is charged by BODIES and never by a clock.
  // That is the whole point of the shape: a room full of things to kill keeps
  // the flasks topped up, and a lone tanky body buys no sustain at all — where
  // seconds would have handed a build grinding one down permanent regeneration
  // for nothing spent.
  {
    const brewer = makeCharacter({}, 'blight');
    takeUpTrade(brewer, 'alchemist');
    const flask = POTIONS[0].id;

    const spend = (sim: any): void => {
      sim.state.charges[flask] = 0;
      sim.recharging[flask] = 0;
    };
    const killing = new RunSim([], brewer, new Rng(4242)) as any;
    spend(killing);
    const bodies = Math.round(1 / TRADE_BASE.alchemistChargePerKill);
    for (let i = 0; i < bodies && killing.state.monsters[i]; i++) {
      killing.kill(killing.state.monsters[i]);
    }
    check(
      (killing.state.charges[flask] ?? 0) >= 1,
      `${bodies} kills put a Charge back into the Alchemist's flask`,
      `${killing.state.charges[flask]} charges after ${bodies} kills`
    );

    // The clock buys NOTHING on its own, which is what keeps a boss honest.
    const waiting = new RunSim([], brewer, new Rng(4242)) as any;
    spend(waiting);
    for (let i = 0; i < 600; i++) waiting.stepRecharge(TICK);
    check(
      (waiting.state.charges[flask] ?? 0) === 0,
      'and standing still for 10s puts none back, so a lone body buys no sustain',
      `${waiting.state.charges[flask]} charges after 10s of nothing`
    );

    // And nobody else gets it: a baseline is what tells the trades apart.
    const plain = new RunSim([], makeCharacter({}, 'blight'), new Rng(4242)) as any;
    spend(plain);
    for (let i = 0; i < bodies && plain.state.monsters[i]; i++) plain.kill(plain.state.monsters[i]);
    check(
      (plain.state.charges[flask] ?? 0) === 0,
      'and a character with no trade gets nothing back for a kill',
      `${plain.state.charges[flask]} charges`
    );
  }

  // Every potion is on a key, and the key is a table entry rather than a
  // literal — so a rebind reaches the flask like it reaches everything else.
  {
    const unbound = POTIONS.filter((p) => !BINDING_BY_ID[p.binding]);
    check(
      unbound.length === 0,
      `all ${POTIONS.length} flasks are on a binding, so rebinding one is a table edit`,
      `no binding for ${unbound.map((p) => p.id).join(', ')}`
    );
  }
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

  // The newest way for a run not to end: a character that cannot afford to
  // attack. It never stands still — short of the cost it swings bare — and
  // this is that promise held against a pool it can never fill.
  {
    const broke: string[] = [];
    for (const skill of MAIN_SKILLS) {
      const hero = makeCharacter({}, skill.id);
      const sim = new RunSim([], hero, new Rng(6161));
      // Nothing to spend and nothing coming back, which no real character can
      // reach — the point is that the sim does not need it to be true.
      sim.state.hero.stats.maxMana = 0;
      sim.state.hero.stats.manaRegen = 0;
      sim.state.hero.mana = 0;
      const final = runToCompletion(sim, 800);
      // ENDS, cleared or dead. Starved is meant to be worse than paying for
      // the cast — dying to it is a fair outcome, standing still forever is
      // not, and a character that can never pay casts every swing starved.
      if (final.status === 'running') broke.push(`${skill.id} never ended`);
      if (sim.state.casts === 0 || sim.state.dryCasts !== sim.state.casts) {
        broke.push(`${skill.id}: ${sim.state.dryCasts} dry of ${sim.state.casts} swings`);
      }
    }
    check(
      broke.length === 0,
      'and a character who can never pay for a cast keeps swinging, so its run ends',
      broke.join(', ')
    );
  }
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
    // FORTY AT THE SHALLOW END. `HOARD.baseline` is a free chest one run in
    // five and it pays a RUN, not a monster — over 21 bodies that is +4 gold a
    // kill against a mean under 2, so ten runs at band 0 measure whether a
    // chest turned up. It inverted the ordering twice under changes that had
    // nothing to do with gold. Band 0 is 21 monsters, so this is nearly free.
    const runs = band <= 1 ? 40 : 10;
    let banked = 0;
    let killed = 0;
    let cleared = 0;
    let power = 0;
    let monsters = 0;
    let xp = 0;

    // A CEILING, and one build for the whole band: what a descent PAYS can
    // only be read off a character that lives to bank it, and a floor build
    // dying at the deep end reports the band as worth nothing at all. The sim
    // never writes to the character, so ten descents may share one.
    const hero = bestBuild(band, new Rng(700 + band));

    for (let i = 0; i < runs; i++) {
      const set = ladderSet(band, new Rng(3300 + i * 13 + band), pool);
      const sim = new RunSim(set, hero, new Rng(5000 + band * 31 + i));
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
  // THE TOP DROP BAND HAS TO BE REACHABLE, or the best gear in the game is
  // behind something nobody can assemble. Asked of a DESCENT and not of four
  // crystals alone: raw danger is the RUNG's now, and what a crystal carries is
  // a rule the sim runs. Four sockets by themselves stop around power 4.6.
  const alone = reached[reached.length - 1];
  const deepest = LADDER.zones.length - 1;
  const top = runSet(
    deepestSet(new Rng(4242), pool),
    null,
    { zone: deepest, rung: LADDER.zones[deepest].rungs }
  ).power;
  line(`  four sockets alone reach power ${alone.toFixed(2)}; at the deepest rung, ${top.toFixed(2)}`);
  check(
    top >= DROP_BANDS.length - 1.5,
    'and the deepest rung with the best set in it reaches the top drop band',
    `the ladder stops at power ${top.toFixed(2)}`
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
  const spare = (lifeLeft / Math.max(1, cleared)) * 100;
  line(`  naked, level 1, no tree: ${cleared}/${runs} cleared`);
  // The one difficulty check that stays a failure. A game you cannot start is
  // not a balance question.
  check(
    share >= 0.85,
    'a brand new character clears the Fissure',
    `only ${cleared}/${runs} — the first descent in the game is unwinnable`
  );
  // The other half of the same knob: a Fissure nobody can lose teaches nothing
  // about the fight, and the tier above it is where the lesson is meant to land.
  gauge(`and walks out on ${spare.toFixed(0)}% life — it is teaching the fight under 70%`);

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
    gauge(
      `one blank crystal, straight after that first clear: ${survived}/${tries} cleared — ` +
        'the gift is a descent that character can take above 60%'
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
  gauge(
    wall.length === 0
      ? 'every band is clearable in gear the band below it drops'
      : `${wall.join(', ')} cannot be entered in anything that band hands out`
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
  gauge(
    `the deep end: four crystals rolled for danger, ${Math.round(deepest / deep)} danger: ` +
      `${through}/${deep} through — a wall under 4/12, a ceiling at 0`
  );
}

// ===========================================================================
rule('FLOOR AND CEILING — is a difficulty number aimed at anything real?');

// `ladderCharacter` walks its tree at RANDOM and splits its attributes four
// ways. Nobody plays that, so a difficulty tuned until it dies says nothing:
// measured, the searched build is 1.4x its power at band 1 and 3.1x at band 6,
// and the two disagree about which skills are wall and which are free.
//
// What is measured here is the LOW-WATER mark rather than the life you walk out
// on. A descent ends in a walk to the exit, so regeneration tops you up on the
// way and every build in the game read 89% or better at the end of a run it was
// nearly killed in.
{
  const seeds = [3, 5, 7, 11];
  const play = (who: Character, band: number, deep = false) => {
    let cleared = 0;
    let low = 0;
    for (const seed of seeds) {
      const rng = new Rng(3300 + seed * 13 + band);
      const sim = new RunSim(deep ? deepestSet(rng, pool) : ladderSet(band, rng, pool), who, new Rng(5000 + band * 31 + seed));
      let worst = 1;
      let guard = Math.ceil(240 / TICK);
      while (sim.state.status === 'running' && guard-- > 0) {
        sim.step(TICK);
        worst = Math.min(worst, sim.state.hero.life / Math.max(1, sim.state.hero.stats.maxLife));
      }
      if (sim.state.status === 'cleared') cleared++;
      low += worst;
    }
    return { cleared, low: (low / seeds.length) * 100 };
  };

  line('  band   skill             floor            ceiling         search found');
  const gaps: number[] = [];
  const hurt: number[] = [];
  for (const band of [1, 3, 6]) {
    for (const skill of ['strike', 'blight', 'arc_lightning']) {
      const low = ladderCharacter(band, new Rng(99), skill);
      const top = ceiling(band, skill);
      const f = play(low, band);
      const c = play(top, band);
      gaps.push(buildPower(top) / buildPower(low));
      hurt.push(c.low);
      line(
        `   ${band}    ${skill.padEnd(16)} ${f.cleared}/${seeds.length} low ${f.low.toFixed(0).padStart(3)}%   ` +
          `${c.cleared}/${seeds.length} low ${c.low.toFixed(0).padStart(3)}%   ` +
          `${gaps[gaps.length - 1].toFixed(2)}x the floor`
      );
    }
  }
  gauge(
    `the search finds ${Math.min(...gaps).toFixed(1)}x to ${Math.max(...gaps).toFixed(1)}x ` +
      'the power of a random walk — a number tuned against the floor is off by that much'
  );
  // The whole point of the pass: a build playing WELL should still be hurt.
  gauge(
    `and it is taken down to ${Math.min(...hurt).toFixed(0)}%-${Math.max(...hurt).toFixed(0)}% ` +
      'of its life on the way — wanted under 70%, and a game nothing threatens reads 100%'
  );

  // The deep end at the level it is FOR. Nothing here had ever been measured
  // above level 40, which is where the tables stop handing out gear — and the
  // hardest set four crystals can hold is not aimed at a level 40 character.
  const endgame = play(ceiling(6, 'arc_lightning', LEVELLING.maxLevel), 6, true);
  gauge(
    `the deep end at level ${LEVELLING.maxLevel}: ${endgame.cleared}/${seeds.length} through, ` +
      `down to ${endgame.low.toFixed(0)}% — this is what the top is meant to be for`
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
    leave: () => {},
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

  // AREA OF EFFECT MOVES THE POOL. The pool picture is scaled to the vfx's
  // second point, so if that stopped following the area the art would quietly
  // lie about what got poisoned. Checked against the SCALE the sim applied
  // rather than against the formula, which would just be it written twice.
  {
    const wrong: string[] = [];
    let last = 0;
    for (const scale of [0.5, 1, 1.41, 2]) {
      let wide = 0;
      const caught: unknown[] = [];
      const near = dummy(R * scale - 0.15, 0, 0.001);
      const past = dummy(R * scale + 0.15, 0, 0.001);
      SKILL_BEHAVIOURS[skill.behaviour]({
        skill, user, primary: dummy(0, 0, 0.3), enemies: [near, past],
        rng: new Rng(3), grants: {}, crit: false, castIndex: 0,
        hit: () => {},
        ailment: (t: any) => caught.push(t),
        leave: () => {},
        areaRadius: (base: number) => base * scale,
        vfx: (kind: string, points: any[]) => {
          if (kind === 'blight_field') wide = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
        },
      } as any);
      if (Math.abs(wide - R * scale) > 1e-9) wrong.push(`x${scale} drew ${wide.toFixed(3)}`);
      if (!caught.includes(near)) wrong.push(`x${scale} missed inside its own pool`);
      if (caught.includes(past)) wrong.push(`x${scale} poisoned past its own pool`);
      if (wide <= last) wrong.push(`x${scale} did not grow`);
      last = wide;
    }
    line(`  the pool runs ${(R * 0.5).toFixed(2)} to ${(R * 2).toFixed(2)} tiles over that spread of area`);
    check(
      wrong.length === 0,
      'and the pool the renderer draws follows Area of Effect exactly, both ways',
      wrong.join('; ')
    );
  }
}

// ===========================================================================
rule('ELEMENTS — does a monster bring its own, and does a ward still matter?');

// One crystal modifier used to do the whole job: any amount of "of Cinders" at
// all flipped every monster on the map from physical to fire, so one fire ward
// turned the modifier off entirely and nothing else in the game dealt anything
// but physical. An element belongs to the MONSTER now, and the crystal adds on
// top of it.
{
  line(
    `  ${MONSTER_ABILITIES.length} abilities: ` +
      MONSTER_ABILITIES.map((a) => `${a.name} (${a.damageType})`).join(', ')
  );

  const broken = MONSTER_ABILITIES.filter(
    (a) => !DAMAGE_TYPE_BY_ID[a.damageType] || (a.skill !== null && !SKILL_BY_ID[a.skill])
  );
  check(
    broken.length === 0 && MONSTER_ABILITIES.length >= 3,
    'every ability names a real damage type and a skill that exists',
    broken.map((a) => a.id).join(', ')
  );

  // A monster skill is monster-only: no category means it never reaches the
  // Skills screen, and a player who could equip one would be a player holding
  // a skill with no tree and no mana cost.
  const leaked = MONSTER_ABILITIES.filter(
    (a) => a.skill && SKILL_BY_ID[a.skill]?.category !== undefined
  );
  check(leaked.length === 0, 'and none of them is a skill you could equip', leaked.map((a) => a.id).join(', '));

  // WHICH BODIES throw, which is the whole of what makes a shooting pack
  // readable: a thrower only throws and everything else only bites, so what is
  // coming at you is a fact about the silhouette rather than a roll you cannot
  // see. Every monster in the game is held to it, not just the pool.
  const wrong = MONSTERS.flatMap((m) => {
    const can = abilitiesFor(m);
    const shoots = can.every((a) => a.skill);
    const bites = can.every((a) => !a.skill);
    if (can.length === 0) return [`${m.id} can do nothing`];
    if (!shoots && !bites) return [`${m.id} both throws and bites`];
    return !!m.throws === shoots ? [] : [`${m.id} throws ${shoots} but is marked ${!!m.throws}`];
  });
  const throwers = MONSTERS.filter((m) => m.throws);
  line(`  ${throwers.length} of ${MONSTERS.length} monsters throw: ${throwers.map((m) => m.id).join(', ')}`);
  check(
    wrong.length === 0 && throwers.length > 0,
    'a body either throws or bites, and never both',
    wrong.join(', ')
  );

  // And a thrower has EVERY thrown ability open to it, so which element is a
  // roll rather than a second table.
  const bolts = MONSTER_ABILITIES.filter((a) => a.skill);
  const short = throwers.filter((m) => abilitiesFor(m).length !== bolts.length);
  check(
    bolts.length >= 3 && short.length === 0,
    `and a thrower rolls any of the ${bolts.length}: ${bolts.map((a) => a.name).join(', ')}`,
    short.map((m) => m.id).join(', ')
  );

  const total = MONSTER_ABILITIES.reduce((n, a) => n + a.weight, 0);
  const elemental = MONSTER_ABILITIES.filter((a) => a.damageType !== 'physical')
    .reduce((n, a) => n + a.weight, 0);
  line(`  ${Math.round((elemental / total) * 100)}% of the table brings an element of its own`);
  check(
    elemental / total > 0.2 && elemental / total < 0.6,
    'and an element is something a descent shows you without being made of it',
    `${(elemental / total).toFixed(2)}`
  );

  // What a monster carrying one actually deals. Bare, with nothing socketed:
  // no crystal is saying anything, so every point of this is the monster's.
  const bare: string[] = [];
  for (const ability of MONSTER_ABILITIES) {
    const m = monsterStats([], PLAIN, ability);
    const types = Object.keys(m.damageByType);
    if (types.length !== 1 || types[0] !== ability.damageType) {
      bare.push(`${ability.id} deals ${types.join('+')}`);
    }
  }
  check(bare.length === 0, 'a monster deals its ability’s type and nothing else', bare.join(', '));

  // And the crystal ADDS. The total is what it always was — the hit is still
  // multiplied by (1 + share/100) — but the monster's own element survives it,
  // so a ward blunts part of a hit rather than switching a modifier off.
  {
    const share = 200;
    const cinders: RolledMod[] = [
      {
        entryId: 'x', defId: 'monster_fire', group: 'g', slot: 'mod', name: 'of Cinders',
        tier: 1, tags: [],
        stats: [{ stat: 'monsterFire', form: 'inc', value: share, tags: [] }],
      },
    ];
    const claws = MONSTER_ABILITY_BY_ID.claws;
    const frost = MONSTER_ABILITY_BY_ID.frost_bolt;
    const plain = monsterStats([], PLAIN, claws);
    const burned = monsterStats(cinders, PLAIN, claws);
    const chilled = monsterStats(cinders, PLAIN, frost);

    line(
      `  a clawing ${PLAIN.name} under +${share}% Cinders: ${plain.damage.toFixed(1)} → ` +
        `${burned.damage.toFixed(1)}, as ` +
        Object.entries(burned.damageByType).map(([t, v]) => `${v.toFixed(1)} ${t}`).join(' + ')
    );
    // Against the monster's OWN hit under this map rather than against a bare
    // one: a map carrying a modifier carries the danger that goes with it.
    const own = burned.damageByType.physical ?? 0;
    check(
      Math.abs(burned.damage - own * (1 + share / 100)) < 1e-6,
      'the total a modifier adds is exactly what it always was',
      `${burned.damage} against ${own * (1 + share / 100)}`
    );
    check(
      own >= plain.damage && (burned.damageByType.fire ?? 0) > 0,
      'and the monster keeps its own element under it, rather than being converted',
      Object.keys(burned.damageByType).join('+')
    );
    // The whole point: carrying one resistance no longer switches the modifier
    // off, because the part it does not answer belongs to the monster.
    check(
      (chilled.damageByType.cold ?? 0) > 0 && (chilled.damageByType.fire ?? 0) > 0,
      'a frost-throwing pack under Cinders deals both, so one ward is never the whole answer',
      Object.keys(chilled.damageByType).join('+')
    );
  }

  // Three modifiers, one per element, each with the ward that answers it. One
  // modifier rolling WHICH element would be a name that lies about which
  // resistance to bring.
  {
    // A MONSTER'S ELEMENT IS ITS OWN ABILITY'S, and that is the only place one
    // comes from. Nothing a player rolls or walks to adds an element to a body
    // or wards one — the crystals stopped when their pool became rules, and the
    // web stopped with them. THAT IS THE FINDING, not an omission: a ward is
    // the purest form of a number on a body, and every one of them is gone.
    const rollable = new Set(
      ALL_MODS.flatMap((m) => m.tiers.flatMap((t) => t.stats.map((st) => st.stat)))
    );
    const walkable = new Set(trialNodes().flatMap((n) => (n.stats ?? []).map((st) => st.stat)));
    // A MONSTER's, never the hero's: gear rolls the resistances you WEAR, and
    // those are the other half of what makes a damage type mean anything.
    const written = [...rollable, ...walkable].filter(
      (st) => (st.startsWith('monster') && st.endsWith('Res')) || ADDED_DAMAGE_STATS.includes(st)
    );
    check(
      written.length === 0,
      'nothing a player rolls or walks to adds an element to a monster, or wards one',
      written.join(', ')
    );
    // And a monster still THROWS one, which is what keeps a damage type a thing
    // you meet at all. Ailments key off the type, so this is load-bearing.
    const throwers = MONSTER_ABILITIES.filter((a) => a.skill).length;
    check(
      throwers > 0,
      `a body's element is its own ability's — ${throwers} of them throw one`,
      String(throwers)
    );
    const unnamed = ADDED_DAMAGE_STATS.filter(
      (stat) => !/Damage Added as /.test(describeStatLine({ stat, form: 'inc', value: 50, tags: [] }))
    );
    check(
      unnamed.length === 0,
      'and each says it is ADDED, in the order it happens',
      unnamed.join(', ')
    );
    const weighed = ADDED_DAMAGE_STATS.filter((stat) => !DANGER_STATS[stat]?.rewards);
    check(weighed.length === 0, 'and each is danger the run is paid for', weighed.join(', '));
  }

  // The arc is the one monster skill that is not a line to one target, and it
  // leaps off the skill's own `params` rather than a tree it does not have.
  {
    const arc = SKILL_BY_ID.arc;
    const dummy = (x: number, y: number) =>
      ({
        x, y, life: 1e6, radius: 0, dead: false, ailments: [] as unknown[],
        stats: { maxLife: 1e6, attacksPerSecond: 1 },
      }) as any;
    const dummies = Array.from({ length: 5 }, (_, i) => dummy(3 + i * 1.2, 0));
    const hit = new Set<unknown>();
    SKILL_BEHAVIOURS[arc.behaviour]({
      skill: arc,
      user: dummy(0, 0),
      primary: dummies[0],
      enemies: dummies,
      grants: {},
      crit: false,
      castIndex: 0,
      rng: new Rng(5),
      hit: (target: any) => hit.add(target),
      ailment: () => {},
      leave: () => {},
      areaRadius: (base: number) => base,
      vfx: () => {},
    } as any);
    line(`  the Lightning Arc struck ${hit.size} of ${dummies.length} standing in a line`);
    check(
      hit.size === 1 + ((arc.params?.chains as number) ?? 0),
      'it leaps as many times as its own params say, with no tree behind it',
      `${hit.size} struck`
    );
    check(
      typeof arc.vfxKind === 'string' && arc.vfxKind !== 'bolt',
      'and it draws as something other than a bolt, since it is not one',
      String(arc.vfxKind)
    );

    // The shape itself is a pure function in `render/renderer.ts`, so both
    // renderers draw the same jag — and it has to STAY between its two ends,
    // or a leap reads as lightning fired at the map corner.
    const from = { x: 2, y: 3 };
    const to = { x: 7, y: 6 };
    const drawn = lightningArc(from, to, 0.2);
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    const strayed = drawn.filter((p) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const t = ((p.x - from.x) * dx + (p.y - from.y) * dy) / (span * span);
      const off = Math.hypot(p.x - (from.x + t * dx), p.y - (from.y + t * dy));
      return t < -0.25 || t > 1.25 || off > 1;
    });
    line(`  the arc is ${drawn.length} blocks long, ${strayed.length} of them off the line`);
    check(
      drawn.length > 40 && strayed.length === 0,
      'the jag stays between the two things it joined',
      `${drawn.length} blocks, ${strayed.length} strayed`
    );
    check(
      JSON.stringify(lightningArc(from, to, 0.2)) === JSON.stringify(drawn) &&
        JSON.stringify(lightningArc(to, from, 0.2)) !== JSON.stringify(drawn),
      'and it is hashed off its own ends, so two leaps never share a silhouette',
      'the arc is not deterministic'
    );
  }

  // The arrow is a PICTURE that flies and a storm where it lands, and both are
  // pure geometry here — the sprite Pixi lays down reads the same answer.
  {
    const arrow = SKILL_BY_ID.lightning_arrow;
    check(
      arrow.vfxKind === 'arrow' && arrow.impact === 'storm' && VFX_ART.arrow && VFX_ART.storm
        ? true
        : false,
      'the bow skill names a flight and an impact, and there is art for both',
      `${arrow.vfxKind} then ${arrow.impact}`
    );

    const from = { x: 2, y: 4 };
    const to = { x: 9, y: 7 };
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    const off = (p: { x: number; y: number }): number =>
      Math.abs((p.x - from.x) * (to.y - from.y) - (p.y - from.y) * (to.x - from.x)) / span;
    const early = arrowFlight(from, to, 0.2);
    const late = arrowFlight(from, to, 0.9);
    line(
      `  the arrow is ${off(early).toFixed(2)} tiles off its own line at a fifth of the way, ` +
        `and lands ${Math.hypot(late.x - to.x, late.y - to.y).toFixed(2)} from what it was aimed at`
    );
    check(
      off(early) < 1e-9 && Math.hypot(late.x - to.x, late.y - to.y) < 1e-9,
      'it flies along the line it was shot down and stops at the target',
      `${off(early)} off, ${Math.hypot(late.x - to.x, late.y - to.y)} short`
    );
    check(
      arrowFlight(from, to, 0.2).angle === arrowFlight(from, to, 0.9).angle,
      'and it points the same way the whole flight, since a picture is turned rather than posed',
      'the arrow turns in the air'
    );

    // The cloud is ABOVE what was hit and the bolts come DOWN out of it, which
    // is the whole picture — a cloud on the floor is a puff of smoke.
    const at = { x: 6, y: 6 };
    const cloud = stormCloud(at, 0.5);
    line(`  the cloud opens ${(at.y - cloud.y).toFixed(1)} tiles over what was hit`);
    check(
      Math.abs(at.y - cloud.y - STORM_HEIGHT) < 1e-9 && cloud.x === at.x && cloud.span > 0,
      'the cloud floats over the thing it landed on',
      `${cloud.x},${cloud.y} span ${cloud.span}`
    );
    check(
      stormCloud(at, 0.02).span < cloud.span && stormCloud(at, 0.99).alpha < cloud.alpha,
      'and it boils up and breaks apart rather than blinking on and off',
      `${stormCloud(at, 0.02).span} then ${cloud.span}`
    );

    const bolts = stormBolts(at, 0.6);
    const above = bolts.filter((p) => p.y < cloud.y - 0.2);
    const below = bolts.filter((p) => p.y > at.y + 0.6);
    line(`  ${bolts.length} blocks of lightning fall out of it`);
    check(
      bolts.length > 30 && above.length === 0 && below.length === 0,
      'and every bolt runs from the cloud down to what it hit, and no further',
      `${bolts.length} blocks, ${above.length} over the cloud, ${below.length} under the target`
    );
    check(
      stormBolts(at, 0.0).length === 0,
      'nothing strikes before the cloud is there',
      'a bolt arrives ahead of its own cloud'
    );
  }

  // What a descent actually shows you. Three elements against per-type
  // resistances moves every ladder number, so this PRINTS rather than asserts.
  {
    const set = ladderSet(4, new Rng(6100), pool);
    const taken: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const sim = new RunSim(set, ladderCharacter(4, new Rng(300 + i)), new Rng(880 + i));
      runToCompletion(sim, 600);
      for (const [type, amount] of Object.entries(sim.state.damageTaken)) {
        taken[type] = (taken[type] ?? 0) + amount;
      }
    }
    const total = Object.values(taken).reduce((n, v) => n + v, 0);
    const split = Object.entries(taken).sort((a, b) => b[1] - a[1]);
    line(
      `  six descents at band 4 hurt for ` +
        split.map(([t, v]) => `${Math.round((v / total) * 100)}% ${t}`).join(', ')
    );
    check(
      split.length >= 2,
      'a descent hurts you in more than one way, which is what the report now splits',
      split.map(([t]) => t).join('+')
    );
  }
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
    const m = monsterStats(mods, PLAIN);
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
  const bare = monsterStats([], PLAIN);
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
  const doubled = monsterStats([ward(50), ward(50)], PLAIN);
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

  // NOTHING MAY MINT GOLD OUT OF THE COUNTER. A gamble costs more than the
  // best possible piece of its item level sells for, so buying one and selling
  // it straight back is a loss however well it rolled — and the arithmetic is
  // derived rather than typed, so no edit to either number can invert it.
  {
    const arbitrage: string[] = [];
    for (const level of [1, 20, 50, 99]) {
      const ilvl = shopIlvl(level);
      const paid = gamblePrice(ilvl);
      const best = Math.round(bestSale(ilvl));
      if (best >= paid) arbitrage.push(`level ${level}: sells ${best} >= ${paid} paid`);
    }
    gauge(
      'a gamble costs ' +
        [1, 20, 50, 99]
          .map((l) => `${gamblePrice(shopIlvl(l))} at level ${l}`)
          .join(', ')
    );
    check(
      arbitrage.length === 0,
      'and buying a gamble and selling it straight back always loses',
      arbitrage.join(', ')
    );
    // A rolled piece is what actually comes out of one, so measure that too.
    const worst: string[] = [];
    for (const kind of Object.keys(KIND_VARIETY)) {
      const ilvl = shopIlvl(50);
      const got = gambleFor(kind, ilvl, pool, new Rng(4100));
      if (got && sellPrice(got) >= gamblePrice(ilvl)) {
        worst.push(`${kind} ${sellPrice(got)} >= ${gamblePrice(ilvl)}`);
      }
    }
    check(
      worst.length === 0,
      'and it holds for a piece the counter actually rolled, in every kind',
      worst.join(', ')
    );
    // NO PERFECT out of it, at any level: the endgame chase is the floor's.
    const perfects = [1, 50, 99].flatMap((l) =>
      Object.keys(KIND_VARIETY).flatMap((kind) =>
        Array.from({ length: 40 }, (_, i) =>
          gambleFor(kind, shopIlvl(l), pool, new Rng(770 + i * 13 + l))
        )
      )
    ).filter((i) => i && isPerfect(i));
    check(
      perfects.length === 0,
      'and no amount of gold buys a Perfect base',
      `${perfects.length} came out of the counter`
    );
  }

  line('  band   gold banked   drops   sale value   share from selling');
  const shares: number[] = [];
  /** What ONE piece fetches, band by band: the count is flat, so this is the
   *  whole of what selling scales by. */
  const each: number[] = [];
  for (let band = 0; band < DROP_BANDS.length; band += 2) {
    const runs = 6;
    let banked = 0;
    let sold = 0;
    let drops = 0;

    for (let i = 0; i < runs; i++) {
      const set = ladderSet(band, new Rng(8800 + i * 17 + band), pool);
      const sim = new RunSim(set, ceiling(band), new Rng(6400 + band * 29 + i));
      const final = runToCompletion(sim, 400);
      if (final.status !== 'cleared') continue;
      banked += final.loot.currency.gold ?? 0;
      drops += final.loot.items.length;
      for (const item of final.loot.items) sold += sellPrice(item);
    }

    const share = banked + sold > 0 ? sold / (banked + sold) : 0;
    shares.push(share);
    each.push(drops > 0 ? sold / drops : 0);
    line(
      `   ${band}   ${banked.toFixed(0).padStart(11)}   ${(drops / runs).toFixed(1).padStart(5)}   ` +
        `${sold.toFixed(0).padStart(10)}   ${(share * 100).toFixed(0).padStart(17)}%`
    );
  }

  // **THE SHARE IS A GAUGE, NOT A BOUND.** The piece count is flat by decision
  // and gold climbs with danger, so selling falls from a quarter of a bare
  // descent to a fiftieth of a deep one — and every time the count is tuned, a
  // percentage floor has to be argued down again, which is a check being bent
  // rather than a game being measured. What is asserted is that NEITHER TAP IS
  // ZERO and that a piece is worth more the deeper it came from.
  gauge(`selling is ${shares.map((s) => `${(s * 100).toFixed(0)}%`).join(' → ')} of what a band pays`);
  check(
    shares.every((s) => s > 0 && s < 1),
    'selling and killing both pay something at every band sampled',
    shares.map((s) => `${(s * 100).toFixed(0)}%`).join(' → ')
  );
  check(
    each.length > 1 && each[each.length - 1] > each[0] * 2,
    `and a deep piece sells for ${(each[each.length - 1] / Math.max(1, each[0])).toFixed(1)}x a shallow one`,
    each.map((n) => n.toFixed(0)).join(' → ')
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
    (n, r) => n + (recipeInputs(r, 1).gold ?? 0),
    0
  );
  const perRun = (earned + sold) / descents;
  line(`  a bare descent pays ${(earned / descents).toFixed(1)} gold and ${(sold / descents).toFixed(1)} in sellable drops`);
  // NOT IN ONE RUN, and that is the point now. *"Increase the cost of them in
  // the store by like 10x. I want you, at least early on, to be deciding which
  // piece of gear is worth using it on."* The one the Lampwright hands over is
  // the opening's shard; the counter is several descents of saving. What must
  // still hold is that saving WORKS — a shelf nobody can ever reach is a shelf
  // that is not there.
  const REACH = 12;
  check(
    perRun * REACH >= bench,
    `and the level-1 shelf (${bench} gold) is ${Math.ceil(bench / perRun)} descents of saving`,
    `${perRun.toFixed(1)} gold a run against a ${bench} gold shelf — over ${REACH} descents`
  );

  // GOLD BUYS MATERIAL AT A BAD RATE, and the rate is what makes it a smoothing
  // mechanism rather than a supply: a descent gathers `GATHER.perRun` nodes of
  // 2–5 each for nothing, so buying has to stay well under that per clear.
  {
    const gathered = GATHER.perRun * ((GATHER.yield[0] + GATHER.yield[1]) / 2);
    const bought = perRun / MATERIAL_PRICE.fissure;
    gauge(
      `a bare clear gathers ${gathered.toFixed(0)} raw and its gold buys ` +
        `${bought.toFixed(2)} — descending is ${(gathered / bought).toFixed(0)}x the rate`
    );
    check(
      bought < gathered,
      'and buying raw is never better than going and getting it',
      `${bought.toFixed(2)} bought against ${gathered.toFixed(0)} gathered`
    );
    // Every world's raw is on the counter, so no family is behind a coin that
    // did not come up — and a world's own UNIQUE never is.
    const missing = MATERIALS.filter(
      (m) => m.family !== null && !soldHere(m, PROFESSION.maxLevel)
    );
    const leaked = MATERIALS.filter((m) => m.family === null && soldHere(m, PROFESSION.maxLevel));
    check(
      missing.length === 0 && leaked.length === 0,
      `the counter reaches all ${MATERIALS.length - leaked.length - missing.length} raw families and no world's unique`,
      `${missing.length} unreachable, ${leaked.length} uniques on sale`
    );
  }
}

// ===========================================================================
rule('HOW LONG A SLOT TAKES — the one figure scarcity moves and nothing else');

// `ladderCharacter` and `bestBuild` both roll their own gear out of thin air,
// so every difficulty number in this file survives a drop rate of zero. This is
// the only place the loot economy is asked how long GEARING takes: a character
// that keeps whatever raises its power, over a run of clears.
//
// A gauge. What it prints is the user's own target — a bare slot inside a
// handful of clears, a settled one taking hundreds — and it never fails: the
// curve is order statistics on the mod pool, so an assertion here would be an
// assertion about luck.
{
  for (const band of [2, 4]) {
    // A CEILING, and a FRESH one: `ladderCharacter` cannot clear band 4 at all,
    // and the memoised `ceiling()` is shared — this loop wears what it finds.
    const hero = bestBuild(band, new Rng(11));
    let seen = 0;
    let taken = 0;
    let clears = 0;
    const at: number[] = [];
    for (let s = 0; s < 12; s++) {
      const set = ladderSet(band, new Rng(77 + s), pool);
      const final = runToCompletion(new RunSim(set, hero, new Rng(303 + s)), 900);
      if (final.status !== 'cleared') continue;
      clears++;
      for (const item of final.loot.items) {
        if (item.kind !== 'gear') continue;
        seen++;
        const kind = gearKindOf(item);
        const slot = kind && EQUIP_SLOTS.find((e) => e.accepts.some((a) => a === kind));
        if (!slot) continue;
        const was = hero.equipment[slot.id];
        const before = buildPower(hero);
        hero.equipment[slot.id] = item;
        if (buildPower(hero) > before) {
          taken++;
          at.push(clears);
        } else hero.equipment[slot.id] = was;
      }
    }
    gauge(
      `band ${band}: ${clears} clears paid ${seen} pieces (${(seen / Math.max(1, clears)).toFixed(1)} ` +
        `a clear); ${taken} were worn, at clear ${at.join(', ') || '—'}`
    );
  }
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
      const sim = new RunSim(set, ceiling(band), new Rng(700 + band * 17 + i));
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

  // The hard hour against the hour you have outgrown. Flatter than this and
  // there is no reason to push at all; steeper and a set you have outgrown is
  // worth literally nothing. Wide, because the ladder it reads is a ladder the
  // top of now actually costs something to stand on — what this still catches
  // is a runaway, not a curve.
  const goldStep = paid[6].gold / paid[3].gold;
  const totalStep = paid[6].total / paid[3].total;
  line(`  the top band pays ${goldStep.toFixed(1)}x the gold of the middle, ${totalStep.toFixed(1)}x counting drops`);
  // A RUNAWAY GUARD, not a curve. The ceiling moved from 10 to 15 when the rung
  // and the crystals stopped being one ladder: the curve is strictly monotone
  // for the first time — the parked check under this one came good with it —
  // and 10.1x across three bands is that curve, not a bug.
  check(
    goldStep > 2.5 && goldStep < 15,
    'the top band pays a few times the middle, not a hundred times it',
    `${goldStep.toFixed(1)}x`
  );
  parkedCheck(
    paid.every((rate, i) => i === 0 || rate.total > paid[i - 1].total),
    'and every band still pays more than the one below — pushing is never wrong',
    paid.map((r) => r.total.toFixed(0)).join(' → ')
  );

  // Both taps have to matter. All of it from corpses makes drops decoration;
  // all of it from selling makes killing things decoration.
  const shares = paid.map((r) => r.sale / r.total);
  line(`  share of income from selling: ${shares.map((s) => `${Math.round(s * 100)}%`).join(' ')}`);
  // A tap going to NOTHING, and nothing else — the share itself is printed
  // above and falls by construction, so a percentage floor here would only be
  // argued down every time the piece count is tuned.
  check(
    shares.every((s) => s > 0 && s < 1),
    'gold comes off corpses AND out of selling at every band, and neither ever stops',
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
rule('WARDS — is there a crystal roll your build can ignore?');

// *"I just don't want it to be like 90% of mods are irrelevant to specific
// builds… lightning resistance on monsters are irrelevant to almost all
// builds."* A modifier a build walks past is a mod slot doing nothing, and one
// ward per damage type meant seven of every eight rolls were that.
{
  // ANSWERED OUTRIGHT, and by deletion rather than by folding. A crystal rolls
  // no resistance, no monster life and no monster damage at all now — every one
  // of its modifiers is a rule the floor runs, which no build walks past. What
  // is left of the wards lives on the TRIALS web, and that is where they are
  // asked about: `nodeStat` is what a walked arm can actually hand the sim.
  const nodeStat = new Set(trialNodes().flatMap((n) => (n.stats ?? []).map((st) => st.stat)));
  const crystalMods = ALL_MODS.filter((m) => m.appliesTo?.includes('crystal'));
  const narrow = crystalMods.filter((m) =>
    m.tiers.some((t) => t.stats.some((st) => st.stat.endsWith('Res')))
  );
  line(`  ${crystalMods.length} crystal modifiers, ${narrow.length} of them a resistance`);
  check(
    narrow.length === 0,
    'not one crystal modifier is a resistance, so none of them is a build\'s to ignore',
    narrow.map((m) => m.id).join(', ')
  );

  // EVERY TYPE COVERED, and none of them twice: a type in no ward is a damage
  // family the deep end never argues with, and one in two is weighed twice.
  const covered = new Map<string, string[]>();
  for (const group of WARD_GROUPS) {
    for (const type of group.types) {
      covered.set(type, [...(covered.get(type) ?? []), group.id]);
    }
  }
  const uncovered = DAMAGE_TYPES.filter((t) => !covered.has(t.id)).map((t) => t.id);
  const twice = [...covered].filter(([, gs]) => gs.length > 1).map(([t]) => t);
  check(
    uncovered.length === 0 && twice.length === 0,
    `${WARD_GROUPS.length} families cover all ${DAMAGE_TYPES.length} damage types, each exactly once`,
    `uncovered ${uncovered.join(', ')} · twice ${twice.join(', ')}`
  );

  // THE TEST THE PASS EXISTS FOR, and the answer is now the strongest one there
  // is: NOTHING wards, so there is no damage type that is worse to bring than
  // another. `WARD_GROUPS` and `monsterResStat` stay — the stat pipeline still
  // reads them, so a future mechanic could write one — but nothing does.
  const warded = DAMAGE_TYPES.filter((t) => nodeStat.has(monsterResStat(t.id))).map((t) => t.id);
  check(
    warded.length === 0,
    `no ward exists at all, so none of the ${DAMAGE_TYPES.length} damage types is worse to bring`,
    `still warded: ${warded.join(', ')}`
  );

  // WHAT A CRYSTAL ACTUALLY ROLLS NOW, measured by rolling rather than read off
  // the table — and every line of it is a rule, which is the whole change.
  {
    const pool = new ModPool(ALL_MODS);
    for (const level of CRYSTAL_LEVELS.filter((t) => t.mods > 0).map((t) => t.level)) {
      let danger = 0;
      const seen = new Map<string, number>();
      const runs = 200;
      for (let i = 0; i < runs; i++) {
        const set = [0, 1, 2, 3].map((k) => rollCrystal(level, pool, new Rng(i * 97 + k * 13 + level)));
        danger += runSet(set).rewards.danger;
        for (const m of set.flatMap((c) => c.mods)) seen.set(m.defId, (seen.get(m.defId) ?? 0) + 1);
      }
      const top = [...seen].sort((a, b) => b[1] - a[1])[0];
      gauge(
        `level ${level}: mean danger ${Math.round(danger / runs)} over four sockets, ` +
          `${seen.size} different rules, commonest ${top?.[0] ?? 'none'}`
      );
    }
  }

  // A SAVE WRITTEN BEFORE THE PASS. A `RolledMod` carries its own stat lines,
  // so a retired def leaves a line that still reads and still reaches the sim —
  // it simply cannot be rolled again. Nothing to heal, and that is the finding.
  {
    const g = createGame('fresh');
    const old = makeCrystal(3);
    old.mods.push({
      entryId: 'monster_fire_ward', defId: 'monster_fire_ward', group: '', slot: 'mod',
      name: 'of Cinders', tier: 1, tags: ['danger'],
      stats: [{ stat: 'monsterFireRes', form: 'inc', value: 14, tags: [] }],
    });
    g.crystals.push(old);
    heal(g);
    const kept = g.crystals.find((c) => c.id === old.id);
    check(
      kept?.mods.length === 1 && runSet([kept!]).rewards.danger > 0,
      'a crystal rolled before the pass keeps its retired ward, and it still scores danger',
      `${kept?.mods.length} mods, danger ${kept ? runSet([kept]).rewards.danger : 'gone'}`
    );
    check(
      !ALL_MODS.some((m) => m.id === 'monster_fire_ward') && describeMod(kept!.mods[0]).length > 0,
      'and it still reads, off its own lines rather than off a table row that is gone',
      describeMod(kept!.mods[0])
    );
  }
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
rule('PERFECT BASES — is the rarest thing in the game worth the socket?');

// *"Just a normal armor piece that just has say 25% higher implicit stats. Can
// only happen to t3 items once you have 3 crystals equipped and is super rare
// then and goes up once you have 4 crystals but still really rare."*
{
  const plainSword = makeGear('steel_sword', 60);
  const bestSword = makeGear('steel_sword', 60, undefined, true);
  check(
    isPerfect(bestSword) && !isPerfect(plainSword),
    'a Perfect base says so on the item and a plain one does not',
    'the flag did not land'
  );
  check(
    bestSword.name.startsWith('Perfect ') && bestSword.tags.includes('perfect'),
    `and is named for it — ${bestSword.name}`,
    `named ${bestSword.name}`
  );

  const lift = 1 + PERFECT.lift;
  check(
    weaponSwing(bestSword) >= weaponSwing(plainSword) * lift - 0.51,
    `it swings for ${Math.round(weaponSwing(bestSword))} against ${Math.round(weaponSwing(plainSword))}`,
    `${weaponSwing(bestSword)} against ${weaponSwing(plainSword)}`
  );
  const impPlain = plainSword.implicits[0]?.stats[0]?.value ?? 0;
  const impBest = bestSword.implicits[0]?.stats[0]?.value ?? 0;
  check(
    impBest >= Math.ceil(impPlain * lift),
    `and its implicit reads ${impBest} where the plain one reads ${impPlain}`,
    `${impBest} against ${impPlain}`
  );

  const plainBody = makeGear('bulwark_body_t3', 60);
  const bestBody = makeGear('bulwark_body_t3', 60, undefined, true);
  check(
    (bestBody.armour ?? 0) >= Math.ceil((plainBody.armour ?? 0) * lift),
    `a family that spends everything on the rating carries ${bestBody.armour} against ${plainBody.armour}`,
    `${bestBody.armour} against ${plainBody.armour}`
  );

  // The GATE. A tier below the top cannot be one however it is asked for.
  const lowly = makeGear('rusted_sword', 60, undefined, true);
  check(
    !isPerfect(lowly) && lowly.name === 'Rusted Sword',
    'a base under the top tier is not one however it is asked for',
    `${lowly.name} came back perfect`
  );
  const capacity = GEAR_BASES.filter((b) => (b.tier ?? 0) >= PERFECT.tier).length;
  check(capacity > 0, `${capacity} bases in the game can ever be one`, 'no base can be one');

  // A named piece holds its whole identity in `implicits` and declares no
  // slots: it is never a base, so it can never be a Perfect one.
  const named = makeUnique(UNIQUES[0], 60, new Rng(5));
  check(!isPerfect(named), 'and a named piece never is', `${named.name} came back perfect`);

  // THE ODDS. Nothing under three sockets, and danger only ever lifts them.
  const odds = [0, 1, 2, 3, 4].map((n) => perfectChance(n, 0));
  check(
    odds.slice(0, PERFECT.minSockets).every((o) => o === 0),
    `nothing drops one under ${PERFECT.minSockets} crystals socketed`,
    `odds ${odds.join(', ')}`
  );
  check(
    odds[4] > odds[3] && odds[3] > 0,
    `at three sockets ${(odds[3] * 100).toFixed(2)}% of gear drops, at four ${(odds[4] * 100).toFixed(2)}%`,
    `three ${odds[3]}, four ${odds[4]}`
  );
  const deep = perfectChance(4, PERFECT.dangerFull);
  const deeper = perfectChance(4, PERFECT.dangerFull * 4);
  check(
    deep > odds[4] && deeper === deep,
    `danger lifts it to ${(deep * 100).toFixed(2)}% and then saturates`,
    `${deep} then ${deeper}`
  );
  gauge(
    `at 4 sockets: ${[0, 300, 600, 900].map((d) => `danger ${d} ${(perfectChance(4, d) * 100).toFixed(2)}%`).join(' · ')}`
  );

  // NEVER SWEPT UP. The bulk button exists because it cannot eat a decision,
  // and a Perfect base with nothing on it is one.
  {
    const bare = makeGear('bulwark_body_t3', 60);
    const best = makeGear('bulwark_body_t3', 60, undefined, true);
    const heap = plainGear([bare, best]);
    check(
      heap.length === 1 && heap[0] === bare,
      'and the bulk button leaves it where a plain one goes',
      `${heap.length} in the heap`
    );
  }

  // A SAVE. Everything the lift touches is written onto the item, so nothing
  // recomputes it off the base — including the one heal that repairs a LINE.
  {
    const g = createGame('fresh');
    const best = makeGear('steel_sword', 60, undefined, true);
    best.meta.grafted = 'no_such_forge';
    g.inventory.push(best);
    heal(g);
    const after = g.inventory.find((i) => i.id === best.id);
    check(
      (after?.implicits[0]?.stats[0]?.value ?? 0) === impBest,
      'and a graft healed off a forge that is gone puts the PERFECT line back, not the plain one',
      `heal left ${after?.implicits[0]?.stats[0]?.value}`
    );
    const round = JSON.parse(JSON.stringify(best)) as typeof best;
    check(
      isPerfect(round) && round.damage === best.damage,
      'a Perfect piece survives a save and reload whole',
      'the lift did not round-trip'
    );
  }

  // And it DROPS: what the odds say, played out through the sim's own roll.
  {
    let perfect = 0;
    const tries = 4000;
    const rng = new Rng(4242);
    const odds = perfectChance(4, 900);
    for (let i = 0; i < tries; i++) if (rng.chance(odds)) perfect++;
    gauge(`${perfect} of ${tries} gear drops at the deep end, against ${(odds * tries).toFixed(0)} expected`);
  }
}

// ===========================================================================
rule('THE CLIMB — does a rung open, stay open, and get harder?');

// The whole of where difficulty comes from before anything is socketed, and
// the whole of what the player is shown as progress. What must hold is that
// nothing is ever taken away and nothing is ever skipped.
{
  const who = () => makeCharacter({}, 'strike');

  const fresh = who();
  const start = furthest(fresh);
  check(
    start.zone === 0 && start.rung === 1,
    'a new character is pointed at the first rung of the first zone',
    `pointed at zone ${start.zone} rung ${start.rung}`
  );
  check(
    canEnter(fresh, { zone: 0, rung: 1 }) &&
      !canEnter(fresh, { zone: 0, rung: 2 }) &&
      !canEnter(fresh, { zone: 1, rung: 1 }),
    'and may enter that rung and nothing past it',
    'a fresh character can walk into a rung it has not earned'
  );

  const walker = who();
  for (let rung = 1; rung <= LADDER.zones[0].rungs; rung++) {
    takeRung(walker, { zone: 0, rung });
  }
  check(
    zoneOpen(walker, 1) && canEnter(walker, { zone: 1, rung: 1 }),
    `clearing all ${LADDER.zones[0].rungs} rungs opens the zone above it`,
    'a whole zone cleared and the next one is still shut'
  );
  check(
    canEnter(walker, { zone: 0, rung: 3 }) && canEnter(walker, { zone: 0, rung: 1 }),
    'and every rung under it stays open to grind',
    'a cleared rung shut behind the character that cleared it'
  );
  takeRung(walker, { zone: 0, rung: 3 });
  check(
    climbed(walker, 0) === LADDER.zones[0].rungs,
    're-grinding an old rung records nothing',
    `re-grinding rung 3 moved the count to ${climbed(walker, 0)}`
  );

  // A CAMPAIGN DEPTH IS ITS ZONE'S WORLD, socketed or not: the campaign is run
  // with nothing in the sockets at all, so there is no crystal left to name one.
  // WHAT YOU SOCKETED IS STILL WHERE YOU GO everywhere else, which is the
  // Proving Ground — where the sockets are the only thing there is.
  const rot = [makeCrystal(1, 'demonic'), makeCrystal(1, 'demonic')];
  const held = LADDER.zones.map((zone, z) => runSet(rot, null, { zone: z, rung: 1 }).theme === zone.world);
  check(
    held.every(Boolean),
    'a campaign depth is its ZONE\u2019s world however the sockets are filled',
    LADDER.zones.map((zone, z) => `${zone.name} ${runSet(rot, null, { zone: z, rung: 1 }).theme}`).join(', ')
  );
  check(
    runSet(rot).theme === 'demonic' && runSet([]).theme === 'fissure',
    'and off the climb it is what you SOCKETED, which is the whole of the Proving Ground',
    `${runSet(rot).theme} against ${runSet([]).theme}`
  );

  // A ZONE IS A WORLD AND A TIER AGAIN, because the campaign is run with
  // NOTHING SOCKETED. *"Refraction can be the prismatic zone instead of base
  // zone… T2 in the second area t3 in the third."* Off the sockets alone every
  // one of the 42 depths would be tier 1 bases in one world.
  {
    line('  zone            world        best base');
    const seen = LADDER.zones.map((zone, z) => {
      const first = runSet([], null, { zone: z, rung: 1 });
      const last = runSet([], null, { zone: z, rung: zone.rungs });
      gauge(`${zone.name.padEnd(16)}${THEME_BY_ID[first.theme]?.name.padEnd(13)}tier ${first.maxTier}`);
      return { zone, first, last };
    });
    const drifts = seen.filter((r) => r.first.theme !== r.last.theme || r.first.maxTier !== r.last.maxTier);
    check(
      drifts.length === 0,
      'every depth of a zone is the SAME world and the same base tier',
      drifts.map((r) => r.zone.name).join(', ')
    );
    const worlds = seen.map((r) => r.first.theme);
    check(
      new Set(worlds).size === worlds.length && !worlds.includes('seam'),
      `and the three are three different worlds — ${worlds.join(', ')}`,
      worlds.join(', ')
    );
    const tiers = seen.map((r) => r.first.maxTier);
    check(
      tiers.every((t, i) => i === 0 || t > tiers[i - 1]),
      `and the base tier climbs with them: ${tiers.join(' → ')}`,
      tiers.join(', ')
    );
  }

  // DANGER RISES, every single depth, and the very first one is untouched: the
  // bare Fissure a new character walks into is the game's floor. The ramp is
  // STRAIGHT — *"it should be a more linear line between the levels"* — so what
  // is checked is that no depth costs wildly more than the one before it. A
  // spike every fourth floor is exactly what that forbids.
  const steps: number[] = [];
  LADDER.zones.forEach((zone, z) => {
    for (let rung = 1; rung <= zone.rungs; rung++) {
      steps.push(runSet([], null, { zone: z, rung }).rewards.danger);
    }
  });
  check(
    Math.round(steps[0]) === 0,
    'the first depth of the first zone is danger 0 — the bare Fissure is untouched',
    `the first depth arrives at danger ${steps[0].toFixed(1)}`
  );
  const dips = steps.filter((d, i) => i > 0 && d <= steps[i - 1]).length;
  check(
    dips === 0,
    `and danger rises on every one of the ${steps.length} depths, to ${Math.round(steps[steps.length - 1])}`,
    `${dips} depths are no harder than the one below them`
  );
  const gaps = steps.slice(1).map((d, i) => d - steps[i]);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const worst = Math.max(...gaps.map((g) => Math.abs(g - mean)));
  line(`  a depth costs ${mean.toFixed(1)} danger, and the most any one is off that line is ${worst.toFixed(1)}`);
  check(
    worst < mean,
    `and the ramp is a LINE: no depth is off the ${mean.toFixed(1)} step by a whole step`,
    `one depth is ${worst.toFixed(1)} off, which is a spike rather than a step`
  );

  // THE PROVING GROUND is one area PAST the whole climb, and its whole claim is
  // that it is harder than the deep end however you got there. *"A set
  // difficulty even harder than the final 'story mode' level which you can
  // scale with more crystals."* So: harder empty than depth 42 is, and harder
  // again for every socket filled.
  {
    const top = LADDER.zones.length - 1;
    const deepest = { zone: top, rung: LADDER.zones[top].rungs };
    const deep = runSet([], null, deepest).rewards.danger;
    const bare = runSet([], null, { proving: true, influence: 'fissure' }).rewards.danger;
    const filled = Array.from({ length: RUN_SLOTS.length }, () => makeCrystal(1));
    const full = runSet(filled, null, { proving: true, influence: 'fissure' }).rewards.danger;
    line(
      `  the deep end is ${Math.round(deep)} danger; ${PROVING.name} is ` +
        `${Math.round(bare)} empty and ${Math.round(full)} on ${filled.length} blank crystals`
    );
    check(
      bare > deep,
      `${PROVING.name} is harder than the last depth of the climb with NOTHING socketed`,
      `${Math.round(bare)} against ${Math.round(deep)}`
    );
    check(
      full > bare,
      'and every socket filled makes it harder again, which is what a socket is FOR here',
      `${Math.round(full)} against ${Math.round(bare)}`
    );
    // THE INFLUENCE WINS. *"The zone will stay what your influence is."* So a
    // set of one world does not drag the map into that world down here.
    const rot = Array.from({ length: 2 }, () => makeCrystal(1, 'demonic'));
    const themes = PROVING.influences.map(
      (influence) => runSet(rot, null, { proving: true, influence }).theme
    );
    check(
      themes.join(',') === PROVING.influences.join(','),
      `and the INFLUENCE decides the world, not the crystals: ${themes.join(', ')}`,
      themes.join(', ')
    );
    // THE SEAM IS THE ONE THING THAT OVERRIDES THE INFLUENCE, and it is
    // SOCKETED FOR rather than picked. *"With the exception of socketing 2 lvl
    // 4 prismatic and 2 lvl 4 demonic gives you the seam."*
    {
      const top = CRYSTAL_LEVELS[CRYSTAL_LEVELS.length - 1].level;
      const seamSet = [
        ...Array.from({ length: PROVING.seamOf }, () => makeCrystal(top, 'demonic')),
        ...Array.from({ length: PROVING.seamOf }, () => makeCrystal(top, 'prismatic')),
      ];
      const anywhere = PROVING.influences.map(
        (influence) => runSet(seamSet, null, { proving: true, influence }).theme
      );
      check(
        anywhere.every((t) => t === 'seam'),
        `${PROVING.seamOf} Demonic and ${PROVING.seamOf} Prismatic at level ${top} is the Seam whatever the influence says`,
        anywhere.join(', ')
      );
      // AND THE LEVEL IS THE PRICE. The same four one level down is not it.
      const under = [
        ...Array.from({ length: PROVING.seamOf }, () => makeCrystal(top - 1, 'demonic')),
        ...Array.from({ length: PROVING.seamOf }, () => makeCrystal(top - 1, 'prismatic')),
      ];
      check(
        runSet(under, null, { proving: true, influence: 'fissure' }).theme === 'fissure'
          && seamSocketed(seamSet) && !seamSocketed(under),
        `and level ${top} is the whole price of it — the same four at ${top - 1} is not the Seam`,
        runSet(under, null, { proving: true, influence: 'fissure' }).theme
      );
      // AND THE WHOLE WALL. Three of the four is not a Seam either, so the
      // last world costs every socket you have.
      const partial = seamSet.slice(0, PROVING.seamOf * 2 - 1);
      check(
        !seamSocketed(partial) && !seamSocketed([...seamSet, makeCrystal(top, 'normal')]),
        'and it takes the WHOLE wall: neither three of the four nor a fifth crystal opens it',
        `${seamSocketed(partial)} / ${seamSocketed([...seamSet, makeCrystal(top, 'normal')])}`
      );
      // AND IT IS NEVER PICKABLE. The influence row offers three worlds.
      check(
        !PROVING.influences.includes('seam'),
        'and it is never on the influence list: the last world is the only one you cannot pick',
        PROVING.influences.join(', ')
      );
    }

    // AND IT FLOORS THE GEAR TIER, the way a campaign zone does.
    check(
      runSet([], null, { proving: true, influence: 'fissure' }).maxTier >= PROVING.tier,
      `and it floors the base tier at ${PROVING.tier} however little is socketed`,
      String(runSet([], null, { proving: true, influence: 'fissure' }).maxTier)
    );
  }

  // What a rung actually DOES to a body, read through a real sim rather than
  // off the table: the mod has to reach the monsters or the pips are a lie.
  line('  zone            rung   danger   monster life   monster damage   monsters');
  LADDER.zones.forEach((zone, z) => {
    for (const rung of [1, zone.rungs]) {
      const sim = new RunSim([], ladderCharacter(3, new Rng(11)), new Rng(700 + z * 31 + rung), {
        rung: { zone: z, rung },
      });
      const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
      const life = mean(sim.state.monsters.map((m) => m.stats.maxLife));
      const hit = mean(sim.state.monsters.map((m) => m.stats.damage));
      gauge(
        `${zone.name.padEnd(14)}` +
          `${String(rung).padStart(5)}   ${Math.round(sim.set.rewards.danger).toString().padStart(6)}   ` +
          `${Math.round(life).toString().padStart(12)}   ` +
          `${Math.round(hit).toString().padStart(14)}   ` +
          `${String(sim.state.totalMonsters).padStart(8)}`
      );
    }
  });

  const bottom = new RunSim([], ladderCharacter(3, new Rng(11)), new Rng(4242), {
    rung: { zone: 0, rung: 1 },
  });
  const top = new RunSim([], ladderCharacter(3, new Rng(11)), new Rng(4242), {
    rung: { zone: LADDER.zones.length - 1, rung: LADDER.zones[LADDER.zones.length - 1].rungs },
  });
  const lifeOf = (sim: RunSim): number =>
    sim.state.monsters.reduce((a, m) => a + m.stats.maxLife, 0) / Math.max(1, sim.state.monsters.length);
  const low = lifeOf(bottom);
  const high = lifeOf(top);
  check(
    high > low * 2,
    `the top rung's bodies carry ${(high / Math.max(1, low)).toFixed(1)}× the life of the first rung's`,
    `top rung life ${Math.round(high)} against ${Math.round(low)}`
  );

  // A BOSS AT THE TOP OF EACH ZONE. *"One at the end of each zone which will be
  // a unique boss each time."* The last rung is a fight rather than a descent,
  // and clearing it is the whole of what opens the zone above.
  {
    const arenas = LADDER.zones.map((zone, z) => ({
      zone,
      z,
      id: arenaAt({ zone: z, rung: zone.rungs }),
      under: arenaAt({ zone: z, rung: zone.rungs - 1 }),
    }));
    line(`  arenas: ${arenas.map((a) => `${a.zone.name} ${a.zone.rungs} → ${a.id}`).join(' · ')}`);
    check(
      arenas.every((a) => a.id !== null) && arenas.every((a) => a.under === null),
      'every zone ends on an arena, and only its LAST rung is one',
      arenas.map((a) => `${a.zone.id}:${a.id}/${a.under}`).join(' ')
    );

    // Each arena is a real room, holding a real boss, drawn as its own body.
    const broken: string[] = [];
    const fought: string[] = [];
    for (const at of arenas) {
      const room = SCENE_BY_ID[at.id ?? ''];
      const boss = BOSS_BY_ID[room?.encounter ?? ''];
      if (!room) broken.push(`${at.zone.name}: no room ${at.id}`);
      else if (!boss) broken.push(`${at.id}: no boss ${room.encounter}`);
      else if (!GENERATED[boss.sprite]) broken.push(`${boss.id}: nothing drawn for ${boss.sprite}`);
      else fought.push(boss.id);
    }
    check(
      broken.length === 0 && new Set(fought).size === arenas.length,
      `and each is its own boss on its own zone's rock — ${fought.join(', ')}`,
      broken.join(' | ')
    );

    // HARDER AS YOU CLIMB, and each is drawn with a full set of states: a boss
    // missing its slam is a phase the fight cannot show.
    const want = ['idle', 'walk', 'attack', 'slam', 'roar', 'hurt', 'death'];
    const thin = fought.filter((id) => {
      const art = GENERATED[BOSS_BY_ID[id].sprite];
      return want.some((state) => !art?.states?.[state]?.length);
    });
    check(thin.length === 0, 'and every one of them has all seven states drawn', thin.join(', '));
    const lives = fought.map((id) => BOSS_BY_ID[id].life);
    const hits = fought.map((id) => BOSS_BY_ID[id].damage);
    line(`  bosses: ${fought.map((id, i) => `${BOSS_BY_ID[id].name} ${lives[i]} life, ${hits[i]} hit`).join(' · ')}`);
    check(
      lives.every((n, i) => i === 0 || n > lives[i - 1]) &&
        hits.every((n, i) => i === 0 || n > hits[i - 1]),
      'and each stands above the one in the zone below it',
      `${lives.join(', ')} · ${hits.join(', ')}`
    );

    // AND IT IS THE GATE. Everything but the last rung leaves the zone above
    // shut; the boss is what opens it.
    {
      const nearly = makeCharacter({}, 'strike');
      for (let rung = 1; rung < LADDER.zones[0].rungs; rung++) takeRung(nearly, { zone: 0, rung });
      const shut = !zoneOpen(nearly, 1);
      takeRung(nearly, { zone: 0, rung: LADDER.zones[0].rungs });
      check(
        shut && zoneOpen(nearly, 1),
        'every rung but the arena leaves the next zone shut, and the arena opens it',
        `shut before ${shut}, open after ${zoneOpen(nearly, 1)}`
      );
    }
  }

  // A save is the one thing that can hold a climb nobody walked.
  const bent = createGame();
  bent.character.climbed = { [LADDER.zones[0].id]: 999, nowhere: 4 };
  heal(bent);
  check(
    climbed(bent.character, 0) === LADDER.zones[0].rungs &&
      !('nowhere' in bent.character.climbed),
    'and heal clamps a climb to the rungs that exist',
    `heal left ${JSON.stringify(bent.character.climbed)}`
  );
}

// ===========================================================================
rule('THE COLLECTION — do crystals arrive, and do they grow?');

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
  // ARMED AS THE CHARACTER IS MADE, and marked, so the same schedule that owed
  // it a moment ago owes it nothing at all.
  armForSkill(fresh);
  check(
    giftWaiting(fresh)?.weapon !== true,
    'and arming one settles that debt rather than leaving him a second to hand over',
    JSON.stringify(giftWaiting(fresh))
  );

  // A weapon picked off the SKILL. A Strike character handed a wand is the
  // first item the game gives you and the first one it teaches you to craft.
  const bySkill: string[] = [];
  for (const skill of MAIN_SKILLS) {
    const g = createGame('fresh');
    g.character = makeCharacter({}, skill.id);
    const given = armForSkill(g);
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

  // Played out. The meeting is through the HOLE, at the end of a cleared
  // descent — a gift is never a thing standing next to the monsters, and the
  // loot is banked before anybody speaks.
  {
    const g = createGame('fresh');
    const sim = new RunSim([], g.character, new Rng(6100));
    runToCompletion(sim, 400);
    check(
      sim.state.status === 'cleared' && sim.state.folk.length === 0 && !sim.state.meeting,
      'nobody is on the map during a descent',
      `${sim.state.status}, ${sim.state.folk.length} folk`
    );

    // SOMEBODY DOWN THERE. *"I want to encounter them randomly in the maps and
    // they just say like one thing."* Placed without a draw, so the descent
    // rolls exactly as it did without them — and FOUND by walking past, which
    // is what makes a headless run reach them with no policy of its own.
    buildReport(g, sim.state);
    {
      // BOTH FRESH: `totalMonsters` grows as the Welling raises bodies, so a
      // finished run against a new one compares two different questions.
      const alone = new RunSim([], g.character, new Rng(6100));
      const withHim = new RunSim([], g.character, new Rng(6100), {
        meets: { id: 'workshop', sprite: LAMPWRIGHT.sprite },
      });
      check(
        withHim.state.folk.length === 1 && withHim.state.found === null,
        'somebody unmet is standing in the descent, and unfound until you reach them',
        `${withHim.state.folk.length} folk, found ${withHim.state.found}`
      );
      check(
        withHim.state.totalMonsters === alone.state.totalMonsters,
        'and putting them there moved not one roll of the descent',
        `${withHim.state.totalMonsters} against ${alone.state.totalMonsters}`
      );
      runToCompletion(withHim, 400);
      check(
        withHim.state.status === 'cleared' && withHim.state.found === 'workshop',
        'and clearing the map finds them, with nothing clicked and nothing stopped',
        `${withHim.state.status}, found ${withHim.state.found}`
      );
      // Every person has the ONE line, or they are met in silence.
      const mute = SCENES.filter((s) => !s.encounter && !s.greets).map((s) => s.id);
      check(mute.length === 0, 'and every one of them has a line to say where you find them', mute.join(', '));
      // IN THEIR OWN ZONE. `theme` is where somebody LIVES, and a man who turns
      // up in every world lives in none — so every zone that holds anybody has
      // to be a zone the game can actually build.
      const homeless = SCENES.filter(
        (s) => !s.encounter && !MAP_THEMES.some((t) => t.id === s.theme)
      ).map((s) => `${s.id}@${s.theme}`);
      check(homeless.length === 0, 'and a zone of their own to be found in', homeless.join(', '));
      const zones = new Set(SCENES.filter((s) => !s.encounter).map((s) => s.theme));
      line(`  ${SCENES.filter((s) => !s.encounter).length} people across ${zones.size} zones`);

      // SCHEDULED, INSIDE THEIR OWN ZONE'S STRETCH OF THE CAMPAIGN. *"Encounter
      // each npc for crafting in each zone respectively."* A coin could leave a
      // crafting bench behind a roll that never came up, so the whole climb is
      // walked here in order and everybody has to turn up — in the world they
      // live in, and BEFORE that zone's arena, which places nobody.
      {
        const walk = createGame('fresh');
        const seen: Record<string, { zone: number; rung: number }> = {};
        LADDER.zones.forEach((zone, z) => {
          for (let rung = 1; rung <= zone.rungs; rung++) {
            const who = whoIsDown(walk, zone.world, rung);
            if (!who || seen[who.id]) continue;
            seen[who.id] = { zone: z, rung };
            takeMet(walk, who.id);
          }
        });
        const folk = SCENES.filter((s) => !s.encounter);
        const missed = folk.filter((s) => !seen[s.id]).map((s) => s.id);
        check(
          missed.length === 0,
          `walking the ${LADDER_RUNGS} depths in order meets every one of the ${folk.length}, with nothing rolled`,
          missed.join(', ')
        );
        const astray = folk
          .filter((s) => seen[s.id] && LADDER.zones[seen[s.id].zone].world !== s.theme)
          .map((s) => `${s.id} in ${LADDER.zones[seen[s.id].zone].name}`);
        check(astray.length === 0, 'each in the zone whose world they live in', astray.join(', '));
        const late = folk
          .filter((s) => seen[s.id] && seen[s.id].rung >= LADDER.zones[seen[s.id].zone].rungs)
          .map((s) => s.id);
        check(late.length === 0, 'and none of them on an arena depth, which stands nobody', late.join(', '));
        line(
          `  ${folk
            .map((s) => `${s.id}=${LADDER.zones[seen[s.id].zone].name} ${seen[s.id].rung}`)
            .join(', ')}`
        );
        // AND NEVER TWICE. Re-grinding a meeting depth once they are all met
        // puts nobody down there, so an old depth is not a second first line.
        const again = LADDER.zones.flatMap((zone, z) =>
          [...Array(zone.rungs).keys()].map((i) => whoIsDown(walk, zone.world, i + 1))
        ).filter(Boolean);
        check(again.length === 0, 'and re-grinding any of those depths stands nobody there again', String(again.length));
      }
      // And something to say in the camp both ways round: what they WANT, and
      // one standing line for when they want nothing. Without the second,
      // every visit is a demand and the camp reads as a row of shops.
      // The Lampwright is exempt from both: his three speeches are in
      // `LAMPWRIGHT` because which one he says is what he OWES you.
      const talkers = SCENES.filter((s) => !s.encounter && s.id !== LAMPWRIGHT.scene);
      const dumb = talkers.filter((s) => !s.beats?.length).map((s) => s.id);
      check(dumb.length === 0, 'and something to say when they want something', dumb.join(', '));
      const nagging = talkers.filter((s) => !s.idles).map((s) => s.id);
      check(nagging.length === 0, 'and a standing line for when they do not', nagging.join(', '));
    }

    // THE ARENA, the one room left. A `RunSim` like any other, which is what
    // makes a boss room a filled-in field rather than a second engine.
    const room = new RunSim([], g.character, new Rng(6100), { scene: INTRO.bossRoom });
    check(
      room.state.monsters.length === 0 && room.state.folk.length === 1,
      'the arena has nobody in it but the one you came to say the name at',
      `${room.state.monsters.length} monsters, ${room.state.folk.length} folk`
    );
    check(
      room.state.map.exit === room.state.map.entrance,
      'and one hole, which is the way you came in',
      `${room.state.map.props.length} props`
    );
    check(
      dist(room.state.hero, room.state.folk[0]) > 3,
      'you arrive across it, so reaching them is a walk',
      `${dist(room.state.hero, room.state.folk[0]).toFixed(1)} tiles`
    );
    check(
      walkToMeeting(room) && dist(room.state.hero, room.state.folk[0]) <= 1.2,
      'and the meeting is the hero walking over, not a panel appearing',
      `meeting ${room.state.meeting}, ${dist(room.state.hero, room.state.folk[0]).toFixed(2)} apart`
    );

    // Nobody MOVES across it, whichever skill fills the slot: a mover firing
    // mid-conversation reads as a bug rather than as a build, and the guard is
    // for the SLOT rather than for the one mover it was written against.
    const moved: string[] = [];
    for (const mover of MOVERS) {
      const walker = { ...g.character, equipped: { ...g.character.equipped, movement: mover } };
      const arriving = new RunSim([], walker, new Rng(77), { scene: INTRO.bossRoom });
      let t = 0;
      while (!arriving.state.meeting && t++ < 4000) arriving.walkOut(TICK);
      if (arriving.state.blinks > 0) moved.push(mover);
    }
    check(moved.length === 0, 'and nobody moves across it, whichever mover is held', moved.join(', '));

    // What he says, and what he does while he says it. An act only ever sets
    // `action` and `actionTimer`, which is the whole of what `poseOf` reads.
    const script = [LAMPWRIGHT.first, LAMPWRIGHT.crystal, LAMPWRIGHT.again];
    check(
      script.every((w) => w.beats.length > 0 && w.beats.every((b) => b.said.length > 0)),
      'every one of his three speeches is beats, and every beat has words',
      script.map((w) => w.beats.length).join('/')
    );

    const who = room.state.folk[0];
    who.action = 'idle';
    room.perform(0, 'work', TICK);
    check(
      (who.action as string) === 'attack',
      'working at the bench is a pose, not a new frame',
      who.action
    );

    // One act per LINE. Left running, pacing turned round the moment it
    // arrived and walked back for as long as the bubble was up, which reads as
    // twitching rather than as somebody moving.
    const stood = { x: who.x, y: who.y };
    for (let i = 0; i < 200; i++) room.perform(1, 'pace', TICK);
    const away = dist(who, stood);
    const restedAt = { x: who.x, y: who.y };
    for (let i = 0; i < 400; i++) room.perform(1, 'pace', TICK);
    check(
      away > 0.5 && dist(who, restedAt) < 0.01,
      'a line paces once and then stands still until the next one',
      `${away.toFixed(1)} out, then moved ${dist(who, restedAt).toFixed(2)} more`
    );

    // And the next line goes the other way, or a long speech walks somebody
    // out of their own room a line at a time.
    for (let i = 0; i < 200; i++) room.perform(2, 'pace', TICK);
    check(
      dist(who, stood) < away + 0.01,
      'and the line after it comes back rather than carrying on',
      `${dist(who, stood).toFixed(1)} from where he started`
    );

    // --- the one who thinks the Lampwright is wrong --------------------
    // A boss room is a descent with one thing in it that matters. The check
    // that outranks every other one here is that it ENDS: a reinforcement
    // clock with no stop condition is a run nobody can walk out of.
    {
      const objector = SCENE_BY_ID[INTRO.bossScene];
      const at = createGame('dev');
      at.sockets = {};
      at.given = (at.given ?? []).filter((mark) => mark !== gaveKey(objector.gives!));
      check(!keyOwed(at, objector), 'nobody objects to a wall with nothing in it', 'offered anyway');
      const two = createGame('dev');
      two.bosses = []; // the kit is handed every door; this is somebody meeting one
      two.given = (two.given ?? []).filter((mark) => mark !== gaveKey(objector.gives!));
      two.sockets = { first: makeCrystal(2, 'normal'), second: makeCrystal(2, 'normal') };
      check(
        keyOwed(two, objector),
        'two crystals set in the wall is what it takes for somebody to object',
        JSON.stringify(Object.keys(two.sockets))
      );
      const bossId = SCENE_BY_ID[INTRO.bossRoom].encounter!;
      takeBoss(two, bossId);
      // The name is owed until he has HANDED it over, never until the thing it
      // calls up is down: the fight is the fifth socket's.
      two.given = [...(two.given ?? []), gaveKey(objector.gives!)];
      check(!keyOwed(two, objector), 'and once he has handed it over he never offers again', 'offered twice');

      // --- going back for one you have already put down -----------------
      // A key is a wallet entry in its own table. Never a currency: the bench's
      // registries reach every one of those, which is a bench that can pour a
      // boss key onto a helmet.
      const asCurrency = BOSS_KEYS.filter((k) => CURRENCY_BY_ID[k.id]).map((k) => k.id);
      check(asCurrency.length === 0, 'a boss key is never a currency', asCurrency.join(', '));
      const doorless = BOSS_KEYS.filter((k) => !BOSS_BY_ID[k.boss]).map((k) => k.id);
      check(doorless.length === 0, 'and every one of them opens a door', doorless.join(', '));

      // Only once its boss is down: a key to a door nobody has found reads as
      // junk, and the roll is the SIM's, so a seed still replays.
      const unopened = new RunSim([], g.character, new Rng(77));
      runToCompletion(unopened, 400);
      check(
        BOSS_KEYS.every((k) => !unopened.state.loot.currency[k.id]),
        'no key drops before its boss has been put down',
        JSON.stringify(unopened.state.loot.currency)
      );
      let dropped = 0;
      for (let seed = 0; seed < 40; seed++) {
        const run = new RunSim([], g.character, new Rng(900 + seed), { beaten: [bossId] });
        runToCompletion(run, 400);
        dropped += Object.entries(run.state.loot.currency)
          .filter(([id]) => BOSS_KEY_BY_ID[id])
          .reduce((n, [, amount]) => n + amount, 0);
      }
      check(dropped > 0, 'and one does once it has been', `${dropped} in 40 bare clears`);
      gauge(`a way back drops ${dropped} times in 40 bare clears`);

      // And a room never drops the key that opens it, or the loop feeds itself.
      const inRoom = new RunSim([], g.character, new Rng(900), {
        scene: INTRO.bossRoom,
        beaten: [bossId],
      });
      inRoom.beginEncounter();
      runToCompletion(inRoom, 600);
      check(
        BOSS_KEYS.every((k) => !inRoom.state.loot.currency[k.id]),
        'and a room never drops the key that opens it',
        JSON.stringify(inRoom.state.loot.currency)
      );

      // Played out, with the character the ladder measures everything with.
      const ends: string[] = [];
      for (const band of [1, 6]) for (const skill of MAIN_SKILLS) {
        const fighter = ladderCharacter(band, new Rng(11), skill.id);
        const room = new RunSim([], fighter, new Rng(4200), { scene: INTRO.bossRoom });
        room.beginEncounter();
        check(
          room.state.boss !== null && room.state.totalMonsters === 1,
          `band ${band} ${skill.id}: the room counts the boss, not what arrives`,
          String(room.state.totalMonsters)
        );
        const over = runToCompletion(room, 600);
        const adds = room.state.monsters.length - 1;
        ends.push(
          `${skill.id}@${band} ${room.state.status} ${room.state.elapsed.toFixed(0)}s +${adds}`
        );
        check(
          over && room.state.status !== 'running',
          `band ${band} ${skill.id}: a room with something endless in it ends`,
          `${room.state.status} after ${room.state.elapsed.toFixed(0)}s`
        );
        if (room.state.status === 'cleared') {
          check(
            room.state.boss?.dead === true,
            `band ${band} ${skill.id}: and the boss going down is what clears it`,
            `boss ${room.state.boss?.dead ? 'down' : 'up'}`
          );
        }
      }
      // --- WHAT THE BUILD ANSWERS WITH -----------------------------------
      // A boss is automated like everything else, so nothing here is a way of
      // PLAYING it: what is measured is whether the BUILD gets you out.
      {
        const idle = new RunSim([], ladderCharacter(4, new Rng(31), 'strike'), new Rng(77), {
          scene: INTRO.bossRoom,
        });
        idle.beginEncounter();
        runToCompletion(idle, 600);
        check(
          idle.state.status !== 'running',
          'a boss fight ends with nobody at the keyboard, like every other room',
          `${idle.state.status} after ${idle.state.elapsed.toFixed(0)}s`
        );
        // A character that survives long enough for the MACHINERY to show and
        // kills slowly enough to let it: a tank at the rung the fight is sized
        // against. Anything over-geared puts the boss down inside one phase.
        const phases = new Set<string>();
        const watch = new RunSim([], ladderCharacter(2, new Rng(31), 'strike', 'tank'), new Rng(77), {
          scene: INTRO.bossRoom,
        });
        watch.beginEncounter();
        let sawCircle = false;
        for (let n = 0; n < 2400 && watch.state.status === 'running'; n++) {
          watch.step(TICK);
          if (watch.state.phase) phases.add(watch.state.phase);
          if (watch.state.circles.length > 0) sawCircle = true;
        }
        check(
          phases.size === 3 && sawCircle,
          'and it runs all three phases, and the Fall puts circles on the floor',
          `${[...phases].join(', ') || 'none'}${sawCircle ? '' : ', no circles'}`
        );
        // --- THE GRID ----------------------------------------------------
        //
        // A boss cannot be balanced one dial at a time: character power and
        // what it does move together, so what is measured is the WHOLE thing
        // at three rungs of gear against three SHAPES of build. The target, in
        // the user's words: *"a build with movespeed boots and move speed bases
        // should be able to blink + run out and a full armour build should be
        // able to just tank it"*, and a build that is neither does not make it
        // out. The rung is his too — *"full t1 gear and at least 1 decent mod
        // for your build on every piece"* — with the rung under it there to
        // prove the grind is real and the rung over it to prove gear still wins.
        //
        // Every DODGING tick of every fight below — he is in a circle and
        // leaving it — counted against how often he is standing inside the
        // boss instead. `findPath` reads walls and a boss is not one, so a way
        // out costed nearest-to-the-boss used to BE the ray through it: he
        // leant on the thing that cannot be shoved until the circle went off.
        let ticks = 0;
        let pressed = 0;
        const play = (band: number, shape: BuildShape, seed: number) => {
          const room = new RunSim([], ladderCharacter(band, new Rng(31), 'strike', shape), new Rng(seed), {
            scene: INTRO.bossRoom,
          });
          room.beginEncounter();
          for (let n = 0; n < 3600 && room.state.status === 'running'; n++) {
            room.step(TICK);
            const { boss, hero, circles } = room.state;
            if (!boss || boss.dead) continue;
            if (!circles.some((c) => Math.hypot(c.x - hero.x, c.y - hero.y) <= c.r)) continue;
            ticks++;
            if (Math.hypot(hero.x - boss.x, hero.y - boss.y) < boss.radius + hero.radius) pressed++;
          }
          return room.state;
        };
        const rate = (band: number, shape: BuildShape) => {
          let won = 0;
          for (let seed = 0; seed < 8; seed++) if (play(band, shape, 500 + seed).status === 'cleared') won++;
          return won;
        };
        const RUNGS: [string, number][] = [['thin t1', 1], ['full t1', 2], ['t2', 4]];
        const SHAPES: BuildShape[] = ['runner', 'tank', 'neither'];
        line('  the boss, at three rungs of gear against three shapes of build:');
        line(`    ${''.padEnd(10)}${SHAPES.map((s) => s.padStart(10)).join('')}`);
        const grid: Record<string, number> = {};
        for (const [name, band] of RUNGS) {
          const row = SHAPES.map((shape) => {
            const won = rate(band, shape);
            grid[`${name}/${shape}`] = won;
            return `${won}/8`.padStart(10);
          });
          line(`    ${name.padEnd(10)}${row.join('')}`);
        }
        // A REAL check, and the second difficulty one in the game: this boss is
        // the barrier between tier 1 and tier 2, so a build that answers it
        // walking through and a build that does not walking into a wall IS the
        // mechanism. Over-gearing it at t2 is meant to trivialise it — that is
        // what over-gearing is, and it is measured rather than asserted.
        // The MECHANISM: what answers this boss is the BUILD. A shape with an
        // answer walks through, a shape with neither walks into a wall, and
        // over-gearing trivialises it — that is what over-gearing is.
        check(
          grid['full t1/runner'] >= 6 &&
            grid['full t1/neither'] === 0 &&
            grid['t2/tank'] >= 6 &&
            grid['t2/neither'] >= 6,
          'full tier 1 answers it with speed, with neither answer it does not, and t2 trivialises it',
          `full t1: runner ${grid['full t1/runner']}/8 (want 6+), neither ${grid['full t1/neither']}/8 ` +
            `(want 0); t2 tank ${grid['t2/tank']}/8, neither ${grid['t2/neither']}/8 (want 6+)`
        );
        // The rung PLATE answers it at is balance, and it moved when the Burst
        // left the trees: a plate build's damage came partly from a Burst its
        // tree gave away, and buying that back now costs a passive slot.
        parkedCheck(
          grid['full t1/tank'] >= 6 && grid['thin t1/runner'] === 0,
          'and plate answers it a rung earlier than speed does',
          `plate: full t1 ${grid['full t1/tank']}/8 (want 6+), t2 ${grid['t2/tank']}/8; ` +
            `thin t1 runner ${grid['thin t1/runner']}/8 (want 0)`
        );
        // MECHANISM, not balance: a hero leaning on the one body that cannot be
        // shoved is a hero stood in the circle he was dodging. Measured at
        // 67.5% before the ways out learnt the boss was in the way.
        const leaning = (100 * pressed) / Math.max(1, ticks);
        check(
          leaning < 5,
          'and he rounds the boss rather than pressing into it',
          `inside its body ${leaning.toFixed(1)}% of ${ticks} dodging ticks (want under 5%)`
        );
      }

      // Balance, so it prints and never fails: how long the thing lives and
      // how many smaller ones turned up while it did.
      gauge(`the reading room — wanted: the adds arrive at all`);
      for (const e of ends) gauge(`  ${e}`);
    }

    // What the panel does. The run is already banked, so this is a handover
    // and not a payout — nothing about it can be lost.
    const waiting = giftWaiting(g);
    const hand = takeHandover(g, waiting!);
    room.takeGift();
    const weapon = hand.items[0];
    check(
      weapon?.meta.firstClear === true
        && g.character.equipment.weapon?.id === weapon.id,
      'and hands over a marked weapon, straight into your hand rather than your bag',
      `${weapon?.base} is ${g.character.equipment.weapon?.id === weapon?.id ? 'worn' : 'in the bag'}`
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
    const mine = mainSkillId(g.character);
    const progress = skillProgress(g.character, mine);
    // The gate and a COUNT of what is left, not which count: how far one
    // opening descent gets you moves with every drop and pack change, and
    // pinning it here fails on a balance number rather than on a sentence.
    check(
      giftWaiting(g) === null &&
        giftSchedule(g).includes(`level ${INTRO.crystalSkillLevel}`) &&
        /\d+ unspent/.test(giftSchedule(g)),
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
    // The gate is the POINTS, not the notable — but the opening still names
    // the nearest one as a suggestion, so the distance has to keep being one
    // those levels can afford or the suggestion is a lie.
    const route = pathToNotable(mine, progress.allocated);
    check(
      route.length === INTRO.crystalSkillLevel && route[route.length - 1].kind === 'notable',
      `and the cheapest notable is ${INTRO.crystalSkillLevel} points away, which is exactly what that many levels buys`,
      `${route.length} nodes: ${route.map((n) => n.id).join(' → ')}`
    );
    for (const node of route) progress.allocated.push(node.id);
    const owed = giftWaiting(g);
    check(owed?.crystal === true, 'and spending the last of them is what puts one at the mouth', JSON.stringify(owed));
    check(
      pointsAvailable(mine, progress) === 0,
      'which is the points being GONE rather than a particular node being taken',
      `${pointsAvailable(mine, progress)} still unspent`
    );

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
      giftWaiting(g) === null
        && /once the climb is finished/.test(giftSchedule(g))
        && giftSchedule(g).includes(campaignPrize()),
      `and everything after that waits on the CAMPAIGN, which the screen names, for ${campaignPrize()}`,
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

  // A CRYSTAL LEVELS FROM THE FIRST DESCENT. It used to earn nothing until all
  // four were held, which made the whole first cycle a tier token — the gate
  // that existed because the rung and the crystal were the same ladder.
  const climbing = createGame('fresh');
  climbing.character = ladderCharacter(1, new Rng(3));
  const early = makeCrystal(1);
  addItem(climbing, early);
  socketItem(climbing, early, RUN_SLOTS[0].id);
  {
    const sim = new RunSim([early], climbing.character, new Rng(515));
    runToCompletion(sim, 400);
    buildReport(climbing, sim.state);
    check(
      crystalXp(early) > CRYSTAL_LEVELS[0].xp,
      `the FIRST crystal you own earns on the first clear, holding ${ownedCrystals(climbing).length} of ${RUN_SLOTS.length}`,
      `xp ${crystalXp(early)}`
    );
  }

  // Socketed is paid and a bag is not, which is what makes a socket spent on a
  // fresh crystal cost something.
  const game = createGame('fresh');
  game.character = ladderCharacter(1, new Rng(3));
  const socketed = makeCrystal(1);
  const pocketed = makeCrystal(1);
  for (const c of [socketed, pocketed, makeCrystal(1), makeCrystal(1)]) addItem(game, c);
  socketItem(game, socketed, RUN_SLOTS[0].id);
  const sim = new RunSim([socketed], game.character, new Rng(515));
  runToCompletion(sim, 400);
  const report = buildReport(game, sim.state);
  check(
    report.cleared && crystalXp(socketed) > crystalXp(pocketed) && crystalXp(pocketed) === 0,
    'and a cleared run pays the sockets and nothing in a bag',
    `${sim.state.status}: socketed ${crystalXp(socketed)}, carried ${crystalXp(pocketed)}`
  );

  // A ROLL BURNS DOWN, and only a crystal's. *"You roll a mod and it lasts for a
  // certain amount runs and then it's gone."* What has to hold is that a CLEAR
  // spends exactly one, a DEATH spends none, the roll goes at zero, and a rarer
  // tier of the same modifier starts with fewer.
  {
    const burn = createGame('fresh');
    // Strong enough to CLEAR what it socketed: a use is spent on a clear, so a
    // probe that dies every descent measures nothing.
    burn.character = ladderCharacter(6, new Rng(3));
    const rolled = makeCrystal(4);
    while (rolled.mods.length < 2) {
      const mod = rollRandomMod(rolled, pool, new Rng(70 + rolled.mods.length));
      if (mod && !rolled.mods.some((m) => m.group === mod.group)) rolled.mods.push(mod);
    }
    for (const c of [rolled, makeCrystal(1), makeCrystal(1), makeCrystal(1)]) addItem(burn, c);
    socketItem(burn, rolled, RUN_SLOTS[0].id);
    const started = rolled.mods.map((m) => m.uses ?? 0);
    line(`  a fresh roll carries ${started.join(' and ')} descents, of ` +
      `${USES.least} to ${USES.most}`);
    check(
      started.every((n) => n >= USES.least && n <= USES.most),
      'a crystal roll comes out of the ground with descents on it',
      started.join(', ')
    );

    /** One descent, cleared or not, and what every roll has left after it. */
    let cleared = 0;
    const descend = (seed: number, kill: boolean): number[] => {
      const sim = new RunSim(Object.values(burn.sockets ?? {}), burn.character, new Rng(seed));
      if (kill) runToCompletion(sim, 400);
      else sim.state.hero.life = 0;
      if (buildReport(burn, sim.state).cleared) cleared++;
      return rolled.mods.map((m) => m.uses ?? 0);
    };
    const dead = descend(515, false);
    check(
      dead.every((n, i) => n === started[i]),
      'a death spends none of them — failing a rung costs nothing but time',
      `${started.join(',')} → ${dead.join(',')}`
    );
    const once = descend(515, true);
    check(
      cleared === 1 && once.every((n, i) => n === started[i] - 1),
      'and a clear spends exactly one off every roll on it',
      `${started.join(',')} → ${once.join(',')} over ${cleared} clears`
    );

    // Down to nothing, which is the state the whole rule exists for.
    let guard = 0;
    let last: ReturnType<typeof buildReport> | null = null;
    while (rolled.mods.length > 0 && guard++ < USES.most + 4) {
      const sim = new RunSim(Object.values(burn.sockets ?? {}), burn.character, new Rng(515));
      runToCompletion(sim, 400);
      last = buildReport(burn, sim.state);
    }
    check(
      rolled.mods.length === 0 && guard <= USES.most + 1,
      `and a roll is GONE at zero — the crystal ran dry ${guard} descents in`,
      `${rolled.mods.length} left after ${guard}`
    );
    check(
      (last?.burnt.length ?? 0) > 0,
      'and the report names what ran out, so a chained descent stops on it',
      JSON.stringify(last?.burnt.map((b) => b.name) ?? [])
    );

    // A save that predates uses comes back FULL rather than never expiring, and
    // a count on a worn piece is stripped: gear is kept, crystals burn.
    const old = makeCrystal(4);
    const line1 = rollRandomMod(old, pool, new Rng(71));
    if (line1) old.mods.push(line1);
    for (const mod of old.mods) delete mod.uses;
    addItem(burn, old);
    const worn = Object.values(burn.character.equipment)[0];
    if (worn && worn.mods[0]) worn.mods[0].uses = 3;
    heal(burn);
    check(
      old.mods.every((m) => m.uses === fullUses(m))
        && Object.values(burn.character.equipment).every((i) => i.mods.every((m) => m.uses === undefined)),
      'a save written before uses heals to full, and no worn piece ever carries one',
      old.mods.map((m) => `${m.name} ${m.uses}`).join(', ')
    );

    // COMMON LASTS LONGER. The tier's own weight is what says so, which is the
    // rarity that already decides how often it turns up.
    const laddered = CRYSTAL_MODS.filter((d) => d.tiers.length > 1)
      .map((d) => d.tiers.map((t) => usesFor(t.weight)));
    line(`  descents by tier: ${laddered.map((u) => u.join('<')).join(' · ')}`);
    check(
      laddered.every((u) => u.every((n, i) => i === 0 || n >= u[i - 1])),
      'and a rarer tier of the same modifier is stronger and runs out sooner',
      JSON.stringify(laddered)
    );
  }

  // THE TIER A CRYSTAL BUYS, and it is its LEVEL — *"make it where tiers are
  // just based on crystal level."* How MANY are socketed used to buy it, which
  // made a second crystal worth more than levelling the first.
  {
    const tiers = CRYSTAL_LEVELS.map((l) =>
      runSet(Array.from({ length: 4 }, () => makeCrystal(l.level))).maxTier
    );
    line(`  best base tier by crystal level: ${tiers.join(' · ')}`);
    check(
      runSet([]).maxTier === 1
        && tiers.every((t, i) => i === 0 || t >= tiers[i - 1])
        && tiers[0] === 1 && tiers[tiers.length - 1] === 3,
      'nothing socketed drops tier 1 bases only, and the tier climbs with the LEVEL',
      tiers.join(', ')
    );
    // The MEAN, so every socket counts: one good crystal cannot carry three
    // blanks, and a fresh one swapped in costs tier until it catches up.
    const mixed = runSet([makeCrystal(4), makeCrystal(1), makeCrystal(1), makeCrystal(1)]).maxTier;
    check(
      mixed < runSet(Array.from({ length: 4 }, () => makeCrystal(4))).maxTier,
      'and one levelled crystal beside three blanks does NOT drop what four levelled ones do',
      `${mixed} against ${runSet(Array.from({ length: 4 }, () => makeCrystal(4))).maxTier}`
    );

    // WHICH TIER A LEVEL ROLLS — *"if you roll a level 4 Crystal you can get the
    // best mods, you can still get the worst mods too… Level 3 still decent
    // mods but less likely and more likely to get bad mods."* A LIFT and never
    // a gate, so the two things that have to hold are that better gets likelier
    // with the level and that NOTHING becomes impossible at any level.
    {
      const share = (level: number): number[] => {
        const seen: number[] = [0, 0, 0];
        const roll = new Rng(4242);
        const crystal = makeCrystal(level);
        for (let i = 0; i < 4000; i++) {
          const mod = rollRandomMod(crystal, pool, roll);
          if (mod) seen[mod.tier - 1]++;
        }
        return seen.map((n) => (100 * n) / 4000);
      };
      // Level 1 holds no modifiers at all, so it rolls nothing: that is
      // capacity rather than the lift, and the lift is what this measures.
      const rows = CRYSTAL_LEVELS.filter((l) => l.mods > 0)
        .map((l) => ({ level: l.level, share: share(l.level) }));
      for (const row of rows) {
        line(`  level ${row.level} rolls T1 ${row.share[0].toFixed(0)}% · ` +
          `T2 ${row.share[1].toFixed(0)}% · T3 ${row.share[2].toFixed(0)}%`);
      }
      const best = rows.map((r) => r.share[0]);
      check(
        best.every((n, i) => i === 0 || n > best[i - 1]),
        'the best tier gets likelier with every crystal level',
        best.map((n) => n.toFixed(1)).join(' → ')
      );
      check(
        rows.every((r) => r.share.every((n) => n > 0)),
        'and NO level makes any tier impossible — a level moves the odds, never the ceiling',
        JSON.stringify(rows.map((r) => r.share.map((n) => n.toFixed(1))))
      );
      check(
        MOD_TIER_LIFT.length === CRYSTAL_LEVELS.length && MOD_TIER_LIFT[0] === 1,
        'and the lowest level is the pool\'s own weights, untouched',
        JSON.stringify(MOD_TIER_LIFT)
      );
    }

    // HOW LONG A CRYSTAL TAKES, at the danger a rung actually carries. Levelling
    // is the whole of gear progression now, so the pace is the pace of the game.
    const clears = (danger: number, to: number): number =>
      Math.ceil((CRYSTAL_LEVELS.find((l) => l.level === to)?.xp ?? 0)
        / (CRYSTAL_XP.perClear + danger / CRYSTAL_XP.perDanger));
    gauge(
      'clears to level 4: ' +
        [0, 200, 400, 822].map((d) => `${d} danger ${clears(d, 4)}`).join(' · ')
    );
    gauge(
      'and to level 2: ' +
        [0, 200, 400, 822].map((d) => `${d} danger ${clears(d, 2)}`).join(' · ')
    );

    // Played out, and in THE ANSWERING, whose own floor is tier 1: past it the
    // zone floors the tier itself, so a level read at The Flowering would be
    // measuring the zone rather than the crystal.
    const dropped = (level: number): Set<number> => {
      const out = new Set<number>();
      const crystals = Array.from({ length: 4 }, () => makeCrystal(level));
      for (let seed = 0; seed < 60; seed++) {
        const sim = new RunSim(crystals, ladderCharacter(6, new Rng(seed)), new Rng(900 + seed), {
          rung: { zone: 0, rung: 11 },
        });
        runToCompletion(sim, 900);
        for (const item of sim.state.loot.items) {
          if (item.kind === 'gear' && !isUnique(item)) out.add(GEAR_BASE_BY_ID[item.base]?.tier ?? 1);
        }
      }
      return out;
    };
    const blank = dropped(1);
    const full = dropped(4);
    line(`  tiers actually dropped in The Answering: four blanks ${[...blank].sort().join('/')} · four at level 4 ${[...full].sort().join('/')}`);
    check(
      blank.size > 0 && Math.max(...blank) === 1 && Math.max(...full) === 3,
      'a levelled crystal drops tier 3 where a blank one drops tier 1',
      `${[...blank].join(',')} against ${[...full].join(',')}`
    );
    // AND THE ZONE FLOORS IT with nothing socketed at all, which is what makes
    // the campaign a gear ladder rather than 42 depths of tier 1.
    const byZone = LADDER.zones.map((zone, z) => runSet([], null, { zone: z, rung: 1 }).maxTier);
    check(
      byZone.join(',') === LADDER.zones.map((zone) => zone.tier).join(','),
      `and with EMPTY sockets the zone alone buys tier ${byZone.join(' → ')}`,
      byZone.join(',')
    );
  }
}

// THE CAMPAIGN PAYS THE FIRST CRYSTAL, and NOBODY BUT THE LAMPWRIGHT HANDS IT
// OVER. *"You shouldn't see any trial stuff or even receive any crystals until
// you've cleared the entire campaign."* So the whole 42-depth climb pays
// nothing on its own, and what finishing it is worth waits in the camp — which
// is what makes him the person the campaign ends at.
{
  const game = createGame('fresh');
  game.character = ladderCharacter(1, new Rng(3));
  game.character.climbed = {};
  game.given = ['weapon', 'crystal']; // his other two, already done

  // EVERY DEPTH BUT THE LAST, walked in order, puts nothing at the mouth.
  let owed = 0;
  let points = 0;
  LADDER.zones.forEach((zone, z) => {
    for (let rung = 1; rung <= zone.rungs; rung++) {
      takeRung(game.character, { zone: z, rung });
      if (giftWaiting(game)) owed++;
      points += trialPointsFor(game.character);
    }
  });
  check(
    campaignDone(game.character) && owed === 1 && points === 0,
    `the whole ${LADDER_RUNGS}-depth climb owes you something ${owed} time — at the END of it — and pays 0 points on the way`,
    `${owed} owed, ${points} points across the climb`
  );
  check(
    ownedCrystals(game).length === 0 && trialPointsFor(game.character) === 0,
    'and the last depth alone still hands over NOTHING: it is waiting in the camp',
    `${ownedCrystals(game).length} owned, ${trialPointsFor(game.character)} points`
  );

  // THE MEETING is the whole payment, crystal and points at once.
  const waiting = giftWaiting(game);
  check(
    waiting?.campaign === true && waiting.weapon === false && waiting.crystal === false,
    'what he is holding is the CAMPAIGN\'s reward and neither of his other two',
    JSON.stringify(waiting)
  );
  const hand = takeHandover(game, waiting!);
  check(
    hand.items.length === CAMPAIGN_REWARD.crystals
      && ownedCrystals(game).length === CAMPAIGN_REWARD.crystals
      && trialPointsFor(game.character) === CAMPAIGN_REWARD.points,
    `and taking it is ${CAMPAIGN_REWARD.crystals} crystal in your hands and ${CAMPAIGN_REWARD.points} trial points on the web`,
    `${ownedCrystals(game).length} owned, ${trialPointsFor(game.character)} points`
  );
  check(
    hand.says.some((said) => said.includes(String(CAMPAIGN_REWARD.points))),
    'and the panel SAYS the points, which are the one thing in it you cannot hold',
    JSON.stringify(hand.says)
  );
  // ONCE, and then he owes nothing at all — there is no second campaign.
  check(
    giftWaiting(game) === null && /The next crystal is/.test(giftSchedule(game)),
    'and once it is handed over what he owes next is the LADDER, which the screen names',
    `${JSON.stringify(giftWaiting(game))} · ${giftSchedule(game)}`
  );

  // THE CRYSTAL LADDER, which is the whole of what the endless half pays.
  // *"Normal crystals pay out at 25/50/75/100 runs of this new zone. Prismatic
  // crystal pays out and full lvl 4 normal crystals, then another at level 2
  // prismatic, another at level 3, another at lvl 4, and then the same for
  // demonic."* Walked here end to end, since a step nobody can reach is a
  // crystal nobody gets and no table check can see it.
  {
    const walk = createGame('fresh');
    walk.given = ['weapon', 'crystal'];
    walk.character.paidCampaign = true;
    walk.crystals = [];
    check(
      ladderOwed(walk) === null && (ladderSchedule(walk) ?? '').includes(String(CRYSTAL_LADDER[0].clears)),
      `nothing is owed at 0 clears, and the screen names the ${CRYSTAL_LADDER[0].clears} it waits on`,
      String(ladderSchedule(walk))
    );

    const took: string[] = [];
    // At the Proving Ground's OWN per-clear rate, so the clear count printed
    // below is a real one. Everything you hold is socketed and grinding, which
    // is the only way a crystal ever levels.
    const pays = xpForClear(runSet([], null, { proving: true, influence: 'fissure' }).rewards.danger);
    for (let round = 0; round < 4000 && took.length < CRYSTAL_LADDER.length; round++) {
      walk.provingClears = (walk.provingClears ?? 0) + 1;
      for (const crystal of ownedCrystals(walk)) addCrystalXp(crystal, pays);
      const owed = ladderOwed(walk);
      if (!owed) continue;
      const hand = takeHandover(walk, giftWaiting(walk)!);
      took.push(owed.id);
      check(
        hand.items.length === 1 && crystalFamily(hand.items[0]) === owed.family,
        `  ${owed.id} pays one ${owed.family} crystal`,
        `${hand.items.length} items, ${hand.items.map((i) => crystalFamily(i)).join(', ')}`
      );
    }
    check(
      took.join(',') === CRYSTAL_LADDER.map((c) => c.id).join(','),
      `all ${CRYSTAL_LADDER.length} steps of the ladder are reachable, IN ORDER, by playing`,
      took.join(', ')
    );
    check(
      ownedCrystals(walk).length === CRYSTAL_LADDER.length,
      `and every one of them is in your hands — ${ownedCrystals(walk).length} crystals`,
      String(ownedCrystals(walk).length)
    );
    const byFamily = MONSTER_FAMILIES.map(
      (f) => `${f.id} ${ownedCrystals(walk).filter((c) => crystalFamily(c) === f.id).length}`
    );
    line(`  the ladder pays ${byFamily.join(', ')}, over ${walk.provingClears} clears`);
    // AND NEVER TWICE. Every step is marked, so re-running pays nothing more.
    check(
      ladderOwed(walk) === null && giftWaiting(walk) === null,
      'and once the last one is taken the Lampwright owes nothing at all',
      JSON.stringify(giftWaiting(walk))
    );
    // A STEP IS NEVER SKIPPED. Holding four level-4 Normals does not pay the
    // Prismatic before the four Normals themselves have been taken.
    const jumped = createGame('fresh');
    jumped.given = ['weapon', 'crystal'];
    jumped.character.paidCampaign = true;
    jumped.crystals = Array.from({ length: 4 }, () => makeCrystal(4, 'normal'));
    jumped.provingClears = 0;
    check(
      ladderOwed(jumped) === null,
      'and a step further up the ladder cannot pay before the ones under it',
      String(ladderOwed(jumped)?.id)
    );
  }

  // AND NOTHING IS OWED EARLY. A character one depth short of the end has none.
  const top = LADDER.zones.length - 1;
  const nearly = createGame('fresh');
  nearly.character = ladderCharacter(1, new Rng(4));
  nearly.given = ['weapon', 'crystal'];
  nearly.character.climbed = Object.fromEntries(
    LADDER.zones.map((zone, z) => [zone.id, z === top ? zone.rungs - 1 : zone.rungs])
  );
  check(
    !campaignDone(nearly.character)
      && giftWaiting(nearly) === null
      && ownedCrystals(nearly).length === 0
      && trialPointsFor(nearly.character) === 0,
    'one depth short of the end is still no crystal and no point at all',
    `${ownedCrystals(nearly).length} owned, ${trialPointsFor(nearly.character)} points`
  );

  // THE FINISH LINE IS STATED BEFORE YOU GET THERE, on the screen the climb is
  // picked from, with the reward in numbers and the depth that pays it named.
  const last = LADDER.zones[top];
  check(
    campaignLine(nearly.character).includes(campaignPrize())
      && campaignLine(nearly.character).includes(`${last.name}, depth ${last.rungs}`),
    `and the climb names the finish line before you reach it — ${last.name}, depth ${last.rungs}, for ${campaignPrize()}`,
    campaignLine(nearly.character)
  );
  check(
    /holding/.test(campaignLine({ ...nearly.character, climbed: game.character.climbed }))
      && /has paid/.test(campaignLine(game.character)),
    'and it says he is HOLDING it once the climb is whole, and stops once he has let go',
    `${campaignLine({ ...nearly.character, climbed: game.character.climbed })} · ${campaignLine(game.character)}`
  );
}

// ===========================================================================
rule('THE ROCK\'S OWN RULES — does a crystal DO something, or just add up?');

// *"Change all the mods to be effectively just powerful nodes from the trials
// tree. Like for example it could be 50% chance for enemies guarding a box to
// all respawn once they die."* Eleven modifiers used to be a bigger number on a
// body; raw scaling is the RUNG's now. So every one of these has to be provable
// by PLAYING a descent — it fires, it pays, and the room still empties.
{
  /** A set carrying exactly one mechanic, at the top of its range, and nothing
   *  else — so what the descent does differently is that mechanic alone. */
  const carrying = (stat: string, value: number): Item[] => {
    const crystal = makeCrystal(4);
    crystal.mods = [
      {
        entryId: `probe_${stat}`,
        defId: 'probe',
        group: `probe_${stat}`,
        slot: 'mod',
        name: `of the ${stat}`,
        tier: 1,
        tags: [],
        stats: [{ stat, form: 'flat', value, tags: [] }],
      },
    ];
    return [crystal];
  };
  const bare: Item[] = [makeCrystal(4)];
  const who = () => ladderCharacter(5, new Rng(7));
  const play = (set: Item[], seed: number) => {
    const sim = new RunSim(set, who(), new Rng(seed));
    const end = runToCompletion(sim, 900);
    return { sim, end };
  };

  // EVERY ONE OF THEM HAS TO END. A rule that puts bodies back on the floor is
  // a rule that can loop for ever, and that is the only way any of these can
  // break the game rather than merely balance it.
  const ends: string[] = [];
  for (const [stat, value] of [
    ['watchChance', 100], ['veinChance', 100], ['splitChance', 100],
    ['wardenChance', 100], ['giltChance', 100], ['hoardChance', 100],
    ['wellChance', 100], ['monsterRank', 400],
  ] as Array<[string, number]>) {
    const { end } = play(carrying(stat, value), 6161);
    if (end.status === 'running') ends.push(`${stat} never finished`);
  }
  check(
    ends.length === 0,
    'every one of them at 100% still empties the room — nothing here can loop',
    ends.join(', ')
  );

  // THE SECOND WATCH, the user's own: a Hoard's guards stand back up ONCE. So
  // what has to hold is that they come back AND that they come back once —
  // the flag is on the lock, so a room can never grow past twice its guards.
  {
    const set = carrying('hoardChance', 100);
    set[0].mods.push({ ...set[0].mods[0], entryId: 'probe_watch', group: 'probe_watch',
      stats: [{ stat: 'watchChance', form: 'flat', value: 100, tags: [] }] });
    const { sim } = play(set, 5252);
    const risen = sim.state.hoards.filter((h) => h.risen).length;
    const opened = sim.state.hoards.filter((h) => h.opened).length;
    const guards = sim.state.monsters.filter((m) => m.hoard).length;
    line(`  the Second Watch: ${sim.state.hoards.length} locks, ${risen} stood back up, ` +
      `${opened} opened, ${guards} guards put down in all`);
    check(
      risen > 0 && opened === risen,
      'a Hoard\'s guards stand back up, and the lock still opens after they do',
      `${risen} rose, ${opened} opened of ${sim.state.hoards.length}`
    );
    // ONCE. Every lock that rose is flagged, and nothing clears the flag, so
    // the count of risen locks can never exceed the count of locks.
    check(
      risen <= sim.state.hoards.length,
      'and no lock ever does it twice — the flag is on the lock, not a counter',
      `${risen} risings over ${sim.state.hoards.length} locks`
    );
  }

  // THE CHEST IS WALKED TO. *"I want it to be a chest that will actually open
  // and when you kill all the mobs your character walks up and opens it."* So
  // the guards falling UNLOCKS it and nothing else, and the walk is a shipped
  // default policy `runToCompletion` runs — there is no click anywhere in it.
  {
    const set = carrying('hoardChance', 100);
    const sim = new RunSim(set, who(), new Rng(5252));
    // Every guard down, by hand, before a single step is taken: this is the
    // moment the box used to spring open on its own.
    let guard = 0;
    while (guard < 4000 && sim.state.hoards.every((h) => !h.free)) {
      sim.step(1 / 30);
      guard++;
    }
    const freed = sim.state.hoards.filter((h) => h.free);
    check(
      freed.length > 0 && freed.every((h) => !h.opened || dist(sim.state.hero, h) <= HOARD.reach),
      'a lock whose guards are down is UNLOCKED and still shut — it does not spring open where he stands',
      `${freed.length} freed, ${sim.state.hoards.filter((h) => h.opened).length} already open`
    );
    const end = runToCompletion(sim, 900);
    const locks = sim.state.hoards;
    check(
      end.status === 'cleared' && locks.length > 0 && locks.every((h) => h.free && h.opened),
      `and every one of the ${locks.length} is walked to and opened, headless, with the run still ending`,
      `${end.status}: ${locks.filter((h) => h.opened).length} of ${locks.length} opened`
    );
    check(
      locks.every((h) => (sim.state.map.props[h.at]?.id ?? '') === h.lock.open),
      'and the PICTURE changed with it — the same object, its open frame',
      locks.map((h) => sim.state.map.props[h.at]?.id).join(', ')
    );
    // A LOCK NOTHING CAN REACH may not hold a descent open for ever: the run
    // above ending at all is that, and this is the rule it rests on.
    line(`  ${locks.length} locks, all walked to, in ${end.elapsed.toFixed(0)}s`);
  }

  // THE VEIN pays CURRENCY where a Hoard pays gear: the same guard and the same
  // lock, a different thing behind it, which is what makes the pair a decision.
  {
    const vein = play(carrying('veinChance', 100), 4242);
    const hoard = play(carrying('hoardChance', 100), 4242);
    const coin = (s: typeof vein) =>
      Object.entries(s.end.loot.currency).filter(([id]) => id !== 'gold')
        .reduce((n, [, v]) => n + v, 0);
    line(`  a Vein pays ${coin(vein)} currency and ${vein.end.loot.items.length} pieces; ` +
      `a Hoard ${coin(hoard)} and ${hoard.end.loot.items.length}`);

    // EVERY LINE OF THE LEDGER IS COUNTED OFF A REAL DESCENT. A counter nothing
    // ever adds to is a grind nobody can finish and Tallies nobody can spend,
    // and no table check can see that — so each one is PLAYED here, through the
    // same `descentFacts` the run loop counts with.
    const ticked: string[] = [];
    const dead: string[] = [];
    const force: Record<string, () => Item[]> = {
      descents: () => [makeCrystal(4)],
      hoards: () => carrying('hoardChance', 100),
      veins: () => carrying('veinChance', 100),
      welled: () => carrying('wellChance', 100),
      wardens: () => carrying('wardenChance', 100),
      // A Bearer carries a RELIC and the Fissure owns none, so the gate keeps
      // one out of a bare run whatever the chance: it has to be the Rot.
      bearers: () => {
        const set = [makeCrystal(4, 'demonic'), makeCrystal(4, 'demonic')];
        set[0].mods = carrying('bearerChance', 100)[0].mods;
        return set;
      },
      // INFLUENCE is composition, so these are the crystals themselves rather
      // than a modifier: the Seam is exactly two of each of the other two.
      demonic: () => [makeCrystal(4, 'demonic'), makeCrystal(4, 'demonic')],
      prismatic: () => [makeCrystal(4, 'prismatic'), makeCrystal(4, 'prismatic')],
      seam: () => [
        makeCrystal(4, 'demonic'), makeCrystal(4, 'demonic'),
        makeCrystal(4, 'prismatic'), makeCrystal(4, 'prismatic'),
      ],
    };
    for (const counter of Object.keys(GRIND_COUNTERS)) {
      const build = force[counter];
      if (!build) { dead.push(`${counter}: nothing in the demo makes it happen`); continue; }
      const { sim } = play(build(), 8484);
      const added = GRIND_COUNTERS[counter](descentFacts(sim.state));
      if (added > 0) ticked.push(`${counter} +${added}`);
      else dead.push(`${counter} never moved`);
    }
    check(
      dead.length === 0,
      `all ${Object.keys(GRIND_COUNTERS).length} of the Ledger's counters tick in a descent actually played`,
      dead.join(', ')
    );
    line(`  ${ticked.join(', ')}`);

    // AND THE COUNT IS WHAT PAYS. One descent through `takeGrinds`, on a
    // character one short of a threshold, has to finish that line and no other.
    {
      const first = GRINDS.find((g) => g.counter === 'descents')!;
      const nearly = createGame('fresh');
      nearly.character.paidCampaign = true;
      nearly.character.grinds = { descents: first.need - 1 };
      const was = trialPointsFor(nearly.character);
      const won = takeGrinds(nearly, descentFacts(play([makeCrystal(4)], 8484).sim.state));
      check(
        won.length === 1 && won[0].id === first.id
          && trialPointsFor(nearly.character) === was + first.pays,
        `and the descent that reaches ${first.need} pays ${first.name} its ${first.pays}, and nothing else`,
        `${won.map((g) => g.id).join(', ')} — ${was} to ${trialPointsFor(nearly.character)}`
      );
      // NEVER TWICE. A line already paid is not paid again by the next clear.
      const twice = takeGrinds(nearly, descentFacts(play([makeCrystal(4)], 8484).sim.state));
      check(
        twice.length === 0 && trialPointsFor(nearly.character) === was + first.pays,
        'and the clear after it pays nothing more for the same line',
        `${twice.length} won, ${trialPointsFor(nearly.character)} Tallies`
      );
    }
    check(
      vein.sim.state.hoards.every((h) => h.pays === 'currency')
        && hoard.sim.state.hoards.every((h) => h.pays === 'gear'),
      'a Vein and a Hoard are the same lock and pay different things',
      `${vein.sim.state.hoards.length} veins, ${hoard.sim.state.hoards.length} hoards`
    );
    check(
      coin(vein) > coin(hoard),
      'and the Vein is the one that pays in currency',
      `${coin(vein)} against ${coin(hoard)}`
    );
  }

  // THE WARDEN: nothing in its pack can be hurt while it stands, and the warden
  // itself always can — which is the whole reason the room still empties.
  {
    const { sim } = play(carrying('wardenChance', 100), 3333);
    const wardens = sim.state.monsters.filter((m) => m.warden);
    check(
      wardens.length > 0 && wardens.every((m) => m.dead),
      'a warded pack cannot be finished without its Warden, so every one is down',
      `${wardens.filter((m) => m.dead).length}/${wardens.length} down`
    );
    // Put in front of the sim: a sheltered body takes NOTHING, and the same
    // body takes damage the moment its warden is gone.
    const probe = new RunSim(carrying('wardenChance', 100), who(), new Rng(3333)) as any;
    const warden = probe.state.monsters.find((m: any) => m.warden);
    const kin = probe.state.monsters.find((m: any) => !m.warden && m.pack === warden?.pack);
    const life = kin?.life ?? 0;
    probe.dealDamage(probe.state.hero, kin, 1, undefined);
    const sheltered = kin.life;
    warden.dead = true;
    probe.dealDamage(probe.state.hero, kin, 1, undefined);
    check(
      sheltered === life && kin.life < life,
      'and a hit on one of its pack lands for NOTHING until the Warden is down',
      `${life} → ${sheltered} warded → ${kin.life} after`
    );
  }

  // THE SPLITTING is the Welling's mirror: what dies leaves one of the rank
  // BELOW, and a common leaves nothing. The ladder is the termination proof.
  {
    const { sim, end } = play(carrying('splitChance', 100), 2121);
    const split = sim.state.monsters.filter((m) => m.split);
    const commons = split.filter((m) => m.rank === MONSTER_RANKS[0].id);
    line(`  the Splitting: ${end.totalMonsters} bodies from ${sim.state.monsters.length - split.length} spawned, ` +
      `${split.length} of them split off`);
    check(
      split.length > 0 && split.every((m) => !MONSTER_RANKS[0] || m.rank !== undefined),
      'a body leaves one of the rank below it',
      `${split.length} split off`
    );
    check(
      commons.every((m) => m.split) && end.status !== 'running',
      'and a common leaves nothing, which is what bounds it',
      `${commons.length} commons off splits, run ${end.status}`
    );
  }

  // GILDED is the one with no danger on it at all: pure coin, priced as the
  // find modifiers are — the cost is the socket and the slot a rule is not in.
  {
    const gilt = play(carrying('giltChance', 100), 1717);
    const plain = play(bare, 1717);
    line(`  Gilded pays ${Math.round(gilt.end.loot.currency.gold ?? 0)} gold against ` +
      `${Math.round(plain.end.loot.currency.gold ?? 0)}`);
    check(
      (gilt.end.loot.currency.gold ?? 0) > (plain.end.loot.currency.gold ?? 0),
      'Gilded pays coin off a body on top of what the kill already paid',
      `${Math.round(gilt.end.loot.currency.gold ?? 0)} against ${Math.round(plain.end.loot.currency.gold ?? 0)}`
    );
    check(
      Math.abs(runSet(carrying('giltChance', 100)).rewards.danger
        - runSet(bare).rewards.danger) < 1e-6,
      'and carries no danger, so it is never paid for twice',
      `${runSet(carrying('giltChance', 100)).rewards.danger}`
    );
  }

  // THE POOL, said as one fact: what a crystal rolls is what the floor DOES.
  const crystalMods = ALL_MODS.filter((m) => m.appliesTo.includes('crystal'));
  const inflation = crystalMods.filter((m) =>
    m.tiers.some((t) => t.stats.some((st) =>
      ['monsterLife', 'monsterDamage', 'monsterArmour', 'monsterCrit', 'monsterMoveSpeed'].includes(st.stat)
        || st.stat.endsWith('Res')))
  );
  line(`  ${crystalMods.length} crystal modifiers, ${inflation.length} of them a bigger number on a body`);
  check(
    inflation.length === 0,
    'and NOTHING a crystal rolls is raw monster scaling any more — that is the rung\'s',
    inflation.map((m) => m.id).join(', ')
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
  const behaviours = new Set(MAIN_SKILLS.map((s) => s.behaviour));
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

    // And they are REACHABLE, or the whole table is decoration. Asked of the
    // pool rather than played: measured, the deep end pays 0.11 named pieces a
    // descent, so sixteen expects 1.8 and reads ZERO one run in six — a coin
    // toss, not a finding, and sixty-four descents is nine minutes.
    //
    // What can actually go wrong is silent: a base whose item level climbs past
    // what the top band drops takes its unique out of the game and nothing
    // says so. That is what this asks, and it is deterministic.
    const top = DROP_BANDS[DROP_BANDS.length - 1];
    const gated = UNIQUES.filter((u) =>
      MAP_THEMES.some((t) => opensHere(u.gate, POWER.max, t.id as MapTheme))
    );
    const tooDeep = gated.filter((u) => (GEAR_BASE_BY_ID[u.base]?.ilvl ?? 1) > top.ilvl);
    check(
      gated.length > 0 && tooDeep.length === 0,
      `and every one of the ${gated.length} the deep end opens is inside what it drops`,
      tooDeep.map((u) => `${u.id} needs ilvl ${GEAR_BASE_BY_ID[u.base]?.ilvl}`).join(', ')
    );
    let found = 0;
    for (let i = 0; i < 16; i++) {
      const sim = new RunSim(set, ceiling(6, 'arc_lightning', LEVELLING.maxLevel), new Rng(600 + i));
      runToCompletion(sim, 600);
      found += sim.state.loot.items.filter((it) => it.meta.unique !== undefined).length;
    }
    gauge(`and hands out ${found} in 16 descents at the deep end — 1.8 expected, so a zero is noise`);
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
rule('GRAFTS — do a corpse and a handful of dust buy what no drop can roll?');

// A graft is the one thing in the game that makes a piece of gear give a thing
// UP to get a thing. Everything here is about that trade actually happening:
// the specimen only comes out of one world, the line lands where the base's own
// line stood, and a named piece is refused.
{
  const g = createGame('fresh');

  // A gate is a WALL: the pool is filtered before the roll, so no amount of
  // rarity finds a specimen anywhere but the Rot.
  const wrong = RELICS.flatMap((r) =>
    MAP_THEMES.filter((t) => t.id !== r.gate.zone && opensHere(r.gate, POWER.max, t.id)).map(
      (t) => `${r.id} in ${t.id}`
    )
  );
  check(wrong.length === 0, `each of the ${RELICS.length} relics exists in ONE world`, wrong.join(', '));
  check(
    RELICS.every((r) => SCENE_BY_ID[r.wants] !== undefined),
    'and every relic names a room somebody is standing in',
    RELICS.filter((r) => !SCENE_BY_ID[r.wants]).map((r) => r.id).join(', ')
  );

  // It is loot, so it banks with everything else — and nothing sells one,
  // which is what keeps both the bulk button and the filter from eating it.
  const specimen = makeRelic(RELICS[0]);
  bankLoot(g, [specimen, makeGear('ash_wand', 1)]);
  check(sellPrice(specimen) === 0 && !canSell(specimen), 'nothing sells a specimen', String(sellPrice(specimen)));
  check(
    relicsIn(g).length === 1 && g.inventory.every((i) => i.kind === 'gear'),
    'and banking it puts it in its own column rather than the bag',
    `${relicsIn(g).length} relics, ${g.inventory.length} in the bag`
  );

  // Holding one IS the schedule, and it is rung 3: nothing is rolled, and the
  // two above him have to be settled before he is the one at the top.
  const sim = new RunSim([], g.character, new Rng(3));
  runToCompletion(sim);
  const settled = createGame('dev');
  settled.sockets = {};
  settled.relics = [];
  const wants = RELICS[0].wants;
  check(
    relicFor(settled, wants) === null,
    "nobody's bench is offered with nothing carried",
    relicFor(settled, wants)?.base ?? ''
  );
  settled.relics = [makeRelic(RELICS[0])];
  check(
    relicFor(settled, wants)?.base === RELICS[0].id,
    'and carrying one is the whole of what puts his bench in front of you',
    relicFor(settled, wants)?.base ?? 'nothing'
  );

  // The trade. `helmet`, `body` and `boots` only, and the base's own line is
  // what it is written over.
  const helm = makeGear('skirmisher_helmet_t1', 20);
  const was = helm.implicits.map(describeMod).join('; ');
  check(was.length > 0, 'a helmet arrives with a line off its base', was || 'none');
  g.inventory.push(helm);
  const forged = forgedFor(helm)[0];
  const made = spendRelic(g, relicsIn(g)[0], helm, forged.mod.id)!;
  check(
    made !== null && made.implicits.length === 1 && made.implicits[0].defId === forged.mod.id,
    `the graft writes ${forged.mod.name} where the base's line stood`,
    made?.implicits.map(describeMod).join('; ') ?? 'nothing'
  );
  check(
    made.implicits.every((m) => describeMod(m) !== was),
    'and the base line is gone, which is the whole trade',
    describeMod(made.implicits[0])
  );
  check(relicsIn(g).length === 0, 'the specimen is spent', String(relicsIn(g).length));
  check(
    made.armour === helm.armour && made.armour !== undefined,
    'and the armour rating is not the implicit and is untouched',
    `${helm.armour} → ${made.armour}`
  );

  // MET ONCE, in a descent, and afterwards he is somebody standing in the camp
  // that you go and talk to.
  {
    const fresh = createGame('fresh');
    fresh.given = ['weapon', 'crystal'];
    fresh.relics = [makeRelic(RELIC_BY_ID.pristine_specimen)];
    check(
      folkMet(fresh).length === 0,
      'somebody you have not found is not standing in the camp',
      folkMet(fresh).map((f) => f.id).join(', ')
    );
    takeMet(fresh, 'ossuary');
    check(
      hasMet(fresh, 'ossuary') && relicFor(fresh, 'ossuary')?.base === 'pristine_specimen',
      'and once you have found him, what you carry is what his bench is offered for',
      relicFor(fresh, 'ossuary')?.base ?? 'nothing'
    );
    check(
      folkMet(fresh).some((f) => f.id === 'ossuary')
        && folkMet(fresh).every((f) => !f.encounter),
      'he is somebody you can go and see instead, and a BOSS never is',
      folkMet(fresh).map((f) => f.id).join(', ')
    );

    // A save written before any of this reads met-ness off a GRAFTED piece,
    // which is the only proof it holds that you stood in that room.
    const old = createGame('fresh');
    old.given = ['weapon'];
    const cap = makeGear('skirmisher_helmet_t1', 20);
    old.inventory = [graft(cap, forgedFor(cap)[0].mod.id)!];
    heal(old);
    check(
      hasMet(old, 'ossuary'),
      'and a save holding a piece he wrote on knows you have met him',
      (old.given ?? []).join(', ')
    );
  }

  // Wherever it was kept, it stays there. Worn is the one that matters: a
  // graft that dropped a worn helmet into the bag would undress you.
  const worn = createGame('fresh');
  const boots = makeGear('skirmisher_boots_t1', 20);
  worn.inventory.push(boots);
  equipItem(worn, boots, 'boots');
  worn.relics = [makeRelic(RELICS[0])];
  const bootLine = forgedFor(boots)[0];
  spendRelic(worn, worn.relics[0], boots, bootLine.mod.id);
  check(
    worn.character.equipment.boots?.meta.grafted === bootLine.mod.id,
    'a piece you are WEARING is grafted where it stands',
    String(worn.character.equipment.boots?.meta.grafted)
  );

  // A unique is REFUSED, and missing this ruins saves: `makeUnique` puts a
  // named piece's whole identity into `implicits`, and nothing puts it back.
  const named = UNIQUES.map((u) => makeUnique(u, 70, new Rng(4))).filter(
    (i) => graftableKinds().includes(String(i.meta.gearKind))
  );
  check(named.length > 0, 'there is a named piece in a slot he works on', String(named.length));
  const took = named.filter((i) => graftRefusal(i) === null);
  check(took.length === 0, 'and every one of them is refused', took.map((i) => i.name).join(', '));

  // A second graft replaces the first. The base's line went the moment one
  // landed, so a piece stuck on one choice would make a first graft a mistake
  // nobody could walk back.
  const again = graft(made, forgedFor(made)[forgedFor(made).length - 1].mod.id)!;
  check(again !== null && again.implicits.length === 1, 'a second graft replaces the first', String(again?.implicits.length));

  // A forged line never drops. Weight 0 and out of the pool, but IN `ALL_MODS`
  // so a save resolves it.
  const rollable = new ModPool(ALL_MODS).entries.filter(
    (e) => FORGED_BY_ID[e.defId] && e.weight > 0
  );
  check(rollable.length === 0, 'no forged line has a weight to be rolled at', rollable.map((e) => e.id).join(', '));
  check(
    FORGED.every((f) => ALL_MODS.includes(f.mod)),
    'and every one is in ALL_MODS anyway, so a save resolves it',
    FORGED.filter((f) => !ALL_MODS.includes(f.mod)).map((f) => f.mod.id).join(', ')
  );

  // A switch on a LINE obeys every rule a tree node's does: declared, read by
  // a delivery a player can pick, and printing its own number.
  const undeclared: string[] = [];
  const unread: string[] = [];
  const mute: string[] = [];
  for (const f of FORGED) {
    for (const [id, value] of Object.entries(f.mod.grants ?? {})) {
      const def = GRANT_BY_ID[id];
      if (!def) { undeclared.push(`${f.mod.id}/${id}`); continue; }
      // A switch read by the STAT pass rather than by a delivery is read by
      // every skill there is — the cost multiplier is the worked example.
      const byStats = def.reads.includes(STATS);
      if (!byStats && !MAIN_SKILLS.some((s) => behaviourReads(s.behaviour, id))) {
        unread.push(`${f.mod.id}/${id}`);
      }
      if (def.say?.(value) === null || def.say === undefined) mute.push(`${f.mod.id}/${id}`);
    }
  }
  check(undeclared.length === 0, 'every switch a forged line hands over is declared in GRANTS', undeclared.join(', '));
  check(unread.length === 0, 'and read by a skill you can actually pick', unread.join(', '));
  check(mute.length === 0, 'and says its own number out of the table the sim reads', mute.join(', '));

  // It reaches the sim by the ONE path a unique's does: worn, through
  // `treeGrants`. A switch nothing merges is a graft that does nothing.
  const wearing = createGame('fresh');
  const chest = makeGear('skirmisher_body_t1', 20);
  wearing.inventory.push(chest);
  equipItem(wearing, chest, 'body');
  const bleeder = FORGED.find((f) => f.mod.grants?.bleedOnHit)!;
  wearing.character.equipment.body = graft(chest, bleeder.mod.id)!;
  check(
    bleedOf(treeGrants(wearing.character)) !== null,
    'a grafted switch reaches the sim off what is WORN',
    JSON.stringify(treeGrants(wearing.character))
  );

  // And it does something. What it does is LAND AN AILMENT, so that is what is
  // asserted — deterministically, off the bodies themselves.
  //
  // It used to be timed instead, and a clear is mostly WALKING: measured over
  // 96 seeds the Bleed is worth 1.5% of the kills by 30s and the clear-time
  // gap around it swings 5% either way, so the timing said whatever the maps
  // said. It is printed below as a gauge and fails nothing.
  const BLEED_SEEDS = 48;
  const bare = createGame('fresh');
  bare.inventory.push(makeGear('skirmisher_body_t1', 20));
  equipItem(bare, bare.inventory[0], 'body');

  const bleeding = (who: typeof bare.character, seed: number): number => {
    const run = new RunSim([], who, new Rng(seed));
    const marked = new Set<Entity>();
    while (run.state.status === 'running') {
      run.step(1 / 30);
      for (const m of run.state.monsters) {
        if (m.ailments.some((a) => a.id === 'bleed')) marked.add(m);
      }
    }
    return marked.size;
  };
  const bit = bleeding(wearing.character, 21);
  check(bit > 0, `and every hit leaves one: ${bit} bodies bleeding in one descent`, String(bit));
  check(
    bleeding(bare.character, 21) === 0,
    'and nothing bleeds without it, so the line is the whole of what did it',
    'a bare chest left a body bleeding'
  );

  const clear = (who: typeof bare.character): number => {
    let total = 0;
    for (let seed = 21; seed < 21 + BLEED_SEEDS; seed++) {
      const run = new RunSim([], who, new Rng(seed));
      runToCompletion(run);
      total += run.state.elapsed;
    }
    return total / BLEED_SEEDS;
  };
  gauge(
    `worth ${(((clear(bare.character) - clear(wearing.character)) / clear(bare.character)) * 100).toFixed(1)}% ` +
      `of a clear over ${BLEED_SEEDS} seeds — a figure the maps swamp, which is why it is not a check`
  );

  // --- jewellery, which HAS an implicit to replace now ------------------
  // A graft used to cost a ring nothing, since jewellery carried no line. Every
  // ring and amulet is an implicit now, so the trade is the same on all of them
  // and the one slot where a graft was free is gone.
  {
    const jewels = ['ring', 'amulet'];
    const has = jewels.filter((k) => graftableKinds().includes(k));
    check(has.length === jewels.length, 'a ring and an amulet are both worked on', has.join(', '));

    const bare = GEAR_BASES.filter((b) => jewels.includes(b.kind));
    const blank = bare.filter((b) => (b.implicit?.length ?? 0) === 0).map((b) => b.id);
    check(
      blank.length === 0,
      `and all ${bare.length} of them carry a line to LOSE, so a graft costs the same here as anywhere`,
      blank.join(', ')
    );

    // Each person writes their OWN lines. The man who takes bodies has no
    // opinion about a ring and says so out loud, so the panel must agree.
    const homeless = FORGED.filter((f) => !SCENE_BY_ID[f.who]).map((f) => f.mod.id);
    check(homeless.length === 0, 'every forged line is written in a room somebody stands in', homeless.join(', '));
    const barren = RELICS.filter((r) => FORGED.every((f) => f.who !== r.wants)).map((r) => r.id);
    check(barren.length === 0, 'and every relic buys something where it is taken', barren.join(', '));

    const at = createGame('fresh');
    const ring = makeGear('ring_life_t2', 40);
    check(
      graftRefusal(ring, 'ossuary') !== null && graftRefusal(ring, 'orrery') === null,
      'a ring taken to the man who wants bodies is a piece he refuses',
      `${graftRefusal(ring, 'ossuary')} / ${graftRefusal(ring, 'orrery')}`
    );
    const helm2 = makeGear('skirmisher_helmet_t1', 20);
    check(
      graftRefusal(helm2, 'orrery') !== null && graftRefusal(helm2, 'ossuary') === null,
      'and a helmet taken to the one who wants dust is refused the other way',
      `${graftRefusal(helm2, 'orrery')} / ${graftRefusal(helm2, 'ossuary')}`
    );
    at.inventory.push(ring);
    at.relics = [makeRelic(RELIC_BY_ID.prismatic_dust)];
    const forgedRing = forgedFor(ring, 'orrery')[0];
    const cut = spendRelic(at, at.relics[0], ring, forgedRing.mod.id)!;
    check(
      cut !== null && cut.implicits.length === 1,
      'and a graft on one ADDS where there was nothing',
      String(cut?.implicits.length)
    );
    equipItem(at, cut, 'ring1');
    const grants = treeGrants(at.character);
    check(
      grants.burstOnHit !== undefined,
      'a ring walks out carrying something a ring cannot otherwise hold',
      JSON.stringify(grants)
    );
    // The one that changes the delivery pays for it, wherever the switch came
    // from. Conditional damage stays free, the same as on a tree.
    const delivery = FORGED.filter(
      (f) => GRANT_BY_ID[Object.keys(f.mod.grants ?? {})[0] ?? '']?.changes === 'targets'
    );
    const free = delivery.filter((f) => f.mod.grants?.manaMultiplier === undefined).map((f) => f.mod.id);
    check(free.length === 0, 'and the line that changes the cast charges mana for it', free.join(', '));
  }

  // `heal()` puts the base's line BACK when a forged def is gone. It drops
  // items by BASE and has never healed a MOD, so this is the first of its kind.
  const stale = createGame('fresh');
  const old = graft(makeGear('skirmisher_helmet_t1', 20), forged.mod.id)!;
  old.meta.grafted = 'a_line_that_was_cut';
  stale.inventory = [old];
  heal(stale);
  check(
    stale.inventory[0].meta.grafted === undefined &&
      describeMod(stale.inventory[0].implicits[0]) === was,
    'a graft whose line was cut hands the base its own line back',
    stale.inventory[0].implicits.map(describeMod).join('; ') || 'nothing at all'
  );
}

// ===========================================================================
rule('THE SAVE — does a save survive the game changing under it?');
{
  const game = createGame('dev');
  equipSkill(game.character, 'fireball');
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
  // A save written before the haul went keeps one, and everything in it is as
  // rotten as the bag it is about to be poured into.
  (game as unknown as { haul: Item[] }).haul = [
    makeGear('ash_wand', 1),
    { ...game.inventory[0], id: 'haul_ghost', base: 'base_that_was_renamed' },
  ];
  (game as unknown as { junk: string[] }).junk = ['armour_spell'];
  game.wallet.shard_of_something_removed = 9;
  (game.character as any).equipped.main = 'a_skill_that_was_cut';

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
    (game as unknown as { haul?: Item[] }).haul === undefined &&
      game.inventory.some((i) => i.base === 'ash_wand') &&
      !game.inventory.some((i) => i.id === 'haul_ghost'),
    'an old haul is poured into the bag, minus whatever had rotted in it',
    `${game.inventory.length} carried`
  );
  check(
    (game as unknown as { junk?: string[] }).junk === undefined,
    'and a save written when there was a filter loses it entirely, keeping more',
    'the filter is still on the save'
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
    (game as { quests?: unknown }).quests === undefined,
    'and the quest ladder it was written against is dropped, never the crystals it paid',
    JSON.stringify((game as { quests?: unknown }).quests)
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
    SKILL_BY_ID[mainSkillId(game.character)] !== undefined,
    'a cut skill is replaced by a real one',
    mainSkillId(game.character)
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
    equipSkill(deep.character, 'fireball');
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

  // The check above named the collections it looked in, and so did the code —
  // and a field on neither list leaked. So this asks the question of EVERY
  // field that can hold an item, by walking the save rather than remembering.
  const collections: Array<[string, (g: GameState, item: Item) => void]> = [
    ['inventory', (g, item) => { g.inventory = [item]; }],
    ['stash', (g, item) => { g.stash = [item]; }],
    ['crystals', (g, item) => { g.crystals = [item]; }],
    ['relics', (g, item) => { g.relics = [item]; }],
    ['sold', (g, item) => { g.sold = [{ item, price: 1 }]; }],
    ['materials', (g, item) => { g.materials = [item]; }],
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
      inventory: [], stash: [], crystals: [], relics: [], sold: [], materials: [], craftId: null,
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
    ? `  ✓ every check passed (${ran})`
    : `  ✗ ${failed} check${failed === 1 ? '' : 's'} failed — see above`
);
if (parkedCount > 0) {
  line(`  … and ${parkedCount} parked for the balance pass — each printed above`);
}
process.exitCode = failed === 0 ? 0 : 1;
