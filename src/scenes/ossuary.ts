/**
 * Where the Osteomancer sorts. A wide near-empty cave glittering with
 * gemstones, his few slabs of work pushed against one end of it. Authored to
 * the tile like every other room: absolute positions, no rng anywhere.
 */
import { OSTEOMANCER } from '../data';
import type { SceneDef } from '../scenes';

export const OSSUARY: SceneDef = {
  id: 'ossuary',
  who: OSTEOMANCER.sprite,
  name: OSTEOMANCER.name,
  theme: 'demonic', // his world, and the only one a specimen comes out of
  plan: {
    room: { x: 1, y: 1, w: 25, h: 15 },
    // Opposite corners: arriving is a walk across the whole glittering floor.
    entrance: { x: 4, y: 12 },
    stands: { x: 19, y: 5 },
    props: [
      // The cave's own wealth, thickest at the walls and thin in the open.
      { id: 'gems_big', x: 2, y: 2 },
      { id: 'gems_big', x: 12, y: 1 },
      { id: 'gems_big', x: 23, y: 3 },
      { id: 'gems_big', x: 3, y: 14 },
      { id: 'gems_big', x: 22, y: 13 },
      { id: 'gems_small', x: 7, y: 3 },
      { id: 'gems_small', x: 17, y: 2 },
      { id: 'gems_small', x: 1, y: 8 },
      { id: 'gems_small', x: 24, y: 9 },
      { id: 'gems_small', x: 9, y: 14 },
      { id: 'gems_small', x: 15, y: 13 },
      { id: 'gems_shards', x: 6, y: 7 },
      { id: 'gems_shards', x: 10, y: 5 },
      { id: 'gems_shards', x: 12, y: 11 },
      { id: 'gems_shards', x: 18, y: 8 },
      { id: 'gems_shards', x: 21, y: 4 },
      { id: 'gems_shards', x: 14, y: 15 },
      // His work, all of it at his end: slabs and what came off them.
      { id: 'slab', x: 17, y: 6 },
      { id: 'bones', x: 20, y: 6 },
      { id: 'bones', x: 19, y: 3 },
      { id: 'lantern_lit', x: 18, y: 5 },
      { id: 'lantern_lit', x: 5, y: 11 },
    ],
  },
  said: OSTEOMANCER.seen,
  beats: OSTEOMANCER.beats,
  encounter: null,
};
