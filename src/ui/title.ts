/**
 * The title screen: the mark and the wordmark on a ceremonial plaque, over
 * quiet lamplit stone. Anything dismisses it. The gem behind everything is the
 * logo drawn enormous and barely visible — what keeps the ground from being a
 * black void without becoming a picture again.
 */
import { logoMark } from './logo';

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

  $('title-mark').replaceChildren(logoMark());
  $('title-ghost').replaceChildren(logoMark());

  $('title').addEventListener('click', dismiss);
  // On the window: the layer would have to be focused to hear a key.
  globalThis.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    if (isTitleUp() && key !== 'Escape') dismiss();
  });
}
