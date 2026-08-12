/**
 * A flask at the level it is actually at. Three states because there are three,
 * and only the LIQUID moves between them — same glass every time, so it reads
 * as one object emptying rather than three pictures. Colour is the pool's.
 */
import { gridIcon } from './screenicons';

const GLASS = [
  '....####....',
  '....#..#....',
  '....#..#....',
  '...#....#...',
  '..#......#..',
  '..#......#..',
  '..#......#..',
  '..#......#..',
  '..#......#..',
  '..#......#..',
  '...######...',
  '............',
];

/** Rows the liquid reaches. */
const LIQUID: Record<number, number[]> = {
  2: [4, 5, 6, 7, 8, 9],
  1: [7, 8, 9],
  0: [],
};

export function flaskIcon(charges: number, max: number, size = 26): SVGSVGElement {
  // Anything above a full flask still draws as full: the art is a state, not a
  // gauge, and a third charge from a trade must not invent a fourth picture.
  const step = charges >= max ? 2 : charges > 0 ? 1 : 0;
  const wet = new Set(LIQUID[step]);
  const rows = GLASS.map((row, y) =>
    wet.has(y) ? row.replace(/(\.{2}#)(.{6})(#)/, (_m, a, _b, c) => `${a}oooooo${c}`) : row
  );
  return gridIcon(rows, size, 'sicon--flask');
}
