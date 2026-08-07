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

/** Capacity of a slot type, including any bonus slots granted by crafting. */
export function slotCapacity(item: Item, slot: ModSlot): number {
  const base = item.slots[slot] ?? 0;
  const bonus = (item.meta?.bonusSlots?.[slot] as number) ?? 0;
  return base + bonus;
}

export function slotUsed(item: Item, slot: ModSlot): number {
  return item.mods.filter((m) => m.slot === slot).length;
}

export function totalCapacity(item: Item): number {
  return slotTypes(item).reduce((n, t) => n + slotCapacity(item, t), 0);
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

    return this.entries.filter((e) => {
      if (e.ilvl > item.ilvl) return false;
      if (takenGroups.has(e.group)) return false;
      if (opts.slot && e.slot !== opts.slot) return false;
      if (opts.tag && !e.tags.includes(opts.tag)) return false;
      if (!e.appliesTo.every((t) => item.tags.includes(t))) return false;
      // The item must actually HAVE this slot type, with room left.
      if (slotUsed(item, e.slot) >= slotCapacity(item, e.slot)) return false;
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
