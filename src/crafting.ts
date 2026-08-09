import { Rng } from './rng';
import { describeStatLine } from './mod-text';
import {
  ModPool,
  fillState,
  hasOpenSlot,
  instantiate,
  modCapacity,
  qualityName,
  qualityOf,
  qualityRank,
  rollRandomMod,
  rollValues,
  declaredCapacity,
  slotCapacity,
  slotTypes,
  slotUsed,
} from './mods';
import { QUALITIES } from './data';
import type {
  Condition,
  CraftResult,
  CurrencyDef,
  Effect,
  Item,
  ModSlot,
  RolledMod,
} from './types';

export interface CraftContext {
  item: Item; // mutable draft — the engine clones before handing it over
  pool: ModPool;
  rng: Rng;
  log: string[];
}

// ---------------------------------------------------------------------------
// Condition registry
//
// Add a new gate here once; every currency can then use it as data.
// ---------------------------------------------------------------------------

export type ConditionImpl = (item: Item, params: any) => boolean;

export const CONDITIONS: Record<string, ConditionImpl> = {
  has_open_slot: (item, p) => hasOpenSlot(item, p.slot as ModSlot | undefined),

  slots_full: (item, p) => !hasOpenSlot(item, p.slot as ModSlot | undefined),

  // Declared, not allocated: "is this the kind of item that has an offence
  // slot" is a question about the base. A Rough item has no openings at all,
  // and answering "no such slot" there would be a lie about what it is.
  has_slot_type: (item, p) => declaredCapacity(item, p.slot) > 0,

  fill_state: (item, p) => (p.any as string[]).includes(fillState(item)),

  mod_count: (item, p) => {
    const n = p.slot ? slotUsed(item, p.slot) : item.mods.length;
    if (p.min !== undefined && n < p.min) return false;
    if (p.max !== undefined && n > p.max) return false;
    return true;
  },

  has_mod_tag: (item, p) => item.mods.some((m) => m.tags.includes(p.tag)),

  has_item_tag: (item, p) => item.tags.includes(p.tag),

  ilvl_at_least: (item, p) => item.ilvl >= p.value,

  not_corrupted: (item) => item.meta.corrupted !== true,

  /** Item is at exactly one of these qualities. */
  quality_is: (item, p) => (p.any as string[]).includes(qualityOf(item)),

  /** Item is at this quality or better. */
  quality_at_least: (item, p) =>
    qualityRank(qualityOf(item)) >= qualityRank(p.value),

  /** Item is below this quality — the gate on every step-up currency. */
  quality_below: (item, p) => qualityRank(qualityOf(item)) < qualityRank(p.value),
};

const CONDITION_MESSAGES: Record<string, string> = {
  not_corrupted: 'item is corrupted',
  has_open_slot: 'no open slot',
  slots_full: 'slots are not yet full',
  has_slot_type: 'item has no such slot',
  mod_count: 'wrong number of modifiers',
  fill_state: 'wrong fill state',
  quality_is: 'wrong quality',
  quality_at_least: 'the item is not refined enough',
  quality_below: 'the item is already that refined',
};

