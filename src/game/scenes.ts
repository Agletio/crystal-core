/** WHO YOU HAVE MET, and where. Found in a descent, in the camp from then on,
 *  so a queue of rooms is one `given` mark apiece. */
import { INTRO, MEET } from '../data';
import { SCENES } from '../scenes';
import type { SceneDef } from '../scenes';
import type { MapTheme } from '../types';
import type { GameState } from './state';

/** At the clear, never the door: a room you died in comes back. */
export function takeBoss(game: GameState, id: string): void {
  if (!(game.bosses ?? []).includes(id)) game.bosses = [...(game.bosses ?? []), id];
}

export const bossBeaten = (game: GameState, id: string): boolean =>
  (game.bosses ?? []).includes(id);

/** A key already handed over, as a `given` entry. */
export const gaveKey = (id: string): string => `key:${id}`;

export const metMark = (sceneId: string): string => `met:${sceneId}`;

export const hasMet = (game: GameState, sceneId: string): boolean =>
  (game.given ?? []).includes(metMark(sceneId));

export function takeMet(game: GameState, sceneId: string): void {
  if (!hasMet(game, sceneId)) game.given = [...(game.given ?? []), metMark(sceneId)];
}

/** THEIR KEY: `INTRO.bossSockets` crystals set in the wall, and never twice. */
export function keyOwed(game: GameState, def: SceneDef): boolean {
  if (!def.gives || (game.given ?? []).includes(gaveKey(def.gives))) return false;
  return Object.keys(game.sockets ?? {}).length >= INTRO.bossSockets;
}

/** Everyone you can go and see. A BOSS is not one: his room is a descent. */
export const folkMet = (game: GameState): SceneDef[] =>
  SCENES.filter((s) => !s.encounter && hasMet(game, s.id));

/** Who LIVES in a world, in the order a campaign meets them. */
export const folkOf = (theme: MapTheme): SceneDef[] =>
  SCENES.filter((s) => !s.encounter && s.theme === theme);

/** THE DEPTHS SOMEBODY STANDS AT. */
export const meetingDepth = (rung: number): boolean =>
  rung >= MEET.first && (rung - MEET.first) % MEET.every === 0;

/** WHO IS DOWN THERE, only ever from THAT WORLD — a man who turns up in every
 *  world lives in none — and SCHEDULED: finishing a zone is meeting everybody
 *  who lives in it, where a coin could leave a bench behind a roll. */
export function whoIsDown(game: GameState, theme: MapTheme, rung: number): SceneDef | undefined {
  if (!meetingDepth(rung)) return undefined;
  return folkOf(theme).find((s) => !hasMet(game, s.id));
}

