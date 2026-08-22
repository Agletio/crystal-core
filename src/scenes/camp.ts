/**
 * THE CAMP, as a PICTURE — *"build it not using the tile sets and just use art
 * and then make objects clickable on it… we don't need the characters to move
 * around."* No map, no carve, no walk. EVERY NUMBER HERE IS IN THE ART'S OWN
 * PIXELS; `src/ui/camp.ts` scales the lot by one factor, so a hotspot cannot
 * drift off what it sits on.
 */

/** A rectangle you CLICK. `opens` names a screen, `room` names a scene. */
export interface Hotspot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  opens: 'fissure' | 'craft' | 'stash' | 'character' | 'socket' | 'room';
  slot?: number; // which of `RUN_SLOTS`, for a socket in the rock
  room?: string; // which `SceneDef`, for somebody standing about
  says: string;
}

export const CAMP_ART = 'camp';

/** THE FOUR SOCKETS in the rock ARE the four `RUN_SLOTS`: clicking one is
 *  clicking that socket, and what is in it is drawn over it. */
export const CAMP_HOTSPOTS: Hotspot[] = [
  {
    id: 'crack',
    x: 300, y: 0, w: 80, h: 250,
    opens: 'fissure',
    says: 'The crack. It goes down a long way, and it is always open.',
  },
  { id: 'socket0', x: 222, y: 30, w: 76, h: 76, opens: 'socket', slot: 0, says: 'A socket cut into the rock.' },
  { id: 'socket1', x: 392, y: 30, w: 76, h: 76, opens: 'socket', slot: 1, says: 'A socket cut into the rock.' },
  { id: 'socket2', x: 220, y: 118, w: 76, h: 76, opens: 'socket', slot: 2, says: 'A socket cut into the rock.' },
  { id: 'socket3', x: 392, y: 120, w: 76, h: 76, opens: 'socket', slot: 3, says: 'A socket cut into the rock.' },
  {
    id: 'bench',
    x: 14, y: 186, w: 172, h: 116,
    opens: 'craft',
    says: 'Your bench. Somewhere to pour a currency over a piece and see what it does.',
  },
  {
    id: 'shelf',
    x: 618, y: 174, w: 68, h: 152,
    opens: 'stash',
    says: 'The shelf. What you are not carrying, and what you meant to come back for.',
  },
  // The FABRIC: a rectangle round the guy ropes reaches the socket and the shelf.
  {
    id: 'tent',
    x: 470, y: 136, w: 148, h: 166,
    opens: 'character',
    says: 'Your tent. What you are wearing, and what it comes to.',
  },
];

/** Where the hero stands: his FEET, on the open grass in front of the split. */
export const CAMP_STAND = { x: 344, y: 306 };

/** Art pixels a sprite pixel: measured against the tent, not chosen. */
export const CAMP_HERO_SCALE = 2;

/** Where somebody you have MET stands, in the order you met them. */
export const CAMP_SPOTS = [
  { x: 214, y: 302 },
  { x: 474, y: 322 },
  { x: 150, y: 332 },
  { x: 566, y: 300 },
  { x: 262, y: 350 },
];

/** WHAT MOVES: light breathing over what burns. `period` is a cycle, seconds. */
export const CAMP_GLOW = [
  { id: 'crack', x: 292, y: 0, w: 96, h: 272, hue: '#fcde6f', period: 5.2, depth: 0.2 },
  { id: 'fire', x: 166, y: 292, w: 120, h: 92, hue: '#ff9a3c', period: 1.7, depth: 0.32 },
];

/** The band the gusts blow across: the grass, and never the rock above it. */
export const CAMP_WIND = { x: 0, y: 232, w: 688, h: 152 };
