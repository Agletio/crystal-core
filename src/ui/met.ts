/**
 * The LAST beat: what they are holding drawn as the things it is, and one
 * button, in a bubble over their own head like every line before it. Granted
 * HERE and never in the report, so it is yours from the moment you are handed
 * it. Nothing has been ticking since you came up the hole — a scene is already
 * a stop, which is why this needs no scrim over the room to prove it.
 */
import { CURRENCY_BY_ID, LAMPWRIGHT } from '../data';
import type { Handover, Waiting } from '../game/crystals';
import { takeHandover } from '../game/crystals';
import type { GameState } from '../game/state';
import { itemCard } from './itemcard';
import { currencyIcon, itemIcon, portraitIcon } from './icons';
import { attachTooltip, hideTooltip } from './tooltip';
import { note } from './history';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
/** Called once what was held is in hand and the loop may go on. */
let onTaken: (() => void) | null = null;
let taken: Handover | null = null;

export const isMetOpen = (): boolean => !$('met').hidden;

/** Which of his three speeches this meeting is. Read by the run loop to play
 *  the beats, and again here for the title and the button on the last one. */
export const lampwrightWords = (waiting: Waiting) =>
  waiting.weapon ? LAMPWRIGHT.first : waiting.crystal ? LAMPWRIGHT.crystal : LAMPWRIGHT.again;

function row(icon: SVGElement, name: string, card: () => HTMLElement | string): HTMLElement {
  const line = el('div', 'met__row');
  line.append(icon);
  line.append(el('span', 'met__name', name));
  attachTooltip(line, card);
  return line;
}

/**
 * `waiting` says what they are holding. Granted BEFORE the panel, so what you
 * are shown and what lands in your hands are one object rather than two rolls
 * of the same thing.
 */
export function openMet(waiting: Waiting): void {
  const hand = takeHandover(game, waiting);
  if (hand.items.length === 0 && Object.keys(hand.currency).length === 0) return;
  taken = hand;

  const words = lampwrightWords(waiting);
  // The same sprite standing on the map. Who is speaking should be something
  // you recognise rather than something you read.
  const face = $('met-face');
  face.replaceChildren();
  const portrait = portraitIcon(LAMPWRIGHT.sprite, 56);
  if (portrait) face.append(portrait);
  $('met-title').textContent = words.title;
  ($('met-take') as HTMLButtonElement).textContent = words.button;

  const gift = $('met-gift');
  gift.replaceChildren();
  for (const item of hand.items) {
    gift.append(row(itemIcon(item, 34), item.name, () => itemCard(item)));
  }
  for (const [id, n] of Object.entries(hand.currency)) {
    const def = CURRENCY_BY_ID[id];
    if (!def) continue;
    gift.append(row(currencyIcon(def, 28), `${def.name} \u00d7${n}`, () => def.description));
  }

  $('met').hidden = false;
  ($('met-take') as HTMLButtonElement).focus();
}

export function closeMet(): void {
  for (const item of taken?.items ?? []) note(`${LAMPWRIGHT.name} gave you ${item.name}`, 'add');
  for (const [id, n] of Object.entries(taken?.currency ?? {})) {
    note(`${LAMPWRIGHT.name} gave you ${n} ${CURRENCY_BY_ID[id]?.name ?? id}`, 'add');
  }
  taken = null;
  $('met').hidden = true;
  hideTooltip();
  onTaken?.();
}

export function initMet(state: GameState, taken: () => void): void {
  game = state;
  onTaken = taken;
  ($('met-take') as HTMLButtonElement).onclick = closeMet;
}
