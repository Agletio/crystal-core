/**
 * Scenes: the authored rooms you come up into at the end of a cleared descent.
 * A `RunSim` over a map nobody generated — one room, the props where somebody
 * put them, the people in it, and at most one thing to put down. What a later
 * room adds is a field here; `src/scenes/*` is content.
 */
import type { Cut, MapProp, Room, Vec2 } from './sim/grid';
import type { MapTheme } from './types';
import { WORKSHOP } from './scenes/workshop';
import { READING_ROOM } from './scenes/reading-room';
import { OSSUARY } from './scenes/ossuary';
import { ORRERY } from './scenes/orrery';
import { SANDBOX } from './scenes/sandbox';

/** What somebody DOES between two lines, off the pose machinery that already
 *  exists — so a beat may never lean on one for meaning. */
export type SceneAct = 'pace' | 'work' | 'face';

export interface SceneBeat {
  said: string;
  act?: SceneAct; // what is done while the line is on screen
}

/** A body to be LOOKED at: nothing it deals or takes lands on anything. */
export interface SceneDummy {
  sprite: string;
  at: Vec2;
  scale: number;
  ability?: string; // a `MONSTER_ABILITIES` id: the thrown ones are the cast
  rooted?: boolean; // holds its post rather than chasing, so a layout survives
  speed?: number; // a multiplier on move speed, for a room meant to be watched
}

/** The room and everything standing in it, in absolute tiles. */
export interface ScenePlan {
  room: Room;
  also?: Room[]; // more chambers, cut the same way
  joins?: [number, number][]; // which of them a corridor connects, by index
  cut?: Cut; // how the rock is cut, over whatever the zone's own answer is
  entrance: Vec2; // the only hole: `GameMap.exit` is this tile too
  stands: Vec2; // where the person is before the hero has crossed to them
  patrol?: Vec2[]; // a circuit the SANDBOX hero walks, so every facing shows
  props: MapProp[];
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
  dummies?: SceneDummy[]; // and their presence is what makes a room a SANDBOX
  ground?: string; // a generated tileset, over the zone's own rock. Pixi only
  hero?: SceneDummy; // a body the hero is drawn as, over the doll it is made of
}

// A person smaller than the things you kill reads as set dressing.
export const FOLK_SCALE: Record<string, number> = { lampwright: 1.45 };
export const FOLK_SCALE_DEFAULT = 1.3; // over the hero's 1.15, and the 1.1 topping MONSTERS

export const LURKS = new Set(['osteomancer']); // everyone else crosses to you

export const scaleFor = (sprite: string): number =>
  FOLK_SCALE[sprite] ?? FOLK_SCALE_DEFAULT;

export const SCENES: SceneDef[] = [WORKSHOP, READING_ROOM, OSSUARY, ORRERY];

/** `SCENES` is what the SCHEDULE walks, so a room outside it — the sandbox —
 *  is a room no amount of playing ever arrives in. */
export const SCENE_BY_ID: Record<string, SceneDef> = Object.fromEntries(
  [...SCENES, SANDBOX].map((s) => [s.id, s])
);
