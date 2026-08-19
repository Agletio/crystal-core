/**
 * A reference set of gear and crystals for the dev kit and the balance
 * harnesses. Item level is the only parameter: it decides the base's tier as
 * well as which modifier tiers can roll.
 */
import { Rng } from '../rng';
import { ModPool } from '../mods';
import {
  ALL_MODS,
  ATTRIBUTES,
  CRYSTAL_LEVELS,
  DROP_BANDS,
  EQUIP_SLOTS,
  PLAYER_SKILLS,
  REFERENCE_ARMOUR_FAMILY,
  RUN_SLOTS,
  SKILL_SLOTS,
} from '../data';
import { defaultGearBase, rollCrystal, rollGear } from '../economy';
import { runSet } from './crystal';
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
    const base = defaultGearBase(slot.accepts, ilvl, family);
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
  // Every passive slot the LEVEL opened, filled at random — the argument the
  // attributes above make. Since the Burst moved into a slot, an empty one is a
  // build with no answer to a crowd at all.
  const passives = PLAYER_SKILLS.filter((sk) => sk.category === 'passive');
  for (const slot of SKILL_SLOTS) {
    if (!slot.accepts.includes('passive') || !slotIsOpen(character, slot.id)) continue;
    const held = new Set(Object.values(character.equipped ?? {}));
    const spare = passives.filter((sk) => !held.has(sk.id));
    if (spare.length === 0) break;
    equipSkill(character, rng.pick(spare)!.id, slot.id);
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
