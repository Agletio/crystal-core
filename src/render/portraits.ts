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
