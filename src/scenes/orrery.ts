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
  said: ASTRAL_GEOMETER.seen,
  greets:
    'Hold still — no, stay exactly there, you are making the angle. Right. Thank you. Come and find me above and bring dust.',
  idles:
    'No dust? Then there is nothing to measure and we are both standing here wasting the light.',
  beats: ASTRAL_GEOMETER.beats,
  encounter: null,
};
