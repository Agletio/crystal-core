/**
 * What a socketed SET is: how dangerous, how long, and what that is worth. A
 * character built to ignore a kind of danger gets paid for danger it is not
 * taking.
 */
import { DANGER_STATS, FAMILY_BY_ID, MONSTER_FAMILIES, POWER, REWARD, bandFor } from '../data';
import type { DropBand } from '../data';
import type { Item, MonsterFamily, RolledMod } from '../types';

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

/** A crystal from before families, or one naming a family that was retired. */
export const crystalFamily = (crystal: Item): MonsterFamily =>
  FAMILY_BY_ID[String(crystal.meta.family)]?.id ?? 'normal';

/** What share of the run's monsters each family takes. Sums to 1. */
export type Composition = Record<MonsterFamily, number>;

/**
 * Each socketed crystal converts ITS SHARE. Read off what is socketed rather
 * than off the socket count, so a fifth would not rescale every composition.
 */
export function composition(crystals: Item[]): Composition {
  const out: Composition = { normal: 0, demonic: 0, prismatic: 0 };
  if (crystals.length === 0) return { ...out, normal: 1 }; // the bare Fissure
  for (const crystal of crystals) out[crystalFamily(crystal)] += 1 / crystals.length;
  return out;
}

/** The largest share. Normal breaks a tie, being the floor everything sits on. */
export function dominantFamily(share: Composition): MonsterFamily {
  return MONSTER_FAMILIES.reduce(
    (best, f) => (share[f.id] > share[best] ? f.id : best),
    'normal' as MonsterFamily
  );
}

/**
 * Which family each pack belongs to, exact rather than rolled: a set that came
 * out 30% demonic on the seed would make composition something you hope for.
 * Leftover packs go to the largest remainders, dealt round-robin to interleave.
 */
export function familyPlan(share: Composition, packs: number): MonsterFamily[] {
  const ids = MONSTER_FAMILIES.map((f) => f.id).filter((id) => share[id] > 0);
  const exact = ids.map((id) => share[id] * packs);
  const counts = exact.map(Math.floor);

  const spare = packs - counts.reduce((a, b) => a + b, 0);
  [...exact.keys()]
    .sort((a, b) => exact[b] - counts[b] - (exact[a] - counts[a]))
    .slice(0, Math.max(0, spare))
    .forEach((i) => counts[i]++);

  const plan: MonsterFamily[] = [];
  for (let i = 0; plan.length < packs && ids.length > 0; i++) {
    const at = i % ids.length;
    if (counts[at] > 0) {
      counts[at]--;
      plan.push(ids[at]);
    }
  }
  return plan;
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
  composition: Composition; // which monsters, in what share; never how hard
}

export function runSet(crystals: Item[]): RunSet {
  const mods = crystals.flatMap((c) => c.mods);
  const rewards = crystalRewards(mods);
  const power = Math.min(
    POWER.max,
    crystals.length * POWER.perSocket + rewards.danger / POWER.perDanger
  );
  return {
    mods,
    filled: crystals.length,
    rewards,
    power,
    band: bandFor(power),
    composition: composition(crystals),
  };
}

/** Rows for the crystal header, in display order. */
export function rewardRows(crystal: Item): Array<{ label: string; value: string }> {
  const r = crystalRewards(crystal.mods);
  const density = totalOf(crystal.mods, 'packCount') + totalOf(crystal.mods, 'packSize');

  const rows = [
    { label: 'family', value: FAMILY_BY_ID[crystalFamily(crystal)].name },
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

/** What you will be fighting, biggest share first. Readable before you commit. */
export function compositionText(crystals: Item[]): string {
  const share = composition(crystals);
  return MONSTER_FAMILIES.filter((f) => share[f.id] > 0)
    .sort((a, b) => share[b.id] - share[a.id])
    .map((f) => `${Math.round(share[f.id] * 100)}% ${f.name}`)
    .join(' · ');
}
