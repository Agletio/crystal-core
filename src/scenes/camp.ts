/**
 * THE CAMP: a grassy shelf at the mouth of the cave, the crack you go down
 * through in the rock along the north side, and what you have made of the
 * ground in front of it. The one place in the game that is not underground.
 *
 * It is a `SceneDef` and NOT a fifth phase, which is the DECISION this file
 * is. A scene gets the walk, the camera, both renderers, `sceneMap`'s carve
 * and the prop table for nothing; a phase of its own was a blank canvas owing
 * all five. What it cost is `place` — a scene is otherwise somebody's ROOM,
 * and three things read `SCENES` expecting that. Authored to the tile.
 */
import type { SceneDef } from '../scenes';
import type { Vec2 } from '../sim/grid';

/** A thing you CLICK. `opens` NAMES a screen rather than calling one — a room
 *  that imported the UI would be content importing its own frame — and
 *  `src/ui/run.ts` maps the name onto the panel. `room` is the one that names
 *  a scene instead: a PERSON standing about is a fixture like the bench is. */
export interface Fixture {
  id: string; // a `PROP_ART` id, drawn from `plan.props` like any other
  at: Vec2;
  opens: 'fissure' | 'craft' | 'stash' | 'shop' | 'skills' | 'character' | 'room';
  room?: string;
  says: string; // on the hover, because this is a DESKTOP game
}

export const CAMP_FIXTURES: Fixture[] = [
  // The crack is the map's own ENTRANCE, drawn by `MOUTH_ART`: no prop of its own.
  {
    id: 'camp_crack',
    at: { x: 13, y: 2 },
    opens: 'fissure',
    says: 'The crack. It goes down a long way, and it is always open.',
  },
  {
    id: 'bench',
    at: { x: 6, y: 8 },
    opens: 'craft',
    says: 'Your bench. Somewhere to pour a currency over a piece and see what it does.',
  },
  {
    id: 'shelf',
    at: { x: 20, y: 8 },
    opens: 'stash',
    says: 'The shelf. What you are not carrying, and what you meant to come back for.',
  },
  {
    id: 'camp_gear',
    at: { x: 17, y: 6 },
    opens: 'character',
    says: 'Your kit, dropped where you stopped carrying it.',
  },
];

/** Where somebody you have MET stands, in the order you met them. */
export const CAMP_SPOTS: Vec2[] = [
  { x: 3, y: 5 },
  { x: 23, y: 5 },
  { x: 9, y: 10 },
  { x: 18, y: 10 },
  { x: 3, y: 9 },
];

/** THE ROCK ALONG THE NORTH: four sockets either side of the crack, in
 *  `RUN_SLOTS` order, on the wall FACE — so the x's are the ones `fitCorners`
 *  left floor UNDER, not a tidy spacing. Filled or empty is the art. */
export const CAMP_SOCKETS: Vec2[] = [
  { x: 8, y: 0 },
  { x: 10, y: 0 },
  { x: 16, y: 0 },
  { x: 18, y: 0 },
];

export const CAMP: SceneDef = {
  id: 'camp',
  who: '', // nobody in particular: whoever you have met is standing about
  name: 'The camp',
  theme: 'camp',
  place: true,
  plan: {
    room: { x: 1, y: 1, w: 25, h: 11 },
    entrance: { x: 13, y: 1 }, // the crack, IN the rock: you come up out of it
    stands: { x: 13, y: 8 },
    props: [
      ...CAMP_FIXTURES.filter((f) => f.opens !== 'fissure')
        .map((f) => ({ id: f.id, x: f.at.x, y: f.at.y })),
      { id: 'camp_tent', x: 21, y: 9 },
      { id: 'camp_fire', x: 13, y: 10 },
      { id: 'lantern_lit', x: 11, y: 5 },
      { id: 'lantern_lit', x: 7, y: 7 },
      { id: 'lantern_dark', x: 19, y: 7 },
      { id: 'pebbles', x: 10, y: 9 },
      { id: 'pebbles', x: 21, y: 4 },
      { id: 'roots', x: 2, y: 10 },
      { id: 'roots', x: 24, y: 10 },
    ],
  },
  said: 'Grass, and the crack in the rock. Everything you have carried up is here.',
  encounter: null,
};
