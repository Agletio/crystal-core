/**
 * Where the name is said, and the only room in the game with nothing in it.
 *
 * The Fissure's own rock rather than the Cavern's, and WIDE: the Fall drops
 * circles where you are standing, so a fight that asks you to leave needs
 * somewhere to go. Nobody lives here and nothing is placed — a floor with
 * furniture on it is a floor you get caught against.
 */
import type { SceneDef } from '../scenes';

export const ANSWERING_HALL: SceneDef = {
  id: 'answering_hall',
  who: 'lambengolmor',
  name: 'The Answering',
  theme: 'fissure',
  plan: {
    room: { x: 1, y: 1, w: 39, h: 31 },
    // You land in the MIDDLE and it comes to you off the edge: walking the
    // length of an empty room to start a fight is dead time.
    entrance: { x: 20, y: 16 },
    stands: { x: 20, y: 3 },
    props: [],
  },
  said: 'You say the three marks out loud. Something a long way off in the dark stops, and turns round.',
  encounter: 'answering',
};
