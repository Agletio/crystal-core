/**
 * Armour and weapons as layers over the figure in `body.ts`.
 *
 * A family is four pieces, not twelve: tier 1 is the bare shape, and `TRIM`
 * characters are dropped at tier 1, drawn dull at tier 2 and lit at tier 3. A
 * family's look lives in one place and its ladder is a rule.
 *
 * Every grid is authored against the neutral pose. Boots get a frame per walk
 * step because feet are the one thing a shift cannot fake.
 */
export { mix } from './renderer';
import { mix } from './renderer';
import type { Palette } from './renderer';

/**
 * A piece is drawn in five inks — `p` mass, `P` lit, `d` shadow, `x` trim and
 * `X` lit trim — and the FAMILY decides what those five are. Twelve sets share
 * one alphabet in the source and none of them share a colour on screen.
 *
 * Outside a family: `#` ink · `w` haft · `m` metal · `M` metal lit · `g` gem.
 */
export const TRIM = 'x';
export const TRIM_LIT = 'X';

export interface FamilyTone {
  mass: (p: Palette) => string;
  lit: (p: Palette) => string;
  dark: (p: Palette) => string;
  trim: (p: Palette) => string;
  trimLit: (p: Palette) => string;
}

/**
 * Only the rows a piece actually draws; the rest of the cell is empty. Curried
 * on the grid, because art is authored at whatever size suits it and the
 * pipeline reads the size off the art rather than assuming one.
 */
export const gridRows =
  (grid: number) =>
  (from: Record<number, string>): string[] =>
    Array.from({ length: grid }, (_, y) => from[y] ?? '.'.repeat(grid));

/** The paper doll's own size: body and armour must share one grid. */
export const DOLL_GRID = 16;
export const rows = gridRows(DOLL_GRID);

export interface FamilyArt {
  tone: FamilyTone;
  helmet: string[];
  body: string[];
  gloves: string[];
  /** One per walk frame. */
  boots: [string[], string[]];
}

/** Siege plate. Forged iron with a core that goes from banked to molten. */
const BULWARK: FamilyArt = {
  tone: {
    mass: (p) => mix(p.rust, p.rockDeep, 0.5),
    lit: (p) => mix(p.rust, p.citrine, 0.35),
    dark: (p) => mix(p.rust, p.void, 0.62),
    trim: (p) => mix(p.ember, p.rockDeep, 0.4),
    trimLit: (p) => p.flame,
  },
  helmet: rows({
    1: '.....#pp#.......',
    2: '....#pXXp#......',
    3: '...#pPPPPp#.....',
    4: '...#d####d#.....',
    5: '...#pdxxdp#.....',
    6: '....#dppd#......',
    7: '.....#dd#.......',
  }),
  body: rows({
    6: '..#pppppp#......',
    7: '.#PpddddpP#.....',
    8: '.#Ppd##dpP#p....',
    9: '..#pdXXdp#......',
    10: '..#pddddp#......',
    11: '..#pdxxdp#......',
    12: '..#p#dd#p#......',
    13: '...#.##.#.......',
  }),
  gloves: rows({
    8: '.#pP#....#dPp#..',
    9: '.#pd#....#PXXp#.',
    10: '.####.....#pp#..',
  }),
  boots: [
    rows({
      11: '..#pd#..#dp#....',
      12: '..#pX#..#Xp#....',
      13: '..#pp#..#pp#....',
      14: '.#dPPd..dPPd#...',
      15: '.#####..#####...',
    }),
    rows({
      11: '.#pd#....#dp#...',
      12: '.#pX#....#Xp#...',
      13: '.#pp#....#pp#...',
      14: '#dPPd....dPPd#..',
      15: '#####....#####..',
    }),
  ],
};

