/**
 * THE BENCH, and it SELECTS. A modifier is chosen off a list, paid for in its
 * own family's shard, and rolls only its VALUE, inside a window the crafting
 * level narrows. That level buys how many lines one piece may have chosen and
 * how good a TIER a choice may reach. The one roll left is the CRYSTAL's,
 * because choosing a rule would buy the cheapest danger for the best payment.
 */
import { Rng } from './rng';
import {
  GEAR_BASE_BY_ID,
  MOD_BY_ID,
  planFor,
  planName,
  SELECT,
  SHARDS,
  SHARD_BY_ID,
  shardCost,
  shardFor,
} from './data';
import { describeStatLine } from './mod-text';
import {
  ModPool,
  fillState,
  hasOpenSlot,
  instantiate,
  qualityWindow,
  rollRandomMod,
  slotCapacity,
  slotTypes,
  slotUsed,
} from './mods';
import type { CraftResult, Item, ModEntry, RolledMod } from './types';

/** Deep clone. Hand-rolled: structuredClone is missing on older Safari. */
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
    implicits: item.implicits.map((m) => ({
      ...m,
      tags: [...m.tags],
      stats: m.stats.map((s) => ({ ...s, tags: [...s.tags] })),
    })),
    meta: JSON.parse(JSON.stringify(item.meta ?? {})),
  };
}

// ---------------------------------------------------------------------------
// What a level buys
// ---------------------------------------------------------------------------

/** Lines on ONE piece this level may choose. Zero makes bases alone. */
export const linesAllowed = (level: number): number =>
  SELECT.linesAt.filter((at) => level >= at).length;

/** Derived: a stored count can disagree with the lines it counts. */
export const chosenLines = (item: Item): number =>
  item.mods.filter((m) => m.chosen).length;

/** A tier's RANK from the WORST up, so three tiers is dearer at the top. */
export const tierRank = (entry: { defId: string; tier: number }): number =>
  (MOD_BY_ID[entry.defId]?.tiers.length ?? entry.tier) - entry.tier;

/** What one choice costs: a shard family, and how many of it. */
export function costOf(entry: { defId: string; tier: number }): {
  shard: string | null;
  n: number;
} {
  const def = MOD_BY_ID[entry.defId];
  return { shard: def ? shardFor(def) : null, n: shardCost(tierRank(entry)) };
}

/** Level a tier needs, by the same rank. */
export const levelFor = (entry: { defId: string; tier: number }): number =>
  SELECT.tierAt[Math.min(SELECT.tierAt.length - 1, tierRank(entry))] ?? 1;

/** Every modifier this piece could still take: `eligible` has already refused
 *  what the item level, the slot table and the groups refuse. */
export const choices = (item: Item, pool: ModPool): ModEntry[] =>
  pool.eligible(item).filter((e) => shardFor(MOD_BY_ID[e.defId] ?? {}) !== null);

/** Why this choice cannot be made, or null. Said in NUMBERS: the level you are
 *  against the level it wants, the shards you hold against what it costs. */
export function whyNotChoose(
  item: Item,
  entry: ModEntry,
  level: number,
  held: (shard: string) => number,
  plans: string[] = []
): string | null {
  if (item.kind !== 'gear') return 'Only gear takes a chosen line.';
  if (!hasOpenSlot(item, entry.slot)) return `No open ${entry.slot} slot.`;
  // One line a GROUP: two rungs of the same modifier is the ladder said twice.
  if (item.mods.some((m) => m.group === entry.group)) {
    return `${entry.name} is already on it.`;
  }
  const allowed = linesAllowed(level);
  if (allowed === 0) return `Level ${SELECT.linesAt[0]} needed to choose a line, you are ${level}.`;
  if (chosenLines(item) >= allowed) {
    const next = SELECT.linesAt[allowed];
    return next === undefined
      ? `${allowed} chosen lines is the most any piece holds.`
      : `Level ${next} needed for chosen line ${allowed + 1}, you are ${level}.`;
  }
  // THE THIRD GATE, and the only one nothing you own can buy: a plan is found.
  const plan = planFor(entry.defId);
  if (plan && !plans.includes(plan.id)) return `${planName(plan)} needed.`;
  const want = levelFor(entry);
  if (level < want) return `Level ${want} needed for tier ${entry.tier}, you are ${level}.`;
  const { shard, n } = costOf(entry);
  if (!shard) return 'Nothing buys this line.';
  if (held(shard) < n) {
    return `${n} ${SHARD_BY_ID[shard]?.name ?? shard} needed, you hold ${held(shard)}.`;
  }
  return null;
}

