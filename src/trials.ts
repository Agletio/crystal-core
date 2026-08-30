/**
 * The trials web: the fourth thing walked through `webgraph.ts`, and the only
 * one whose points are not bought by a level.
 */
import { CAMPAIGN_REWARD, LADDER, TRIALS, TRIAL_POINTS } from './data';
import { buildTrials } from './trials/layout';
import { TRIAL_WEB } from './trials/web';
import { canAllocateIn, canDeallocateIn, neighboursIn, replayWeb } from './webgraph';
import type { Character } from './sim/character';
import type { SkillNodeDef } from './trees/node';

export type { BuiltTrials, TrialSpec, TrialWheel } from './trials/spec';

export const TRIALS_WEB = buildTrials(TRIAL_WEB);

export const trialNodes = (): SkillNodeDef[] => TRIALS_WEB.nodes;

export const trialNodeById = (nodeId: string): SkillNodeDef | undefined =>
  TRIALS_WEB.nodes.find((n) => n.id === nodeId);

export const trialRegionOf = (nodeId: string): string | undefined => TRIALS_WEB.regionOf[nodeId];

/** NOTHING UNTIL THE LAMPWRIGHT HANDS THE CAMPAIGN'S REWARD OVER. Gated on the
 *  HANDOVER and not on the climb, so the points arrive in his hands beside the
 *  crystal; the rest is earned by grinding. */
export const trialPointsFor = (character: Character): number => {
  if (!character.paidCampaign) return 0;
  return CAMPAIGN_REWARD.points + (character.trials?.length ?? 0) * TRIAL_POINTS.perTrial;
};

/** THE CEILING THE WEB IS SIZED FOR. `trialPointsFor` pays less; the shortfall
 *  is the grinds nobody has written, which have to sum to exactly this. */
export const TRIAL_POINTS_MAX =
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
