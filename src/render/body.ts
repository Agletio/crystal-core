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
  // Shoulders squared over the front foot. Feet stay where walk0 put them —
  // the lunge is the whole figure going forward, and boots are one grid.
  attack: [
    '................',
    '................',
    '................',
    '.....####.......',
    '....#hhhh#......',
    '....#hsse#......',
    '....#ssss#......',
    '....#tttt##.....',
    '..##tttttTt#....',
    '..#sTttttTss#...',
    '...#TttttT#.....',
    '...#llllll#.....',
    '...#lL##Ll#.....',
    '...#lL..Ll#.....',
    '...#bb..bb#.....',
    '...###..###.....',
  ],
  // Casting arm up and locked to the shoulder, so it reads as an arm rather
  // than as a brick floating beside the head.
  cast: [
    '................',
    '..........##....',
    '.........#ss#...',
    '.....####Tss#...',
    '....#hhhh#s#....',
    '....#hsse##.....',
    '....#ssss#......',
    '...##tttt#......',
    '..#tTttttT#.....',
    '..#sTttttT#.....',
    '...#TttttT#.....',
    '...#llllll#.....',
    '...#lL##Ll#.....',
    '...#lL..Ll#.....',
    '...#bb..bb#.....',
    '...###..###.....',
  ],
};
