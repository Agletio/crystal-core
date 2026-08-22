/**
 * Trades: the part of a character that is not the skill.
 *
 * A skill tree is per skill and funded by that skill's own level, so changing
 * skill throws the whole of what you were away. A trade is funded by CHARACTER
 * level, out of its own budget, and it survives every skill you ever swap to —
 * which is what makes keeping a character worth anything.
 *
 * Every notable changes a RULE rather than handing out a percentage. That is
 * the whole reason two of them cannot be compared: a trade that gave numbers
 * would compete with the other on numbers, and one of them would win.
 */
import { TRADE } from './data';
import { buildTrade } from './trades/layout';
import { AETHERMANCER } from './trades/aethermancer';
import { ALCHEMIST } from './trades/alchemist';
import { canAllocateIn, canDeallocateIn, neighboursIn, replayWeb } from './webgraph';
import { mergeGrants } from './sim/grants';
import type { BuiltTrade } from './trades/spec';
import type { SkillNodeDef } from './trees/node';

export type { BuiltTrade } from './trades/spec';

export const TRADES: BuiltTrade[] = [ALCHEMIST, AETHERMANCER].map(buildTrade);

export const TRADE_BY_ID: Record<string, BuiltTrade> = Object.fromEntries(
  TRADES.map((t) => [t.spec.id, t])
);

export const tradeNodes = (tradeId: string | null | undefined): SkillNodeDef[] =>
  (tradeId && TRADE_BY_ID[tradeId]?.nodes) || [];

export const tradeNodeById = (
  tradeId: string | null | undefined,
  nodeId: string
): SkillNodeDef | undefined => tradeNodes(tradeId).find((n) => n.id === nodeId);

/** TWO AT A TIME, from `firstAt` — the level the trade itself is picked at. */
export const tradePointsFor = (level: number): number => {
  if (level < TRADE.firstAt) return 0;
  const grants = 1 + Math.floor((level - TRADE.firstAt) / TRADE.levelsPerGrant);
  return Math.min(TRADE.maxPoints, grants * TRADE.pointsPerGrant);
};

/** The level the next pair lands at, or null once they are all spent. */
export const tradeNextAt = (level: number): number | null => {
  if (tradePointsFor(level) >= TRADE.maxPoints) return null;
  if (level < TRADE.firstAt) return TRADE.firstAt;
  const done = Math.floor((level - TRADE.firstAt) / TRADE.levelsPerGrant);
  return TRADE.firstAt + (done + 1) * TRADE.levelsPerGrant;
};

/** What taking every attribute point back costs. The one allocation with no
 *  click to undo it, so gold is what undoes it. */
export const respecCost = (level: number): number =>
  Math.max(TRADE.respecPerLevel, Math.round(level * TRADE.respecPerLevel));

export const neighboursOfTrade = (tradeId: string, nodeId: string): Set<string> =>
  neighboursIn(tradeNodes(tradeId), nodeId);

export const canAllocateTrade = (
  tradeId: string,
  nodeId: string,
  allocated: readonly string[]
): boolean => canAllocateIn(tradeNodes(tradeId), nodeId, allocated);

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
): string[] => replayWeb(tradeNodes(tradeId), wanted, cap);

/** Every switch the walked trade hands over, merged by each grant's own rule. */
export function tradeGrants(
  tradeId: string | null | undefined,
  allocated: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const id of allocated) {
    const node = tradeNodeById(tradeId, id);
    if (node?.grants) mergeGrants(out, node.grants);
  }
  return out;
}
