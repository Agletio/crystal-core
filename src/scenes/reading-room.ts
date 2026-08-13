/**
 * The Lambengolmor's room: large and round, cut out of the Cavern's own rock
 * because he believes the crystal is writing and he has gone to live in it.
 *
 * The one room in the game with a fight in it. He says his piece, the rock
 * answers to its name, and he says the rest once it is down.
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
      { id: 'shelf', x: 3, y: 2 },
      { id: 'shelf', x: 4, y: 2 },
      { id: 'shelf', x: 5, y: 2 },
      { id: 'shelf', x: 9, y: 2 },
      { id: 'shelf', x: 10, y: 2 },
      { id: 'shelf', x: 11, y: 2 },
      { id: 'shelf', x: 17, y: 3 },
      { id: 'shelf', x: 18, y: 3 },
      { id: 'shelf', x: 19, y: 3 },
      { id: 'shelf', x: 2, y: 8 },
      { id: 'shelf', x: 2, y: 9 },
      { id: 'shelf', x: 19, y: 9 },
      { id: 'shelf', x: 19, y: 10 },
      { id: 'shelf', x: 9, y: 15 },
      { id: 'shelf', x: 10, y: 15 },
      { id: 'shelf', x: 11, y: 15 },
      { id: 'bench', x: 14, y: 7 },
      { id: 'bench', x: 15, y: 7 },
      { id: 'bench', x: 16, y: 7 },
      { id: 'lantern_lit', x: 13, y: 5 },
      { id: 'lantern_lit', x: 6, y: 6 },
      { id: 'lantern_lit', x: 17, y: 12 },
      { id: 'lantern_dark', x: 4, y: 12 },
      { id: 'lantern_dark', x: 13, y: 15 },
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
      said: 'Everything down here has a true name and everything down here can be told. Watch. I am going to call this one and you are going to see it turn round.',
      act: 'work',
    },
  ],
  after: [
    {
      said: 'It heard me. You saw it hear me. That is the whole argument and I have just made it.',
      act: 'face',
    },
    {
      said: 'Go back and tell him. He will say I am wrong and he will not say why, because he does not know why. Keep setting them if you like. Somebody should be watching what wakes up.',
      act: 'face',
    },
  ],
  encounter: 'answering',
};
