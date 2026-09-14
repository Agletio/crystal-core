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
    "Feet! Watch your feet. Had those sorted. Since the lamp was lit, sorting those. Too big to eat, you. Bring me something smaller. Something that came apart right. I stay here.",
  idles:
    "Empty hands. No use to me. Find one the Rot left whole. Bring it here. Then we talk.",
  beats: OSTEOMANCER.beats,
  // HIS OWN ROOM, off the Fissure screen: he does not come up, and the middle
  // of that picture is the bare floor he stands on.
  room: {
    art: 'room_ossuary',
    stands: { x: 410, y: 300 },
    you: { x: 250, y: 312 },
    name: 'The Ossuary',
    blurb: "The Osteomancer works here. Bring him a Pristine Specimen.",
  },
  encounter: null,
};
