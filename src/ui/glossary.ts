/**
 * Keywords, in front of the player. A tooltip is `pointer-events: none` and
 * always will be, so a keyword inside one cannot be hovered a second time —
 * and does not have to be: the word is MARKED where it appears and every
 * keyword the lines name is defined at the bottom of the same box. Learn Arc
 * once and every card saying +1 Arc after it is free to read. It also works on
 * a phone, which has no hover at all.
 */
import { cutKeywords, keywordsIn } from '../keywords';

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One line, with every keyword in it marked. */
export function keywordLine(text: string, cls?: string): HTMLElement {
  const row = el('div', cls);
  for (const piece of cutKeywords(text)) {
    if (piece.keyword) row.append(el('span', 'kw', piece.text));
    else row.append(document.createTextNode(piece.text));
  }
  return row;
}

/** What every keyword these lines name means, or null when they name none. */
export function glossaryOf(lines: string[]): HTMLElement | null {
  const found = keywordsIn(lines);
  if (found.length === 0) return null;

  const box = el('div', 'tip__group tip__glossary');
  box.append(el('div', 'tip__label', found.length === 1 ? 'keyword' : 'keywords'));
  for (const keyword of found) {
    const row = el('div', 'tip__kw');
    row.append(el('span', 'kw', keyword.name));
    row.append(document.createTextNode(` — ${keyword.means}`));
    box.append(row);
  }
  return box;
}

/** A node's card: name and state, its lines, then the glossary. Both webs draw
 *  it, so a vocabulary cannot grow on one screen and not on the other. */
export function nodeCard(name: string, state: string, lines: string[]): HTMLElement {
  const card = el('div', 'tip__card tip__card--node');
  const head = el('div', 'tip__name', name);
  head.append(el('span', 'tip__state', state));
  card.append(head);

  for (const line of lines.filter((l) => l.length > 0)) {
    card.append(keywordLine(line, 'tip__body'));
  }

  const glossary = glossaryOf(lines);
  if (glossary) card.append(glossary);
  return card;
}
