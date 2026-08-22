/**
 * The Rot's floor, and the deepest room the climb reaches. Empty like the other
 * two: what is standing in the middle is the whole of what is in here.
 */
import type { SceneDef } from '../scenes';

export const FLOWERING_HALL: SceneDef = {
  id: 'flowering_hall',
  who: 'osteomancer',
  name: 'The Flowering',
  theme: 'demonic',
  plan: {
    room: { x: 1, y: 1, w: 39, h: 31 },
    entrance: { x: 6, y: 27 },
    stands: { x: 9, y: 26 },
    props: [],
  },
  said: 'The floor is soft. Everything growing on it is leaning the same way, towards the middle.',
  beats: [
    { said: 'All of this came after the rock. All of it came out of one thing.', act: 'face' },
    { said: 'And it has been waiting for somebody to walk this far in.', act: 'face' },
  ],
  encounter: 'flowering',
};
