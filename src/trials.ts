/**
 * The trials web: the fourth thing walked through `webgraph.ts`, and the only
 * one whose points are not bought by a level. A skill tree is funded by that
 * skill's level and a trade by the character's; this is funded by things DONE,
 * so its points cannot be ground for, and what it spends them on is the bargain
 * a crystal makes, in the same arithmetic.
 */
import { LADDER, TRIALS } from './data';
import { buildTrials } from './trials/layout';
import { TRIAL_WEB } from './trials/web';
import { canAllocateIn, canDeallocateIn, neighboursIn, replayWeb } from './webgraph';
import type { SkillNodeDef } from './trees/node';

export type { BuiltTrials, TrialBranch, TrialRegion, TrialSpec } from './trials/spec';

export const TRIALS_WEB = buildTrials(TRIAL_WEB);

export const trialNodes = (): SkillNodeDef[] => TRIALS_WEB.nodes;

export const trialNodeById = (nodeId: string): SkillNodeDef | undefined =>
  TRIALS_WEB.nodes.find((n) => n.id === nodeId);

export const trialRegionOf = (nodeId: string): string | undefined => TRIALS_WEB.regionOf[nodeId];

/** TRIALS AND RUNGS, never a level: both are things you DID, and together they
 *  make a hundred and fifty-six nodes a decision rather than a shopping list. */
export const trialPointsFor = (
  done: readonly string[],
  climbed: Record<string, number> = {}
): number =>
  done.length +
  LADDER.zones.reduce((n, zone) => n + Math.min(zone.rungs, climbed[zone.theme] ?? 0), 0);

export const TRIAL_POINTS_MAX = // every trial, and every rung there is to clear
  TRIALS.length + LADDER.zones.reduce((n, z) => n + z.rungs, 0);

export const neighboursOfTrial = (nodeId: string): Set<string> =>
  neighboursIn(trialNodes(), nodeId);

export const canAllocateTrial = (nodeId: string, allocated: readonly string[]): boolean =>
  canAllocateIn(trialNodes(), nodeId, allocated);

export const canDeallocateTrial = (nodeId: string, allocated: readonly string[]): boolean =>
  canDeallocateIn(trialNodes(), nodeId, allocated);

/** What survives a replay against the points the trials done actually granted. */
export const replayTrialNodes = (wanted: readonly string[], cap: number): string[] =>
  replayWeb(trialNodes(), wanted, cap);
