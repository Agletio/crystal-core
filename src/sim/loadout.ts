/**
 * Placeholder gear for the character.
 *
 * Real equipment — inventory, slots, equipping what you crafted — is the next
 * phase. Until then the hero wears a seeded starter set so the numbers on
 * screen come from actual rolled mods rather than hardcoded constants. That
 * way the gear -> computeStat -> combat path is live from day one and the
 * equip UI is the only thing left to add.
 */
import { Rng } from '../rng';
import { ModPool } from '../mods';
import { craft } from '../crafting';
import { ALL_MODS, CURRENCY_BY_ID } from '../data';
import { makeGear } from '../economy';
import type { Item } from '../types';

export function starterLoadout(rng: Rng, ilvl = 30): Item[] {
  const pool = new ModPool(ALL_MODS);
  const fill = (item: Item) =>
    craft(item, CURRENCY_BY_ID.shard_of_awakening, pool, rng).item;

  return [
    fill(makeGear('body_armour', ilvl, 'Worn Plate')),
    fill(makeGear('ring', ilvl, 'Iron Band')),
  ];
}
