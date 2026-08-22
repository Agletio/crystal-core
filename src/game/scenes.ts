/** WHO YOU HAVE MET. There is no schedule any more: a person is found in a
 *  descent and afterwards stands in the camp, so a queue of rooms is one
 *  `given` mark apiece. */
import { INTRO } from '../data';
import { SCENES } from '../scenes';
import type { SceneDef } from '../scenes';
import type { GameState } from './state';

/** At the clear, never the door: a room you died in comes back. */
export function takeBoss(game: GameState, id: string): void {
  if (!(game.bosses ?? []).includes(id)) game.bosses = [...(game.bosses ?? []), id];
}

export const bossBeaten = (game: GameState, id: string): boolean =>
  (game.bosses ?? []).includes(id);

/** A key already handed over, as a `given` entry. */
export const gaveKey = (id: string): string => `key:${id}`;

/** A person you have MET: found in a descent, in the camp from then on. */
export const metMark = (sceneId: string): string => `met:${sceneId}`;

export const hasMet = (game: GameState, sceneId: string): boolean =>
  (game.given ?? []).includes(metMark(sceneId));

export function takeMet(game: GameState, sceneId: string): void {
  if (!hasMet(game, sceneId)) game.given = [...(game.given ?? []), metMark(sceneId)];
}

/** WHETHER SOMEBODY WILL HAND OVER THEIR KEY: `INTRO.bossSockets` crystals set
 *  in the wall, and never twice. He objects to what you are doing. */
export function keyOwed(game: GameState, def: SceneDef): boolean {
  if (!def.gives || (game.given ?? []).includes(gaveKey(def.gives))) return false;
  return Object.keys(game.sockets ?? {}).length >= INTRO.bossSockets;
}

/** Everyone you can go and see. A BOSS is not one: his room is a descent. */
export const folkMet = (game: GameState): SceneDef[] =>
  SCENES.filter((s) => !s.encounter && hasMet(game, s.id));

