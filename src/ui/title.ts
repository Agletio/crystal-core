/**
 * The title screen: the mark and the wordmark on a ceremonial plaque, over
 * quiet lamplit stone. Anything dismisses it. The gem behind everything is the
 * logo drawn enormous and barely visible — what keeps the ground from being a
 * black void without becoming a picture again — and below the plaque is THE
 * FISSURE itself: the thin crack the whole game descends into, two torch
 * flames at its mouth. Grid art with inks out of CSS, painted once.
 */
import { logoMark } from './logo';
import { crystalIcon } from './icons';
import { gridIcon } from './screenicons';

const $ = (id: string) => document.getElementById(id)!;

let onStart: (() => void) | null = null;

export const isTitleUp = (): boolean => !$('title').hidden;

// `#` is the split and the torch stakes, `o` the glow spilling out of it and
// the flame bodies, `+` the flame cores.
const CRACK = [
  '.................o.................',
  '.................o.................',
  '................oo.................',
  '................o..................',
  '................oo.................',
  '.................o.................',
  '.................oo................',
  '..................o................',
  '.................oo................',
  '.................o.................',
  '................oo.................',
  '................o..................',
  '...............oo..................',
  '................o..................',
  '................oo.................',
  '.................o.................',
  '.................oo................',
  '..................o................',
  '.................#o#...............',
  '.................#o#...............',
  '................#oo#...............',
  '................#o+#...............',
  '...............#oo+o#..............',
  '...............#o++o#..............',
  '....+..........#o++o#.........+....',
  '...+++.........#o++oo#.......+++...',
  '...o+o+.......#oo+++o#.......o+o+..',
  '..+oooo.......#o++++o#......+oooo..',
  '..ooooo.......#oo+++oo#.....ooooo..',
  '...ooo........#o+++++o#......ooo...',
  '....o.........#oo+++oo#.......o....',
  '....#.........#o+++++o#.......#....',
  '....#........#oo+++++oo#......#....',
  '....#........#o+++++++o#......#....',
  '.............#oo+++++++oo#.........',
  '..........ooo+++++++++++ooo........',
];

function dismiss(): void {
  if ($('title').hidden) return;
  $('title').hidden = true;
  onStart?.();
}

export function initTitle(start: () => void): void {
  onStart = start;

  // The mark over the wordmark is the HIGHEST-TIER Normal crystal — the thing
  // the game is about — and the ghost stays the abstract gem glyph.
  $('title-mark').replaceChildren(crystalIcon(4, 110, 'normal'));
  $('title-ghost').replaceChildren(logoMark());
  $('title-crack').replaceChildren(gridIcon(CRACK, 120));

  $('title').addEventListener('click', dismiss);
  // On the window: the layer would have to be focused to hear a key.
  globalThis.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    if (isTitleUp() && key !== 'Escape') dismiss();
  });
}
