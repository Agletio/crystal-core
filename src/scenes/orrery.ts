/**
 * The Astral-Geometer, who measures. Found in the Cavern mid-measurement;
 * afterwards he keeps a bench in the camp and takes dust.
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
    'Stand still. No — exactly there, you are holding the angle. Right. It reads the same here as it does in nine other rooms. Bring me dust and find me above.',
  idles:
    'No dust? Then there is nothing to measure, and we are both wasting the light.',
  beats: ASTRAL_GEOMETER.beats,
  encounter: null,
};
