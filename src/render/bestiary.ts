/**
 * The bestiary. Same shape as the armour families: a creature declares its own
 * inks and its own frames, so nine of them share one alphabet in the source and
 * none of them share a colour on screen.
 *
 * `x` is the RANK accent — dull on a common one, lit on a magic, blazing on a
 * rare. The rank also grows the body and puts a halo round it; see `haloed`.
 */
import { mix, rows } from './gear-art';
import type { Palette } from './renderer';

export interface BeastTone {
  mass: (p: Palette) => string;
  lit: (p: Palette) => string;
  shade: (p: Palette) => string;
  eye: (p: Palette) => string;
}

export interface BeastArt {
  tone: BeastTone;
  frames: [string[], string[]];
}

export const BEASTIARY: Record<string, BeastArt> = {
  /** Low, wide and segmented. Almost no vertical presence: the thing you walk over. */
  grub: {
    tone: {
      mass: (p) => mix(p.verdite, p.rockDeep, 0.42),
    lit: (p) => mix(p.verdite, p.chalk, 0.22),
    shade: (p) => mix(p.verdite, p.void, 0.55),
    eye: (p) => p.citrine,
    },
    frames: [
      rows({
        4: '.....######.....',
        5: '...##mmmmmm##...',
        6: '..#mMsMMsMMsm#..',
        7: '.#mMMsMMsMMsMe#.',
        8: '.#MMsMMsMMsMMx#.',
        9: '.#mMMsMMsMMsMe#.',
        10: '..#mMsMMsMMsm#..',
        11: '...##m##m##m#...',
        12: '....#..#..#.....',
      }),
      rows({
        4: '.....######.....',
        5: '...##mmmmmm##...',
        6: '..#mMsMMsMMsm#..',
        7: '.#mMMsMMsMMsMe#.',
        8: '.#MMsMMsMMsMMx#.',
        9: '.#mMMsMMsMMsMe#.',
        10: '..#mMsMMsMMsm#..',
        11: '...#m##m##m##...',
        12: '.....#..#..#....',
      }),
    ],
  },
  /** A person, badly. Sunken eyes, a rib showing, arms too long for it. */
  husk: {
    tone: {
      mass: (p) => mix(p.bone, p.rockDeep, 0.5),
    lit: (p) => mix(p.bone, p.chalk, 0.3),
    shade: (p) => mix(p.bone, p.void, 0.62),
    eye: (p) => mix(p.venom, p.chalk, 0.2),
    },
    frames: [
      rows({
        2: '......####......',
        3: '.....#mMMm#.....',
        4: '.....#eMem#.....',
        5: '.....#mMMm#.....',
        6: '......#ss#......',
        7: '....##mMMm##....',
        8: '...#MsMxxMsM#...',
        9: '...#M#MsMM#M#...',
        10: '...#M#MMsM#M#...',
        11: '....##MMMM##....',
        12: '.....#M##M#.....',
        13: '.....#M##M#.....',
        14: '.....#M##M#.....',
        15: '.....##..##.....',
      }),
      rows({
        2: '......####......',
        3: '.....#mMMm#.....',
        4: '.....#eMem#.....',
        5: '.....#mMMm#.....',
        6: '......#ss#......',
        7: '....##mMMm##....',
        8: '...#MsMxxMsM#...',
        9: '...#M#MsMM#M#...',
        10: '...#M#MMsM#M#...',
        11: '....##MMMM##....',
        12: '.....#MM#M#.....',
        13: '....#M#..#M#....',
        14: '....#M#..#M#....',
        15: '....##....##....',
      }),
    ],
  },
  /** A wedge on long legs. Nothing on it is vertical; it always looks mid-stride. */
  stalker: {
    tone: {
      mass: (p) => mix(p.citrine, p.rockDeep, 0.48),
    lit: (p) => mix(p.citrine, p.chalk, 0.25),
    shade: (p) => mix(p.citrine, p.void, 0.6),
    eye: (p) => p.ember,
    },
    frames: [
      rows({
        3: '............##..',
        4: '...#######mMe#..',
        5: '..#mMsMMsMMMx#..',
        6: '.#MMsMMsMMMM##..',
        7: '..#MsMMsMMM#....',
        8: '..#m#MM#Mm#.....',
        9: '.#M#.#M#.#M#....',
        10: '.#M#.#M#..#M#...',
        11: '.##..##....##...',
      }),
      rows({
        3: '............##..',
        4: '...#######mMe#..',
        5: '..#mMsMMsMMMx#..',
        6: '.#MMsMMsMMMM##..',
        7: '..#MsMMsMMM#....',
        8: '..#m#MM#Mm#.....',
        9: '..#M#M#M#M#.....',
        10: '.#M#..#M#.#M#...',
        11: '.##....##..##...',
      }),
    ],
  },
  /** A slab with a head sunk into it. Shoulders wider than anything else down here. */
  brute: {
    tone: {
      mass: (p) => mix(p.ember, p.rockDeep, 0.45),
    lit: (p) => mix(p.ember, p.citrine, 0.3),
    shade: (p) => mix(p.ember, p.void, 0.62),
    eye: (p) => p.flame,
    },
    frames: [
      rows({
        1: '....########....',
        2: '...#mMMMMMMm#...',
        3: '...#seMMMMes#...',
        4: '...##mMxxMm##...',
        5: '.###MMMMMMMM###.',
        6: '#mMMMMsxxsMMMMm#',
        7: '#MMMMMsxxsMMMMM#',
        8: '#mMMMMssssMMMMm#',
        9: '.#MMMMMMMMMMMM#.',
        10: '..#MM##..##MM#..',
        11: '..##m#....#m##..',
        12: '...#M#....#M#...',
        13: '...#M#....#M#...',
        14: '...#M#....#M#...',
        15: '...###....###...',
      }),
      rows({
        1: '....########....',
        2: '...#mMMMMMMm#...',
        3: '...#seMMMMes#...',
        4: '...##mMxxMm##...',
        5: '.###MMMMMMMM###.',
        6: '#mMMMMsxxsMMMMm#',
        7: '#MMMMMsxxsMMMMM#',
        8: '#mMMMMssssMMMMm#',
        9: '.#MMMMMMMMMMMM#.',
        10: '..#MM##..##MM#..',
        11: '..##m#....#m##..',
        12: '...#M#....#MM#..',
        13: '...#M#.....#M#..',
        14: '..#M#......#M#..',
        15: '..###......###..',
      }),
    ],
  },
  /** Four legs, no fur left. What is under the crust of ash is still burning. */
  cinder_hound: {
    tone: {
      mass: (p) => mix(p.flame, p.rockDeep, 0.55),
    lit: (p) => mix(p.flame, p.citrine, 0.25),
    shade: (p) => mix(p.rockDeep, p.void, 0.3),
    eye: (p) => p.flameCore,
    },
    frames: [
      rows({
        4: '..........####..',
        5: '.........#mMMe#.',
        6: '.##....##mMxxM#.',
        7: '#sm###mMMMMMM##.',
        8: '.#MmsxxsMMMM#...',
        9: '.#msxxsMMMm#....',
        10: '.#m#MM#MMm#.....',
        11: '.#M#.#M#.#M#....',
        12: '.##..##...##....',
      }),
      rows({
        4: '..........####..',
        5: '.........#mMMe#.',
        6: '.##....##mMxxM#.',
        7: '#sm###mMMMMMM##.',
        8: '.#MmsxxsMMMM#...',
        9: '.#msxxsMMMm#....',
        10: '.#m#MM#MMm#.....',
        11: '..#M#M#.#M#.....',
        12: '..##.##...##....',
      }),
    ],
  },
  /** Plated in broken rock. It does not hide; it simply looks like the floor. */
  shale_crawler: {
    tone: {
      mass: (p) => mix(p.rock, p.rockDeep, 0.35),
    lit: (p) => mix(p.rock, p.chalk, 0.3),
    shade: (p) => mix(p.rockDeep, p.void, 0.35),
    eye: (p) => p.quartz,
    },
    frames: [
      rows({
        3: '.....####.......',
        4: '...##mMMm##.....',
        5: '..#mMsxxsMm##...',
        6: '.#mMMsxxsMMMm#..',
        7: '.#MMsxxsMMMMMe#.',
        8: '.#mMMsMMsMMMMx#.',
        9: '..#mMsMMsMMMm#..',
        10: '..#m##m##m##m#..',
        11: '..#..#..#..#....',
      }),
      rows({
        3: '.....####.......',
        4: '...##mMMm##.....',
        5: '..#mMsxxsMm##...',
        6: '.#mMMsxxsMMMm#..',
        7: '.#MMsxxsMMMMMe#.',
        8: '.#mMMsMMsMMMMx#.',
        9: '..#mMsMMsMMMm#..',
        10: '...#m##m##m##m#.',
        11: '...#..#..#..#...',
      }),
    ],
  },
  /** Nothing solid at all. A knot of moving air with something bright at the centre. */
  gale_wisp: {
    tone: {
      mass: (p) => mix(p.quartz, p.rockDeep, 0.5),
    lit: (p) => mix(p.quartz, p.chalk, 0.3),
    shade: (p) => mix(p.quartz, p.void, 0.6),
    eye: (p) => p.chalk,
    },
    frames: [
      rows({
        2: '........####....',
        3: '.......#mMMm#...',
        4: '..##..#mMsxsM#..',
        5: '.#sm#.#Msxeexs#.',
        6: '..#ms##mMsxxsM#.',
        7: '...#mMMMsMMMm#..',
        8: '....#mMsMMMm#...',
        9: '.....##mMMm#....',
        10: '.......####.....',
      }),
      rows({
        2: '........####....',
        3: '.......#mMMm#...',
        4: '.##...#mMsxsM#..',
        5: '#sm#..#Msxeexs#.',
        6: '.#ms###mMsxxsM#.',
        7: '...#mMMMsMMMm#..',
        8: '....#mMsMMMm#...',
        9: '.....##mMMm#....',
        10: '.......####.....',
      }),
    ],
  },
  /** Low and armoured, with one claw far too big for it. Everything it touches frosts. */
  rime_crab: {
    tone: {
      mass: (p) => mix(p.quartz, p.void, 0.4),
    lit: (p) => mix(p.quartz, p.chalk, 0.45),
    shade: (p) => mix(p.quartz, p.void, 0.65),
    eye: (p) => p.chalk,
    },
    frames: [
      rows({
        4: '..........##....',
        5: '.........#xM#...',
        6: '..##.....#MM#...',
        7: '.#xM#....#MM#...',
        8: '.#MM######MM##..',
        9: '..#mMMsMMsMMMe#.',
        10: '..#MMsMMsMMMMx#.',
        11: '..#mMMsMMsMMMe#.',
        12: '...#m##m##m##...',
        13: '...#..#..#......',
      }),
      rows({
        4: '..........##....',
        5: '.........#xM#...',
        6: '..##.....#MM#...',
        7: '.#xM#....#MM#...',
        8: '.#MM######MM##..',
        9: '..#mMMsMMsMMMe#.',
        10: '..#MMsMMsMMMMx#.',
        11: '..#mMMsMMsMMMe#.',
        12: '....#m##m##m#...',
        13: '....#..#..#.....',
      }),
    ],
  },
  /** Small, and never where it was. The arc between its horns is the only warning. */
  sparkmite: {
    tone: {
      mass: (p) => mix(p.citrine, p.void, 0.35),
    lit: (p) => mix(p.citrine, p.chalk, 0.35),
    shade: (p) => mix(p.citrine, p.void, 0.6),
    eye: (p) => p.chalk,
    },
    frames: [
      rows({
        4: '...#x#..#x#.....',
        5: '....#x##x#......',
        6: '...##mMMm##.....',
        7: '..#mMsxxsMm#....',
        8: '..#MseeesMM#....',
        9: '..#mMsxxsMm#....',
        10: '...##mMMm##.....',
        11: '....#m##m#......',
        12: '....##..##......',
      }),
      rows({
        4: '...#x#..#x#.....',
        5: '....#x##x#......',
        6: '...##mMMm##.....',
        7: '..#mMsxxsMm#....',
        8: '..#MseeesMM#....',
        9: '..#mMsxxsMm#....',
        10: '...##mMMm##.....',
        11: '...#m#..#m#.....',
        12: '...##....##.....',
      }),
    ],
  },
};

/** The frames alone, for the harness that only asks whether they are well formed. */
export const MONSTER_FRAMES: Record<string, string[][]> = Object.fromEntries(
  Object.entries(BEASTIARY).map(([id, art]) => [id, art.frames])
);

/** Common, magic, rare. The accent ink and the halo both key off this. */
export type MonsterRank = 'common' | 'magic' | 'rare';

export const HALO: Record<MonsterRank, string | null> = {
  common: null,
  magic: 'b',
  rare: 'o',
};

/**
 * A one-pixel ring around whatever the creature already is, so the border
 * follows its silhouette rather than boxing it. Grown outward only: a halo
 * that ate a pixel of the body would thin every leg it touched.
 */
export function haloed(frame: string[], ink: string | null): string[] {
  if (!ink) return frame;
  const lit = (x: number, y: number) => (frame[y]?.[x] ?? '.') !== '.';
  return frame.map((row, y) =>
    row
      .split('')
      .map((ch, x) => {
        if (ch !== '.') return ch;
        const near =
          lit(x - 1, y) || lit(x + 1, y) || lit(x, y - 1) || lit(x, y + 1);
        return near ? ink : ch;
      })
      .join('')
  );
}
