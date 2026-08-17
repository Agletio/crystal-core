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
    // You come up at the STAIRS in a corner; it is already standing in the
    // middle. Off the rim it was slowly leaned into a wall.
    entrance: { x: 6, y: 27 },
    stands: { x: 9, y: 26 }, // beside the stairs; the MIDDLE is what you came to fight
    props: [],
  },
  said: 'You say the three marks out loud. Something a long way off in the dark stops, and turns round.',
  beats: [ // YOURS, not its: nobody lives in here
    { said: 'It was already standing there. It has been standing there the whole time.', act: 'face' },
    { said: 'Oh. Oh, no.', act: 'face' },
  ],
  encounter: 'answering',
};
