/**
 * A reference set of gear and crystals for the dev kit and the balance
 * harnesses. Item level is the only parameter: it decides the base's tier as
 * well as which modifier tiers can roll.
 */
import { Rng } from '../rng';
import { ModPool } from '../mods';
import {
  ALL_MODS,
  ARMOUR_FAMILIES,
  ATTRIBUTES,
  CRYSTAL_LEVELS,
  DROP_BANDS,
  EQUIP_SLOTS,
  GEAR_BASE_BY_ID,
  OFF_SLOT,
  PLAYER_SKILLS,
  REFERENCE_ARMOUR_FAMILY,
  RUN_SLOTS,
  SKILL_BY_ID,
  SKILL_SLOTS,
  WEAPON_SLOT,
} from '../data';
import { characterStats, damageDetail } from './stats';
import { defaultGearBase, rollCrystal, rollGear } from '../economy';
import { runSet } from './crystal';
import { RunSim, TICK } from './run';
import { attributePointsFor, equipSkill, makeCharacter, slotIsOpen } from './character';
import { MOVE_WEBS, canAllocate, treeFor, treePointsFor } from '../skills-tree';
import { skillProgress } from './character';
import type { Character } from './character';
import type { Item } from '../types';

/** One item per slot, filled to its base's capacity, keyed by slot id. A pool
 *  narrower than every mod rolls a FOCUSED set: a slot whose pool is empty
 *  takes fewer lines, which is what a built set looks like. */
export function starterLoadout(
  rng: Rng,
  ilvl = 30,
  pool: ModPool = new ModPool(ALL_MODS),
  family = REFERENCE_ARMOUR_FAMILY
): Record<string, Item> {
  const equipment: Record<string, Item> = {};

  for (const slot of EQUIP_SLOTS) {
    const base = defaultGearBase(slot.accepts[0], ilvl, family);
    if (!base) continue;
    if ((base.hands ?? 1) > 1) continue; // never a bow: a reference set holds a shield
    // More than any base holds, and let modCapacity decide.
    equipment[slot.id] = rollGear(base.id, ilvl, 99, pool, rng);
  }
  return equipment;
}

/** How many mods a full set carries. Used by the harnesses. */
export function loadoutMods(equipment: Record<string, Item>): number {
  return Object.values(equipment).reduce((n, i) => n + i.mods.length, 0);
}

/**
 * What the power band below hands you, for asking whether this one is reachable
 * at all. Walks the tree at random, so it is a floor, not a forecast.
 */
export function ladderCharacter(
  band: number,
  rng: Rng,
  skillId = 'strike',
  shape?: BuildShape
): Character {
  const rung = Math.min(Math.max(1, band), DROP_BANDS.length - 1);
  const ilvl = DROP_BANDS[rung - 1].ilvl;

  const pool = shape
    ? new ModPool(ALL_MODS.filter((m) => m.tiers.some((t) => t.stats.some((st) => SHAPE_LINES[shape](st.stat)))))
    : new ModPool(ALL_MODS);
  const character = makeCharacter(
    starterLoadout(rng, ilvl, pool, shape ? SHAPE_PLATE[shape] : REFERENCE_ARMOUR_FAMILY),
    skillId
  );
  character.level = 4 + rung * 6;

  // Split four ways. A measured character with no attributes at all is a
  // character nobody plays, and half of what these attributes buy is tagged
  // for the skill this one is not — so a spread is the floor, not the build.
  const points = attributePointsFor(character.level);
  ATTRIBUTES.forEach((attr, i) => {
    character.attributes[attr.id] =
      Math.floor(points / ATTRIBUTES.length) + (i < points % ATTRIBUTES.length ? 1 : 0);
  });

  const progress = skillProgress(character, skillId);
  const tree = treeFor(skillId);
  while (progress.allocated.length < treePointsFor(skillId, character.level)) {
    const open = tree.filter((n) => canAllocate(skillId, n.id, progress.allocated));
    if (open.length === 0) break;
    const node = rng.pick(open)!;
    progress.allocated.push(node.id);
    if (node.choices?.length) (progress.choices ??= {})[node.id] = rng.pick(node.choices)!.id;
  }
  // Every passive slot the LEVEL opened gets filled: since the Burst moved into
  // one, an empty slot is a build with no answer to a crowd. A SHAPE chooses,
  // the way it chooses its plate; an unshaped character draws.
  const passives = PLAYER_SKILLS.filter((sk) => sk.category === 'passive');
  const wanted = shape ? SHAPE_PASSIVES[shape] : [];
  for (const slot of SKILL_SLOTS) {
    if (!slot.accepts.includes('passive') || !slotIsOpen(character, slot.id)) continue;
    const held = new Set(Object.values(character.equipped ?? {}));
    const spare = passives.filter((sk) => !held.has(sk.id));
    if (spare.length === 0) break;
    const pick = wanted.find((id) => spare.some((sk) => sk.id === id)) ?? (shape ? null : rng.pick(spare)!.id);
    if (!pick) break;
    equipSkill(character, pick, slot.id);
  }

  if (shape) walkMover(character, shape);
  return character;
}

