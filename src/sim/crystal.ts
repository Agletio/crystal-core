/**
 * What a socketed SET is: how dangerous, how long, and what that is worth. A
 * character built to ignore a kind of danger gets paid for danger it is not
 * taking.
 */
import {
  BRANCH_BONUS_BY_ID,
  DANGER_STATS,
  DROP_GROUPS,
  FAMILY_BY_ID,
  FAMILY_YIELD,
  CRYSTAL_LEVELS,
  LADDER,
  CRYSTAL_SLOTS,
  SEAM_OF,
  MONSTER_FAMILIES,
  POWER,
  REWARD,
  bandFor,
  tierForLevel,
} from '../data';
import { branchMod, dropBias, soulMod, rungMod } from './stats';
import { sideAt } from '../ladder';
import type { RunWhere } from '../ladder';
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

/** THE BEST BASE A RUN MAY DROP, off the MEAN LEVEL socketed — every socket
 *  counts, so one good crystal cannot carry three blanks. It caps the base's
 *  TIER and never its item level: a cycle is WELL-ROLLED t1, not bad t1. */
export function tierForSet(crystals: Item[]): number {
  if (crystals.length === 0) return 1;
  const mean = crystals.reduce((n, c) => n + Number(c.meta.level ?? 1), 0) / crystals.length;
  return tierForLevel(Math.floor(mean));
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
 *  so it takes exactly two of each and cannot be stumbled into. */
export const crystalXp = (crystal: Item): number => Number(crystal.meta.xp) || 0;

/** The highest level that much experience has paid for. */
export function levelForXp(xp: number): number {
  let level = CRYSTAL_LEVELS[0].level;
  for (const def of CRYSTAL_LEVELS) {
    if (xp >= def.xp) level = def.level;
  }
  return level;
}

/** The level a crystal is standing at, whatever its stored fields say. */
export const crystalLevel = (crystal: Item): number =>
  Number(crystal.meta.level) || levelForXp(crystalXp(crystal));

/** THE SEAM IS SOCKETED FOR, never picked. *"Socketing 2 lvl 4 prismatic and 2
 *  lvl 4 demonic gives you the seam."* `SEAM_OF` of each aura world at the TOP
 *  level and nothing else: the last world is the whole wall spent. */
export function seamSocketed(crystals: Item[]): boolean {
  const top = CRYSTAL_LEVELS[CRYSTAL_LEVELS.length - 1].level;
  const at = (family: MonsterFamily): number =>
    crystals.filter((c) => crystalFamily(c) === family && crystalLevel(c) >= top).length;
  return (
    crystals.length === SEAM_OF * 2 &&
    at('demonic') === SEAM_OF &&
    at('prismatic') === SEAM_OF
  );
}

/** WHICH WORLD a set opens onto: a majority share, or the SEAM, which is the
 *  one exception and the one thing a level buys outright. */
export function mapTheme(crystals: Item[]): MapTheme {
  if (seamSocketed(crystals)) return 'seam';
  const share = composition(crystals);
  const half = 0.5 - 1e-6;
  if (share.demonic >= half) return 'demonic';
  if (share.prismatic >= half) return 'prismatic';
  return 'fissure';
}

/** Which family each pack belongs to, EXACT rather than rolled — 30% demonic on
 *  the seed would make composition something you hope for. Leftovers go to the
 *  largest remainders, dealt round-robin to interleave. */
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
  /** A BRANCH'S OWN PAYOUT, beside `pays` and never inside it: what the side
   *  room is FOR. Multipliers are 1 and rarity 0 anywhere else. */
  bonus: RunBonus;
}

/** Every way a branch can pay. Kept apart from `pays` so a bonus on gathering
 *  cannot quietly raise gold — `yield` feeds both, which is why neither is
 *  where this goes. */
export interface RunBonus {
  gold: number;
  currency: number;
  rarity: number; // percent, ADDED
  gather: number;
  xp: number;
  plans: number;
}

export const NO_BONUS: RunBonus =
  { gold: 1, currency: 1, rarity: 0, gather: 1, xp: 1, plans: 1 };

export function branchBonus(at?: RunWhere | null): RunBonus {
  const pays = BRANCH_BONUS_BY_ID[(at ? sideAt(at) : null)?.bonus ?? ''];
  if (!pays) return NO_BONUS;
  return {
    gold: pays.gold ?? 1,
    currency: pays.currency ?? 1,
    rarity: pays.rarity ?? 0,
    gather: pays.gather ?? 1,
    xp: pays.xp ?? 1,
    plans: pays.plans ?? 1,
  };
}

export function runSet(
  crystals: Item[],
  standing?: RolledMod | null,
  at?: RunWhere | null,
  souls = 0
): RunSet {
  // The Reckoning, WHERE THIS GOES and WHAT IS IN THE WALL, each as one mod.
  // All optional: a measured SET carries no walked web, sits at the bottom of
  // the climb and has nothing socketed.
  const rung = at ? rungMod(at.zone, at.rung) : null;
  const zone = at ? LADDER.zones[at.zone] : null;
  const soul = soulMod(souls);
  // A BRANCH RUNS AT ITS DEPTH'S DANGER: only what it adds to the floor is a
  // mod, so `crystalRewards` weighs it the way it weighs everything else.
  const branch = branchMod(BRANCH_BONUS_BY_ID[(at ? sideAt(at) : null)?.bonus ?? ''] ?? null);
  const mods = [
    ...crystals.flatMap((c) => c.mods),
    ...(standing ? [standing] : []),
    ...(rung ? [rung] : []),
    ...(soul ? [soul] : []),
    ...(branch ? [branch] : []),
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
    // THE CAMPAIGN IS RUN WITH NOTHING SOCKETED, so its ZONE decides both the
    // world and the best base — off the sockets alone the whole 42-depth climb
    // would be tier 1 in one world. Past it the sockets answer again.
    maxTier: zone ? Math.max(zone.tier, tierForSet(crystals)) : tierForSet(crystals),
    composition: share,
    // THE ZONE IS THE WORLD, and THE SEAM is the one thing that overrides it.
    theme: seamSocketed(crystals) ? 'seam' : zone ? zone.world : mapTheme(crystals),
    mix,
    yield: 1 + mix * REWARD.mixYield,
    pays: familyPays(share),
    bonus: branchBonus(at),
  };
}

/** Each world's bonus in the share it holds: gold and currency are
 *  multipliers, rarity is percent like everything else. */
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

  // WHAT IT PAYS IN, when what it pays in is not danger. `crystalRewards`
  // knows only danger and the rarity that comes off it, so a roll of Currency
  // Find or coin used to change the item and NOTHING on the panel — the one
  // thing you could craft onto a crystal that said nothing at all.
  const found = totalOf(crystal.mods, 'currencyFind');
  if (found > 0) rows.push({ label: 'currency', value: `+${Math.round(found)}%` });
  const gilt = totalOf(crystal.mods, 'giltChance');
  if (gilt > 0) rows.push({ label: 'gilded', value: `${Math.round(gilt)}%` });

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
  at?: RunWhere | null,
  souls = 0
): Array<{ label: string; value: string }> {
  const set = runSet(crystals, standing, at, souls);
  return [
    { label: 'sockets', value: `${set.filled}/${CRYSTAL_SLOTS.length}` },
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
  at?: RunWhere | null,
  souls = 0
): string {
  const set = runSet(crystals, standing, at, souls);
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
