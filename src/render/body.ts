/**
 * The figure under the armour: a person in a shirt and trousers, facing right.
 * It has to read on its own, because a fresh character wears nothing.
 *
 * The grip is at (11, 9) and `POSES[..].hand` moves it. Every weapon is drawn
 * against that one point.
 */
import type { PoseId } from './pose';

/**
 * `#` ink · `s` skin · `e` eye · `h` hair · `t` shirt · `T` shirt shadow
 * `l` trouser · `L` trouser shadow · `b` bare foot
 */
export const BODY: Record<PoseId, string[]> = {
  walk0: [
    '................',
    '................',
    '.....####.......',
    '....#hhhh#......',
    '....#hsse#......',
    '....#ssss#......',
    '.....#ss#.......',
    '...##tttt##.....',
    '..#tTttttTt#....',
    '..#sTttttTss#...',
    '...#TttttT#.....',
    '...#llllll#.....',
    '...#lL##Ll#.....',
    '...#lL..Ll#.....',
    '...#bb..bb#.....',
    '...###..###.....',
  ],
  // A row lower with the trailing leg swept back, so the figure sinks into the
  // step. Baked in rather than shifted: the cell has no row 16.
  walk1: [
    '................',
    '................',
    '................',
    '.....####.......',
    '....#hhhh#......',
    '....#hsse#......',
    '....#ssss#......',
    '.....#ss#.......',
    '...##tttt##.....',
    '..#tTttttTt#....',
    '..#sTttttTss#...',
    '...#TttttT#.....',
    '...#llllll#.....',
    '..#lL#..#Ll#....',
    '..#bb....#bb#...',
    '..###.....###...',
  ],
  // walk1's legs exactly, so one boot drawing serves both: a lunge is a
  // stride with the shoulders squared and the arm driving through it.
  attack: [
    '................',
    '................',
    '................',
    '.....####.......',
    '....#hhhh#......',
    '....#hsse#......',
    '....#ssss#......',
    '....##ss#.......',
    '...#tttttt##....',
    '..#tTttttTtt#...',
    '..#sTttttTss#...',
    '...#TttttT#.....',
    '...#llllll#.....',
    '..#lL#..#Ll#....',
    '..#bb....#bb#...',
    '..###.....###...',
  ],
  // Braced back on the rear foot with the arm out in FRONT, not straight up.
  // A raised arm reads as a signal; an extended one reads as aiming.
  cast: [
    '................',
    '................',
    '................',
    '.....####.......',
    '....#hhhh#......',
    '....#hsse#.##...',
    '....#ssss#ss#...',
    '...##tttt##.....',
    '..#tTttttT#.....',
    '..#sTttttT#.....',
    '...#TttttT#.....',
    '...#llllll#.....',
    '...#lL##Ll#.....',
    '..#lL...Ll#.....',
    '..#bb...bb#.....',
    '..###...###.....',
  ],
};
