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
      // The only curve in the game's furniture, and the only pedestals.
      { id: 'orrery', x: 9, y: 6 },
      { id: 'plinth', x: 7, y: 8 },
      { id: 'plinth', x: 11, y: 8 },
      { id: 'plinth', x: 9, y: 10 },
      { id: 'plinth', x: 7, y: 4 },
      { id: 'plinth', x: 11, y: 4 },
      { id: 'plinth', x: 3, y: 6 },
      { id: 'plinth', x: 15, y: 6 },
      { id: 'plinth', x: 3, y: 11 },
      { id: 'plinth', x: 15, y: 11 },
      { id: 'bench', x: 13, y: 2 },
      { id: 'bench', x: 14, y: 2 },
      { id: 'bench', x: 2, y: 2 },
      { id: 'lantern_lit', x: 9, y: 2 },
      { id: 'lantern_lit', x: 5, y: 8 },
      { id: 'lantern_lit', x: 13, y: 8 },
      { id: 'lantern_dark', x: 16, y: 3 },
      { id: 'lantern_dark', x: 2, y: 8 },
      { id: 'lantern_dark', x: 6, y: 12 },
      { id: 'lantern_dark', x: 12, y: 12 },
    ],
  },
  said: ASTRAL_GEOMETER.seen,
  beats: ASTRAL_GEOMETER.beats,
  encounter: null,
};
