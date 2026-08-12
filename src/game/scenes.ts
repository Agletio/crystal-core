/**
 * The schedule: what happens at the end of THIS clear. `src/game/crystals.ts`
 * is the same shape for gifts and this ASKS it. At most ONE scene per cleared
 * descent, highest rung first and never rolled — schedules that interleave are
 * schedules nobody can read off a screen.
 */
import { INTRO, LAMPWRIGHT } from '../data';
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

/** What `given` records once a boss is DOWN, so a room happens once. Marked at
 *  the clear and not at the door: a room you died in comes back. */
export const bossGiven = (id: string): string => `boss:${id}`;

export function takeBoss(game: GameState, id: string): void {
  const mark = bossGiven(id);
  if (!(game.given ?? []).includes(mark)) game.given = [...(game.given ?? []), mark];
}

/** Rung 2 up, read off the game the way a gift is: a condition, never a roll. */
function scheduled(game: GameState): SceneDef[] {
  const out: SceneDef[] = [];
  const boss = SCENE_BY_ID[INTRO.bossScene];
  const socketed = Object.keys(game.sockets ?? {}).length;
  if (boss?.encounter && socketed >= INTRO.bossSockets) {
    if (!(game.given ?? []).includes(bossGiven(boss.encounter))) out.push(boss);
  }
  return out;
}

export function sceneWaiting(game: GameState, clear: QuestFacts): SceneCall | null {
  const gift = giftWaiting(game, clear); // rung 1, and his schedule moves nowhere
  const workshop = SCENE_BY_ID[LAMPWRIGHT.scene];
  if (gift && workshop) return { def: workshop, gift };

  const next = scheduled(game)[0];
  return next ? { def: next, gift: null } : null;
}
