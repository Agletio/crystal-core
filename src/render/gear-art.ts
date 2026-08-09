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

export interface FamilyArt {
  tone: FamilyTone;
  helmet: string[];
  body: string[];
  gloves: string[];
  /** One per walk frame. */
  boots: [string[], string[]];
}

/**
 * Bulwark: siege plate. Rust-dark iron with a hot forge glow in the trim — the
 * heaviest silhouette in the game. A crested helm, pauldrons with a raised
 * ridge, and tassets hanging past the belt.
 */
const BULWARK: FamilyArt = {
  tone: {
    mass: (p) => mix(p.rust, p.rockDeep, 0.5),
    lit: (p) => mix(p.rust, p.citrine, 0.35),
    dark: (p) => mix(p.rust, p.void, 0.62),
    trim: (p) => mix(p.ember, p.rockDeep, 0.4),
    trimLit: (p) => p.flame,
  },
  helmet: [
    '................',
    '.....#pp#.......',
    '....#pXXp#......',
    '...#pPPPPp#.....',
    '...#d####d#.....',
    '...#pdxxdp#.....',
    '....#dppd#......',
    '.....#dd#.......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  body: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..#pppppp#......',
    '.#PpddddpP#.....',
    '.#Ppd##dpP#p....',
    '..#pdXXdp#......',
    '..#pddddp#......',
    '..#pdxxdp#......',
    '..#p#dd#p#......',
    '...#.##.#.......',
    '................',
    '................',
  ],
  gloves: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.#pP#....#dPp#..',
    '.#pd#....#PXXp#.',
    '.####.....#pp#..',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  boots: [
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..#pd#..#dp#....',
      '..#pX#..#Xp#....',
      '..#pp#..#pp#....',
      '.#dPPd..dPPd#...',
      '.#####..#####...',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.#pd#....#dp#...',
      '.#pX#....#Xp#...',
      '.#pp#....#pp#...',
      '#dPPd....dPPd#..',
      '#####....#####..',
    ],
  ],
};

/**
 * Templar: a warrior-priest. Plate under a hanging robe, a crowned helm with
 * side wings, and a sigil burning on the chest — the fancy end of the range,
 * and the shape the other hybrids are measured against.
 */
const TEMPLAR: FamilyArt = {
  tone: {
    mass: (p) => mix(p.amethyst, p.rockDeep, 0.42),
    lit: (p) => mix(p.amethyst, p.chalk, 0.42),
    dark: (p) => mix(p.amethyst, p.void, 0.62),
    trim: (p) => mix(p.citrine, p.rockDeep, 0.38),
    trimLit: (p) => p.citrine,
  },
  helmet: [
    '................',
    '....x#..#x......',
    '...#Xp##pX#.....',
    '..#XPpppPX#.....',
    '..#xd####dx#....',
    '...#pdxxdp#.....',
    '....#dPPd#......',
    '.....#dd#.......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  body: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.#Pp#pppp#pP#...',
    '.#pd#dddd#dp#...',
    '..#xdXXddx#p....',
    '..#pdXXddp#.....',
    '..#pdddddp#.....',
    '..#xdddddx#.....',
    '..#pd#.#dp#.....',
    '..#P#...#P#.....',
    '...#.....#......',
    '................',
  ],
  gloves: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.#pX#....#dPp#..',
    '.#pd#....#PXXp#.',
    '.####.....#pp#..',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  boots: [
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..#px#..#xp#....',
      '..#pd#..#dp#....',
      '..#pP#..#Pp#....',
      '.#dPXd..dXPd#...',
      '.#####..#####...',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.#px#....#xp#...',
      '.#pd#....#dp#...',
      '.#pP#....#Pp#...',
      '#dPXd....dXPd#..',
      '#####....#####..',
    ],
  ],
};

export const FAMILY_ART: Record<string, FamilyArt> = {
  bulwark: BULWARK,
  templar: TEMPLAR,
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

const BLANK = '................';
const rows = (from: Record<number, string>): string[] =>
  Array.from({ length: 16 }, (_, y) => from[y] ?? BLANK);

export const WEAPON_ART: Record<string, WeaponArt> = {
  // A short rod with a bound grip and a stone at the tip, angled down and away.
  wand: {
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
  // Straight blade with a crossguard, hanging point-down.
  sword: {
    rest: rows({
      8: '..........#m#...',
      9: '.........##m##..',
      10: '..........#M#...',
      11: '..........#M#...',
      12: '..........#M#...',
      13: '..........#M#...',
      14: '...........#....',
    }),
    strike: rows({
      8: '..........##....',
      9: '.........#mmMMM#',
      10: '..........####..',
    }),
  },
  // Short and wide. Reads as a blade rather than as a small sword.
  dagger: {
    rest: rows({
      8: '..........#m#...',
      9: '.........##m##..',
      10: '..........#M#...',
      11: '...........#....',
    }),
    strike: rows({
      9: '.........#mmMM#.',
      10: '..........####..',
    }),
  },
  // The head is the whole identity, so it is three across.
  mace: {
    rest: rows({
      9: '..........##....',
      10: '..........#w#...',
      11: '..........#w#...',
      12: '.........#mMm#..',
      13: '.........#mmm#..',
      14: '..........###...',
    }),
    strike: rows({
      8: '............###.',
      9: '..........##mMm#',
      10: '...........#MMM#',
      11: '............###.',
    }),
  },
};

/** A weapon base's own kind, straight through. */
export const WEAPON_SHAPE: Record<string, string> = {
  wand: 'wand',
  sword: 'sword',
  dagger: 'dagger',
  mace: 'mace',
};
