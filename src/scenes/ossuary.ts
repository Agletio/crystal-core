/**
 * The Osteomancer, who sorts. Found somewhere in the Rot with his sorting
 * unfinished; afterwards his own room is a tab on the Fissure screen and he
 * takes a specimen there. He never comes up.
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
    'Feet. FEET. Half of that was in order and I have been at it since the lamp was lit. You are too big, I do not try. I do not go up. You come back down to me and bring one that came apart right.',
  idles:
    'Nothing on you. Nothing at all on you. Go down. Bring me one that came apart RIGHT. Then we talk.',
  beats: OSTEOMANCER.beats,
  // HIS OWN ROOM, off the Fissure screen: he does not come up, and the middle
  // of that picture is the bare floor he stands on.
  room: {
    art: 'room_ossuary',
    stands: { x: 410, y: 300 },
    you: { x: 250, y: 312 },
    name: 'The Ossuary',
    blurb: 'His room, down where you found him. Nothing descends here.',
  },
  encounter: null,
};
