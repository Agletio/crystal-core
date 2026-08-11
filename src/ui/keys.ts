/**
 * Keys, in one place. `BINDINGS` in `src/data.ts` says what each one DOES and
 * defaults to; `GameState.keys` overrides by the same id, so a screen that
 * rebinds them is a screen and not a rewrite. Nothing else may read a key
 * literal — Escape excepted, which lives in the shell's own chain because it
 * is about closing whatever is on top.
 */
import { BINDINGS } from '../data';
import type { GameState } from '../game/state';

export type KeyActions = Record<string, () => void>;

/** Typing is not a shortcut: a Find box is one keystroke from turning a search
 *  into an action, which is the whole reason this exists. */
function typing(): boolean {
  const at = document.activeElement;
  if (!at) return false;
  const tag = at.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (at as HTMLElement).isContentEditable;
}

export const keyFor = (game: GameState, id: string): string =>
  game.keys?.[id] ?? BINDINGS.find((b) => b.id === id)?.key ?? '';

export const keyName = (key: string): string => (key === ' ' ? 'Space' : key.toUpperCase());

export function initKeys(game: GameState, actions: KeyActions): void {
  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (typing()) return;

    // Case-blind, so Caps Lock is not a broken keyboard.
    const pressed = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    for (const binding of BINDINGS) {
      const bound = game.keys?.[binding.id] ?? binding.key;
      if (pressed !== bound) continue;
      const run = actions[binding.id];
      if (!run) return;
      event.preventDefault();
      run();
      return;
    }
  });
}