/** Plate cut for going forward: a bladed crest, spiked pauldrons, greaves. */
const VANGUARD: FamilyArt = {
  tone: {
    mass: (p) => mix(p.quartz, p.rockDeep, 0.45),
    lit: (p) => mix(p.quartz, p.chalk, 0.4),
    dark: (p) => mix(p.quartz, p.void, 0.6),
    trim: (p) => mix(p.ember, p.rockDeep, 0.3),
    trimLit: (p) => p.ember,
  },
  helmet: rows({
    1: '......#X#.......',
    2: '....##pxp##.....',
    3: '...#pPPPPp#.....',
    4: '...#d####d#.....',
    5: '...#pdddpd#.....',
    6: '....#dPPd#......',
    7: '.....#dd#.......',
  }),
  body: rows({
    6: '.x#pppppp#x.....',
    7: '#XPpddddpPX#....',
    8: '.#Ppd##dpP#p....',
    9: '..#pdddddp#.....',
    10: '..#pxdddxp#.....',
    11: '..#pdddddp#.....',
    12: '..#p#dd#p#......',
    13: '...#.##.#.......',
  }),
  gloves: rows({
    8: '.#pP#....#dPp#..',
    9: '.#px#....#PXxp#.',
    10: '.####.....#pp#..',
  }),
  boots: [
    rows({
      12: '..#pd#..#dp#....',
      13: '..#pP#..#Pp#....',
      14: '.#dpXd..dXpd#...',
      15: '.#####..#####...',
    }),
    rows({
      12: '.#pd#....#dp#...',
      13: '.#pP#....#Pp#...',
      14: '#dpXd....dXpd#..',
      15: '#####....#####..',
    }),
  ],
};

/** No plate at all: a tall pointed hood and a robe to the floor, lit from within. */
const ARCANIST: FamilyArt = {
  tone: {
    mass: (p) => mix(p.amethyst, p.void, 0.35),
    lit: (p) => mix(p.amethyst, p.chalk, 0.35),
    dark: (p) => mix(p.amethyst, p.void, 0.68),
    trim: (p) => mix(p.quartz, p.rockDeep, 0.3),
    trimLit: (p) => p.quartz,
  },
  helmet: rows({
    0: '......##........',
    1: '.....#pp#.......',
    2: '....#pPPp#......',
    3: '...#pP##Pp#.....',
    4: '...#pd..dp#.....',
    5: '...#pdxxdp#.....',
    6: '....#dppd#......',
    7: '.....#dd#.......',
  }),
  body: rows({
    6: '...#pppp#.......',
    7: '..#pPddPp#......',
    8: '..#pdXXdp#p.....',
    9: '..#pdXXdp#......',
    10: '..#pddddp#......',
    11: '..#pdxxdp#......',
    12: '..#pddddp#......',
    13: '..#pd##dp#......',
    14: '..#p#..#p#......',
    15: '..##....##......',
  }),
  gloves: rows({
    8: '.#pP#....#dPp#..',
    9: '.#pd#....#PXXp#.',
    10: '.####.....#pp#..',
  }),
  boots: [
    rows({
      14: '...#pd..dp#.....',
      15: '...#XP..PX#.....',
    }),
    rows({
      14: '..#pd....dp#....',
      15: '..#XP....PX#....',
    }),
  ],
};

/** A seer's veil over a stole. Nothing armoured; the sigils do the work. */
const ORACLE: FamilyArt = {
  tone: {
    mass: (p) => mix(p.verdite, p.rockDeep, 0.42),
    lit: (p) => mix(p.verdite, p.chalk, 0.35),
    dark: (p) => mix(p.verdite, p.void, 0.6),
    trim: (p) => mix(p.citrine, p.rockDeep, 0.35),
    trimLit: (p) => p.citrine,
  },
  helmet: rows({
    1: '....##pp##......',
    2: '...#pPPPPp#.....',
    3: '...#pd##dp#.....',
    4: '...#px..xp#.....',
    5: '...#pdddpd#.....',
    6: '....#dPPd#......',
    7: '.....#dd#.......',
  }),
  body: rows({
    6: '...#pppp#.......',
    7: '..#pPddPp#......',
    8: '..#xdXXdx#p.....',
    9: '..#pddddp#......',
    10: '..#xdddx#.......',
    11: '..#pdddp#.......',
    12: '..#xdddx#.......',
    13: '..#pd#dp#.......',
    14: '..#P#.#P#.......',
    15: '..##...##.......',
  }),
  gloves: rows({
    8: '.#pd#....#dPp#..',
    9: '.#px#....#PXxp#.',
    10: '.####.....#pp#..',
  }),
  boots: [
    rows({
      14: '...#pd..dp#.....',
      15: '...#XP..PX#.....',
    }),
    rows({
      14: '..#pd....dp#....',
      15: '..#XP....PX#....',
    }),
  ],
};

