/**
 * The Osteomancer, who sorts. Found somewhere in the Rot with his sorting
 * unfinished; afterwards he keeps a bench in the camp and takes a specimen.
 */
import { OSTEOMANCER } from '../data';
import type { SceneDef } from '../scenes';

export const OSSUARY: SceneDef = {
  id: 'ossuary',
  who: OSTEOMANCER.sprite,
  name: OSTEOMANCER.name,
  theme: 'demonic', // his world, and the only one a specimen comes out of
  rung: 4,
  said: OSTEOMANCER.seen,
  greets:
    'Feet. FEET. Half of that was in order and I have been at it since the lamp was lit. You are too big, I do not try. Bring me one that came apart right and I am up top after.',
  idles:
    'Nothing on you. Nothing at all on you. Go down. Bring me one that came apart RIGHT. Then we talk.',
  beats: OSTEOMANCER.beats,
  encounter: null,
};
