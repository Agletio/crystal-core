/**
 * What a crystal is worth, derived from how dangerous it is. A character built
 * to ignore a kind of danger gets paid for danger it is not taking.
 */
import { DANGER_STATS, REWARD } from '../data';
import type { Item, RolledMod } from '../types';

export interface CrystalRewards {
  /** Total difficulty, including density. Display and comparison only. */
  danger: number;
  /** The part of danger that pays — density is excluded. */
  payingDanger: number;
  /** Multiplier on fragments. 1 = base. */
  fragmentYield: number;
  /** Percent. Feeds the chance a dropped currency climbs a class. */
  rarity: number;
}

/** No tag filter, and NOT computeStat: these are design metrics, not combat. */
function totalOf(mods: RolledMod[], stat: string): number {
  let total = 0;
  for (const mod of mods) {
    for (const line of mod.stats) {
      if (line.stat === stat) total += line.value;
    }
  }
  return total;
}

export function crystalRewards(crystal: Item): CrystalRewards {
  let danger = 0;
  let payingDanger = 0;

  for (const [stat, def] of Object.entries(DANGER_STATS)) {
    const amount = totalOf(crystal.mods, stat);
    if (amount === 0) continue;
    const scored = amount * def.weight;
    danger += scored;
    if (def.rewards) payingDanger += scored;
  }

  return {
    danger,
    payingDanger,
    fragmentYield: 1 + payingDanger * REWARD.fragmentPerDanger,
    rarity: payingDanger * REWARD.rarityPerDanger,
  };
}

/** Rows for the crystal header, in display order. */
export function rewardRows(crystal: Item): Array<{ label: string; value: string }> {
  const r = crystalRewards(crystal);
  const density = totalOf(crystal.mods, 'packCount') + totalOf(crystal.mods, 'packSize');

  const rows = [
    { label: 'danger', value: Math.round(r.danger).toString() },
    { label: 'fragments', value: `${Math.round((r.fragmentYield - 1) * 100)}%` },
    { label: 'rarity', value: `${Math.round(r.rarity)}%` },
  ];

  // Density pays in extra kills rather than through the multiplier, so it's
  // shown as its own line to make that obvious.
  if (density > 0) {
    rows.push({ label: 'density', value: `${Math.round(density)}%` });
  }
  return rows;
}
