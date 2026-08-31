/**
 * THE LEDGER: what one descent adds to each counter, and which lines of it that
 * count has paid for. A new grind is one registry entry and one `GRINDS` row —
 * the shape `TRIAL_CONDITIONS` had, asking how MANY rather than whether.
 * Counted at the CLEAR, never at the door, exactly as a boss is marked.
 */
import { GRINDS, GRIND_BY_ID } from '../data';
import { replayTrialNodes, trialNodeById, trialPointsFor } from '../trials';
import type { GrindDef } from '../data';
import type { QuestFacts } from './crystals';
import type { Character } from '../sim/character';
import type { RunState } from '../sim/run';
import type { Item } from '../types';
import type { GameState } from './state';

/** What one cleared descent adds. A counter nothing adds to never pays. */
export type GrindCount = (facts: QuestFacts) => number;

export const GRIND_COUNTERS: Record<string, GrindCount> = {
  descents: () => 1,

  hoards: (f) => f.hoards ?? 0,

  veins: (f) => f.veins ?? 0,

  welled: (f) => f.welled ?? 0,

  wardens: (f) => f.wardens ?? 0,

  bearers: (f) => f.bearers ?? 0,

  // INFLUENCE is the world the descent was actually run in, which is what a
  // crystal's family buys. The Fissure has no line: it is where you start.
  demonic: (f) => (f.set.theme === 'demonic' ? 1 : 0),

  prismatic: (f) => (f.set.theme === 'prismatic' ? 1 : 0),

  seam: (f) => (f.set.theme === 'seam' ? 1 : 0),
};

/** WHAT ONE CLEARED DESCENT ADDS, read off the run's own state and NOWHERE
 *  ELSE, so what a harness counts is what a clear counts. */
export function descentFacts(state: RunState, socketed: Item[] = []): QuestFacts {
  const opened = state.hoards.filter((h) => h.opened);
  return {
    set: state.set,
    elapsed: state.elapsed,
    socketed,
    hoards: opened.filter((h) => h.pays === 'gear').length,
    veins: opened.filter((h) => h.pays === 'currency').length,
    welled: state.welled,
    wardens: state.wardens,
    bearers: state.bearers,
  };
}

export const grindCount = (character: Character, counter: string): number =>
  Number(character.grinds?.[counter]) || 0;

export const grindDone = (character: Character, grind: GrindDef): boolean =>
  grindCount(character, grind.counter) >= grind.need;

/** Every line the counts have already paid for. */
export const grindsDone = (character: Character): GrindDef[] =>
  GRINDS.filter((g) => grindDone(character, g));

/** IN PLACE, at the end of a clear; returns what the count just finished, since
 *  a Tally earned in silence is a Tally nobody spends. */
export function takeGrinds(game: GameState, facts: QuestFacts): GrindDef[] {
  const character = game.character;
  const before = new Set(grindsDone(character).map((g) => g.id));
  const counts = { ...(character.grinds ?? {}) };
  for (const [counter, of] of Object.entries(GRIND_COUNTERS)) {
    const add = of(facts);
    if (add > 0) counts[counter] = (Number(counts[counter]) || 0) + add;
  }
  character.grinds = counts;
  return grindsDone(character).filter((g) => !before.has(g.id));
}

/** A dead counter costs whatever it paid, so the walk is replayed and not
 *  trusted. Returns what it refunded, the way every other replay reports. */
export function healTrials(character: Character): number {
  const held = character.grinds;
  const counts: Record<string, number> = {};
  if (held && typeof held === 'object') {
    for (const [counter, n] of Object.entries(held)) {
      // A counter no line of the Ledger reads is a number nothing can spend.
      if (GRIND_COUNTERS[counter] && Number.isFinite(Number(n))) {
        counts[counter] = Math.max(0, Math.floor(Number(n)));
      }
    }
  }
  character.grinds = counts;

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

export { GRIND_BY_ID };
