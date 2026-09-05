/**
 * The title screen: the mark and the wordmark on a ceremonial plaque, over
 * quiet lamplit stone. Anything dismisses it. Below the plaque is THE FISSURE
 * itself — a generated scene of the rock face split by a lit crack, a lantern
 * either side — drawn by the stylesheet off `--fix-crackscene`.
 */
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
  // the game is about.
  $('title-mark').replaceChildren(crystalIcon(4, 110, 'normal'));

  $('title').addEventListener('click', dismiss);
  // On the window: the layer would have to be focused to hear a key.
  globalThis.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    if (isTitleUp() && key !== 'Escape') dismiss();
  });
}
