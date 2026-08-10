/**
 * The bestiary. Same shape as the armour families: a creature declares its own
 * inks and its own frames, so nine of them share one alphabet in the source and
 * none of them share a colour on screen.
 *
 * `x` is the RANK accent — dull on a common one, lit on a magic, blazing on a
 * rare. The rank also grows the body and puts a halo round it; see `haloed`.
 */
import { gridRows, mix } from './gear-art';
import type { Palette } from './renderer';

export interface BeastTone {
  mass: (p: Palette) => string;
  lit: (p: Palette) => string;
  shade: (p: Palette) => string;
  eye: (p: Palette) => string;
}

export interface BeastArt {
  tone: BeastTone;
  /** Side of the grid this creature is drawn on. Its own, so the bestiary can
   *  be redrawn a family at a time without the pipeline caring. */
  grid: number;
  frames: [string[], string[]];
  /** The swing. Absent means it has none yet and stands still to hit you. */
  attack?: string[];
}

/** Every creature drawn at 16 declares it; the ones redrawn at 24 say so. */
const rows = gridRows(16);
const wide = gridRows(24);

export const BEASTIARY: Record<string, BeastArt> = {
  /** Low, wide and segmented. Almost no vertical presence: the thing you walk over. */
  grub: {
    tone: {
      mass: (p) => mix(p.verdite, p.rockDeep, 0.42),
    lit: (p) => mix(p.verdite, p.chalk, 0.22),
    shade: (p) => mix(p.verdite, p.void, 0.55),
    eye: (p) => p.citrine,
    },
    grid: 24,
    frames: [
      wide({
        7: '.....##############.....',
        8: '...##mmmmmmmmmmmmmm##...',
        9: '..#mMsMMsMMsMMsMMsMMm#..',
        10: '..#MMsMMsMMsMMsMMsMMe#..',
        11: '..#MMsMMsMMsMMsMMsMMx#..',
        12: '..#MMsMMsMMsMMsMMsMMe#..',
        13: '..#mMsMMsMMsMMsMMsMMm#..',
        14: '...##mmmmmmmmmmmmmm##...',
        15: '...#m##m##m##m##m##m#...',
        16: '...#.#..#..#..#..#.#....',
      }),
      wide({
        7: '.....##############.....',
        8: '...##mmmmmmmmmmmmmm##...',
        9: '..#mMsMMsMMsMMsMMsMMm#..',
        10: '..#MMsMMsMMsMMsMMsMMe#..',
        11: '..#MMsMMsMMsMMsMMsMMx#..',
        12: '..#MMsMMsMMsMMsMMsMMe#..',
        13: '..#mMsMMsMMsMMsMMsMMm#..',
        14: '...##mmmmmmmmmmmmmm##...',
        15: '...##m##m##m##m##m##....',
        16: '.....#..#..#..#..#......',
      }),
    ],
    attack: wide({
      3: '...............#####....',
      4: '..............#msem#....',
      5: '..............#seeM#....',
      6: '.............##MMx#.....',
      7: '........##########......',
      8: '.....##mmmmmmmmmm##.....',
      9: '....#mMsMMsMMsMMsM#.....',
      10: '...#MMsMMsMMsMMsMM#.....',
      11: '...#MMsMMsMMsMMsM#......',
      12: '...#mMsMMsMMsMMsMM#.....',
      13: '...##mmmmmmmmmmmm##.....',
      14: '....#m##m##m##m##m#.....',
      15: '....#.#..#..#..#.#......',
    }),
  },
  /** A person, badly. Sunken eyes, a rib showing, arms too long for it. */
  husk: {
    tone: {
      mass: (p) => mix(p.bone, p.rockDeep, 0.5),
    lit: (p) => mix(p.bone, p.chalk, 0.3),
    shade: (p) => mix(p.bone, p.void, 0.62),
    eye: (p) => mix(p.venom, p.chalk, 0.2),
    },
    grid: 24,
    frames: [
      wide({
        2: '.........######.........',
        3: '........#mMMMMm#........',
        4: '........#mMMMMm#........',
        5: '........#emMMme#........',
        6: '........#mMssMm#........',
        7: '.......##msssm##........',
        8: '.......###mMMm###.......',
        9: '.....#MM##mMMm##MM#.....',
        10: '.....#MM#MMxxMM#MM#.....',
        11: '.....#Ms#MMssMM#sM#.....',
        12: '.....#MM#MMxxMM#MM#.....',
        13: '.....#MM#MMssMM#MM#.....',
        14: '.....#Ms##MMMM##sM#.....',
        15: '.....#MM##MMMM##MM#.....',
        16: '.....##m##MmmM##m##.....',
        17: '......##..MMMM..##......',
        18: '........#MM##MM#........',
        19: '........#Mm##mM#........',
        20: '........#MM##MM#........',
        21: '........#MM##MM#........',
        22: '........##m##m##........',
        23: '........##....##........',
      }),
      wide({
        2: '.........######.........',
        3: '........#mMMMMm#........',
        4: '........#mMMMMm#........',
        5: '........#emMMme#........',
        6: '........#mMssMm#........',
        7: '.......##msssm##........',
        8: '.......###mMMm###.......',
        9: '.....#MM##mMMm##MM#.....',
        10: '.....#MM#MMxxMM#MM#.....',
        11: '.....#Ms#MMssMM#sM#.....',
        12: '.....#MM#MMxxMM#MM#.....',
        13: '.....#MM#MMssMM#MM#.....',
        14: '.....#Ms##MMMM##sM#.....',
        15: '.....#MM##MMMM##MM#.....',
        16: '.....##m##MmmM##m##.....',
        17: '......##.#MMMM#.##......',
        18: '.......#MMM##MM#........',
        19: '.......#MM#..#MM#.......',
        20: '.......#Mm#..#mM#.......',
        21: '......#MM#...#MM#.......',
        22: '......##m#...#m##.......',
        23: '.......##......##.......',
      }),
    ],
    attack: wide({
      3: '...######...............',
      4: '..#mMMMMm#..............',
      5: '..#emMMme#..............',
      6: '..#mMssMm#..............',
      7: '.##msssm##..............',
      8: '.###mMMm###.####........',
      9: '.#MM##mMMm##MMMM#.......',
      10: '.#MM#MMxxMM##MM##.......',
      11: '.#Ms#MMssMM##...........',
      12: '.#MM#MMxxMM#............',
      13: '.##m#MMssMM#............',
      14: '..##.#MMMM#.............',
      15: '.....#MMMM#.............',
      16: '.....#MmmM#.............',
      17: '.....#MMMM#.............',
      18: '...#MM##MM#.............',
      19: '...#Mm#.#mM#............',
      20: '..#MM#..#MM#............',
      21: '..#MM#...#MM#...........',
      22: '..##m#...#m##...........',
      23: '..####....####..........',
    }),
  },
  /** A wedge on long legs. Nothing on it is vertical; it always looks mid-stride. */
  stalker: {
    tone: {
      mass: (p) => mix(p.citrine, p.rockDeep, 0.48),
    lit: (p) => mix(p.citrine, p.chalk, 0.25),
    shade: (p) => mix(p.citrine, p.void, 0.6),
    eye: (p) => p.ember,
    },
    grid: 24,
    frames: [
      wide({
        5: '..................####..',
        6: '.......###########mMMe#.',
        7: '....#mMsMMsMMsMMMMMx#...',
        8: '..#MMsMMsMMsMMMMMM##....',
        9: '..#MMsMMsMMsMMMMM#......',
        10: '..#mMsMMsMMsMMM#........',
        11: '..#m##MM##MM##m#........',
        12: '..#M#.#M#.#M#...........',
        13: '..#M#.#M#.#M#...........',
        14: '..#M#.#M#.#M#...........',
        15: '..##..##..##............',
      }),
      wide({
        5: '..................####..',
        6: '.......###########mMMe#.',
        7: '....#mMsMMsMMsMMMMMx#...',
        8: '..#MMsMMsMMsMMMMMM##....',
        9: '..#MMsMMsMMsMMMMM#......',
        10: '..#mMsMMsMMsMMM#........',
        11: '..#m##MM##MM##m#........',
        12: '...#M#.#M#.#M#..........',
        13: '.#M#..#M#..#M#..........',
        14: '#M#...#M#..#M#..........',
        15: '##....##...##...........',
      }),
    ],
    attack: wide({
      7: '...................####.',
      8: '......############mMMe#.',
      9: '..#mMsMMsMMsMMMMMMx#....',
      10: '#MMsMMsMMsMMMMMMM##.....',
      11: '.#MMsMMsMMsMMMMM#.......',
      12: '.#m##MM##MM##m#.........',
      13: '.#M#.#M#.#M#............',
      14: '#M#..#M#..#M#...........',
      15: '##...##....##...........',
    }),
  },
  /** A slab with a head sunk into it. Shoulders wider than anything else down here. */
  brute: {
    tone: {
      mass: (p) => mix(p.ember, p.rockDeep, 0.45),
    lit: (p) => mix(p.ember, p.citrine, 0.3),
    shade: (p) => mix(p.ember, p.void, 0.62),
    eye: (p) => p.flame,
    },
    grid: 24,
    frames: [
      wide({
        2: '.....##############.....',
        3: '.....#mMMMMMMMMMMm#.....',
        4: '.....#seMMMMMMMMes#.....',
        5: '.....##mMMMxxMMMm##.....',
        6: '....###MMMMMMMMMM###....',
        7: '...#mMMMMMsxxsMMMMMm#...',
        8: '#MMMMMMsxxsMMMMMM#......',
        9: '#mMMMMMsxxsMMMMMm#......',
        10: '#MMMMMMssssMMMMMM#......',
        11: '#mMMMMMssssMMMMMm#......',
        12: '#MMMMMMMMMMMMMMMM#......',
        13: '.##MMMM####MMMM##.......',
        14: '...#MMm#..#mMM#.........',
        15: '...#MM#....#MM#.........',
        16: '...#MM#....#MM#.........',
        17: '...#Mm#....#mM#.........',
        18: '...#MM#....#MM#.........',
        19: '...#MM#....#MM#.........',
        20: '...##mm#..#mm##.........',
        21: '...#####..#####.........',
      }),
      wide({
        2: '.....##############.....',
        3: '.....#mMMMMMMMMMMm#.....',
        4: '.....#seMMMMMMMMes#.....',
        5: '.....##mMMMxxMMMm##.....',
        6: '....###MMMMMMMMMM###....',
        7: '...#mMMMMMsxxsMMMMMm#...',
        8: '#MMMMMMsxxsMMMMMM#......',
        9: '#mMMMMMsxxsMMMMMm#......',
        10: '#MMMMMMssssMMMMMM#......',
        11: '#mMMMMMssssMMMMMm#......',
        12: '#MMMMMMMMMMMMMMMM#......',
        13: '.##MMMM####MMMM##.......',
        14: '...#MMm#..#mMM#.........',
        15: '...#MM#....#MM#.........',
        16: '...#MM#....#MMM#........',
        17: '...#Mm#.....#mM#........',
        18: '.#MM#.......#MM#........',
        19: '.#MM#.......#MM#........',
        20: '.##mm#.....#mm##........',
        21: '.#####.....#####........',
      }),
    ],
    attack: wide({
      0: '...###......###.........',
      1: '...#MM#....#MM#.........',
      2: '...#MM########MM#.......',
      3: '...#MM#mMMMMm#MM#.......',
      4: '...#Mm#seMMes#mM#.......',
      5: '..#MM##mMxxMm##MM#......',
      6: '.#mM###MMMMMM###Mm#.....',
      7: '.##M#mMMsxxsMMm#M##.....',
      8: '...##MMMMsxxsMMMM##.....',
      9: '.....#mMMMsxxsMMMm#.....',
      10: '.....#MMMMssssMMMM#.....',
      11: '.....#mMMMMMMMMMMm#.....',
      12: '.....##MMMMMMMMMM##.....',
      13: '.......##MM####MM##.....',
      14: '........#MM#..#MM#......',
      15: '........#MM#..#MM#......',
      16: '........#Mm#..#mM#......',
      17: '........#MM#..#MM#......',
      18: '........##m#..#m##......',
      19: '........####..####......',
    }),
  },
  /** Four legs, no fur left. What is under the crust of ash is still burning. */
  cinder_hound: {
    tone: {
      mass: (p) => mix(p.flame, p.rockDeep, 0.55),
    lit: (p) => mix(p.flame, p.citrine, 0.25),
    shade: (p) => mix(p.rockDeep, p.void, 0.3),
    eye: (p) => p.flameCore,
    },
    grid: 24,
    frames: [
      wide({
        7: '.................######.',
        8: '................#mMMMe#.',
        9: '................#mMxxM#.',
        10: '..##########MMMMMM##....',
        11: '#smm##mMMsxxsMMMMMM#....',
        12: '..#mMMsxxsMMMMMm#.......',
        13: '..#mMMsMMsMMMMm#........',
        14: '..#m##MM##MM##m#........',
        15: '..#M#.#M#.#M#...........',
        16: '..#M#.#M#.#M#...........',
        17: '..##..##..##............',
      }),
      wide({
        7: '.................######.',
        8: '................#mMMMe#.',
        9: '................#mMxxM#.',
        10: '..##########MMMMMM##....',
        11: '#smm##mMMsxxsMMMMMM#....',
        12: '..#mMMsxxsMMMMMm#.......',
        13: '..#mMMsMMsMMMMm#........',
        14: '..#m##MM##MM##m#........',
        15: '...#M#M#..#M#M#.........',
        16: '.#M#.#M#M#.#M#..........',
        17: '.##..##.##..##..........',
      }),
    ],
    attack: wide({
      8: '..................#####.',
      9: '.................#mMMe#.',
      10: '.................#Mxxe#.',
      11: '...#########MMMM##......',
      12: '.#smm##mMMsxxsMMMM#.....',
      13: '..#mMMsxxsMMMm#.........',
      14: '..#mMMsMMsMMm#..........',
      15: '..#m##MM##Mm#...........',
      16: '.#M#.#M#.#M#............',
      17: '#M#..#M#.#M#............',
      18: '##...##...##............',
    }),
  },
  /** Plated in broken rock. It does not hide; it simply looks like the floor. */
  shale_crawler: {
    tone: {
      mass: (p) => mix(p.rock, p.rockDeep, 0.35),
    lit: (p) => mix(p.rock, p.chalk, 0.3),
    shade: (p) => mix(p.rockDeep, p.void, 0.35),
    eye: (p) => p.quartz,
    },
    grid: 24,
    frames: [
      wide({
        6: '........########........',
        7: '......##mMMMMMMm##......',
        8: '.....#mMsxxxxsMMm##.....',
        9: '..#mMMsxxxxsMMMMm#......',
        10: '..#MMsxxxxsMMMMMMMe#....',
        11: '..#mMMsMMMMsMMMMMMx#....',
        12: '..#mMMsMMMMsMMMMMe#.....',
        13: '..##mMMsMMMMsMMMm##.....',
        14: '...#m##m##m##m##m#......',
        15: '...#.#..#..#..#.#.......',
      }),
      wide({
        6: '........########........',
        7: '......##mMMMMMMm##......',
        8: '.....#mMsxxxxsMMm##.....',
        9: '..#mMMsxxxxsMMMMm#......',
        10: '..#MMsxxxxsMMMMMMMe#....',
        11: '..#mMMsMMMMsMMMMMMx#....',
        12: '..#mMMsMMMMsMMMMMe#.....',
        13: '..##mMMsMMMMsMMMm##.....',
        14: '...##m##m##m##m##.......',
        15: '.....#..#..#..#.........',
      }),
    ],
    attack: wide({
      2: '....########............',
      3: '..##mMMMMMMm##..........',
      4: '.#mMsxxxxsMMm##.........',
      5: '#mMMsxxxxsMMMMm#........',
      6: '#MMsxxxxsMMMMMMMe#......',
      7: '#mMMsMMMMsMMMMMMx#......',
      8: '##mMMsMMMMsMMMMe#.......',
      9: '.##mMMsMMMMsMMm##.......',
      10: '...##mMMsMMMMMm#........',
      11: '.....##mMMMMMMm#........',
      12: '.......#m##m##m#........',
      13: '........#.#..#.#........',
    }),
  },
  /** Nothing solid at all. A knot of moving air with something bright at the centre. */
  gale_wisp: {
    tone: {
      mass: (p) => mix(p.quartz, p.rockDeep, 0.5),
    lit: (p) => mix(p.quartz, p.chalk, 0.3),
    shade: (p) => mix(p.quartz, p.void, 0.6),
    eye: (p) => p.chalk,
    },
    grid: 24,
    frames: [
      wide({
        4: '...........#######......',
        5: '..........#mMMMMMm#.....',
        6: '..###ss#mMsxxxsMM#......',
        7: '.#ssmmm#MsxeeexsM#......',
        8: '.##mssmmMsxxxsMMM#......',
        9: '..###smMMMMsMMMMMm#.....',
        10: '......##mMMsMMMMMm#.....',
        11: '.......##mMMMMMMm##.....',
        12: '..........########......',
      }),
      wide({
        4: '...........#######......',
        5: '..........#mMMMMMm#.....',
        6: '.###s.#mMsxxxsMM#.......',
        7: '..#ssmm#MsxeeexsM#......',
        8: '##mssmmmMsxxxsMMM#......',
        9: '.###ssmMMMMsMMMMMm#.....',
        10: '......##mMMsMMMMMm#.....',
        11: '.......##mMMMMMMm##.....',
        12: '..........########......',
      }),
    ],
    attack: wide({
      4: '.............######.....',
      5: '............#mMMMm#.....',
      6: '.......##s#mMsxxxsM#....',
      7: '....#ssmm#MsxeeexsMM#...',
      8: '..#mssmmMsxxxsMMMMMM#...',
      9: '..###smMMMMsMMMMMMMm#...',
      10: '....##mMMsMMMMMMm#......',
      11: '......##mMMMMMMm##......',
      12: '.........########.......',
    }),
  },
  /** Low and armoured, with one claw far too big for it. Everything it touches frosts. */
  rime_crab: {
    tone: {
      mass: (p) => mix(p.quartz, p.void, 0.4),
    lit: (p) => mix(p.quartz, p.chalk, 0.45),
    shade: (p) => mix(p.quartz, p.void, 0.65),
    eye: (p) => p.chalk,
    },
    grid: 24,
    frames: [
      wide({
        2: '..............##..##....',
        3: '..............#x##x#....',
        4: '..............#xMMx#....',
        5: '..............#MMMM#....',
        6: '..####......#MMM#.......',
        7: '..#xxM#.....#MM#........',
        8: '..#MMM#....#MM#.........',
        9: '..#MMM######MMM#........',
        10: '..##mMMsMMsMMMMMMe#.....',
        11: '...#MMsMMsMMMMMMMx#.....',
        12: '...#mMMsMMsMMMMMMe#.....',
        13: '....##m##m##m##m##......',
        14: '.....#..#..#..#.........',
      }),
      wide({
        2: '..............##..##....',
        3: '..............#x##x#....',
        4: '..............#xMMx#....',
        5: '..............#MMMM#....',
        6: '..####......#MMM#.......',
        7: '..#xxM#.....#MM#........',
        8: '..#MMM#....#MM#.........',
        9: '..#MMM######MMM#........',
        10: '..##mMMsMMsMMMMMMe#.....',
        11: '...#MMsMMsMMMMMMMx#.....',
        12: '...#mMMsMMsMMMMMMe#.....',
        13: '.....##m##m##m##m#......',
        14: '......#..#..#..#........',
      }),
    ],
    attack: wide({
      0: '............###..###....',
      1: '............#xx##xx#....',
      2: '............#xMMMMx#....',
      3: '..............#MMMM#....',
      4: '...............#MM#.....',
      5: '..............#MM#......',
      6: '..####....#MM#..........',
      7: '..#xxM#...#MM#..........',
      8: '..#MMM#..#MM#...........',
      9: '..#MMM######MM#.........',
      10: '...##mMMsMMsMMMMe#......',
      11: '....#MMsMMsMMMMMx#......',
      12: '....#mMMsMMsMMMMe#......',
      13: '.....##m##m##m##........',
      14: '.......#..#..#..........',
    }),
  },
  /** Small, and never where it was. The arc between its horns is the only warning. */
  sparkmite: {
    tone: {
      mass: (p) => mix(p.citrine, p.void, 0.35),
    lit: (p) => mix(p.citrine, p.chalk, 0.35),
    shade: (p) => mix(p.citrine, p.void, 0.6),
    eye: (p) => p.chalk,
    },
    grid: 24,
    frames: [
      wide({
        3: '.......##......##.......',
        4: '.......#x#....#x#.......',
        5: '.......#x#....#x#.......',
        6: '.......##x#..#x##.......',
        7: '........##x##x##........',
        8: '......###mMMMMm###......',
        9: '.....#mMMsxxxxsMMm#.....',
        10: '.....#MMseeeeeesMM#.....',
        11: '.....#mMMsxxxxsMMm#.....',
        12: '......###mMMMMm###......',
        13: '........#mm##mm#........',
        14: '........##....##........',
      }),
      wide({
        3: '.......##......##.......',
        4: '.......#x#....#x#.......',
        5: '.......#x#....#x#.......',
        6: '.......##x#..#x##.......',
        7: '........##x##x##........',
        8: '......###mMMMMm###......',
        9: '.....#mMMsxxxxsMMm#.....',
        10: '.....#MMseeeeeesMM#.....',
        11: '.....#mMMsxxxxsMMm#.....',
        12: '......###mMMMMm###......',
        13: '........#m#..#m#........',
        14: '........##....##........',
      }),
    ],
    attack: wide({
      2: '.......##......##.......',
      3: '.......#x#....#x#.......',
      4: '.......#xx#..#xx#.......',
      5: '........#xx##xx#........',
      6: '.........#xxxxxx#.......',
      7: '.......##xxxxxx##.......',
      8: '......###mMxxMm###......',
      9: '.....#mMMsxxxxsMMm#.....',
      10: '.....#MMseeeeeesMM#.....',
      11: '.....#mMMsxxxxsMMm#.....',
      12: '......###mMMMMm###......',
      13: '........#mm##mm#........',
      14: '........##....##........',
    }),
  },

  // --- demonic --------------------------------------------------------
  //
  // Rot and ember. The family reads as heavy even on the small ones: thick
  // outlines, weight low in the frame, and a lit core showing through.

  /** Small, horned and hunched, arms nearly to the floor. The one that arrives first. */
  imp: {
    tone: {
      mass: (p) => mix(p.venom, p.rockDeep, 0.5),
      lit: (p) => mix(p.venom, p.citrine, 0.3),
      shade: (p) => mix(p.venom, p.void, 0.6),
      eye: (p) => p.ember,
    },
    grid: 16,
    frames: [
      rows({
        3: '...#x#....#x#...',
        4: '....#mMMMMm#....',
        5: '...#mMseesMm#...',
        6: '...#MMsxxsMM#...',
        7: '..##mMMMMMMm##..',
        8: '.#Ms#MMMMMM#sM#.',
        9: '.#M#.#MMMM#.#M#.',
        10: '.##..#mMMm#..##.',
        11: '.....#M##M#.....',
        12: '.....##..##.....',
      }),
      rows({
        3: '...#x#....#x#...',
        4: '....#mMMMMm#....',
        5: '...#mMseesMm#...',
        6: '...#MMsxxsMM#...',
        7: '.##mMMMMMMMMm##.',
        8: '#sM#MMMMMMMM#Ms#',
        9: '.#M#.#MMMM#.#M#.',
        10: '.##..#mMMm#..##.',
        11: '....#M#..#M#....',
        12: '....##....##....',
      }),
    ],
  },
  /** Tall and thin, with an arm on each side that is mostly edge. */
  flenser: {
    tone: {
      mass: (p) => mix(p.rust, p.void, 0.45),
      lit: (p) => mix(p.rust, p.chalk, 0.3),
      shade: (p) => mix(p.rust, p.void, 0.7),
      eye: (p) => p.flame,
    },
    grid: 16,
    frames: [
      rows({
        2: '.....####.......',
        3: '....#mMMm#......',
        4: '....#eMMe#......',
        5: '....##sx##......',
        6: '..###MMMM###....',
        7: '.#xsMMssMMsx#...',
        8: '.#x#MMMMMM#x#...',
        9: '.##.#MMMM#.##...',
        10: '.....#MM#.......',
        11: '....#M##M#......',
        12: '....#M##M#......',
        13: '....##..##......',
      }),
      rows({
        2: '.....####.......',
        3: '....#mMMm#......',
        4: '....#eMMe#......',
        5: '....##sx##......',
        6: '.###.MMMM.###...',
        7: '#xsM#MssM#Msx#..',
        8: '.#x##MMMM##x#...',
        9: '..##.#MM#.##....',
        10: '.....#MM#.......',
        11: '.....#MM#.......',
        12: '....#M##M#......',
        13: '...##....##.....',
      }),
    ],
  },
  /** A sack that got too full. Slow, wide, and lit from the inside. */
  bloat: {
    tone: {
      mass: (p) => mix(p.venom, p.ember, 0.4),
      lit: (p) => mix(p.venom, p.chalk, 0.28),
      shade: (p) => mix(p.venom, p.void, 0.68),
      eye: (p) => p.citrine,
    },
    grid: 16,
    frames: [
      rows({
        2: '......####......',
        3: '.....#mMMm#.....',
        4: '....##sMMs##....',
        5: '..###MMMMMM###..',
        6: '.#mMMMsxxsMMMm#.',
        7: '#mMMMsxeexsMMMm#',
        8: '#MMMMsxxxxsMMMM#',
        9: '#mMMMMsxxsMMMMm#',
        10: '.#mMMMMMMMMMMm#.',
        11: '..##MMMMMMMM##..',
        12: '....#M#..#M#....',
        13: '....##....##....',
      }),
      rows({
        2: '......####......',
        3: '.....#mMMm#.....',
        4: '....##sMMs##....',
        5: '..###MMMMMM###..',
        6: '.#mMMMsxxsMMMm#.',
        7: '#mMMMsxeexsMMMm#',
        8: '#MMMMsxxxxsMMMM#',
        9: '#mMMMMsxxsMMMMm#',
        10: '.#mMMMMMMMMMMm#.',
        11: '..##MMMMMMMM##..',
        12: '...#M#....#M#...',
        13: '...##......##...',
      }),
    ],
  },
  /** The biggest thing in the family, and the horns arrive before it does. */
  hornfiend: {
    tone: {
      mass: (p) => mix(p.ember, p.void, 0.45),
      lit: (p) => mix(p.ember, p.flame, 0.45),
      shade: (p) => mix(p.ember, p.void, 0.72),
      eye: (p) => p.flameCore,
    },
    grid: 16,
    frames: [
      rows({
        1: '.#x#........#x#.',
        2: '.#M##########M#.',
        3: '..#mMMMMMMMMm#..',
        4: '..#MseMMMMesM#..',
        5: '..##MMMxxMMM##..',
        6: '.###MMMMMMMM###.',
        7: '#mMMMMsxxsMMMMm#',
        8: '#MMMMMsxxsMMMMM#',
        9: '#mMMMMssssMMMMm#',
        10: '.#MMMMMMMMMMMM#.',
        11: '..#MM##..##MM#..',
        12: '..##M#....#M##..',
        13: '...#M#....#M#...',
        14: '...#M#....#M#...',
        15: '...###....###...',
      }),
      rows({
        1: '.#x#........#x#.',
        2: '.#M##########M#.',
        3: '..#mMMMMMMMMm#..',
        4: '..#MseMMMMesM#..',
        5: '..##MMMxxMMM##..',
        6: '.###MMMMMMMM###.',
        7: '#mMMMMsxxsMMMMm#',
        8: '#MMMMMsxxsMMMMM#',
        9: '#mMMMMssssMMMMm#',
        10: '.#MMMMMMMMMMMM#.',
        11: '..#MM##..##MM#..',
        12: '..##M#....#MM#..',
        13: '...#M#.....#M#..',
        14: '..#M#......#M#..',
        15: '..###......###..',
      }),
    ],
  },
  /** Teeth on legs. There is no head to speak of — the whole front is the bite. */
  maw: {
    tone: {
      mass: (p) => mix(p.rust, p.ember, 0.35),
      lit: (p) => mix(p.rust, p.citrine, 0.35),
      shade: (p) => mix(p.rust, p.void, 0.6),
      eye: (p) => p.flame,
    },
    grid: 16,
    frames: [
      rows({
        4: '..############..',
        5: '.#mMMMMMMMMMMm#.',
        6: '#MsxsxsxsxsxsxM#',
        7: '#MeMMMMMMMMMMeM#',
        8: '#MsxsxsxsxsxsxM#',
        9: '.#mMMMMMMMMMMm#.',
        10: '..#M#MM##MM#M#..',
        11: '..##.##..##.##..',
      }),
      rows({
        4: '..############..',
        5: '.#mMMMMMMMMMMm#.',
        6: '#MsxsxsxsxsxsxM#',
        7: '#MeMMMMMMMMMMeM#',
        8: '#Ms##########sM#',
        9: '.#mxsxsxsxsxsm#.',
        10: '..#MM#MM##MM#M#.',
        11: '..##..##..##.##.',
      }),
    ],
  },
  /** Robed and hooded, arms held out. Whatever it is saying is not for you. */
  chanter: {
    tone: {
      mass: (p) => mix(p.amethyst, p.void, 0.45),
      lit: (p) => mix(p.amethyst, p.chalk, 0.3),
      shade: (p) => mix(p.amethyst, p.void, 0.68),
      eye: (p) => p.venom,
    },
    grid: 16,
    frames: [
      rows({
        2: '......####......',
        3: '.....#mMMm#.....',
        4: '.....#seem#.....',
        5: '.....##xx##.....',
        6: '...###MMMM###...',
        7: '..#xsMMMMMMsx#..',
        8: '..##MMsxxsMM##..',
        9: '...#MMMMMMMM#...',
        10: '...#mMMMMMMm#...',
        11: '...#MMMMMMMM#...',
        12: '...#mMMMMMMm#...',
        13: '...##########...',
      }),
      rows({
        2: '......####......',
        3: '.....#mMMm#.....',
        4: '.....#seem#.....',
        5: '.....##xx##.....',
        6: '.###.#MMMM#.###.',
        7: '#xs###MMMM###sx#',
        8: '..##MMsxxsMM##..',
        9: '...#MMMMMMMM#...',
        10: '...#mMMMMMMm#...',
        11: '...#MMMMMMMM#...',
        12: '..#mMMMMMMMMm#..',
        13: '..############..',
      }),
    ],
  },

  // --- crystal --------------------------------------------------------
  //
  // Bone-light and facets. Nothing in the family has a body in the way the
  // other two do: these are shapes held together, and they read as hollow.

  /** A splinter that has not decided which way is down. */
  shardling: {
    tone: {
      mass: (p) => mix(p.bone, p.quartz, 0.45),
      lit: (p) => mix(p.bone, p.chalk, 0.35),
      shade: (p) => mix(p.bone, p.void, 0.6),
      eye: (p) => p.quartz,
    },
    grid: 16,
    frames: [
      rows({
        4: '.......##.......',
        5: '......#Mx#......',
        6: '.....#MMeM#.....',
        7: '....#MsxxsM#....',
        8: '....#MseesM#....',
        9: '.....#MsxM#.....',
        10: '......#Mm#......',
        11: '.......##.......',
      }),
      rows({
        3: '.......##.......',
        4: '......#Mm#......',
        5: '.....#MsxM#.....',
        6: '....#MseesM#....',
        7: '....#MsxxsM#....',
        8: '.....#MMeM#.....',
        9: '......#Mx#......',
        10: '.......##.......',
      }),
    ],
  },
  /** Grown sideways across the floor on far too many legs. */
  lattice: {
    tone: {
      mass: (p) => mix(p.quartz, p.verdite, 0.35),
      lit: (p) => mix(p.quartz, p.chalk, 0.4),
      shade: (p) => mix(p.quartz, p.void, 0.62),
      eye: (p) => p.chalk,
    },
    grid: 16,
    frames: [
      rows({
        4: '...####...####..',
        5: '..#mMM#..#MMm#..',
        6: '.##MsxM##MxsM##.',
        7: '#mMMseMMMMesMMm#',
        8: '#MMsxMMMMMMxsMM#',
        9: '.#mMMMMMMMMMMm#.',
        10: '..#M##M##M##M#..',
        11: '..#..#..#..#....',
      }),
      rows({
        4: '...####...####..',
        5: '..#mMM#..#MMm#..',
        6: '.##MsxM##MxsM##.',
        7: '#mMMseMMMMesMMm#',
        8: '#MMsxMMMMMMxsMM#',
        9: '.#mMMMMMMMMMMm#.',
        10: '...#M##M##M##M#.',
        11: '...#..#..#..#...',
      }),
    ],
  },
  /** A rock that is hollow, and the hollow is looking back. */
  geode: {
    tone: {
      mass: (p) => mix(p.amethyst, p.rockDeep, 0.45),
      lit: (p) => mix(p.amethyst, p.chalk, 0.35),
      shade: (p) => mix(p.amethyst, p.void, 0.65),
      eye: (p) => p.quartz,
    },
    grid: 16,
    frames: [
      rows({
        3: '....######......',
        4: '..##mMMMMm##....',
        5: '.#mMsxxxxsMm#...',
        6: '#mMsxeeeexsMMm#.',
        7: '#MMsxeMMexsMMM#.',
        8: '#mMMsxxxxsMMMm#.',
        9: '.#mMMMMMMMMMm#..',
        10: '..##MM##MM##....',
        11: '...#M#..#M#.....',
        12: '...##....##.....',
      }),
      rows({
        3: '....######......',
        4: '..##mMMMMm##....',
        5: '.#mMsxxxxsMm#...',
        6: '#mMsxeeeexsMMm#.',
        7: '#MMsxeMMexsMMM#.',
        8: '#mMMsxxxxsMMMm#.',
        9: '.#mMMMMMMMMMm#..',
        10: '..##MM##MM##....',
        11: '..#M#....#M#....',
        12: '..##......##....',
      }),
    ],
  },
  /** A wedge held a hand above the floor, bright where it should be hollow. */
  prism: {
    tone: {
      mass: (p) => mix(p.quartz, p.amethyst, 0.5),
      lit: (p) => mix(p.chalk, p.quartz, 0.3),
      shade: (p) => mix(p.amethyst, p.void, 0.7),
      eye: (p) => p.chalk,
    },
    grid: 16,
    frames: [
      rows({
        3: '.......##.......',
        4: '......#MM#......',
        5: '.....#MsxM#.....',
        6: '....#MsxexM#....',
        7: '...#MsxeeexM#...',
        8: '..#MsxxeexxsM#..',
        9: '.#mMMsxxxxsMMm#.',
        10: '.##############.',
        11: '..############..',
      }),
      rows({
        2: '.......##.......',
        3: '......#MM#......',
        4: '.....#MsxM#.....',
        5: '....#MsxexM#....',
        6: '...#MsxeeexM#...',
        7: '..#MsxeeeexsM#..',
        8: '.#mMMsxxxxsMMm#.',
        9: '.##############.',
        10: '..############..',
      }),
    ],
  },
  /** A column taller than the hero, walking on the point it stands on. */
  spire: {
    tone: {
      mass: (p) => mix(p.bone, p.amethyst, 0.4),
      lit: (p) => mix(p.bone, p.chalk, 0.45),
      shade: (p) => mix(p.bone, p.void, 0.66),
      eye: (p) => p.citrine,
    },
    grid: 16,
    frames: [
      rows({
        1: '.......##.......',
        2: '......#Mx#......',
        3: '......#MM#......',
        4: '.....#MsxM#.....',
        5: '.....#MeeM#.....',
        6: '....#MMsxMM#....',
        7: '....#MsxxsM#....',
        8: '...#mMMxxMMm#...',
        9: '...#MMsxxsMM#...',
        10: '..#mMMMxxMMMm#..',
        11: '..#MMsxxxxsMM#..',
        12: '.#mMMMMMMMMMMm#.',
        13: '.##############.',
      }),
      rows({
        1: '......#..#......',
        2: '......#Mx#......',
        3: '.....#MMMM#.....',
        4: '.....#MsxM#.....',
        5: '.....#MeeM#.....',
        6: '....#MMsxMM#....',
        7: '....#MsxxsM#....',
        8: '...#mMMxxMMm#...',
        9: '...#MMsxxsMM#...',
        10: '..#mMMMxxMMMm#..',
        11: '..#MMsxxxxsMM#..',
        12: '.#mMMMMMMMMMMm#.',
        13: '..############..',
      }),
    ],
  },
  /** A ring of shards around a core, turning. You hear it before you see it. */
  chime: {
    tone: {
      mass: (p) => mix(p.citrine, p.quartz, 0.5),
      lit: (p) => mix(p.citrine, p.chalk, 0.4),
      shade: (p) => mix(p.citrine, p.void, 0.58),
      eye: (p) => p.chalk,
    },
    grid: 16,
    frames: [
      rows({
        4: '....#x#..#x#....',
        5: '....#MM##MM#....',
        6: '...##mMMMMm##...',
        7: '..#mMsxeexsMm#..',
        8: '..#MMsxeexsMM#..',
        9: '...##mMMMMm##...',
        10: '....#MM##MM#....',
        11: '....#m#..#m#....',
      }),
      rows({
        4: '.....##..##.....',
        5: '...#xMM##MMx#...',
        6: '...#mMMMMMMm#...',
        7: '..##MsxeexsM##..',
        8: '..##MsxeexsM##..',
        9: '...#mMMMMMMm#...',
        10: '...#xMM##MMx#...',
        11: '.....##..##.....',
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
