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

/**
 * `#` ink · `p` plate · `P` plate lit · `d` plate shadow · `c` cloth ·
 * `C` cloth lit · `h` hide · `w` haft · `m` metal · `M` metal lit ·
 * `g` gem · `x` TRIM (tier 2+) · `X` TRIM lit (tier 3)
 */
export const TRIM = 'x';
export const TRIM_LIT = 'X';

export interface FamilyArt {
  helmet: string[];
  body: string[];
  gloves: string[];
  /** One per walk frame. */
  boots: [string[], string[]];
}

/**
 * Bulwark: full plate. The heaviest silhouette in the game — a closed helm
 * with a visor slit, a cuirass that squares off the shoulders, and sabatons
 * that read as blocks rather than feet.
 */
const BULWARK: FamilyArt = {
  helmet: [
    '................',
    '................',
    '....######......',
    '...#pPPPPp#.....',
    '...#p####p#.....',
    '...#pxxxxp#.....',
    '....#pppp#......',
    '................',
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
    '................',
    '...##pppp##.....',
    '..#pPddddPp#....',
    '..#pddddp#......',
    '..#pddddp#......',
    '...#pxxp#.......',
    '....####........',
    '................',
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
    '................',
    '..#pp....#PPp#..',
    '..###.....#xx#..',
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
      '................',
      '................',
      '...#pp..pp#.....',
      '...#PP..PP#.....',
      '..#ppx..xpp#....',
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
      '................',
      '................',
      '..#pp....pp#....',
      '..#PP....PP#....',
      '.#ppx....xpp#...',
    ],
  ],
};

export const FAMILY_ART: Record<string, FamilyArt> = {
  bulwark: BULWARK,
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
