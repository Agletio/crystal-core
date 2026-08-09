/**
 * What a socketed SET is: how dangerous, how long, and what that is worth. A
 * character built to ignore a kind of danger gets paid for danger it is not
 * taking.
 */
import { DANGER_STATS, POWER, REWARD, bandFor } from '../data';
import type { DropBand } from '../data';
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

export function crystalRewards(mods: RolledMod[]): CrystalRewards {
  let danger = 0;
  let payingDanger = 0;

  for (const [stat, def] of Object.entries(DANGER_STATS)) {
    const amount = totalOf(mods, stat);
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

/**
 * The socketed set, resolved. Everything a run needs to know about what it was
 * launched with, so no part of the sim has to know how many sockets exist or
 * what happens to be in them.
 */
export interface RunSet {
  /** Every modifier on every socketed crystal, merged. */
  mods: RolledMod[];
  /** Sockets holding something. Run LENGTH; never difficulty. */
  filled: number;
  rewards: CrystalRewards;
  /** See POWER. 0 is the bare Fissure. */
  power: number;
  band: DropBand;
}

export function runSet(crystals: Item[]): RunSet {
  const mods = crystals.flatMap((c) => c.mods);
  const rewards = crystalRewards(mods);
  const power = Math.min(
    POWER.max,
    crystals.length * POWER.perSocket + rewards.danger / POWER.perDanger
  );
  return { mods, filled: crystals.length, rewards, power, band: bandFor(power) };
}

/** Rows for the crystal header, in display order. */
export function rewardRows(crystal: Item): Array<{ label: string; value: string }> {
  const r = crystalRewards(crystal.mods);
  const density = totalOf(crystal.mods, 'packCount') + totalOf(crystal.mods, 'packSize');

  const rows = [
    { label: 'danger', value: Math.round(r.danger).toString() },
    { label: 'fragments', value: `${Math.round((r.fragmentYield - 1) * 100)}%` },
    { label: 'rarity', value: `${Math.round(r.rarity)}%` },
  ];

  // Density pays in extra kills, not through the multiplier.
  if (density > 0) {
    rows.push({ label: 'density', value: `${Math.round(density)}%` });
  }
  return rows;
}

/** Rows for the whole socketed set, which is what a run is actually launched with. */
export function setRows(crystals: Item[]): Array<{ label: string; value: string }> {
  const set = runSet(crystals);
  return [
    { label: 'sockets', value: `${set.filled}/4` },
    { label: 'danger', value: Math.round(set.rewards.danger).toString() },
    { label: 'power', value: set.power.toFixed(1) },
    { label: 'item level', value: String(set.band.ilvl) },
  ];
}
