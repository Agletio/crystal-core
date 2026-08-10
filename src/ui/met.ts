/**
 * Meeting the Lampwright: a panel over a frozen descent — their words, the
 * crystal drawn as the item it is, and one button. The crystal is granted
 * HERE, never in the report, so it is yours from the moment you are handed it
 * and dying further down costs you only that descent. The freeze is not a
 * pause: the loop has no pause state, the UI just stops ticking the sim.
 */
import { LAMPWRIGHT } from '../data';
import { lampwrightGift } from '../game/crystals';
import type { GameState } from '../game/state';
import { itemCard } from './itemcard';
import { beastIcon, itemIcon } from './icons';
import { attachTooltip, hideTooltip } from './tooltip';
import { note } from './history';
import type { Item } from '../types';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
/** Called once the crystal is in hand and the descent may run again. */
let onTaken: (() => void) | null = null;
let held: Item | null = null;

export const isMetOpen = (): boolean => !$('met').hidden;

/** `first` picks which of the two speeches is used. Only the first teaches. */
export function openMet(first: boolean): void {
  // Before the panel, so what you are shown and what lands in the collection
  // are one object rather than two rolls of one.
  const given = lampwrightGift(game);
  held = given.crystal;

  const words = first ? LAMPWRIGHT.first : LAMPWRIGHT.again;
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
  gift.append(itemIcon(held, 34));
  gift.append(el('span', 'met__name', held.name));
  attachTooltip(gift, () => itemCard(held!));

  const said = $('met-said');
  said.replaceChildren();
  for (const line of words.said) said.append(el('p', 'met__said', line));

  $('met').hidden = false;
  ($('met-take') as HTMLButtonElement).focus();
}

export function closeMet(): void {
  if (held) note(`${LAMPWRIGHT.name} gave you ${held.name}`, 'add');
  held = null;
  $('met').hidden = true;
  hideTooltip();
  onTaken?.();
}

export function initMet(state: GameState, taken: () => void): void {
  game = state;
  onTaken = taken;
  ($('met-take') as HTMLButtonElement).onclick = closeMet;
}