/** A low hood over a mask, wrapped arms, split leathers. Nothing catches light. */
const SHADOW: FamilyArt = {
  tone: {
    mass: (p) => mix(p.seam, p.void, 0.42),
    lit: (p) => mix(p.seam, p.chalk, 0.25),
    dark: (p) => mix(p.void, p.seam, 0.2),
    trim: (p) => mix(p.venom, p.rockDeep, 0.35),
    trimLit: (p) => p.venom,
  },
  helmet: rows({
    2: '....######......',
    3: '...#pPddPp#.....',
    4: '...#dxxxxd#.....',
    5: '...#pddddp#.....',
    6: '....#dPPd#......',
    7: '.....#dd#.......',
  }),
  body: rows({
    6: '...#pppp##......',
    7: '..#pPddPp#......',
    8: '..#pdxxdp#p.....',
    9: '..#pddddp#......',
    10: '..#Pdddd P#.....',
    11: '..#pdXXdp#......',
    12: '..#pd##dp#......',
    13: '...#....#.......',
  }),
  gloves: rows({
    8: '.#pd#....#dpp#..',
    9: '.#px#....#PXXp#.',
    10: '.####.....#dd#..',
  }),
  boots: [
    rows({
      12: '..#pd#..#dp#....',
      13: '..#px#..#xp#....',
      14: '..#pP#..#Pp#....',
      15: '..####..####....',
    }),
    rows({
      12: '.#pd#....#dp#...',
      13: '.#px#....#xp#...',
      14: '.#pP#....#Pp#...',
      15: '.####....####...',
    }),
  ],
};

/** A studded cap and jerkin with a strap across it. Light enough to run in. */
const SKIRMISHER: FamilyArt = {
  tone: {
    mass: (p) => mix(p.ember, p.rockDeep, 0.55),
    lit: (p) => mix(p.ember, p.citrine, 0.3),
    dark: (p) => mix(p.ember, p.void, 0.65),
    trim: (p) => mix(p.chalk, p.rockDeep, 0.4),
    trimLit: (p) => p.chalk,
  },
  helmet: rows({
    2: '....######......',
    3: '...#pxPPxp#.....',
    4: '...#pd##dp#.....',
    5: '....#dppd#......',
    6: '.....####.......',
  }),
  body: rows({
    6: '...#pppp#.......',
    7: '..#pPddxp#......',
    8: '..#pdxddp#p.....',
    9: '..#pddxdp#......',
    10: '..#pdddxp#......',
    11: '..#pddddp#......',
    12: '..#pd##dp#......',
    13: '...#....#.......',
  }),
  gloves: rows({
    8: '.#pd#....#dpp#..',
    9: '.#pp#....#PXXp#.',
    10: '.####.....#dd#..',
  }),
  boots: [
    rows({
      13: '..#pd#..#dp#....',
      14: '..#pX#..#Xp#....',
      15: '..#PP#..#PP#....',
    }),
    rows({
      13: '.#pd#....#dp#...',
      14: '.#pX#....#Xp#...',
      15: '.#PP#....#PP#...',
    }),
  ],
};

/** A warrior-priest: plate under a hanging robe, crowned helm, sigil alight. */
const TEMPLAR: FamilyArt = {
  tone: {
    mass: (p) => mix(p.amethyst, p.rockDeep, 0.42),
    lit: (p) => mix(p.amethyst, p.chalk, 0.42),
    dark: (p) => mix(p.amethyst, p.void, 0.62),
    trim: (p) => mix(p.citrine, p.rockDeep, 0.38),
    trimLit: (p) => p.citrine,
  },
  helmet: rows({
    1: '....x#..#x......',
    2: '...#Xp##pX#.....',
    3: '..#XPpppPX#.....',
    4: '..#xd####dx#....',
    5: '...#pdxxdp#.....',
    6: '....#dPPd#......',
    7: '.....#dd#.......',
  }),
  body: rows({
    6: '.#Pp#pppp#pP#...',
    7: '.#pd#dddd#dp#...',
    8: '..#xdXXddx#p....',
    9: '..#pdXXddp#.....',
    10: '..#pdddddp#.....',
    11: '..#xdddddx#.....',
    12: '..#pd#.#dp#.....',
    13: '..#P#...#P#.....',
    14: '...#.....#......',
  }),
  gloves: rows({
    8: '.#pX#....#dPp#..',
    9: '.#pd#....#PXXp#.',
    10: '.####.....#pp#..',
  }),
  boots: [
    rows({
      11: '..#px#..#xp#....',
      12: '..#pd#..#dp#....',
      13: '..#pP#..#Pp#....',
      14: '.#dPXd..dXPd#...',
      15: '.#####..#####...',
    }),
    rows({
      11: '.#px#....#xp#...',
      12: '.#pd#....#dp#...',
      13: '.#pP#....#Pp#...',
      14: '#dPXd....dXPd#..',
      15: '#####....#####..',
    }),
  ],
};

