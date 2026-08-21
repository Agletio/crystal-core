import { readFileSync } from 'node:fs';
import { Rng } from './rng';
import { ModPool } from './mods';
import { canApply, craft, describeItem, describeMod, itemMatches } from './crafting';
import {
  AILMENT,
  ALL_MODS,
  AILMENT_OF_TYPE,
  ATTRIBUTES,
  DEFENCE,
  FISSURE,
  BINDING_BY_ID,
  HERO_BASE,
  MANA,
  MELEE,
  PASSIVE_DAMAGE,
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
  CRYSTAL_QUESTS,
  CRYSTAL_LEVELS,
  INTRO,
  BOSSES,
  BOSS_BY_ID,
  BOSS_KEYS,
  BOSS_KEY_BY_ID,
  BOSS_POSES,
  LAMPWRIGHT,
  QUEST_BY_ID,
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
  TRIALS,
  DAMAGE_TYPE_BY_ID,
  MONSTER_ABILITIES,
  abilitiesFor,
  MONSTER_ABILITY_BY_ID,
  monsterAddedStat,
  MONSTERS,
  MONSTERS_BY_FAMILY,
  MONSTER_FAMILIES,
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
  GEAR_BASES,
  GEAR_BASE_BY_ID,
  KEEP_GROUPS,
  keepGroupFor,
  BASE_TIER_MODS,
  RUN_SLOTS,
  armourBudget,
  implicitSpend,
  RECIPES,
  SKILLS,
  SKILL_BY_ID,
  TRADE,
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
  makeRelic,
  canSell,
  rollGear,
  sellPrice,
} from './economy';
import { hasArmourArt } from './ui/icons';
import { RunSim, TICK, runToCompletion, walkToMeeting } from './sim/run';
import { findPath } from './sim/pathfind';
import { folkMet, gaveKey, hasMet, sceneWaiting, takeBoss, takeMet } from './game/scenes';
import { TRIAL_CONDITIONS, healTrials } from './game/trials';
import { TRIAL_POINTS_MAX, canAllocateTrial, canDeallocateTrial, trialNodes } from './trials';
import { forgedFor, graft, graftRefusal, graftableKinds, spendRelic } from './game/graft';
import {SCENES, SCENE_BY_ID } from './scenes';
import { CAMP, CAMP_FIXTURES, CAMP_SOCKETS, CAMP_SPOTS } from './scenes/camp';
import type { SceneDef } from './scenes';
import { COVER_PROPS, COVER_SET, HUNG_PROPS, SOLID_PROPS, VIGNETTES, WALL_PROPS } from './vignettes';
import { PROP_ART } from './render/generated-props';
import { ZONES } from './render/generated-tiles';
import type { RunState } from './sim/run';
import {
  declaredCapacity,
  baseTier,
  modCapacity,
  slotAllocation,
  slotCapacity,
  slotTypes,
  slotUsed,
} from './mods';
import { ENTRANCE, EXIT, FLOOR, TUNNEL, WALL, clearSpot, dist, generateMap, sceneMap } from './sim/grid';
import type { Grid } from './sim/grid';
import { CREATURE_FRAMES, GLOW, IDLE_CYCLE, STRIDE_CYCLE, framesOf, wellFormed } from './render/sprites';
import { PORTRAITS } from './render/portraits';
import { BEASTIARY, MONSTER_FRAMES } from './render/bestiary';
import { GENERATED } from './render/generated-art';
import { GENERATED_ICONS } from './render/generated-icons';
import { HELD, HERO_HANDS } from './render/held';
import { heldFor } from './sim/appearance';
import { animates, generatedFrame } from './render/sprites';
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
  convertedType,
  heroStats,
  damageBreakdown,
  damageDetail,
  monsterStats,
  effectiveSkill,
  weaponMod,
  skillBase,
  statMods,
  passiveScale,
  treeGrants,
  trialMod,
  ailmentChances,
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
import { SPOKE_COUNT, TRADE_NODES } from './trades/layout';
import {
  TRADES,
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
  lampwrightWeapon,
  giftWeapon,
  keepsItem,
  plainGear,
  replaceItem,
  selectForCraft,
  sellAll,
  sellItem,
  socketFor,
  socketItem,
  socketed,
  sortGear,
  relicsIn,
  stashRoom,
  stashUpgradeCost,
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
 * characters the ladder walks, and that walk moved with the trunk's shape. The
 * numbers still print; `ROADMAP.md` names all four.
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
rule('THE FILTER — what comes up out of the Fissure, and can the loop wedge?');

// There is one container now: your bag. Everything a cleared descent found
// either lands in it or arrives as gold, and which of the two is a standing
// rule you set once. What has to hold: a run never loses a drop, capacity is
// read between runs so nothing is split, the filter is read on the way up and
// nowhere else, and there is always a way back under the limit — otherwise the
// game has a state you cannot play out of.
{
  // Every base is in EXACTLY one group, or the filter has a hole a piece falls
  // through — and a piece nothing matches would be silently unsellable forever.
  {
    const homeless = GEAR_BASES.filter((b) => !keepGroupFor(b));
    const doubled = GEAR_BASES.filter((b) => KEEP_GROUPS.filter((g) => g.holds(b)).length > 1);
    line(`  ${KEEP_GROUPS.length} groups over ${GEAR_BASES.length} bases: ` +
      KEEP_GROUPS.map((g) => `${g.name} ${GEAR_BASES.filter((b) => g.holds(b)).length}`).join(', '));
    check(
      homeless.length === 0 && doubled.length === 0,
      'every gear base falls in exactly one keep group',
      `${homeless.length} in none, ${doubled.length} in two`
    );
  }

  const game = createGame('fresh');
  const drops = Array.from({ length: 20 }, (_, i) => makeGear('ash_wand', i + 1));
  const first = bankLoot(game, drops);
  check(
    game.inventory.length === 20 && first.sold === 0,
    'with nothing junked a cleared run banks the lot into your bags',
    `${game.inventory.length} carried, ${first.sold} sold`
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

// The two axes, and what taking both comes to. A rung and a group are ANDed,
// so "tier 3 mage gear" is two clicks — and the demo is what stops the two
// halves quietly becoming an OR, which would sell almost everything.
{
  const game = createGame('fresh');
  const mageHelm = makeGear('arcanist_helmet_t3', 46);
  const mageBoot = makeGear('arcanist_boots_t1', 1);
  const tankHelm = makeGear('bulwark_helmet_t3', 46);
  const bow = makeGear('yew_longbow', 46);

  check(
    [mageHelm, tankHelm, bow].every((i) => keepsItem(game, i)),
    'an untouched filter keeps everything, so a save that never opens it is unchanged',
    `junk holds ${game.junk.length}`
  );

  game.junk = ['armour_spell'];
  check(
    !keepsItem(game, mageHelm) && !keepsItem(game, mageBoot) &&
      keepsItem(game, tankHelm) && keepsItem(game, bow),
    'junking a group sells every rung of it and touches nothing else',
    `mage t3 ${keepsItem(game, mageHelm)}, tank ${keepsItem(game, tankHelm)}`
  );

  game.junk = ['t1', 't2'];
  check(
    !keepsItem(game, mageBoot) && keepsItem(game, mageHelm) && keepsItem(game, tankHelm),
    'junking a rung sells every group at it and touches nothing else',
    `t1 ${keepsItem(game, mageBoot)}, t3 ${keepsItem(game, mageHelm)}`
  );

  game.junk = [...KEEP_GROUPS.map((g) => g.id), 't1', 't2'].filter((id) => id !== 'armour_spell');
  check(
    keepsItem(game, mageHelm) && !keepsItem(game, mageBoot) && !keepsItem(game, tankHelm) &&
      !keepsItem(game, bow),
    'and both axes together keep exactly one rung of one group',
    `mage t3 ${keepsItem(game, mageHelm)}, mage t1 ${keepsItem(game, mageBoot)}`
  );

  // A unique is only ever a decision, and a rule set weeks ago was not a
  // decision about this one. The same line the bulk sell button holds.
  const named = makeUnique(UNIQUES[0], 60, new Rng(3));
  check(
    keepsItem(game, named),
    'a named piece is never junk, whatever the filter says about its base',
    named.name
  );
}

// What the filter is FOR: gold, banked on the way up, and a bag that fills
// slower for it. Both halves have to land on the report, or a screen you set
// once and never open again is invisible.
{
  const game = createGame('fresh');
  game.junk = ['armour_melee'];
  const loot = [
    makeGear('bulwark_helmet_t2', 22),
    makeGear('bulwark_body_t2', 22),
    makeGear('arcanist_helmet_t2', 22),
  ];
  const before = balance(game.wallet, 'gold');
  const banked = bankLoot(game, loot);
  check(
    banked.sold === 2 && banked.kept.length === 1 && game.inventory.length === 1,
    'the filter takes its share on the way up and the rest lands in the bag',
    `${banked.sold} sold, ${banked.kept.length} kept, ${game.inventory.length} carried`
  );
  check(
    banked.gold > 0 && balance(game.wallet, 'gold') === before + banked.gold,
    `and what it sold is real gold — ${banked.gold} of it`,
    `${balance(game.wallet, 'gold')} against ${before}`
  );
  check(
    game.sold.length === 0,
    'and never reaches the counter, where a descent of them would bury a real sale',
    `${game.sold.length} on the counter`
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
    // that keeps a frame no state names is a generation nobody sees.
    const stranded = Object.entries(GENERATED).flatMap(([id, art]) =>
      art.frames.map((_, at) => `${id}:${at}`).filter((k) => !reached.has(k))
    );
    check(stranded.length === 0, 'and every frame that ships is one something reaches', stranded.join(', '));

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
  // A PLACE has nobody in it — whoever you have met is standing about, and who
  // that is belongs to the game rather than to this table.
  const rooms = SCENES.filter((s) => !s.place);
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
  const noProp = SCENES.flatMap((s) => {
    const map = sceneMap(s.plan, s.theme, 1);
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
    x: Math.round(room.plan.stands.x),
    y: Math.round(room.plan.stands.y),
  });
  const at = (grid: Grid, v: { x: number; y: number }) =>
    Math.round(v.y) * grid.width + Math.round(v.x);
  {
    const furnished = SCENES.map((room) => ({ room, map: sceneMap(room.plan, room.theme, 1) }));
    const bad: string[] = [];
    let solids = 0;
    for (const { room, map } of furnished) {
      for (const p of room.plan.props) {
        if (!SOLID_PROPS.has(p.id)) continue;
        solids++;
        if (!map.grid.solid[at(map.grid, p)]) bad.push(`${room.id}: ${p.id}@${p.x},${p.y} is walked through`);
      }
      for (let y = 0; y < map.grid.height; y++) {
        for (let x = 0; x < map.grid.width; x++) {
          if (!map.grid.solid[y * map.grid.width + x]) continue;
          const tile = map.grid.at(x, y);
          if (tile !== FLOOR && tile !== TUNNEL) bad.push(`${room.id}: ${x},${y} is not floor`);
          if (!map.props.some((p) => p.x === x && p.y === y && SOLID_PROPS.has(p.id))) {
            bad.push(`${room.id}: ${x},${y} blocks with nothing standing on it`);
          }
        }
      }
    }
    line(`  ${solids} pieces of furniture across ${SCENES.length} rooms, and you walk round every one`);
    check(
      bad.length === 0,
      `all ${solids} pieces of furniture in the authored rooms block, and only where they may`,
      bad.slice(0, 4).join(', ')
    );

    // And a ROUTE goes around each of them. `Grid.solid` is a second layer, so
    // anything reading `tiles` alone paths straight through the bench.
    const barred = furnished.flatMap(({ room, map }) => {
      const route = findPath(map.grid, map.entrance, standsIn(room));
      if (route.length === 0) return [`${room.id}: no way across at all`];
      return route
        .filter((wp) => map.grid.solid[wp.y * map.grid.width + wp.x])
        .map((wp) => `${room.id}: ${wp.x},${wp.y}`);
    });
    check(
      barred.length === 0,
      `and in all ${SCENES.length} the route from the hole to whoever is waiting goes around it rather than through`,
      barred.slice(0, 4).join(', ')
    );
  }

  // `block` is order-dependent and UNDOES the piece that strands something,
  // which nothing a room actually places exercises — so it is driven by hand.
  // Beside the person is the hardest place to put one: a ring of them is a
  // meeting that can never happen, and the tile that closes it has to be
  // refused. A check whose subject nothing reaches is vacuous, not green.
  {
    const room = SCENES[0];
    const plain = sceneMap(room.plan, room.theme, 1);
    const stands = standsIn(room);
    const ring = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
      .map(([dx, dy]) => ({ x: stands.x + dx, y: stands.y + dy }))
      .filter((v) => plain.grid.at(v.x, v.y) === FLOOR);
    const walled = sceneMap(
      { ...room.plan, props: [...room.plan.props, ...ring.map((v) => ({ id: 'cairn', ...v }))] },
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
    line(`  ${ring.length} more put round the person, ${held} of them block, ${spared} refused`);
    check(
      held >= 4 && spared >= 1 && seen.has(at(grid, stands)),
      'and the piece that would wall somebody off is refused instead',
      `${held} blocked, ${spared} refused${seen.has(at(grid, stands)) ? '' : ' — the person is cut off'}`
    );
  }

  // Where a prop is PUT, which the id check cannot see. A room is authored by
  // hand in absolute tiles, so the three ways to get that wrong are outside the
  // walls, stacked on another prop, and standing on the hole or on the person.
  const misplaced = SCENES.flatMap((s) => {
    const { entrance, stands } = s.plan;
    const { grid, props } = sceneMap(s.plan, s.theme, 1);
    const seen = new Set<string>();
    const rock = (at: { x: number; y: number }): boolean => grid.at(at.x, at.y) === WALL;
    return [
      ...props.flatMap((p) => {
        const at = `${p.x},${p.y}`;
        const wrong: string[] = [];
        if (rock(p)) wrong.push('in the rock');
        if (seen.has(at)) wrong.push('stacked');
        if (p.x === entrance.x && p.y === entrance.y) wrong.push('on the hole');
        if (p.x === stands.x && p.y === stands.y) wrong.push('on the person');
        seen.add(at);
        return wrong.map((why) => `${s.id} ${p.id}@${at} ${why}`);
      }),
      // The way down is drawn TWO tiles across and centred on its tile, so an
      // authored one a step from the rock has half its rim inside the wall.
      // A PLACE is the opposite rule and the camp is built on it: its way down
      // is a SPLIT IN THE ROCK, so it belongs against the face rather than clear
      // of it.
      ...(s.place
        ? grid.at(entrance.x, entrance.y - 1) === WALL
          ? []
          : [`${s.id} entrance at ${entrance.x},${entrance.y} is not against the rock`]
        : clearSpot(grid, entrance).x === entrance.x && clearSpot(grid, entrance).y === entrance.y
          ? []
          : [`${s.id} entrance at ${entrance.x},${entrance.y} has rock against it`]),
    ];
  });
  check(misplaced.length === 0, 'and every one of them is somewhere it can be', misplaced.join(', '));

  // THE CAMP is the screen the game OPENS on and everything in it is CLICKED,
  // so a fixture in the rock is a screen with no way to reach it.
  {
    const { grid } = sceneMap(CAMP.plan, CAMP.theme, 1);
    const floor = (at: { x: number; y: number }) => grid.at(at.x, at.y) !== WALL;
    const meetable = SCENES.filter((s) => !s.place && !s.encounter);
    const astray = [
      ...CAMP_FIXTURES.filter((f) => !floor(f.at)).map((f) => `${f.id} in the rock`),
      ...CAMP_FIXTURES.filter((f) => !PROP_ART[f.id]).map((f) => `${f.id} undrawn`),
      ...CAMP_SPOTS.filter((at) => !floor(at)).map((at) => `a spot at ${at.x},${at.y} in the rock`),
      // A socket hangs on the CUT FACE, like every other side-on prop: the rock
      // tile at the boundary, with floor below it.
      ...CAMP_SOCKETS.filter(
        (at) => grid.at(at.x, at.y) !== WALL || grid.at(at.x, at.y + 1) === WALL
      ).map((at) => `a socket at ${at.x},${at.y} off the face`),
    ];
    check(
      astray.length === 0,
      `the camp's ${CAMP_FIXTURES.length} fixtures, ${CAMP_SPOTS.length} spots and ` +
        `${CAMP_SOCKETS.length} sockets are all somewhere they can be`,
      astray.join(', ')
    );
    check(
      CAMP_SPOTS.length >= meetable.length && CAMP_SOCKETS.length === RUN_SLOTS.length,
      `and there is a place to stand for all ${meetable.length} people you can meet, ` +
        `and a hole in the rock per socket in the set — ${RUN_SLOTS.length}`,
      `${CAMP_SPOTS.length} spots, ${CAMP_SOCKETS.length} holes`
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

  // A room of one shape is a room that reads as the last one. Each has its own
  // signature furniture; the lanterns are the only thing they all share.
  // A room somebody LIVES in, never an arena: a boss room is empty by design,
  // because furniture in a fight about leaving a circle is what you get caught
  // against.
  const thin = SCENES.filter(
    (s) => !s.encounter && new Set(s.plan.props.map((p) => p.id)).size < 3
  ).map((s) => s.id);
  check(thin.length === 0, 'and no room is furnished out of one or two shapes', thin.join(', '));

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

  // HOW CLOSE a body's feet come to rock, north against south. Nothing is
  // drawn over a body — a wall that overlapped one looked worse in every spot
  // something else clipped into it — so the clearance is the same every way and
  // the number is what says so.
  {
    const { grid } = generateMap([], new Rng(1717), 1, 3);
    const reach = (dy: number): number => {
      let worst = 0;
      for (let y = 1; y < grid.height - 1; y++) {
        for (let x = 1; x < grid.width - 1; x++) {
          if (grid.at(x, y + dy) !== WALL || !grid.walkable(x, y)) continue;
          let off = 0;
          while (off < 0.5 && grid.fits(x, y + dy * (off + 0.05), HERO_BASE.radius)) off += 0.05;
          worst = Math.max(worst, 0.5 - off);
        }
      }
      return worst;
    };
    line(
      `  feet stop ${reach(1).toFixed(2)} tiles short of rock to the SOUTH, ` +
        `${reach(-1).toFixed(2)} to the NORTH`
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
  takeHandover(game, { weapon: true, crystal: false, quests: [] });
  line(
    `  after the first clear: ${balance(game.wallet, 'gold')} gold, ` +
      `${game.inventory.length} items`
  );

  const bill = RECIPES.find((r) => r.id === 'make_shard_of_making')?.inputs.gold ?? 0;
  check(
    FISSURE.firstClear.gold >= bill,
    `the first clear pays ${FISSURE.firstClear.gold} gold and the shard it can buy costs ${bill}`,
    `it pays ${FISSURE.firstClear.gold} but the shard costs ${bill}`
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
  takeHandover(game, { weapon: false, crystal: true, quests: [] });
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
}

// ===========================================================================
rule('THE TRIALS WEB — is a harder descent actually harder, and paid for?');

{
  const nodes = trialNodes();
  const bare = [makeCrystal(2), makeCrystal(2)];

  // Every clause has to name a condition that exists, or the trial is one
  // nobody can ever finish and the point behind it never arrives.
  const strays = TRIALS.flatMap((t) =>
    t.need.filter((c) => !TRIAL_CONDITIONS[c.kind]).map((c) => `${t.id}: ${c.kind}`)
  );
  check(strays.length === 0, `all ${TRIALS.length} trials ask conditions that exist`, strays.join(', '));

  // Every line on this web is DANGER, which is the whole bargain: reward is
  // derived from danger, so a node that is not weighed is a node paying nothing.
  // A FINDING stat is the one exception, and it is the same exception a crystal
  // makes — it carries no danger there either, and what it costs is the slot.
  const finding = new Set(DROP_GROUPS.map((g) => findStat(g.id)));
  const unweighed = nodes.flatMap((n) =>
    (n.stats ?? [])
      .filter((s) => !DANGER_STATS[s.stat] && !finding.has(s.stat))
      .map((s) => `${n.id}: ${s.stat}`)
  );
  check(
    unweighed.length === 0,
    `every stat on all ${nodes.length} trial nodes is one \`crystalRewards\` weighs, or a finding line`,
    unweighed.join(', ')
  );

  // The one node that asks something. An option nothing reads is the whole
  // reason `NodeChoice.stats` exists rather than only `grants`.
  const asks = nodes.filter((n) => (n.choices ?? []).length > 0);
  check(asks.length === 1, 'exactly one trial node asks a question', String(asks.length));
  const asked = asks[0];
  const aimed = (pick: string): number => {
    const who: Character = {
      ...ladderCharacter(4, new Rng(7)),
      trials: TRIALS.map((t) => t.id),
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

  // Walked in, and out again, at the full budget the trials can ever pay.
  const walk: string[] = [];
  const spendRng = new Rng(4141);
  while (walk.length < TRIAL_POINTS_MAX) {
    const open = nodes.filter((n) => canAllocateTrial(n.id, walk));
    if (open.length === 0) break;
    walk.push(spendRng.pick(open)!.id);
  }
  check(walk.length === TRIAL_POINTS_MAX, `all ${TRIAL_POINTS_MAX} trial points can be spent`, String(walk.length));
  let held = [...walk];
  while (held.length > 0) {
    const loose = held.find((id) => canDeallocateTrial(id, held));
    if (!loose) break;
    held = held.filter((id) => id !== loose);
  }
  check(held.length === 0, 'and every one of them refunded again', `${held.length} stuck`);

  // The whole web on one character, against the same crystals: what it does to
  // a descent has to be visible in the SET, or none of the rest of this matters.
  const walked = { ...ladderCharacter(4, new Rng(7)), trials: TRIALS.map((t) => t.id), trialAllocated: nodes.map((n) => n.id) };
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
    trials: TRIALS.map((t) => t.id),
    trialAllocated: nodes.filter((n) => (n.stats ?? []).some((s) => s.stat === 'monsterRank')).map((n) => n.id),
  });
  check(lifted > plain, 'and the Watch really does put more Rares in a room', `${plain} -> ${lifted}`);

  // A HOARD is the first EVENT, and the whole of it has to be provable without
  // a player: it is put down, it is guarded, and killing the guard opens it.
  const hoarder: Character = {
    ...ladderCharacter(4, new Rng(7)),
    trials: TRIALS.map((t) => t.id),
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

  const heldBefore = withHoards.state.loot.items.length;
  runToCompletion(withHoards, 400);
  const opened = withHoards.state.hoards.filter((h) => h.opened).length;
  const paid = withHoards.state.loot.items.length - heldBefore;
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
    trials: TRIALS.map((t) => t.id),
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
      trials: TRIALS.map((t) => t.id),
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

  // A trial deleted refunds the point it bought rather than stranding the walk.
  const save = createGame('dev');
  save.character.trialAllocated = [...walk];
  save.character.trials = [TRIALS[0].id, 'a_trial_nobody_wrote'];
  healTrials(save.character);
  check(
    save.character.trials.length === 1 && save.character.trialAllocated.length === 1,
    'and heal() refunds a walk no surviving trial paid for',
    `${save.character.trials.length} trials, ${save.character.trialAllocated.length} nodes`
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
            // A Cloud's whole content: no damage, and it marks WHO it caught,
            // so a wider one or a second one is a different fingerprint.
            leave: (who: any) => marks.push(`l${enemies.indexOf(who)}`),
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
  // touches a damage multiplier gets walked to on purpose, choices and all.
  for (const skill of MAIN_SKILLS) {
    for (const node of treeFor(skill.id)) {
      const options = node.choices?.length ? node.choices.map((c) => c.id) : [null];
      for (const choice of options) {
        const grants = { ...(node.grants ?? {}), ...(node.choices?.find((c) => c.id === choice)?.grants ?? {}) };
        if (!('ailmentMultiplier' in grants) && !('convertTree' in grants)) continue;

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
  for (const q of CRYSTAL_QUESTS) holds(`quest/${q.id}`, q.detail);
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
  for (const q of CRYSTAL_QUESTS) read(`quest/${q.id}`, q.detail);
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
      `${attributesSpent(spread)} points spread four ways: ` +
      ATTRIBUTES.map((a) => `${a.name.slice(0, 3).toLowerCase()} ${spread.attributes[a.id]}`).join(', ')
  );
}

// ===========================================================================
rule('TRADES — is the part that is not the skill worth keeping a character for?');

// A skill tree belongs to the SKILL: change from Strike to Blight and the whole
// of what your character was is gone. A trade belongs to the character, out of
// its own budget, and it survives every skill you ever swap to. What can break
// quietly is a switch nobody reads, a walk that cheats the distance it is meant
// to cost, or a rule that reads on a card and does nothing in the sim.
{
  line(
    `  ${TRADES.length} trades · ${TRADE.maxPoints} points at level ` +
      `${TRADE.maxPoints * TRADE.levelsPerPoint}, one every ${TRADE.levelsPerPoint}`
  );

  check(
    tradePointsFor(TRADE.levelsPerPoint - 1) === 0
      && tradePointsFor(TRADE.levelsPerPoint) === 1
      && tradePointsFor(TRADE.maxPoints * TRADE.levelsPerPoint) === TRADE.maxPoints
      && tradePointsFor(999) === TRADE.maxPoints,
    'character level funds it, on its own curve, capped',
    `${[4, 5, 50, 999].map(tradePointsFor).join(', ')}`
  );

  for (const trade of TRADES) {
    const id = trade.spec.id;
    const nodes = trade.nodes;
    const notables = nodes.filter((n) => n.kind === 'notable');
    line(`  ${id}: ${nodes.length} nodes, ${notables.length} of them notable`);

    // Three notables a spoke: the GATE everybody on it takes, and the tip of
    // each branch past the fork.
    check(
      nodes.length === TRADE_NODES
        && notables.length === SPOKE_COUNT * 3
        && new Set(nodes.map((n) => n.id)).size === nodes.length,
      `${TRADE_NODES} nodes, ${SPOKE_COUNT * 3} of them notables, and no id used twice`,
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

    // The shape, and the whole of what makes the tree a decision: a GATE is
    // three steps out and a branch tip six, so ten points buy one spoke walked
    // whole and a second gate — never two whole spokes.
    const gates = trade.spec.spokes.map((sp) => distance.get(sp.gate.id) ?? 0);
    const deepest = Math.max(...nodes.map((n) => distance.get(n.id) ?? 0));
    const whole = Math.floor(TRADE.maxPoints / deepest);
    line(`  a gate costs ${gates[0]}, the deepest node ${deepest} of ${TRADE.maxPoints}`);
    check(
      gates.every((d) => d === 3) && deepest === 6 && whole === 1,
      'a gate is 3 steps out and a tip 6, so ONE spoke fits whole and no more',
      `gates ${gates.join('/')} · deepest ${deepest} · ${whole} whole`
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
      who.level = TRADE.maxPoints * TRADE.levelsPerPoint;
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
      mainSkillId(who) === 'blight' && treeGrants(who).manaShield === before && before === 0.2,
      'a trade survives changing skill, where a skill tree does not',
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
    // Stem, gate, then a branch: the walk the new shape actually allows.
    for (const n of [
      'alc_reaction_m0', 'alc_reaction_m1', 'alc_volatile',
      'alc_detonating_m0', 'alc_detonating_m1', 'alc_detonation',
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
  const descend = (who: Character, seed = 9091) => {
    const sim = new RunSim(ladderSet(2, new Rng(4), pool), who, new Rng(seed));
    const final = runToCompletion(sim, 900);
    return { sim, final };
  };

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
    const still = descend(armed(['alc_condensate_m0', 'alc_still', 'alc_condensate_m1', 'alc_cascade']));
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
    const missing = ADDED_DAMAGE_TYPES.filter(
      (t) =>
        !ALL_MODS.some((m) => m.tiers.some((x) => x.stats.some((st) => st.stat === monsterAddedStat(t)))) ||
        !ALL_MODS.some((m) => m.tiers.some((x) => x.stats.some((st) => st.stat === monsterResStat(t))))
    );
    check(
      missing.length === 0 && ADDED_DAMAGE_TYPES.length === 3,
      'every element a crystal adds has its own modifier and its own ward',
      missing.join(', ')
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
      const sim = new RunSim(set, ceiling(band), new Rng(6400 + band * 29 + i));
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
  check(
    goldStep > 2.5 && goldStep < 10,
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
  // The floor is 5%, not 10%: at the BARE Fissure gold off corpses is supposed
  // to dominate — that is the 'early' half of the sentence — and what this
  // catches is a tap going to NOTHING rather than a tap being small.
  check(
    shares.every((s) => s > 0.05 && s < 0.95),
    'gold comes off corpses early and out of selling late, and neither ever stops',
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
  for (const skill of MAIN_SKILLS) {
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

    buildReport(g, sim.state);
    const call = sceneWaiting(g, facts(g, sim.state));
    check(
      call?.gift?.weapon === true && call.def.encounter === null,
      'and a cleared descent that owes something schedules a quiet room',
      `${call ? call.def.id : 'nothing'}`
    );

    // The room. A `RunSim` like any other, which is what makes a boss room a
    // filled-in field rather than a second engine.
    const room = new RunSim([], g.character, new Rng(6100), { scene: call!.def.id });
    check(
      room.state.monsters.length === 0 && room.state.folk.length === 1,
      'the room has nobody in it but the man standing in it',
      `${room.state.monsters.length} monsters, ${room.state.folk.length} folk`
    );
    check(
      room.state.map.exit === room.state.map.entrance && room.state.map.props.length > 0,
      'one hole and furniture somebody put there',
      `${room.state.map.props.length} props`
    );
    // Everything authored has to be standing on floor, in EVERY room: a bench
    // in the rock is a bench nobody can see, and the cut worries the edges of
    // a room away tile by tile. A prop is asked about the TILE and a body about
    // whether it FITS, which is the same question until furniture blocks — and
    // then a body standing on a bench is exactly what the second one catches.
    const misplaced: string[] = [];
    // A PLACE has nobody standing in it: who is in the camp is the game's.
    for (const scene of SCENES.filter((s2) => !s2.place)) {
      const built = new RunSim([], g.character, new Rng(6100), { scene: scene.id });
      const grid = built.state.map.grid;
      for (const p of built.state.map.props) {
        if (grid.at(p.x, p.y) === WALL) misplaced.push(`${scene.id}: ${p.id} at ${p.x},${p.y}`);
      }
      const bodies: Array<readonly [string, number, number]> = [
        [scene.who, built.state.folk[0].x, built.state.folk[0].y] as const,
        ['the hole', built.state.map.entrance.x, built.state.map.entrance.y] as const,
      ];
      for (const [id, x, y] of bodies) {
        if (!grid.fits(x, y, 0.3)) misplaced.push(`${scene.id}: ${id} at ${x},${y}`);
      }
      // And the hole has to reach the person, or you arrive in a room you
      // cannot cross and the beats never start.
      if (!findPath(grid, built.state.map.entrance, built.state.folk[0]).length) {
        misplaced.push(`${scene.id}: no way across to ${scene.who}`);
      }
    }
    check(
      misplaced.length === 0,
      `every prop and every person in all ${SCENES.length} rooms fits where it was put`,
      misplaced.join(', ')
    );
    check(
      dist(room.state.hero, room.state.folk[0]) > 3,
      'you arrive across the room from him, so meeting him is a walk',
      `${dist(room.state.hero, room.state.folk[0]).toFixed(1)} tiles`
    );
    check(
      walkToMeeting(room) && dist(room.state.hero, room.state.folk[0]) <= 1.2,
      'and the meeting is the hero walking over, not a panel appearing',
      `meeting ${room.state.meeting}, ${dist(room.state.hero, room.state.folk[0]).toFixed(2)} apart`
    );

    // What he says, and what he does while he says it. An act only ever sets
    // `action` and `actionTimer`, which is the whole of what `poseOf` reads.
    const script = [LAMPWRIGHT.first, LAMPWRIGHT.crystal, LAMPWRIGHT.again];
    check(
      script.every((w) => w.beats.length > 0 && w.beats.every((b) => b.said.length > 0)),
      'every one of his three speeches is beats, and every beat has words',
      script.map((w) => w.beats.length).join('/')
    );
    // Who crosses the room. YOU do, at a walk: the room is what you came up
    // into and arriving on top of the man skips looking at it. Whoever is
    // waiting stands where he is, and the meeting still happens.
    const crossed: string[] = [];
    for (const scene of SCENES.filter((s2) => !s2.place)) {
      const arriving = new RunSim([], g.character, new Rng(77), { scene: scene.id });
      const them = arriving.state.folk[0];
      const themAt = { x: them.x, y: them.y };
      const youAt = { x: arriving.state.hero.x, y: arriving.state.hero.y };
      let ticks = 0;
      while (!arriving.state.meeting && ticks++ < 4000) arriving.walkOut(TICK);
      const theyMoved = dist(them, themAt);
      const youMoved = dist(arriving.state.hero, youAt);
      if (!arriving.state.meeting) crossed.push(`${scene.id}: never met`);
      else if (youMoved <= theyMoved) crossed.push(`${scene.id}: they came to you`);
    }
    check(
      crossed.length === 0,
      'you cross the room to whoever is waiting, and they stand where they are',
      crossed.join(', ')
    );

    // And nobody MOVES across an authored room, whichever skill fills the slot:
    // there is nothing in here to get to faster, and a mover firing
    // mid-conversation reads as a bug rather than as a build. The guard is for
    // the SLOT, so every mover has to be held to it rather than the one it was
    // written for.
    const moved: string[] = [];
    for (const mover of MOVERS) {
      const walker = { ...g.character, equipped: { ...g.character.equipped, movement: mover } };
      for (const scene of SCENES.filter((s2) => !s2.place)) {
        const arriving = new RunSim([], walker, new Rng(77), { scene: scene.id });
        let t = 0;
        while (!arriving.state.meeting && t++ < 4000) arriving.walkOut(TICK);
        if (arriving.state.blinks > 0) moved.push(`${mover}/${scene.id}`);
      }
    }
    check(moved.length === 0, 'and nobody moves across one, whichever mover is held', moved.join(', '));

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
      const at = createGame('dev');
      at.sockets = {};
      // The kit is handed a specimen too, and holding one is a room of its own
      // at a lower rung — this question is about the wall, not about him.
      at.relics = [];
      check(
        sceneWaiting(at, facts(at, sim.state)) === null,
        'nobody objects to a wall with nothing in it',
        JSON.stringify(sceneWaiting(at, facts(at, sim.state))?.def.id)
      );
      const two = createGame('dev');
      two.bosses = []; // the kit is handed every door; this is somebody meeting one
      two.sockets = { first: makeCrystal(2, 'normal'), second: makeCrystal(2, 'normal') };
      const called = sceneWaiting(two, facts(two, sim.state));
      check(
        called?.def.id === INTRO.bossScene && called.gift === null,
        'two crystals set in the wall is what it takes for somebody to object',
        called?.def.id ?? 'nobody'
      );
      const bossId = SCENE_BY_ID[INTRO.bossRoom].encounter!;
      takeBoss(two, bossId);
      two.relics = [];
      // His room is owed until he has HANDED the name over, never until the
      // thing it calls up is down: the fight is the fifth socket's.
      two.given = [...(two.given ?? []), gaveKey(SCENE_BY_ID[INTRO.bossScene].gives!)];
      check(
        sceneWaiting(two, facts(two, sim.state)) === null,
        'and once he has handed it over he never asks you back',
        JSON.stringify(sceneWaiting(two, facts(two, sim.state))?.def.id)
      );

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

      // A key already SPENT schedules nothing: it opens the fight at the
      // door, so the clear it would have ridden on owes no room at all.
      const back = createGame('dev');
      back.sockets = {};
      back.bosses = [bossId];
      back.called = bossId;
      back.relics = [];
      check(
        sceneWaiting(back, facts(back, sim.state)) === null,
        'a socketed key schedules nothing — the fight is at the door',
        JSON.stringify(sceneWaiting(back, facts(back, sim.state))?.def.id)
      );
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
    const waiting = call!.gift;
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
    check(
      giftWaiting(g) === null &&
        giftSchedule(g).includes(`level ${INTRO.crystalSkillLevel}`) &&
        giftSchedule(g).includes('1 unspent'),
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
      // A player racing a clock brings a BUILD, not a random walk.
      const sim = new RunSim(set, ceiling(band), new Rng(880 + i));
      runToCompletion(sim, 900);
      if (sim.state.status === 'cleared') {
        cleared++;
        times.push(sim.state.elapsed);
      }
    }
    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)] ?? Infinity;
    parkedCheck(
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

    // And they DO drop, or the whole table is decoration.
    // At the LEVEL that end is for. A set rolled to the top of what four
    // crystals hold kills a level 40 build in six seconds, and a character that
    // dies before its first kill is not a reading on the drop table.
    let found = 0;
    for (let i = 0; i < 8; i++) {
      const sim = new RunSim(set, ceiling(6, 'arc_lightning', LEVELLING.maxLevel), new Rng(600 + i));
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
  // The kit has MET everybody, and meeting somebody takes him off the schedule.
  settled.given = (settled.given ?? []).filter((g2) => !g2.startsWith('met:'));
  const facts = { set: sim.state.set, elapsed: sim.state.elapsed, socketed: [] };
  check(sceneWaiting(settled, facts) === null, 'nothing is owed with nothing carried', String(sceneWaiting(settled, facts)?.def.id));
  settled.relics = [makeRelic(RELICS[0])];
  const owed = sceneWaiting(settled, facts);
  check(owed?.def.id === RELICS[0].wants, 'and holding one is the whole of what schedules his room', owed?.def.id ?? 'nobody');

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

  // MET ONCE. A relic finds him the first time and after that he is somebody
  // you go and see: keeping what he wants is a decision, not the same room at
  // the end of every clear for as long as you keep it.
  {
    const fresh = createGame('fresh');
    // Past the two rungs above him: what is left is the relic in your hands.
    fresh.given = ['weapon', 'crystal'];
    fresh.relics = [makeRelic(RELIC_BY_ID.pristine_specimen)];
    const first = sceneWaiting(fresh, facts);
    check(
      first?.def.id === 'ossuary',
      'a relic you are carrying finds the person who wants it',
      first?.def.id ?? 'nobody'
    );
    takeMet(fresh, 'ossuary');
    check(
      sceneWaiting(fresh, facts) === null && hasMet(fresh, 'ossuary'),
      'and once you have met him he is never scheduled at you again',
      JSON.stringify(sceneWaiting(fresh, facts)?.def.id)
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

  // And it does something: the same character, the same seeds, with and
  // without. A clear is mostly WALKING, so one map where the exit lands
  // further from the entrance swamps what a Bleed is worth — and the ailment
  // is worth about 1%, measured. Five seeds cannot see that: at five it reads
  // 0.3% the WRONG way, at twelve 0.5% the right way, at twenty-four 1.0%. The
  // claim is about the ailment rather than about a map, so it takes the sample
  // that measures one — and twenty-four stopped being enough the moment the
  // hit itself got bigger, which is what the sample has to out-measure.
  const BLEED_SEEDS = 48;
  const bare = createGame('fresh');
  bare.inventory.push(makeGear('skirmisher_body_t1', 20));
  equipItem(bare, bare.inventory[0], 'body');
  const clear = (who: typeof bare.character): number => {
    let total = 0;
    for (let seed = 21; seed < 21 + BLEED_SEEDS; seed++) {
      const run = new RunSim([], who, new Rng(seed));
      runToCompletion(run);
      total += run.state.elapsed;
    }
    return total / BLEED_SEEDS;
  };
  const before = clear(bare.character);
  const after = clear(wearing.character);
  check(
    after < before,
    `a Bleed on every hit clears the same ${BLEED_SEEDS} seeds faster: ${after.toFixed(1)}s against ${before.toFixed(1)}s`,
    `${after.toFixed(1)}s against ${before.toFixed(1)}s`
  );

  // --- jewellery, which has no implicit to replace ----------------------
  // Decided: the graft ADDS where there is nothing, so a ring is the one slot
  // where it costs no base line. The one that changes the DELIVERY charges
  // mana for it instead, which is the rule the trees already follow.
  {
    const jewels = ['ring', 'amulet'];
    const has = jewels.filter((k) => graftableKinds().includes(k));
    check(has.length === jewels.length, 'a ring and an amulet are both worked on', has.join(', '));

    const bare = GEAR_BASES.filter((b) => jewels.includes(b.kind));
    const withLine = bare.filter((b) => (b.implicit?.length ?? 0) > 0).map((b) => b.id);
    check(
      withLine.length === 0,
      `none of the ${bare.length} jewellery bases has a line of its own to lose`,
      withLine.join(', ')
    );

    // Each person writes their OWN lines. The man who takes bodies has no
    // opinion about a ring and says so out loud, so the panel must agree.
    const homeless = FORGED.filter((f) => !SCENE_BY_ID[f.who]).map((f) => f.mod.id);
    check(homeless.length === 0, 'every forged line is written in a room somebody stands in', homeless.join(', '));
    const barren = RELICS.filter((r) => FORGED.every((f) => f.who !== r.wants)).map((r) => r.id);
    check(barren.length === 0, 'and every relic buys something where it is taken', barren.join(', '));

    const at = createGame('fresh');
    const ring = makeGear('silver_band', 40);
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
  game.junk = ['armour_spell', 'a_filter_row_that_was_cut'];
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
    game.junk.length === 1 && game.junk[0] === 'armour_spell',
    'and a filter row nothing resolves is dropped, which only ever keeps more',
    game.junk.join(', ')
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

  // The check above named the collections it looked in, and so did the code:
  // the shop's shelf is stored so it does not re-roll on every open, and it
  // was on neither list. So this asks the question of EVERY field that can
  // hold an item, found by walking the save rather than by remembering.
  const collections: Array<[string, (g: GameState, item: Item) => void]> = [
    ['inventory', (g, item) => { g.inventory = [item]; }],
    ['stash', (g, item) => { g.stash = [item]; }],
    ['crystals', (g, item) => { g.crystals = [item]; }],
    ['relics', (g, item) => { g.relics = [item]; }],
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
      inventory: [], stash: [], crystals: [], relics: [], sold: [], shopStock: [], craftId: null,
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
  line(`  … and ${parkedCount} parked for the balance pass, named in ROADMAP.md`);
}
process.exitCode = failed === 0 ? 0 : 1;
