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
  opens:
    | 'fissure' | 'craft' | 'stash' | 'character'
    | 'socket' | 'trials' | 'room' | 'work' | 'forge';
  slot?: number; // which of `RUN_SLOTS`, for a socket in the rock
  room?: string; // which `SceneDef`, for somebody standing about
  family?: string; // which `MATERIAL_FAMILIES` tab, for a station
  says: string;
}

export const CAMP_ART = 'camp';

/** THE FOUR SOCKETS in the rock ARE the four `RUN_SLOTS`: clicking one is
 *  clicking that socket, and what is in it is drawn over it. */
export const CAMP_HOTSPOTS: Hotspot[] = [
  {
    id: 'crack',
    x: 308, y: 0, w: 64, h: 215,
    opens: 'fissure',
    says: 'The crack. It goes down a long way, and it is always open.',
  },
  // FOUR of the SIX hollows drawn: the spare pair has nothing pointing at it.
  { id: 'socket0', x: 212, y: 39, w: 42, h: 51, opens: 'socket', slot: 0, says: 'A socket cut into the rock.' },
  { id: 'socket1', x: 430, y: 37, w: 42, h: 53, opens: 'socket', slot: 1, says: 'A socket cut into the rock.' },
  { id: 'socket2', x: 254, y: 72, w: 50, h: 46, opens: 'socket', slot: 2, says: 'A socket cut into the rock.' },
  { id: 'socket3', x: 380, y: 72, w: 49, h: 47, opens: 'socket', slot: 3, says: 'A socket cut into the rock.' },
  {
    id: 'bench',
    x: 176, y: 120, w: 78, h: 54,
    opens: 'craft',
    says: 'Your bench. Somewhere to pour a currency over a piece and see what it does.',
  },
  {
    id: 'shelf',
    x: 122, y: 88, w: 54, h: 84,
    opens: 'stash',
    says: 'The shelf. What you are not carrying, and what you meant to come back for.',
  },
  {
    id: 'fire',
    x: 308, y: 222, w: 76, h: 52,
    opens: 'trials',
    says: 'The fire. The Reckoning: what the rock owes you, and what it is costing.',
  },
  {
    id: 'tent',
    x: 532, y: 106, w: 98, h: 86,
    opens: 'character',
    says: 'Your tent. What you are wearing, and what it comes to.',
  },
  // THE ANVIL is where a base is MADE, which is a different verb from the
  // bench's: materials decide what a piece IS and currency what is on it.
  {
    id: 'anvil',
    x: 158, y: 224, w: 40, h: 40,
    opens: 'forge',
    says: 'The anvil. What a heap of worked material could be made into.',
  },
  // SIX STATIONS, one a profession, and every one of them a door into the same
  // room on its own tab. Measured off `camp_ground.png` rather than by eye.
  {
    id: 'smelter',
    x: 28, y: 120, w: 92, h: 87,
    opens: 'work', family: 'metal',
    says: 'The smelter. Ore in, bars out, and it works while you are down there.',
  },
  {
    id: 'loom',
    x: 401, y: 123, w: 46, h: 62,
    opens: 'work', family: 'cloth',
    says: 'The loom. Fibre into bolts.',
  },
  {
    id: 'tannery',
    x: 463, y: 128, w: 46, h: 51,
    opens: 'work', family: 'hide',
    says: 'The tanning frame. Skins into leather.',
  },
  {
    id: 'kitchen',
    x: 488, y: 204, w: 43, h: 65,
    opens: 'work', family: 'fish',
    says: 'The kitchen. What you hauled out of a pool, made worth eating.',
  },
  {
    id: 'jeweller',
    x: 472, y: 325, w: 62, h: 41,
    opens: 'work', family: 'gem',
    says: "The jeweller's. Rough stone, cut.",
  },
];

/** Where the hero stands: his FEET, on the beaten ground below the split. */
export const CAMP_STAND = { x: 344, y: 300 };

/** Art pixels a sprite pixel, measured against the TENT: the wider camera took
 *  it from 166 tall to 86, so this halved with it. */
export const CAMP_HERO_SCALE = 1;

/** Where somebody MET stands, in order. All open ground. */
export const CAMP_SPOTS = [
  { x: 250, y: 202 },
  { x: 430, y: 210 },
  { x: 120, y: 252 },
  { x: 560, y: 250 },
  { x: 300, y: 330 },
];

/** Where a WORKER stands: idle, by the tent, in order; working, at the foot of
 *  the station of the job, keyed by the material family — so the picture says
 *  who is busy before the screen does. */
export const CAMP_WORKER_SPOTS = [
  { x: 598, y: 218 },
  { x: 646, y: 240 },
  { x: 556, y: 244 },
  { x: 618, y: 262 },
];
export const CAMP_STATION_FOOT: Record<string, { x: number; y: number }> = {
  metal: { x: 78, y: 218 },
  cloth: { x: 424, y: 196 },
  hide: { x: 486, y: 190 },
  fish: { x: 470, y: 276 },
  gem: { x: 456, y: 372 },
};

/** WHAT MOVES: light breathing over what burns, `period` a cycle in seconds.
 *  The furnace is drawn lit, so still light on it would read painted. */
export const CAMP_GLOW = [
  { id: 'crack', x: 304, y: 0, w: 72, h: 205, hue: '#fcde6f', period: 5.2, depth: 0.2 },
  { id: 'fire', x: 300, y: 214, w: 92, h: 68, hue: '#ff9a3c', period: 1.7, depth: 0.32 },
  { id: 'furnace', x: 42, y: 143, w: 48, h: 44, hue: '#ff9a3c', period: 2.9, depth: 0.26 },
];

/** The band the gusts blow across: the ground, and never the rock above it. */
export const CAMP_WIND = { x: 0, y: 150, w: 688, h: 234 };
