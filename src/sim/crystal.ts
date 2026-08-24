/**
 * What a socketed SET is: how dangerous, how long, and what that is worth. A
 * character built to ignore a kind of danger gets paid for danger it is not
 * taking.
 */
import {
  DANGER_STATS,
  DROP_GROUPS,
  FAMILY_BY_ID,
  FAMILY_YIELD,
  LADDER,
  MONSTER_FAMILIES,
  POWER,
  REWARD,
  bandFor,
  tierForSockets,
} from '../data';
import { challengeMod, dropBias, rungMod } from './stats';
import { dangerScore } from '../mods';
import type { DropBand } from '../data';
import type { Item, MapTheme, MonsterFamily, RolledMod } from '../types';

export interface CrystalRewards {
  /** Total difficulty, including density. Display and comparison only. */
  danger: number;
  /** The part of danger that pays — density is excluded. */
  payingDanger: number;
  /** Percent. Feeds the chance a dropped currency climbs a class. */
  rarity: number;
}

export function crystalRewards(mods: RolledMod[]): CrystalRewards {
  const { danger, paying } = dangerScore(mods);
  return { danger, payingDanger: paying, rarity: paying * REWARD.rarityPerDanger };
}

// No tag filter, and NOT computeStat: a design metric, not combat.
function totalOf(mods: RolledMod[], stat: string): number {
  let total = 0;
  for (const mod of mods) {
    for (const line of mod.stats) {
      if (line.stat === stat) total += line.value;
    }
  }
  return total;
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

/** Half of one family takes the rock; two halves and no Normal is the Seam,
 *  which therefore takes exactly two of each and cannot be stumbled into. */
export function mapTheme(share: Composition): MapTheme {
  const half = 0.5 - 1e-6;
  if (share.normal <= 1e-6 && share.demonic >= half && share.prismatic >= half) return 'seam';
  if (share.demonic >= half) return 'demonic';
  if (share.prismatic >= half) return 'prismatic';
  return 'fissure';
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
  /** Best base TIER this run can drop: what the SOCKETS buy. */
  maxTier: number;
  composition: Composition; // which monsters, in what share; never how hard
  theme: MapTheme; // which world the rock is; follows the composition
  /** 1 when the two other worlds are split evenly, 0 when neither is here. */
  mix: number;
  /** Multiplier on what drops. Never on item level: payment, not access. */
  yield: number;
  /** What the worlds in this set pay in, each in its own currency. */
  pays: { gold: number; currency: number; rarity: number };
}

export function runSet(
  crystals: Item[],
  standing?: RolledMod | null,
  at?: { zone: number; rung: number } | null
): RunSet {
  // The trials web and the RUNG, each as one mod. Both optional: a measured SET
  // carries no walked web and sits at the bottom of the climb.
  const rung = at ? rungMod(at.zone, at.rung) : null;
  // A CHALLENGE FLOOR is a second synthetic mod, not a bigger rung: what it
  // does is a spike nobody walked up to, and it pays through the same seam.
  const spike = at ? challengeMod(at.zone, at.rung) : null;
  const mods = [
    ...crystals.flatMap((c) => c.mods),
    ...(standing ? [standing] : []),
    ...(rung ? [rung] : []),
    ...(spike ? [spike] : []),
  ];
  const rewards = crystalRewards(mods);
  const power = Math.min(
    POWER.max,
    crystals.length * POWER.perSocket + rewards.danger / POWER.perDanger
  );
  const share = composition(crystals);
  // Evenly split between the two other worlds is 1; three to one is a half.
  const mix = 2 * Math.min(share.demonic, share.prismatic);
  return {
    mods,
    filled: crystals.length,
    rewards,
    power,
    band: bandFor(power),
    maxTier: tierForSockets(crystals.length),
    composition: share,
    // WHAT YOU SOCKETED IS WHERE YOU GO. The rung is depth and nothing else —
    // it used to name the world too, which made the crystals a second ladder.
    theme: mapTheme(share),
    mix,
    yield: 1 + mix * REWARD.mixYield,
    pays: familyPays(share),
  };
}

/** Each world's bonus, in the share it holds. Multipliers on gold and currency
 *  frequency; rarity is percent, which is how everything else states it. */
export function familyPays(share: Composition): { gold: number; currency: number; rarity: number } {
  const out = { gold: 1, currency: 1, rarity: 0 };
  for (const family of MONSTER_FAMILIES) {
    const pays = FAMILY_YIELD[family.id];
    out.gold += share[family.id] * pays.gold;
    out.currency += share[family.id] * pays.currency;
    out.rarity += share[family.id] * pays.rarity;
  }
  return out;
}

/** Rows for the crystal header, in display order. */
export function rewardRows(crystal: Item): Array<{ label: string; value: string }> {
  const r = crystalRewards(crystal.mods);
  const density = totalOf(crystal.mods, 'packCount') + totalOf(crystal.mods, 'packSize');

  const rows = [
    { label: 'family', value: FAMILY_BY_ID[crystalFamily(crystal)].name },
    { label: 'danger', value: Math.round(r.danger).toString() },
    { label: 'rarity', value: `${Math.round(r.rarity)}%` },
  ];

  // Density pays in extra kills, not through the multiplier.
  if (density > 0) {
    rows.push({ label: 'density', value: `${Math.round(density)}%` });
  }

  // A finding modifier carries no danger at all, so without a row of its own
  // it is the one thing you can craft onto a crystal that says nothing.
  const bias = dropBias(crystal.mods);
  for (const group of DROP_GROUPS) {
    const aimed = (bias[group.id] ?? 1) - 1;
    if (aimed > 0.01) rows.push({ label: group.id, value: `+${Math.round(aimed * 100)}%` });
  }
  return rows;
}

/** Rows for the whole socketed set, `standing` included — a screen without it
 *  quotes a danger the run will not have. */
export function setRows(
  crystals: Item[],
  standing?: RolledMod | null,
  at?: { zone: number; rung: number } | null
): Array<{ label: string; value: string }> {
  const set = runSet(crystals, standing, at);
  return [
    { label: 'sockets', value: `${set.filled}/4` },
    { label: 'danger', value: Math.round(set.rewards.danger).toString() },
    { label: 'power', value: set.power.toFixed(1) },
    { label: 'item level', value: String(set.band.ilvl) },
  ];
}

/** What this set is FOR, in words: what its worlds pay, what a mix adds, and
 *  what its modifiers point the drops at. Empty for the bare Fissure. */
export function farmingText(
  crystals: Item[],
  standing?: RolledMod | null,
  at?: { zone: number; rung: number } | null
): string {
  const set = runSet(crystals, standing, at);
  const said: string[] = [];
  if (set.pays.gold > 1.02) said.push(`+${Math.round((set.pays.gold - 1) * 100)}% gold`);
  if (set.pays.currency > 1.02) {
    said.push(`+${Math.round((set.pays.currency - 1) * 100)}% currency`);
  }
  if (set.pays.rarity >= 1) said.push(`+${Math.round(set.pays.rarity)}% rarity`);
  if (set.mix > 0) said.push(`+${Math.round((set.yield - 1) * 100)}% for the mix`);

  const bias = dropBias(set.mods);
  for (const group of DROP_GROUPS) {
    const aimed = (bias[group.id] ?? 1) - 1;
    if (aimed > 0.01) said.push(`+${Math.round(aimed * 100)}% ${group.id}`);
  }
  return said.join(' · ');
}

/** What you will be fighting, biggest share first. Readable before you commit. */
export function compositionText(crystals: Item[]): string {
  const share = composition(crystals);
  return MONSTER_FAMILIES.filter((f) => share[f.id] > 0)
    .sort((a, b) => share[b.id] - share[a.id])
    .map((f) => `${Math.round(share[f.id] * 100)}% ${f.name}`)
    .join(' · ');
}