export function checkConditions(item: Item, conds: Condition[] = []): string | null {
  // Corruption first so it always wins the error message — it's the reason
  // the player actually cares about.
  const ordered = [...conds].sort(
    (a, b) => (a.kind === 'not_corrupted' ? -1 : 0) - (b.kind === 'not_corrupted' ? -1 : 0)
  );

  for (const c of ordered) {
    const impl = CONDITIONS[c.kind];
    if (!impl) return `unknown condition '${c.kind}'`;
    if (!impl(item, c)) {
      return c.fail ?? CONDITION_MESSAGES[c.kind] ?? `condition '${c.kind}' not met`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Effect registry
//
// THIS is the extension point. A new currency is normally just a new data
// entry composing these. You only write code here when you invent a genuinely
// new *kind* of mutation.
// ---------------------------------------------------------------------------

export type EffectImpl = (ctx: CraftContext, params: any) => boolean;

function matching(mods: RolledMod[], p: any): RolledMod[] {
  return mods.filter((m) => {
    if (p.tag && !m.tags.includes(p.tag)) return false;
    if (p.slot && m.slot !== p.slot) return false;
    if (p.defId && m.defId !== p.defId) return false;
    return true;
  });
}

export const EFFECTS: Record<string, EffectImpl> = {
  /** Add one or more random mods. Optionally constrained by tag or slot. */
  add_mod: (ctx, p) => {
    const count = p.count ?? 1;
    let added = 0;
    for (let i = 0; i < count; i++) {
      const mod = rollRandomMod(ctx.item, ctx.pool, ctx.rng, {
        slot: p.slot,
        tag: p.tag,
      });
      if (!mod) break;
      ctx.item.mods.push(mod);
      ctx.log.push(`+ ${describeMod(mod)}`);
      added++;
    }
    return added > 0;
  },

  /** Remove mods at random from the matching set. */
  remove_mod: (ctx, p) => {
    const count = p.count ?? 1;
    let removed = 0;
    for (let i = 0; i < count; i++) {
      const pool = matching(ctx.item.mods, p);
      const victim = ctx.rng.pick(pool);
      if (!victim) break;
      ctx.item.mods.splice(ctx.item.mods.indexOf(victim), 1);
      ctx.log.push(`- ${describeMod(victim)}`);
      removed++;
    }
    return removed > 0;
  },

  /**
   * Coin-flip: empower or diminish every matching mod's values at once.
   * Unlike reroll_values this doesn't touch the authored ranges — it scales
   * whatever is already there, so a well-rolled item has more to lose. That
   * asymmetry is the whole point of pairing it with a lock.
   */
  scale_values: (ctx, p) => {
    const targets = matching(ctx.item.mods, p);
    if (targets.length === 0) return false;

    const magnitude = p.magnitude ?? 0.25;
    const up = ctx.rng.chance(p.upChance ?? 0.5);
    const factor = up ? 1 + magnitude : 1 - magnitude;

    for (const mod of targets) {
      mod.stats = mod.stats.map((s) => ({ ...s, value: scaleValue(s.value, factor) }));
    }

    ctx.log.push(
      `${up ? 'empowered' : 'diminished'} ${targets.length} mod(s) by ` +
        `${Math.round(magnitude * 100)}%`
    );
    return true;
  },

  /** Re-roll the numeric values of existing mods, keeping which mods they are. */
  reroll_values: (ctx, p) => {
    const targets = matching(ctx.item.mods, p);
    if (targets.length === 0) return false;
    for (const mod of targets) {
      const entry = ctx.pool.entries.find((e) => e.id === mod.entryId);
      if (entry) mod.stats = rollValues(entry, ctx.rng);
    }
    ctx.log.push(`re-rolled values on ${targets.length} mod(s)`);
    return true;
  },

  /** Wipe all mods and roll a fresh set of the same size. */
  reroll_mods: (ctx, p) => {
    const had = ctx.item.mods.length;
    if (had === 0) return false;
    ctx.item.mods = [];
    // Re-roll to the same count it had, not to capacity — a re-roll shouldn't
    // secretly be an upgrade.
    fillAll(ctx, p?.slot, had);
    ctx.log.push('re-rolled all modifiers');
    return true;
  },

  clear_mods: (ctx) => {
    if (ctx.item.mods.length === 0) return false;
    ctx.item.mods = [];
    ctx.log.push('stripped all modifiers');
    return true;
  },

  /** Fill every empty slot on the item. */
  fill_slots: (ctx, p) => {
    const before = ctx.item.mods.length;
    fillAll(ctx, p?.slot);
    return ctx.item.mods.length > before;
  },

  /** Grant a bonus slot beyond what the base declares. */
  add_slot: (ctx, p) => {
    const slot: ModSlot = p.slot ?? slotTypes(ctx.item)[0];
    if (!slot) return false;
    ctx.item.meta.bonusSlots ??= {};
    ctx.item.meta.bonusSlots[slot] =
      (ctx.item.meta.bonusSlots[slot] ?? 0) + (p.count ?? 1);
    ctx.log.push(`+${p.count ?? 1} ${slot} slot`);
    return true;
  },

  /** Upgrade a matching mod to a better tier of the same family. */
  upgrade_mod_tier: (ctx, p) => {
    const pool = matching(ctx.item.mods, p).filter((m) => m.tier > 1);
    const target = ctx.rng.pick(pool);
    if (!target) return false;
    const better = ctx.pool.entries.find(
      (e) => e.defId === target.defId && e.tier === target.tier - 1
    );
    if (!better || better.ilvl > ctx.item.ilvl) return false;
    const idx = ctx.item.mods.indexOf(target);
    ctx.item.mods[idx] = instantiate(better, ctx.rng);
    ctx.log.push(`^ ${describeMod(ctx.item.mods[idx])}`);
    return true;
  },

  /** Irreversibly lock the item. Demonstrates a meta-flag effect. */
  corrupt: (ctx) => {
    ctx.item.meta.corrupted = true;
    ctx.log.push('item is now corrupted');
    return true;
  },

  /**
   * Raise the item's quality, optionally filling it to a mod count.
   *
   * One effect covers the whole step-up ladder because the interesting part
   * is always the same shape: a Rough piece becomes Seamed with one mod, a
   * Seamed piece becomes Faceted keeping what it had. Only ever upward —
   * a currency that could quietly downgrade an item would delete mods as a
   * side effect of a name that didn't say so.
   */
  set_quality: (ctx, p) => {
    const to = p.to as string;
    if (qualityRank(qualityOf(ctx.item)) >= qualityRank(to as never)) return false;
    if (!QUALITIES.some((q) => q.id === to)) return false;

    ctx.item.meta.quality = to;
    ctx.log.push(`now ${qualityName(to as never)}`);

    // `fill` is a TARGET count, not an addition: the same currency used on a
    // Rough item and on a Seamed one should land on the same shape.
    if (p.fill !== undefined) {
      const target = Math.min(p.fill as number, modCapacity(ctx.item));
      fillAll(ctx, undefined, target);
    }
    return true;
  },

  set_meta: (ctx, p) => {
    ctx.item.meta[p.key] = p.value;
    ctx.log.push(`${p.key} = ${String(p.value)}`);
    return true;
  },
};

/**
 * Scales one rolled value, preserving the int/float shape rollValues produced.
 * A diminish that rounded to zero would silently delete a stat line, so the
 * magnitude is clamped to leave at least 1 behind.
 */
function scaleValue(value: number, factor: number): number {
  const scaled = value * factor;
  if (!Number.isInteger(value)) return Number(scaled.toFixed(2));
  const rounded = Math.round(scaled);
  if (rounded === 0 && value !== 0) return value < 0 ? -1 : 1;
  return rounded;
}

/** Rolls mods until slots are full, or until `limit` mods have been added. */
function fillAll(ctx: CraftContext, slot?: ModSlot, limit = Infinity): void {
  let guard = 32;
  while (ctx.item.mods.length < limit && guard-- > 0) {
    const mod = rollRandomMod(ctx.item, ctx.pool, ctx.rng, { slot });
    if (!mod) break;
    ctx.item.mods.push(mod);
    ctx.log.push(`+ ${describeMod(mod)}`);
  }
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export function canApply(item: Item, currency: CurrencyDef): string | null {
  const t = currency.targets;
  if (t.kinds && !t.kinds.includes(item.kind)) {
    return `${currency.name} cannot be used on ${item.kind}`;
  }
  if (t.slots && !t.slots.some((s) => declaredCapacity(item, s) > 0)) {
    return `${currency.name} requires a ${t.slots.join(' or ')} slot`;
  }
  if (t.tags && !t.tags.every((tag) => item.tags.includes(tag))) {
    return `${currency.name} requires ${t.tags.join(', ')}`;
  }
  // Corruption is not special-cased: currencies declare `not_corrupted` in
  // their requires. Keeping it data-driven means a future currency that
  // *can* touch corrupted items just omits the condition.
  return checkConditions(item, currency.requires);
}

/**
 * Deep clone. Hand-rolled rather than structuredClone because that's missing
 * on older Safari and some mobile browsers, and this runs client-side.
 */
export function clone(item: Item): Item {
  return {
    ...item,
    tags: [...item.tags],
    slots: { ...item.slots },
    mods: item.mods.map((m) => ({
      ...m,
      tags: [...m.tags],
      stats: m.stats.map((s) => ({ ...s, tags: [...s.tags] })),
    })),
    // Carried through untouched. No effect in the registry reads or writes
    // implicits, which is exactly why they survive every craft.
    implicits: item.implicits.map((m) => ({
      ...m,
      tags: [...m.tags],
      stats: m.stats.map((s) => ({ ...s, tags: [...s.tags] })),
    })),
    meta: JSON.parse(JSON.stringify(item.meta ?? {})),
  };
}

/**
 * Apply a currency. Pure: returns a NEW item, leaves the input untouched.
 * Failures roll back entirely, which makes preview/undo trivial in the UI.
 */
export function craft(
  item: Item,
  currency: CurrencyDef,
  pool: ModPool,
  rng: Rng
): CraftResult {
  const blocked = canApply(item, currency);
  if (blocked) return { ok: false, item, log: [], error: blocked };

  const ctx: CraftContext = { item: clone(item), pool, rng, log: [] };

  for (const effect of currency.effects) {
    const impl = EFFECTS[effect.kind];
    if (!impl) {
      return { ok: false, item, log: [], error: `unknown effect '${effect.kind}'` };
    }
    const worked = impl(ctx, effect);
    if (!worked && effect.optional !== true) {
      return {
        ok: false,
        item,
        log: [],
        error: `${currency.name} had no effect`,
      };
    }
  }

  return { ok: true, item: ctx.item, log: ctx.log };
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

export function describeMod(mod: RolledMod): string {
  const lines = mod.stats.map(describeStatLine).join(', ');
  // An implicit has no tier to compare against and no name worth printing, and
  // every caller already marks it as the base. "(T0 Base)" is noise twice over.
  if (mod.slot === 'implicit') return lines;
  return `${lines}  (T${mod.tier} ${mod.name})`;
}

/**
 * One line per stat, for somewhere with room. Three stats on one wrapped line
 * is a paragraph you have to parse; the continuations are indented so a
 * two-stat modifier still reads as one modifier.
 */
export function describeModLines(mod: RolledMod): string[] {
  const tag = mod.slot === 'implicit' ? '  (base)' : `  (T${mod.tier} ${mod.name})`;
  return mod.stats.map((s, i) =>
    i === 0 ? `${describeStatLine(s)}${tag}` : `  ${describeStatLine(s)}`
  );
}

export function describeItem(item: Item): string {
  const head = `${item.name} [${fillState(item)}] ilvl ${item.ilvl}${
    item.meta.corrupted ? ' (corrupted)' : ''
  }`;
  // Only the types this item currently has room in. A Rough item lists none,
  // which is the truth about it.
  const caps =
    slotTypes(item)
      .filter((t) => slotCapacity(item, t) > 0)
      .map((t) => `${slotUsed(item, t)}/${slotCapacity(item, t)} ${t}`)
      .join(', ') || 'no open slots';

  // Group the mod list by slot so the item reads the way it's structured.
  const body = slotTypes(item)
    .flatMap((t) => {
      const mods = item.mods.filter((m) => m.slot === t);
      if (mods.length === 0) return [];
      const label = slotTypes(item).length > 1 ? `   ${t}:` : null;
      return [
        ...(label ? [label] : []),
        ...mods.map((m) => `   ${label ? '  ' : ''}${describeMod(m)}`),
      ];
    })
    .join('\n');

  return `${head}\n   ${caps}\n${body || '   (no modifiers)'}`;
}
