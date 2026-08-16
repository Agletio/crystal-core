/**
 * A flask at the level it is actually at. The generated flask wins — one
 * picture per pool, drained states said with a class the stylesheet reads —
 * and the hand-drawn glass stays as the fallback, where only the LIQUID moves
 * between its three states. Colour is the pool's either way.
 */
import { drawn } from './icons';
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

export function flaskIcon(charges: number, max: number, size = 26, pool?: string): SVGSVGElement {
  const own = pool ? drawn(`flask_${pool}`, size) : null;
  if (own) {
    // One picture; drained states are the same flask gone dull, via CSS.
    if (charges <= 0) own.classList.add('flaskart--dry');
    else if (charges < max) own.classList.add('flaskart--low');
    return own;
  }
  // Anything above a full flask still draws as full: the art is a state, not a
  // gauge, and a third charge from a trade must not invent a fourth picture.
  const step = charges >= max ? 2 : charges > 0 ? 1 : 0;
  const wet = new Set(LIQUID[step]);
  const rows = GLASS.map((row, y) =>
    wet.has(y) ? row.replace(/(\.{2}#)(.{6})(#)/, (_m, a, _b, c) => `${a}oooooo${c}`) : row
  );
  return gridIcon(rows, size, 'sicon--flask');
}
