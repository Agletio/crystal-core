/**
 * The Lambengolmor's room: large and round, cut out of the Cavern's own rock
 * because he believes the crystal is writing and he has gone to live in it.
 *
 * No fight stands in here: he says his piece and hands over the NAME, which is
 * a key for the Fissure's fifth socket. What it calls up is called up there.
 */
import type { SceneDef } from '../scenes';

export const READING_ROOM: SceneDef = {
  id: 'reading_room',
  who: 'lambengolmor',
  name: 'The Lambengolmor',
  theme: 'prismatic',
  plan: {
    room: { x: 1, y: 1, w: 21, h: 17 },
    entrance: { x: 6, y: 13 },
    stands: { x: 15, y: 6 },
    props: [
      // Geodes, and nothing else at all: he lives inside the thing he studies.
      { id: 'geode_split', x: 4, y: 3 },
      { id: 'geode_amber', x: 19, y: 4 },
      { id: 'geode_teal', x: 3, y: 14 },
      { id: 'geode_rose', x: 19, y: 13 },
      { id: 'geode_amber', x: 9, y: 2 },
      { id: 'geode_teal', x: 14, y: 2 },
      { id: 'geode_rose', x: 7, y: 16 },
      { id: 'geode_split', x: 16, y: 15 },
      { id: 'geode_teal', x: 2, y: 8 },
      { id: 'geode_amber', x: 20, y: 9 },
      { id: 'geode_rose', x: 12, y: 16 },
      { id: 'geode_split', x: 2, y: 11 },
    ],
  },
  said: 'A room somebody swept. The walls are covered in marks and none of them are yours.',
  beats: [
    {
      said: 'Stop. Before you set another one of those in the wall — do you know what he has you doing?',
      act: 'face',
    },
    {
      said: 'They are not fuel. They are punctuation. He has you reading a sentence out loud, one mark at a time, and he has never once asked what it says.',
      act: 'pace',
    },
    {
      said: 'Everything down here has a true name and everything down here can be told. This one I have written out for you. Three marks, copied off a wall nobody was meant to reach.',
      act: 'work',
    },
    {
      said: 'Set it in the wall the way you set the others and say it where the rock is thin. It will turn round. Then you will know which of us has been right, and it will not be him.',
      act: 'face',
    },
  ],
  encounter: null,
  gives: 'written_name',
};
