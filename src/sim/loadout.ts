/**
 * A reference set of gear for the dev kit and the balance harnesses. Quality is
 * a parameter because "what does a Faceted set clear" is what the tier ladder
 * exists to answer.
 */
import { Rng } from '../rng';
import { ModPool, modCapacity } from '../mods';
import { ALL_MODS, CRYSTAL_TIERS, EQUIP_SLOTS, REFERENCE_ARMOUR_FAMILY } from '../data';
import { defaultGearBase, rollGear } from '../economy';
import { makeCharacter } from './character';
import { canAllocate, treeFor, treePointsFor } from '../skills-tree';
import { skillProgress } from './character';
import type { Character } from './character';
import type { Item, Quality } from '../types';

/** One item per slot, filled to its quality, keyed by slot id. */
export function starterLoadout(
  rng: Rng,
  ilvl = 30,
  quality: Quality = 'faceted'
): Record<string, Item> {
  const pool = new ModPool(ALL_MODS);
  const equipment: Record<string, Item> = {};

  for (const slot of EQUIP_SLOTS) {
    const base = defaultGearBase(slot.accepts, ilvl, REFERENCE_ARMOUR_FAMILY);
    if (!base) continue;
    // Ask for more than any quality allows and let modCapacity decide — the
    // caller should not have to know the ladder's numbers to fill an item.
    equipment[slot.id] = rollGear(base.id, ilvl, quality, 99, pool, rng);
  }
  return equipment;
}

/** How many mods a full set of this quality carries. Used by the harnesses. */
export function loadoutMods(equipment: Record<string, Item>): number {
  return Object.values(equipment).reduce((n, i) => n + i.mods.length, 0);
}

export const loadoutCapacity = (equipment: Record<string, Item>): number =>
  Object.values(equipment).reduce((n, i) => n + modCapacity(i), 0);

/**
 * What the tier below hands you, for asking whether this one is reachable at
 * all. Walks the tree at random, so it is a floor, not a forecast.
 */
export function ladderCharacter(tier: number, rng: Rng, skillId = 'strike'): Character {
  const rung = Math.min(Math.max(1, tier), CRYSTAL_TIERS.length);
  const quality: Quality = rung >= 6 ? 'brilliant' : rung >= 3 ? 'faceted' : 'seamed';
  const ilvl = CRYSTAL_TIERS[rung - 1].ilvl;

  const character = makeCharacter(starterLoadout(rng, ilvl, quality), skillId);
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