/** Grey stone plate with cut channels. The runes are the only thing that is lit. */
const RUNEGUARD: FamilyArt = {
  tone: {
    mass: (p) => mix(p.rock, p.rockDeep, 0.4),
    lit: (p) => mix(p.rock, p.chalk, 0.35),
    dark: (p) => mix(p.rockDeep, p.void, 0.35),
    trim: (p) => mix(p.quartz, p.rockDeep, 0.25),
    trimLit: (p) => p.quartz,
  },
  helmet: rows({
    2: '....######......',
    3: '...#pPxxPp#.....',
    4: '...#d####d#.....',
    5: '...#pxddxp#.....',
    6: '....#dppd#......',
    7: '.....#dd#.......',
  }),
  body: rows({
    6: '..#pppppp#......',
    7: '.#PpdxxdpP#.....',
    8: '.#Ppd##dpP#p....',
    9: '..#pxddxp#......',
    10: '..#pdddpd#......',
    11: '..#pxddxp#......',
    12: '..#p#dd#p#......',
    13: '...#.##.#.......',
  }),
  gloves: rows({
    8: '.#pP#....#dPp#..',
    9: '.#px#....#PXxp#.',
    10: '.####.....#pp#..',
  }),
  boots: [
    rows({
      12: '..#px#..#xp#....',
      13: '..#pd#..#dp#....',
      14: '.#dPpd..dpPd#...',
      15: '.#####..#####...',
    }),
    rows({
      12: '.#px#....#xp#...',
      13: '.#pd#....#dp#...',
      14: '#dPpd....dpPd#..',
      15: '#####....#####..',
    }),
  ],
};

/** Horned cowl over layered silk. A poisoner's colours: void, and something green. */
const NIGHTWEAVE: FamilyArt = {
  tone: {
    mass: (p) => mix(p.venom, p.void, 0.55),
    lit: (p) => mix(p.venom, p.chalk, 0.3),
    dark: (p) => mix(p.void, p.venom, 0.15),
    trim: (p) => mix(p.venom, p.citrine, 0.35),
    trimLit: (p) => mix(p.verdite, p.chalk, 0.25),
  },
  helmet: rows({
    1: '...x#....#x.....',
    2: '...#Xp##pX#.....',
    3: '...#pPddPp#.....',
    4: '...#dx..xd#.....',
    5: '...#pddddp#.....',
    6: '....#dPPd#......',
    7: '.....#dd#.......',
  }),
  body: rows({
    6: '...#pppp#.......',
    7: '..#pPddPp#......',
    8: '..#xdXXdx#p.....',
    9: '..#pddddp#......',
    10: '..#Pddddp#......',
    11: '..#xddddx#......',
    12: '..#pdd#dp#......',
    13: '..#P#..#P#......',
    14: '..##....##......',
  }),
  gloves: rows({
    8: '.#pd#....#dpp#..',
    9: '.#px#....#PXXp#.',
    10: '.####.....#dd#..',
  }),
  boots: [
    rows({
      13: '..#pd#..#dp#....',
      14: '..#px#..#xp#....',
      15: '..#PP#..#PP#....',
    }),
    rows({
      13: '.#pd#....#dp#...',
      14: '.#px#....#xp#...',
      15: '.#PP#....#PP#...',
    }),
  ],
};

