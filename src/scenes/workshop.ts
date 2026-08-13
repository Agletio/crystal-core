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
  name: LAMPWRIGHT.name,
  theme: 'fissure', // a working, and it is the shallow end's
  plan: {
    room: { x: 1, y: 1, w: 15, h: 11 },
    entrance: { x: 4, y: 8 },
    // Behind his bench and across the room, so arriving is a walk rather than
    // a panel: the hole and the man are opposite corners of the same floor.
    stands: { x: 11, y: 4 },
    props: [
      { id: 'lamprack', x: 8, y: 2 }, // finished ones hang; the trestles hold half-built
      { id: 'lamprack', x: 12, y: 2 },
      { id: 'bench', x: 9, y: 4 },
      { id: 'bench', x: 10, y: 4 },
      { id: 'bench', x: 12, y: 4 },
      { id: 'bench', x: 13, y: 7 },
      { id: 'bench', x: 14, y: 7 },
      { id: 'lamprack', x: 3, y: 3 },
      { id: 'lamprack', x: 14, y: 10 },
      { id: 'bench', x: 2, y: 6 },
      { id: 'bench', x: 2, y: 7 },
      { id: 'lantern_lit', x: 7, y: 5 },
      { id: 'lantern_lit', x: 13, y: 4 },
      { id: 'lantern_lit', x: 5, y: 10 },
      { id: 'lantern_dark', x: 15, y: 2 },
      { id: 'lantern_dark', x: 8, y: 10 },
      { id: 'lantern_dark', x: 11, y: 10 },
      { id: 'lantern_dark', x: 2, y: 10 },
    ],
  },
  said: LAMPWRIGHT.seen,
  encounter: null,
};
