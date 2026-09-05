/**
 * The people, and the one room left. *"Honestly just ditch all the rooms. I
 * want to encounter them randomly in the maps and they just say like one thing
 * thanking you for saving them… then they can be in the camp and you can just
 * talk to them."* A `SceneDef` is a PERSON; only the BOSS ARENA keeps a `plan`.
 */
import type { MapProp, Room, Vec2 } from './sim/grid';
import type { MapTheme } from './types';
import { WORKSHOP } from './scenes/workshop';
import { READING_ROOM } from './scenes/reading-room';
import { OSSUARY } from './scenes/ossuary';
import { ORRERY } from './scenes/orrery';
import { SMITHY } from './scenes/smithy';
import { ANSWERING_HALL } from './scenes/answering';
import { REFRACTION_HALL } from './scenes/refraction';
import { FLOWERING_HALL } from './scenes/flowering';

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
  theme: MapTheme; // some world's rock: the arena is a PLACE, not the last descent
  plan?: ScenePlan; // the BOSS ARENA alone; a person is met where you find them
  said: string; // what the place looked like, noted on arrival
  greets?: string; // the ONE line, said where you find them in a descent
  beats?: SceneBeat[]; // what they say in the camp when they WANT something
  idles?: string; // and when they do not, so a visit is never only a demand
  after?: SceneBeat[]; // and once the fight is down
  encounter: string | null; // a `BossDef` id; null is a quiet room
  gives?: string; // a `BossKeyDef` id handed over here, once and in person
  /** WHAT THEY KEEP: a counter, opened once they owe you nothing. A bench a
   *  RELIC buys is this shape already (`relicFor`). */
  keeps?: 'shop' | 'tools';
  rung?: number; // HIS OWN DEPTH, ahead of the schedule; absent is the rota's
}

// A person smaller than the things you kill reads as set dressing.
export const FOLK_SCALE: Record<string, number> = { lampwright: 1.45 };
export const FOLK_SCALE_DEFAULT = 1.3; // a person, drawn a shade under the hero's 1.5

export const LURKS = new Set(['osteomancer']); // everyone else crosses to you

export const scaleFor = (sprite: string): number =>
  FOLK_SCALE[sprite] ?? FOLK_SCALE_DEFAULT;

export const SCENES: SceneDef[] = [
  WORKSHOP, READING_ROOM, ANSWERING_HALL, REFRACTION_HALL, FLOWERING_HALL, OSSUARY, ORRERY, SMITHY,
];

/** Every room is in `SCENES`: one the schedule cannot reach is one nobody
 *  arrives in. */
export const SCENE_BY_ID: Record<string, SceneDef> = Object.fromEntries(
  SCENES.map((s) => [s.id, s])
);
