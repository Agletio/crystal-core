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
import { gridRows, mix } from './gear-art';
import type { Palette } from './renderer';

export interface PortraitArt {
  /** Its own, so one can be redrawn without the others caring. */
  grid: number;
  rows: string[];
  ink: (p: Palette) => Record<string, string>;
}

const rows = gridRows(48);

export const PORTRAITS: Record<string, PortraitArt> = {
  /**
   * Calm, and looking THROUGH something: a banded lens set across the eyes with
   * a light travelling it, where the other two have faces you can meet. Pale
   * and cool, and nothing about him is in a hurry.
   */
  geometer: {
    grid: 48,
    rows: rows({
        1: '..................##########....................',
        2: '...............####HHHHHHHH####.................',
        3: '.............##HHHHHHHHHHHHHHHH##...............',
        4: '...........##HHHHHHHHHHHHHHHHHHHH##.............',
        5: '..........#HHHHHHHHHHHHHHHHHHHHHHHh#............',
        6: '.........#HHHHHHHHHHHHHHHHHHHHHHHhhh#...........',
        7: '.........#HHHHH##############HHHhhhhh#..........',
        8: '.........#HHHH#PPPPPPPPPPPPPP#Hhhhhhhh#.........',
        9: '.........#HHH#PPPPPPPPPPPPPPPPp#hhhhhhh#........',
        10: '.........#HHH#PPPPPPPPPPPPPPPPpp#hhhhhhh#.......',
        11: '.........#HH#PPPPPPPPPPPPPPPPPPpp#hhhhhhh#......',
        12: '.........#HH#PPPPPPPPPPPPPPPPPPpp#hhhhhh#.......',
        13: '.........#HH#######################hhhhhh#......',
        14: '.........#HH#vvvvvvvvvvvvvvvvvvvv#hhhhhh#.......',
        15: '.........#HH#vVVvvvvvvvvvvvvvvvVv#hhhhhh#.......',
        16: '.........#HH#vVeVvvvvvvvvvvvvVeVv#hhhhh#........',
        17: '.........#HH#vVVvvvvvvvvvvvvvvVVv#hhhhh#........',
        18: '.........#HH#vvvvvvvvvvvvvvvvvvvv#hhhhh#........',
        19: '.........#HH######################hhhhh#........',
        20: '.........#HH#PPPPPPPPPPPPPPPPPPpp#hhhh#.........',
        21: '.........#HH#PPPPPPPPPPPPPPPPPPpp#hhhh#.........',
        22: '.........#HH#PPPPPPPPkkkkPPPPPPpp#hhhh#.........',
        23: '.........#HH#PPPPPPPkkkkkkPPPPPpp#hhhh#.........',
        24: '.........#HH#PPPPPPPkkkkkkPPPPPpp#hhh#..........',
        25: '..........#H#PPPPPPPPkkkkPPPPPPpp#hhh#..........',
        26: '..........#H#PPPPPPPPPPPPPPPPPPpp#hh#...........',
        27: '..........#H#PPPPPPPPPPPPPPPPPPpp#hh#...........',
        28: '..........#H#PPPPPPkkkkkkkkPPPPpp#hh#...........',
        29: '..........#H#PPPPPPPPPPPPPPPPPPpp#hh#...........',
        30: '...........#h#PPPPPPPPPPPPPPPPpp#hh#............',
        31: '...........#h##PPPPPPPPPPPPPPp##hh#.............',
        32: '............#hh###PPPPPPPPP###hhh#..............',
        33: '.............#hhh##########hhhhh#...............',
        34: '..............#hhhhhhhhhhhhhhh#.................',
        35: '...............###hhhhhhhhh###..................',
        36: '..................#########.....................',
        37: '.........########PPPPPPPPPP########.............',
        38: '......####rrrrrrrrrrrrrrrrrrrrrrrr####..........',
        39: '....##rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr##........',
        40: '..##rrrrrrrrrrrrrrVVrrrrrrrrrrrrrrrrrrrr##......',
        41: '.#rrrrrrrrrrrrrrrVeeVrrrrrrrrrrrrrrrrrrrr#......',
        42: '#rrrrrrrrrrrrrrrrVeeVrrrrrrrrrrrrrrrrrrrrr#.....',
        43: 'rrrrrrrrrrrrrrrrrrVVrrrrrrrrrrrrrrrrrrrrrrr#....',
        44: 'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr#...',
        45: 'rrrrrrrrrrrrrrrrRRRRRRRRRRrrrrrrrrrrrrrrrrrrr#..',
        46: 'rrrrrrrrrrrrrrrRRRRRRRRRRRRrrrrrrrrrrrrrrrrrr#..',
        47: 'rrrrrrrrrrrrrrRRRRRRRRRRRRRRrrrrrrrrrrrrrrrrr#..',
    }),
    ink: (p) => ({
      '#': mix(p.gloom, p.void, 0.55),
      // Grown long and never cut, the colour of the rock he lives in.
      H: mix(p.rose, p.blush, 0.35),
      h: mix(p.rose, p.gloom, 0.45),
      P: mix(p.blush, p.pearl, 0.35),
      p: mix(p.blush, p.rose, 0.5),
      k: mix(p.gloom, p.void, 0.3),
      // The lens. Dark glass with a light going along it, which is what the
      // Cavern's own rock does — he is wearing a piece of the place.
      v: mix(p.gloom, p.void, 0.15),
      V: mix(p.lilac, p.gloom, 0.35),
      e: p.pearl,
      r: mix(p.orchid, p.void, 0.35),
      R: mix(p.orchid, p.gloom, 0.5),
    }),
  },

  /**
   * Leaning INTO the frame, which nobody else does. A bone half-mask shoved up
   * onto the brow, one eye wide under it and the mouth open mid-ask; small
   * bones strung on cords across the shoulders, because he keeps the good ones.
   */
  osteomancer: {
    grid: 48,
    rows: rows({
        1: '..................##########....................',
        2: '...............####hhhhhhhhhh####...............',
        3: '.............##hhhhhhhhhhhhhhhhhh##.............',
        4: '...........##hhhHHHHHhhhhhhhhhhhhhh##...........',
        5: '..........#hhhHHHHHHHhhhhhhhhhhhhhhh#...........',
        6: '.........#hhhHHHHHHHhhhhhhhhhhhhhhhhh#..........',
        7: '.........#hhhhhhhhhhhhhhhhhhhhhhhhhhh#..........',
        8: '.........#hhh###################hhhhh#..........',
        9: '.........#hh##PPPPPPPPPPPPPPPPpp##hhh#..........',
        10: '.........#h##PPPPPPPPPPPPPPPPPPpp##hh#..........',
        11: '.........#h#PPPPPPPPPPPPPPPPPPPPpp#hh#..........',
        12: '.........#h#PPPPPPPPPPPPPPPPPPPPppp#h#..........',
        13: '.........#h#PPPPPPPPPPPPPPPPPPPPppp#h#..........',
        14: '.........#h#PPPkkkkkPPPPPPkkkkkPppp#h#..........',
        15: '.........#h#PPkkkkkkkPPPPkkkkkkkppp#h#..........',
        16: '.........#h#PPkkeekkkPPPPkkkeekkkpp#h#..........',
        17: '.........#h#PPkkeekkkPPPPkkkeekkkpp#h#..........',
        18: '.........#h#PPkkkkkkkPPPPkkkkkkkkpp#h#..........',
        19: '.........#h#PPPkkkkkPPPPPPkkkkkPppp#h#..........',
        20: '.........#h#PPPPPPPPPPPPPPPPPPPPppp#h#..........',
        21: '.........#h#PPPPPPPPPkkkkPPPPPPPPpp#h#..........',
        22: '.........#h##PPPPPPPPkkkkPPPPPPPpp##h#..........',
        23: '..........#h#PPPPPPPPkkkkPPPPPPPpp#hh#..........',
        24: '..........#h######################hhh#..........',
        25: '..........#hh#wwbbbbbbbbbbbbbbbww#hhh#..........',
        26: '..........#hh#wbbbbbbbbbbbbbbbbbw#hhh#..........',
        27: '..........#hhh#bbbbkkbbbbkkbbbbb#hhh#...........',
        28: '...........#hh#bbbbkkbbbbkkbbbbb#hhh#...........',
        29: '...........#hh#bbbbbbbbbbbbbbbbb#hh#............',
        30: '...........#hh#BbbbbbbbbbbbbbbbB#hh#............',
        31: '............#h#BBbbbbbbbbbbbbbBB#hh#............',
        32: '............#h#BBBbbbbbbbbbbbBBB#h#.............',
        33: '............#h##BBBBbbbbbbbBBBB##h#.............',
        34: '.............#h###BBBBBBBBBBB###hh#.............',
        35: '.............#hhh###########hhhhh#..............',
        36: '..............#hhhhhhhhhhhhhhhhh#...............',
        37: '...............##hhhhhhhhhhhhh##................',
        38: '.........########hhhhhhhhhhhhh########..........',
        39: '......####gggggggggggggggggggggggggg####........',
        40: '....##ggggggggwbwgggggggggggggwbwgggggg##.......',
        41: '..##gggggggggggwbwgggggggggggwbwggggggggg##.....',
        42: '.#ggggggggggggggwbwgggggggggwbwgggggggggggg#....',
        43: '#gggggggggggggggggwbwgggggwbwgggggggggggggg#....',
        44: 'gggggggggggggggggggwbwgggwbwggggggggggggggggg#..',
        45: 'gggggggggggggggggggggwbwwbwgggggggggggggggggg#..',
        46: 'ggggggggggggggggggggGGGwbwGGGggggggggggggggggg#.',
        47: 'gggggggggggggggggggGGGGGGGGGGGgggggggggggggggg#.',
    }),
    ink: (p) => ({
      '#': mix(p.char, p.void, 0.35),
      // Wrapped rather than hooded: he has bound his own head up out of the
      // way, which is a different silhouette from the man with the lamp.
      h: mix(p.char, p.gore, 0.35),
      H: mix(p.gore, p.char, 0.35),
      // What is left of a face above the plate. Dark: he has been down here.
      P: mix(p.flesh, p.char, 0.35),
      p: mix(p.flesh, p.char, 0.62),
      k: mix(p.char, p.void, 0.15),
      e: p.venom,
      // The plate over his nose and mouth, and the small bones on the cords.
      // The only pale things on him: what he keeps, he cleans.
      b: mix(p.chalk, p.dust, 0.4),
      B: mix(p.dust, p.char, 0.5),
      w: mix(p.chalk, p.dust, 0.1),
      g: mix(p.gore, p.void, 0.2),
      G: mix(p.gore, p.char, 0.5),
    }),
  },

  lambengolmor: {
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

export const portraitOf = (id: string): PortraitArt | undefined => PORTRAITS[id];
