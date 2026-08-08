/**
 * A reference set of gear for the dev kit and the balance harnesses. Quality is
 * a parameter because "what does a Faceted set clear" is what the tier ladder
 * exists to answer.
 */
import { Rng } from '../rng';
import { ModPool, modCapacity } from '../mods';
import { ALL_MODS, EQUIP_SLOTS, REFERENCE_ARMOUR_FAMILY } from '../data';
import { defaultGearBase, rollGear } from '../economy';
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
