/**
 * Scenes: the authored rooms you come up into at the end of a cleared descent.
 * A `RunSim` over a map nobody generated — one room, no packs, the props where
 * somebody put them and the people in it. Everything a later room adds is a
 * field here rather than a second kind of run, and `src/scenes/*` is content.
 */
import type { MapProp, Room, Vec2 } from './sim/grid';
import type { MapTheme } from './types';
import { WORKSHOP } from './scenes/workshop';

/** What somebody DOES between two lines, off the pose machinery that already
 *  exists. Only Pixi draws sprites, so an act is a pose there and a moving
 *  circle in the fallback: a beat may never lean on one for meaning. */
export type SceneAct = 'pace' | 'work' | 'face';

export interface SceneBeat {
  said: string;
  act?: SceneAct; // what is done while the line is on screen
}

/** The room and everything standing in it, in absolute tiles. */
export interface ScenePlan {
  room: Room;
  entrance: Vec2; // the only hole: `GameMap.exit` is this tile too
  stands: Vec2; // where the person is before the hero has crossed to them
  props: MapProp[];
}

export interface SceneDef {
  id: string;
  who: string; // a sprite id in BOTH `BEASTIARY` and `PORTRAITS`
  theme: MapTheme; // some world's rock: a room is a PLACE, not the last descent
  plan: ScenePlan;
  said: string; // noted on arrival; what a PERSON says is beats, per gift
  encounter: string | null; // what has to be put down; null is a quiet room
}

export const SCENES: SceneDef[] = [WORKSHOP];

export const SCENE_BY_ID: Record<string, SceneDef> = Object.fromEntries(
  SCENES.map((s) => [s.id, s])
);
