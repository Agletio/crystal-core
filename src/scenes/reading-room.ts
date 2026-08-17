/**
 * The Lambengolmor's room: large and round, cut out of the Cavern's own rock
 * because he believes the crystal is writing and he has gone to live in it. It
 * is dressed the way the ossuary is — *the user's call* — and by the same rule:
 * a bed of crystal at the walls, thinning to a few shards in the open.
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
      // The ossuary's own arrangement, fitted to this room's shape: crystal and
      // nothing else at all, thickest at the walls and thin in the open, since
      // he lives inside the thing he studies. Not his work — there is none.
      { id: 'gems_big', x: 3, y: 2 },
      { id: 'gems_big', x: 11, y: 1 },
      { id: 'gems_big', x: 20, y: 3 },
      { id: 'gems_big', x: 3, y: 15 },
      { id: 'gems_big', x: 19, y: 14 },
      { id: 'gems_small', x: 7, y: 3 },
      { id: 'gems_small', x: 15, y: 2 },
      { id: 'gems_small', x: 2, y: 9 },
      { id: 'gems_small', x: 21, y: 10 },
      { id: 'gems_small', x: 8, y: 16 },
      { id: 'gems_small', x: 14, y: 15 },
      { id: 'gems_shards', x: 6, y: 8 },
      { id: 'gems_shards', x: 9, y: 6 },
      { id: 'gems_shards', x: 11, y: 12 },
      { id: 'gems_shards', x: 16, y: 9 },
      { id: 'gems_shards', x: 19, y: 5 },
      { id: 'gems_shards', x: 13, y: 17 },
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
