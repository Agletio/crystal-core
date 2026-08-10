/**
 * A reference set of gear and crystals for the dev kit and the balance
 * harnesses. Item level is the only parameter: it decides the base's tier as
 * well as which modifier tiers can roll.
 */
import { Rng } from '../rng';
import { ModPool, modCapacity } from '../mods';
import {
  ALL_MODS,
  CRYSTAL_LEVELS,
  DROP_BANDS,
  EQUIP_SLOTS,
  REFERENCE_ARMOUR_FAMILY,
  RUN_SLOTS,
} from '../data';
import { defaultGearBase, rollCrystal, rollGear } from '../economy';
import { runSet } from './crystal';
import { makeCharacter } from './character';
import { canAllocate, treeFor, treePointsFor } from '../skills-tree';
import { skillProgress } from './character';
import type { Character } from './character';
import type { Item } from '../types';

/** One item per slot, filled to its base's capacity, keyed by slot id. */
export function starterLoadout(rng: Rng, ilvl = 30): Record<string, Item> {
  const pool = new ModPool(ALL_MODS);
  const equipment: Record<string, Item> = {};

  for (const slot of EQUIP_SLOTS) {
    const base = defaultGearBase(slot.accepts, ilvl, REFERENCE_ARMOUR_FAMILY);
    if (!base) continue;
    // More than any base holds, and let modCapacity decide.
    equipment[slot.id] = rollGear(base.id, ilvl, 99, pool, rng);
  }
  return equipment;
}

/** How many mods a full set carries. Used by the harnesses. */
export function loadoutMods(equipment: Record<string, Item>): number {
  return Object.values(equipment).reduce((n, i) => n + i.mods.length, 0);
}

export const loadoutCapacity = (equipment: Record<string, Item>): number =>
  Object.values(equipment).reduce((n, i) => n + modCapacity(i), 0);

/**
 * What the power band below hands you, for asking whether this one is reachable
 * at all. Walks the tree at random, so it is a floor, not a forecast.
 */
export function ladderCharacter(band: number, rng: Rng, skillId = 'strike'): Character {
  const rung = Math.min(Math.max(1, band), DROP_BANDS.length - 1);
  const ilvl = DROP_BANDS[rung - 1].ilvl;

  const character = makeCharacter(starterLoadout(rng, ilvl), skillId);
  character.level = 4 + rung * 6;

  const progress = skillProgress(character, skillId);
  const tree = treeFor(skillId);
  while (progress.allocated.length < treePointsFor(character.level)) {
    const open = tree.filter((n) => canAllocate(skillId, n.id, progress.allocated));
    if (open.length === 0) break;
    const node = rng.pick(open)!;
    progress.allocated.push(node.id);
    if (node.choices?.length) (progress.choices ??= {})[node.id] = rng.pick(node.choices)!.id;
  }
  return character;
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
