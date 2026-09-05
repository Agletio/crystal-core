/**
 * The bestiary. Same shape as the armour families: a creature declares its own
 * inks and its own frames, so nine of them share one alphabet in the source and
 * none of them share a colour on screen.
 *
 * `x` is the RANK accent — dull on a common one, lit on a magic, blazing on a
 * rare. The rank also grows the body and lights it; see `GLOW` in `sprites.ts`.
 */
import { gridRows, mix } from './renderer';
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
  /** Its own colours, when it came from a generator rather than a hand. */
  key?: Record<string, string>;
  /** The swing. Absent means it has none yet and stands still to hit you. */
  attack?: string[];
}

/** Every creature declares the grid it was drawn on; this is what they use. */
const rows = gridRows(24);

export const BEASTIARY: Record<string, BeastArt> = {
  /**
   * The Astral-Geometer: upright and still, both hands up holding a shard to
   * the light. The one body down here that is not going anywhere — where the
   * Osteomancer stoops and reaches, this one is measuring.
   */
  geometer: {
    tone: {
      mass: (p) => mix(p.rose, p.gloom, 0.35),
      lit: (p) => mix(p.blush, p.rose, 0.3),
      shade: (p) => mix(p.gloom, p.void, 0.3),
      eye: (p) => p.pearl,
    },
    grid: 24,
    frames: [
      rows({
        4: '.................#......',
        5: '..........####..#M#.....',
        6: '.........#MMMM#.#ee#....',
        7: '........#mmmmmm##ee#....',
        8: '........#mMMMem#.##.....',
        9: '........#mMMMMm##M#.....',
        10: '........#sMMMM#.#m#.....',
        11: '........#mMMMMs##m#.....',
        12: '........#mmmmssmm#......',
        13: '........#mmMmss##.......',
        14: '.......#mmmMmmss#.......',
        15: '.......#mmmMmmss#.......',
        16: '.......#mmmMmmss#.......',
        17: '......#mmmmMmmmss#......',
        18: '......#mmmmMmmmss#......',
        19: '......#mmmmMmmmss#......',
        20: '.....#mmmmmmmmmmss#.....',
        21: '.....#mmmmmmmmmmss#.....',
        22: '......############......',
      }),
      rows({
        5: '..........####...#......',
        6: '.........#MMMM#.#M#.....',
        7: '........#mmmmmm##ee#....',
        8: '........#mMMMem##ee#....',
        9: '........#mMMMMm##M#.....',
        10: '........#sMMMM#.#m#.....',
        11: '........#mMMMMs##m#.....',
        12: '........#mmmmssmm#......',
        13: '........#mmMmss##.......',
        14: '.......#mmmMmmss#.......',
        15: '.......#mmmMmmss#.......',
        16: '.......#mmmMmmss#.......',
        17: '......#mmmmMmmmss#......',
        18: '......#mmmmMmmmss#......',
        19: '......#mmmmMmmmss#......',
        20: '.....#mmmmmmmmmmss#.....',
        21: '.....#mmmmmmmmmmss#.....',
        22: '......############......',
      }),
    ],
  },

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
      rows({
        7: '.....##############.....',
        8: '...##mmmmmmmmmmmmmm##...',
        9: '..#mMsMMsMMsMMsMMsMMm#..',
        10: '..#MMsMMsMMsMMsMMsMMe#..',
        11: '..#MMsMMsMMsMMsMMsMMx#..',
        12: '..#MMsMMsMMsMMsMMsMMe#..',
        13: '..#mMsMMsMMsMMsMMsMMm#..',
        14: '...##mmmmmmmmmmmmmm##...',
        15: '...#s##s##s##s##s##m#...',
        16: '...#.#..#..#..#..#.#....',
      }),
      rows({
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
    attack: rows({
      3: '...............#####....',
      4: '..............#msem#....',
      5: '..............#seeM#....',
      6: '.............##mMx#.....',
      7: '........##########......',
      8: '.....##Mmmmmmmmmm##.....',
      9: '....#mMsMMsMMsMMsM#.....',
      10: '...#MMsmMsmMsmMsmM#.....',
      11: '...#MMsMMsMMsMMsM#......',
      12: '...#mMsMMsMMsMMsMM#.....',
      13: '...##mmmmmmmmmmmm##.....',
      14: '....#s##s##s##s##m#.....',
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
      rows({
        2: '.........######.........',
        3: '........#mMMMMm#........',
        4: '........#mMMMMm#........',
        5: '........#emMMme#........',
        6: '........#mMssMm#........',
        7: '.......##msssm##........',
        8: '.......###mmmm###.......',
        9: '.....#MM##mMMm##MM#.....',
        10: '.....#MM#MMxxMM#MM#.....',
        11: '.....#Ms#MMssMM#sM#.....',
        12: '.....#Mm#MMxxMM#mM#.....',
        13: '.....#MM#MMssMM#MM#.....',
        14: '.....#Ms##MmmM##sM#.....',
        15: '.....#Mm##MMMM##mM#.....',
        16: '.....##m##MmmM##m##.....',
        17: '......##..MMMM..##......',
        18: '........#MM##MM#........',
        19: '........#Mm##mM#........',
        20: '........#MM##MM#........',
        21: '........#MM##MM#........',
        22: '........##s##s##........',
        23: '........##....##........',
      }),
      rows({
        2: '.........######.........',
        3: '........#mMMMMm#........',
        4: '........#mMMMMm#........',
        5: '........#emMMme#........',
        6: '........#mMssMm#........',
        7: '.......##msssm##........',
        8: '.......###mmmm###.......',
        9: '.....#MM##mMMm##MM#.....',
        10: '.....#MM#MMxxMM#MM#.....',
        11: '.....#Ms#MMssMM#sM#.....',
        12: '.....#Mm#MMxxMM#mM#.....',
        13: '.....#MM#MMssMM#MM#.....',
        14: '.....#Ms##MmmM##sM#.....',
        15: '.....#Mm##MMMM##mM#.....',
        16: '.....##m##MmmM##m##.....',
        17: '......##.#MMMM#.##......',
        18: '.......#MMM##MM#........',
        19: '.......#MM#..#MM#.......',
        20: '.......#Mm#..#mM#.......',
        21: '......#MM#...#MM#.......',
        22: '......##m#...#s##.......',
        23: '.......##......##.......',
      }),
    ],
    attack: rows({
      3: '...######...............',
      4: '..#mMMMMm#..............',
      5: '..#emMMme#..............',
      6: '..#mMssMm#..............',
      7: '.##msssm##..............',
      8: '.###mmmm###.####........',
      9: '.#MM##mMMm##MMMM#.......',
      10: '.#MM#MMxxMM##MM##.......',
      11: '.#Ms#MMssMM##...........',
      12: '.#Mm#MMxxMM#............',
      13: '.##m#MMssMM#............',
      14: '..##.#MmmM#.............',
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
      rows({
        5: '..................####..',
        6: '.......###########mMMe#.',
        7: '....#MMsMMsMMsMMMMMx#...',
        8: '..#MMsMmsMmsMmMMMM##....',
        9: '..#MMsMMsMMsMMMMM#......',
        10: '..#mMsMMsMMsMMM#........',
        11: '..#m##MM##Mm##s#........',
        12: '..#M#.#M#.#M#...........',
        13: '..#M#.#M#.#M#...........',
        14: '..#M#.#M#.#M#...........',
        15: '..##..##..##............',
      }),
      rows({
        5: '..................####..',
        6: '.......###########mMMe#.',
        7: '....#MMsMMsMMsMMMMMx#...',
        8: '..#MMsMmsMmsMmMMMM##....',
        9: '..#MMsMMsMMsMMMMM#......',
        10: '..#mMsMMsMMsMMM#........',
        11: '..#m##MM##Mm##s#........',
        12: '...#M#.#M#.#M#..........',
        13: '.#M#..#M#..#M#..........',
        14: '#M#...#M#..#M#..........',
        15: '##....##...##...........',
      }),
    ],
    attack: rows({
      7: '...................####.',
      8: '......############MMMe#.',
      9: '..#MMsMMsMMsMMMMMMx#....',
      10: '#MMsMmsMmsMmMMMMM##.....',
      11: '.#MmsMmsMmsMMMMM#.......',
      12: '.#m##MM##Mm##s#.........',
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
      rows({
        2: '.....##############.....',
        3: '.....#mMMMMMMMMMMm#.....',
        4: '.....#seMMMMMMMMes#.....',
        5: '.....##mMMMxxMMMm##.....',
        6: '....###MMMMMMMMMM###....',
        7: '...#mMMMMMsxxsMMMMMs#...',
        8: '#MMMMMMsxxsMMmMMM#......',
        9: '#mMMMMMsxxsMMMMMm#......',
        10: '#MMMMMMssssMMMMMM#......',
        11: '#mMMMMMssssMMMMMm#......',
        12: '#MMMMMMmmmmMMMMMM#......',
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
      rows({
        2: '.....##############.....',
        3: '.....#mMMMMMMMMMMm#.....',
        4: '.....#seMMMMMMMMes#.....',
        5: '.....##mMMMxxMMMm##.....',
        6: '....###MMMMMMMMMM###....',
        7: '...#mMMMMMsxxsMMMMMs#...',
        8: '#MMMMMMsxxsMMmMMM#......',
        9: '#mMMMMMsxxsMMMMMm#......',
        10: '#MMMMMMssssMMMMMM#......',
        11: '#mMMMMMssssMMMMMm#......',
        12: '#MMMMMMmmmmMMMMMM#......',
        13: '.##MMMM####MMMM##.......',
        14: '...#MMm#..#mMM#.........',
        15: '...#MM#....#MM#.........',
        16: '...#MM#....#MMM#........',
        17: '...#Ms#.....#mM#........',
        18: '.#MM#.......#MM#........',
        19: '.#MM#.......#MM#........',
        20: '.##mm#.....#mm##........',
        21: '.#####.....#####........',
      }),
    ],
    attack: rows({
      0: '...###......###.........',
      1: '...#MM#....#MM#.........',
      2: '...#MM########MM#.......',
      3: '...#MM#mMMMMm#MM#.......',
      4: '...#Mm#seMMes#mM#.......',
      5: '..#MM##mMxxMm##MM#......',
      6: '.#mM###MMMMMM###Mm#.....',
      7: '.##M#mMMsxxsMMm#M##.....',
      8: '...##MMMmsxxsMMMM##.....',
      9: '.....#mMMmsxxsMMMm#.....',
      10: '.....#MMMMssssMMMM#.....',
      11: '.....#mMMMmmmmMMMm#.....',
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
      rows({
        7: '.................######.',
        8: '................#mMMMe#.',
        9: '................#mMxxM#.',
        10: '..##########MMMMMM##....',
        11: '#smm##mMMsxxsMMMMMM#....',
        12: '..#mMMsxxsMMmMMm#.......',
        13: '..#mMMsMMsMMMMm#........',
        14: '..#m##mM##MM##s#........',
        15: '..#M#.#M#.#M#...........',
        16: '..#M#.#M#.#M#...........',
        17: '..##..##..##............',
      }),
      rows({
        7: '.................######.',
        8: '................#mMMMe#.',
        9: '................#mMxxM#.',
        10: '..##########MMMMMM##....',
        11: '#smm##mMMsxxsMMMMMM#....',
        12: '..#mMMsxxsMMmMMm#.......',
        13: '..#mMMsMMsMMMMm#........',
        14: '..#m##mM##MM##m#........',
        15: '...#M#M#..#M#M#.........',
        16: '.#M#.#M#M#.#M#..........',
        17: '.##..##.##..##..........',
      }),
    ],
    attack: rows({
      8: '..................#####.',
      9: '.................#mMMe#.',
      10: '.................#Mxxe#.',
      11: '...#########MMMM##......',
      12: '.#smm##mMMsxxsMMMM#.....',
      13: '..#mMMsxxsmMMm#.........',
      14: '..#mMMsMMsMMm#..........',
      15: '..#m##mM##Mm#...........',
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
      rows({
        6: '........########........',
        7: '......##mMMMMMMm##......',
        8: '.....#mMsxxxxsMMm##.....',
        9: '..#MMMsxxxxsMmMMm#......',
        10: '..#MMsxxxxsmMMMMMMe#....',
        11: '..#mMmsMMMmsMMMMMMx#....',
        12: '..#mMMsMMMMsMMMMMe#.....',
        13: '..##mMmsMMMmsMMMm##.....',
        14: '...#s##s##s##s##m#......',
        15: '...#.#..#..#..#.#.......',
      }),
      rows({
        6: '........########........',
        7: '......##mMMMMMMm##......',
        8: '.....#mMsxxxxsMMm##.....',
        9: '..#MMMsxxxxsMmMMm#......',
        10: '..#MMsxxxxsmMMMMMMe#....',
        11: '..#mMmsMMMmsMMMMMMx#....',
        12: '..#mMMsMMMMsMMMMMe#.....',
        13: '..##mMmsMMMmsMMMm##.....',
        14: '...##m##m##m##m##.......',
        15: '.....#..#..#..#.........',
      }),
    ],
    attack: rows({
      2: '....########............',
      3: '..##mMMMMMMm##..........',
      4: '.#mMsxxxxsMMm##.........',
      5: '#mMMsxxxxsMMMMm#........',
      6: '#MMsxxxxsmMMMMMMe#......',
      7: '#mMmsMMMmsMMMMMMx#......',
      8: '##mMmsMMMmsMMMMe#.......',
      9: '.##mMmsMMMmsMMm##.......',
      10: '...##mmMsMMmMMm#........',
      11: '.....##mmMMMMMm#........',
      12: '.......#m##s##s#........',
      13: '........#.#..#.#........',
    }),
  },

  // --- demonic --------------------------------------------------------
  //
  // Rot and ember. The family reads as heavy even on the small ones: thick
  // outlines, weight low in the frame, and a lit core showing through.


  // --- crystal --------------------------------------------------------
  //
  // Bone-light and facets. Nothing in the family has a body in the way the
  // other two do: these are shapes held together, and they read as hollow.

};

/** The frames alone, for the harness that only asks whether they are well formed. */
export const MONSTER_FRAMES: Record<string, string[][]> = Object.fromEntries(
  Object.entries(BEASTIARY).map(([id, art]) => [id, art.frames])
);

/** Common, magic, rare. The accent ink keys off this, and `GLOW` is the light
 *  a rank is drawn with. */
export type MonsterRank = 'common' | 'magic' | 'rare' | 'risen';