/**
 * What a build ANSWERS a boss with, since a boss room is the one fight where
 * the question is the BUILD and not the rung — and a set rolled at random
 * answers nothing in particular. `neither` is the shape meant to fail.
 */
export type BuildShape = 'runner' | 'tank' | 'neither';

/** Every shape keeps the OFFENCE lines — the fight has a dps check in it. What
 *  a shape decides is the ANSWER besides: speed, plate, or none. */
const CORE = ['damage', 'critChance', 'critMultiplier', 'attackSpeed', 'castSpeed'];

const SHAPE_LINES: Record<BuildShape, (stat: string) => boolean> = {
  runner: (s) => CORE.includes(s) || s === 'moveSpeed' || s === 'life',
  tank: (s) => CORE.includes(s) || s === 'life' || s === 'armour' || s === 'blockChance' || s.endsWith('Res'),
  neither: (s) => CORE.includes(s),
};

/** What each shape WEARS. `bulwark` spends its whole budget on the rating and
 *  is what "full armour build" means; the reference family is middling, which
 *  is the point of it — a shape has to reach for its own bases. */
const SHAPE_PLATE: Record<BuildShape, string> = {
  runner: 'shadow',
  tank: 'bulwark',
  neither: REFERENCE_ARMOUR_FAMILY,
};

/** What each shape puts in its passive slots. A shape's answer to the boss is
 *  the whole point of it, so this is chosen and not drawn. `neither` names
 *  none, which is what having no answer IS. */
const SHAPE_PASSIVES: Record<BuildShape, string[]> = {
  runner: ['featherstep'],
  tank: ['sundering'],
  neither: [],
};

/** Two arms fit the six points; naming none leaves the slot EMPTY. */
const SHAPE_MOVER: Record<BuildShape, { skill: string; arms: string[] } | null> = {
  runner: { skill: 'blink', arms: ['reach', 'quickening'] },
  tank: null,
  neither: null,
};

function walkMover(character: Character, shape: BuildShape): void {
  const want = SHAPE_MOVER[shape];
  if (!want) return;
  equipSkill(character, want.skill);
  const web = MOVE_WEBS.find((m) => m.spec.skillId === want.skill);
  if (!web) return;
  const progress = skillProgress(character, want.skill);
  const budget = treePointsFor(want.skill, character.level);
  for (const arm of want.arms) {
    for (const node of web.nodes) {
      if (progress.allocated.length >= budget) return;
      if (web.armOf[node.id] !== arm) continue;
      if (canAllocate(want.skill, node.id, progress.allocated)) progress.allocated.push(node.id);
    }
  }
}

/** What a build is WORTH, as one number a player would optimise: damage against
 *  how long it stands in the fire. A GEOMETRIC mean, so dumping either half
 *  cannot win — a glass cannon and a brick both score badly. */
