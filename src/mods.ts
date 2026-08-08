import { Rng } from './rng';
import { QUALITIES, QUALITY_BY_ID } from './data';
import type {
  FillState,
  Item,
  ModDef,
  ModEntry,
  ModSlot,
  Quality,
  RolledMod,
  StatRoll,
} from './types';

/** Slot types this item actually has. */
export function slotTypes(item: Item): ModSlot[] {
  return Object.keys(item.slots);
}

/**
 * What the BASE says about this slot type, ignoring quality.
 *
 * The item's ceiling if it were finished — "a body armour is a defensive
 * piece" — and the right question for "can this currency target this item at
 * all", which is about what the base is, not how far along it is.
 */
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

// ---------------------------------------------------------------------------
// Quality
// ---------------------------------------------------------------------------

/** Untagged items are Rough — the state everything starts in. */
export function qualityOf(item: Item): Quality {
  return (item.meta?.quality as Quality) ?? 'rough';
}

export function qualityRank(quality: Quality): number {
  const i = QUALITIES.findIndex((q) => q.id === quality);
  return i < 0 ? 0 : i;
}

export const qualityName = (quality: Quality): string =>
  QUALITY_BY_ID[quality]?.name ?? quality;

/**
 * How many modifiers this item may hold, all in.
 *
 * The lower of two independent limits, and the pair is the whole point.
 * Quality says how finished the item is; the slot table says what a body
 * armour IS. Either can be the binding constraint — a Brilliant helmet is
 * capped by its own six slots, a Seamed one by its quality — and neither
 * subsumes the other.
 */
export function modCapacity(item: Item): number {
  // Bonus slots raise BOTH limits. They are the one way past a quality cap,
  // so counting them only against the slot table would leave Sigil of Excess
  // silently doing nothing on the finished items it exists for.
  const bonus = Object.values(
    (item.meta?.bonusSlots as Record<string, number>) ?? {}
  ).reduce((n, v) => n + v, 0);
  const byQuality = (QUALITY_BY_ID[qualityOf(item)]?.mods ?? 0) + bonus;
  return Math.min(byQuality, totalCapacity(item));
}

/**
 * Where this item's modifier budget actually sits, slot type by slot type.
 *
 * A Seamed body armour may hold two modifiers and declares seven slots across
 * three types, and the bench used to draw all seven — six of them permanently
 * dead, under a header that said 0/2. You were being shown room that did not
 * exist. So the budget is DEALT OUT: as many openings as the item can hold,
 * spread over the types the base actually has.
 *
 * Dealt one at a time, richest type first, so the base still decides its own
 * character — a body armour's first opening is defensive, a glove's is
 * offensive — but a two-modifier item never ends up with both openings on the
 * same side. Balance first, identity as the tiebreak.
 *
 * Derived from the base alone, never from what is currently rolled: an
 * allocation that shifted as you crafted would move slots around under your
 * hands mid-craft.
 */
export function slotAllocation(item: Item): Record<ModSlot, number> {
  const types = slotTypes(item);
  const out: Record<ModSlot, number> = {};
  for (const t of types) out[t] = 0;

  // Richest declared type first; declaration order breaks ties, which is why
  // the tables in data.ts list offence before defence before utility.
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
 * Openings of this type the item has right now.
 *
 * Never less than what is already rolled there. Bonus slots and re-rolls can
 * in principle leave a type over its allocation, and a capacity that hid a
 * modifier the item is wearing would be worse than one that is briefly
 * generous.
 */
export function slotCapacity(item: Item, slot: ModSlot): number {
  return Math.max(slotAllocation(item)[slot] ?? 0, slotUsed(item, slot));
}

export function hasOpenSlot(item: Item, slot?: ModSlot): boolean {
  // Quality first: a Rough item has no room for anything regardless of how
  // many slot types its base declares.
  if (item.mods.length >= modCapacity(item)) return false;
  const types = slot ? [slot] : slotTypes(item);
  return types.some((t) => slotUsed(item, t) < slotCapacity(item, t));
}

/** Derived, never stored. Drives loot colouring and nothing else. */
export function fillState(item: Item): FillState {
  if (item.mods.length === 0) return 'blank';
  return item.mods.length >= modCapacity(item) ? 'full' : 'partial';
}

// ---------------------------------------------------------------------------
// Pool
// ---------------------------------------------------------------------------

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

  /**
   * Everything that could legally roll on this item right now.
   * Filters on: item tags, item level, slot space, group exclusivity.
   */
  eligible(
    item: Item,
    opts: { slot?: ModSlot; tag?: string; excludeGroups?: string[] } = {}
  ): ModEntry[] {
    const takenGroups = new Set(item.mods.map((m) => m.group));
    for (const g of opts.excludeGroups ?? []) takenGroups.add(g);

    // Nothing is eligible on an item that is already as finished as its
    // quality allows. Checked here rather than only at the call sites so a
    // future effect cannot route around the cap by accident.
    if (item.mods.length >= modCapacity(item)) return [];

    // Dealt once, not once per candidate. This filter runs over the whole pool
    // on every roll, and every roll happens on a monster's death.
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

// ---------------------------------------------------------------------------
// Rolling
// ---------------------------------------------------------------------------

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
  return {
    entryId: entry.id,
    defId: entry.defId,
    group: entry.group,
    slot: entry.slot,
    name: entry.name,
    tier: entry.tier,
    tags: entry.tags,
    stats: rollValues(entry, rng),
  };
}

/** Weighted pick from the eligible pool, then roll it. Null if nothing fits. */
export function rollRandomMod(
  item: Item,
  pool: ModPool,
  rng: Rng,
  opts: { slot?: ModSlot; tag?: string } = {}
): RolledMod | null {
  const candidates = pool.eligible(item, opts);
  const entry = rng.weighted(candidates, (e) => e.weight);
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
 * Collects every stat line into flat / increased / more buckets.
 * `contextTags` is the tag set of the thing being calculated (a skill, or the
 * map generator). A stat line applies only if all of ITS tags are present in
 * the context — this is what makes "increased Fire Damage" work without any
 * special-case code.
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
 * A stat that IS a percentage, rather than one that scales a base.
 *
 * computeStat multiplies, so an "increased" line on a stat whose base is zero
 * produces zero no matter how large it is: (0 + 0) * 1.34 is still 0. That is
 * silent — the mod rolls, displays and stacks exactly like a working one — and
 * it had quietly killed increased Area of Effect, Currency Find, and three of
 * the crystal danger mods.
 *
 * Anything with no natural base (an area bonus, a find bonus, a monster damage
 * bonus) belongs here instead, where "increased" means "add these percentage
 * points" and zero is a legitimate starting value rather than an absorbing one.
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
