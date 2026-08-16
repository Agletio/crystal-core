/**
 * The Lampwright's workshop: the small chamber he climbs back down into, and
 * the one room in the game with nothing in it that wants to kill you.
 *
 * Authored to the tile: every position is absolute and the cut is hashed off
 * the tile it lands on, so it is the same room every time — which is a place.
 */
import { LAMPWRIGHT } from '../data';
import type { SceneDef } from '../scenes';

export const WORKSHOP: SceneDef = {
  id: 'workshop',
  who: LAMPWRIGHT.sprite,
  name: LAMPWRIGHT.name,
  theme: 'fissure', // a working, and it is the shallow end's
  plan: {
    room: { x: 1, y: 1, w: 15, h: 11 },
    entrance: { x: 4, y: 8 },
    // Behind his bench and across the room, so arriving is a walk rather than
    // a panel: the hole and the man are opposite corners of the same floor.
    stands: { x: 11, y: 4 },
    props: [
      { id: 'lamprack', x: 6, y: 1 },
      { id: 'bench', x: 13, y: 1 },
      { id: 'bench', x: 1, y: 2 },
      { id: 'lamprack', x: 2, y: 11 },
      { id: 'bench', x: 4, y: 11 },
      { id: 'bench', x: 14, y: 11 },
      { id: 'lamprack', x: 3, y: 1 },
      { id: 'lantern_lit', x: 9, y: 2 },
      { id: 'lantern_lit', x: 5, y: 3 },
      { id: 'lantern_lit', x: 9, y: 3 },
      { id: 'lantern_dark', x: 3, y: 3 },
      { id: 'lantern_dark', x: 11, y: 3 },
      { id: 'lantern_dark', x: 6, y: 4 },
      { id: 'lantern_dark', x: 13, y: 4 },
      // The middle, which read as a floor with things round the edge of it.
      { id: 'bench', x: 6, y: 6 },
      { id: 'lantern_lit', x: 7, y: 6 },
      { id: 'bench', x: 9, y: 7 },
      { id: 'lantern_dark', x: 10, y: 7 },
      { id: 'bench', x: 12, y: 6 },
      { id: 'lantern_lit', x: 11, y: 6 },
      { id: 'lamprack', x: 8, y: 9 },
      { id: 'lantern_dark', x: 4, y: 6 },
      { id: 'lantern_lit', x: 14, y: 8 },
    ],
  },
  said: LAMPWRIGHT.seen,
  encounter: null,
};