export function buildPower(character: Character): number {
  const stats = characterStats(character);
  const dps = damageDetail(character).perSecond;
  const res = Object.values(stats.resistances);
  const soak = res.length ? res.reduce((a, b) => a + b, 0) / res.length / 100 : 0;
  const through =
    (1 - stats.armourReduction / 100) *
    (1 - stats.dodgeChance / 100) *
    (1 - stats.blockChance / 100) *
    (1 - soak);
  return Math.sqrt(dps * (stats.maxLife / Math.max(0.05, through)));
}

/** A build takes one or two attributes, never four. */
const ATTR_PLANS: string[][] = [
  ['strength', 'dexterity'],
  ['intelligence', 'acuity'],
  ['strength'],
  ['intelligence'],
  ['dexterity', 'acuity'],
];

/** The lines a built set is rolled for. `null` is the whole pool, which is what
 *  an unfocused character wears; the rest are what somebody AIMING rolls. */
const FOCUS: Array<((stat: string) => boolean) | null> = [
  null,
  (s) => CORE.includes(s) || s === 'life' || s === 'armour' || s.endsWith('Res'),
  (s) => CORE.includes(s) || s === 'life' || s === 'ailmentChance',
  (s) => CORE.includes(s) || s === 'life' || s === 'moveSpeed' || s === 'blockChance',
];

/**
 * The strongest character the search can find at this band — the CEILING, where
 * `ladderCharacter` is the floor. Tuning against a floor is tuning against a
 * strawman: a random tree walk with its attributes split four ways is not what
 * anybody plays, so a difficulty that stops one says nothing about the game.
 *
 * Everything a player decides is searched — plate, the lines the set is rolled
 * for, attributes, passives, mover — and the tree is walked GREEDILY rather than
 * at random. NOT optimal: the best of what this search covers, and the demo
 * prints its power so a better build found by hand has a number to argue with.
 */
export function bestBuild(band: number, rng: Rng, skillId = 'strike', atLevel?: number): Character {
  const rung = Math.min(Math.max(1, band), DROP_BANDS.length - 1);
  const ilvl = DROP_BANDS[rung - 1].ilvl;
  const level = atLevel ?? 4 + rung * 6;
  const skill = SKILL_BY_ID[skillId];
  const wear = ARMOUR_FAMILIES.filter((f) =>
    f.archetypes.some((a) => (skill?.tags ?? []).includes(a === 'rogue' ? 'attack' : a))
  );
  const plate = (wear.length ? wear : ARMOUR_FAMILIES).map((f) => f.id);
  const passives = PLAYER_SKILLS.filter((sk) => sk.category === 'passive').map((sk) => sk.id);
  const movers = [null, ...MOVE_WEBS.map((m) => m.spec.skillId)];

  // Two passes, because the tree walk is nearly the whole cost: score every
  // arrangement BARE, then walk only the few worth walking. The order can move
  // between the passes, which is what the shortlist is for.
  const made: Array<{ character: Character; paired: boolean }> = [];
  for (const family of plate) {
    for (const focus of FOCUS) {
      for (const attrs of ATTR_PLANS) {
        for (const paired of [false, true]) {
          const pool = focus
            ? new ModPool(ALL_MODS.filter((m) => m.tiers.some((t) => t.stats.some((st) => focus(st.stat)))))
            : new ModPool(ALL_MODS);
          const character = makeCharacter(starterLoadout(rng, ilvl, pool, family), skillId);
          character.level = level;
          if (paired && !dualWield(character, ilvl, pool, rng)) continue;
          pour(character, attrs);
          // The passives and the mover BEFORE the tree, since what they grant is
          // in every score the walk reads.
          fillPassives(character, passives);
          walkBest(character, rng.pick(movers) ?? null);
          made.push({ character, paired });
        }
      }
    }
  }

  // THE SHORTLIST IS PER ARRANGEMENT: a pair scores higher BARE than a shield
  // ever can, so one list took every place and the ceiling got WORSE for being
  // offered more. Each brings its own best few and `played` decides, which is
  // the only place a Block counts at all.
  const ranked = made.sort((a, b) => buildPower(b.character) - buildPower(a.character));
  const shortlist = [false, true].flatMap((paired) =>
    ranked.filter((m) => m.paired === paired).slice(0, SHORTLIST).map((m) => m.character)
  );
  for (const character of shortlist) greedyTree(character, skillId);
  // And then PLAYED: measured, the score alone picked a band 3 fireball that
  // cleared 0 of 6 where the random walk cleared 5. One target at a time is a
  // number the sheet reads; a pack is a thing it cannot see.
  return played(shortlist, band, rng) ?? shortlist[0] ?? ladderCharacter(band, rng, skillId);
}

