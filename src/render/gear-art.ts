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
 * Outside a family: `#` ink · `w` haft · `m` metal · `M` metal lit · `g` gem ·
 * `f` metal still hot.
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
export const DOLL_GRID = 24;
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
    1: '.........###............',
    2: '........#ppp##..........',
    3: '.......#pXXXpp#.........',
    4: '......##pXXXpp#.........',
    5: '.....#ppPPPPPPp#........',
    6: '.....#ddddddddd#........',
    7: '.....#ddddddddd#........',
    8: '.....#ppdxxxddp#........',
    9: '......##dpppdd#.........',
    10: '.......#dpppdd#.........',
    11: '........#ddd##..........',
    12: '.........###............',
  }),
  body: rows({
    8: '.....#########..........',
    9: '....#ppppppppp#.........',
    10: '...##ppppppppp#.........',
    11: '..#PPpddddddppP#.#......',
    12: '..#PPpdd###dppPPPp#.....',
    13: '..#PPpdd###dppPPPp#.....',
    14: '...##pddXXXdpp#..#......',
    15: '....#pddddddpp#.........',
    16: '....#pddddddpp#.........',
    17: '....#pddxxxdpp#.........',
    18: '....#p##ddd#pp#.........',
    19: '....#p##ddd#pp#.........',
    20: '.....#..###.##..........',
  }),
  gloves: rows({
    11: '...###.......#####......',
    12: '..#ppP#.....#ddPpp#.....',
    13: '..#ppP#.....#ddPpp#.....',
    14: '..#ppd#.....#PPXXXp#....',
    15: '...###.......##ppp#.....',
    16: '..............#ppp#.....',
    17: '...............###......',
  }),
  boots: [
    rows({
      16: '.....###......###.......',
      17: '....#pdd#....#dpp#......',
      18: '....#pXX#....#Xpp#......',
      19: '....#pXX#....#Xpp#......',
      20: '...##ppp#...##ppp#......',
      21: '..#ddPPPd#.#ddPPPd#.....',
      22: '..#ddPPPd#.#ddPPPd#.....',
      23: '...######...######......',
    }),
    rows({
      16: '...###.........###......',
      17: '..#ppd#.......#ddp#.....',
      18: '..#ppX#.......#XXp#.....',
      19: '..#ppX#.......#XXp#.....',
      20: '..#ppp##......#ppp##....',
      21: '.#dPPPdd#....#dPPPdd#...',
      22: '.#dPPPdd#....#dPPPdd#...',
      23: '..######......######....',
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
    1: '...........#............',
    2: '.........##X##..........',
    3: '........#ppxpp#.........',
    4: '......###ppxpp#.........',
    5: '.....#ppPPPPPPp#........',
    6: '.....#ddddddddd#........',
    7: '.....#ddddddddd#........',
    8: '.....#ppddddppd#........',
    9: '......##dPPPdd#.........',
    10: '.......#dPPPdd#.........',
    11: '........#ddd##..........',
    12: '.........###............',
  }),
  body: rows({
    8: '..#..#########.##.......',
    9: '.#xxxppppppppp#xx#......',
    10: '.#xxxppppppppp#xx#......',
    11: '.#XPPpddddddppPXX#......',
    12: '..#PPpdd###dppPPPp#.....',
    13: '..#PPpdd###dppPPPp#.....',
    14: '...##pddddddddp#.#......',
    15: '....#pxxddddxxp#........',
    16: '....#pxxddddxxp#........',
    17: '....#pddddddddp#........',
    18: '....#p##ddd#pp#.........',
    19: '....#p##ddd#pp#.........',
    20: '.....#..###.##..........',
  }),
  gloves: rows({
    11: '...###.......#####......',
    12: '..#ppP#.....#ddPpp#.....',
    13: '..#ppP#.....#ddPpp#.....',
    14: '..#ppx#.....#PPXxxp#....',
    15: '...###.......##ppp#.....',
    16: '..............#ppp#.....',
    17: '...............###......',
  }),
  boots: [
    rows({
      17: '.....###......###.......',
      18: '....#pdd#....#dpp#......',
      19: '....#pdd#....#dpp#......',
      20: '...##pPP#...##Ppp#......',
      21: '..#ddpXXd#.#ddXppd#.....',
      22: '..#ddpXXd#.#ddXppd#.....',
      23: '...######...######......',
    }),
    rows({
      17: '...###.........###......',
      18: '..#ppd#.......#ddp#.....',
      19: '..#ppd#.......#ddp#.....',
      20: '..#ppP##......#PPp##....',
      21: '.#dppXdd#....#dXXpdd#...',
      22: '.#dppXdd#....#dXXpdd#...',
      23: '..######......######....',
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
    1: '.........###............',
    2: '........#ppp##..........',
    3: '.......#pPPPpp#.........',
    4: '......##pPPPpp#.........',
    5: '.....#ppP###PPp#........',
    6: '.....#ppd###ddp#........',
    7: '.....#ppd###ddp#........',
    8: '.....#ppdxxxddp#........',
    9: '......##dpppdd#.........',
    10: '.......#dpppdd#.........',
    11: '........#ddd##..........',
    12: '.........###............',
  }),
  body: rows({
    8: '......######............',
    9: '.....#pppppp#...........',
    10: '.....#pppppp##..........',
    11: '....#pPPdddPpp###.......',
    12: '....#pddXXXdpp#pp#......',
    13: '....#pddXXXdpp#pp#......',
    14: '....#pddXXXdpp###.......',
    15: '....#pddddddpp#.........',
    16: '....#pddddddpp#.........',
    17: '....#pddxxxdpp#.........',
    18: '....#pddddddpp#.........',
    19: '....#pddddddpp#.........',
    20: '....#pdd###dpp#.........',
    21: '....#p##...#pp#.........',
    22: '....#p#....#pp#.........',
    23: '.....#......##..........',
  }),
  gloves: rows({
    11: '...###.......#####......',
    12: '..#ppP#.....#ddPpp#.....',
    13: '..#ppP#.....#ddPpp#.....',
    14: '..#ppd#.....#PPXXXp#....',
    15: '...###.......##ppp#.....',
    16: '..............#ppp#.....',
    17: '...............###......',
  }),
  boots: [
    rows({
      20: '......###...###.........',
      21: '.....#ppd#.#ddp#........',
      22: '.....#ppd#.#ddp#........',
      23: '.....#XXP#.#PPX#........',
    }),
    rows({
      20: '.....###......###.......',
      21: '....#pdd#....#dpp#......',
      22: '....#pdd#....#dpp#......',
      23: '....#XPP#....#PXX#......',
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
    1: '.........###............',
    2: '......###ppp###.........',
    3: '.....#ppPPPPPPp#........',
    4: '.....#ppPPPPPPp#........',
    5: '.....#ppd###ddp#........',
    6: '.....#ppx###xxp#........',
    7: '.....#ppx###xxp#........',
    8: '.....#ppddddppd#........',
    9: '......##dPPPdd#.........',
    10: '.......#dPPPdd#.........',
    11: '........#ddd##..........',
    12: '.........###............',
  }),
  body: rows({
    8: '......######............',
    9: '.....#pppppp#...........',
    10: '.....#pppppp##..........',
    11: '....#pPPdddPpp###.......',
    12: '....#xddXXXdxx#pp#......',
    13: '....#xddXXXdxx#pp#......',
    14: '....#pddddddpp###.......',
    15: '....#xdddddx##..........',
    16: '....#xdddddx#...........',
    17: '....#pdddddp#...........',
    18: '....#xdddddx#...........',
    19: '....#xdddddx#...........',
    20: '....#pdd#ddp#...........',
    21: '....#P##.##P#...........',
    22: '....#P#...#P#...........',
    23: '.....#.....#............',
  }),
  gloves: rows({
    11: '...###.......#####......',
    12: '..#ppd#.....#ddPpp#.....',
    13: '..#ppd#.....#ddPpp#.....',
    14: '..#ppx#.....#PPXxxp#....',
    15: '...###.......##ppp#.....',
    16: '..............#ppp#.....',
    17: '...............###......',
  }),
  boots: [
    rows({
      20: '......###...###.........',
      21: '.....#ppd#.#ddp#........',
      22: '.....#ppd#.#ddp#........',
      23: '.....#XXP#.#PPX#........',
    }),
    rows({
      20: '.....###......###.......',
      21: '....#pdd#....#dpp#......',
      22: '....#pdd#....#dpp#......',
      23: '....#XPP#....#PXX#......',
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
    4: '......#########.........',
    5: '.....#ppPdddPPp#........',
    6: '.....#ddxxxxxxd#........',
    7: '.....#ddxxxxxxd#........',
    8: '.....#ppddddddp#........',
    9: '......##dPPPdd#.........',
    10: '.......#dPPPdd#.........',
    11: '........#ddd##..........',
    12: '.........###............',
  }),
  body: rows({
    8: '......######............',
    9: '.....#pppppp#...........',
    10: '.....#pppppp##..........',
    11: '....#pPPdddPpp###.......',
    12: '....#pddxxxdpp#pp#......',
    13: '....#pddxxxdpp#pp#......',
    14: '....#pddddddpp###.......',
    15: '....#Pdddddd  P#........',
    16: '....#Pdddddd  P#........',
    17: '....#pddXXXdpp#.........',
    18: '....#pdd###dpp#.........',
    19: '....#pdd#.#dpp#.........',
    20: '.....###...###..........',
  }),
  gloves: rows({
    11: '...###.......#####......',
    12: '..#ppd#.....#ddppp#.....',
    13: '..#ppd#.....#ddppp#.....',
    14: '..#ppx#.....#PPXXXp#....',
    15: '...###.......##ddd#.....',
    16: '..............#ddd#.....',
    17: '...............###......',
  }),
  boots: [
    rows({
      17: '.....###......###.......',
      18: '....#pdd#....#dpp#......',
      19: '....#pdd#....#dpp#......',
      20: '....#pxx#....#xpp#......',
      21: '....#pPP#....#Ppp#......',
      22: '....#pPP#....#Ppp#......',
      23: '.....###......###.......',
    }),
    rows({
      17: '...###.........###......',
      18: '..#ppd#.......#ddp#.....',
      19: '..#ppd#.......#ddp#.....',
      20: '..#ppx#.......#xxp#.....',
      21: '..#ppP#.......#PPp#.....',
      22: '..#ppP#.......#PPp#.....',
      23: '...###.........###......',
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
    4: '......#########.........',
    5: '.....#ppxPPPxxp#........',
    6: '.....#ppd###ddp#........',
    7: '.....#ppd###ddp#........',
    8: '......##dpppdd#.........',
    9: '........######..........',
  }),
  body: rows({
    8: '......######............',
    9: '.....#pppppp#...........',
    10: '.....#pppppp##..........',
    11: '....#pPPdddxpp###.......',
    12: '....#pddxdddpp#pp#......',
    13: '....#pddxdddpp#pp#......',
    14: '....#pdddxxdpp###.......',
    15: '....#pdddddxpp#.........',
    16: '....#pdddddxpp#.........',
    17: '....#pddddddpp#.........',
    18: '....#pdd###dpp#.........',
    19: '....#pdd#.#dpp#.........',
    20: '.....###...###..........',
  }),
  gloves: rows({
    11: '...###.......#####......',
    12: '..#ppd#.....#ddppp#.....',
    13: '..#ppd#.....#ddppp#.....',
    14: '..#ppp#.....#PPXXXp#....',
    15: '...###.......##ddd#.....',
    16: '..............#ddd#.....',
    17: '...............###......',
  }),
  boots: [
    rows({
      19: '.....###......###.......',
      20: '....#pdd#....#dpp#......',
      21: '....#pXX#....#Xpp#......',
      22: '....#pXX#....#Xpp#......',
      23: '....#PPP#....#PPP#......',
    }),
    rows({
      19: '...###.........###......',
      20: '..#ppd#.......#ddp#.....',
      21: '..#ppX#.......#XXp#.....',
      22: '..#ppX#.......#XXp#.....',
      23: '..#PPP#.......#PPP#.....',
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
    1: '......##......#.........',
    2: '.....#xx#...##x#........',
    3: '.....#XXp#.#ppX#........',
    4: '.....#XXp###ppX#........',
    5: '....#XPPppppPPX##.......',
    6: '....#xdd######dxx#......',
    7: '....#xdd######dxx#......',
    8: '.....#ppdxxxddp##.......',
    9: '......##dPPPdd#.........',
    10: '.......#dPPPdd#.........',
    11: '........#ddd##..........',
    12: '.........###............',
  }),
  body: rows({
    8: '...###..######.###......',
    9: '..#PPp##pppppp#ppP#.....',
    10: '..#PPp##pppppp#ppP#.....',
    11: '..#ppd##dddddd#ddp#.....',
    12: '...##xddXXXdddxxxp#.....',
    13: '....#xddXXXdddxxxp#.....',
    14: '....#pddXXXdddp#.#......',
    15: '....#pddddddddp#........',
    16: '....#pddddddddp#........',
    17: '....#xddddddddx#........',
    18: '....#pdd####ddp#........',
    19: '....#pdd#..#ddp#........',
    20: '....#P##....##P#........',
    21: '.....#........#.........',
  }),
  gloves: rows({
    11: '...###.......#####......',
    12: '..#ppX#.....#ddPpp#.....',
    13: '..#ppX#.....#ddPpp#.....',
    14: '..#ppd#.....#PPXXXp#....',
    15: '...###.......##ppp#.....',
    16: '..............#ppp#.....',
    17: '...............###......',
  }),
  boots: [
    rows({
      16: '.....###......###.......',
      17: '....#pxx#....#xpp#......',
      18: '....#pdd#....#dpp#......',
      19: '....#pdd#....#dpp#......',
      20: '...##pPP#...##Ppp#......',
      21: '..#ddPXXd#.#ddXPPd#.....',
      22: '..#ddPXXd#.#ddXPPd#.....',
      23: '...######...######......',
    }),
    rows({
      16: '...###.........###......',
      17: '..#ppx#.......#xxp#.....',
      18: '..#ppd#.......#ddp#.....',
      19: '..#ppd#.......#ddp#.....',
      20: '..#ppP##......#PPp##....',
      21: '.#dPPXdd#....#dXXPdd#...',
      22: '.#dPPXdd#....#dXXPdd#...',
      23: '..######......######....',
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
    4: '......#########.........',
    5: '.....#ppPxxxPPp#........',
    6: '.....#ddddddddd#........',
    7: '.....#ddddddddd#........',
    8: '.....#ppxdddxxp#........',
    9: '......##dpppdd#.........',
    10: '.......#dpppdd#.........',
    11: '........#ddd##..........',
    12: '.........###............',
  }),
  body: rows({
    8: '.....#########..........',
    9: '....#ppppppppp#.........',
    10: '...##ppppppppp#.........',
    11: '..#PPpddxxxdppP#.#......',
    12: '..#PPpdd###dppPPPp#.....',
    13: '..#PPpdd###dppPPPp#.....',
    14: '...##pxxdddxpp#..#......',
    15: '....#pdddddpdd#.........',
    16: '....#pdddddpdd#.........',
    17: '....#pxxdddxpp#.........',
    18: '....#p##ddd#pp#.........',
    19: '....#p##ddd#pp#.........',
    20: '.....#..###.##..........',
  }),
  gloves: rows({
    11: '...###.......#####......',
    12: '..#ppP#.....#ddPpp#.....',
    13: '..#ppP#.....#ddPpp#.....',
    14: '..#ppx#.....#PPXxxp#....',
    15: '...###.......##ppp#.....',
    16: '..............#ppp#.....',
    17: '...............###......',
  }),
  boots: [
    rows({
      17: '.....###......###.......',
      18: '....#pxx#....#xpp#......',
      19: '....#pxx#....#xpp#......',
      20: '...##pdd#...##dpp#......',
      21: '..#ddPppd#.#ddpPPd#.....',
      22: '..#ddPppd#.#ddpPPd#.....',
      23: '...######...######......',
    }),
    rows({
      17: '...###.........###......',
      18: '..#ppx#.......#xxp#.....',
      19: '..#ppx#.......#xxp#.....',
      20: '..#ppd##......#ddp##....',
      21: '.#dPPpdd#....#dppPdd#...',
      22: '.#dPPpdd#....#dppPdd#...',
      23: '..######......######....',
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
    1: '.....#.........##.......',
    2: '....#x###...###xx#......',
    3: '.....#XXp#.#ppX##.......',
    4: '.....#XXp###ppX#........',
    5: '.....#ppPdddPPp#........',
    6: '.....#ddx###xxd#........',
    7: '.....#ddx###xxd#........',
    8: '.....#ppddddddp#........',
    9: '......##dPPPdd#.........',
    10: '.......#dPPPdd#.........',
    11: '........#ddd##..........',
    12: '.........###............',
  }),
  body: rows({
    8: '......######............',
    9: '.....#pppppp#...........',
    10: '.....#pppppp##..........',
    11: '....#pPPdddPpp###.......',
    12: '....#xddXXXdxx#pp#......',
    13: '....#xddXXXdxx#pp#......',
    14: '....#pddddddpp###.......',
    15: '....#Pddddddpp#.........',
    16: '....#Pddddddpp#.........',
    17: '....#xddddddxx#.........',
    18: '....#pddd##dpp#.........',
    19: '....#pddd##dpp#.........',
    20: '....#P###..#PP#.........',
    21: '.....#......##..........',
  }),
  gloves: rows({
    11: '...###.......#####......',
    12: '..#ppd#.....#ddppp#.....',
    13: '..#ppd#.....#ddppp#.....',
    14: '..#ppx#.....#PPXXXp#....',
    15: '...###.......##ddd#.....',
    16: '..............#ddd#.....',
    17: '...............###......',
  }),
  boots: [
    rows({
      19: '.....###......###.......',
      20: '....#pdd#....#dpp#......',
      21: '....#pxx#....#xpp#......',
      22: '....#pxx#....#xpp#......',
      23: '....#PPP#....#PPP#......',
    }),
    rows({
      19: '...###.........###......',
      20: '..#ppd#.......#ddp#.....',
      21: '..#ppx#.......#xxp#.....',
      22: '..#ppx#.......#xxp#.....',
      23: '..#PPP#.......#PPP#.....',
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
    2: '........######..........',
    3: '.......#pPPPpp#.........',
    4: '......##pPPPpp#.........',
    5: '.....#ppd###ddp#........',
    6: '.....#ppx###xxp#........',
    7: '.....#ppx###xxp#........',
    8: '.....#ppddddddp#........',
    9: '......##dPPPdd#.........',
    10: '.......#dPPPdd#.........',
    11: '........#ppp##..........',
    12: '.........###............',
  }),
  body: rows({
    8: '......######............',
    9: '.....#pppppp#...........',
    10: '.....#pppppp##..........',
    11: '....#pPPdddPpp###.......',
    12: '....#pddxxxdpp#pp#......',
    13: '....#pddxxxdpp#pp#......',
    14: '....#Pddddddpp###.......',
    15: '....#pddxxxdpp#.........',
    16: '....#pddxxxdpp#.........',
    17: '....#pddddddPP#.........',
    18: '....#pddd##dpp#.........',
    19: '....#pddd##dpp#.........',
    20: '....#p###..#pp#.........',
    21: '....#P#.....##P#........',
    22: '....#P#......#P#........',
    23: '.....#........#.........',
  }),
  gloves: rows({
    11: '...###.......#####......',
    12: '..#ppd#.....#ddppp#.....',
    13: '..#ppd#.....#ddppp#.....',
    14: '..#ppP#.....#PPXXXp#....',
    15: '...###.......##ppp#.....',
    16: '..............#ppp#.....',
    17: '...............###......',
  }),
  boots: [
    rows({
      20: '......###...###.........',
      21: '.....#ppd#.#ddp#........',
      22: '.....#ppd#.#ddp#........',
      23: '.....#XXP#.#PPX#........',
    }),
    rows({
      20: '.....###......###.......',
      21: '....#pdd#....#dpp#......',
      22: '....#pdd#....#dpp#......',
      23: '....#XPP#....#PXX#......',
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
    1: '...##............#......',
    2: '..#xx###......###x#.....',
    3: '...##Xpp#....#pXX#......',
    4: '....#Xpp######pXX#......',
    5: '.....#ppPdddPPp##.......',
    6: '.....#dd######d#........',
    7: '.....#dd######d#........',
    8: '.....#ppddddddp#........',
    9: '......##dpppdd#.........',
    10: '.......#dpppdd#.........',
    11: '........#ddd##..........',
    12: '.........###............',
  }),
  body: rows({
    8: '..#..#########.##.......',
    9: '.#xxxppppppppp#xx#......',
    10: '.#xxxppppppppp#xx#......',
    11: '.#XPPpddddddppPXX#......',
    12: '..#ppddd###dddpppp#.....',
    13: '..#ppddd###dddpppp#.....',
    14: '...##pddxxxdpp#..#......',
    15: '....#pddddddpp#.........',
    16: '....#pddddddpp#.........',
    17: '....#pddxxxdpp#.........',
    18: '....#pdd###dpp#.........',
    19: '....#pdd###dpp#.........',
    20: '.....###...###..........',
  }),
  gloves: rows({
    11: '...###.......#####......',
    12: '..#ppX#.....#ddppp#.....',
    13: '..#ppX#.....#ddppp#.....',
    14: '..#ppd#.....#PPXXXp#....',
    15: '...###.......##ddd#.....',
    16: '..............#ddd#.....',
    17: '...............###......',
  }),
  boots: [
    rows({
      17: '.....###......###.......',
      18: '....#pdd#....#dpp#......',
      19: '....#pdd#....#dpp#......',
      20: '...##pXX#...##Xpp#......',
      21: '..#ddpPPd#.#ddPppd#.....',
      22: '..#ddpPPd#.#ddPppd#.....',
      23: '...######...######......',
    }),
    rows({
      17: '...###.........###......',
      18: '..#ppd#.......#ddp#.....',
      19: '..#ppd#.......#ddp#.....',
      20: '..#ppX##......#XXp##....',
      21: '.#dppPdd#....#dPPpdd#...',
      22: '.#dppPdd#....#dPPpdd#...',
      23: '..######......######....',
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
    1: '............##..........',
    2: '...........#XX#.........',
    3: '...........#ppx#........',
    4: '......######ppx#........',
    5: '.....#ppPPPPpp###.......',
    6: '....#dppd###ddpdd#......',
    7: '....#dppd###ddpdd#......',
    8: '.....#ppddddddp##.......',
    9: '......##dPPPdd#.........',
    10: '.......#dPPPdd#.........',
    11: '........######..........',
  }),
  body: rows({
    8: '......######............',
    9: '.....#pppppp#...........',
    10: '.....#pppppp##..........',
    11: '....#pPPdddPpp###.......',
    12: '....#pddXXXdpp#pp#......',
    13: '....#pddXXXdpp#pp#......',
    14: '....#Pdddddxpp###.......',
    15: '....#pddxdddddP#........',
    16: '....#pddxdddddP#........',
    17: '....#pddddddpp#.........',
    18: '....#pdd###dpp#.........',
    19: '....#pdd#.#dpp#.........',
    20: '....#P##...#PP#.........',
    21: '.....#......##..........',
  }),
  gloves: rows({
    11: '...###.......#####......',
    12: '..#ppX#.....#ddPpp#.....',
    13: '..#ppX#.....#ddPpp#.....',
    14: '..#ppd#.....#PPXXXp#....',
    15: '...###.......##ppp#.....',
    16: '..............#ppp#.....',
    17: '...............###......',
  }),
  boots: [
    rows({
      17: '.....###......###.......',
      18: '....#pdd#....#dpp#......',
      19: '....#pdd#....#dpp#......',
      20: '....#pXX#....#Xpp#......',
      21: '....#pPP#....#Ppp#......',
      22: '...##pPP#...##Ppp#......',
      23: '..#ddPPPd#.#ddPPPd#.....',
    }),
    rows({
      17: '...###.........###......',
      18: '..#ppd#.......#ddp#.....',
      19: '..#ppd#.......#ddp#.....',
      20: '..#ppX#.......#XXp#.....',
      21: '..#ppP#.......#PPp#.....',
      22: '..#ppP##......#PPp##....',
      23: '.#dPPPdd#....#dPPPdd#...',
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
 * Weapons, drawn against the grip at (17, 14): hanging at rest, and swung round
 * on the strike. Two grids rather than a rotation, because turning a pixel
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
      13: '................##......',
      14: '................#ww#....',
      15: '.................#ww#...',
      16: '..................#ww#..',
      17: '...................#gg#.',
      18: '....................#gg#',
      19: '.....................###',
    }),
    strike: rows({
      11: '................##......',
      12: '................#ww#....',
      13: '.................#ww#...',
      14: '..................#ww#..',
      15: '...................#gg#.',
      16: '....................#gg#',
      17: '.....................###',
    }),
  },
  // Turned and ringed, with a set stone.
  carved_wand: {
    rest: rows({
      13: '................##......',
      14: '................#ww#....',
      15: '.................#MM#...',
      16: '..................#ww#..',
      17: '...................#gg#.',
      18: '....................#gg#',
      19: '.....................###',
    }),
    strike: rows({
      10: '................##......',
      11: '................#ww#....',
      12: '.................#MM#...',
      13: '..................#ww#..',
      14: '...................#gg#.',
      15: '....................#gg#',
      16: '.....................###',
    }),
  },
  // A shard of the rock itself, bound at the grip.
  quartz_wand: {
    rest: rows({
      13: '................##......',
      14: '................#ww#....',
      15: '.................#gg#...',
      16: '.................#gg#...',
      17: '..................#gg#..',
      18: '..................#gg#..',
      19: '...................###..',
    }),
    strike: rows({
      10: '................##......',
      11: '................#ww#....',
      12: '.................#gg#...',
      13: '.................#gg#...',
      14: '..................#gg#..',
      15: '..................#gg#..',
      16: '...................###..',
    }),
  },
  // Long, thin and hooked, with the stone slung underneath.
  whisper_wand: {
    rest: rows({
      13: '................##......',
      14: '................#ww#....',
      15: '.................#ww#...',
      16: '..................#ww#..',
      17: '...................#ww#.',
      18: '...................#gg#.',
      19: '....................##..',
    }),
    strike: rows({
      9: '................##......',
      10: '................#ww#....',
      11: '.................#ww#...',
      12: '..................#ww#..',
      13: '...................#ww#.',
      14: '...................#gg#.',
      15: '....................##..',
    }),
  },
  // Notched, pitted, and still the length of your arm.
  rusted_sword: {
    rest: rows({
      12: '...............#ww#.....',
      13: '...............#ww#.....',
      14: '..............##ww##....',
      15: '...............#mM#.....',
      16: '...............#mM#.....',
      17: '...............#m.#.....',
      18: '...............#mM#.....',
      19: '...............#mM#.....',
      20: '...............#mM#.....',
      21: '................##......',
    }),
    strike: rows({
      13: '...............#######..',
      14: '...............#wwmmM#..',
      15: '...............#wwmmM#..',
      16: '...............#######..',
    }),
  },
  // A straight bar with a wide guard and a bright edge.
  iron_sword: {
    rest: rows({
      12: '...............#ww#.....',
      13: '...............#ww#.....',
      14: '.............###ww###...',
      15: '...............#mM#.....',
      16: '...............#mM#.....',
      17: '...............#mM#.....',
      18: '...............#mM#.....',
      19: '...............#mM#.....',
      20: '...............#mM#.....',
      21: '................##......',
    }),
    strike: rows({
      13: '...............########.',
      14: '...............#wwmmmM#.',
      15: '...............#wwmmmM#.',
      16: '...............########.',
    }),
  },
  // A fullered blade with a long guard. Nothing wasted.
  steel_sword: {
    rest: rows({
      10: '...............#ww#.....',
      11: '...............#ww#.....',
      12: '...............#ww#.....',
      13: '...............#ww#.....',
      14: '............####ww####..',
      15: '...............#mM#.....',
      16: '...............#mM#.....',
      17: '...............#mM#.....',
      18: '...............#mM#.....',
      19: '...............#mM#.....',
      20: '...............#mM#.....',
      21: '...............#mM#.....',
      22: '................##......',
    }),
    strike: rows({
      12: '...............########.',
      13: '...............#wwmmmmM#',
      14: '...............#wwmmmmM#',
      15: '...............#wwmmmmM#',
      16: '...............########.',
    }),
  },
  // A ground-down sliver with cloth for a handle.
  shiv: {
    rest: rows({
      13: '...............#ww#.....',
      14: '..............##mm##....',
      15: '...............#mM#.....',
      16: '...............#mM#.....',
      17: '................##......',
    }),
    strike: rows({
      13: '...............#####....',
      14: '...............#wwmM#...',
      15: '...............#####....',
    }),
  },
  // A needle. No edge to speak of, and it does not need one.
  stiletto: {
    rest: rows({
      13: '...............#ww#.....',
      14: '..............##mm##....',
      15: '................#M#.....',
      16: '................#M#.....',
      17: '................#M#.....',
      18: '................#M#.....',
      19: '.................#......',
    }),
    strike: rows({
      13: '...............#######..',
      14: '...............#wwmMMM#.',
      15: '...............#######..',
    }),
  },
  // Curved and back-hooked, wrapped to the guard.
  fang: {
    rest: rows({
      13: '...............#ww#.....',
      14: '..............##mm##....',
      15: '...............#mM#.....',
      16: '...............#mM#.....',
      17: '................#mM#....',
      18: '................#mM#....',
      19: '.................#M#....',
      20: '..................#.....',
    }),
    strike: rows({
      13: '...............######...',
      14: '...............#wwmmM#..',
      15: '...............##mmmM#..',
      16: '................#####...',
    }),
  },
  // A lump of iron on a stick. It does not pretend otherwise.
  cudgel: {
    rest: rows({
      12: '................##......',
      13: '...............#ww#.....',
      14: '.............#######....',
      15: '.............#mmmmm#....',
      16: '.............#mmMMm#....',
      17: '.............#mmMMm#....',
      18: '.............#mmmmm#....',
      19: '..............#####.....',
    }),
    strike: rows({
      12: '.................#####..',
      13: '...............#wwmmmm#.',
      14: '...............#wwmMMm#.',
      15: '...............#wwmmmm#.',
      16: '.................#####..',
    }),
  },
  // A flanged head, still warm from the forge.
  ember_maul: {
    rest: rows({
      12: '................##......',
      13: '...............#ww#.....',
      14: '.............#######....',
      15: '.............#mmmmm#....',
      16: '.............#ffmmm#....',
      17: '.............#ffmmm#....',
      18: '.............#mmmmm#....',
      19: '..............#####.....',
    }),
    strike: rows({
      12: '.................#####..',
      13: '...............#wwmmmm#.',
      14: '...............#wwffmm#.',
      15: '...............#wwmmmm#.',
      16: '.................#####..',
    }),
  },
  // A spiked head, blue-white where the iron went cold.
  frost_maul: {
    rest: rows({
      12: '................##......',
      13: '...............#ww#.....',
      14: '.............#######....',
      15: '.............#mmmMM#....',
      16: '.............#mMMMM#M...',
      17: '.............#mmmMM#....',
      18: '.............#mmmmm#....',
      19: '..............#####.....',
    }),
    strike: rows({
      12: '.................#####..',
      13: '...............#wwmmMM#.',
      14: '...............#wwmMMM#M',
      15: '...............#wwmmMM#.',
      16: '.................#####..',
    }),
  },
  // A forked head with a gap the arc jumps across.
  storm_maul: {
    rest: rows({
      12: '................##......',
      13: '...............#ww#.....',
      14: '.............#######....',
      15: '.............#mmmMM#....',
      16: '.............#mggMM#M...',
      17: '.............#mmmMM#....',
      18: '.............#mmmmm#....',
      19: '..............#####.....',
    }),
    strike: rows({
      12: '.................#####..',
      13: '...............#wwmmMM#.',
      14: '...............#wwggMM#.',
      15: '...............#wwmmMM#.',
      16: '.................#####..',
    }),
  },
  // Something's head, mounted. The haft is bound in its hide.
  skull_maul: {
    rest: rows({
      12: '................##......',
      13: '...............#ww#.....',
      14: '............#########...',
      15: '............#mMMMMm#....',
      16: '............#m####m#....',
      17: '............#m####m#....',
      18: '............#mmmmmm#....',
      19: '............#mmmmmm#....',
      20: '.............######.....',
    }),
    strike: rows({
      12: '................######..',
      13: '...............#wwMMMm#.',
      14: '...............#ww##mm#.',
      15: '...............#wwmmmm#.',
      16: '................######..',
    }),
  },
};

/** Keyed by BASE, not by kind: an Ember Maul is not a Cudgel with a tint. */
export const hasWeapon = (base: string): boolean => base in WEAPON_ART;
