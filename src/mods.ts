import { Rng } from './rng';
import {
  DANGER_STATS,
  GEAR_BASE_BY_ID,
  MOD_BY_ID,
  MOD_TIER_LIFT,
  STAT_POWER,
  USES,
  baseMods,
  usesFor,
} from './data';
import type {
  FillState,
  Item,
  ModDef,
  ModEntry,
  ModSlot,
  RolledMod,
  StatRoll,
} from './types';

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

/** How dangerous a socketed set is, and how much of that the rewards pay for.
 *  Here rather than beside `crystalRewards` because the MONSTERS read it too —
 *  two sums of the same table is one sum that is wrong. */
export function dangerScore(mods: RolledMod[]): { danger: number; paying: number } {
  let danger = 0;
  let paying = 0;
  for (const [stat, def] of Object.entries(DANGER_STATS)) {
    const amount = Math.min(totalOf(mods, stat), def.cap ?? Infinity);
    if (amount === 0) continue;
    const scored = amount * def.weight;
    danger += scored;
    if (def.rewards) paying += scored;
  }
  return { danger, paying };
}

/** Slot types this item actually has. */
export function slotTypes(item: Item): ModSlot[] {
  return Object.keys(item.slots);
}

/** The ceiling on ONE slot type. How many the item holds is `modCapacity`. */
export function declaredCapacity(item: Item, slot: ModSlot): number {
  const base = item.slots[slot] ?? 0;
  const bonus = (item.meta?.bonusSlots?.[slot] as number) ?? 0;
  return base + bonus;
}

export function slotUsed(item: Item, slot: ModSlot): number {
  return item.mods.filter((m) => m.slot === slot).length;
}

export function totalCapacity(item: Item): number {
  return slotTypes(item).reduce((n, t) => n + declaredCapacity(item, t), 0);
}

/**
 * 1, 2 or 3 for gear; a crystal's is its level. No currency raises it, so a
 * bigger item means going and finding a better base.
 */
export const baseTier = (item: Item): number =>
  item.kind === 'crystal'
    ? Number(item.meta?.level) || 1
    : (GEAR_BASE_BY_ID[item.base]?.tier ?? 1);

/** **TOTAL STAT POWER**, off `STAT_POWER` — every line a piece carries, base
 *  and rolled alike, in one number. An UNPRICED stat is worth nothing here
 *  rather than guessed at, and the demo holds every implicit to being priced. */
export function statPower(item: Item): number {
  const weigh = (stat: string, form: string, value: number): number =>
    (STAT_POWER[`${stat}:${form}`] ?? 0) * value;
  // The rating and the swing are not LINES, and are the same kind of thing.
  let power = weigh('armour', 'flat', item.armour ?? 0)
    + weigh('damage', 'flat', item.damage ?? 0);
  for (const mod of [...item.implicits, ...item.mods]) {
    for (const line of mod.stats) power += weigh(line.stat, line.form, line.value);
  }
  return power;
}

/** What that ladder is called on screen. A crystal's is a level, not a tier. */
export const tierName = (item: Item): string =>
  item.kind === 'crystal' ? `Level ${baseTier(item)}` : `Tier ${baseTier(item)}`;

/**
 * The lower of two independent limits: the base's TIER says how many, the slot
 * table says where they may go. Either can be the binding one, and a crystal
 * declares its whole capacity in one `mod` slot rather than a spread.
 */
export function modCapacity(item: Item): number {
  // Bonus slots raise BOTH limits — they are the one way past the tier's cap.
  const bonus = Object.values(
    (item.meta?.bonusSlots as Record<string, number>) ?? {}
  ).reduce((n, v) => n + v, 0);
  const declared =
    item.kind === 'crystal' ? (item.slots.mod ?? 0) : baseMods(baseTier(item));
  return Math.min(declared + bonus, totalCapacity(item));
}

/**
 * Where the item's modifier budget sits, slot type by slot type. DEALT OUT: as
 * many openings as the item can hold, spread over the types the base has, one
 * at a time, richest type first — so a body armour's first opening is defensive
 * and a glove's is offensive, but a two-modifier item never puts both on the
 * same side.
 *
 * From the base alone, never from what is rolled: an allocation that shifted as
 * you crafted would move slots around under your hands.
 */
