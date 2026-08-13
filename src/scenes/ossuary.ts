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
      // The one room with no upright: everything here has been laid down.
      { id: 'slab', x: 10, y: 2 },
      { id: 'slab', x: 11, y: 2 },
      { id: 'slab', x: 12, y: 2 },
      { id: 'slab', x: 16, y: 2 },
      { id: 'slab', x: 17, y: 2 },
      { id: 'slab', x: 7, y: 8 },
      { id: 'slab', x: 8, y: 8 },
      { id: 'slab', x: 15, y: 9 },
      { id: 'slab', x: 16, y: 9 },
      { id: 'slab', x: 2, y: 3 },
      { id: 'slab', x: 3, y: 3 },
      { id: 'bones', x: 6, y: 2 },
      { id: 'bones', x: 18, y: 5 },
      { id: 'bones', x: 5, y: 5 },
      { id: 'bones', x: 12, y: 6 },
      { id: 'bones', x: 17, y: 7 },
      { id: 'bones', x: 2, y: 9 },
      { id: 'bones', x: 11, y: 10 },
      { id: 'bones', x: 13, y: 10 },
      { id: 'lantern_lit', x: 13, y: 5 },
      { id: 'lantern_lit', x: 6, y: 6 },
      { id: 'lantern_dark', x: 18, y: 2 },
      { id: 'lantern_dark', x: 9, y: 10 },
    ],
  },
  said: OSTEOMANCER.seen,
  beats: OSTEOMANCER.beats,
  encounter: null,
};
