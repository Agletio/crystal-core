/** WHO YOU HAVE MET, and where. Found in a descent, in the camp from then on,
 *  so a queue of rooms is one `given` mark apiece. */
import { INTRO, MEET, WORKERS, workerMark } from '../data';
import type { WorkerDef } from '../data';
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

export const meetingDepth = (rung: number): boolean =>
  rung >= MEET.first && (rung - MEET.first) % MEET.every === 0;

/** HEARD IN TOWN: the scene watched, which is a different thing from having
 *  walked past him. The queue moves on this and never on the meeting. */
export const heardMark = (id: string): string => `heard:${id}`;

export const hasHeard = (game: GameState, id: string): boolean =>
  (game.given ?? []).includes(heardMark(id));

export function takeHeard(game: GameState, id: string): void {
  if (!hasHeard(game, id)) game.given = [...(game.given ?? []), heardMark(id)];
}

/** EVERYBODY FOUND DOWN THERE, IN ONE ORDER. People and workers are two
 *  tables and one QUEUE — the Lampwright at 2, the smith at 4, Hob at 5 — so
 *  the order is DERIVED off the depth each already names rather than written a
 *  second time where it can disagree. Ties keep the tables' own order. */
export interface Meeting {
  id: string;
  rung: number;
  theme: MapTheme;
  scene?: SceneDef;
  worker?: WorkerDef;
}

export const MEETINGS: Meeting[] = [
  ...SCENES.filter((s) => !s.encounter && s.rung !== undefined)
    .map((s) => ({ id: s.id, rung: s.rung!, theme: s.theme, scene: s })),
  ...WORKERS.map((w) => ({ id: `worker:${w.id}`, rung: w.rung, theme: w.world, worker: w })),
].sort((a, b) => a.rung - b.rung);

const wasMet = (game: GameState, m: Meeting): boolean =>
  m.worker ? (game.given ?? []).includes(workerMark(m.worker.id)) : hasMet(game, m.id);

/** THE NEXT ONE OWED, and NOBODY IS SKIPPED. The queue advances only on a
 *  scene HEARD IN TOWN, so diving from 2 to 6 without going up finds nobody:
 *  the smith waits on the Lampwright's own scene, and Hob waits on the
 *  smith's. Depth only says how DEEP the next one stands, never who. */
export function nextMeeting(game: GameState): Meeting | undefined {
  for (const m of MEETINGS) {
    if (!wasMet(game, m)) return m;
    if (!hasHeard(game, m.id)) return undefined; // met, not yet heard: the queue stops here
  }
  return undefined;
}

/** WHO IS DOWN THERE: the one the queue owes, if this descent is deep enough
 *  and in his world. A man who turns up in every world lives in none. */
export function whoIsDown(game: GameState, theme: MapTheme, rung: number): SceneDef | undefined {
  const next = nextMeeting(game);
  if (!next?.scene || next.theme !== theme || rung < next.rung) return undefined;
  return next.scene;
}