export function slotAllocation(item: Item): Record<ModSlot, number> {
  const types = slotTypes(item);
  const out: Record<ModSlot, number> = {};
  for (const t of types) out[t] = 0;

  // Richest declared type first, ties broken by declaration order — which is
  // why data.ts lists offence, then defence, then utility.
  const order = [...types]
    .filter((t) => declaredCapacity(item, t) > 0)
    .sort((a, b) => declaredCapacity(item, b) - declaredCapacity(item, a));

  let left = modCapacity(item);
  while (left > 0) {
    const before = left;
    for (const t of order) {
      if (left === 0) break;
      if (out[t] >= declaredCapacity(item, t)) continue;
      out[t]++;
      left--;
    }
    // Everything is at its declared ceiling — the budget cannot be spent.
    if (left === before) break;
  }
  return out;
}

/**
 * Openings of this type right now, never fewer than are already rolled there —
 * a capacity that hid a modifier the item is wearing is worse than a generous one.
 */
export function slotCapacity(item: Item, slot: ModSlot): number {
  return Math.max(slotAllocation(item)[slot] ?? 0, slotUsed(item, slot));
}

export function hasOpenSlot(item: Item, slot?: ModSlot): boolean {
  if (item.mods.length >= modCapacity(item)) return false;
  const types = slot ? [slot] : slotTypes(item);
  return types.some((t) => slotUsed(item, t) < slotCapacity(item, t));
}

/** Derived, never stored. Drives loot colouring and nothing else. */
export function fillState(item: Item): FillState {
  if (item.mods.length === 0) return 'blank';
  return item.mods.length >= modCapacity(item) ? 'full' : 'partial';
}

export class ModPool {
  readonly entries: ModEntry[] = [];

  constructor(defs: ModDef[] = []) {
    for (const def of defs) this.add(def);
  }

  /** Flattens a mod family into one rollable entry per tier. */
  add(def: ModDef): void {
    def.tiers.forEach((t, i) => {
      const tier = i + 1; // author best-first
      this.entries.push({
        id: `${def.id}_t${tier}`,
        defId: def.id,
        group: def.group ?? def.id,
        slot: def.slot,
        name: t.name ?? def.name,
        tier,
        ilvl: t.ilvl,
        weight: t.weight,
        appliesTo: def.appliesTo,
        tags: def.tags ?? [],
        stats: t.stats,
      });
    });
  }

  /** Filters on item tags, item level, slot space and group exclusivity. */
  eligible(
    item: Item,
    opts: { slot?: ModSlot; tag?: string; excludeGroups?: string[] } = {}
  ): ModEntry[] {
    const takenGroups = new Set(item.mods.map((m) => m.group));
    for (const g of opts.excludeGroups ?? []) takenGroups.add(g);

    // Here rather than only at the call sites, so no future effect can route
    // around the capacity cap by accident.
    if (item.mods.length >= modCapacity(item)) return [];

    // Dealt once, not per candidate: this runs over the whole pool per roll.
    const alloc = slotAllocation(item);
    const used: Record<ModSlot, number> = {};
    for (const m of item.mods) used[m.slot] = (used[m.slot] ?? 0) + 1;

    return this.entries.filter((e) => {
      if (e.ilvl > item.ilvl) return false;
      if (takenGroups.has(e.group)) return false;
      if (opts.slot && e.slot !== opts.slot) return false;
      if (opts.tag && !e.tags.includes(opts.tag)) return false;
      if (!e.appliesTo.every((t) => item.tags.includes(t))) return false;
      // The item must actually HAVE an opening of this type.
      if ((used[e.slot] ?? 0) >= (alloc[e.slot] ?? 0)) return false;
      return true;
    });
  }
}

export function rollValues(entry: ModEntry, rng: Rng): StatRoll[] {
  return entry.stats.map((s) => {
    const [lo, hi] = s.range;
    const isInt = Number.isInteger(lo) && Number.isInteger(hi);
    return {
      stat: s.stat,
      form: s.form,
      value: isInt ? rng.int(lo, hi) : Number(rng.float(lo, hi).toFixed(2)),
      tags: s.tags ?? [],
    };
  });
}

