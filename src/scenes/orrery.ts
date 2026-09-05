/**
 * The Astral-Geometer, who measures. Found in the Cavern mid-measurement;
 * afterwards his own room is a tab on the Fissure screen and he takes dust
 * there. He never comes up.
 */
import { ASTRAL_GEOMETER } from '../data';
import type { SceneDef } from '../scenes';

export const ORRERY: SceneDef = {
  id: 'orrery',
  who: ASTRAL_GEOMETER.sprite,
  name: ASTRAL_GEOMETER.name,
  theme: 'prismatic', // his world, and the only one dust comes out of
  rung: 8, // deep in his own zone: the second of the two who live in it
  said: ASTRAL_GEOMETER.seen,
  greets:
    'Stand still. No — exactly there, you are holding the angle. Right. It reads the same here as it does in nine other rooms. I stay where the reading is. Bring me dust and come back down.',
  idles:
    'No dust? Then there is nothing to measure, and we are both wasting the light.',
  beats: ASTRAL_GEOMETER.beats,
  room: {
    art: 'room_orrery',
    stands: { x: 410, y: 300 },
    you: { x: 250, y: 312 },
    name: 'The Orrery',
    blurb: 'His room, down where you found him. Nothing descends here.',
  },
  encounter: null,
};
