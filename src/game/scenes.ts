/**
 * The schedule: what happens at the end of THIS clear. `src/game/crystals.ts`
 * is the same shape for gifts, and this asks it rather than replacing it.
 *
 * At most ONE scene per cleared descent, highest rung first and never rolled.
 * Everything else keeps waiting for the clear after, because four schedules
 * that can interleave is four schedules nobody can read off a screen.
 */
import { LAMPWRIGHT } from '../data';
import { SCENE_BY_ID } from '../scenes';
import type { SceneDef } from '../scenes';
import { giftWaiting } from './crystals';
import type { QuestFacts, Waiting } from './crystals';
import type { GameState } from './state';

/** A room, and what the person in it is holding. */
export interface SceneCall {
  def: SceneDef;
  gift: Waiting | null; // null once a scene exists that hands nothing over
}

export function sceneWaiting(game: GameState, clear: QuestFacts): SceneCall | null {
  // Rung 1. The Lampwright's own schedule is `giftWaiting`'s and moves nowhere.
  const gift = giftWaiting(game, clear);
  const workshop = SCENE_BY_ID[LAMPWRIGHT.scene];
  if (gift && workshop) return { def: workshop, gift };
  return null;
}
