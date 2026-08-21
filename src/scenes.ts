/**
 * Scenes: the authored rooms you come up into at the end of a cleared descent.
 * A `RunSim` over a map nobody generated — one chamber, the props where
 * somebody put them, the people in it. `src/scenes/*` is content.
 */
import type { MapProp, Room, Vec2 } from './sim/grid';
import type { MapTheme } from './types';
import { WORKSHOP } from './scenes/workshop';
import { READING_ROOM } from './scenes/reading-room';
import { OSSUARY } from './scenes/ossuary';
import { ORRERY } from './scenes/orrery';
import { ANSWERING_HALL } from './scenes/answering';
import { CAMP } from './scenes/camp';

/** What somebody DOES between two lines, off the pose machinery that exists. */
export type SceneAct = 'pace' | 'work' | 'face';

export interface SceneBeat {
  said: string;
  act?: SceneAct; // what is done while the line is on screen
}

/** The room and everything standing in it, in absolute tiles. Nothing scatters
 *  into one: what the ROCK does belongs to a descent, out of `generateMap`. */
export interface ScenePlan {
  room: Room;
  entrance: Vec2; // the only hole: `GameMap.exit` is this tile too
  stands: Vec2; // where the person is before the hero has crossed to them
  props: MapProp[]; // put exactly here, by hand
}

export interface SceneDef {
  id: string;
  who: string; // a sprite id in BOTH `BEASTIARY` and `PORTRAITS`
  name: string; // what the bubble calls them, since a portrait is not a label
  theme: MapTheme; // some world's rock: a room is a PLACE, not the last descent
  plan: ScenePlan;
  said: string; // noted on arrival; what a PERSON says is beats, per gift
  beats?: SceneBeat[]; // the room's own person, before the fight
  after?: SceneBeat[]; // and once it is down
  encounter: string | null; // a `BossDef` id; null is a quiet room
  gives?: string; // a `BossKeyDef` id handed over here, once and in person
  /** A PLACE: nobody crosses to you, and nothing schedules it. */
  place?: boolean;
}

// A person smaller than the things you kill reads as set dressing.
export const FOLK_SCALE: Record<string, number> = { lampwright: 1.45 };
export const FOLK_SCALE_DEFAULT = 1.3; // a person, drawn a shade under the hero's 1.5

export const LURKS = new Set(['osteomancer']); // everyone else crosses to you

export const scaleFor = (sprite: string): number =>
  FOLK_SCALE[sprite] ?? FOLK_SCALE_DEFAULT;

export const SCENES: SceneDef[] = [WORKSHOP, READING_ROOM, ANSWERING_HALL, OSSUARY, ORRERY, CAMP];

/** Every room is in `SCENES`: one the schedule cannot reach is one nobody
 *  arrives in. */
export const SCENE_BY_ID: Record<string, SceneDef> = Object.fromEntries(
  SCENES.map((s) => [s.id, s])
);
