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
  rung: 3, // early in the zone: his whole objection is to what you are already doing
  said: 'A room somebody swept. The walls are covered in marks and none of them are yours.',
  greets:
    "Keep your hands off the wall. Those marks are a sentence, and you are smudging it. Find me above. I would prefer you knew what you were disturbing.",
  idles:
    "You have only begun the sentence. Set more crystals in the wall. I will give you the rest when you are ready.",
  beats: [
    {
      said: "Before you set another crystal in the wall: has the Lampwright told you what you are doing?",
      act: 'face',
    },
    {
      said: "He calls them fuel. They are punctuation. Each crystal gives voice to another mark, and he has never troubled himself to read the sentence.",
      act: 'pace',
    },
    {
      said: `Everything below has a true name. To know it is to be heard. That is the teaching of ${ORDER.name}. I am the last of us this far down. These three marks name something old. I copied them from a wall no one was meant to reach.`,
      act: 'work',
    },
    {
      said: "Set the name beside the crystals. Speak it where the rock is thin. Something will answer. Then you may judge the Lampwright and me for yourself.",
      act: 'face',
    },
  ],
  encounter: null,
  gives: 'written_name',
};
