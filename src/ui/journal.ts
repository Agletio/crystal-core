/**
 * THE JOURNAL: what the Lampwright hands you the first time you come up, and
 * the one place the game's words are written down. One tab today — the book,
 * a Find box over `KEYWORDS` — and a quest log is the next one.
 */
import { KEYWORDS } from '../keywords';
import type { GameState } from '../game/state';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
/** Called when the mark on the rail comes off, so the rail can redraw. */
let onSeen: (() => void) | null = null;

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

export function isJournalOpen(): boolean {
  return !$('journal').hidden;
}

/** Opening it is what takes the mark off the rail: never prevented, so it
 *  opens on the book before he has handed anything over. */
export function openJournal(): void {
  if (!game.journalSeen) {
    game.journalSeen = true;
    onSeen?.();
  }
  $('journal').hidden = false;
  renderBook();
}

export function closeJournal(): void {
  $('journal').hidden = true;
}

export function initJournal(state: GameState, seen?: () => void): void {
  game = state;
  onSeen = seen ?? null;
  ($('journal-close') as HTMLButtonElement).onclick = closeJournal;
  ($('book-find') as HTMLInputElement).oninput = renderBook;
}