/** PUT IT ON. Pure: a NEW item, the input untouched. The value rolls inside the
 *  level's own window and nothing else about the line is chance. */
export function chooseMod(item: Item, entry: ModEntry, level: number, rng: Rng): Item {
  const [low, high] = qualityWindow(level);
  const out = clone(item);
  const mod = instantiate(entry, rng, low + rng.next() * (high - low));
  mod.chosen = true;
  out.mods.push(mod);
  return out;
}

export function windowRange(entry: ModEntry, level: number, at = 0): [number, number] {
  const [low, high] = qualityWindow(level);
  const [lo, hi] = entry.stats[at]?.range ?? [0, 0];
  const put = (share: number): number => {
    const v = lo + (hi - lo) * share;
    return Number.isInteger(lo) && Number.isInteger(hi) ? Math.round(v) : Number(v.toFixed(2));
  };
  return [put(low), put(high)];
}

// ---------------------------------------------------------------------------
// The crystal's own roll
// ---------------------------------------------------------------------------

/** `meta.scripted` names a family, and the next rule added is that family's
 *  cheapest tier. On the ITEM, never on the currency: a shard that behaved
 *  differently for one crystal is a tooltip lying. */
function scriptedMod(item: Item, pool: ModPool, rng: Rng): RolledMod | null {
  const want = item.meta.scripted;
  if (typeof want !== 'string') return null;
  delete item.meta.scripted;
  const tiers = pool.entries.filter((e) => e.defId === want);
  const entry = tiers[tiers.length - 1];
  return entry ? instantiate(entry, rng) : null;
}

/** One random rule into an open socket. */
export function rollCrystal(item: Item, pool: ModPool, rng: Rng): CraftResult {
  if (item.kind !== 'crystal') {
    return { ok: false, item, log: [], error: 'A Shard of Making only reaches a crystal.' };
  }
  if (!hasOpenSlot(item)) return { ok: false, item, log: [], error: 'No open slot.' };
  const out = clone(item);
  const mod = scriptedMod(out, pool, rng) ?? rollRandomMod(out, pool, rng);
  if (!mod) return { ok: false, item, log: [], error: 'Nothing can roll here.' };
  out.mods.push(mod);
  return { ok: true, item: out, log: [`+ ${describeMod(mod)}`] };
}

// ---------------------------------------------------------------------------
// Taking one apart
// ---------------------------------------------------------------------------

/**
 * SHARDS A PIECE IS WORTH, by family. *"If it has +strength and +attack speed
 * you can get a +attribute and +speed currency, and more of them based on the
 * tier of the mods."* Never the whole cost, or the bench prints.
 */
export function dismantleShards(item: Item): Record<string, number> {
  const out: Record<string, number> = {};
  if (item.kind !== 'gear') return out;
  for (const mod of item.mods) {
    const { shard, n } = costOf(mod);
    const back = Math.floor(n * SHARDS.refund);
    if (!shard || back <= 0) continue;
    out[shard] = (out[shard] ?? 0) + back;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

export function describeMod(mod: RolledMod): string {
  const lines = mod.stats.map(describeStatLine).join(', ');
  // An implicit has no tier and every caller already marks it as the base.
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
  // The KIND and the FAMILY too: a base is called a Helm and nobody types that.
  const parts = [item.name, base?.name ?? '', base?.kind ?? '', base?.family ?? ''];
  for (const mod of [...item.implicits, ...item.mods]) parts.push(describeMod(mod));
  return parts.join(' \n ').toLowerCase().includes(want);
}

export function describeItem(item: Item): string {
  const head = `${item.name} [${fillState(item)}] ilvl ${item.ilvl}`;
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
