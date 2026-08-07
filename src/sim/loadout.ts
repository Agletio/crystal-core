/**
 * A reference set of gear, for the dev kit and for the balance harnesses.
 *
 * The point is that the numbers on screen come from actual mods on actual
 * items from the first second — the gear → computeStat → combat path is live
 * before you equip anything yourself.
 *
 * Quality is a parameter because this is also what the tier ladder is measured
 * against, and "what does a Faceted set clear" is the question that ladder
 * exists to answer. It used to hand every slot a filled item unconditionally,
 * which is now a specific claim rather than the only possibility: a Seamed set
 * and a Brilliant set are different characters.
 */
import { Rng } from '../rng';
import { ModPool, modCapacity } from '../mods';
import { ALL_MODS, EQUIP_SLOTS, GEAR_BASES } from '../data';
import { rollGear } from '../economy';
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
    const base = GEAR_BASES.find((b) => b.kind === slot.accepts);
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
