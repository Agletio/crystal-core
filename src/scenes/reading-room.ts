/**
 * The Glasswright, OF THE OBSIDIAN ORDER — obsidian is glass, and reading what
 * is written in it is the whole of what the Order is for. He believes the
 * crystal is writing and has gone to live in it. His title answers the
 * Lampwright's on purpose: the two of them disagree, and the echo says so.
 *
 * He hands over the NAME, a key for the Fissure's fifth socket — in the camp,
 * once, and in person. What it calls up is called up down the crack.
 */
import { ORDER } from '../data';
import type { SceneDef } from '../scenes';

export const READING_ROOM: SceneDef = {
  id: 'reading_room',
  who: 'glasswright',
  name: 'The Glasswright',
  theme: 'prismatic',
  said: 'A room somebody swept. The walls are covered in marks and none of them are yours.',
  greets:
    'Do not touch the wall. You are standing in the middle of a sentence and you cannot read it. Come and find me above and I will tell you whose it is.',
  idles:
    'Set more of them in the wall. Read a little further, and then I will hand you the rest of it.',
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
      said: `Everything down here has a true name and can be told. That is ${ORDER.name}, and I am the last of us this far down. This one I have written out for you — three marks, copied off a wall nobody was meant to reach.`,
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
