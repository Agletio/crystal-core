/**
 * The trials web: the fourth thing walked through `webgraph.ts`, and the only
 * one whose points are not bought by a level.
 */
import { CAMPAIGN_REWARD, GRINDS, TALLIES } from './data';
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
 *  HANDOVER and not on the climb, so the Tallies arrive in his hands beside the
 *  crystal; every one after them is ground out of the Ledger. */
export const trialPointsFor = (character: Character): number => {
  if (!character.paidCampaign) return 0;
  const counts = character.grinds ?? {};
  const ground = GRINDS.reduce(
    (n, g) => n + ((Number(counts[g.counter]) || 0) >= g.need ? g.pays : 0),
    0
  );
  return CAMPAIGN_REWARD.points + ground;
};

/** EVERY TALLY THERE IS: the campaign's, and the whole Ledger ground out. */
export const TRIAL_POINTS_MAX = CAMPAIGN_REWARD.points + GRINDS.reduce((n, g) => n + g.pays, 0);

/** What the web is SIZED for. `TRIAL_POINTS_MAX` has to come to this, or the
 *  Reckoning is built for a budget nothing can pay — the demo holds it. */
export const TALLY_CAP = TALLIES.max;

export const neighboursOfTrial = (nodeId: string): Set<string> =>
  neighboursIn(trialNodes(), nodeId);

export const canAllocateTrial = (nodeId: string, allocated: readonly string[]): boolean =>
  canAllocateIn(trialNodes(), nodeId, allocated);

export const canDeallocateTrial = (nodeId: string, allocated: readonly string[]): boolean =>
  canDeallocateIn(trialNodes(), nodeId, allocated);

/** What survives a replay against the points the trials done actually granted. */
export const replayTrialNodes = (wanted: readonly string[], cap: number): string[] =>
  replayWeb(trialNodes(), wanted, cap);
