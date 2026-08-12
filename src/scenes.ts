/**
 * Scenes: the authored rooms you come up into at the end of a cleared descent.
 * A scene is a `RunSim` over a map nobody generated — one room, no packs, the
 * props where somebody put them and the people standing in it. Everything a
 * later room adds is a field on `SceneDef` rather than a second kind of run.
 * `src/scenes/*` is content, as `src/trees/*` is under `src/skills-tree.ts`.
 */
import type { MapProp, Room, Vec2 } from './sim/grid';
import type { MapTheme } from './types';
import { WORKSHOP } from './scenes/workshop';

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
  /** Some world's rock. A room is a PLACE, and does not take the theme of the
   *  descent you happened to come out of. */
  theme: MapTheme;
  plan: ScenePlan;
  said: string; // on arrival; beats and the rest of it are Phase 2's
  encounter: string | null; // what has to be put down; null is a quiet room
}

export const SCENES: SceneDef[] = [WORKSHOP];

export const SCENE_BY_ID: Record<string, SceneDef> = Object.fromEntries(
  SCENES.map((s) => [s.id, s])
);
