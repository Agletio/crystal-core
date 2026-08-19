/**
 * Settings: keys, the auto-sell filter, and the book.
 *
 * Almost none of this is machinery. `BINDINGS` already says what every key
 * DOES and defaults to, `GameState.keys` already overrides by the same id, and
 * `KEYWORDS` already carries every definition with its own numbers — so a
 * rebinding screen is a screen, and the book is a Find box over a table.
 *
 * The filter MOVED here rather than being rebuilt: its markup came across with
 * its ids, so `filter.ts` renders into exactly what it always did.
 */
import { BINDINGS } from '../data';
import { KEYWORDS } from '../keywords';
import { keyFor, keyName } from './keys';
import { render as renderFilter } from './filter';
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
type Tab = 'keys' | 'filter' | 'book';
let tab: Tab = 'keys';

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

/** Every keyword, searchable. Driven off the table, so one added anywhere
 *  appears here with no edit — and `kin` is shown, since a Burn satisfying an
 *  Ailment is the thing nobody works out from two separate entries. */
function renderBook(): void {
  const host = $('book-rows');
  host.replaceChildren();
  const find = ($('book-find') as HTMLInputElement).value.trim().toLowerCase();

  const found = KEYWORDS.filter(
    (k) =>
      find === '' ||
      k.name.toLowerCase().includes(find) ||
      k.says.some((s) => s.toLowerCase().includes(find)) ||
      k.means.toLowerCase().includes(find)
  );

  for (const keyword of found) {
    const row = el('div', 'bookrow');
    const head = el('div', 'bookrow__name', keyword.name);
    if (keyword.kin) head.append(el('span', 'keyrow__what', ` — a kind of ${keyword.kin}`));
    row.append(head);
    row.append(el('div', 'bookrow__means', keyword.means));
    host.append(row);
  }
  if (found.length === 0) host.append(el('p', 'empty', `Nothing is called "${find}".`));
}

// ---------------------------------------------------------------------------

function render(): void {
  for (const [id, which] of [
    ['set-tab-keys', 'keys'],
    ['set-tab-filter', 'filter'],
    ['set-tab-book', 'book'],
  ] as const) {
    $(id).classList.toggle('mini--on', tab === which);
  }
  $('set-pane-keys').hidden = tab !== 'keys';
  $('set-pane-filter').hidden = tab !== 'filter';
  $('set-pane-book').hidden = tab !== 'book';

  if (tab === 'keys') renderKeys();
  if (tab === 'filter') renderFilter();
  if (tab === 'book') renderBook();
}

export function isSettingsOpen(): boolean {
  return !$('settings').hidden;
}

export function openSettings(which?: Tab): void {
  if (which) tab = which;
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
  ($('set-tab-keys') as HTMLButtonElement).onclick = () => openSettings('keys');
  ($('set-tab-filter') as HTMLButtonElement).onclick = () => openSettings('filter');
  ($('set-tab-book') as HTMLButtonElement).onclick = () => openSettings('book');
  ($('book-find') as HTMLInputElement).oninput = renderBook;
  document.addEventListener('keydown', capture, true);
}
