/**
 * Trades: the part of a character that is not the skill.
 *
 * A skill tree is per skill and funded by that skill's own level, so changing
 * skill throws the whole of what you were away. A trade is funded by CHARACTER
 * level and survives every skill you ever swap to, which is what makes keeping
 * a character worth anything.
 *
 * Every notable changes a RULE rather than handing out a percentage: a trade
 * that gave numbers would compete with the other on numbers, and one would win.
 */
import { LADDER, TRADE } from './data';
import type { Character } from './sim/character';
import { GRANT_BY_ID } from './sim/grants';
import type { TradeSpec } from './trades/spec';
import { buildTrade } from './trades/layout';
import { AETHERMANCER } from './trades/aethermancer';
import { ALCHEMIST } from './trades/alchemist';
import { WARRIOR_TRADE } from './trades/warrior';
import { ROGUE_TRADE } from './trades/rogue';
import { canAllocateIn, canDeallocateIn, neighboursIn, replayWeb } from './webgraph';
import { mergeGrants } from './sim/grants';
import type { BuiltTrade } from './trades/spec';
import type { SkillNodeDef } from './trees/node';

export type { BuiltTrade } from './trades/spec';

export const TRADES: BuiltTrade[] = [
  ALCHEMIST, AETHERMANCER, WARRIOR_TRADE, ROGUE_TRADE,
].map(buildTrade);

export const TRADE_BY_ID: Record<string, BuiltTrade> = Object.fromEntries(
  TRADES.map((t) => [t.spec.id, t])
);

export const tradeNodes = (tradeId: string | null | undefined): SkillNodeDef[] =>
  (tradeId && TRADE_BY_ID[tradeId]?.nodes) || [];

export const tradeNodeById = (
  tradeId: string | null | undefined,
  nodeId: string
): SkillNodeDef | undefined => tradeNodes(tradeId).find((n) => n.id === nodeId);

/** A STEP IS CLEARED at the campaign's own tier: the bare zone key, whatever
 *  the wall holds now, because every character walked that tier first. */
const stepCleared = (character: Character, step: { zone: string; rung: number }): boolean =>
  (character.climbed?.[step.zone] ?? 0) >= step.rung;

/** TWO AT A TIME, a pair for every step of the climb cleared. */
export const tradePointsFor = (character: Character): number =>
  Math.min(TRADE.maxPoints, TRADE.steps.filter((s) => stepCleared(character, s)).length * TRADE.pointsPerGrant);

/** The next depth that pays, by the zone's own name, or null once they all have. */
export const tradeNextAt = (character: Character): { zone: string; rung: number } | null => {
  const next = TRADE.steps.find((s) => !stepCleared(character, s));
  if (!next) return null;
  return { zone: LADDER.zones.find((z) => z.id === next.zone)?.name ?? next.zone, rung: next.rung };
};

/** THE HELD NODE THIS ONE CANNOT BE TAKEN WITH, and why, or null. */
export function tradeClash(
  tradeId: string,
  nodeId: string,
  allocated: readonly string[]
): { node: SkillNodeDef; why: string } | null {
  for (const clash of TRADE_BY_ID[tradeId]?.spec.clashes ?? []) {
    const other = clash.a === nodeId ? clash.b : clash.b === nodeId ? clash.a : null;
    if (!other || !allocated.includes(other)) continue;
    const node = tradeNodeById(tradeId, other);
    if (node) return { node, why: clash.why };
  }
  return null;
}

/** The one allocation with no click to undo it, so gold is what undoes it. */
export const respecCost = (level: number): number =>
  Math.max(TRADE.respecPerLevel, Math.round(level * TRADE.respecPerLevel));

export const neighboursOfTrade = (tradeId: string, nodeId: string): Set<string> =>
  neighboursIn(tradeNodes(tradeId), nodeId);

export const canAllocateTrade = (
  tradeId: string,
  nodeId: string,
  allocated: readonly string[]
): boolean =>
  canAllocateIn(tradeNodes(tradeId), nodeId, allocated) && tradeClash(tradeId, nodeId, allocated) === null;

export const canDeallocateTrade = (
  tradeId: string,
  nodeId: string,
  allocated: readonly string[]
): boolean => canDeallocateIn(tradeNodes(tradeId), nodeId, allocated);

/** What survives a replay against the points a level actually granted. */
export const replayTradeNodes = (
  tradeId: string,
  wanted: readonly string[],
  cap: number
): string[] =>
  replayWeb(tradeNodes(tradeId), wanted, cap, (id, kept) => tradeClash(tradeId, id, kept) === null);

/**
 * Every switch the trade hands over: its BASELINE first, then what has been
 * walked. One seam, so the free half reaches the sim, the sheet and every card
 * without a second path, and a summed grant a node also carries ADDS to the
 * baseline — the Aether Ward is a bigger version of the one you had.
 */
export function tradeGrants(
  tradeId: string | null | undefined,
  allocated: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const base = tradeId ? TRADE_BY_ID[tradeId]?.spec.baseline.grants : undefined;
  if (base) mergeGrants(out, base);
  for (const id of allocated) {
    const node = tradeNodeById(tradeId, id);
    if (node?.grants) mergeGrants(out, node.grants);
  }
  return out;
}

/** The baseline with every number in it: what the web's middle prints. */
export function baselineLines(spec: TradeSpec): string[] {
  const said = [...(spec.baseline.says ?? [])];
  for (const [key, value] of Object.entries(spec.baseline.grants ?? {})) {
    const line = GRANT_BY_ID[key]?.say?.(value);
    if (line) said.push(line);
  }
  return said;
}
