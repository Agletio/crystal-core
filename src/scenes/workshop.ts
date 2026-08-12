/**
 * The Lampwright's workshop: the small chamber he climbs back down into, and
 * the one room in the game with nothing in it that wants to kill you.
 *
 * Authored to the tile. Every position is absolute and the cut is hashed off
 * the tile it lands on, so this room is the same room every time it is entered
 * without anything having to be seeded — which is what a place is.
 */
import { LAMPWRIGHT } from '../data';
import type { SceneDef } from '../scenes';

export const WORKSHOP: SceneDef = {
  id: 'workshop',
  who: LAMPWRIGHT.sprite,
  theme: 'fissure', // a working, and it is the shallow end's
  plan: {
    room: { x: 1, y: 1, w: 15, h: 11 },
    entrance: { x: 4, y: 8 },
    // Behind his bench and across the room, so arriving is a walk rather than
    // a panel: the hole and the man are opposite corners of the same floor.
    stands: { x: 11, y: 4 },
    props: [
      { id: 'bench', x: 11, y: 3 },
      { id: 'bench', x: 12, y: 3 },
      { id: 'lantern_lit', x: 9, y: 3 },
      { id: 'lantern_lit', x: 13, y: 6 },
      { id: 'lantern_dark', x: 6, y: 3 },
      { id: 'lantern_dark', x: 13, y: 9 },
      { id: 'lantern_dark', x: 7, y: 9 },
    ],
  },
  said: LAMPWRIGHT.seen,
  encounter: null,
};
