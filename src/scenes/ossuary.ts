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
  said: OSTEOMANCER.seen,
  greets:
    'Do not step there. Do NOT — thank you. Thank you. Half of that was still in order. I will be up top if you find one that came apart right.',
  idles:
    'Nothing on you. Nothing at all. Go down and bring me something that came apart RIGHT, and then we will talk.',
  beats: OSTEOMANCER.beats,
  encounter: null,
};