/** A SECOND of what the main hand holds, in place of the shield. What an off
 *  hand is FOR is a build decision, so the ceiling tries both and the floor
 *  keeps its shield. False when there is nothing to pair with. */
function dualWield(character: Character, ilvl: number, pool: ModPool, rng: Rng): boolean {
  const main = character.equipment[WEAPON_SLOT];
  const base = main ? GEAR_BASE_BY_ID[main.base] : undefined;
  if (!base || (base.hands ?? 1) > 1) return false;
  character.equipment[OFF_SLOT] = rollGear(base.id, ilvl, 99, pool, rng);
  return true;
}

/** How many arrangements get their tree walked. The walk is 90% of the search
 *  and the bare order is a good but not perfect guide to the walked one. */
const SHORTLIST = 4;
/** Seeds each shortlisted build is played over, and the seconds it gets. */
const TRIALS = [3, 11];
const PATIENCE = 120;

/** Whichever of them clears most, and gets least hurt doing it. */
function played(shortlist: Character[], band: number, rng: Rng): Character | null {
  let best: Character | null = null;
  let score = -Infinity;
  for (const character of shortlist) {
    let cleared = 0;
    let low = 0;
    for (const seed of TRIALS) {
      const sim = new RunSim(ladderSet(band, new Rng(seed * 13 + band), new ModPool(ALL_MODS)), character, new Rng(seed));
      let worst = 1;
      let guard = Math.ceil(PATIENCE / TICK);
      while (sim.state.status === 'running' && guard-- > 0) {
        sim.step(TICK);
        worst = Math.min(worst, sim.state.hero.life / Math.max(1, sim.state.hero.stats.maxLife));
      }
      if (sim.state.status === 'cleared') cleared++;
      low += worst;
    }
    const scored = cleared * 100 + low;
    if (scored <= score) continue;
    score = scored;
    best = character;
  }
  void rng;
  return best;
}


/** Every point into the named attributes, evenly. */
function pour(character: Character, wanted: string[]): void {
  const points = attributePointsFor(character.level);
  for (const attr of ATTRIBUTES) character.attributes[attr.id] = 0;
  wanted.forEach((id, i) => {
    character.attributes[id] =
      Math.floor(points / wanted.length) + (i < points % wanted.length ? 1 : 0);
  });
}

/** Each open slot takes whichever passive raises `buildPower` most. A passive
 *  changing a RULE the sheet cannot read scores as nothing, which is why the
 *  demo MEASURES what this search returns rather than trusting the score. */
function fillPassives(character: Character, passives: string[]): void {
  for (const slot of SKILL_SLOTS) {
    if (!slot.accepts.includes('passive') || !slotIsOpen(character, slot.id)) continue;
    const held = new Set(Object.values(character.equipped ?? {}));
    const spare = passives.filter((id) => !held.has(id));
    if (spare.length === 0) return;
    let take = spare[0];
    let power = -1;
    for (const id of spare) {
      equipSkill(character, id, slot.id);
      const scored = buildPower(character);
      if (scored > power) {
        power = scored;
        take = id;
      }
    }
    equipSkill(character, take, slot.id);
  }
}

