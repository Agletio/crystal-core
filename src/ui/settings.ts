/**
 * Settings: the keys.
 *
 * Almost none of this is machinery. `BINDINGS` already says what every key
 * DOES and defaults to and `GameState.keys` already overrides by the same id,
 * so a rebinding screen is a screen. The book is the journal's.
 */
import { BINDINGS } from '../data';
import { keyFor, keyName } from './keys';
import type { GameState } from '../game/state';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
let onChanged: (() => void) | null = null;
/** The binding waiting for a press, or null. A MODE, so it is not saved. */
let listening: string | null = null;

// ---------------------------------------------------------------------------

function renderKeys(): void {
  const host = $('settings-keys');
  host.replaceChildren();

  for (const binding of BINDINGS) {
    const waiting = listening === binding.id;
    const row = el('div', `keyrow${waiting ? ' keyrow--wait' : ''}`);
    row.id = `key-row-${binding.id}`;
    row.append(el('span', 'keyrow__what', binding.what));

    const button = el('button', 'mini keyrow__key') as HTMLButtonElement;
    button.id = `key-set-${binding.id}`;
    button.textContent = waiting ? 'press a key' : keyName(keyFor(game, binding.id));
    button.onclick = () => {
      listening = waiting ? null : binding.id;
      render();
    };
    row.append(button);
    host.append(row);
  }
}

/**
 * The raw event, never the dispatcher: `initKeys` ignores every keystroke
 * while an input has focus, which is what lets a Find box exist at all — so a
 * rebind cannot be captured through it.
 *
 * A key already spoken for is REFUSED rather than swapped: two bindings on one
 * key is a key that does whichever the table lists first.
 */
function capture(event: KeyboardEvent): void {
  if (!listening) return;
  event.preventDefault();
  // And it goes NO FURTHER. Without this the press also fires whatever it is
  // currently bound to, so rebinding onto `c` opened the character sheet
  // under the settings window on its way past.
  event.stopImmediatePropagation();
  if (event.key === 'Escape') {
    listening = null;
    render();
    return;
  }
  const pressed = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const taken = BINDINGS.some((b) => b.id !== listening && keyFor(game, b.id) === pressed);
  if (!taken) game.keys = { ...(game.keys ?? {}), [listening]: pressed };
  listening = null;
  render();
  onChanged?.();
}

// ---------------------------------------------------------------------------

function render(): void {
  renderKeys();
}

export function isSettingsOpen(): boolean {
  return !$('settings').hidden;
}

export function openSettings(): void {
  listening = null;
  $('settings').hidden = false;
  render();
}

export function closeSettings(): void {
  $('settings').hidden = true;
  listening = null;
}

export function initSettings(state: GameState, changed?: () => void): void {
  game = state;
  onChanged = changed ?? null;
  ($('settings-close') as HTMLButtonElement).onclick = closeSettings;
  document.addEventListener('keydown', capture, true);
}