/** A wrapped cowl and loose robes, bone-pale. It moves before you hear it. */
const WHISPER: FamilyArt = {
  tone: {
    mass: (p) => mix(p.bone, p.rockDeep, 0.45),
    lit: (p) => mix(p.bone, p.chalk, 0.4),
    dark: (p) => mix(p.bone, p.void, 0.62),
    trim: (p) => mix(p.verdite, p.rockDeep, 0.3),
    trimLit: (p) => p.verdite,
  },
  helmet: rows({
    1: '.....####.......',
    2: '....#pPPp#......',
    3: '...#pd##dp#.....',
    4: '...#px..xp#.....',
    5: '...#pddddp#.....',
    6: '....#dPPd#......',
    7: '.....#pp#.......',
  }),
  body: rows({
    6: '...#pppp#.......',
    7: '..#pPddPp#......',
    8: '..#pdxxdp#p.....',
    9: '..#Pddddp#......',
    10: '..#pdxxdp#......',
    11: '..#pddddP#......',
    12: '..#pdd#dp#......',
    13: '..#p#..#p#......',
    14: '..#P....#P#.....',
    15: '..##.....##.....',
  }),
  gloves: rows({
    8: '.#pd#....#dpp#..',
    9: '.#pP#....#PXXp#.',
    10: '.####.....#pp#..',
  }),
  boots: [
    rows({
      14: '...#pd..dp#.....',
      15: '...#XP..PX#.....',
    }),
    rows({
      14: '..#pd....dp#....',
      15: '..#XP....PX#....',
    }),
  ],
};

/** Horned helm and a fur mantle over mail. Built for weather, not for a duel. */
const RAIDER: FamilyArt = {
  tone: {
    mass: (p) => mix(p.ember, p.void, 0.5),
    lit: (p) => mix(p.ember, p.citrine, 0.35),
    dark: (p) => mix(p.ember, p.void, 0.72),
    trim: (p) => mix(p.bone, p.rockDeep, 0.3),
    trimLit: (p) => p.bone,
  },
  helmet: rows({
    1: '..x#......#x....',
    2: '..#Xp####pX#....',
    3: '...#pPddPp#.....',
    4: '...#d####d#.....',
    5: '...#pddddp#.....',
    6: '....#dppd#......',
    7: '.....#dd#.......',
  }),
  body: rows({
    6: '.x#pppppp#x.....',
    7: '#XPpddddpPX#....',
    8: '.#pdd##ddp#p....',
    9: '..#pdxxdp#......',
    10: '..#pddddp#......',
    11: '..#pdxxdp#......',
    12: '..#pd##dp#......',
    13: '...#.##.#.......',
  }),
  gloves: rows({
    8: '.#pX#....#dpp#..',
    9: '.#pd#....#PXXp#.',
    10: '.####.....#dd#..',
  }),
  boots: [
    rows({
      12: '..#pd#..#dp#....',
      13: '..#pX#..#Xp#....',
      14: '.#dpPd..dPpd#...',
      15: '.#####..#####...',
    }),
    rows({
      12: '.#pd#....#dp#...',
      13: '.#pX#....#Xp#...',
      14: '#dpPd....dPpd#..',
      15: '#####....#####..',
    }),
  ],
};

/** A plumed wide brim, a fitted coat and a sash. Light plate, worn like clothes. */
const DUELIST: FamilyArt = {
  tone: {
    mass: (p) => mix(p.rust, p.void, 0.45),
    lit: (p) => mix(p.rust, p.citrine, 0.45),
    dark: (p) => mix(p.rust, p.void, 0.7),
    trim: (p) => mix(p.citrine, p.rockDeep, 0.3),
    trimLit: (p) => p.citrine,
  },
  helmet: rows({
    1: '.......#X#......',
    2: '....####px#.....',
    3: '..##pPPPp##.....',
    4: '..#dpd##dpd#....',
    5: '...#pddddp#.....',
    6: '....#dPPd#......',
  }),
  body: rows({
    6: '...#pppp##......',
    7: '..#pPddPp#......',
    8: '..#pdXXdp#p.....',
    9: '..#Pdddxp#......',
    10: '..#pdxdddP#.....',
    11: '..#pddddp#......',
    12: '..#pd##dp#......',
    13: '..#P#..#P#......',
    14: '..##....##......',
  }),
  gloves: rows({
    8: '.#pX#....#dPp#..',
    9: '.#pd#....#PXXp#.',
    10: '.####.....#pp#..',
  }),
  boots: [
    rows({
      12: '..#pd#..#dp#....',
      13: '..#pX#..#Xp#....',
      14: '..#pP#..#Pp#....',
      15: '.#dPPd..dPPd#...',
    }),
    rows({
      12: '.#pd#....#dp#...',
      13: '.#pX#....#Xp#...',
      14: '.#pP#....#Pp#...',
      15: '#dPPd....dPPd#..',
    }),
  ],
};

