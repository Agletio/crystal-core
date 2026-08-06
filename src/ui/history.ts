/**
 * One log for the whole app, read on demand.
 *
 * It used to be a panel on each view, which meant watching a run was mostly
 * watching "+7 killed" scroll past. It's a modal now: a record you go and
 * read when you want to know what happened, not a feed shouting at you.
 *
 * The eventual shape is filterable and much richer — xp, damage by source,
 * regen, drops — enough to answer "why did I die" after the fact. Entries
 * already carry a kind, which is what a filter would key off.
 */
export type LogKind = 'add' | 'remove' | 'note' | 'fail';

export interface LogEntry {
  text: string;
  kind: LogKind;
  /** Run time in seconds when it happened, if it happened during a run. */
  at?: number;
}

const LIMIT = 400;

const $ = (id: string) => document.getElementById(id)!;
let entries: LogEntry[] = [];

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function note(text: string, kind: LogKind = 'note', at?: number): void {
  entries.unshift({ text, kind, at });
  if (entries.length > LIMIT) entries.length = LIMIT;
  if (isHistoryOpen()) renderHistory();
}

export function clearHistory(): void {
  entries = [];
  renderHistory();
}

export function renderHistory(): void {
  const host = $('history-log');
  host.replaceChildren();

  if (entries.length === 0) {
    host.append(el('p', 'empty', 'Nothing yet. Craft something or enter the Fissure.'));
    return;
  }

  for (const entry of entries) {
    const row = el('div', `logline logline--${entry.kind}`);
    if (entry.at !== undefined) {
      row.append(el('span', 'logline__at', `${entry.at.toFixed(1)}s `));
    }
    row.append(el('span', undefined, entry.text));
    host.append(row);
  }
}

export function isHistoryOpen(): boolean {
  return !$('history').hidden;
}

export function openHistory(): void {
  renderHistory();
  $('history').hidden = false;
}

export function closeHistory(): void {
  $('history').hidden = true;
}

export function initHistory(): void {
  ($('history-close') as HTMLButtonElement).onclick = closeHistory;
  ($('history-clear') as HTMLButtonElement).onclick = clearHistory;
  $('history').addEventListener('click', (event) => {
    if (event.target === $('history')) closeHistory();
  });
  renderHistory();
}
