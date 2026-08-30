/**
 * The trials web: the fourth thing walked through `webgraph.ts`, and the only
 * one whose points are not bought by a level. It is funded by things DONE, and
 * nothing at all until the campaign is whole.
 */
import { CAMPAIGN_REWARD, LADDER, TRIALS, TRIAL_POINTS } from './data';
import { buildTrials } from './trials/layout';
import { TRIAL_WEB } from './trials/web';
import { canAllocateIn, canDeallocateIn, neighboursIn, replayWeb } from './webgraph';
import type { SkillNodeDef } from './trees/node';

export type { BuiltTrials, TrialSpec, TrialWheel } from './trials/spec';

export const TRIALS_WEB = buildTrials(TRIAL_WEB);

export const trialNodes = (): SkillNodeDef[] => TRIALS_WEB.nodes;

export const trialNodeById = (nodeId: string): SkillNodeDef | undefined =>
  TRIALS_WEB.nodes.find((n) => n.id === nodeId);

export const trialRegionOf = (nodeId: string): string | undefined => TRIALS_WEB.regionOf[nodeId];

/** TRIALS AND RUNGS, never a level. A trial pays a handful; a rung pays one,
 *  and the FISSURE pays nothing at all — the first zone is the climb being
 *  learnt, not a second web being filled in. */
/** NOTHING UNTIL THE CAMPAIGN IS WHOLE, which then pays the first
 *  `CAMPAIGN_REWARD.points`; the rest is earned by grinding. */
export const trialPointsFor = (
  done: readonly string[],
  climbed: Record<string, number> = {}
): number => {
  const whole = LADDER.zones.every((zone) => (climbed[zone.id] ?? 0) >= zone.rungs);
  if (!whole) return 0;
  return CAMPAIGN_REWARD.points + done.length * TRIAL_POINTS.perTrial;
};

export const TRIAL_POINTS_MAX = // every trial, and every rung that pays for one
  TRIALS.length * TRIAL_POINTS.perTrial +
  LADDER.zones.reduce(
    (n, z, i) => (i <= TRIAL_POINTS.freeZone ? n : n + z.rungs * TRIAL_POINTS.perRung),
    0
  );

export const neighboursOfTrial = (nodeId: string): Set<string> =>
  neighboursIn(trialNodes(), nodeId);

export const canAllocateTrial = (nodeId: string, allocated: readonly string[]): boolean =>
  canAllocateIn(trialNodes(), nodeId, allocated);

export const canDeallocateTrial = (nodeId: string, allocated: readonly string[]): boolean =>
  canDeallocateIn(trialNodes(), nodeId, allocated);

/** What survives a replay against the points the trials done actually granted. */
export const replayTrialNodes = (wanted: readonly string[], cap: number): string[] =>
  replayWeb(trialNodes(), wanted, cap);
