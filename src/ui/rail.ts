/**
 * The rail: every screen as a glyph with its key, bottom right over the map.
 *
 * It DRESSES markup rather than building it — the ids are what the guided
 * opening walks and what the shots lockdown probe asks for, so they live in
 * the page and this only hangs an icon and a key badge on each one.
 */
import type { GameState } from '../game/state';
import { keyFor, keyName } from './keys';
import { screenIcon } from './screenicons';

function dress(button: HTMLElement, game: GameState): void {
  const label = button.textContent?.trim() ?? '';
  const icon = screenIcon(button.id);
  if (!icon) return;
  button.replaceChildren(icon);

  // A glyph with no accessible name is a button that reads as nothing.
  if (label) {
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  const binding = button.dataset.key;
  const key = binding ? keyFor(game, binding) : '';
  if (!key) return;
  const badge = document.createElement('span');
  badge.className = 'railbtn__key';
  badge.textContent = keyName(key);
  button.append(badge);
  button.title = `${label} (${keyName(key)})`;
}

let parked = false;

/** Panels away, map alone. One rail button stays, and it is the way back. */
export function toggleParkedPanels(force?: boolean): void {
  parked = force ?? !parked;
  document.body.classList.toggle('panelsoff', parked);
}

/** The opening cannot ring a button that is parked, so it un-parks first. */
export const unparkPanels = (): void => {
  if (parked) toggleParkedPanels(false);
};

/** Reads `fullscreenElement`, never a boolean of its own: the browser leaves
 *  fullscreen without asking, and a tracked flag is wrong the first time. */
export function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen?.();
  else void document.documentElement.requestFullscreen?.().catch(() => {});
}

export function dressRail(game: GameState): void {
  for (const button of document.querySelectorAll<HTMLElement>('.railbtn')) {
    dress(button, game);
  }
  document.getElementById('ui-hide')?.addEventListener('click', () => toggleParkedPanels());
  document.getElementById('ui-full')?.addEventListener('click', toggleFullscreen);
}
