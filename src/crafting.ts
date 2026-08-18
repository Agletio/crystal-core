import { Rng } from './rng';
import { GEAR_BASE_BY_ID } from './data';
import { describeStatLine } from './mod-text';
import {
  ModPool,
  fillState,
  hasOpenSlot,
  instantiate,
  rollRandomMod,
  rollValues,
  declaredCapacity,
  slotCapacity,
  slotTypes,
  slotUsed,
} from './mods';
import type {
  Condition,
  CraftResult,
  CurrencyDef,
  Item,
  ModSlot,
  RolledMod,
} from './types';

export interface CraftContext {
  item: Item; // mutable draft — the engine clones before handing it over
  pool: ModPool;
  rng: Rng;
  log: string[];
  /** entryId the player picked, for the one currency that lets them pick. */
  chosen?: string;
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

  // Declared, not allocated: whether the BASE has this kind of slot at all.
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
};

const CONDITION_MESSAGES: Record<string, string> = {
  not_corrupted: 'item is corrupted',
  has_open_slot: 'no open slot',
  slots_full: 'slots are not yet full',
  has_slot_type: 'item has no such slot',
  mod_count: 'wrong number of modifiers',
  fill_state: 'wrong fill state',
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

/**
 * The one arranged roll: `meta.scripted` names a family, and the next modifier
 * added is that family's cheapest tier — authored best-first, so the last entry
 * is the bottom. Cleared as it fires. On the ITEM, never on the currency: a
 * Shard of Making that behaved differently for one crystal is a tooltip lying.
 */
function scriptedMod(ctx: CraftContext): RolledMod | null {
  const want = ctx.item.meta.scripted;
  if (typeof want !== 'string') return null;
  delete ctx.item.meta.scripted;
  const tiers = ctx.pool.entries.filter((e) => e.defId === want);
  const entry = tiers[tiers.length - 1];
  return entry ? instantiate(entry, ctx.rng) : null;
}

export const EFFECTS: Record<string, EffectImpl> = {
  /** Add one or more random mods. Optionally constrained by tag or slot. */
  add_mod: (ctx, p) => {
    const count = p.count ?? 1;
    let added = 0;
    for (let i = 0; i < count; i++) {
      const mod = scriptedMod(ctx) ?? rollRandomMod(ctx.item, ctx.pool, ctx.rng, {
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

  /**
   * Remove mods from the matching set. Random, unless the currency is `chosen`
   * and the caller named one in `ctx.chosen` — the one piece of targeting on
   * the bench, and it is targeting what LEAVES rather than what arrives.
   *
   * A `chosen` currency with nothing named refuses rather than picking for you.
   */
  remove_mod: (ctx, p) => {
    const count = p.count ?? 1;
    let removed = 0;
    for (let i = 0; i < count; i++) {
      const pool = matching(ctx.item.mods, p);
      const named = p.chosen && i === 0
        ? pool.find((m) => m.entryId === ctx.chosen)
        : undefined;
      if (p.chosen && i === 0 && !named) return false;
      const victim = named ?? ctx.rng.pick(pool);
      if (!victim) break;
      ctx.item.mods.splice(ctx.item.mods.indexOf(victim), 1);
      ctx.log.push(`- ${describeMod(victim)}`);
      removed++;
    }
    return removed > 0;
  },

  /**
   * A coin flip with no take-back: one modifier PAST the item's capacity, or
   * one taken away at random. The upside is the only route to an over-full
   * item in the game, and it costs the same throw that can gut a finished one.
   *
   * The flip falls back to the other side rather than failing: a currency that
   * refuses on a full item, and refuses on an empty one, is a currency you
   * cannot read.
   */
  gamble_mod: (ctx, p) => {
    const grow = () => {
      const slot: ModSlot = ctx.rng.pick(slotTypes(ctx.item)) ?? slotTypes(ctx.item)[0];
      if (!slot) return false;
      const had = ctx.item.mods.length;
      ctx.item.meta.bonusSlots ??= {};
      ctx.item.meta.bonusSlots[slot] = (ctx.item.meta.bonusSlots[slot] ?? 0) + 1;
      if (EFFECTS.add_mod(ctx, { count: 1 }) && ctx.item.mods.length > had) return true;
      // Nothing could roll there. Hand the slot back rather than leaving a
      // permanent opening the item was never paid for.
      ctx.item.meta.bonusSlots[slot]--;
      return false;
    };
    const shrink = () => EFFECTS.remove_mod(ctx, { count: 1 });

    const up = ctx.rng.chance(p.upChance ?? 0.5);
    return up ? grow() || shrink() : shrink() || grow();
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

  /** Irreversibly lock the item. Every currency refuses one. */
  corrupt: (ctx) => {
    ctx.item.meta.corrupted = true;
    ctx.log.push('item is now corrupted');
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

/** True for the one currency that asks you which modifier, not the engine. */
export const isTargeted = (currency: CurrencyDef): boolean =>
  currency.effects.some((e) => e.chosen === true);

/** True for anything that leaves the item unable to be crafted again. */
export const locksItem = (currency: CurrencyDef): boolean =>
  currency.effects.some((e) => e.kind === 'corrupt');

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
  rng: Rng,
  chosen?: string
): CraftResult {
  const blocked = canApply(item, currency);
  if (blocked) return { ok: false, item, log: [], error: blocked };

  const ctx: CraftContext = { item: clone(item), pool, rng, log: [], chosen };

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

/** Everything a player could reasonably type: the piece's name, the base it is
 *  a version of, and every line printed on it. Substring and case-blind — a
 *  search box with a syntax is a search box nobody uses. */
export function itemMatches(item: Item, query: string): boolean {
  const want = query.trim().toLowerCase();
  if (want === '') return true;
  const base = GEAR_BASE_BY_ID[item.base];
  // The KIND and the FAMILY as well as the name, so "helmet" and "bulwark"
  // both find one — a base is called a Helm and nobody types that.
  const parts = [item.name, base?.name ?? '', base?.kind ?? '', base?.family ?? ''];
  for (const mod of [...item.implicits, ...item.mods]) parts.push(describeMod(mod));
  return parts.join(' \n ').toLowerCase().includes(want);
}

export function describeItem(item: Item): string {
  const head = `${item.name} [${fillState(item)}] ilvl ${item.ilvl}${
    item.meta.corrupted ? ' (corrupted)' : ''
  }`;
  // Only the types this item currently has room in.
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
