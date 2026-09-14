/**
 * The Lampwright. Not a room any more — you find him somewhere in a descent,
 * he says one line, and after that he is standing in the camp.
 */
import { LAMPWRIGHT } from '../data';
import type { SceneDef } from '../scenes';

export const WORKSHOP: SceneDef = {
  id: 'workshop',
  who: LAMPWRIGHT.sprite,
  name: LAMPWRIGHT.name,
  theme: 'fissure', // a working, and it is the shallow end's
  rung: LAMPWRIGHT.rung,
  said: LAMPWRIGHT.seen,
  greets:
    "Mind the lamp. Mind it! Thank you. Eleven hours of light left, and I mean to see the way back. Find me at the camp when you come up.",
  encounter: null,
  // HIS COUNTER. He is the first person you meet, so the shop is his: the
  // handover plays first, and every visit after it is the shelf.
  keeps: 'shop',
};