export const FAMILY_ART: Record<string, FamilyArt> = {
  bulwark: BULWARK,
  vanguard: VANGUARD,
  arcanist: ARCANIST,
  oracle: ORACLE,
  shadow: SHADOW,
  skirmisher: SKIRMISHER,
  templar: TEMPLAR,
  runeguard: RUNEGUARD,
  nightweave: NIGHTWEAVE,
  whisper: WHISPER,
  raider: RAIDER,
  duelist: DUELIST,
};

/**
 * Weapons, drawn against the grip at (11, 9): hanging at rest, and swung round
 * on the strike. Two grids rather than a rotation, because turning a 16-grid
 * sprite by anything but a quarter is how pixel art stops being pixel art.
 */
export interface WeaponArt {
  rest: string[];
  strike: string[];
}

export const WEAPON_ART: Record<string, WeaponArt> = {
  // A cut branch, barely worked. The stone at the tip is chipped.
  ash_wand: {
    rest: rows({
      9: '..........##....',
      10: '...........#w#..',
      11: '............#w#.',
      12: '.............#g#',
      13: '..............#.',
    }),
    strike: rows({
      8: '..........##....',
      9: '...........#w#..',
      10: '............#w#.',
      11: '.............#g#',
      12: '..............#.',
    }),
  },
  // Turned and ringed, with a set stone.
  carved_wand: {
    rest: rows({
      9: '..........##....',
      10: '..........#w#...',
      11: '...........#M#..',
      12: '...........#w#..',
      13: '............#g#.',
      14: '.............#..',
    }),
    strike: rows({
      7: '..........##....',
      8: '..........#w#...',
      9: '...........#M#..',
      10: '...........#w#..',
      11: '............#g#.',
      12: '.............#..',
    }),
  },
  // A shard of the rock itself, bound at the grip.
  quartz_wand: {
    rest: rows({
      9: '..........##....',
      10: '..........#w#...',
      11: '...........#g#..',
      12: '...........#g#..',
      13: '............#g#.',
      14: '.............##.',
    }),
    strike: rows({
      7: '..........##....',
      8: '..........#w#...',
      9: '...........#g#..',
      10: '...........#g#..',
      11: '............#g#.',
      12: '.............##.',
    }),
  },
  // Long, thin and hooked, with the stone slung underneath.
  whisper_wand: {
    rest: rows({
      9: '..........##....',
      10: '..........#w#...',
      11: '...........#w#..',
      12: '............#w#.',
      13: '............#g#.',
      14: '.............##.',
    }),
    strike: rows({
      6: '..........##....',
      7: '..........#w#...',
      8: '...........#w#..',
      9: '............#w#.',
      10: '............#g#.',
      11: '.............##.',
    }),
  },
  // Notched, pitted, and still the length of your arm.
  rusted_sword: {
    rest: rows({
      8: '..........#w#...',
      9: '.........##w##..',
      10: '..........#mM#..',
      11: '..........#mM#..',
      12: '..........#m.#..',
      13: '..........#mM#..',
      14: '...........##...',
    }),
    strike: rows({
      8: '..........##....',
      9: '.........#wmmM#.',
      10: '..........#####.',
    }),
  },
  // A straight bar with a wide guard and a bright edge.
  iron_sword: {
    rest: rows({
      8: '..........#w#...',
      9: '.........##w##..',
      10: '..........#mM#..',
      11: '..........#mM#..',
      12: '..........#mM#..',
      13: '..........#mM#..',
      14: '...........##...',
    }),
    strike: rows({
      8: '..........##....',
      9: '.........#wmMMM#',
      10: '..........#####.',
    }),
  },
  // A fullered blade with a long guard. Nothing wasted.
  steel_sword: {
    rest: rows({
      7: '..........#w#...',
      8: '..........#w#...',
      9: '........###w###.',
      10: '..........#mM#..',
      11: '..........#mM#..',
      12: '..........#mM#..',
      13: '..........#mM#..',
      14: '..........#mM#..',
      15: '...........##...',
    }),
    strike: rows({
      8: '.........###....',
      9: '........##wmMMM#',
      10: '.........#mMMMM#',
      11: '..........#####.',
    }),
  },
  // A ground-down sliver with cloth for a handle.
  shiv: {
    rest: rows({
      9: '..........#w#...',
      10: '.........##m##..',
      11: '..........#mM#..',
      12: '...........##...',
    }),
    strike: rows({
      9: '.........#wmM#..',
      10: '..........####..',
    }),
  },
  // A needle. No edge to speak of, and it does not need one.
  stiletto: {
    rest: rows({
      8: '..........#w#...',
      9: '.........##m##..',
      10: '..........#M#...',
      11: '..........#M#...',
      12: '..........#M#...',
      13: '...........#....',
    }),
    strike: rows({
      9: '.........#wmMMM#',
      10: '..........####..',
    }),
  },
  // Curved and back-hooked, wrapped to the guard.
  fang: {
    rest: rows({
      8: '..........#w#...',
      9: '.........##m##..',
      10: '..........#mM#..',
      11: '...........#mM#.',
      12: '............#M#.',
      13: '.............#..',
    }),
    strike: rows({
      8: '..........##....',
      9: '.........#wmMM#.',
      10: '..........##mM#.',
      11: '...........###..',
    }),
  },
  // A lump of iron on a stick. It does not pretend otherwise.
  cudgel: {
    rest: rows({
      9: '..........##....',
      10: '..........#w#...',
      11: '.........#mmm#..',
      12: '.........#mMm#..',
      13: '.........#mmm#..',
      14: '..........###...',
    }),
    strike: rows({
      8: '............###.',
      9: '..........##mmm#',
      10: '...........#mMm#',
      11: '............###.',
    }),
  },
  // A flanged head, still warm from the forge.
  ember_maul: {
    rest: rows({
      9: '..........##....',
      10: '..........#w#...',
      11: '.........#mmm#..',
      12: '.........#XXm#..',
      13: '.........#mmm#..',
      14: '..........###...',
    }),
    strike: rows({
      8: '............###.',
      9: '..........##mmm#',
      10: '...........#XXm#',
      11: '............###.',
    }),
  },
  // A spiked head, blue-white where the iron went cold.
  frost_maul: {
    rest: rows({
      9: '..........##....',
      10: '..........#w#...',
      11: '.........#mmM#..',
      12: '.........#mMM#M.',
      13: '.........#mmM#..',
      14: '..........###...',
    }),
    strike: rows({
      8: '............###.',
      9: '..........##mmM#',
      10: '...........#mMM#',
      11: '............###M',
    }),
  },
  // A forked head with a gap the arc jumps across.
  storm_maul: {
    rest: rows({
      9: '..........##....',
      10: '..........#w#...',
      11: '.........#mmM#..',
      12: '.........#mgM#M.',
      13: '.........#mmM#..',
      14: '..........###...',
    }),
    strike: rows({
      8: '............###.',
      9: '..........##mmM#',
      10: '...........#mgM#',
      11: '............###.',
    }),
  },
  // Something's head, mounted. The haft is bound in its hide.
  skull_maul: {
    rest: rows({
      9: '..........##....',
      10: '..........#w#...',
      11: '.........#mMMm#.',
      12: '.........#m##m#.',
      13: '.........#mmmm#.',
      14: '..........####..',
    }),
    strike: rows({
      8: '...........####.',
      9: '.........##mMMm#',
      10: '..........#m##m#',
      11: '...........####.',
    }),
  },
};

/** Keyed by BASE, not by kind: an Ember Maul is not a Cudgel with a tint. */
export const hasWeapon = (base: string): boolean => base in WEAPON_ART;
