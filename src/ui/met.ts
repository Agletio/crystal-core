/**
 * Meeting the Lampwright: a panel over a finished descent — their words, what
 * they are holding drawn as the things they are, and one button. It is granted
 * HERE, never in the report, so it is yours from the moment you are handed it.
 * The freeze is not a pause: the loop has no pause state, the UI just stops
 * ticking the sim.
 */
import { CURRENCY_BY_ID, LAMPWRIGHT } from '../data';
import type { Handover, Waiting } from '../game/crystals';
import { takeHandover } from '../game/crystals';
import type { GameState } from '../game/state';
import { itemCard } from './itemcard';
import { beastIcon, currencyIcon, itemIcon } from './icons';
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

  const words = waiting === 'weapon' ? LAMPWRIGHT.first : LAMPWRIGHT.crystal;
  // The same sprite standing on the map. Who is speaking should be something
  // you recognise rather than something you read.
  const face = $('met-face');
  face.replaceChildren();
  const portrait = beastIcon(LAMPWRIGHT.sprite, 44);
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

  const said = $('met-said');
  said.replaceChildren();
  for (const line of words.said) said.append(el('p', 'met__said', line));

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
