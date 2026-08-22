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
  said: LAMPWRIGHT.seen,
  greets:
    'Put it down, put it down — I am not one of them. I have been holding this lantern up for eleven hours. Walk me out and I will make it worth the trip.',
  encounter: null,
};
