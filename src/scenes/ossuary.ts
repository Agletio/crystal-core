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
    'Mind your feet. MIND — thank you. Half of that was still in order and I have been at it since the lamp was lit. Bring me something that came apart right and I will be up top.',
  idles:
    'Nothing on you. Nothing at all. Go down, bring me something that came apart RIGHT, and then we will talk.',
  beats: OSTEOMANCER.beats,
  encounter: null,
};
