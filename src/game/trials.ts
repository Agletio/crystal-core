/**
 * What a TRIAL asks, and when it is paid. `QUEST_CONDITIONS` is the same shape
 * and this mirrors it: a new objective is one registry entry and one `TRIALS`
 * row. Taken at the CLEAR, never at the door, exactly as a boss is.
 */
import { TRIALS, TRIAL_BY_ID } from '../data';
import { replayTrialNodes, trialNodeById, trialPointsFor } from '../trials';
import type { TrialDef } from '../data';
import type { QuestFacts } from './crystals';
import type { Character } from '../sim/character';
import type { GameState } from './state';

export type TrialConditionImpl = (
  game: GameState,
  facts: QuestFacts,
  params: any
) => boolean;

/** A kind not in here is never met; the demo holds the table to the registry. */
export const TRIAL_CONDITIONS: Record<string, TrialConditionImpl> = {
  boss: (game, _f, p) => (game.bosses ?? []).includes(String(p.boss)),

  sockets: (_g, f, p) => f.set.filled >= Number(p.value),

  danger: (_g, f, p) => f.set.rewards.danger >= Number(p.value),

  hoards: (_g, f, p) => (f.hoards ?? 0) >= Number(p.value),

  welled: (_g, f, p) => (f.welled ?? 0) >= Number(p.value),

  bearers: (_g, f, p) => (f.bearers ?? 0) >= Number(p.value),
};

export const trialMet = (trial: TrialDef, game: GameState, facts: QuestFacts): boolean =>
  trial.need.every((c) => TRIAL_CONDITIONS[c.kind]?.(game, facts, c) === true);

export const trialDone = (game: GameState, id: string): boolean =>
  (game.character.trials ?? []).includes(id);

/** Still open, in table order: the screen shows them as a ladder. */
export const openTrials = (game: GameState): TrialDef[] =>
  TRIALS.filter((t) => !trialDone(game, t.id));

/** IN PLACE, at the end of a clear; returns what was newly done, since a point
 *  earned in silence is a point nobody spends. EVERY open trial is asked, not
 *  just the next: the ladder is an order to read it in, never a gate. */
export function takeTrials(game: GameState, facts: QuestFacts): TrialDef[] {
  const won = openTrials(game).filter((t) => trialMet(t, game, facts));
  if (won.length === 0) return [];
  game.character.trials = [...(game.character.trials ?? []), ...won.map((t) => t.id)];
  return won;
}

/** A dead trial id costs its point, so the walk is replayed and not trusted.
 *  Returns what it refunded, the way every other replay reports itself. */
export function healTrials(character: Character): number {
  const held = Array.isArray(character.trials) ? character.trials : [];
  character.trials = held.filter((id) => TRIAL_BY_ID[id]);

  const wanted = (Array.isArray(character.trialAllocated) ? character.trialAllocated : []).filter(
    (id) => typeof id === 'string'
  );
  const kept = replayTrialNodes(wanted, trialPointsFor(character));
  character.trialAllocated = kept;

  // A choice on a node nobody walked, or an option that no longer exists, is a
  // stat line acting on a run off a node the player cannot see.
  const choices = character.trialChoices ?? {};
  for (const [nodeId, pick] of Object.entries(choices)) {
    const node = kept.includes(nodeId) ? trialNodeById(nodeId) : undefined;
    if (!node?.choices?.some((c) => c.id === pick)) delete choices[nodeId];
  }
  character.trialChoices = choices;

  return wanted.length - kept.length;
}
