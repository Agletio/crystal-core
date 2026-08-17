/**
 * The schedule: what happens at the end of THIS clear. `src/game/crystals.ts`
 * is the same shape for gifts and this ASKS it. At most ONE scene per cleared
 * descent, highest rung first and never rolled — schedules that interleave are
 * schedules nobody can read off a screen.
 */
import { INTRO, LAMPWRIGHT } from '../data';
import { SCENES, SCENE_BY_ID } from '../scenes';
import type { SceneDef } from '../scenes';
import { giftWaiting } from './crystals';
import { relicFor } from './graft';
import type { QuestFacts, Waiting } from './crystals';
import type { GameState } from './state';

/** A room, and what the person in it is holding. */
export interface SceneCall {
  def: SceneDef;
  gift: Waiting | null; // null once a scene exists that hands nothing over
}

/** At the clear, never the door: a room you died in comes back. */
export function takeBoss(game: GameState, id: string): void {
  if (!(game.bosses ?? []).includes(id)) game.bosses = [...(game.bosses ?? []), id];
}

export const bossBeaten = (game: GameState, id: string): boolean =>
  (game.bosses ?? []).includes(id);

/** A key already handed over, as a `given` entry: a room owes its own until
 *  it has, which is rung 2's condition and never a roll. */
export const gaveKey = (id: string): string => `key:${id}`;

function scheduled(game: GameState): SceneDef[] {
  const out: SceneDef[] = [];
  const boss = SCENE_BY_ID[INTRO.bossScene];
  const socketed = Object.keys(game.sockets ?? {}).length;
  const owed = boss?.gives && !(game.given ?? []).includes(gaveKey(boss.gives));
  if (owed && socketed >= INTRO.bossSockets) out.push(boss);
  return out;
}

export function sceneWaiting(game: GameState, clear: QuestFacts): SceneCall | null {
  const gift = giftWaiting(game, clear); // rung 1, and his schedule moves nowhere
  const workshop = SCENE_BY_ID[LAMPWRIGHT.scene];
  if (gift && workshop) return { def: workshop, gift };

  const next = scheduled(game)[0];
  if (next) return { def: next, gift: null }; // rung 2

  const wanted = SCENES.find((s) => relicFor(game, s.id) !== null);
  return wanted ? { def: wanted, gift: null } : null;
}