/** A mover, walked greedily too: six points buy two whole arms of the three. */
function walkBest(character: Character, skillId: string | null): void {
  if (!skillId) return;
  equipSkill(character, skillId);
  const web = MOVE_WEBS.find((m) => m.spec.skillId === skillId);
  if (!web) return;
  const progress = skillProgress(character, skillId);
  const budget = treePointsFor(skillId, character.level);
  while (progress.allocated.length < budget) {
    const open = web.nodes.filter((n) => canAllocate(skillId, n.id, progress.allocated));
    if (open.length === 0) return;
    let take = open[0];
    let power = -1;
    for (const node of open) {
      progress.allocated.push(node.id);
      const scored = buildPower(character);
      progress.allocated.pop();
      if (scored > power) {
        power = scored;
        take = node;
      }
    }
    progress.allocated.push(take.id);
  }
}

/** The skill's own web, one point at a time, always the open node worth most.
 *  Greedy is not optimal — a notable three minors away is invisible until the
 *  minors are paid for — so ties break toward the node NEAREST an unbought
 *  notable, which is how a player walks one. */
function greedyTree(character: Character, skillId: string): void {
  const progress = skillProgress(character, skillId);
  const tree = treeFor(skillId);
  const budget = treePointsFor(skillId, character.level);
  while (progress.allocated.length < budget) {
    const open = tree.filter((n) => canAllocate(skillId, n.id, progress.allocated));
    if (open.length === 0) return;
    let take = open[0];
    let power = -Infinity;
    for (const node of open) {
      progress.allocated.push(node.id);
      const choice = node.choices?.[0]?.id;
      if (choice) (progress.choices ??= {})[node.id] = choice;
      const scored = buildPower(character) + (node.kind === 'minor' ? REACH : 0);
      progress.allocated.pop();
      if (scored > power) {
        power = scored;
        take = node;
      }
    }
    progress.allocated.push(take.id);
    if (take.choices?.length) (progress.choices ??= {})[take.id] = take.choices[0].id;
  }
}

/** What a minor is worth for being ON THE WAY to something. Without it a greedy
 *  walk buys the first notable it can reach and then stalls on minors forever,
 *  which is a worse build than the random walk it is meant to beat. */
const REACH = 12;

/** Sockets fill before levels climb, so a set grows the way a player's does. */
const LADDER_SHAPES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 2], [2, 3], [3, 3], [3, 4], [4, 4],
];

/** The deep end: rolled full and KEPT for danger rather than aimed at a band,
 *  because power caps at the top band long before danger does. */
export function deepestSet(rng: Rng, pool: ModPool): Item[] {
  const top = CRYSTAL_LEVELS[CRYSTAL_LEVELS.length - 1].level;
  let best: Item[] = [];
  let danger = -1;
  for (let i = 0; i < 40; i++) {
    const set = Array.from({ length: RUN_SLOTS.length }, () => rollCrystal(top, pool, rng));
    const rolled = runSet(set).rewards.danger;
    if (rolled <= danger) continue;
    danger = rolled;
    best = set;
  }
  return best;
}

/**
 * A socketed set aimed at a power band. Rolled toward the target rather than
 * derived from it, so the nearest roll is the honest answer.
 */
export function ladderSet(band: number, rng: Rng, pool: ModPool): Item[] {
  const target = Math.max(0, Math.min(DROP_BANDS.length - 1, Math.round(band)));
  let best: Item[] = [];
  let closest = Infinity;

  for (const [filled, level] of LADDER_SHAPES) {
    if (filled > RUN_SLOTS.length || level > CRYSTAL_LEVELS.length) continue;
    // Twelve tries, not four: some of what a crystal rolls carries no danger,
    // and a player aiming at a band re-rolls those away.
    for (let attempt = 0; attempt < 12; attempt++) {
      const set = Array.from({ length: filled }, () => rollCrystal(level, pool, rng));
      const gap = Math.abs(runSet(set).power - target);
      if (gap >= closest) continue;
      closest = gap;
      best = set;
    }
  }
  return best;
}
