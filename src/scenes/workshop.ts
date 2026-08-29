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
    'Do not put it out. Do NOT — thank you. That is eleven hours of lamp and I am not walking back up in the dark. I keep a bench at the top; come and find me.',
  encounter: null,
  // HIS COUNTER. He is the first person you meet, so the shop is his: the
  // handover plays first, and every visit after it is the shelf.
  keeps: 'shop',
};
