/**
 * Where the Osteomancer sorts. A long low room cut out of the Rot's own meat,
 * benches down one side of it and nothing lit at the far end.
 *
 * Authored to the tile like every other room: absolute positions, a cut hashed
 * off the tile it lands on, and no rng anywhere.
 */
import { OSTEOMANCER } from '../data';
import type { SceneDef } from '../scenes';

export const OSSUARY: SceneDef = {
  id: 'ossuary',
  who: OSTEOMANCER.sprite,
  name: OSTEOMANCER.name,
  theme: 'demonic', // his world, and the only one a specimen comes out of
  plan: {
    room: { x: 1, y: 1, w: 19, h: 11 },
    // Opposite corners, so arriving is a walk across his sorting rather than
    // a panel that appears.
    entrance: { x: 4, y: 8 },
    stands: { x: 14, y: 4 },
    props: [
      { id: 'bench', x: 13, y: 3 },
      { id: 'bench', x: 14, y: 3 },
      { id: 'bench', x: 15, y: 3 },
      { id: 'bench', x: 8, y: 8 },
      { id: 'bench', x: 9, y: 8 },
      { id: 'lantern_lit', x: 12, y: 6 },
      { id: 'lantern_dark', x: 6, y: 3 },
      { id: 'lantern_dark', x: 17, y: 8 },
      { id: 'lantern_dark', x: 10, y: 3 },
    ],
  },
  said: OSTEOMANCER.seen,
  beats: OSTEOMANCER.beats,
  encounter: null,
};
