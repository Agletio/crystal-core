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
    room: { x: 1, y: 1, w: 9, h: 7 },
    entrance: { x: 4, y: 6 },
    stands: { x: 7, y: 3 },
    props: [
      // His work, off the boundary ROW: a carve is ragged there and a prop on
      // it lands in the rock.
      { id: 'lampshelf', x: 2, y: 2 },
      { id: 'lampshelf', x: 3, y: 2 },
      { id: 'lamprack', x: 5, y: 2 },
      { id: 'lampshelf', x: 6, y: 2 },
      { id: 'lampshelf', x: 8, y: 2 },
      { id: 'lantern_lit', x: 4, y: 2 },
      { id: 'bench', x: 3, y: 4 },
      { id: 'bench', x: 6, y: 4 },
      { id: 'bench', x: 8, y: 5 },
      { id: 'lantern_lit', x: 5, y: 5 },
      { id: 'lamprack', x: 9, y: 3 },
      { id: 'lantern_dark', x: 2, y: 5 },
    ],
  },
  said: LAMPWRIGHT.seen,
  encounter: null,
};