export function instantiate(entry: ModEntry, rng: Rng): RolledMod {
  const rolled: RolledMod = {
    entryId: entry.id,
    defId: entry.defId,
    group: entry.group,
    slot: entry.slot,
    name: entry.name,
    tier: entry.tier,
    tags: entry.tags,
    stats: rollValues(entry, rng),
  };
  // A CRYSTAL ROLL BURNS DOWN, and only a crystal roll: gear is kept.
  if (entry.appliesTo.includes('crystal')) rolled.uses = usesFor(entry.weight);
  return rolled;
}

/** DESCENTS A ROLL STARTED WITH, off the tier it actually came from. Asked by
 *  `heal` and by the card, so what is repaired and what is printed agree. */
export function fullUses(mod: RolledMod): number {
  const tier = MOD_BY_ID[mod.defId]?.tiers[mod.tier - 1];
  return tier ? usesFor(tier.weight) : USES.most;
}

/** WHAT A CRYSTAL'S LEVEL DOES TO THE ODDS: a lift on the entry's own weight,
 *  raised to how far its tier sits above the WORST its modifier has. A level 4
 *  can still roll the worst line and a level 2 the best — the level moves the
 *  odds, never the ceiling. Pure, so a seed still replays. */
export function tierLift(item: Item, entry: ModEntry): number {
  if (item.kind !== 'crystal') return 1;
  const lift = MOD_TIER_LIFT[Math.min(MOD_TIER_LIFT.length, Math.max(1, Number(item.meta.level) || 1)) - 1];
  const worst = MOD_BY_ID[entry.defId]?.tiers.length ?? entry.tier;
  return lift ** (worst - entry.tier);
}

/** Weighted pick from the eligible pool, then roll it. Null if nothing fits. */
export function rollRandomMod(
  item: Item,
  pool: ModPool,
  rng: Rng,
  opts: { slot?: ModSlot; tag?: string } = {}
): RolledMod | null {
  const candidates = pool.eligible(item, opts);
  const entry = rng.weighted(candidates, (e) => e.weight * tierLift(item, e));
  return entry ? instantiate(entry, rng) : null;
}

// ---------------------------------------------------------------------------
// Stat aggregation — the PoE resolution order
// ---------------------------------------------------------------------------

export interface StatBuckets {
  flat: number;
  inc: number;
  more: number[];
}

/**
 * Every stat line into flat / increased / more buckets. A line applies only if
 * all of ITS tags are in `contextTags`, which is what makes "increased Fire
 * Damage" work with no special-case code.
 */
export function aggregate(
  mods: RolledMod[],
  stat: string,
  contextTags: string[] = []
): StatBuckets {
  const out: StatBuckets = { flat: 0, inc: 0, more: [] };
  const ctx = new Set(contextTags);

  for (const mod of mods) {
    for (const line of mod.stats) {
      if (line.stat !== stat) continue;
      if (!line.tags.every((t) => ctx.has(t))) continue;

      if (line.form === 'flat') out.flat += line.value;
      else if (line.form === 'inc') out.inc += line.value;
      else out.more.push(line.value);
    }
  }
  return out;
}

/**
 * A stat that IS a percentage rather than one scaling a base. computeStat
 * multiplies, so an "increased" line on a zero base silently produces zero —
 * the mod rolls, displays and stacks exactly like a working one.
 *
 * Anything with no natural base belongs here, where "increased" adds points.
 */
export function percentStat(
  mods: RolledMod[],
  stat: string,
  contextTags: string[] = []
): number {
  const b = aggregate(mods, stat, contextTags);
  let v = b.flat + b.inc;
  // A 'more' line still compounds, against the 100% you already have.
  for (const m of b.more) v = (100 + v) * (1 + m / 100) - 100;
  return v;
}

/** (base + flat) * (1 + sum(inc)/100) * prod(1 + more/100) */
export function computeStat(
  base: number,
  mods: RolledMod[],
  stat: string,
  contextTags: string[] = []
): number {
  const b = aggregate(mods, stat, contextTags);
  let v = (base + b.flat) * (1 + b.inc / 100);
  for (const m of b.more) v *= 1 + m / 100;
  return v;
}
