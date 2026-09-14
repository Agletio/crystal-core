/**
 * THE BENCH, and it SELECTS. Every line on a piece sits in a SOCKET of its own,
 * and every shard put into a socket adds INSTABILITY to it; past the socket's
 * cap it fractures, taking the line and the shards with it. A line goes in at
 * the WORST tier and is RAISED a tier at a time, each raise another roll of
 * instability, so how far a socket goes is what you stop at. The one roll
 * left besides that is the CRYSTAL's, because choosing a rule would buy the
 * cheapest danger for the best payment.
 */
import { Rng } from './rng';
import {
  GEAR_BASE_BY_ID,
  INSTABILITY,
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
  freeSocket,
  hasOpenSlot,
  instantiate,
  qualityWindow,
  rollRandomMod,
  slotCapacity,
  slotTypes,
  slotUsed,
  socketsOf,
} from './mods';
import type { CraftResult, Item, ModEntry, RolledMod, Socket } from './types';

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

/** WHAT ONE SHARD ADDS to a socket at this Jewelling level, a straight line
 *  from `addAt1` to `addAt99`, and `tierMore` on top for every rank climbed. */
export function addRange(level: number, rank = 0): [number, number] {
  const share = Math.max(0, Math.min(1, (level - 1) / 98));
  const at = (i: number) =>
    Math.round(INSTABILITY.addAt1[i] + (INSTABILITY.addAt99[i] - INSTABILITY.addAt1[i]) * share) +
    INSTABILITY.tierMore * rank;
  return [at(0), at(1)];
}

/** The entry one tier better than this line, or null at the top. */
export function nextTier(mod: RolledMod, pool: ModPool): ModEntry | null {
  return pool.entries.find((e) => e.defId === mod.defId && e.tier === mod.tier - 1) ?? null;
}

/** Every modifier this piece could still take, at the WORST tier only: a line
 *  starts at the bottom and is raised. `eligible` has already refused what the
 *  item level, the slot table and the groups refuse. */
export const choices = (item: Item, pool: ModPool): ModEntry[] =>
  pool.eligible(item).filter((e) => tierRank(e) === 0 && shardFor(MOD_BY_ID[e.defId] ?? {}) !== null);

/** Every line on the piece with a tier above it and a live socket under it. */
export const raises = (item: Item, pool: ModPool): Array<{ mod: RolledMod; entry: ModEntry }> =>
  item.mods.flatMap((mod) => {
    const entry = nextTier(mod, pool);
    const socket = socketsOf(item)[mod.socket ?? -1];
    return entry && socket && !socket.dead ? [{ mod, entry }] : [];
  });

/** The gates a raise and a placement share: the plan, the tier's level, the shards. */
function whyNotPay(
  entry: ModEntry,
  level: number,
  held: (shard: string) => number,
  plans: string[]
): string | null {
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

/** Why this line cannot go on, or null. Said in NUMBERS: the level you are
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
  if (freeSocket(item) < 0) return 'No socket left to take it.';
  return whyNotPay(entry, level, held, plans);
}

/** Why this line cannot be raised a tier, or null. */
export function whyNotRaise(
  item: Item,
  mod: RolledMod,
  level: number,
  held: (shard: string) => number,
  plans: string[] = [],
  pool: ModPool
): string | null {
  if (item.kind !== 'gear') return 'Only gear takes a chosen line.';
  const entry = nextTier(mod, pool);
  if (!entry) return `T${mod.tier} is the top of ${mod.name}.`;
  const socket = socketsOf(item)[mod.socket ?? -1];
  if (!socket || socket.dead) return 'Its socket is fractured.';
  // THE RUNG BUYS ITEM LEVEL, and item level is what a tier needs: a deep
  // drop is raised to the top where a shallow one stops a tier short.
  if (entry.ilvl > item.ilvl) return `Item level ${entry.ilvl} needed for tier ${entry.tier}, this is ${item.ilvl}.`;
  return whyNotPay(entry, level, held, plans);
}

/** What putting a line on a piece came to. `fractured` is the socket giving
 *  way: the line is off the piece and the shards are spent either way. */
export interface Placed {
  item: Item;
  socket: number;
  added: number;
  fractured: boolean;
}

/** One roll of instability into a socket, and the line it carries if it held. */
function wear(
  out: Item,
  at: number,
  entry: ModEntry,
  level: number,
  rng: Rng
): Placed {
  const [lo, hi] = addRange(level, tierRank(entry));
  const added = rng.int(lo, hi);
  const socket = socketsOf(out)[at];
  if (!socket) throw new Error(`${out.name} has no socket ${at}`);
  socket.wear += added;
  out.mods = out.mods.filter((m) => m.socket !== at);
  if (socket.wear > socket.cap) {
    socket.dead = true;
    socket.wear = socket.cap;
    return { item: out, socket: at, added, fractured: true };
  }
  const [low, high] = qualityWindow(level);
  const mod = instantiate(entry, rng, low + rng.next() * (high - low));
  mod.chosen = true;
  mod.socket = at;
  out.mods.push(mod);
  return { item: out, socket: at, added, fractured: false };
}

/** PUT IT ON, into the first free live socket. Pure: a NEW item, the input
 *  untouched. The value rolls inside the level's own window and the
 *  instability inside its own range, and nothing else about it is chance. */
export function placeMod(item: Item, entry: ModEntry, level: number, rng: Rng): Placed {
  const out = clone(item);
  return wear(out, freeSocket(out), entry, level, rng);
}

/** RAISE IT A TIER in the socket it sits in. */
export function raiseMod(item: Item, mod: RolledMod, level: number, rng: Rng, pool: ModPool): Placed {
  const out = clone(item);
  const entry = nextTier(mod, pool) as ModEntry;
  return wear(out, mod.socket ?? freeSocket(out), entry, level, rng);
}

/** The placed piece alone, for a caller that only wants the item. */
export const chooseMod = (item: Item, entry: ModEntry, level: number, rng: Rng): Item =>
  placeMod(item, entry, level, rng).item;

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

/** One socket as a card prints it: worn over cap, or fractured. */
export const describeSocket = (socket: Socket): string =>
  socket.dead ? `fractured ${socket.cap}` : `${socket.wear}/${socket.cap} instability`;

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
  const sockets = socketsOf(item).map(describeSocket).join(', ');

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

  return `${head}\n   ${caps}${sockets ? `\n   sockets ${sockets}` : ''}\n${body || '   (no modifiers)'}`;
}
