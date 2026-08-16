/**
 * The title screen: the mark and the wordmark on a ceremonial plaque, over
 * quiet lamplit stone. Anything dismisses it. The gem behind everything is the
 * logo drawn enormous and barely visible — what keeps the ground from being a
 * black void without becoming a picture again.
 */
import { logoMark } from './logo';
import { crystalIcon } from './icons';

const $ = (id: string) => document.getElementById(id)!;

let onStart: (() => void) | null = null;

export const isTitleUp = (): boolean => !$('title').hidden;

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

  $('title').addEventListener('click', dismiss);
  // On the window: the layer would have to be focused to hear a key.
  globalThis.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    if (isTitleUp() && key !== 'Escape') dismiss();
  });
}
