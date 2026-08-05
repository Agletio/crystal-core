/**
 * Placeholder gear for the character.
 *
 * The hero starts wearing a rolled set rather than nothing, so the numbers on
 * screen come from actual mods on actual items from the first second — the
 * gear → computeStat → combat path is live even before you equip anything
 * yourself.
 */
import { Rng } from '../rng';
import { ModPool } from '../mods';
import { craft } from '../crafting';
import { ALL_MODS, CURRENCY_BY_ID, EQUIP_SLOTS, GEAR_BASES } from '../data';
import { makeGear } from '../economy';
import type { Item } from '../types';

/** One filled item per slot, keyed by slot id. */
export function starterLoadout(rng: Rng, ilvl = 30): Record<string, Item> {
  const pool = new ModPool(ALL_MODS);
  const equipment: Record<string, Item> = {};

  for (const slot of EQUIP_SLOTS) {
    const base = GEAR_BASES.find((b) => b.kind === slot.accepts);
    if (!base) continue;
    const item = makeGear(base.id, ilvl);
    equipment[slot.id] = craft(item, CURRENCY_BY_ID.shard_of_awakening, pool, rng).item;
  }
  return equipment;
}
