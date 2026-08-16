/**
 * The title screen. Drawn from the PORTRAIT grid rather than the map's: a
 * 24-grid body blown up is a silhouette, and the portraits already exist at 48
 * for this exact reason. Anything dismisses it.
 */
import { PORTRAITS } from '../render/portraits';
import { portraitIcon } from './icons';
import { clearTitleArt, paintTitle } from './titleart';
import { logoMark } from './logo';

const $ = (id: string) => document.getElementById(id)!;

let onStart: (() => void) | null = null;

/** The art is a still, so a resize is what repaints it — coalesced, because a
 *  drag of a window edge is a hundred of them. */
let repaint: ReturnType<typeof setTimeout> | undefined;

function art(): HTMLCanvasElement {
  return $('title-art') as HTMLCanvasElement;
}

function draw(): void {
  paintTitle(art(), globalThis.innerWidth, globalThis.innerHeight);
}

/** Everyone the game has a face for, in the order met. */
const FACES = ['lampwright', 'lambengolmor'].filter((id) => id in PORTRAITS);

export const isTitleUp = (): boolean => !$('title').hidden;

function dismiss(): void {
  if ($('title').hidden) return;
  $('title').hidden = true;
  // A screen of rock is several megabytes of canvas nothing will look at again.
  clearTitleArt(art());
  onStart?.();
}

export function initTitle(start: () => void): void {
  onStart = start;

  draw();
  globalThis.addEventListener('resize', () => {
    if (!isTitleUp()) return;
    globalThis.clearTimeout(repaint);
    repaint = globalThis.setTimeout(draw, 150);
  });

  $('title-mark').replaceChildren(logoMark());

  const cast = $('title-cast');
  cast.replaceChildren();
  for (const id of FACES) {
    const face = portraitIcon(id, 200);
    if (face) cast.append(face);
  }

  $('title').addEventListener('click', dismiss);
  // On the window: the layer would have to be focused to hear a key.
  globalThis.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    if (isTitleUp() && key !== 'Escape') dismiss();
  });
}
