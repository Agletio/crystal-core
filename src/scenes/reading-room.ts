/**
 * The Lambengolmor, who believes the crystal is writing and has gone to live
 * in it. He hands over the NAME, which is a key for the Fissure's fifth
 * socket — in the camp, once, and in person. What it calls up is called up
 * down the crack.
 */
import type { SceneDef } from '../scenes';

export const READING_ROOM: SceneDef = {
  id: 'reading_room',
  who: 'lambengolmor',
  name: 'The Lambengolmor',
  theme: 'prismatic',
  said: 'A room somebody swept. The walls are covered in marks and none of them are yours.',
  greets:
    'Do not thank me. You have no idea what you have just walked past. Find me above and I will tell you what he has you doing.',
  idles:
    'Set more of them in the wall. I want you to have read a little further before I hand you the rest of it.',
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
