/**
 * Where the name is said. A bare chamber in the Cavern's own rock with geodes
 * banked against the walls, and nothing in it until you bring the key: the
 * fifth socket spends one, and the next entry opens here.
 *
 * Nobody lives here, so there is nobody to speak. The rock answers instead.
 */
import type { SceneDef } from '../scenes';

export const ANSWERING_HALL: SceneDef = {
  id: 'answering_hall',
  who: 'lambengolmor',
  name: 'The Answering',
  theme: 'prismatic',
  plan: {
    room: { x: 1, y: 1, w: 19, h: 15 },
    entrance: { x: 4, y: 12 },
    stands: { x: 15, y: 5 },
    props: [
      { id: 'geode_split', x: 3, y: 3 },
      { id: 'geode_amber', x: 17, y: 3 },
      { id: 'geode_teal', x: 2, y: 9 },
      { id: 'geode_rose', x: 18, y: 10 },
      { id: 'geode_amber', x: 10, y: 2 },
      { id: 'geode_teal', x: 6, y: 14 },
      { id: 'geode_rose', x: 14, y: 14 },
      { id: 'geode_split', x: 18, y: 6 },
    ],
  },
  said: 'You say the three marks out loud. The rock hears its own name and turns round.',
  encounter: 'answering',
};
