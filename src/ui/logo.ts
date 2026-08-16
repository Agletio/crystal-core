/**
 * The title's mark: the crystal the game is named for, grid art like every
 * other icon, so the logo takes its colours from CSS and is not an image file.
 *
 * A cut gem is told by its SILHOUETTE, and three readings were paid for: a dark
 * body inside a bright outline is a jar, a straight girdle between two points
 * is a lantern, and a seam run to the tips leaves it with a stem.
 */
import { gridIcon } from './screenicons';

const MARK = [
  '..........o+..........',
  '.........oo++.........',
  '........oo##++........',
  '.......ooo##+++.......',
  '......oooo##++++......',
  '.....ooooo##+++++.....',
  '....oooooo##++++++....',
  '.....ooooo##+++++.....',
  '......oooo##++++......',
  '.......ooo##+++.......',
  '........oo##++........',
  '.........oo++.........',
  '..........o+..........',
];

/** Drawn at a WIDTH, since the height follows the grid. */
export const logoMark = (width = 132): SVGSVGElement => gridIcon(MARK, width, 'logo__mark');
