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
import { attachTooltip } from './tooltip';

function dress(button: HTMLElement, game: GameState): void {
  const label = button.textContent?.trim() ?? '';
  const icon = screenIcon(button.id);
  if (!icon) return;
  button.replaceChildren(icon);

  // A glyph with no accessible name is a button that reads as nothing. The
  // hover name is the game's own tooltip — never `title`, which the browser delays.
  if (label) button.setAttribute('aria-label', label);

  const binding = button.dataset.key;
  const key = binding ? keyFor(game, binding) : '';
  if (key) {
    const badge = document.createElement('span');
    badge.className = 'railbtn__key';
    badge.textContent = keyName(key);
    button.append(badge);
  }
  if (label)
    attachTooltip(button, () => {
      const now = binding ? keyFor(game, binding) : '';
      return now ? `${label} (${keyName(now)})` : label;
    });
}

/** The save is where parking lives, so it survives a reload like a keybind. */
let state: GameState | null = null;
const parked = (): boolean => document.body.classList.contains('panelsoff');

/** Panels away, map alone. One rail button stays, and it is the way back. */
export function toggleParkedPanels(force?: boolean): void {
  const next = force ?? !parked();
  document.body.classList.toggle('panelsoff', next);
  if (state) state.parked = next;
}

/** After a load: another slot's game may have been playing with them away. */
export const syncParkedPanels = (): void => {
  if (state) document.body.classList.toggle('panelsoff', state.parked);
};

/** The opening cannot ring a button that is parked, so it un-parks first. */
export const unparkPanels = (): void => {
  if (parked()) toggleParkedPanels(false);
};

/** Reads `fullscreenElement`, never a boolean of its own: the browser leaves
 *  fullscreen without asking, and a tracked flag is wrong the first time. */
export function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen?.();
  else void document.documentElement.requestFullscreen?.().catch(() => {});
}

export function dressRail(game: GameState): void {
  state = game;
  syncParkedPanels();
  for (const button of document.querySelectorAll<HTMLElement>('.railbtn')) {
    dress(button, game);
  }
  document.getElementById('ui-hide')?.addEventListener('click', () => toggleParkedPanels());
  document.getElementById('ui-full')?.addEventListener('click', toggleFullscreen);
}
