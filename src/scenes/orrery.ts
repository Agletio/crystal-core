/**
 * Where the Astral-Geometer measures. A tall round chamber cut out of the
 * Cavern with something hung in the middle of it, turning.
 *
 * Authored to the tile like every other room: absolute positions, a cut hashed
 * off the tile it lands on, and no rng anywhere.
 */
import { ASTRAL_GEOMETER } from '../data';
import type { SceneDef } from '../scenes';

export const ORRERY: SceneDef = {
  id: 'orrery',
  who: ASTRAL_GEOMETER.sprite,
  name: ASTRAL_GEOMETER.name,
  theme: 'prismatic', // his world, and the only one dust comes out of
  plan: {
    room: { x: 1, y: 1, w: 17, h: 13 },
    entrance: { x: 4, y: 10 },
    stands: { x: 12, y: 5 },
    props: [
      // A ring of lit lanterns round the middle of the room, which is where he
      // has hung the thing he is watching.
      { id: 'lantern_lit', x: 9, y: 3 },
      { id: 'lantern_lit', x: 11, y: 8 },
      { id: 'lantern_lit', x: 6, y: 7 },
      { id: 'bench', x: 12, y: 4 },
      { id: 'bench', x: 13, y: 4 },
      { id: 'lantern_dark', x: 15, y: 10 },
      { id: 'lantern_dark', x: 3, y: 4 },
    ],
  },
  said: ASTRAL_GEOMETER.seen,
  beats: ASTRAL_GEOMETER.beats,
  encounter: null,
};
