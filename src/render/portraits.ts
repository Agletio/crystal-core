/**
 * Portraits: who is speaking, drawn at a size a face survives.
 *
 * A map sprite is a silhouette at 24 — enough to tell a grub from a husk across
 * a room, and nothing at all at conversation size. A portrait is a different
 * asset on its own grid, shoulders-up, one frame, and it is inline SVG rather
 * than a canvas cell, so `CELL` does not bind it.
 *
 * Same machinery as the bestiary: the art is characters and what a character
 * means is a palette lookup, resolved at CALL time off the live document.
 */
import { gridRows, mix } from './renderer';
import { GENERATED_PORTRAITS } from './generated-portraits';
import type { Palette } from './renderer';

export interface PortraitArt {
  /** Its own, so one can be redrawn without the others caring. */
  grid: number;
  rows: string[];
  ink: (p: Palette) => Record<string, string>;
}

const rows = gridRows(48);

const DRAWN: Record<string, PortraitArt> = {
  /**
   * Calm, and looking THROUGH something: a banded lens set across the eyes with
   * a light travelling it, where the other two have faces you can meet. Pale
   * and cool, and nothing about him is in a hurry.
   */
  geometer: {
    grid: 48,
    rows: rows({
        2: '....................#########...................',
        3: '...................#hhhhhhhhh#..................',
        4: '..................#hhhhhhhhhhh#.................',
        5: '.................#hhHHHhhhhhhhh#................',
        6: '................#hhhHHHhhhhhhhhh#...............',
        7: '..............##hhhhHHHhhhhhhhhhh##.............',
        8: '.............#hhhhhhHHHhhhhhhhhhhhh#............',
        9: '............#hhhFFFFFFFFFFFFFFFFFhhh#...........',
        10: '...........#hhhFFFFFFFFFFFFFFFFFFFhhh#..........',
        11: '.........##hhhFFFFFFFFFFFFfffffffffhhh##........',
        12: '........#HHHhFFFFFFFFFFFFFffffffffffhhhh#.......',
        13: '........#HHHhFFFFFFFFFFFFFffffffffffhhhh#.......',
        14: '........#HHHhFFFFFFFFFFFFFffffffffffhhhh#.......',
        15: '........#HHHhFFFssssssFFFFffBBBBBBBBBBhh#.......',
        16: '........#HHHhFFFFFFFFFFFFFffffffffffBhhh#.......',
        17: '........#HHHhFFF######FFFFffffBBBBffBhhh#.......',
        18: '........#HHHhFFFeeiieeFFFFfffBBLLBBfBhhh#.......',
        19: '........#HHHhFFFF####FFFFFffBBLeLLBBhhhh#.......',
        20: '........#HHHhFFFFFFFFFFFfFffBLllllLBhhhh#.......',
        21: '........#HHHhFFFFFFFFFFFfFffBBLLLLBBhhhh#.......',
        22: '........#HHHhffsssssFFFFfFfffBBLLBBfhhhh#.......',
        23: '........#HHHhffssssFFFFFfFffffBBBBsfhhhh#.......',
        24: '........#HHHhffffFFFFFFFfFffffffffffhhhh#.......',
        25: '........#HHHhffffFFFFFFFfFffffffffffhhhh#.......',
        26: '........#HHHhhfffFFFFFFFfFfffffffffhhhhh#.......',
        27: '........#HHHhhhffFFFFFFsssffffffffhhhhhh#.......',
        28: '........#HHHhhhhfFFFFFFFFFfffffffhhhhhhh#.......',
        29: '........#HHHhhhhhFFFFmmmmmmfffffhhhhhhhh#.......',
        30: '........#HHHhhhhhhFFFFssssfffffhhhhhhhhh#.......',
        31: '........#HHHhhhhhhhFFFFFFFffffhhhhhhhh##........',
        32: '........#HHH#hhhhhhhFFFFFFFFFhhhhhhh##..........',
        33: '........#HHH###hhhhhhFFFFFFFhhhhhh##............',
        34: '.........###...##hhhhhFFFFFhhhhh##..............',
        35: '.................##hssffffffhh##................',
        36: '...................#ssffffffh#..................',
        37: '...................#ssffffff#...................',
        38: '................####ssffffff####................',
        39: '...............#BBBBBBBBBBBBBBBB##..............',
        40: '............###rrrrrrrrrrrrrrrrrrr###...........',
        41: '.........###rrrrrrrrrrrrrrrrrrrrrrrrr###........',
        42: '......###rrrrrrrrrrrRRRRRRRRRrrrrrrrrrrr###.....',
        43: '...###rrrrrrrrrrrrrrRRRRRRRRRrrrrrrrrrrrrrr###..',
        44: '.##rrrrrrrrrrrrrrrrrRRRRRRRRRrrrrrrrrrrrrrrrrr##',
        45: '#rrrrrrrrrrrrrrrrrrrRRRRRRRRRrrrrrrrrrrrrrrrrrrr',
        46: '#rrrrrrrrrrrrrrrrrrrRRRRRRRRRrrrrrrrrrrrrrrrrrrr',
        47: '#rrrrrrrrrrrrrrrrrrrRRRRRRRRRrrrrrrrrrrrrrrrrrrr',
    }),
    ink: (p) => ({
      '#': mix(p.gloom, p.void, 0.55),
      // Long, parted, never cut. It falls past the jaw so the face is framed
      // rather than sitting in a bowl of it.
      h: mix(p.rose, p.gloom, 0.5),
      H: mix(p.rose, p.blush, 0.4),
      F: mix(p.blush, p.pearl, 0.45),
      f: mix(p.blush, p.rose, 0.4),
      s: mix(p.rose, p.gloom, 0.35),
      e: p.pearl,
      i: mix(p.lilac, p.gloom, 0.25),
      m: mix(p.gloom, p.void, 0.25),
      // The instrument, over ONE eye. The other is open and looking at you:
      // a band across both was a visor, and a visor is not a face.
      B: mix(p.quartz, p.gloom, 0.4),
      L: mix(p.gloom, p.void, 0.15),
      l: mix(p.lilac, p.pearl, 0.35),
      r: mix(p.orchid, p.void, 0.4),
      R: mix(p.orchid, p.gloom, 0.55),
    }),
  },

  /**
   * Starved, and the drawing is mostly the parts that are missing: temples sunk
   * in, cheeks hollow, a jaw that comes to nothing and a neck too thin for the
   * skull on it. The bone half-mask is shoved up on the brow, the eyes are
   * enormous under it and the mouth is open mid-ask. Small bones strung on
   * cords over bare collarbones, because he keeps the good ones. Narrower than
   * anyone else in the table on purpose: the dark either side of him is the
   * whole read.
   */
  osteomancer: {
    grid: 48,
    rows: rows({
        3: '..................############..................',
        4: '................##PPPPPPPPPPPP##................',
        5: '..............##PPPPPPPPPPPPPPPP##..............',
        6: '.............#Pbbwwwwwwwwwwwwwwbbp#.............',
        7: '............#Pbbkkkkkbbbbbbkkkkkbbp#............',
        8: '............#Pbbkkkkkbbbbbbkkkkkbbp#............',
        9: '............#PBBBBBBBBBBBBBBBBBBBBp#............',
        10: '............#PPPPPPPPPPPPPPPPPPPPPP#............',
        11: '............#PkkPPPPPPPPPPPPPPppkkp#............',
        12: '............#Pkkppppppppppppppppkkp#............',
        13: '............#PkkkkkkkkPPPPkkkkkkkkp#............',
        14: '............#PkkkeeekkPPPPkkeeekkkp#............',
        15: '............#PkkeekeekPPPPkeekeekkp#............',
        16: '............#PkkeekeekPPPPkeekeekkp#............',
        17: '............#PkkkeeekkPPPPkkeeekkkp#............',
        18: '............#PkkkkkkkkPPPPkkkkkkkkp#............',
        19: '............#PPPPPPPPPPkkpppppppppp#............',
        20: '............#PPPPPPPPPkkkkppppppppp#............',
        21: '.............#PPkkkkPPPPppppkkkkpp#.............',
        22: '.............#PpkkkkkPPPpppkkkkkpp#.............',
        23: '..............#pkkkkPPPPppppkkkkp#..............',
        24: '...............#kkPPkkkkkkkkPPkk#...............',
        25: '...............#kkPPwkwkkwkwPPkk#...............',
        26: '...............#kkPPkkkkkkkkPPkk#...............',
        27: '...............#kkPPPkwkkwkPPPkk#...............',
        28: '................#kkPPPPPPPPPPkk#................',
        29: '.................#kPPPPPPPPPPk#.................',
        30: '..................#PPPPPPpppp#..................',
        31: '....................#PPPppp#....................',
        32: '....................#ppkkpp#....................',
        33: '...................#PPpkkppp#...................',
        34: '...................#PPpkkppp#...................',
        35: '...................#PPpkkppp#...................',
        36: '...................#PPpkkppp#...................',
        37: '..................#PPPpkkpppp#..................',
        38: '................#PPPPPPPPPPPPPP#................',
        39: '.............#PPPPPPPPPPPPPPPPPPPP#.............',
        40: '..........#PPPPkkkkkkPPPPPPkkkkkkPPPP#..........',
        41: '........#ppwbwpppppppppppppppppppwbwppp#........',
        42: '.......#pppppwbwpppppppppppppppwbwpppppp#.......',
        43: '......#ppppppppwbwpppppppppppwbwppppppppp#......',
        44: '......#ppppppppppwbwpppppppwbwppppppppppp#......',
        45: '......#ppppppppppppwbwpppwbwppppppppppppp#......',
        46: '......#pppppppppppppwbBBBBbwppppppppppppp#......',
        47: '......#pppppppppppppppBBBBppppppppppppppp#......',
    }),
    ink: (p) => ({
      '#': mix(p.char, p.void, 0.35),
      // Raw rather than weathered: he is red where the other three are pale,
      // and the shade is deep enough that a hollow reads as a hole in him.
      P: mix(p.fleshLit, p.sinew, 0.35),
      p: mix(p.flesh, p.char, 0.35),
      k: mix(p.char, p.void, 0.2),
      e: p.venom,
      // The mask on his brow, the strung bones, and what is left of his teeth.
      // The only pale things on him: what he keeps, he cleans.
      b: mix(p.chalk, p.dust, 0.4),
      B: mix(p.dust, p.char, 0.5),
      w: mix(p.chalk, p.dust, 0.1),
    }),
  },

  glasswright: {
    grid: 48,
    rows: rows({
        2: '.....................######.....................',
        3: '....................#hhhhhh#....................',
        4: '...................#hhhhhhhh#...................',
        5: '..................#hhhhhhhhhh#..................',
        6: '.................#hhhhhhhhhhhh#.................',
        7: '.............####hhhhhhhhhhhhhh####.............',
        8: '............#hhhPPPPPPPPPPPPPPPPhhh#............',
        9: '............#hhhPPPPPPPPPPPPPPPPhhh#............',
        10: '............#hhhPPPPPPPPPPPPPPPPhhh#............',
        11: '............#hhhpppppppppppppppphhh#............',
        12: '............#hhhpppppppppppppppphhh#............',
        13: '............#hhhPPPPPPPGgPPPPPPPhhh#............',
        14: '............#hhhPPPPPPPggPPPPPPPhhh#............',
        15: '............#hhhPPPPPPPPPPPPPPPPhhh#............',
        16: '............#hhhpppPPPPPPPPPPppphhh#............',
        17: '............#hhhppGgPPPPPPPPGgpphhh#............',
        18: '............#hhhppggeePPPPeeggpphhh#............',
        19: '............#hhhpppPkkPPPPkkPppphhh#............',
        20: '............#hhhPPPPPPPPPPPPPPPPhhh#............',
        21: '............#hhhPPPPPPPppPPPPPPPhhh#............',
        22: '............#hhhPGgPPPPPPPPPPGgPhhh#............',
        23: '............#hhhPPPPPPPPPPPPPPPPhhh#............',
        24: '............#hhhPPPPPppppppPPPPPhhh#............',
        25: '............#hhhPPPPPPPPPPPPPPPPhhh#............',
        26: '............#hhh##PPPPPGgPPPPP##hhh#............',
        27: '............#hhh#.##PPPPPPPP##.#hhh#............',
        28: '............#hhh#...##PPPP##...#hhh#............',
        29: '............#hhh#...########...#hhh#............',
        30: '............#hhh#..pPPPPPPPPp..#hhh#............',
        31: '............#hhh#..pPPPPPPPPp..#hhh#............',
        32: '............#hhh#..pPPPPPPPPp..#hhh#............',
        33: '............#hhh#..pPPPGgPPPp..#hhh#............',
        34: '............#hhh#..pPPPggPPPp..#hhh#............',
        35: '............#hhh#..pPPPPPPPPp..#hhh#............',
        36: '............#hhh#..pPPPPPPPPp..#hhh#............',
        37: '............#hhh###pPPPPPPPPp###hhh#............',
        38: '............#hhrrrrrPPPPPPPPrrrrrhh#............',
        39: '...........##rrrrrrrPPPPPPPPrrrrrrr##...........',
        40: '.........##rrrrrrrrrRRRRRRRRrrrrrrrrr##.........',
        41: '.......##rrrrrrrrrrrRRRRRRRRrrrrrrrrrrr##.......',
        42: '.....##rrrrrrrrGgrrrRRRRRRRRrrrGgrrrrrrrr##.....',
        43: '...##rrrrrrrrrrggrrrRRRRRRRRrrrggrrrrrrrrrr##...',
        44: '.##rrrrrrrrrrrrrrrrrRRRRRRRRrrrrrrrrrrrrrrrrr##.',
        45: '#rrrrrrrrrrrrrrrrrrrGgRRRRGgrrrrrrrrrrrrrrrrrrr#',
        46: 'rrrrrrrrrrrrrrrrrrrrRRRRRRRRrrrrrrrrrrrrrrrrrrrr',
        47: 'rrrrrrrrrrrrrrrrrrrrRRRRRRRRrrrrrrrrrrrrrrrrrrrr',
    }),
    ink: (p) => ({
      '#': mix(p.void, p.rockDeep, 0.7),
      // A man who has not been outside. Bone with the warmth taken out of it.
      P: mix(p.chalk, p.quartz, 0.22),
      p: mix(p.chalk, p.rockDeep, 0.42),
      h: mix(p.rockDeep, p.void, 0.45),
      e: p.amethyst,
      k: mix(p.amethyst, p.void, 0.5),
      // Set INTO him, so they are lit from under the skin rather than worn.
      g: p.amethyst,
      G: mix(p.amethyst, p.chalk, 0.55),
      r: mix(p.rockDeep, p.void, 0.25),
      R: mix(p.rockDeep, p.void, 0.5),
    }),
  },

  /**
   * A hood, a lamp on a crook, and not much face. What light there is comes
   * off the lamp, so the near edge of the cowl is lit and the far side is
   * gone — which is also why the only things you meet are two eyes.
   */
  lampwright: {
    grid: 48,
    rows: rows({
        5: '......rrrrrrrrrrr..........######...............',
        6: '......RRRRRRRRRRR........##Mmmmmm##.............',
        7: '......rR......rrR......##MMmmmmmmms##...........',
        8: '......rR......rrR.....#MMMmmmmmmmmsss#..........',
        9: '......rR......rrR....#MMMMmmmmmmmmmsss#.........',
        10: '......rR......rrR...#MMMMmsmmmmmmmmssss#........',
        11: '......rR......rrR...#MMMMmsmmmmmmmmmssss#.......',
        12: '......rR......rrR..#MMMMMmsmmmmmmmmmmssss#......',
        13: '..ggggggggggg.rrR..#MMMMMmsmmmmmmmmmmssss#......',
        14: '..ggggggggggg..rrR#MMMMMmmsmmmmmmmmmmsssss#.....',
        15: '..ggggggggggg..rrRlMMMMMmmsmmmmmmmmmmsssss#.....',
        16: '..gglllllllgg..rrRlMMMMMmmsmmmmmmmmmmsssss#.....',
        17: '..gglllllllgg..rrRlMMMMMdddddddddddddmsssss#....',
        18: '..gglwwwwwlgg..rrRllMMMdddddddddddddddsssss#....',
        19: '..gglwwwwwlgg..rrRllMMdddddddddddddddddssss#....',
        20: '..gglwwwwwlgg..rrRllMMdddkkkkddkkkkddddssss#....',
        21: '..gglwwwwwlgg..rrRllMMdddkwekddkwekddddssss#....',
        22: '..gglwwwwwlgg..rrRllMMdddkeekddkeekddddssss#....',
        23: '..gglwwwwwlgg..rrRllMMdddkkkkddkkkkddddssss#....',
        24: '..gglllllllgg..rrRllMMdddddddddddddddddssss#....',
        25: '..gglllllllgg..rrRlMMMdddddddddddddddddssss#....',
        26: '..ggggggggggg..rrR.#MMMddddddddddddddddssss#....',
        27: '..ggggggggggg..rrR.#MMMdddddddddddddddsssss#....',
        28: '..ggggggggggg...rrR#MMMMddfffkkkddddddsssss#....',
        29: '.....ggggg......rrR.#MMMMdfffkkkkddddmssssss#...',
        30: '................rrR.#MMMMMdkkdddddddmsmsssss#...',
        31: '................rrR..#MMMMMddddddddmmsmsssss#...',
        32: '................rrR..#MMMMMmsmmmmmmmmsmmsssss#..',
        33: '................rrR##MMMMMmmmmmmmmmmmsmmsssss#..',
        34: '................rMMMMMMMmmmmmmmmmmmmmsmmssssss#.',
        35: '...............#MMMMMMMmmmmmmmmmmmmmmsmmsssssss#',
        36: '.............##MMMMMMMmmmmmmssssmmmmmsmmsssssss#',
        37: '...........##MMMMMMMmmmmmmmmseesmmmmmsmmsssssss#',
        38: '..........#MMMMMMMMmmmmmmmmmseesmmmmmmmssssssss#',
        39: '.........#MMMMMMMMMmmmmmmmmmssssmmmmmmmssssssss#',
        40: '.........#MMMMMMMMMmmmmmmmmmmsmsmmmmmmmssssssss#',
        41: '........#MMMMMMMMMmmmmmmmmmmmsmsmmmmmmmssssssss#',
        42: '........#MMMMMMMMMmmmmmmmmmmmsmmsmmmmmmssssssss#',
        43: '........#MMMMMMMMMmmmmmmmmmmmsmmsmmmmmmssssssss#',
        44: '........#MMMMMMMMMmmmmmmmmmmsmmmmsmmmmmssssssss#',
        45: '........#MMMMMMMMMmmmmmmmmmmsmmmmsmmmmmssssssss#',
        46: '........#MMMMMMMMMmmmmmmmmmmsmmmmmsmmmmssssssss#',
        47: '........########################################',
    }),
    ink: (p) => ({
      '#': mix(p.void, p.rockDeep, 0.7),
      m: mix(p.rust, p.void, 0.8),
      M: mix(p.rust, p.void, 0.5),
      s: mix(p.void, p.rockDeep, 0.55),
      d: mix(p.void, p.rockDeep, 0.2),
      k: mix(p.bone, p.void, 0.72),
      f: mix(p.bone, p.rust, 0.45),
      e: p.citrine,
      w: mix(p.citrine, p.chalk, 0.55),
      g: mix(p.rockDeep, p.void, 0.35),
      l: mix(p.citrine, p.rust, 0.35),
      r: mix(p.rust, p.void, 0.55),
      R: mix(p.rust, p.void, 0.75),
    }),
  },
};

/** A generated face carries its OWN colours, so its `ink` ignores the palette
 *  where a hand-drawn one looks every character up in it. Generated WINS: a
 *  face that has been redrawn is the one to show. */
export const PORTRAITS: Record<string, PortraitArt> = {
  ...DRAWN,
  ...Object.fromEntries(
    Object.entries(GENERATED_PORTRAITS).map(([id, art]) => [
      id,
      { grid: art.grid, rows: art.rows, ink: () => art.key },
    ])
  ),
};

export const portraitOf = (id: string): PortraitArt | undefined => PORTRAITS[id];
