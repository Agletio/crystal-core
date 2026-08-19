/**
 * The trials web: the fourth thing walked through `webgraph.ts`, and the only
 * one whose points are not bought by a level. A skill tree is funded by that
 * skill's level and a trade by the character's; this is funded by TRIALS —
 * things done once, in order — so its points cannot be ground for. What it
 * spends them on is the bargain a crystal makes, in the same arithmetic.
 */
import { TRIALS } from './data';
import { buildTrials } from './trials/layout';
import { TRIAL_WEB } from './trials/web';
import { canAllocateIn, canDeallocateIn, neighboursIn, replayWeb } from './webgraph';
import type { SkillNodeDef } from './trees/node';

export type { BuiltTrials, TrialArm, TrialSpec } from './trials/spec';

export const TRIALS_WEB = buildTrials(TRIAL_WEB);

export const trialNodes = (): SkillNodeDef[] => TRIALS_WEB.nodes;

export const trialNodeById = (nodeId: string): SkillNodeDef | undefined =>
  TRIALS_WEB.nodes.find((n) => n.id === nodeId);

export const trialArmOf = (nodeId: string): string | undefined => TRIALS_WEB.armOf[nodeId];

/** One point per trial done, and that is the whole budget. Never a level. */
export const trialPointsFor = (done: readonly string[]): number => done.length;

export const TRIAL_POINTS_MAX = TRIALS.length; // every trial there will ever be

export const neighboursOfTrial = (nodeId: string): Set<string> =>
  neighboursIn(trialNodes(), nodeId);

export const canAllocateTrial = (nodeId: string, allocated: readonly string[]): boolean =>
  canAllocateIn(trialNodes(), nodeId, allocated);

export const canDeallocateTrial = (nodeId: string, allocated: readonly string[]): boolean =>
  canDeallocateIn(trialNodes(), nodeId, allocated);

/** What survives a replay against the points the trials done actually granted. */
export const replayTrialNodes = (wanted: readonly string[], cap: number): string[] =>
  replayWeb(trialNodes(), wanted, cap);
