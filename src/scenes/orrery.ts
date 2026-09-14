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
    "Stand still. There. Your shadow completes the angle. The same result in nine rooms. Remarkable. Bring me dust when you return. I will be here.",
  idles:
    "No dust today? Then I shall return to my measurements.",
  beats: ASTRAL_GEOMETER.beats,
  room: {
    art: 'room_orrery',
    stands: { x: 410, y: 300 },
    you: { x: 250, y: 312 },
    name: 'The Orrery',
    blurb: "The Astral-Geometer works here. Bring him Prismatic Dust.",
  },
  encounter: null,
};
