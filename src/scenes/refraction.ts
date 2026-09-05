/**
 * The Cavern's own floor, and the second arena in the game. Wide and empty for
 * the same reason the Answering's is: the Fall drops circles where you stand,
 * so a fight that asks you to leave needs somewhere to go.
 */
import type { SceneDef } from '../scenes';

export const REFRACTION_HALL: SceneDef = {
  id: 'refraction_hall',
  who: 'lampwright',
  name: 'The Refraction',
  theme: 'prismatic',
  plan: {
    room: { x: 1, y: 1, w: 39, h: 31 },
    entrance: { x: 6, y: 27 },
    stands: { x: 9, y: 26 },
    props: [],
  },
  said: 'Every surface in here is holding the same light, and all of it is pointing at one place.',
  beats: [
    { said: 'The walls have been getting brighter for an hour. This is where it was going.', act: 'face' },
    { said: 'It is not reflecting anything. It is the thing being reflected.', act: 'face' },
  ],
  encounter: 'refraction',
};
