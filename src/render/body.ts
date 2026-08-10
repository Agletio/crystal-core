/**
 * The figure under the armour: a person in a shirt and trousers, facing right.
 * It has to read on its own, because a fresh character wears nothing.
 *
 * The grip is at (17, 14) and `POSES[..].hand` moves it. Every weapon is drawn
 * against that one point.
 */
import type { PoseId } from './pose';

/**
 * `#` ink · `s` skin · `e` eye · `h` hair · `t` shirt · `T` shirt shadow
 * `l` trouser · `L` trouser shadow · `b` bare foot
 */
export const BODY: Record<PoseId, string[]> = {
  walk0: [
    '........................',
    '........................',
    '........................',
    '........######..........',
    '.......#hhhhhh#.........',
    '.......#hhhhhh#.........',
    '.......#hhssse#.........',
    '.......#hsssse#.........',
    '.......#ssssss#.........',
    '........#ssss#..........',
    '........#sss#...........',
    '.....##ttttttt##........',
    '...#ttTtttttttTttt#.....',
    '...#ssTtttttttTttt#.....',
    '...#ssTtttttttTsss#.....',
    '.....#TtttttttT#........',
    '.....#TtttttttT#........',
    '.....#lllllllll#........',
    '.....#llL###Lll#........',
    '.....#llL###Lll#........',
    '.....#llL...Lll#........',
    '.....#bbb...bbb#........',
    '.....#bbb...bbb#........',
    '.....####...####........',
  ],
  // A row lower with the legs swept apart, so the figure sinks into the step.
  // Baked in rather than shifted: the cell has no row 24.
  walk1: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........######..........',
    '.......#hhhhhh#.........',
    '.......#hhhhhh#.........',
    '.......#hhssse#.........',
    '.......#hsssse#.........',
    '.......#ssssss#.........',
    '........#ssss#..........',
    '........#sss#...........',
    '.....##ttttttt##........',
    '...#ttTtttttttTttt#.....',
    '...#ssTtttttttTttt#.....',
    '...#ssTtttttttTsss#.....',
    '.....#TtttttttT#........',
    '.....#TtttttttT#........',
    '.....#lllllllll#........',
    '....#llL#....#Lll#......',
    '....#llL#....#Lll#......',
    '....#bbb#....#bbb#......',
    '....#bbb#....#bbb#......',
    '....#####....#####......',
  ],
  // walk1's legs exactly, so one boot drawing serves both: a lunge is a
  // stride with the shoulders squared and the arm driving through it.
  attack: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........######..........',
    '.......#hhhhhh#.........',
    '.......#hhhhhh#.........',
    '.......#hhssse#.........',
    '.......#hsssse#.........',
    '.......#ssssss#.........',
    '........#ssss#..........',
    '........#sss#...........',
    '.....#ttttttttt#........',
    '...#ttTtttttttTttt#.....',
    '...#ssTtttttttTttt#.....',
    '...#ssTtttttttTsss#.....',
    '.....#TtttttttT#........',
    '.....#TtttttttT#........',
    '.....#lllllllll#........',
    '....#llL#....#Lll#......',
    '....#llL#....#Lll#......',
    '....#bbb#....#bbb#......',
    '....#bbb#....#bbb#......',
    '....#####....#####......',
  ],
  // Braced back on the rear foot with the arm out in FRONT, not straight up.
  // A raised arm reads as a signal; an extended one reads as aiming.
  cast: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........######..........',
    '.......#hhhhhh#.........',
    '.......#hhhhhh#.........',
    '.......#hhssse#.........',
    '.......#hsssse#...####..',
    '.......#ssssss##sss#....',
    '........#ssss#sssss#....',
    '........#sss#ss#........',
    '.....##ttttttt##........',
    '...#ttTtttttttT#........',
    '...#ssTtttttttT#........',
    '.....#TtttttttT#........',
    '.....#TtttttttT#........',
    '.....#lllllllll#........',
    '.....#llL###Lll#........',
    '.....#llL###Lll#........',
    '....#llL.....Lll#.......',
    '....#bbb.....bbb#.......',
    '....#bbb.....bbb#.......',
    '....####.....####.......',
  ],
};
